use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{
        self, 
        Mint, 
        Token, 
        TokenAccount,
        Transfer,
        SetAuthority,
        spl_token::instruction::AuthorityType,
    },
};
use std::str::FromStr;

// Program ID needs to be updated after deployment
declare_id!("KYCVerification11111111111111111111111111111");

#[program]
pub mod kyc_verification {
    use super::*;

    // Initialize KYC mint (only callable by program admin)
    pub fn initialize_kyc_mint(
        ctx: Context<InitializeKycMint>,
    ) -> Result<()> {
        // Set mint authority to the program
        let cpi_accounts = SetAuthority {
            account_or_pubkey: ctx.accounts.mint.to_account_info(),
            current_authority: ctx.accounts.admin.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
        );
        token::set_authority(
            cpi_ctx,
            AuthorityType::MintTokens,
            Some(ctx.program_id),
        )?;

        Ok(())
    }

    // Verify KYC and mint SBT to user
    pub fn verify_kyc(
        ctx: Context<VerifyKyc>,
    ) -> Result<()> {
        // In a real implementation, this would verify off-chain KYC data
        // For now, we'll just mint the SBT
        
        // Mint exactly 1 SBT to the user
        let cpi_accounts = token::MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.user_ata.to_account_info(),
            authority: ctx.program_id,
        };
        
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            &[&[b"kyc_mint"]]
        );
        
        token::mint_to(cpi_ctx, 1)?;
        
        // Emit event for indexers
        emit!(KycVerified {
            user: ctx.accounts.user.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }
}

// Accounts for initialize_kyc_mint
#[derive(Accounts)]
pub struct InitializeKycMint<'info> {
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

// Accounts for verify_kyc
#[derive(Accounts)]
pub struct VerifyKyc<'info> {
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = mint,
        associated_token::authority = user,
    )]
    pub user_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

// Event emitted when KYC is verified
#[event]
pub struct KycVerified {
    pub user: Pubkey,
    pub timestamp: i64,
}

// Error codes
#[error_code]
pub enum ErrorCode {
    #[msg("KYC verification failed")]
    KycVerificationFailed,
    #[msg("Unauthorized")]
    Unauthorized,
}
