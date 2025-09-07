use anchor_lang::prelude::*;
use anchor_spl::{
    token::{self, Mint, Token, TokenAccount, Transfer, MintTo},
    associated_token::AssociatedToken,
};

// Program ID needs to be updated after deployment
declare_id!("MerchantRewards11111111111111111111111111111");

#[program]
pub mod merchant_rewards {
    use super::*;

    // Initialize reward pool
    pub fn initialize_reward_pool(
        ctx: Context<InitializeRewardPool>,
        reward_mint: Pubkey,
        kyc_verification_program: Pubkey,
    ) -> Result<()> {
        let reward_pool = &mut ctx.accounts.reward_pool;
        reward_pool.admin = *ctx.accounts.admin.key;
        reward_pool.reward_mint = reward_mint;
        reward_pool.kyc_verification_program = kyc_verification_program;
        reward_pool.bump = *ctx.bumps.get("reward_pool").unwrap();
        
        Ok(())
    }

    // Claim merchant rewards (only callable by KYC-verified users)
    pub fn claim_rewards(
        ctx: Context<ClaimRewards>,
        amount: u64,
    ) -> Result<()> {
        // Verify the user has a KYC SBT
        let kyc_verification_account = &ctx.accounts.kyc_verification_account;
        // In a real implementation, you would verify the KYC SBT ownership here
        // This is a simplified example
        
        // Transfer rewards from pool to user
        let cpi_accounts = Transfer {
            from: ctx.accounts.reward_vault.to_account_info(),
            to: ctx.accounts.user_reward_ata.to_account_info(),
            authority: ctx.accounts.reward_pool.to_account_info(),
        };
        
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
        );
        
        token::transfer(cpi_ctx, amount)?;
        
        // Emit event
        emit!(RewardClaimed {
            user: ctx.accounts.user.key(),
            amount,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }
}

// Accounts for initialize_reward_pool
#[derive(Accounts)]
#[instruction()]
pub struct InitializeRewardPool<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + 32 + 32 + 32 + 1,
        seeds = [b"reward_pool"],
        bump,
    )]
    pub reward_pool: Account<'info, RewardPool>,
    
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// Accounts for claim_rewards
#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(
        seeds = [b"reward_pool"],
        bump = reward_pool.bump,
    )]
    pub reward_pool: Account<'info, RewardPool>,
    
    #[account(
        mut,
        constraint = reward_vault.mint == reward_pool.reward_mint,
        constraint = reward_vault.owner == reward_pool.key(),
    )]
    pub reward_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        constraint = user_reward_ata.owner == user.key(),
        constraint = user_reward_ata.mint == reward_pool.reward_mint,
    )]
    pub user_reward_ata: Account<'info, TokenAccount>,
    
    // KYC verification program account (simplified)
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub kyc_verification_account: UncheckedAccount<'info>,
    
    pub token_program: Program<'info, Token>,
}

// Reward pool account
#[account]
pub struct RewardPool {
    pub admin: Pubkey,
    pub reward_mint: Pubkey,
    pub kyc_verification_program: Pubkey,
    pub bump: u8,
}

// Event emitted when rewards are claimed
#[event]
pub struct RewardClaimed {
    pub user: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

// Error codes
#[error_code]
pub enum ErrorCode {
    #[msg("User is not KYC verified")]
    NotKycVerified,
    #[msg("Insufficient rewards in the pool")]
    InsufficientRewards,
    #[msg("Unauthorized")]
    Unauthorized,
}
