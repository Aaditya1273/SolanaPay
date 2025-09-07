use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

declare_id!("AssetIndexer1111111111111111111111111111111");

#[program]
pub mod asset_indexer {
    use super::*;

    pub fn initialize_indexer(
        ctx: Context<InitializeIndexer>,
        update_authority: Pubkey,
    ) -> Result<()> {
        let indexer = &mut ctx.accounts.indexer;
        indexer.authority = ctx.accounts.authority.key();
        indexer.update_authority = update_authority;
        indexer.total_assets_indexed = 0;
        indexer.last_update_slot = Clock::get()?.slot;
        indexer.is_active = true;
        indexer.bump = *ctx.bumps.get("indexer").unwrap();

        emit!(IndexerInitialized {
            authority: indexer.authority,
            update_authority: indexer.update_authority,
            slot: indexer.last_update_slot,
        });

        Ok(())
    }

    pub fn register_user_assets(
        ctx: Context<RegisterUserAssets>,
        user_pubkey: Pubkey,
        sns_domain: String,
    ) -> Result<()> {
        let user_assets = &mut ctx.accounts.user_assets;
        user_assets.user = user_pubkey;
        user_assets.sns_domain = sns_domain;
        user_assets.sol_balance = 0;
        user_assets.total_token_accounts = 0;
        user_assets.last_sync_slot = Clock::get()?.slot;
        user_assets.is_syncing = false;
        user_assets.bump = *ctx.bumps.get("user_assets").unwrap();

        emit!(UserAssetsRegistered {
            user: user_pubkey,
            sns_domain: user_assets.sns_domain.clone(),
            slot: user_assets.last_sync_slot,
        });

        Ok(())
    }

    pub fn sync_sol_balance(
        ctx: Context<SyncSolBalance>,
        new_balance: u64,
    ) -> Result<()> {
        let user_assets = &mut ctx.accounts.user_assets;
        let old_balance = user_assets.sol_balance;
        
        user_assets.sol_balance = new_balance;
        user_assets.last_sync_slot = Clock::get()?.slot;

        emit!(SolBalanceUpdated {
            user: user_assets.user,
            old_balance,
            new_balance,
            slot: user_assets.last_sync_slot,
        });

        Ok(())
    }

    pub fn index_token_account(
        ctx: Context<IndexTokenAccount>,
        mint: Pubkey,
        balance: u64,
        decimals: u8,
        token_symbol: String,
    ) -> Result<()> {
        let token_index = &mut ctx.accounts.token_index;
        let user_assets = &mut ctx.accounts.user_assets;

        token_index.user = user_assets.user;
        token_index.mint = mint;
        token_index.balance = balance;
        token_index.decimals = decimals;
        token_index.token_symbol = token_symbol;
        token_index.last_updated_slot = Clock::get()?.slot;
        token_index.is_active = true;
        token_index.bump = *ctx.bumps.get("token_index").unwrap();

        user_assets.total_token_accounts += 1;
        user_assets.last_sync_slot = Clock::get()?.slot;

        emit!(TokenAccountIndexed {
            user: user_assets.user,
            mint,
            balance,
            token_symbol: token_index.token_symbol.clone(),
            slot: token_index.last_updated_slot,
        });

        Ok(())
    }

    pub fn update_token_balance(
        ctx: Context<UpdateTokenBalance>,
        new_balance: u64,
    ) -> Result<()> {
        let token_index = &mut ctx.accounts.token_index;
        let old_balance = token_index.balance;

        token_index.balance = new_balance;
        token_index.last_updated_slot = Clock::get()?.slot;

        emit!(TokenBalanceUpdated {
            user: token_index.user,
            mint: token_index.mint,
            old_balance,
            new_balance,
            slot: token_index.last_updated_slot,
        });

        Ok(())
    }

    pub fn index_nft_collection(
        ctx: Context<IndexNFTCollection>,
        collection_mint: Pubkey,
        collection_name: String,
        nft_count: u32,
    ) -> Result<()> {
        let nft_index = &mut ctx.accounts.nft_index;
        let user_assets = &mut ctx.accounts.user_assets;

        nft_index.user = user_assets.user;
        nft_index.collection_mint = collection_mint;
        nft_index.collection_name = collection_name;
        nft_index.nft_count = nft_count;
        nft_index.last_updated_slot = Clock::get()?.slot;
        nft_index.bump = *ctx.bumps.get("nft_index").unwrap();

        emit!(NFTCollectionIndexed {
            user: user_assets.user,
            collection_mint,
            collection_name: nft_index.collection_name.clone(),
            nft_count,
            slot: nft_index.last_updated_slot,
        });

        Ok(())
    }

    pub fn batch_sync_assets(
        ctx: Context<BatchSyncAssets>,
        asset_updates: Vec<AssetUpdate>,
    ) -> Result<()> {
        let user_assets = &mut ctx.accounts.user_assets;
        user_assets.is_syncing = true;

        for update in asset_updates.iter() {
            match update.asset_type {
                AssetType::Sol => {
                    user_assets.sol_balance = update.balance;
                }
                AssetType::Token => {
                    // Token balance updates would be handled by separate token_index accounts
                    // This is a simplified version for demonstration
                }
                AssetType::NFT => {
                    // NFT updates would be handled similarly
                }
            }
        }

        user_assets.last_sync_slot = Clock::get()?.slot;
        user_assets.is_syncing = false;

        emit!(BatchSyncCompleted {
            user: user_assets.user,
            updates_count: asset_updates.len() as u32,
            slot: user_assets.last_sync_slot,
        });

        Ok(())
    }

    pub fn get_user_portfolio_value(
        ctx: Context<GetUserPortfolioValue>,
    ) -> Result<u64> {
        let user_assets = &ctx.accounts.user_assets;
        
        // This would calculate total portfolio value in USD
        // For now, returning SOL balance as a placeholder
        Ok(user_assets.sol_balance)
    }

    pub fn set_price_oracle(
        ctx: Context<SetPriceOracle>,
        token_mint: Pubkey,
        price_feed: Pubkey,
    ) -> Result<()> {
        let price_oracle = &mut ctx.accounts.price_oracle;
        
        price_oracle.token_mint = token_mint;
        price_oracle.price_feed = price_feed;
        price_oracle.last_updated_slot = Clock::get()?.slot;
        price_oracle.is_active = true;
        price_oracle.bump = *ctx.bumps.get("price_oracle").unwrap();

        emit!(PriceOracleSet {
            token_mint,
            price_feed,
            slot: price_oracle.last_updated_slot,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeIndexer<'info> {
    #[account(
        init,
        payer = authority,
        space = AssetIndexer::LEN,
        seeds = [b"indexer"],
        bump
    )]
    pub indexer: Account<'info, AssetIndexer>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(user_pubkey: Pubkey)]
pub struct RegisterUserAssets<'info> {
    #[account(
        init,
        payer = authority,
        space = UserAssets::LEN,
        seeds = [b"user_assets", user_pubkey.as_ref()],
        bump
    )]
    pub user_assets: Account<'info, UserAssets>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SyncSolBalance<'info> {
    #[account(
        mut,
        seeds = [b"user_assets", user_assets.user.as_ref()],
        bump = user_assets.bump
    )]
    pub user_assets: Account<'info, UserAssets>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(mint: Pubkey)]
pub struct IndexTokenAccount<'info> {
    #[account(
        init,
        payer = authority,
        space = TokenIndex::LEN,
        seeds = [b"token_index", user_assets.user.as_ref(), mint.as_ref()],
        bump
    )]
    pub token_index: Account<'info, TokenIndex>,
    #[account(
        mut,
        seeds = [b"user_assets", user_assets.user.as_ref()],
        bump = user_assets.bump
    )]
    pub user_assets: Account<'info, UserAssets>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateTokenBalance<'info> {
    #[account(
        mut,
        seeds = [b"token_index", token_index.user.as_ref(), token_index.mint.as_ref()],
        bump = token_index.bump
    )]
    pub token_index: Account<'info, TokenIndex>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(collection_mint: Pubkey)]
pub struct IndexNFTCollection<'info> {
    #[account(
        init,
        payer = authority,
        space = NFTIndex::LEN,
        seeds = [b"nft_index", user_assets.user.as_ref(), collection_mint.as_ref()],
        bump
    )]
    pub nft_index: Account<'info, NFTIndex>,
    #[account(
        mut,
        seeds = [b"user_assets", user_assets.user.as_ref()],
        bump = user_assets.bump
    )]
    pub user_assets: Account<'info, UserAssets>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BatchSyncAssets<'info> {
    #[account(
        mut,
        seeds = [b"user_assets", user_assets.user.as_ref()],
        bump = user_assets.bump
    )]
    pub user_assets: Account<'info, UserAssets>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct GetUserPortfolioValue<'info> {
    #[account(
        seeds = [b"user_assets", user_assets.user.as_ref()],
        bump = user_assets.bump
    )]
    pub user_assets: Account<'info, UserAssets>,
}

#[derive(Accounts)]
#[instruction(token_mint: Pubkey)]
pub struct SetPriceOracle<'info> {
    #[account(
        init,
        payer = authority,
        space = PriceOracle::LEN,
        seeds = [b"price_oracle", token_mint.as_ref()],
        bump
    )]
    pub price_oracle: Account<'info, PriceOracle>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct AssetIndexer {
    pub authority: Pubkey,
    pub update_authority: Pubkey,
    pub total_assets_indexed: u64,
    pub last_update_slot: u64,
    pub is_active: bool,
    pub bump: u8,
}

impl AssetIndexer {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 1 + 1;
}

#[account]
pub struct UserAssets {
    pub user: Pubkey,
    pub sns_domain: String,
    pub sol_balance: u64,
    pub total_token_accounts: u32,
    pub last_sync_slot: u64,
    pub is_syncing: bool,
    pub bump: u8,
}

impl UserAssets {
    pub const LEN: usize = 8 + 32 + 64 + 8 + 4 + 8 + 1 + 1;
}

#[account]
pub struct TokenIndex {
    pub user: Pubkey,
    pub mint: Pubkey,
    pub balance: u64,
    pub decimals: u8,
    pub token_symbol: String,
    pub last_updated_slot: u64,
    pub is_active: bool,
    pub bump: u8,
}

impl TokenIndex {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 1 + 32 + 8 + 1 + 1;
}

#[account]
pub struct NFTIndex {
    pub user: Pubkey,
    pub collection_mint: Pubkey,
    pub collection_name: String,
    pub nft_count: u32,
    pub last_updated_slot: u64,
    pub bump: u8,
}

impl NFTIndex {
    pub const LEN: usize = 8 + 32 + 32 + 64 + 4 + 8 + 1;
}

#[account]
pub struct PriceOracle {
    pub token_mint: Pubkey,
    pub price_feed: Pubkey,
    pub last_updated_slot: u64,
    pub is_active: bool,
    pub bump: u8,
}

impl PriceOracle {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 1 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AssetUpdate {
    pub asset_type: AssetType,
    pub balance: u64,
    pub mint: Option<Pubkey>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum AssetType {
    Sol,
    Token,
    NFT,
}

// Events
#[event]
pub struct IndexerInitialized {
    pub authority: Pubkey,
    pub update_authority: Pubkey,
    pub slot: u64,
}

#[event]
pub struct UserAssetsRegistered {
    pub user: Pubkey,
    pub sns_domain: String,
    pub slot: u64,
}

#[event]
pub struct SolBalanceUpdated {
    pub user: Pubkey,
    pub old_balance: u64,
    pub new_balance: u64,
    pub slot: u64,
}

#[event]
pub struct TokenAccountIndexed {
    pub user: Pubkey,
    pub mint: Pubkey,
    pub balance: u64,
    pub token_symbol: String,
    pub slot: u64,
}

#[event]
pub struct TokenBalanceUpdated {
    pub user: Pubkey,
    pub mint: Pubkey,
    pub old_balance: u64,
    pub new_balance: u64,
    pub slot: u64,
}

#[event]
pub struct NFTCollectionIndexed {
    pub user: Pubkey,
    pub collection_mint: Pubkey,
    pub collection_name: String,
    pub nft_count: u32,
    pub slot: u64,
}

#[event]
pub struct BatchSyncCompleted {
    pub user: Pubkey,
    pub updates_count: u32,
    pub slot: u64,
}

#[event]
pub struct PriceOracleSet {
    pub token_mint: Pubkey,
    pub price_feed: Pubkey,
    pub slot: u64,
}

#[error_code]
pub enum AssetIndexerError {
    #[msg("Indexer is not active")]
    IndexerInactive,
    #[msg("Unauthorized update authority")]
    UnauthorizedUpdate,
    #[msg("Asset sync in progress")]
    SyncInProgress,
    #[msg("Invalid asset type")]
    InvalidAssetType,
}
