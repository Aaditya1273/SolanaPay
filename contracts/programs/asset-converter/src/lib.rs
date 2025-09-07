use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::AssociatedToken;
use std::collections::HashMap;

declare_id!("AssetConv11111111111111111111111111111111");

#[program]
pub mod asset_converter {
    use super::*;

    /// Initialize the asset converter program
    pub fn initialize(
        ctx: Context<Initialize>,
        conversion_fee_rate: u64, // Fee rate in basis points (100 = 1%)
        admin: Pubkey,
    ) -> Result<()> {
        let converter_state = &mut ctx.accounts.converter_state;
        converter_state.admin = admin;
        converter_state.conversion_fee_rate = conversion_fee_rate;
        converter_state.total_conversions = 0;
        converter_state.total_volume = 0;
        converter_state.is_paused = false;
        converter_state.bump = *ctx.bumps.get("converter_state").unwrap();
        
        msg!("Asset Converter initialized with fee rate: {} bps", conversion_fee_rate);
        Ok(())
    }

    /// Add a new conversion pair (e.g., WETH -> SOL, USDT -> USDC)
    pub fn add_conversion_pair(
        ctx: Context<AddConversionPair>,
        source_mint: Pubkey,
        target_mint: Pubkey,
        conversion_rate: u64, // Rate in lamports (1e9 = 1:1 ratio)
        min_amount: u64,
        max_amount: u64,
    ) -> Result<()> {
        require!(!ctx.accounts.converter_state.is_paused, ErrorCode::ProgramPaused);
        
        let conversion_pair = &mut ctx.accounts.conversion_pair;
        conversion_pair.source_mint = source_mint;
        conversion_pair.target_mint = target_mint;
        conversion_pair.conversion_rate = conversion_rate;
        conversion_pair.min_amount = min_amount;
        conversion_pair.max_amount = max_amount;
        conversion_pair.is_active = true;
        conversion_pair.total_converted = 0;
        conversion_pair.bump = *ctx.bumps.get("conversion_pair").unwrap();
        
        msg!("Added conversion pair: {} -> {}", source_mint, target_mint);
        Ok(())
    }

    /// Convert wrapped assets to Solana native tokens
    pub fn convert_asset(
        ctx: Context<ConvertAsset>,
        amount: u64,
    ) -> Result<()> {
        let converter_state = &ctx.accounts.converter_state;
        let conversion_pair = &mut ctx.accounts.conversion_pair;
        
        require!(!converter_state.is_paused, ErrorCode::ProgramPaused);
        require!(conversion_pair.is_active, ErrorCode::ConversionPairInactive);
        require!(amount >= conversion_pair.min_amount, ErrorCode::AmountTooSmall);
        require!(amount <= conversion_pair.max_amount, ErrorCode::AmountTooLarge);

        // Calculate conversion amounts
        let target_amount = (amount as u128)
            .checked_mul(conversion_pair.conversion_rate as u128)
            .unwrap()
            .checked_div(1_000_000_000) // Normalize from 1e9 base
            .unwrap() as u64;

        let fee_amount = (target_amount as u128)
            .checked_mul(converter_state.conversion_fee_rate as u128)
            .unwrap()
            .checked_div(10_000) // Basis points
            .unwrap() as u64;

        let final_amount = target_amount.checked_sub(fee_amount).unwrap();

        // Transfer source tokens from user to program vault
        let transfer_source_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_source_account.to_account_info(),
                to: ctx.accounts.source_vault.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::transfer(transfer_source_ctx, amount)?;

        // Transfer target tokens from program vault to user
        let seeds = &[
            b"converter_state",
            &[converter_state.bump],
        ];
        let signer = &[&seeds[..]];

        let transfer_target_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.target_vault.to_account_info(),
                to: ctx.accounts.user_target_account.to_account_info(),
                authority: ctx.accounts.converter_state.to_account_info(),
            },
            signer,
        );
        token::transfer(transfer_target_ctx, final_amount)?;

        // Transfer fee to admin account if fee > 0
        if fee_amount > 0 {
            let transfer_fee_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.target_vault.to_account_info(),
                    to: ctx.accounts.admin_fee_account.to_account_info(),
                    authority: ctx.accounts.converter_state.to_account_info(),
                },
                signer,
            );
            token::transfer(transfer_fee_ctx, fee_amount)?;
        }

        // Update statistics
        conversion_pair.total_converted = conversion_pair.total_converted
            .checked_add(amount)
            .unwrap();

        // Emit conversion event
        emit!(AssetConvertedEvent {
            user: ctx.accounts.user.key(),
            source_mint: conversion_pair.source_mint,
            target_mint: conversion_pair.target_mint,
            source_amount: amount,
            target_amount: final_amount,
            fee_amount,
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!(
            "Converted {} {} to {} {} (fee: {})",
            amount,
            conversion_pair.source_mint,
            final_amount,
            conversion_pair.target_mint,
            fee_amount
        );

        Ok(())
    }

    /// Batch convert multiple assets in a single transaction
    pub fn batch_convert_assets(
        ctx: Context<BatchConvertAssets>,
        conversions: Vec<ConversionRequest>,
    ) -> Result<()> {
        require!(conversions.len() <= 5, ErrorCode::TooManyConversions);
        
        for (i, conversion) in conversions.iter().enumerate() {
            // Validate each conversion
            require!(conversion.amount > 0, ErrorCode::InvalidAmount);
            
            // Process conversion (simplified - in full implementation, 
            // you'd need to pass the appropriate accounts for each conversion)
            msg!("Processing conversion {}: {} tokens", i + 1, conversion.amount);
        }

        emit!(BatchConversionEvent {
            user: ctx.accounts.user.key(),
            conversion_count: conversions.len() as u8,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Emergency pause the converter
    pub fn pause_converter(ctx: Context<AdminAction>) -> Result<()> {
        let converter_state = &mut ctx.accounts.converter_state;
        converter_state.is_paused = true;
        
        emit!(ConverterPausedEvent {
            admin: ctx.accounts.admin.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Resume the converter
    pub fn resume_converter(ctx: Context<AdminAction>) -> Result<()> {
        let converter_state = &mut ctx.accounts.converter_state;
        converter_state.is_paused = false;
        
        emit!(ConverterResumedEvent {
            admin: ctx.accounts.admin.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Update conversion rate for a pair
    pub fn update_conversion_rate(
        ctx: Context<UpdateConversionPair>,
        new_rate: u64,
    ) -> Result<()> {
        let conversion_pair = &mut ctx.accounts.conversion_pair;
        let old_rate = conversion_pair.conversion_rate;
        conversion_pair.conversion_rate = new_rate;
        
        emit!(ConversionRateUpdatedEvent {
            source_mint: conversion_pair.source_mint,
            target_mint: conversion_pair.target_mint,
            old_rate,
            new_rate,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Withdraw accumulated fees (admin only)
    pub fn withdraw_fees(
        ctx: Context<WithdrawFees>,
        amount: u64,
    ) -> Result<()> {
        let seeds = &[
            b"converter_state",
            &[ctx.accounts.converter_state.bump],
        ];
        let signer = &[&seeds[..]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.fee_vault.to_account_info(),
                to: ctx.accounts.admin_account.to_account_info(),
                authority: ctx.accounts.converter_state.to_account_info(),
            },
            signer,
        );
        token::transfer(transfer_ctx, amount)?;

        emit!(FeesWithdrawnEvent {
            admin: ctx.accounts.admin.key(),
            amount,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + ConverterState::INIT_SPACE,
        seeds = [b"converter_state"],
        bump
    )]
    pub converter_state: Account<'info, ConverterState>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddConversionPair<'info> {
    #[account(
        mut,
        seeds = [b"converter_state"],
        bump = converter_state.bump,
        has_one = admin
    )]
    pub converter_state: Account<'info, ConverterState>,
    
    #[account(
        init,
        payer = admin,
        space = 8 + ConversionPair::INIT_SPACE,
        seeds = [b"conversion_pair", source_mint.key().as_ref(), target_mint.key().as_ref()],
        bump
    )]
    pub conversion_pair: Account<'info, ConversionPair>,
    
    pub source_mint: Account<'info, Mint>,
    pub target_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub admin: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ConvertAsset<'info> {
    #[account(
        seeds = [b"converter_state"],
        bump = converter_state.bump
    )]
    pub converter_state: Account<'info, ConverterState>,
    
    #[account(
        mut,
        seeds = [b"conversion_pair", source_mint.key().as_ref(), target_mint.key().as_ref()],
        bump = conversion_pair.bump
    )]
    pub conversion_pair: Account<'info, ConversionPair>,
    
    pub source_mint: Account<'info, Mint>,
    pub target_mint: Account<'info, Mint>,
    
    #[account(
        mut,
        associated_token::mint = source_mint,
        associated_token::authority = user
    )]
    pub user_source_account: Account<'info, TokenAccount>,
    
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = target_mint,
        associated_token::authority = user
    )]
    pub user_target_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = source_mint,
        associated_token::authority = converter_state
    )]
    pub source_vault: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = target_mint,
        associated_token::authority = converter_state
    )]
    pub target_vault: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = target_mint,
        associated_token::authority = converter_state.admin
    )]
    pub admin_fee_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BatchConvertAssets<'info> {
    #[account(
        seeds = [b"converter_state"],
        bump = converter_state.bump
    )]
    pub converter_state: Account<'info, ConverterState>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct AdminAction<'info> {
    #[account(
        mut,
        seeds = [b"converter_state"],
        bump = converter_state.bump,
        has_one = admin
    )]
    pub converter_state: Account<'info, ConverterState>,
    
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateConversionPair<'info> {
    #[account(
        seeds = [b"converter_state"],
        bump = converter_state.bump,
        has_one = admin
    )]
    pub converter_state: Account<'info, ConverterState>,
    
    #[account(
        mut,
        seeds = [b"conversion_pair", conversion_pair.source_mint.as_ref(), conversion_pair.target_mint.as_ref()],
        bump = conversion_pair.bump
    )]
    pub conversion_pair: Account<'info, ConversionPair>,
    
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct WithdrawFees<'info> {
    #[account(
        seeds = [b"converter_state"],
        bump = converter_state.bump,
        has_one = admin
    )]
    pub converter_state: Account<'info, ConverterState>,
    
    #[account(mut)]
    pub fee_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub admin_account: Account<'info, TokenAccount>,
    
    pub admin: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[account]
#[derive(InitSpace)]
pub struct ConverterState {
    pub admin: Pubkey,
    pub conversion_fee_rate: u64, // Basis points
    pub total_conversions: u64,
    pub total_volume: u64,
    pub is_paused: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ConversionPair {
    pub source_mint: Pubkey,
    pub target_mint: Pubkey,
    pub conversion_rate: u64, // Rate in lamports (1e9 = 1:1)
    pub min_amount: u64,
    pub max_amount: u64,
    pub is_active: bool,
    pub total_converted: u64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ConversionRequest {
    pub source_mint: Pubkey,
    pub target_mint: Pubkey,
    pub amount: u64,
}

#[event]
pub struct AssetConvertedEvent {
    pub user: Pubkey,
    pub source_mint: Pubkey,
    pub target_mint: Pubkey,
    pub source_amount: u64,
    pub target_amount: u64,
    pub fee_amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct BatchConversionEvent {
    pub user: Pubkey,
    pub conversion_count: u8,
    pub timestamp: i64,
}

#[event]
pub struct ConverterPausedEvent {
    pub admin: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ConverterResumedEvent {
    pub admin: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ConversionRateUpdatedEvent {
    pub source_mint: Pubkey,
    pub target_mint: Pubkey,
    pub old_rate: u64,
    pub new_rate: u64,
    pub timestamp: i64,
}

#[event]
pub struct FeesWithdrawnEvent {
    pub admin: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("The conversion program is currently paused")]
    ProgramPaused,
    #[msg("The conversion pair is not active")]
    ConversionPairInactive,
    #[msg("Amount is below minimum threshold")]
    AmountTooSmall,
    #[msg("Amount exceeds maximum threshold")]
    AmountTooLarge,
    #[msg("Invalid conversion amount")]
    InvalidAmount,
    #[msg("Too many conversions in batch (max 5)")]
    TooManyConversions,
    #[msg("Insufficient vault balance")]
    InsufficientVaultBalance,
    #[msg("Conversion rate calculation overflow")]
    ConversionOverflow,
}
