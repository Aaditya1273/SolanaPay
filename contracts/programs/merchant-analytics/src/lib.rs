use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::AssociatedToken;
use mpl_token_metadata::instruction::{create_metadata_accounts_v3};
use mpl_token_metadata::state::{DataV2, Creator};

declare_id!("MERCxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

#[program]
pub mod merchant_analytics {
    use super::*;

    /// Initialize merchant analytics program
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.total_merchants = 0;
        config.total_transactions = 0;
        config.total_volume = 0;
        config.is_paused = false;

        emit!(ProgramInitialized {
            authority: config.authority,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Register merchant for analytics tracking
    pub fn register_merchant(
        ctx: Context<RegisterMerchant>,
        business_name: String,
        business_type: MerchantType,
        api_key: String,
    ) -> Result<()> {
        let merchant = &mut ctx.accounts.merchant;
        let config = &mut ctx.accounts.config;

        require!(!config.is_paused, ErrorCode::ProgramPaused);
        require!(business_name.len() <= 100, ErrorCode::NameTooLong);
        require!(api_key.len() == 64, ErrorCode::InvalidApiKey);

        merchant.owner = ctx.accounts.owner.key();
        merchant.business_name = business_name.clone();
        merchant.business_type = business_type;
        merchant.api_key = api_key.clone();
        merchant.total_sales = 0;
        merchant.total_customers = 0;
        merchant.total_transactions = 0;
        merchant.loyalty_points_issued = 0;
        merchant.is_active = true;
        merchant.created_at = Clock::get()?.unix_timestamp;

        config.total_merchants += 1;

        emit!(MerchantRegistered {
            merchant_id: merchant.key(),
            owner: merchant.owner,
            business_name,
            business_type,
            timestamp: merchant.created_at,
        });

        Ok(())
    }

    /// Log transaction for analytics
    pub fn log_transaction(
        ctx: Context<LogTransaction>,
        amount: u64,
        currency: Currency,
        customer_id: Option<String>,
        transaction_hash: String,
        metadata: String,
    ) -> Result<()> {
        let merchant = &mut ctx.accounts.merchant;
        let transaction = &mut ctx.accounts.transaction;
        let config = &mut ctx.accounts.config;

        require!(merchant.is_active, ErrorCode::MerchantInactive);
        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(transaction_hash.len() <= 100, ErrorCode::HashTooLong);
        require!(metadata.len() <= 500, ErrorCode::MetadataTooLong);

        // Initialize transaction record
        transaction.merchant = merchant.key();
        transaction.amount = amount;
        transaction.currency = currency;
        transaction.customer_id = customer_id.clone();
        transaction.transaction_hash = transaction_hash.clone();
        transaction.metadata = metadata;
        transaction.timestamp = Clock::get()?.unix_timestamp;

        // Update merchant stats
        merchant.total_sales += amount;
        merchant.total_transactions += 1;

        // Update global stats
        config.total_transactions += 1;
        config.total_volume += amount;

        // Track unique customers
        if customer_id.is_some() {
            merchant.total_customers += 1;
        }

        emit!(TransactionLogged {
            merchant_id: merchant.key(),
            transaction_id: transaction.key(),
            amount,
            currency,
            customer_id,
            transaction_hash,
            timestamp: transaction.timestamp,
        });

        Ok(())
    }

    /// Issue loyalty points to customer
    pub fn issue_loyalty_points(
        ctx: Context<IssueLoyaltyPoints>,
        customer_id: String,
        points: u32,
        reason: String,
    ) -> Result<()> {
        let merchant = &mut ctx.accounts.merchant;
        let loyalty_record = &mut ctx.accounts.loyalty_record;

        require!(merchant.is_active, ErrorCode::MerchantInactive);
        require!(points > 0, ErrorCode::InvalidPoints);
        require!(customer_id.len() <= 100, ErrorCode::CustomerIdTooLong);
        require!(reason.len() <= 200, ErrorCode::ReasonTooLong);

        // Initialize loyalty record
        loyalty_record.merchant = merchant.key();
        loyalty_record.customer_id = customer_id.clone();
        loyalty_record.points = points;
        loyalty_record.reason = reason.clone();
        loyalty_record.status = LoyaltyStatus::Active;
        loyalty_record.issued_at = Clock::get()?.unix_timestamp;

        // Update merchant loyalty stats
        merchant.loyalty_points_issued += points as u64;

        emit!(LoyaltyPointsIssued {
            merchant_id: merchant.key(),
            loyalty_id: loyalty_record.key(),
            customer_id,
            points,
            reason,
            timestamp: loyalty_record.issued_at,
        });

        Ok(())
    }

    /// Redeem loyalty points
    pub fn redeem_loyalty_points(
        ctx: Context<RedeemLoyaltyPoints>,
        customer_id: String,
        points_to_redeem: u32,
        reward_description: String,
    ) -> Result<()> {
        let merchant = &ctx.accounts.merchant;
        let redemption = &mut ctx.accounts.redemption;

        require!(merchant.is_active, ErrorCode::MerchantInactive);
        require!(points_to_redeem > 0, ErrorCode::InvalidPoints);
        require!(customer_id.len() <= 100, ErrorCode::CustomerIdTooLong);
        require!(reward_description.len() <= 200, ErrorCode::DescriptionTooLong);

        // Initialize redemption record
        redemption.merchant = merchant.key();
        redemption.customer_id = customer_id.clone();
        redemption.points_redeemed = points_to_redeem;
        redemption.reward_description = reward_description.clone();
        redemption.status = RedemptionStatus::Pending;
        redemption.redeemed_at = Clock::get()?.unix_timestamp;

        emit!(LoyaltyPointsRedeemed {
            merchant_id: merchant.key(),
            redemption_id: redemption.key(),
            customer_id,
            points_redeemed: points_to_redeem,
            reward_description,
            timestamp: redemption.redeemed_at,
        });

        Ok(())
    }

    /// Mint NFT reward for top customers
    pub fn mint_customer_nft(
        ctx: Context<MintCustomerNft>,
        customer_id: String,
        tier: CustomerTier,
        metadata_uri: String,
    ) -> Result<()> {
        let merchant = &ctx.accounts.merchant;
        let nft_reward = &mut ctx.accounts.nft_reward;

        require!(merchant.is_active, ErrorCode::MerchantInactive);
        require!(customer_id.len() <= 100, ErrorCode::CustomerIdTooLong);
        require!(metadata_uri.len() <= 200, ErrorCode::UriTooLong);

        // Create NFT metadata
        let tier_name = match tier {
            CustomerTier::Bronze => "Bronze",
            CustomerTier::Silver => "Silver", 
            CustomerTier::Gold => "Gold",
            CustomerTier::Platinum => "Platinum",
        };

        let data = DataV2 {
            name: format!("{} {} Customer NFT", merchant.business_name, tier_name),
            symbol: "MERC".to_string(),
            uri: metadata_uri.clone(),
            seller_fee_basis_points: 0,
            creators: Some(vec![Creator {
                address: merchant.owner,
                verified: true,
                share: 100,
            }]),
            collection: None,
            uses: None,
        };

        // Initialize NFT reward record
        nft_reward.merchant = merchant.key();
        nft_reward.customer_id = customer_id.clone();
        nft_reward.tier = tier;
        nft_reward.mint = ctx.accounts.mint.key();
        nft_reward.metadata_uri = metadata_uri;
        nft_reward.minted_at = Clock::get()?.unix_timestamp;

        emit!(CustomerNftMinted {
            merchant_id: merchant.key(),
            nft_id: nft_reward.key(),
            customer_id,
            tier,
            mint: ctx.accounts.mint.key(),
            timestamp: nft_reward.minted_at,
        });

        Ok(())
    }

    /// Get merchant analytics summary
    pub fn get_analytics_summary(ctx: Context<GetAnalyticsSummary>) -> Result<AnalyticsSummary> {
        let merchant = &ctx.accounts.merchant;

        require!(merchant.is_active, ErrorCode::MerchantInactive);

        let summary = AnalyticsSummary {
            total_sales: merchant.total_sales,
            total_transactions: merchant.total_transactions,
            total_customers: merchant.total_customers,
            loyalty_points_issued: merchant.loyalty_points_issued,
            average_transaction_value: if merchant.total_transactions > 0 {
                merchant.total_sales / merchant.total_transactions
            } else {
                0
            },
        };

        Ok(summary)
    }

    /// Update merchant status
    pub fn update_merchant_status(
        ctx: Context<UpdateMerchantStatus>,
        is_active: bool,
    ) -> Result<()> {
        let merchant = &mut ctx.accounts.merchant;

        require!(
            merchant.owner == ctx.accounts.authority.key(),
            ErrorCode::Unauthorized
        );

        merchant.is_active = is_active;

        emit!(MerchantStatusUpdated {
            merchant_id: merchant.key(),
            is_active,
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
        space = 8 + AnalyticsConfig::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, AnalyticsConfig>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterMerchant<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + Merchant::INIT_SPACE,
        seeds = [b"merchant", owner.key().as_ref()],
        bump
    )]
    pub merchant: Account<'info, Merchant>,
    
    #[account(
        mut,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, AnalyticsConfig>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LogTransaction<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Transaction::INIT_SPACE,
        seeds = [b"transaction", merchant.key().as_ref()],
        bump
    )]
    pub transaction: Account<'info, Transaction>,
    
    #[account(
        mut,
        seeds = [b"merchant", merchant.owner.as_ref()],
        bump
    )]
    pub merchant: Account<'info, Merchant>,
    
    #[account(
        mut,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, AnalyticsConfig>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct IssueLoyaltyPoints<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + LoyaltyRecord::INIT_SPACE,
        seeds = [b"loyalty", merchant.key().as_ref()],
        bump
    )]
    pub loyalty_record: Account<'info, LoyaltyRecord>,
    
    #[account(
        mut,
        seeds = [b"merchant", merchant.owner.as_ref()],
        bump
    )]
    pub merchant: Account<'info, Merchant>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RedeemLoyaltyPoints<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + LoyaltyRedemption::INIT_SPACE,
        seeds = [b"redemption", merchant.key().as_ref()],
        bump
    )]
    pub redemption: Account<'info, LoyaltyRedemption>,
    
    #[account(
        seeds = [b"merchant", merchant.owner.as_ref()],
        bump
    )]
    pub merchant: Account<'info, Merchant>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintCustomerNft<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + NftReward::INIT_SPACE,
        seeds = [b"nft_reward", merchant.key().as_ref()],
        bump
    )]
    pub nft_reward: Account<'info, NftReward>,
    
    #[account(
        seeds = [b"merchant", merchant.owner.as_ref()],
        bump
    )]
    pub merchant: Account<'info, Merchant>,
    
    #[account(mut)]
    pub mint: Signer<'info>,
    
    /// CHECK: Metadata account
    #[account(mut)]
    pub metadata: AccountInfo<'info>,
    
    /// CHECK: Recipient account
    pub recipient: AccountInfo<'info>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// CHECK: Token metadata program
    pub token_metadata_program: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct GetAnalyticsSummary<'info> {
    #[account(
        seeds = [b"merchant", merchant.owner.as_ref()],
        bump
    )]
    pub merchant: Account<'info, Merchant>,
}

#[derive(Accounts)]
pub struct UpdateMerchantStatus<'info> {
    #[account(
        mut,
        seeds = [b"merchant", merchant.owner.as_ref()],
        bump
    )]
    pub merchant: Account<'info, Merchant>,
    
    pub authority: Signer<'info>,
}

#[account]
pub struct AnalyticsConfig {
    pub authority: Pubkey,
    pub total_merchants: u64,
    pub total_transactions: u64,
    pub total_volume: u64,
    pub is_paused: bool,
}

impl AnalyticsConfig {
    pub const INIT_SPACE: usize = 32 + 8 + 8 + 8 + 1;
}

#[account]
pub struct Merchant {
    pub owner: Pubkey,
    pub business_name: String,
    pub business_type: MerchantType,
    pub api_key: String,
    pub total_sales: u64,
    pub total_customers: u64,
    pub total_transactions: u64,
    pub loyalty_points_issued: u64,
    pub is_active: bool,
    pub created_at: i64,
}

impl Merchant {
    pub const INIT_SPACE: usize = 32 + 100 + 1 + 64 + 8 + 8 + 8 + 8 + 1 + 8;
}

#[account]
pub struct Transaction {
    pub merchant: Pubkey,
    pub amount: u64,
    pub currency: Currency,
    pub customer_id: Option<String>,
    pub transaction_hash: String,
    pub metadata: String,
    pub timestamp: i64,
}

impl Transaction {
    pub const INIT_SPACE: usize = 32 + 8 + 1 + 100 + 100 + 500 + 8;
}

#[account]
pub struct LoyaltyRecord {
    pub merchant: Pubkey,
    pub customer_id: String,
    pub points: u32,
    pub reason: String,
    pub status: LoyaltyStatus,
    pub issued_at: i64,
}

impl LoyaltyRecord {
    pub const INIT_SPACE: usize = 32 + 100 + 4 + 200 + 1 + 8;
}

#[account]
pub struct LoyaltyRedemption {
    pub merchant: Pubkey,
    pub customer_id: String,
    pub points_redeemed: u32,
    pub reward_description: String,
    pub status: RedemptionStatus,
    pub redeemed_at: i64,
}

impl LoyaltyRedemption {
    pub const INIT_SPACE: usize = 32 + 100 + 4 + 200 + 1 + 8;
}

#[account]
pub struct NftReward {
    pub merchant: Pubkey,
    pub customer_id: String,
    pub tier: CustomerTier,
    pub mint: Pubkey,
    pub metadata_uri: String,
    pub minted_at: i64,
}

impl NftReward {
    pub const INIT_SPACE: usize = 32 + 100 + 1 + 32 + 200 + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum MerchantType {
    Retail,
    Restaurant,
    Service,
    Ecommerce,
    Other,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum Currency {
    Sol,
    Usdc,
    Other,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum LoyaltyStatus {
    Active,
    Redeemed,
    Expired,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum RedemptionStatus {
    Pending,
    Completed,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Copy)]
pub enum CustomerTier {
    Bronze,
    Silver,
    Gold,
    Platinum,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct AnalyticsSummary {
    pub total_sales: u64,
    pub total_transactions: u64,
    pub total_customers: u64,
    pub loyalty_points_issued: u64,
    pub average_transaction_value: u64,
}

#[event]
pub struct ProgramInitialized {
    pub authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct MerchantRegistered {
    pub merchant_id: Pubkey,
    pub owner: Pubkey,
    pub business_name: String,
    pub business_type: MerchantType,
    pub timestamp: i64,
}

#[event]
pub struct TransactionLogged {
    pub merchant_id: Pubkey,
    pub transaction_id: Pubkey,
    pub amount: u64,
    pub currency: Currency,
    pub customer_id: Option<String>,
    pub transaction_hash: String,
    pub timestamp: i64,
}

#[event]
pub struct LoyaltyPointsIssued {
    pub merchant_id: Pubkey,
    pub loyalty_id: Pubkey,
    pub customer_id: String,
    pub points: u32,
    pub reason: String,
    pub timestamp: i64,
}

#[event]
pub struct LoyaltyPointsRedeemed {
    pub merchant_id: Pubkey,
    pub redemption_id: Pubkey,
    pub customer_id: String,
    pub points_redeemed: u32,
    pub reward_description: String,
    pub timestamp: i64,
}

#[event]
pub struct CustomerNftMinted {
    pub merchant_id: Pubkey,
    pub nft_id: Pubkey,
    pub customer_id: String,
    pub tier: CustomerTier,
    pub mint: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct MerchantStatusUpdated {
    pub merchant_id: Pubkey,
    pub is_active: bool,
    pub timestamp: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Program is currently paused")]
    ProgramPaused,
    #[msg("Business name too long")]
    NameTooLong,
    #[msg("Invalid API key format")]
    InvalidApiKey,
    #[msg("Merchant is inactive")]
    MerchantInactive,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Transaction hash too long")]
    HashTooLong,
    #[msg("Metadata too long")]
    MetadataTooLong,
    #[msg("Invalid points amount")]
    InvalidPoints,
    #[msg("Customer ID too long")]
    CustomerIdTooLong,
    #[msg("Reason too long")]
    ReasonTooLong,
    #[msg("Description too long")]
    DescriptionTooLong,
    #[msg("URI too long")]
    UriTooLong,
    #[msg("Unauthorized access")]
    Unauthorized,
}
