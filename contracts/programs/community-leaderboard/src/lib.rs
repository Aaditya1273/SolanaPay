use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::AssociatedToken;
use mpl_token_metadata::instruction::{create_metadata_accounts_v3};
use mpl_token_metadata::state::{DataV2, Creator};

declare_id!("COMMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

#[program]
pub mod community_leaderboard {
    use super::*;

    /// Initialize the community leaderboard program
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.total_users = 0;
        config.total_transactions = 0;
        config.total_tasks_completed = 0;
        config.total_rewards_distributed = 0;
        config.season_number = 1;
        config.season_start = Clock::get()?.unix_timestamp;
        config.season_end = Clock::get()?.unix_timestamp + (30 * 24 * 60 * 60); // 30 days
        config.is_paused = false;

        emit!(ProgramInitialized {
            authority: config.authority,
            season_number: config.season_number,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Register user for leaderboard tracking
    pub fn register_user(
        ctx: Context<RegisterUser>,
        username: String,
        sol_domain: Option<String>,
    ) -> Result<()> {
        let user_profile = &mut ctx.accounts.user_profile;
        let config = &mut ctx.accounts.config;

        require!(!config.is_paused, ErrorCode::ProgramPaused);
        require!(username.len() <= 50, ErrorCode::UsernameTooLong);
        
        if let Some(ref domain) = sol_domain {
            require!(domain.ends_with(".sol"), ErrorCode::InvalidSolDomain);
            require!(domain.len() <= 100, ErrorCode::DomainTooLong);
        }

        user_profile.owner = ctx.accounts.owner.key();
        user_profile.username = username.clone();
        user_profile.sol_domain = sol_domain.clone();
        user_profile.total_transactions = 0;
        user_profile.total_volume = 0;
        user_profile.tasks_completed = 0;
        user_profile.rewards_earned = 0;
        user_profile.contribution_score = 0;
        user_profile.tier = UserTier::Bronze;
        user_profile.badges = vec![];
        user_profile.joined_at = Clock::get()?.unix_timestamp;
        user_profile.last_activity = Clock::get()?.unix_timestamp;
        user_profile.is_active = true;

        config.total_users += 1;

        emit!(UserRegistered {
            user_id: user_profile.key(),
            owner: user_profile.owner,
            username,
            sol_domain,
            timestamp: user_profile.joined_at,
        });

        Ok(())
    }

    /// Record transaction for leaderboard scoring
    pub fn record_transaction(
        ctx: Context<RecordTransaction>,
        amount: u64,
        transaction_type: TransactionType,
        transaction_hash: String,
    ) -> Result<()> {
        let user_profile = &mut ctx.accounts.user_profile;
        let config = &mut ctx.accounts.config;

        require!(user_profile.is_active, ErrorCode::UserInactive);
        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(transaction_hash.len() <= 100, ErrorCode::HashTooLong);

        // Calculate contribution points based on transaction type and amount
        let points = calculate_transaction_points(transaction_type, amount);

        // Update user stats
        user_profile.total_transactions += 1;
        user_profile.total_volume += amount;
        user_profile.contribution_score += points;
        user_profile.last_activity = Clock::get()?.unix_timestamp;

        // Update global stats
        config.total_transactions += 1;

        // Check for tier upgrade
        update_user_tier(user_profile);

        emit!(TransactionRecorded {
            user_id: user_profile.key(),
            transaction_type,
            amount,
            points_earned: points,
            transaction_hash,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Record task completion for leaderboard scoring
    pub fn record_task_completion(
        ctx: Context<RecordTaskCompletion>,
        task_type: TaskType,
        difficulty: TaskDifficulty,
        reward_amount: u64,
        task_id: String,
    ) -> Result<()> {
        let user_profile = &mut ctx.accounts.user_profile;
        let config = &mut ctx.accounts.config;

        require!(user_profile.is_active, ErrorCode::UserInactive);
        require!(task_id.len() <= 100, ErrorCode::TaskIdTooLong);

        // Calculate contribution points based on task type and difficulty
        let points = calculate_task_points(task_type, difficulty, reward_amount);

        // Update user stats
        user_profile.tasks_completed += 1;
        user_profile.rewards_earned += reward_amount;
        user_profile.contribution_score += points;
        user_profile.last_activity = Clock::get()?.unix_timestamp;

        // Update global stats
        config.total_tasks_completed += 1;
        config.total_rewards_distributed += reward_amount;

        // Check for tier upgrade and badges
        update_user_tier(user_profile);
        check_and_award_badges(user_profile, task_type);

        emit!(TaskCompleted {
            user_id: user_profile.key(),
            task_type,
            difficulty,
            points_earned: points,
            reward_amount,
            task_id,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Get user's leaderboard position
    pub fn get_user_rank(ctx: Context<GetUserRank>) -> Result<UserRankInfo> {
        let user_profile = &ctx.accounts.user_profile;
        
        // This would typically require iterating through all users to calculate rank
        // For efficiency, this should be done off-chain or with a separate ranking system
        let rank_info = UserRankInfo {
            user_id: user_profile.key(),
            contribution_score: user_profile.contribution_score,
            tier: user_profile.tier,
            total_transactions: user_profile.total_transactions,
            tasks_completed: user_profile.tasks_completed,
            rewards_earned: user_profile.rewards_earned,
            badges_count: user_profile.badges.len() as u32,
            estimated_rank: 0, // Would be calculated off-chain
        };

        Ok(rank_info)
    }

    /// Award special badge to user
    pub fn award_badge(
        ctx: Context<AwardBadge>,
        badge_type: BadgeType,
        reason: String,
    ) -> Result<()> {
        let user_profile = &mut ctx.accounts.user_profile;
        let config = &ctx.accounts.config;

        require!(
            ctx.accounts.authority.key() == config.authority,
            ErrorCode::Unauthorized
        );
        require!(reason.len() <= 200, ErrorCode::ReasonTooLong);

        // Check if user already has this badge
        if user_profile.badges.contains(&badge_type) {
            return Err(ErrorCode::BadgeAlreadyAwarded.into());
        }

        user_profile.badges.push(badge_type);

        // Award bonus points for special badges
        let bonus_points = match badge_type {
            BadgeType::EarlyAdopter => 1000,
            BadgeType::PowerUser => 2000,
            BadgeType::CommunityChampion => 3000,
            BadgeType::TaskMaster => 1500,
            BadgeType::TransactionKing => 2500,
            BadgeType::LoyaltyLegend => 5000,
        };

        user_profile.contribution_score += bonus_points;
        update_user_tier(user_profile);

        emit!(BadgeAwarded {
            user_id: user_profile.key(),
            badge_type,
            bonus_points,
            reason,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Start new leaderboard season
    pub fn start_new_season(ctx: Context<StartNewSeason>, duration_days: u32) -> Result<()> {
        let config = &mut ctx.accounts.config;

        require!(
            ctx.accounts.authority.key() == config.authority,
            ErrorCode::Unauthorized
        );
        require!(duration_days > 0 && duration_days <= 365, ErrorCode::InvalidDuration);

        let current_time = Clock::get()?.unix_timestamp;
        
        config.season_number += 1;
        config.season_start = current_time;
        config.season_end = current_time + (duration_days as i64 * 24 * 60 * 60);

        emit!(NewSeasonStarted {
            season_number: config.season_number,
            start_time: config.season_start,
            end_time: config.season_end,
            timestamp: current_time,
        });

        Ok(())
    }

    /// Mint achievement NFT for top contributors
    pub fn mint_achievement_nft(
        ctx: Context<MintAchievementNft>,
        achievement_type: AchievementType,
        metadata_uri: String,
    ) -> Result<()> {
        let user_profile = &ctx.accounts.user_profile;
        let achievement = &mut ctx.accounts.achievement;

        require!(metadata_uri.len() <= 200, ErrorCode::UriTooLong);

        // Verify user qualifies for achievement
        let qualifies = match achievement_type {
            AchievementType::Top10Overall => user_profile.contribution_score >= 10000,
            AchievementType::Top100Transactions => user_profile.total_transactions >= 100,
            AchievementType::TaskCompletionist => user_profile.tasks_completed >= 50,
            AchievementType::VolumeLeader => user_profile.total_volume >= 1000000000, // 1 SOL
            AchievementType::SeasonWinner => user_profile.tier == UserTier::Platinum,
        };

        require!(qualifies, ErrorCode::NotQualified);

        // Create NFT metadata
        let achievement_name = match achievement_type {
            AchievementType::Top10Overall => "Top 10 Contributor",
            AchievementType::Top100Transactions => "Transaction Master",
            AchievementType::TaskCompletionist => "Task Completionist",
            AchievementType::VolumeLeader => "Volume Leader",
            AchievementType::SeasonWinner => "Season Winner",
        };

        let data = DataV2 {
            name: format!("SolanaPay {} Achievement", achievement_name),
            symbol: "SPACH".to_string(),
            uri: metadata_uri.clone(),
            seller_fee_basis_points: 0,
            creators: Some(vec![Creator {
                address: user_profile.owner,
                verified: true,
                share: 100,
            }]),
            collection: None,
            uses: None,
        };

        // Initialize achievement record
        achievement.user_id = user_profile.key();
        achievement.achievement_type = achievement_type;
        achievement.mint = ctx.accounts.mint.key();
        achievement.metadata_uri = metadata_uri;
        achievement.season_number = ctx.accounts.config.season_number;
        achievement.minted_at = Clock::get()?.unix_timestamp;

        emit!(AchievementNftMinted {
            user_id: user_profile.key(),
            achievement_id: achievement.key(),
            achievement_type,
            mint: ctx.accounts.mint.key(),
            season_number: achievement.season_number,
            timestamp: achievement.minted_at,
        });

        Ok(())
    }
}

// Helper functions
fn calculate_transaction_points(transaction_type: TransactionType, amount: u64) -> u64 {
    let base_points = match transaction_type {
        TransactionType::Payment => 10,
        TransactionType::Reward => 5,
        TransactionType::Staking => 15,
        TransactionType::Trading => 8,
        TransactionType::Donation => 20,
    };

    // Bonus points based on amount (1 point per 0.01 SOL)
    let amount_bonus = amount / 10_000_000; // 0.01 SOL in lamports
    
    base_points + amount_bonus.min(100) // Cap bonus at 100 points
}

fn calculate_task_points(task_type: TaskType, difficulty: TaskDifficulty, reward_amount: u64) -> u64 {
    let base_points = match task_type {
        TaskType::Survey => 50,
        TaskType::Testing => 100,
        TaskType::Development => 200,
        TaskType::Community => 75,
        TaskType::Education => 125,
        TaskType::Marketing => 150,
    };

    let difficulty_multiplier = match difficulty {
        TaskDifficulty::Easy => 1,
        TaskDifficulty::Medium => 2,
        TaskDifficulty::Hard => 3,
        TaskDifficulty::Expert => 5,
    };

    let reward_bonus = (reward_amount / 1_000_000).min(500); // Max 500 bonus points
    
    (base_points * difficulty_multiplier) + reward_bonus
}

fn update_user_tier(user_profile: &mut UserProfile) {
    let new_tier = match user_profile.contribution_score {
        0..=999 => UserTier::Bronze,
        1000..=4999 => UserTier::Silver,
        5000..=19999 => UserTier::Gold,
        _ => UserTier::Platinum,
    };

    if new_tier != user_profile.tier {
        user_profile.tier = new_tier;
    }
}

fn check_and_award_badges(user_profile: &mut UserProfile, task_type: TaskType) {
    // Award TaskMaster badge for completing 25 tasks
    if user_profile.tasks_completed >= 25 && !user_profile.badges.contains(&BadgeType::TaskMaster) {
        user_profile.badges.push(BadgeType::TaskMaster);
    }

    // Award PowerUser badge for high activity
    if user_profile.total_transactions >= 50 && user_profile.tasks_completed >= 10 
        && !user_profile.badges.contains(&BadgeType::PowerUser) {
        user_profile.badges.push(BadgeType::PowerUser);
    }
}

// Account structures
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + LeaderboardConfig::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, LeaderboardConfig>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterUser<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + UserProfile::INIT_SPACE,
        seeds = [b"user", owner.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    
    #[account(
        mut,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, LeaderboardConfig>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordTransaction<'info> {
    #[account(
        mut,
        seeds = [b"user", user_profile.owner.as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    
    #[account(
        mut,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, LeaderboardConfig>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct RecordTaskCompletion<'info> {
    #[account(
        mut,
        seeds = [b"user", user_profile.owner.as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    
    #[account(
        mut,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, LeaderboardConfig>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct GetUserRank<'info> {
    #[account(
        seeds = [b"user", user_profile.owner.as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
}

#[derive(Accounts)]
pub struct AwardBadge<'info> {
    #[account(
        mut,
        seeds = [b"user", user_profile.owner.as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    
    #[account(
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, LeaderboardConfig>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct StartNewSeason<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, LeaderboardConfig>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct MintAchievementNft<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Achievement::INIT_SPACE,
        seeds = [b"achievement", user_profile.key().as_ref()],
        bump
    )]
    pub achievement: Account<'info, Achievement>,
    
    #[account(
        seeds = [b"user", user_profile.owner.as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    
    #[account(
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, LeaderboardConfig>,
    
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

// Data structures
#[account]
pub struct LeaderboardConfig {
    pub authority: Pubkey,
    pub total_users: u64,
    pub total_transactions: u64,
    pub total_tasks_completed: u64,
    pub total_rewards_distributed: u64,
    pub season_number: u32,
    pub season_start: i64,
    pub season_end: i64,
    pub is_paused: bool,
}

impl LeaderboardConfig {
    pub const INIT_SPACE: usize = 32 + 8 + 8 + 8 + 8 + 4 + 8 + 8 + 1;
}

#[account]
pub struct UserProfile {
    pub owner: Pubkey,
    pub username: String,
    pub sol_domain: Option<String>,
    pub total_transactions: u64,
    pub total_volume: u64,
    pub tasks_completed: u64,
    pub rewards_earned: u64,
    pub contribution_score: u64,
    pub tier: UserTier,
    pub badges: Vec<BadgeType>,
    pub joined_at: i64,
    pub last_activity: i64,
    pub is_active: bool,
}

impl UserProfile {
    pub const INIT_SPACE: usize = 32 + 50 + 100 + 8 + 8 + 8 + 8 + 8 + 1 + 100 + 8 + 8 + 1;
}

#[account]
pub struct Achievement {
    pub user_id: Pubkey,
    pub achievement_type: AchievementType,
    pub mint: Pubkey,
    pub metadata_uri: String,
    pub season_number: u32,
    pub minted_at: i64,
}

impl Achievement {
    pub const INIT_SPACE: usize = 32 + 1 + 32 + 200 + 4 + 8;
}

// Enums
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum UserTier {
    Bronze,
    Silver,
    Gold,
    Platinum,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum TransactionType {
    Payment,
    Reward,
    Staking,
    Trading,
    Donation,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum TaskType {
    Survey,
    Testing,
    Development,
    Community,
    Education,
    Marketing,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum TaskDifficulty {
    Easy,
    Medium,
    Hard,
    Expert,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum BadgeType {
    EarlyAdopter,
    PowerUser,
    CommunityChampion,
    TaskMaster,
    TransactionKing,
    LoyaltyLegend,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum AchievementType {
    Top10Overall,
    Top100Transactions,
    TaskCompletionist,
    VolumeLeader,
    SeasonWinner,
}

// Return types
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UserRankInfo {
    pub user_id: Pubkey,
    pub contribution_score: u64,
    pub tier: UserTier,
    pub total_transactions: u64,
    pub tasks_completed: u64,
    pub rewards_earned: u64,
    pub badges_count: u32,
    pub estimated_rank: u32,
}

// Events
#[event]
pub struct ProgramInitialized {
    pub authority: Pubkey,
    pub season_number: u32,
    pub timestamp: i64,
}

#[event]
pub struct UserRegistered {
    pub user_id: Pubkey,
    pub owner: Pubkey,
    pub username: String,
    pub sol_domain: Option<String>,
    pub timestamp: i64,
}

#[event]
pub struct TransactionRecorded {
    pub user_id: Pubkey,
    pub transaction_type: TransactionType,
    pub amount: u64,
    pub points_earned: u64,
    pub transaction_hash: String,
    pub timestamp: i64,
}

#[event]
pub struct TaskCompleted {
    pub user_id: Pubkey,
    pub task_type: TaskType,
    pub difficulty: TaskDifficulty,
    pub points_earned: u64,
    pub reward_amount: u64,
    pub task_id: String,
    pub timestamp: i64,
}

#[event]
pub struct BadgeAwarded {
    pub user_id: Pubkey,
    pub badge_type: BadgeType,
    pub bonus_points: u64,
    pub reason: String,
    pub timestamp: i64,
}

#[event]
pub struct NewSeasonStarted {
    pub season_number: u32,
    pub start_time: i64,
    pub end_time: i64,
    pub timestamp: i64,
}

#[event]
pub struct AchievementNftMinted {
    pub user_id: Pubkey,
    pub achievement_id: Pubkey,
    pub achievement_type: AchievementType,
    pub mint: Pubkey,
    pub season_number: u32,
    pub timestamp: i64,
}

// Error codes
#[error_code]
pub enum ErrorCode {
    #[msg("Program is currently paused")]
    ProgramPaused,
    #[msg("Username too long")]
    UsernameTooLong,
    #[msg("Invalid .sol domain")]
    InvalidSolDomain,
    #[msg("Domain too long")]
    DomainTooLong,
    #[msg("User is inactive")]
    UserInactive,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Transaction hash too long")]
    HashTooLong,
    #[msg("Task ID too long")]
    TaskIdTooLong,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Reason too long")]
    ReasonTooLong,
    #[msg("Badge already awarded")]
    BadgeAlreadyAwarded,
    #[msg("Invalid duration")]
    InvalidDuration,
    #[msg("URI too long")]
    UriTooLong,
    #[msg("User not qualified for achievement")]
    NotQualified,
}
