use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use std::collections::HashMap;

declare_id!("HeLpBoT1111111111111111111111111111111111111");

#[program]
pub mod solanapay_helpbot {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let helpbot = &mut ctx.accounts.helpbot;
        helpbot.authority = ctx.accounts.authority.key();
        helpbot.total_queries = 0;
        helpbot.active_users = 0;
        helpbot.bump = *ctx.bumps.get("helpbot").unwrap();
        
        msg!("SolanaPay HelpBot initialized successfully");
        Ok(())
    }

    pub fn query_balance(ctx: Context<QueryBalance>, wallet_address: Pubkey) -> Result<()> {
        let helpbot = &mut ctx.accounts.helpbot;
        helpbot.total_queries += 1;

        // Get token account balance
        let token_account = &ctx.accounts.token_account;
        let balance = token_account.amount;
        
        // Emit balance information
        emit!(BalanceQueryEvent {
            wallet: wallet_address,
            balance,
            timestamp: Clock::get()?.unix_timestamp,
            query_id: helpbot.total_queries,
        });

        // Generate response based on balance
        let response = if balance == 0 {
            "Your wallet balance is 0 VRC tokens. You can earn tokens by completing tasks or receiving payments."
        } else if balance < 1000 {
            "You have a small balance. Consider completing more tasks to earn additional VRC tokens."
        } else if balance < 10000 {
            "You have a moderate balance. Great job! Keep participating in the SolanaPay ecosystem."
        } else {
            "Excellent! You have a substantial VRC token balance. Consider staking or using advanced features."
        };

        emit!(HelpBotResponse {
            query_type: "balance".to_string(),
            response: response.to_string(),
            confidence: 95,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn query_transaction_history(ctx: Context<QueryTransactionHistory>, wallet_address: Pubkey) -> Result<()> {
        let helpbot = &mut ctx.accounts.helpbot;
        helpbot.total_queries += 1;

        // Access transaction history from account data
        let tx_history = &ctx.accounts.transaction_history;
        let recent_tx_count = tx_history.recent_transactions.len();
        
        emit!(TransactionHistoryEvent {
            wallet: wallet_address,
            transaction_count: recent_tx_count as u64,
            timestamp: Clock::get()?.unix_timestamp,
            query_id: helpbot.total_queries,
        });

        let response = match recent_tx_count {
            0 => "No recent transactions found. Start by making your first payment or completing a task!",
            1..=5 => "You have a few recent transactions. Your payment activity is just getting started.",
            6..=20 => "Good transaction activity! You're actively using SolanaPay features.",
            _ => "High transaction volume detected. You're a power user of the SolanaPay platform!"
        };

        emit!(HelpBotResponse {
            query_type: "transactions".to_string(),
            response: response.to_string(),
            confidence: 90,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn query_loyalty_nfts(ctx: Context<QueryLoyaltyNFTs>, wallet_address: Pubkey) -> Result<()> {
        let helpbot = &mut ctx.accounts.helpbot;
        helpbot.total_queries += 1;

        // Check NFT collection account
        let nft_collection = &ctx.accounts.nft_collection;
        let nft_count = nft_collection.owned_nfts.len();
        let achievement_level = calculate_achievement_level(nft_count);

        emit!(NFTQueryEvent {
            wallet: wallet_address,
            nft_count: nft_count as u64,
            achievement_level,
            timestamp: Clock::get()?.unix_timestamp,
            query_id: helpbot.total_queries,
        });

        let response = match nft_count {
            0 => "You don't have any loyalty NFTs yet. Complete tasks and reach milestones to earn your first achievement NFT!",
            1..=3 => "Great start! You've earned some loyalty NFTs. Keep completing tasks to unlock more achievements.",
            4..=10 => "Impressive collection! You're building a solid reputation in the SolanaPay ecosystem.",
            _ => "Outstanding! You're a top contributor with an extensive loyalty NFT collection."
        };

        emit!(HelpBotResponse {
            query_type: "nfts".to_string(),
            response: response.to_string(),
            confidence: 88,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn ask_general_question(ctx: Context<AskGeneralQuestion>, question: String) -> Result<()> {
        let helpbot = &mut ctx.accounts.helpbot;
        helpbot.total_queries += 1;

        let response = match question.to_lowercase().as_str() {
            q if q.contains("fee") => "SolanaPay charges a 2.5% platform fee for escrow services. Network fees vary based on blockchain congestion.",
            q if q.contains("kyc") => "KYC verification requires valid ID, proof of address, and selfie. Verification takes 24-48 hours.",
            q if q.contains("task") => "Browse tasks in the Marketplace, complete work for rewards, or post your own tasks with clear requirements.",
            q if q.contains("reward") => "Earn rewards by completing tasks, referring users, and maintaining high ratings. Redeem points for benefits.",
            q if q.contains("security") => "Always verify transactions before signing. Never share private keys. Use hardware wallets for large amounts.",
            q if q.contains("support") => "For complex issues, contact support through the Help Center or join our community Discord.",
            _ => "I can help with balances, transactions, NFTs, fees, KYC, tasks, rewards, and security. What specific topic interests you?"
        };

        emit!(HelpBotResponse {
            query_type: "general".to_string(),
            response: response.to_string(),
            confidence: 75,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn update_user_activity(ctx: Context<UpdateUserActivity>) -> Result<()> {
        let helpbot = &mut ctx.accounts.helpbot;
        let user_activity = &mut ctx.accounts.user_activity;
        
        user_activity.last_query = Clock::get()?.unix_timestamp;
        user_activity.total_queries += 1;
        
        if user_activity.total_queries == 1 {
            helpbot.active_users += 1;
        }

        Ok(())
    }
}

fn calculate_achievement_level(nft_count: usize) -> u8 {
    match nft_count {
        0 => 0,
        1..=3 => 1,
        4..=10 => 2,
        11..=25 => 3,
        _ => 4,
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + HelpBot::INIT_SPACE,
        seeds = [b"helpbot"],
        bump
    )]
    pub helpbot: Account<'info, HelpBot>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct QueryBalance<'info> {
    #[account(
        mut,
        seeds = [b"helpbot"],
        bump = helpbot.bump
    )]
    pub helpbot: Account<'info, HelpBot>,
    pub token_account: Account<'info, TokenAccount>,
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct QueryTransactionHistory<'info> {
    #[account(
        mut,
        seeds = [b"helpbot"],
        bump = helpbot.bump
    )]
    pub helpbot: Account<'info, HelpBot>,
    pub transaction_history: Account<'info, TransactionHistory>,
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct QueryLoyaltyNFTs<'info> {
    #[account(
        mut,
        seeds = [b"helpbot"],
        bump = helpbot.bump
    )]
    pub helpbot: Account<'info, HelpBot>,
    pub nft_collection: Account<'info, NFTCollection>,
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct AskGeneralQuestion<'info> {
    #[account(
        mut,
        seeds = [b"helpbot"],
        bump = helpbot.bump
    )]
    pub helpbot: Account<'info, HelpBot>,
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateUserActivity<'info> {
    #[account(
        mut,
        seeds = [b"helpbot"],
        bump = helpbot.bump
    )]
    pub helpbot: Account<'info, HelpBot>,
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserActivity::INIT_SPACE,
        seeds = [b"user_activity", user.key().as_ref()],
        bump
    )]
    pub user_activity: Account<'info, UserActivity>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct HelpBot {
    pub authority: Pubkey,
    pub total_queries: u64,
    pub active_users: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct UserActivity {
    pub user: Pubkey,
    pub total_queries: u64,
    pub last_query: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct TransactionHistory {
    pub owner: Pubkey,
    #[max_len(50)]
    pub recent_transactions: Vec<TransactionRecord>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct TransactionRecord {
    pub signature: String,
    pub amount: u64,
    pub timestamp: i64,
    pub transaction_type: TransactionType,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub enum TransactionType {
    Send,
    Receive,
    TaskPayment,
    Reward,
}

#[account]
#[derive(InitSpace)]
pub struct NFTCollection {
    pub owner: Pubkey,
    #[max_len(20)]
    pub owned_nfts: Vec<NFTRecord>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct NFTRecord {
    pub mint: Pubkey,
    pub achievement_type: String,
    pub earned_date: i64,
}

#[event]
pub struct BalanceQueryEvent {
    pub wallet: Pubkey,
    pub balance: u64,
    pub timestamp: i64,
    pub query_id: u64,
}

#[event]
pub struct TransactionHistoryEvent {
    pub wallet: Pubkey,
    pub transaction_count: u64,
    pub timestamp: i64,
    pub query_id: u64,
}

#[event]
pub struct NFTQueryEvent {
    pub wallet: Pubkey,
    pub nft_count: u64,
    pub achievement_level: u8,
    pub timestamp: i64,
    pub query_id: u64,
}

#[event]
pub struct HelpBotResponse {
    pub query_type: String,
    pub response: String,
    pub confidence: u8,
    pub timestamp: i64,
}

#[error_code]
pub enum HelpBotError {
    #[msg("Unauthorized access to helpbot")]
    Unauthorized,
    #[msg("Invalid query parameters")]
    InvalidQuery,
    #[msg("Account not found")]
    AccountNotFound,
}
