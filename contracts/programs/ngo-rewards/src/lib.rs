use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{
        create_metadata_accounts_v3, mpl_token_metadata::types::{CollectionDetails, DataV2},
        CreateMetadataAccountsV3, Metadata,
    },
    token::{self, Mint, Token, TokenAccount, MintTo},
};

declare_id!("NGORewards1111111111111111111111111111111");

#[program]
pub mod ngo_rewards {
    use super::*;

    pub fn initialize_ngo(
        ctx: Context<InitializeNGO>,
        name: String,
        description: String,
        website: String,
    ) -> Result<()> {
        let ngo = &mut ctx.accounts.ngo;
        ngo.authority = ctx.accounts.authority.key();
        ngo.name = name;
        ngo.description = description;
        ngo.website = website;
        ngo.total_tasks = 0;
        ngo.total_volunteers = 0;
        ngo.total_rewards_distributed = 0;
        ngo.is_active = true;
        ngo.created_at = Clock::get()?.unix_timestamp;
        
        Ok(())
    }

    pub fn create_task(
        ctx: Context<CreateTask>,
        title: String,
        description: String,
        reward_amount: u64,
        max_completions: u32,
        deadline: i64,
        required_proof: TaskProofType,
    ) -> Result<()> {
        let task = &mut ctx.accounts.task;
        let ngo = &mut ctx.accounts.ngo;
        
        require!(ngo.is_active, NGOError::NGOInactive);
        require!(deadline > Clock::get()?.unix_timestamp, NGOError::InvalidDeadline);
        
        task.ngo = ngo.key();
        task.creator = ctx.accounts.authority.key();
        task.title = title;
        task.description = description;
        task.reward_amount = reward_amount;
        task.max_completions = max_completions;
        task.current_completions = 0;
        task.deadline = deadline;
        task.required_proof = required_proof;
        task.status = TaskStatus::Active;
        task.created_at = Clock::get()?.unix_timestamp;
        
        ngo.total_tasks += 1;
        
        emit!(TaskCreated {
            ngo: ngo.key(),
            task: task.key(),
            title: task.title.clone(),
            reward_amount,
            max_completions,
            deadline,
        });
        
        Ok(())
    }

    pub fn submit_task_completion(
        ctx: Context<SubmitTaskCompletion>,
        proof_data: String,
        proof_hash: String,
    ) -> Result<()> {
        let task = &ctx.accounts.task;
        let completion = &mut ctx.accounts.completion;
        
        require!(task.status == TaskStatus::Active, NGOError::TaskNotActive);
        require!(task.current_completions < task.max_completions, NGOError::TaskMaxReached);
        require!(task.deadline > Clock::get()?.unix_timestamp, NGOError::TaskExpired);
        
        completion.task = task.key();
        completion.volunteer = ctx.accounts.volunteer.key();
        completion.proof_data = proof_data;
        completion.proof_hash = proof_hash;
        completion.status = CompletionStatus::Pending;
        completion.submitted_at = Clock::get()?.unix_timestamp;
        completion.validated_at = 0;
        completion.validator = Pubkey::default();
        
        emit!(TaskSubmitted {
            task: task.key(),
            volunteer: ctx.accounts.volunteer.key(),
            completion: completion.key(),
            submitted_at: completion.submitted_at,
        });
        
        Ok(())
    }

    pub fn validate_task_completion(
        ctx: Context<ValidateTaskCompletion>,
        approved: bool,
        feedback: String,
    ) -> Result<()> {
        let task = &mut ctx.accounts.task;
        let ngo = &mut ctx.accounts.ngo;
        let completion = &mut ctx.accounts.completion;
        
        require!(completion.status == CompletionStatus::Pending, NGOError::AlreadyValidated);
        
        completion.status = if approved { CompletionStatus::Approved } else { CompletionStatus::Rejected };
        completion.feedback = feedback;
        completion.validated_at = Clock::get()?.unix_timestamp;
        completion.validator = ctx.accounts.validator.key();
        
        if approved {
            task.current_completions += 1;
            
            // Check if task is now complete
            if task.current_completions >= task.max_completions {
                task.status = TaskStatus::Completed;
            }
            
            emit!(TaskValidated {
                task: task.key(),
                volunteer: completion.volunteer,
                completion: completion.key(),
                approved: true,
                validated_at: completion.validated_at,
            });
        } else {
            emit!(TaskValidated {
                task: task.key(),
                volunteer: completion.volunteer,
                completion: completion.key(),
                approved: false,
                validated_at: completion.validated_at,
            });
        }
        
        Ok(())
    }

    pub fn mint_reward_nft(
        ctx: Context<MintRewardNFT>,
        name: String,
        symbol: String,
        uri: String,
        reward_tier: RewardTier,
    ) -> Result<()> {
        let completion = &ctx.accounts.completion;
        let task = &ctx.accounts.task;
        let ngo = &mut ctx.accounts.ngo;
        
        require!(completion.status == CompletionStatus::Approved, NGOError::NotApproved);
        require!(completion.task == task.key(), NGOError::InvalidTask);
        
        // Mint NFT to volunteer
        let mint_to_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.token_account.to_account_info(),
                authority: ctx.accounts.ngo.to_account_info(),
            },
        );
        
        let ngo_key = ngo.key();
        let seeds = &[b"ngo", ngo_key.as_ref(), &[ctx.bumps.ngo]];
        let signer = &[&seeds[..]];
        
        token::mint_to(mint_to_ctx.with_signer(signer), 1)?;
        
        // Create metadata
        let metadata_ctx = CpiContext::new(
            ctx.accounts.metadata_program.to_account_info(),
            CreateMetadataAccountsV3 {
                metadata: ctx.accounts.metadata.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                mint_authority: ctx.accounts.ngo.to_account_info(),
                update_authority: ctx.accounts.ngo.to_account_info(),
                payer: ctx.accounts.volunteer.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
        );
        
        let data_v2 = DataV2 {
            name,
            symbol,
            uri,
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        };
        
        create_metadata_accounts_v3(
            metadata_ctx.with_signer(signer),
            data_v2,
            false,
            true,
            Some(CollectionDetails::V1 { size: 0 }),
        )?;
        
        ngo.total_rewards_distributed += 1;
        
        emit!(RewardNFTMinted {
            ngo: ngo.key(),
            task: task.key(),
            volunteer: completion.volunteer,
            mint: ctx.accounts.mint.key(),
            reward_tier,
            minted_at: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    pub fn distribute_micro_rewards(
        ctx: Context<DistributeMicroRewards>,
        recipients: Vec<Pubkey>,
        amounts: Vec<u64>,
    ) -> Result<()> {
        let ngo = &ctx.accounts.ngo;
        
        require!(recipients.len() == amounts.len(), NGOError::MismatchedArrays);
        require!(recipients.len() <= 10, NGOError::TooManyRecipients);
        
        let total_amount: u64 = amounts.iter().sum();
        
        // Transfer tokens from NGO to recipients
        // This would require multiple token accounts and transfers
        // Simplified for demo - in production would use remaining_accounts
        
        emit!(MicroRewardsDistributed {
            ngo: ngo.key(),
            total_recipients: recipients.len() as u32,
            total_amount,
            distributed_at: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeNGO<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + NGO::INIT_SPACE,
        seeds = [b"ngo", authority.key().as_ref()],
        bump
    )]
    pub ngo: Account<'info, NGO>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateTask<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Task::INIT_SPACE,
        seeds = [b"task", ngo.key().as_ref(), &ngo.total_tasks.to_le_bytes()],
        bump
    )]
    pub task: Account<'info, Task>,
    
    #[account(
        mut,
        has_one = authority,
        constraint = ngo.is_active @ NGOError::NGOInactive
    )]
    pub ngo: Account<'info, NGO>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitTaskCompletion<'info> {
    #[account(
        init,
        payer = volunteer,
        space = 8 + TaskCompletion::INIT_SPACE,
        seeds = [b"completion", task.key().as_ref(), volunteer.key().as_ref()],
        bump
    )]
    pub completion: Account<'info, TaskCompletion>,
    
    pub task: Account<'info, Task>,
    
    #[account(mut)]
    pub volunteer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ValidateTaskCompletion<'info> {
    #[account(mut)]
    pub task: Account<'info, Task>,
    
    #[account(
        mut,
        has_one = authority,
    )]
    pub ngo: Account<'info, NGO>,
    
    #[account(mut)]
    pub completion: Account<'info, TaskCompletion>,
    
    pub authority: Signer<'info>,
    pub validator: Signer<'info>,
}

#[derive(Accounts)]
pub struct MintRewardNFT<'info> {
    #[account(
        mut,
        seeds = [b"ngo", ngo.authority.as_ref()],
        bump
    )]
    pub ngo: Account<'info, NGO>,
    
    pub task: Account<'info, Task>,
    pub completion: Account<'info, TaskCompletion>,
    
    #[account(
        init,
        payer = volunteer,
        mint::decimals = 0,
        mint::authority = ngo,
        mint::freeze_authority = ngo,
    )]
    pub mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = volunteer,
        associated_token::mint = mint,
        associated_token::authority = volunteer
    )]
    pub token_account: Account<'info, TokenAccount>,
    
    /// CHECK: Metadata account
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub volunteer: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub metadata_program: Program<'info, Metadata>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct DistributeMicroRewards<'info> {
    pub ngo: Account<'info, NGO>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[account]
#[derive(InitSpace)]
pub struct NGO {
    pub authority: Pubkey,
    #[max_len(100)]
    pub name: String,
    #[max_len(500)]
    pub description: String,
    #[max_len(200)]
    pub website: String,
    pub total_tasks: u64,
    pub total_volunteers: u64,
    pub total_rewards_distributed: u64,
    pub is_active: bool,
    pub created_at: i64,
}

#[account]
#[derive(InitSpace)]
pub struct Task {
    pub ngo: Pubkey,
    pub creator: Pubkey,
    #[max_len(100)]
    pub title: String,
    #[max_len(1000)]
    pub description: String,
    pub reward_amount: u64,
    pub max_completions: u32,
    pub current_completions: u32,
    pub deadline: i64,
    pub required_proof: TaskProofType,
    pub status: TaskStatus,
    pub created_at: i64,
}

#[account]
#[derive(InitSpace)]
pub struct TaskCompletion {
    pub task: Pubkey,
    pub volunteer: Pubkey,
    #[max_len(2000)]
    pub proof_data: String,
    #[max_len(64)]
    pub proof_hash: String,
    pub status: CompletionStatus,
    #[max_len(500)]
    pub feedback: String,
    pub submitted_at: i64,
    pub validated_at: i64,
    pub validator: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace, PartialEq)]
pub enum TaskStatus {
    Active,
    Completed,
    Cancelled,
    Expired,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace, PartialEq)]
pub enum CompletionStatus {
    Pending,
    Approved,
    Rejected,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub enum TaskProofType {
    Photo,
    Document,
    Video,
    Location,
    Attestation,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub enum RewardTier {
    Bronze,
    Silver,
    Gold,
    Platinum,
}

#[event]
pub struct TaskCreated {
    pub ngo: Pubkey,
    pub task: Pubkey,
    pub title: String,
    pub reward_amount: u64,
    pub max_completions: u32,
    pub deadline: i64,
}

#[event]
pub struct TaskSubmitted {
    pub task: Pubkey,
    pub volunteer: Pubkey,
    pub completion: Pubkey,
    pub submitted_at: i64,
}

#[event]
pub struct TaskValidated {
    pub task: Pubkey,
    pub volunteer: Pubkey,
    pub completion: Pubkey,
    pub approved: bool,
    pub validated_at: i64,
}

#[event]
pub struct RewardNFTMinted {
    pub ngo: Pubkey,
    pub task: Pubkey,
    pub volunteer: Pubkey,
    pub mint: Pubkey,
    pub reward_tier: RewardTier,
    pub minted_at: i64,
}

#[event]
pub struct MicroRewardsDistributed {
    pub ngo: Pubkey,
    pub total_recipients: u32,
    pub total_amount: u64,
    pub distributed_at: i64,
}

#[error_code]
pub enum NGOError {
    #[msg("NGO is not active")]
    NGOInactive,
    #[msg("Task is not active")]
    TaskNotActive,
    #[msg("Task has reached maximum completions")]
    TaskMaxReached,
    #[msg("Task has expired")]
    TaskExpired,
    #[msg("Task completion already validated")]
    AlreadyValidated,
    #[msg("Task completion not approved")]
    NotApproved,
    #[msg("Invalid task")]
    InvalidTask,
    #[msg("Invalid deadline")]
    InvalidDeadline,
    #[msg("Mismatched array lengths")]
    MismatchedArrays,
    #[msg("Too many recipients")]
    TooManyRecipients,
}
