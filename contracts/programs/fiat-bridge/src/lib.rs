use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{
        self, 
        Mint, 
        Token, 
        TokenAccount,
        Transfer,
        MintTo,
        SetAuthority,
        spl_token::instruction::AuthorityType,
    },
};
use std::str::FromStr;

// Program ID needs to be updated after deployment
declare_id!("FiatBridge1111111111111111111111111111111111111");

// Circle API constants
const CIRCLE_API_URL: &str = "https://api.circle.com";
const USDC_MINT: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // Mainnet USDC

#[program]
pub mod fiat_bridge {
    use super::*;

    // Initialize the bridge with USDC mint and reward parameters
    pub fn initialize_bridge(
        ctx: Context<InitializeBridge>,
        fee_basis_points: u16,
        reward_basis_points: u16,
    ) -> Result<()> {
        let bridge_state = &mut ctx.accounts.bridge_state;
        bridge_state.admin = *ctx.accounts.admin.key;
        bridge_state.usdc_mint = *ctx.accounts.usdc_mint.key;
        bridge_state.fee_basis_points = fee_basis_points;
        bridge_state.reward_basis_points = reward_basis_points;
        bridge_state.bump = *ctx.bumps.get("bridge_state").unwrap();
        
        // Set the bridge as the authority for the fee account
        let cpi_accounts = SetAuthority {
            account_or_pubkey: ctx.accounts.fee_vault.to_account_info(),
            current_authority: ctx.accounts.admin.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
        );
        token::set_authority(
            cpi_ctx,
            AuthorityType::AccountOwner,
            Some(ctx.accounts.bridge_state.key()),
        )?;
        
        Ok(())
    }

    // Process a fiat deposit (called by Circle webhook or admin)
    pub fn process_fiat_deposit(
        ctx: Context<ProcessFiatDeposit>,
        amount: u64,
        user: Pubkey,
        circle_tx_id: String,
    ) -> Result<()> {
        let bridge_state = &ctx.accounts.bridge_state;
        
        // Verify the transaction hasn't been processed
        if ctx.accounts.processed_tx.load()? != 0 {
            return Err(ErrorCode::TransactionAlreadyProcessed.into());
        }
        
        // Calculate fees and rewards
        let fee = amount.checked_mul(u64::from(bridge_state.fee_basis_points))
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(10_000)
            .ok_or(ErrorCode::MathOverflow)?;
            
        let reward = amount.checked_mul(u64::from(bridge_state.reward_basis_points))
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(10_000)
            .ok_or(ErrorCode::MathOverflow)?;
            
        let amount_after_fees = amount.checked_sub(fee).ok_or(ErrorCode::MathOverflow)?;
        
        // Transfer USDC to user
        let transfer_ix = Transfer {
            from: ctx.accounts.bridge_vault.to_account_info(),
            to: ctx.accounts.user_ata.to_account_info(),
            authority: bridge_state.to_account_info(),
        };
        
        let seeds = &[
            b"bridge_state".as_ref(),
            &[bridge_state.bump],
        ];
        let signer = &[&seeds[..]];
        
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            transfer_ix,
            signer,
        );
        
        token::transfer(cpi_ctx, amount_after_fees)?;
        
        // Transfer fee to fee vault
        let fee_ix = Transfer {
            from: ctx.accounts.bridge_vault.to_account_info(),
            to: ctx.accounts.fee_vault.to_account_info(),
            authority: bridge_state.to_account_info(),
        };
        
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            fee_ix,
            signer,
        );
        
        token::transfer(cpi_ctx, fee)?;
        
        // Mark transaction as processed
        ctx.accounts.processed_tx.store(1, Ordering::Relaxed);
        
        // Emit event
        emit!(FiatDepositProcessed {
            user,
            amount,
            fee,
            reward,
            circle_tx_id,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }
    
    // Withdraw fees (admin only)
    pub fn withdraw_fees(
        ctx: Context<WithdrawFees>,
        amount: u64,
    ) -> Result<()> {
        let transfer_ix = Transfer {
            from: ctx.accounts.fee_vault.to_account_info(),
            to: ctx.accounts.admin_ata.to_account_info(),
            authority: ctx.accounts.bridge_state.to_account_info(),
        };
        
        let seeds = &[
            b"bridge_state".as_ref(),
            &[ctx.accounts.bridge_state.bump],
        ];
        let signer = &[&seeds[..]];
        
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            transfer_ix,
            signer,
        );
        
        token::transfer(cpi_ctx, amount)?;
        
        emit!(FeesWithdrawn {
            admin: *ctx.accounts.admin.key,
            amount,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }
}

// Accounts for initialize_bridge
#[derive(Accounts)]
pub struct InitializeBridge<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + 32 + 32 + 2 + 2 + 1,
        seeds = [b"bridge_state"],
        bump,
    )]
    pub bridge_state: Account<'info, BridgeState>,
    
    #[account(mut)]
    pub admin: Signer<'info>,
    
    pub usdc_mint: Account<'info, Mint>,
    
    #[account(
        init_if_needed,
        payer = admin,
        token::mint = usdc_mint,
        token::authority = bridge_state,
    )]
    pub fee_vault: Account<'info, TokenAccount>,
    
    #[account(
        init_if_needed,
        payer = admin,
        token::mint = usdc_mint,
        token::authority = bridge_state,
    )]
    pub bridge_vault: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

// Accounts for process_fiat_deposit
#[derive(Accounts)]
#[instruction(circle_tx_id: String)]
pub struct ProcessFiatDeposit<'info> {
    #[account(
        seeds = [b"bridge_state"],
        bump = bridge_state.bump,
    )]
    pub bridge_state: Account<'info, BridgeState>,
    
    #[account(mut)]
    pub bridge_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub fee_vault: Account<'info, TokenAccount>,
    
    #[account(
        init_if_needed,
        payer = admin,
        space = 8 + 1,
        seeds = [b"processed_tx", circle_tx_id.as_bytes()],
        bump,
    )]
    pub processed_tx: AccountLoader<'info, u8>,
    
    #[account(mut)]
    pub user_ata: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub admin: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

// Accounts for withdraw_fees
#[derive(Accounts)]
pub struct WithdrawFees<'info> {
    #[account(
        seeds = [b"bridge_state"],
        bump = bridge_state.bump,
        has_one = admin,
    )]
    pub bridge_state: Account<'info, BridgeState>,
    
    #[account(mut)]
    pub fee_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub admin_ata: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub admin: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

// Bridge state
#[account]
pub struct BridgeState {
    pub admin: Pubkey,
    pub usdc_mint: Pubkey,
    pub fee_basis_points: u16, // 100 = 1%
    pub reward_basis_points: u16, // 100 = 1%
    pub bump: u8,
}

// Events
#[event]
pub struct FiatDepositProcessed {
    pub user: Pubkey,
    pub amount: u64,
    pub fee: u64,
    pub reward: u64,
    pub circle_tx_id: String,
    pub timestamp: i64,
}

#[event]
pub struct FeesWithdrawn {
    pub admin: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

// Error codes
#[error_code]
pub enum ErrorCode {
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Transaction already processed")]
    TransactionAlreadyProcessed,
    #[msg("Unauthorized")]
    Unauthorized,
}
