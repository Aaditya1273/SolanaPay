use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount, Transfer, transfer, MintTo, mint_to};
use anchor_spl::associated_token::AssociatedToken;
use mpl_token_metadata::instruction::{create_metadata_accounts_v3, create_master_edition_v3};
use mpl_token_metadata::state::{DataV2, Creator};

declare_id!("BountySystem111111111111111111111111111111111");

#[program]
pub mod bounty_system {
    use super::*;

    pub fn initialize_bounty_program(
        ctx: Context<InitializeBountyProgram>,
        authority: Pubkey,
        platform_fee_bps: u16,
        min_bounty_amount: u64,
    ) -> Result<()> {
        let bounty_config = &mut ctx.accounts.bounty_config;
        bounty_config.authority = authority;
        bounty_config.platform_fee_bps = platform_fee_bps;
        bounty_config.min_bounty_amount = min_bounty_amount;
        bounty_config.total_bounties_created = 0;
        bounty_config.total_bounties_completed = 0;
        bounty_config.total_rewards_distributed = 0;
        bounty_config.is_active = true;
        bounty_config.bump = *ctx.bumps.get("bounty_config").unwrap();

        emit!(BountyProgramInitialized {
            authority,
            platform_fee_bps,
            min_bounty_amount,
            slot: Clock::get()?.slot,
        });

        Ok(())
    }

    pub fn create_bounty(
        ctx: Context<CreateBounty>,
        title: String,
        description: String,
        reward_amount: u64,
        deadline: i64,
        category: BountyCategory,
        required_skills: Vec<String>,
        max_participants: u8,
    ) -> Result<()> {
        let bounty = &mut ctx.accounts.bounty;
        let bounty_config = &ctx.accounts.bounty_config;
        let current_slot = Clock::get()?.slot;
        let current_timestamp = Clock::get()?.unix_timestamp;

        require!(bounty_config.is_active, BountyError::ProgramNotActive);
        require!(reward_amount >= bounty_config.min_bounty_amount, BountyError::RewardTooLow);
        require!(deadline > current_timestamp, BountyError::InvalidDeadline);
        require!(max_participants > 0 && max_participants <= 100, BountyError::InvalidMaxParticipants);

        bounty.creator = ctx.accounts.creator.key();
        bounty.title = title;
        bounty.description = description;
        bounty.reward_amount = reward_amount;
        bounty.deadline = deadline;
        bounty.category = category;
        bounty.required_skills = required_skills;
        bounty.max_participants = max_participants;
        bounty.current_participants = 0;
        bounty.status = BountyStatus::Open;
        bounty.created_at = current_timestamp;
        bounty.completed_at = 0;
        bounty.winner = None;
        bounty.submissions_count = 0;
        bounty.bump = *ctx.bumps.get("bounty").unwrap();

        // Transfer reward to escrow
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.creator_token_account.to_account_info(),
                to: ctx.accounts.escrow_token_account.to_account_info(),
                authority: ctx.accounts.creator.to_account_info(),
            },
        );
        transfer(transfer_ctx, reward_amount)?;

        emit!(BountyCreated {
            bounty_id: bounty.key(),
            creator: bounty.creator,
            title: bounty.title.clone(),
            reward_amount,
            deadline,
            category,
            slot: current_slot,
        });

        Ok(())
    }

    pub fn submit_work(
        ctx: Context<SubmitWork>,
        submission_data: String,
        submission_hash: String,
    ) -> Result<()> {
        let bounty = &mut ctx.accounts.bounty;
        let submission = &mut ctx.accounts.submission;
        let current_timestamp = Clock::get()?.unix_timestamp;

        require!(bounty.status == BountyStatus::Open, BountyError::BountyNotOpen);
        require!(current_timestamp < bounty.deadline, BountyError::DeadlinePassed);
        require!(bounty.current_participants < bounty.max_participants, BountyError::MaxParticipantsReached);
        require!(bounty.creator != ctx.accounts.worker.key(), BountyError::CannotSubmitOwnBounty);

        submission.bounty = bounty.key();
        submission.worker = ctx.accounts.worker.key();
        submission.submission_data = submission_data;
        submission.submission_hash = submission_hash;
        submission.submitted_at = current_timestamp;
        submission.status = SubmissionStatus::Pending;
        submission.review_notes = String::new();
        submission.bump = *ctx.bumps.get("submission").unwrap();

        bounty.current_participants += 1;
        bounty.submissions_count += 1;

        emit!(WorkSubmitted {
            bounty_id: bounty.key(),
            worker: ctx.accounts.worker.key(),
            submission_id: submission.key(),
            submitted_at: current_timestamp,
        });

        Ok(())
    }

    pub fn approve_submission_and_mint_nft(
        ctx: Context<ApproveSubmissionAndMintNFT>,
        review_notes: String,
        nft_name: String,
        nft_symbol: String,
        nft_uri: String,
    ) -> Result<()> {
        let bounty = &mut ctx.accounts.bounty;
        let submission = &mut ctx.accounts.submission;
        let bounty_config = &mut ctx.accounts.bounty_config;
        let current_timestamp = Clock::get()?.unix_timestamp;

        require!(bounty.creator == ctx.accounts.creator.key(), BountyError::NotBountyCreator);
        require!(submission.status == SubmissionStatus::Pending, BountyError::SubmissionAlreadyReviewed);
        require!(bounty.status == BountyStatus::Open, BountyError::BountyNotOpen);

        // Update submission
        submission.status = SubmissionStatus::Approved;
        submission.review_notes = review_notes;

        // Update bounty
        bounty.status = BountyStatus::Completed;
        bounty.winner = Some(submission.worker);
        bounty.completed_at = current_timestamp;

        // Calculate platform fee
        let platform_fee = (bounty.reward_amount * bounty_config.platform_fee_bps as u64) / 10000;
        let worker_reward = bounty.reward_amount - platform_fee;

        // Transfer reward to worker
        let bounty_seeds = &[
            b"bounty",
            bounty.creator.as_ref(),
            &bounty.created_at.to_le_bytes(),
            &[bounty.bump],
        ];
        let signer = &[&bounty_seeds[..]];

        let transfer_to_worker_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.worker_token_account.to_account_info(),
                authority: bounty.to_account_info(),
            },
            signer,
        );
        transfer(transfer_to_worker_ctx, worker_reward)?;

        // Transfer platform fee
        if platform_fee > 0 {
            let transfer_fee_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_token_account.to_account_info(),
                    to: ctx.accounts.platform_fee_account.to_account_info(),
                    authority: bounty.to_account_info(),
                },
                signer,
            );
            transfer(transfer_fee_ctx, platform_fee)?;
        }

        // Mint NFT proof of completion
        let mint_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.nft_mint.to_account_info(),
                to: ctx.accounts.worker_nft_account.to_account_info(),
                authority: bounty.to_account_info(),
            },
            signer,
        );
        mint_to(mint_ctx, 1)?;

        // Create NFT metadata
        let creators = vec![
            Creator {
                address: bounty.creator,
                verified: false,
                share: 50,
            },
            Creator {
                address: submission.worker,
                verified: true,
                share: 50,
            },
        ];

        let metadata = DataV2 {
            name: nft_name,
            symbol: nft_symbol,
            uri: nft_uri,
            seller_fee_basis_points: 0,
            creators: Some(creators),
            collection: None,
            uses: None,
        };

        let metadata_ctx = CpiContext::new_with_signer(
            ctx.accounts.metadata_program.to_account_info(),
            create_metadata_accounts_v3(
                ctx.accounts.metadata_program.key(),
                ctx.accounts.nft_metadata.key(),
                ctx.accounts.nft_mint.key(),
                bounty.key(),
                ctx.accounts.creator.key(),
                bounty.key(),
                metadata,
                true,
                true,
                None,
            ),
            signer,
        );

        // Update global stats
        bounty_config.total_bounties_completed += 1;
        bounty_config.total_rewards_distributed += bounty.reward_amount;

        emit!(BountyCompleted {
            bounty_id: bounty.key(),
            winner: submission.worker,
            reward_amount: worker_reward,
            platform_fee,
            nft_mint: ctx.accounts.nft_mint.key(),
            completed_at: current_timestamp,
        });

        Ok(())
    }

    pub fn reject_submission(
        ctx: Context<RejectSubmission>,
        review_notes: String,
    ) -> Result<()> {
        let bounty = &ctx.accounts.bounty;
        let submission = &mut ctx.accounts.submission;

        require!(bounty.creator == ctx.accounts.creator.key(), BountyError::NotBountyCreator);
        require!(submission.status == SubmissionStatus::Pending, BountyError::SubmissionAlreadyReviewed);

        submission.status = SubmissionStatus::Rejected;
        submission.review_notes = review_notes;

        emit!(SubmissionRejected {
            bounty_id: bounty.key(),
            worker: submission.worker,
            submission_id: submission.key(),
            reason: submission.review_notes.clone(),
        });

        Ok(())
    }

    pub fn cancel_bounty(ctx: Context<CancelBounty>) -> Result<()> {
        let bounty = &mut ctx.accounts.bounty;
        let current_timestamp = Clock::get()?.unix_timestamp;

        require!(bounty.creator == ctx.accounts.creator.key(), BountyError::NotBountyCreator);
        require!(bounty.status == BountyStatus::Open, BountyError::BountyNotOpen);
        require!(bounty.submissions_count == 0, BountyError::HasSubmissions);

        bounty.status = BountyStatus::Cancelled;

        // Refund creator
        let bounty_seeds = &[
            b"bounty",
            bounty.creator.as_ref(),
            &bounty.created_at.to_le_bytes(),
            &[bounty.bump],
        ];
        let signer = &[&bounty_seeds[..]];

        let refund_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.creator_token_account.to_account_info(),
                authority: bounty.to_account_info(),
            },
            signer,
        );
        transfer(refund_ctx, bounty.reward_amount)?;

        emit!(BountyCancelled {
            bounty_id: bounty.key(),
            creator: bounty.creator,
            refund_amount: bounty.reward_amount,
            cancelled_at: current_timestamp,
        });

        Ok(())
    }
}

// Account structures
#[derive(Accounts)]
pub struct InitializeBountyProgram<'info> {
    #[account(
        init,
        payer = authority,
        space = BountyConfig::LEN,
        seeds = [b"bounty_config"],
        bump
    )]
    pub bounty_config: Account<'info, BountyConfig>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(title: String, description: String, reward_amount: u64, deadline: i64)]
pub struct CreateBounty<'info> {
    #[account(
        init,
        payer = creator,
        space = Bounty::LEN,
        seeds = [b"bounty", creator.key().as_ref(), &Clock::get().unwrap().unix_timestamp.to_le_bytes()],
        bump
    )]
    pub bounty: Account<'info, Bounty>,
    #[account(
        seeds = [b"bounty_config"],
        bump = bounty_config.bump
    )]
    pub bounty_config: Account<'info, BountyConfig>,
    #[account(
        init,
        payer = creator,
        associated_token::mint = reward_mint,
        associated_token::authority = bounty,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = reward_mint,
        associated_token::authority = creator,
    )]
    pub creator_token_account: Account<'info, TokenAccount>,
    pub reward_mint: Account<'info, Mint>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(submission_data: String)]
pub struct SubmitWork<'info> {
    #[account(
        mut,
        seeds = [b"bounty", bounty.creator.as_ref(), &bounty.created_at.to_le_bytes()],
        bump = bounty.bump
    )]
    pub bounty: Account<'info, Bounty>,
    #[account(
        init,
        payer = worker,
        space = Submission::LEN,
        seeds = [b"submission", bounty.key().as_ref(), worker.key().as_ref()],
        bump
    )]
    pub submission: Account<'info, Submission>,
    #[account(mut)]
    pub worker: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApproveSubmissionAndMintNFT<'info> {
    #[account(
        mut,
        seeds = [b"bounty", bounty.creator.as_ref(), &bounty.created_at.to_le_bytes()],
        bump = bounty.bump
    )]
    pub bounty: Account<'info, Bounty>,
    #[account(
        mut,
        seeds = [b"submission", bounty.key().as_ref(), submission.worker.as_ref()],
        bump = submission.bump
    )]
    pub submission: Account<'info, Submission>,
    #[account(
        mut,
        seeds = [b"bounty_config"],
        bump = bounty_config.bump
    )]
    pub bounty_config: Account<'info, BountyConfig>,
    #[account(
        mut,
        associated_token::mint = reward_mint,
        associated_token::authority = bounty,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = reward_mint,
        associated_token::authority = submission.worker,
    )]
    pub worker_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = reward_mint,
        associated_token::authority = bounty_config.authority,
    )]
    pub platform_fee_account: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = creator,
        mint::decimals = 0,
        mint::authority = bounty,
        mint::freeze_authority = bounty,
    )]
    pub nft_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = creator,
        associated_token::mint = nft_mint,
        associated_token::authority = submission.worker,
    )]
    pub worker_nft_account: Account<'info, TokenAccount>,
    /// CHECK: Metadata account
    #[account(mut)]
    pub nft_metadata: UncheckedAccount<'info>,
    pub reward_mint: Account<'info, Mint>,
    pub creator: Signer<'info>,
    /// CHECK: Metadata program
    pub metadata_program: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct RejectSubmission<'info> {
    #[account(
        seeds = [b"bounty", bounty.creator.as_ref(), &bounty.created_at.to_le_bytes()],
        bump = bounty.bump
    )]
    pub bounty: Account<'info, Bounty>,
    #[account(
        mut,
        seeds = [b"submission", bounty.key().as_ref(), submission.worker.as_ref()],
        bump = submission.bump
    )]
    pub submission: Account<'info, Submission>,
    pub creator: Signer<'info>,
}

#[derive(Accounts)]
pub struct CancelBounty<'info> {
    #[account(
        mut,
        seeds = [b"bounty", bounty.creator.as_ref(), &bounty.created_at.to_le_bytes()],
        bump = bounty.bump
    )]
    pub bounty: Account<'info, Bounty>,
    #[account(
        mut,
        associated_token::mint = reward_mint,
        associated_token::authority = bounty,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = reward_mint,
        associated_token::authority = creator,
    )]
    pub creator_token_account: Account<'info, TokenAccount>,
    pub reward_mint: Account<'info, Mint>,
    pub creator: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

// Data structures
#[account]
pub struct BountyConfig {
    pub authority: Pubkey,
    pub platform_fee_bps: u16,
    pub min_bounty_amount: u64,
    pub total_bounties_created: u64,
    pub total_bounties_completed: u64,
    pub total_rewards_distributed: u64,
    pub is_active: bool,
    pub bump: u8,
}

impl BountyConfig {
    pub const LEN: usize = 8 + 32 + 2 + 8 + 8 + 8 + 8 + 1 + 1;
}

#[account]
pub struct Bounty {
    pub creator: Pubkey,
    pub title: String,
    pub description: String,
    pub reward_amount: u64,
    pub deadline: i64,
    pub category: BountyCategory,
    pub required_skills: Vec<String>,
    pub max_participants: u8,
    pub current_participants: u8,
    pub status: BountyStatus,
    pub created_at: i64,
    pub completed_at: i64,
    pub winner: Option<Pubkey>,
    pub submissions_count: u32,
    pub bump: u8,
}

impl Bounty {
    pub const LEN: usize = 8 + 32 + 128 + 512 + 8 + 8 + 1 + 256 + 1 + 1 + 1 + 8 + 8 + 33 + 4 + 1;
}

#[account]
pub struct Submission {
    pub bounty: Pubkey,
    pub worker: Pubkey,
    pub submission_data: String,
    pub submission_hash: String,
    pub submitted_at: i64,
    pub status: SubmissionStatus,
    pub review_notes: String,
    pub bump: u8,
}

impl Submission {
    pub const LEN: usize = 8 + 32 + 32 + 1024 + 64 + 8 + 1 + 256 + 1;
}

// Enums
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum BountyCategory {
    Development,
    Design,
    Marketing,
    Content,
    Research,
    Testing,
    Community,
    Other,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum BountyStatus {
    Open,
    Completed,
    Cancelled,
    Expired,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum SubmissionStatus {
    Pending,
    Approved,
    Rejected,
}

// Events
#[event]
pub struct BountyProgramInitialized {
    pub authority: Pubkey,
    pub platform_fee_bps: u16,
    pub min_bounty_amount: u64,
    pub slot: u64,
}

#[event]
pub struct BountyCreated {
    pub bounty_id: Pubkey,
    pub creator: Pubkey,
    pub title: String,
    pub reward_amount: u64,
    pub deadline: i64,
    pub category: BountyCategory,
    pub slot: u64,
}

#[event]
pub struct WorkSubmitted {
    pub bounty_id: Pubkey,
    pub worker: Pubkey,
    pub submission_id: Pubkey,
    pub submitted_at: i64,
}

#[event]
pub struct BountyCompleted {
    pub bounty_id: Pubkey,
    pub winner: Pubkey,
    pub reward_amount: u64,
    pub platform_fee: u64,
    pub nft_mint: Pubkey,
    pub completed_at: i64,
}

#[event]
pub struct SubmissionRejected {
    pub bounty_id: Pubkey,
    pub worker: Pubkey,
    pub submission_id: Pubkey,
    pub reason: String,
}

#[event]
pub struct BountyCancelled {
    pub bounty_id: Pubkey,
    pub creator: Pubkey,
    pub refund_amount: u64,
    pub cancelled_at: i64,
}

// Errors
#[error_code]
pub enum BountyError {
    #[msg("Bounty program is not active")]
    ProgramNotActive,
    #[msg("Reward amount is below minimum")]
    RewardTooLow,
    #[msg("Invalid deadline")]
    InvalidDeadline,
    #[msg("Invalid max participants")]
    InvalidMaxParticipants,
    #[msg("Bounty is not open")]
    BountyNotOpen,
    #[msg("Deadline has passed")]
    DeadlinePassed,
    #[msg("Maximum participants reached")]
    MaxParticipantsReached,
    #[msg("Cannot submit to own bounty")]
    CannotSubmitOwnBounty,
    #[msg("Not the bounty creator")]
    NotBountyCreator,
    #[msg("Submission already reviewed")]
    SubmissionAlreadyReviewed,
    #[msg("Bounty has submissions")]
    HasSubmissions,
}
