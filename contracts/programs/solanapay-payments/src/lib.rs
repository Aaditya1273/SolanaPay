use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};
use anchor_spl::associated_token::AssociatedToken;
use mpl_token_metadata::instruction::{create_metadata_accounts_v3, create_master_edition_v3};
use mpl_token_metadata::state::{DataV2, Creator};
use solana_program::{
    program::invoke,
    system_instruction,
    native_token::LAMPORTS_PER_SOL,
};

declare_id!("SPAYxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

#[program]
pub mod solanapay_payments {
    use super::*;

    /// Initialize the payment program
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let payment_config = &mut ctx.accounts.payment_config;
        payment_config.authority = ctx.accounts.authority.key();
        payment_config.treasury = ctx.accounts.treasury.key();
        payment_config.platform_fee_rate = 250; // 2.5%
        payment_config.cashback_rate = 100; // 1%
        payment_config.micro_reward_pool = 0;
        payment_config.total_volume = 0;
        payment_config.total_transactions = 0;
        payment_config.is_paused = false;

        emit!(ProgramInitialized {
            authority: payment_config.authority,
            treasury: payment_config.treasury,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Create escrow payment (SOL or SPL token)
    pub fn create_payment(
        ctx: Context<CreatePayment>,
        amount: u64,
        payment_type: PaymentType,
        description: String,
        auto_release_time: Option<i64>,
    ) -> Result<()> {
        let payment = &mut ctx.accounts.payment;
        let config = &ctx.accounts.payment_config;

        require!(!config.is_paused, ErrorCode::ProgramPaused);
        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(description.len() <= 200, ErrorCode::DescriptionTooLong);

        // Calculate fees
        let platform_fee = amount * config.platform_fee_rate / 10000;
        let net_amount = amount - platform_fee;

        // Initialize payment account
        payment.payer = ctx.accounts.payer.key();
        payment.recipient = ctx.accounts.recipient.key();
        payment.amount = amount;
        payment.net_amount = net_amount;
        payment.platform_fee = platform_fee;
        payment.payment_type = payment_type;
        payment.status = PaymentStatus::Pending;
        payment.description = description;
        payment.created_at = Clock::get()?.unix_timestamp;
        payment.auto_release_time = auto_release_time;
        payment.is_disputed = false;

        // Handle different payment types
        match payment_type {
            PaymentType::Sol => {
                // Transfer SOL to escrow
                let transfer_instruction = system_instruction::transfer(
                    &ctx.accounts.payer.key(),
                    &payment.key(),
                    amount,
                );
                invoke(
                    &transfer_instruction,
                    &[
                        ctx.accounts.payer.to_account_info(),
                        payment.to_account_info(),
                        ctx.accounts.system_program.to_account_info(),
                    ],
                )?;
            }
            PaymentType::Usdc | PaymentType::Token => {
                // Transfer SPL tokens to escrow
                let cpi_accounts = Transfer {
                    from: ctx.accounts.payer_token_account.to_account_info(),
                    to: ctx.accounts.escrow_token_account.to_account_info(),
                    authority: ctx.accounts.payer.to_account_info(),
                };
                let cpi_program = ctx.accounts.token_program.to_account_info();
                let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
                token::transfer(cpi_ctx, amount)?;
            }
        }

        emit!(PaymentCreated {
            payment_id: payment.key(),
            payer: payment.payer,
            recipient: payment.recipient,
            amount,
            payment_type,
            timestamp: payment.created_at,
        });

        Ok(())
    }

    /// Release payment from escrow
    pub fn release_payment(ctx: Context<ReleasePayment>) -> Result<()> {
        let payment = &mut ctx.accounts.payment;
        let config = &mut ctx.accounts.payment_config;

        require!(
            payment.status == PaymentStatus::Pending,
            ErrorCode::InvalidPaymentStatus
        );

        // Check authorization (payer, recipient, or auto-release)
        let clock = Clock::get()?;
        let is_authorized = payment.payer == ctx.accounts.authority.key() ||
            payment.recipient == ctx.accounts.authority.key() ||
            (payment.auto_release_time.is_some() && 
             clock.unix_timestamp >= payment.auto_release_time.unwrap());

        require!(is_authorized, ErrorCode::Unauthorized);

        // Calculate micro-rewards (0.1% of payment goes to reward pool)
        let micro_reward = payment.amount / 1000;
        config.micro_reward_pool += micro_reward;

        // Update payment status
        payment.status = PaymentStatus::Completed;
        payment.completed_at = Some(clock.unix_timestamp);

        // Transfer funds based on payment type
        match payment.payment_type {
            PaymentType::Sol => {
                // Transfer SOL to recipient
                **payment.to_account_info().try_borrow_mut_lamports()? -= payment.net_amount;
                **ctx.accounts.recipient.to_account_info().try_borrow_mut_lamports()? += payment.net_amount;

                // Transfer platform fee to treasury
                **payment.to_account_info().try_borrow_mut_lamports()? -= payment.platform_fee;
                **ctx.accounts.treasury.to_account_info().try_borrow_mut_lamports()? += payment.platform_fee;
            }
            PaymentType::Usdc | PaymentType::Token => {
                // Transfer tokens to recipient
                let cpi_accounts = Transfer {
                    from: ctx.accounts.escrow_token_account.to_account_info(),
                    to: ctx.accounts.recipient_token_account.to_account_info(),
                    authority: payment.to_account_info(),
                };
                let cpi_program = ctx.accounts.token_program.to_account_info();
                let seeds = &[b"payment", payment.payer.as_ref(), &[ctx.bumps.payment]];
                let signer = &[&seeds[..]];
                let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
                token::transfer(cpi_ctx, payment.net_amount)?;

                // Transfer platform fee to treasury
                let cpi_accounts = Transfer {
                    from: ctx.accounts.escrow_token_account.to_account_info(),
                    to: ctx.accounts.treasury_token_account.to_account_info(),
                    authority: payment.to_account_info(),
                };
                let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
                token::transfer(cpi_ctx, payment.platform_fee)?;
            }
        }

        // Update global stats
        config.total_volume += payment.amount;
        config.total_transactions += 1;

        emit!(PaymentReleased {
            payment_id: payment.key(),
            recipient: payment.recipient,
            amount: payment.net_amount,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Dispute a payment
    pub fn dispute_payment(ctx: Context<DisputePayment>, reason: String) -> Result<()> {
        let payment = &mut ctx.accounts.payment;

        require!(
            payment.status == PaymentStatus::Pending,
            ErrorCode::InvalidPaymentStatus
        );
        require!(
            payment.payer == ctx.accounts.disputer.key() ||
            payment.recipient == ctx.accounts.disputer.key(),
            ErrorCode::Unauthorized
        );
        require!(reason.len() <= 500, ErrorCode::ReasonTooLong);

        payment.is_disputed = true;
        payment.dispute_reason = Some(reason.clone());
        payment.disputed_at = Some(Clock::get()?.unix_timestamp);

        emit!(PaymentDisputed {
            payment_id: payment.key(),
            disputer: ctx.accounts.disputer.key(),
            reason,
            timestamp: payment.disputed_at.unwrap(),
        });

        Ok(())
    }

    /// Distribute micro-rewards to users
    pub fn distribute_micro_rewards(
        ctx: Context<DistributeMicroRewards>,
        recipients: Vec<Pubkey>,
        amounts: Vec<u64>,
    ) -> Result<()> {
        let config = &mut ctx.accounts.payment_config;
        
        require!(
            ctx.accounts.authority.key() == config.authority,
            ErrorCode::Unauthorized
        );
        require!(recipients.len() == amounts.len(), ErrorCode::MismatchedArrays);
        require!(recipients.len() <= 10, ErrorCode::TooManyRecipients);

        let total_distribution: u64 = amounts.iter().sum();
        require!(
            total_distribution <= config.micro_reward_pool,
            ErrorCode::InsufficientRewardPool
        );

        config.micro_reward_pool -= total_distribution;

        emit!(MicroRewardsDistributed {
            total_amount: total_distribution,
            recipient_count: recipients.len() as u32,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Mint cashback NFT for qualifying payments
    pub fn mint_cashback_nft(
        ctx: Context<MintCashbackNft>,
        payment_amount: u64,
        metadata_uri: String,
    ) -> Result<()> {
        let config = &ctx.accounts.payment_config;
        
        // Calculate cashback eligibility (minimum 10 SOL or equivalent)
        let min_cashback_amount = 10 * LAMPORTS_PER_SOL;
        require!(payment_amount >= min_cashback_amount, ErrorCode::IneligibleForCashback);

        // Calculate cashback percentage based on payment amount
        let cashback_tier = match payment_amount {
            amt if amt >= 100 * LAMPORTS_PER_SOL => 300, // 3% for 100+ SOL
            amt if amt >= 50 * LAMPORTS_PER_SOL => 200,  // 2% for 50+ SOL
            _ => config.cashback_rate, // 1% default
        };

        // Create NFT metadata
        let data = DataV2 {
            name: format!("SolanaPay Cashback NFT #{}", payment_amount / LAMPORTS_PER_SOL),
            symbol: "SPCB".to_string(),
            uri: metadata_uri,
            seller_fee_basis_points: 0,
            creators: Some(vec![Creator {
                address: config.authority,
                verified: true,
                share: 100,
            }]),
            collection: None,
            uses: None,
        };

        // Create metadata account
        let create_metadata_ix = create_metadata_accounts_v3(
            mpl_token_metadata::id(),
            ctx.accounts.metadata.key(),
            ctx.accounts.mint.key(),
            ctx.accounts.mint_authority.key(),
            ctx.accounts.payer.key(),
            ctx.accounts.mint_authority.key(),
            data.name.clone(),
            data.symbol.clone(),
            data.uri.clone(),
            data.creators,
            data.seller_fee_basis_points,
            true,
            true,
            data.collection,
            data.uses,
            None,
        );

        invoke(
            &create_metadata_ix,
            &[
                ctx.accounts.metadata.to_account_info(),
                ctx.accounts.mint.to_account_info(),
                ctx.accounts.mint_authority.to_account_info(),
                ctx.accounts.payer.to_account_info(),
                ctx.accounts.token_metadata_program.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
                ctx.accounts.rent.to_account_info(),
            ],
        )?;

        emit!(CashbackNftMinted {
            recipient: ctx.accounts.recipient.key(),
            mint: ctx.accounts.mint.key(),
            payment_amount,
            cashback_tier,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Merchant payout with near-zero fees
    pub fn merchant_payout(
        ctx: Context<MerchantPayout>,
        amount: u64,
        merchant_fee_rate: u16, // Reduced fee for merchants (e.g., 50 = 0.5%)
    ) -> Result<()> {
        let config = &ctx.accounts.payment_config;
        
        require!(
            ctx.accounts.authority.key() == config.authority,
            ErrorCode::Unauthorized
        );
        require!(merchant_fee_rate <= 100, ErrorCode::InvalidFeeRate); // Max 1%

        let merchant_fee = amount * merchant_fee_rate as u64 / 10000;
        let net_payout = amount - merchant_fee;

        // Transfer to merchant with reduced fees
        **ctx.accounts.treasury.to_account_info().try_borrow_mut_lamports()? -= net_payout;
        **ctx.accounts.merchant.to_account_info().try_borrow_mut_lamports()? += net_payout;

        emit!(MerchantPayout {
            merchant: ctx.accounts.merchant.key(),
            amount: net_payout,
            fee: merchant_fee,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + PaymentConfig::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub payment_config: Account<'info, PaymentConfig>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// CHECK: Treasury account for collecting fees
    pub treasury: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreatePayment<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + Payment::INIT_SPACE,
        seeds = [b"payment", payer.key().as_ref()],
        bump
    )]
    pub payment: Account<'info, Payment>,
    
    #[account(
        seeds = [b"config"],
        bump
    )]
    pub payment_config: Account<'info, PaymentConfig>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    /// CHECK: Payment recipient
    pub recipient: AccountInfo<'info>,
    
    // Optional token accounts for SPL token payments
    #[account(mut)]
    pub payer_token_account: Option<Account<'info, TokenAccount>>,
    
    #[account(mut)]
    pub escrow_token_account: Option<Account<'info, TokenAccount>>,
    
    pub token_program: Option<Program<'info, Token>>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReleasePayment<'info> {
    #[account(
        mut,
        seeds = [b"payment", payment.payer.as_ref()],
        bump
    )]
    pub payment: Account<'info, Payment>,
    
    #[account(
        mut,
        seeds = [b"config"],
        bump
    )]
    pub payment_config: Account<'info, PaymentConfig>,
    
    pub authority: Signer<'info>,
    
    #[account(mut)]
    /// CHECK: Payment recipient
    pub recipient: AccountInfo<'info>,
    
    #[account(mut)]
    /// CHECK: Treasury account
    pub treasury: AccountInfo<'info>,
    
    // Optional token accounts for SPL token payments
    #[account(mut)]
    pub escrow_token_account: Option<Account<'info, TokenAccount>>,
    
    #[account(mut)]
    pub recipient_token_account: Option<Account<'info, TokenAccount>>,
    
    #[account(mut)]
    pub treasury_token_account: Option<Account<'info, TokenAccount>>,
    
    pub token_program: Option<Program<'info, Token>>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DisputePayment<'info> {
    #[account(
        mut,
        seeds = [b"payment", payment.payer.as_ref()],
        bump
    )]
    pub payment: Account<'info, Payment>,
    
    pub disputer: Signer<'info>,
}

#[derive(Accounts)]
pub struct DistributeMicroRewards<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump
    )]
    pub payment_config: Account<'info, PaymentConfig>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct MintCashbackNft<'info> {
    #[account(
        seeds = [b"config"],
        bump
    )]
    pub payment_config: Account<'info, PaymentConfig>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    /// CHECK: NFT recipient
    pub recipient: AccountInfo<'info>,
    
    #[account(mut)]
    pub mint: Signer<'info>,
    
    /// CHECK: Mint authority
    pub mint_authority: AccountInfo<'info>,
    
    /// CHECK: Metadata account
    #[account(mut)]
    pub metadata: AccountInfo<'info>,
    
    /// CHECK: Token metadata program
    pub token_metadata_program: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct MerchantPayout<'info> {
    #[account(
        seeds = [b"config"],
        bump
    )]
    pub payment_config: Account<'info, PaymentConfig>,
    
    pub authority: Signer<'info>,
    
    #[account(mut)]
    /// CHECK: Merchant account
    pub merchant: AccountInfo<'info>,
    
    #[account(mut)]
    /// CHECK: Treasury account
    pub treasury: AccountInfo<'info>,
}

#[account]
pub struct PaymentConfig {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub platform_fee_rate: u16,      // Basis points (e.g., 250 = 2.5%)
    pub cashback_rate: u16,          // Basis points (e.g., 100 = 1%)
    pub micro_reward_pool: u64,      // Total rewards available for distribution
    pub total_volume: u64,           // Total payment volume processed
    pub total_transactions: u64,     // Total number of transactions
    pub is_paused: bool,             // Emergency pause flag
}

impl PaymentConfig {
    pub const INIT_SPACE: usize = 32 + 32 + 2 + 2 + 8 + 8 + 8 + 1;
}

#[account]
pub struct Payment {
    pub payer: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub net_amount: u64,
    pub platform_fee: u64,
    pub payment_type: PaymentType,
    pub status: PaymentStatus,
    pub description: String,
    pub created_at: i64,
    pub completed_at: Option<i64>,
    pub auto_release_time: Option<i64>,
    pub is_disputed: bool,
    pub dispute_reason: Option<String>,
    pub disputed_at: Option<i64>,
}

impl Payment {
    pub const INIT_SPACE: usize = 32 + 32 + 8 + 8 + 8 + 1 + 1 + 200 + 8 + 9 + 9 + 1 + 500 + 9;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum PaymentType {
    Sol,
    Usdc,
    Token,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum PaymentStatus {
    Pending,
    Completed,
    Disputed,
    Cancelled,
}

#[event]
pub struct ProgramInitialized {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct PaymentCreated {
    pub payment_id: Pubkey,
    pub payer: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub payment_type: PaymentType,
    pub timestamp: i64,
}

#[event]
pub struct PaymentReleased {
    pub payment_id: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct PaymentDisputed {
    pub payment_id: Pubkey,
    pub disputer: Pubkey,
    pub reason: String,
    pub timestamp: i64,
}

#[event]
pub struct MicroRewardsDistributed {
    pub total_amount: u64,
    pub recipient_count: u32,
    pub timestamp: i64,
}

#[event]
pub struct CashbackNftMinted {
    pub recipient: Pubkey,
    pub mint: Pubkey,
    pub payment_amount: u64,
    pub cashback_tier: u16,
    pub timestamp: i64,
}

#[event]
pub struct MerchantPayout {
    pub merchant: Pubkey,
    pub amount: u64,
    pub fee: u64,
    pub timestamp: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Program is currently paused")]
    ProgramPaused,
    #[msg("Invalid payment amount")]
    InvalidAmount,
    #[msg("Description too long")]
    DescriptionTooLong,
    #[msg("Invalid payment status")]
    InvalidPaymentStatus,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Dispute reason too long")]
    ReasonTooLong,
    #[msg("Mismatched array lengths")]
    MismatchedArrays,
    #[msg("Too many recipients")]
    TooManyRecipients,
    #[msg("Insufficient reward pool")]
    InsufficientRewardPool,
    #[msg("Not eligible for cashback")]
    IneligibleForCashback,
    #[msg("Invalid fee rate")]
    InvalidFeeRate,
}
