use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("ESCRxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

#[program]
pub mod escrow_arbitration {
    use super::*;

    /// Initialize the escrow arbitration program
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.treasury = ctx.accounts.treasury.key();
        config.arbitration_fee = 1000000; // 0.001 SOL
        config.dispute_timeout = 7 * 24 * 60 * 60; // 7 days
        config.total_escrows = 0;
        config.total_disputes = 0;
        config.is_paused = false;

        emit!(ProgramInitialized {
            authority: config.authority,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Create escrow with locked funds
    pub fn create_escrow(
        ctx: Context<CreateEscrow>,
        amount: u64,
        description: String,
        auto_release_time: Option<i64>,
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        let config = &mut ctx.accounts.config;

        require!(!config.is_paused, ErrorCode::ProgramPaused);
        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(description.len() <= 200, ErrorCode::DescriptionTooLong);

        // Initialize escrow
        escrow.buyer = ctx.accounts.buyer.key();
        escrow.seller = ctx.accounts.seller.key();
        escrow.amount = amount;
        escrow.status = EscrowStatus::Active;
        escrow.description = description;
        escrow.created_at = Clock::get()?.unix_timestamp;
        escrow.auto_release_time = auto_release_time;
        escrow.is_disputed = false;

        // Lock funds in escrow
        **ctx.accounts.buyer.to_account_info().try_borrow_mut_lamports()? -= amount;
        **escrow.to_account_info().try_borrow_mut_lamports()? += amount;

        config.total_escrows += 1;

        emit!(EscrowCreated {
            escrow_id: escrow.key(),
            buyer: escrow.buyer,
            seller: escrow.seller,
            amount,
            timestamp: escrow.created_at,
        });

        Ok(())
    }

    /// Release escrow funds to seller
    pub fn release_escrow(ctx: Context<ReleaseEscrow>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;

        require!(escrow.status == EscrowStatus::Active, ErrorCode::InvalidEscrowStatus);
        require!(!escrow.is_disputed, ErrorCode::EscrowDisputed);

        // Check authorization
        let clock = Clock::get()?;
        let is_authorized = escrow.buyer == ctx.accounts.authority.key() ||
            (escrow.auto_release_time.is_some() && 
             clock.unix_timestamp >= escrow.auto_release_time.unwrap());

        require!(is_authorized, ErrorCode::Unauthorized);

        // Release funds to seller
        escrow.status = EscrowStatus::Completed;
        escrow.completed_at = Some(clock.unix_timestamp);

        **escrow.to_account_info().try_borrow_mut_lamports()? -= escrow.amount;
        **ctx.accounts.seller.to_account_info().try_borrow_mut_lamports()? += escrow.amount;

        emit!(EscrowReleased {
            escrow_id: escrow.key(),
            seller: escrow.seller,
            amount: escrow.amount,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Create dispute for escrow
    pub fn create_dispute(ctx: Context<CreateDispute>, reason: String) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        let dispute = &mut ctx.accounts.dispute;
        let config = &mut ctx.accounts.config;

        require!(escrow.status == EscrowStatus::Active, ErrorCode::InvalidEscrowStatus);
        require!(!escrow.is_disputed, ErrorCode::AlreadyDisputed);
        require!(reason.len() <= 500, ErrorCode::ReasonTooLong);

        // Only buyer or seller can create dispute
        require!(
            escrow.buyer == ctx.accounts.disputer.key() ||
            escrow.seller == ctx.accounts.disputer.key(),
            ErrorCode::Unauthorized
        );

        // Initialize dispute
        dispute.escrow = escrow.key();
        dispute.disputer = ctx.accounts.disputer.key();
        dispute.reason = reason.clone();
        dispute.status = DisputeStatus::Open;
        dispute.created_at = Clock::get()?.unix_timestamp;
        dispute.assigned_arbiter = None;

        escrow.is_disputed = true;
        config.total_disputes += 1;

        emit!(DisputeCreated {
            dispute_id: dispute.key(),
            escrow_id: escrow.key(),
            disputer: dispute.disputer,
            reason,
            timestamp: dispute.created_at,
        });

        Ok(())
    }

    /// Add arbiter to DAO
    pub fn add_arbiter(ctx: Context<AddArbiter>, stake_amount: u64) -> Result<()> {
        let arbiter = &mut ctx.accounts.arbiter;
        let config = &ctx.accounts.config;

        require!(
            ctx.accounts.authority.key() == config.authority,
            ErrorCode::Unauthorized
        );
        require!(stake_amount >= 10_000_000, ErrorCode::InsufficientStake); // 0.01 SOL minimum

        arbiter.pubkey = ctx.accounts.arbiter_account.key();
        arbiter.stake = stake_amount;
        arbiter.reputation = 100; // Starting reputation
        arbiter.cases_resolved = 0;
        arbiter.is_active = true;
        arbiter.joined_at = Clock::get()?.unix_timestamp;

        // Lock stake
        **ctx.accounts.arbiter_account.to_account_info().try_borrow_mut_lamports()? -= stake_amount;
        **arbiter.to_account_info().try_borrow_mut_lamports()? += stake_amount;

        emit!(ArbiterAdded {
            arbiter: arbiter.pubkey,
            stake: stake_amount,
            timestamp: arbiter.joined_at,
        });

        Ok(())
    }

    /// Resolve dispute by arbiter
    pub fn resolve_dispute(
        ctx: Context<ResolveDispute>,
        decision: DisputeDecision,
        reasoning: String,
    ) -> Result<()> {
        let dispute = &mut ctx.accounts.dispute;
        let escrow = &mut ctx.accounts.escrow;
        let arbiter = &mut ctx.accounts.arbiter;

        require!(dispute.status == DisputeStatus::Open, ErrorCode::InvalidDisputeStatus);
        require!(arbiter.is_active, ErrorCode::ArbiterInactive);
        require!(reasoning.len() <= 1000, ErrorCode::ReasoningTooLong);

        // Assign arbiter if not already assigned
        if dispute.assigned_arbiter.is_none() {
            dispute.assigned_arbiter = Some(arbiter.pubkey);
        }

        require!(
            dispute.assigned_arbiter.unwrap() == arbiter.pubkey,
            ErrorCode::UnauthorizedArbiter
        );

        // Execute decision
        match decision {
            DisputeDecision::FavorBuyer => {
                // Refund to buyer
                **escrow.to_account_info().try_borrow_mut_lamports()? -= escrow.amount;
                **ctx.accounts.buyer.to_account_info().try_borrow_mut_lamports()? += escrow.amount;
                escrow.status = EscrowStatus::Refunded;
            }
            DisputeDecision::FavorSeller => {
                // Release to seller
                **escrow.to_account_info().try_borrow_mut_lamports()? -= escrow.amount;
                **ctx.accounts.seller.to_account_info().try_borrow_mut_lamports()? += escrow.amount;
                escrow.status = EscrowStatus::Completed;
            }
        }

        dispute.status = DisputeStatus::Resolved;
        dispute.decision = Some(decision);
        dispute.reasoning = Some(reasoning.clone());
        dispute.resolved_at = Some(Clock::get()?.unix_timestamp);

        // Update arbiter stats
        arbiter.cases_resolved += 1;
        arbiter.reputation += 10; // Increase reputation for resolving case

        emit!(DisputeResolved {
            dispute_id: dispute.key(),
            escrow_id: escrow.key(),
            arbiter: arbiter.pubkey,
            decision,
            timestamp: dispute.resolved_at.unwrap(),
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + EscrowConfig::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, EscrowConfig>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// CHECK: Treasury account
    pub treasury: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateEscrow<'info> {
    #[account(
        init,
        payer = buyer,
        space = 8 + Escrow::INIT_SPACE,
        seeds = [b"escrow", buyer.key().as_ref()],
        bump
    )]
    pub escrow: Account<'info, Escrow>,
    
    #[account(
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, EscrowConfig>,
    
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    /// CHECK: Seller account
    pub seller: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReleaseEscrow<'info> {
    #[account(
        mut,
        seeds = [b"escrow", escrow.buyer.as_ref()],
        bump
    )]
    pub escrow: Account<'info, Escrow>,
    
    pub authority: Signer<'info>,
    
    #[account(mut)]
    /// CHECK: Seller account
    pub seller: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct CreateDispute<'info> {
    #[account(
        init,
        payer = disputer,
        space = 8 + Dispute::INIT_SPACE,
        seeds = [b"dispute", escrow.key().as_ref()],
        bump
    )]
    pub dispute: Account<'info, Dispute>,
    
    #[account(
        mut,
        seeds = [b"escrow", escrow.buyer.as_ref()],
        bump
    )]
    pub escrow: Account<'info, Escrow>,
    
    #[account(
        mut,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, EscrowConfig>,
    
    #[account(mut)]
    pub disputer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddArbiter<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Arbiter::INIT_SPACE,
        seeds = [b"arbiter", arbiter_account.key().as_ref()],
        bump
    )]
    pub arbiter: Account<'info, Arbiter>,
    
    #[account(
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, EscrowConfig>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(mut)]
    /// CHECK: Arbiter account
    pub arbiter_account: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveDispute<'info> {
    #[account(
        mut,
        seeds = [b"dispute", dispute.escrow.as_ref()],
        bump
    )]
    pub dispute: Account<'info, Dispute>,
    
    #[account(
        mut,
        seeds = [b"escrow", escrow.buyer.as_ref()],
        bump
    )]
    pub escrow: Account<'info, Escrow>,
    
    #[account(
        mut,
        seeds = [b"arbiter", arbiter.pubkey.as_ref()],
        bump
    )]
    pub arbiter: Account<'info, Arbiter>,
    
    #[account(mut)]
    /// CHECK: Buyer account
    pub buyer: AccountInfo<'info>,
    
    #[account(mut)]
    /// CHECK: Seller account
    pub seller: AccountInfo<'info>,
}

#[account]
pub struct EscrowConfig {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub arbitration_fee: u64,
    pub dispute_timeout: i64,
    pub total_escrows: u64,
    pub total_disputes: u64,
    pub is_paused: bool,
}

impl EscrowConfig {
    pub const INIT_SPACE: usize = 32 + 32 + 8 + 8 + 8 + 8 + 1;
}

#[account]
pub struct Escrow {
    pub buyer: Pubkey,
    pub seller: Pubkey,
    pub amount: u64,
    pub status: EscrowStatus,
    pub description: String,
    pub created_at: i64,
    pub completed_at: Option<i64>,
    pub auto_release_time: Option<i64>,
    pub is_disputed: bool,
}

impl Escrow {
    pub const INIT_SPACE: usize = 32 + 32 + 8 + 1 + 200 + 8 + 9 + 9 + 1;
}

#[account]
pub struct Dispute {
    pub escrow: Pubkey,
    pub disputer: Pubkey,
    pub reason: String,
    pub status: DisputeStatus,
    pub created_at: i64,
    pub resolved_at: Option<i64>,
    pub assigned_arbiter: Option<Pubkey>,
    pub decision: Option<DisputeDecision>,
    pub reasoning: Option<String>,
}

impl Dispute {
    pub const INIT_SPACE: usize = 32 + 32 + 500 + 1 + 8 + 9 + 33 + 2 + 1000;
}

#[account]
pub struct Arbiter {
    pub pubkey: Pubkey,
    pub stake: u64,
    pub reputation: u32,
    pub cases_resolved: u32,
    pub is_active: bool,
    pub joined_at: i64,
}

impl Arbiter {
    pub const INIT_SPACE: usize = 32 + 8 + 4 + 4 + 1 + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum EscrowStatus {
    Active,
    Completed,
    Refunded,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum DisputeStatus {
    Open,
    Resolved,
    Appealed,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Copy)]
pub enum DisputeDecision {
    FavorBuyer,
    FavorSeller,
}

#[event]
pub struct ProgramInitialized {
    pub authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct EscrowCreated {
    pub escrow_id: Pubkey,
    pub buyer: Pubkey,
    pub seller: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct EscrowReleased {
    pub escrow_id: Pubkey,
    pub seller: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct DisputeCreated {
    pub dispute_id: Pubkey,
    pub escrow_id: Pubkey,
    pub disputer: Pubkey,
    pub reason: String,
    pub timestamp: i64,
}

#[event]
pub struct DisputeResolved {
    pub dispute_id: Pubkey,
    pub escrow_id: Pubkey,
    pub arbiter: Pubkey,
    pub decision: DisputeDecision,
    pub timestamp: i64,
}

#[event]
pub struct ArbiterAdded {
    pub arbiter: Pubkey,
    pub stake: u64,
    pub timestamp: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Program is currently paused")]
    ProgramPaused,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Description too long")]
    DescriptionTooLong,
    #[msg("Invalid escrow status")]
    InvalidEscrowStatus,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Escrow is disputed")]
    EscrowDisputed,
    #[msg("Already disputed")]
    AlreadyDisputed,
    #[msg("Reason too long")]
    ReasonTooLong,
    #[msg("Invalid dispute status")]
    InvalidDisputeStatus,
    #[msg("Arbiter is inactive")]
    ArbiterInactive,
    #[msg("Unauthorized arbiter")]
    UnauthorizedArbiter,
    #[msg("Reasoning too long")]
    ReasoningTooLong,
    #[msg("Insufficient stake")]
    InsufficientStake,
}
