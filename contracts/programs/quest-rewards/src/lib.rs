use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};
use mpl_bubblegum::{
    program::Bubblegum,
    state::{metaplex_adapter::MetaplexAdapter, TreeConfig},
};
use spl_account_compression::{
    program::SplAccountCompression,
    state::merkle_tree_get_size,
    Noop,
};

declare_id!("QuestRewards11111111111111111111111111111111");

#[program]
pub mod quest_rewards {
    use super::*;

    pub fn initialize_user_profile(
        ctx: Context<InitializeUserProfile>,
        sns_domain: String,
    ) -> Result<()> {
        let user_profile = &mut ctx.accounts.user_profile;
        user_profile.authority = ctx.accounts.authority.key();
        user_profile.sns_domain = sns_domain;
        user_profile.reputation_score = 0;
        user_profile.total_quests_completed = 0;
        user_profile.current_streak = 0;
        user_profile.longest_streak = 0;
        user_profile.last_activity = Clock::get()?.unix_timestamp;
        user_profile.level = 1;
        user_profile.total_xp = 0;
        user_profile.achievements_count = 0;
        user_profile.bump = *ctx.bumps.get("user_profile").unwrap();
        
        emit!(UserProfileCreated {
            user: ctx.accounts.authority.key(),
            sns_domain: user_profile.sns_domain.clone(),
            timestamp: user_profile.last_activity,
        });

        Ok(())
    }

    pub fn create_quest(
        ctx: Context<CreateQuest>,
        quest_id: String,
        title: String,
        description: String,
        quest_type: QuestType,
        category: QuestCategory,
        difficulty: QuestDifficulty,
        requirements: QuestRequirements,
        rewards: QuestRewards,
        duration_hours: u64,
    ) -> Result<()> {
        let quest = &mut ctx.accounts.quest;
        quest.quest_id = quest_id;
        quest.title = title;
        quest.description = description;
        quest.quest_type = quest_type;
        quest.category = category;
        quest.difficulty = difficulty;
        quest.requirements = requirements;
        quest.rewards = rewards;
        quest.creator = ctx.accounts.creator.key();
        quest.is_active = true;
        quest.created_at = Clock::get()?.unix_timestamp;
        quest.expires_at = quest.created_at + (duration_hours as i64 * 3600);
        quest.completions = 0;
        quest.bump = *ctx.bumps.get("quest").unwrap();

        emit!(QuestCreated {
            quest_id: quest.quest_id.clone(),
            creator: quest.creator,
            quest_type: quest.quest_type,
            difficulty: quest.difficulty,
            timestamp: quest.created_at,
        });

        Ok(())
    }

    pub fn start_quest(
        ctx: Context<StartQuest>,
        quest_id: String,
    ) -> Result<()> {
        let user_quest = &mut ctx.accounts.user_quest;
        let quest = &ctx.accounts.quest;
        let current_time = Clock::get()?.unix_timestamp;

        require!(quest.is_active, QuestError::QuestInactive);
        require!(current_time < quest.expires_at, QuestError::QuestExpired);

        user_quest.user = ctx.accounts.user.key();
        user_quest.quest = quest.key();
        user_quest.quest_id = quest_id;
        user_quest.status = QuestStatus::Active;
        user_quest.progress = QuestProgress::default();
        user_quest.started_at = current_time;
        user_quest.expires_at = quest.expires_at;
        user_quest.bump = *ctx.bumps.get("user_quest").unwrap();

        emit!(QuestStarted {
            user: ctx.accounts.user.key(),
            quest_id: user_quest.quest_id.clone(),
            started_at: current_time,
        });

        Ok(())
    }

    pub fn update_quest_progress(
        ctx: Context<UpdateQuestProgress>,
        progress_data: QuestProgress,
    ) -> Result<()> {
        let user_quest = &mut ctx.accounts.user_quest;
        let quest = &ctx.accounts.quest;
        let user_profile = &mut ctx.accounts.user_profile;

        require!(user_quest.status == QuestStatus::Active, QuestError::QuestNotActive);
        require!(Clock::get()?.unix_timestamp < user_quest.expires_at, QuestError::QuestExpired);

        user_quest.progress = progress_data;

        // Check if quest is completed
        let is_completed = match quest.requirements {
            QuestRequirements::PaymentCount { count } => user_quest.progress.payments_made >= count,
            QuestRequirements::VolumeAmount { amount } => user_quest.progress.volume_traded >= amount,
            QuestRequirements::StreakDays { days } => user_quest.progress.streak_days >= days,
            QuestRequirements::TasksCompleted { count } => user_quest.progress.tasks_completed >= count,
            QuestRequirements::SocialInteractions { count } => user_quest.progress.social_interactions >= count,
        };

        if is_completed && user_quest.status == QuestStatus::Active {
            user_quest.status = QuestStatus::Completed;
            user_quest.completed_at = Some(Clock::get()?.unix_timestamp);

            // Update user profile
            user_profile.total_quests_completed += 1;
            user_profile.total_xp += quest.rewards.xp_reward;
            user_profile.reputation_score += quest.rewards.reputation_points;
            user_profile.last_activity = Clock::get()?.unix_timestamp;

            // Level up logic
            let new_level = calculate_level(user_profile.total_xp);
            if new_level > user_profile.level {
                user_profile.level = new_level;
                emit!(UserLevelUp {
                    user: ctx.accounts.user.key(),
                    new_level,
                    total_xp: user_profile.total_xp,
                });
            }

            emit!(QuestCompleted {
                user: ctx.accounts.user.key(),
                quest_id: user_quest.quest_id.clone(),
                xp_earned: quest.rewards.xp_reward,
                reputation_earned: quest.rewards.reputation_points,
                completed_at: user_quest.completed_at.unwrap(),
            });
        }

        Ok(())
    }

    pub fn update_streak(
        ctx: Context<UpdateStreak>,
    ) -> Result<()> {
        let user_profile = &mut ctx.accounts.user_profile;
        let current_time = Clock::get()?.unix_timestamp;
        let last_activity = user_profile.last_activity;
        let time_diff = current_time - last_activity;

        // Check if it's been more than 24 hours since last activity
        if time_diff > 86400 { // 24 hours in seconds
            // Check if it's been more than 48 hours (streak broken)
            if time_diff > 172800 { // 48 hours
                user_profile.current_streak = 1; // Reset streak
                emit!(StreakBroken {
                    user: ctx.accounts.user.key(),
                    previous_streak: user_profile.current_streak,
                    timestamp: current_time,
                });
            } else {
                // Continue streak
                user_profile.current_streak += 1;
                if user_profile.current_streak > user_profile.longest_streak {
                    user_profile.longest_streak = user_profile.current_streak;
                }
                emit!(StreakUpdated {
                    user: ctx.accounts.user.key(),
                    current_streak: user_profile.current_streak,
                    is_new_record: user_profile.current_streak == user_profile.longest_streak,
                    timestamp: current_time,
                });
            }
        }

        user_profile.last_activity = current_time;
        Ok(())
    }

    pub fn mint_compressed_achievement_nft(
        ctx: Context<MintCompressedAchievementNFT>,
        achievement_type: AchievementType,
        metadata_uri: String,
    ) -> Result<()> {
        let user_profile = &mut ctx.accounts.user_profile;
        
        // Mint compressed NFT using Bubblegum
        let metadata = MetaplexAdapter {
            name: format!("{:?} Achievement", achievement_type),
            symbol: "QUEST".to_string(),
            uri: metadata_uri,
            creators: vec![],
            seller_fee_basis_points: 0,
            primary_sale_happened: true,
            is_mutable: false,
        };

        // This would interact with the Bubblegum program to mint compressed NFT
        // Implementation depends on the specific Bubblegum version and setup

        user_profile.achievements_count += 1;
        user_profile.reputation_score += get_achievement_reputation_bonus(&achievement_type);

        emit!(AchievementNFTMinted {
            user: ctx.accounts.user.key(),
            achievement_type,
            metadata_uri,
            reputation_bonus: get_achievement_reputation_bonus(&achievement_type),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn get_user_reputation(
        ctx: Context<GetUserReputation>,
    ) -> Result<u64> {
        let user_profile = &ctx.accounts.user_profile;
        Ok(user_profile.reputation_score)
    }
}

#[derive(Accounts)]
#[instruction(sns_domain: String)]
pub struct InitializeUserProfile<'info> {
    #[account(
        init,
        payer = authority,
        space = UserProfile::LEN,
        seeds = [b"user_profile", authority.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(quest_id: String)]
pub struct CreateQuest<'info> {
    #[account(
        init,
        payer = creator,
        space = Quest::LEN,
        seeds = [b"quest", quest_id.as_bytes()],
        bump
    )]
    pub quest: Account<'info, Quest>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(quest_id: String)]
pub struct StartQuest<'info> {
    #[account(
        init,
        payer = user,
        space = UserQuest::LEN,
        seeds = [b"user_quest", user.key().as_ref(), quest_id.as_bytes()],
        bump
    )]
    pub user_quest: Account<'info, UserQuest>,
    #[account(
        seeds = [b"quest", quest_id.as_bytes()],
        bump = quest.bump
    )]
    pub quest: Account<'info, Quest>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateQuestProgress<'info> {
    #[account(
        mut,
        seeds = [b"user_quest", user.key().as_ref(), user_quest.quest_id.as_bytes()],
        bump = user_quest.bump
    )]
    pub user_quest: Account<'info, UserQuest>,
    #[account(
        seeds = [b"quest", user_quest.quest_id.as_bytes()],
        bump = quest.bump
    )]
    pub quest: Account<'info, Quest>,
    #[account(
        mut,
        seeds = [b"user_profile", user.key().as_ref()],
        bump = user_profile.bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateStreak<'info> {
    #[account(
        mut,
        seeds = [b"user_profile", user.key().as_ref()],
        bump = user_profile.bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct MintCompressedAchievementNFT<'info> {
    #[account(
        mut,
        seeds = [b"user_profile", user.key().as_ref()],
        bump = user_profile.bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    pub user: Signer<'info>,
    /// CHECK: This is the merkle tree account for compressed NFTs
    pub merkle_tree: UncheckedAccount<'info>,
    /// CHECK: This is the tree authority for the merkle tree
    pub tree_authority: UncheckedAccount<'info>,
    pub bubblegum_program: Program<'info, Bubblegum>,
    pub compression_program: Program<'info, SplAccountCompression>,
    pub log_wrapper: Program<'info, Noop>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct GetUserReputation<'info> {
    #[account(
        seeds = [b"user_profile", user_profile.authority.as_ref()],
        bump = user_profile.bump
    )]
    pub user_profile: Account<'info, UserProfile>,
}

#[account]
pub struct UserProfile {
    pub authority: Pubkey,
    pub sns_domain: String,
    pub reputation_score: u64,
    pub total_quests_completed: u32,
    pub current_streak: u32,
    pub longest_streak: u32,
    pub last_activity: i64,
    pub level: u32,
    pub total_xp: u64,
    pub achievements_count: u32,
    pub bump: u8,
}

impl UserProfile {
    pub const LEN: usize = 8 + 32 + 64 + 8 + 4 + 4 + 4 + 8 + 4 + 8 + 4 + 1;
}

#[account]
pub struct Quest {
    pub quest_id: String,
    pub title: String,
    pub description: String,
    pub quest_type: QuestType,
    pub category: QuestCategory,
    pub difficulty: QuestDifficulty,
    pub requirements: QuestRequirements,
    pub rewards: QuestRewards,
    pub creator: Pubkey,
    pub is_active: bool,
    pub created_at: i64,
    pub expires_at: i64,
    pub completions: u32,
    pub bump: u8,
}

impl Quest {
    pub const LEN: usize = 8 + 64 + 128 + 256 + 1 + 1 + 1 + 64 + 64 + 32 + 1 + 8 + 8 + 4 + 1;
}

#[account]
pub struct UserQuest {
    pub user: Pubkey,
    pub quest: Pubkey,
    pub quest_id: String,
    pub status: QuestStatus,
    pub progress: QuestProgress,
    pub started_at: i64,
    pub completed_at: Option<i64>,
    pub expires_at: i64,
    pub bump: u8,
}

impl UserQuest {
    pub const LEN: usize = 8 + 32 + 32 + 64 + 1 + 64 + 8 + 9 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum QuestType {
    Daily,
    Weekly,
    Monthly,
    Special,
    Achievement,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum QuestCategory {
    Payment,
    Task,
    Social,
    Streak,
    Milestone,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum QuestDifficulty {
    Easy,
    Medium,
    Hard,
    Legendary,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum QuestStatus {
    Active,
    Completed,
    Failed,
    Expired,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum AchievementType {
    FirstPayment,
    PaymentStreak,
    VolumeTrader,
    QuestMaster,
    SocialButterfly,
    TaskCompleter,
    LoyalCustomer,
    CommunityChampion,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct QuestProgress {
    pub payments_made: u32,
    pub volume_traded: u64,
    pub streak_days: u32,
    pub tasks_completed: u32,
    pub social_interactions: u32,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum QuestRequirements {
    PaymentCount { count: u32 },
    VolumeAmount { amount: u64 },
    StreakDays { days: u32 },
    TasksCompleted { count: u32 },
    SocialInteractions { count: u32 },
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct QuestRewards {
    pub xp_reward: u64,
    pub reputation_points: u64,
    pub token_reward: Option<u64>,
    pub nft_reward: bool,
    pub badge_reward: Option<String>,
}

// Events
#[event]
pub struct UserProfileCreated {
    pub user: Pubkey,
    pub sns_domain: String,
    pub timestamp: i64,
}

#[event]
pub struct QuestCreated {
    pub quest_id: String,
    pub creator: Pubkey,
    pub quest_type: QuestType,
    pub difficulty: QuestDifficulty,
    pub timestamp: i64,
}

#[event]
pub struct QuestStarted {
    pub user: Pubkey,
    pub quest_id: String,
    pub started_at: i64,
}

#[event]
pub struct QuestCompleted {
    pub user: Pubkey,
    pub quest_id: String,
    pub xp_earned: u64,
    pub reputation_earned: u64,
    pub completed_at: i64,
}

#[event]
pub struct StreakUpdated {
    pub user: Pubkey,
    pub current_streak: u32,
    pub is_new_record: bool,
    pub timestamp: i64,
}

#[event]
pub struct StreakBroken {
    pub user: Pubkey,
    pub previous_streak: u32,
    pub timestamp: i64,
}

#[event]
pub struct UserLevelUp {
    pub user: Pubkey,
    pub new_level: u32,
    pub total_xp: u64,
}

#[event]
pub struct AchievementNFTMinted {
    pub user: Pubkey,
    pub achievement_type: AchievementType,
    pub metadata_uri: String,
    pub reputation_bonus: u64,
    pub timestamp: i64,
}

// Error codes
#[error_code]
pub enum QuestError {
    #[msg("Quest is not active")]
    QuestInactive,
    #[msg("Quest has expired")]
    QuestExpired,
    #[msg("Quest is not in active status")]
    QuestNotActive,
    #[msg("Invalid quest requirements")]
    InvalidRequirements,
    #[msg("Insufficient reputation")]
    InsufficientReputation,
}

// Helper functions
fn calculate_level(total_xp: u64) -> u32 {
    // Simple level calculation: every 1000 XP = 1 level
    ((total_xp / 1000) + 1) as u32
}

fn get_achievement_reputation_bonus(achievement_type: &AchievementType) -> u64 {
    match achievement_type {
        AchievementType::FirstPayment => 50,
        AchievementType::PaymentStreak => 100,
        AchievementType::VolumeTrader => 200,
        AchievementType::QuestMaster => 300,
        AchievementType::SocialButterfly => 150,
        AchievementType::TaskCompleter => 100,
        AchievementType::LoyalCustomer => 250,
        AchievementType::CommunityChampion => 500,
    }
}
