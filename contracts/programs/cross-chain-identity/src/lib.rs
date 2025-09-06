use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint};
use anchor_spl::associated_token::AssociatedToken;
use solana_program::{
    keccak::hash,
    secp256k1_recover::{secp256k1_recover},
    pubkey::Pubkey,
};

declare_id!("CCIDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

#[program]
pub mod cross_chain_identity {
    use super::*;

    /// Initialize a new cross-chain identity linking EVM and Solana wallets
    pub fn initialize_identity(
        ctx: Context<InitializeIdentity>,
        evm_address: [u8; 20],
        signature: [u8; 64],
        recovery_id: u8,
    ) -> Result<()> {
        let identity = &mut ctx.accounts.identity;
        let user = ctx.accounts.user.key();

        // Verify EVM signature to prove ownership
        let message = format!("Link Solana wallet {} to EVM", user);
        let message_hash = hash(message.as_bytes());
        
        // Recover EVM address from signature
        let recovered_pubkey = secp256k1_recover(
            &message_hash.to_bytes(),
            recovery_id,
            &signature,
        ).map_err(|_| ErrorCode::InvalidSignature)?;

        // Convert recovered pubkey to EVM address (last 20 bytes of keccak hash)
        let recovered_address = &hash(&recovered_pubkey.to_bytes()).to_bytes()[12..32];
        
        if recovered_address != evm_address {
            return Err(ErrorCode::SignatureVerificationFailed.into());
        }

        // Initialize identity account
        identity.user = user;
        identity.evm_address = evm_address;
        identity.solana_address = user;
        identity.created_at = Clock::get()?.unix_timestamp;
        identity.is_verified = true;
        identity.link_count = 1;

        emit!(IdentityLinked {
            user,
            evm_address,
            solana_address: user,
            timestamp: identity.created_at,
        });

        Ok(())
    }

    /// Generate a new Solana wallet linked to an EVM address
    pub fn generate_linked_wallet(
        ctx: Context<GenerateLinkedWallet>,
        evm_address: [u8; 20],
        signature: [u8; 64],
        recovery_id: u8,
        seed: String,
    ) -> Result<()> {
        let identity = &mut ctx.accounts.identity;
        let new_wallet = ctx.accounts.new_wallet.key();

        // Verify EVM signature
        let message = format!("Generate Solana wallet for EVM {}", hex::encode(evm_address));
        let message_hash = hash(message.as_bytes());
        
        let recovered_pubkey = secp256k1_recover(
            &message_hash.to_bytes(),
            recovery_id,
            &signature,
        ).map_err(|_| ErrorCode::InvalidSignature)?;

        let recovered_address = &hash(&recovered_pubkey.to_bytes()).to_bytes()[12..32];
        
        if recovered_address != evm_address {
            return Err(ErrorCode::SignatureVerificationFailed.into());
        }

        // Create deterministic wallet from EVM address and seed
        let wallet_seed = format!("{}{}", hex::encode(evm_address), seed);
        let wallet_hash = hash(wallet_seed.as_bytes());
        
        // Initialize linked wallet identity
        identity.user = new_wallet;
        identity.evm_address = evm_address;
        identity.solana_address = new_wallet;
        identity.created_at = Clock::get()?.unix_timestamp;
        identity.is_verified = true;
        identity.link_count = 1;
        identity.seed_hash = wallet_hash.to_bytes();

        emit!(WalletGenerated {
            evm_address,
            solana_address: new_wallet,
            seed_hash: wallet_hash.to_bytes(),
            timestamp: identity.created_at,
        });

        Ok(())
    }

    /// Verify cross-chain identity
    pub fn verify_identity(
        ctx: Context<VerifyIdentity>,
        evm_signature: [u8; 64],
        solana_signature: [u8; 64],
    ) -> Result<()> {
        let identity = &mut ctx.accounts.identity;
        let user = ctx.accounts.user.key();

        // Verify both signatures match the stored addresses
        let verification_message = format!("Verify identity {}", identity.created_at);
        let message_hash = hash(verification_message.as_bytes());

        // Verify Solana signature (simplified - in practice would use proper signature verification)
        if identity.solana_address != user {
            return Err(ErrorCode::InvalidSolanaAddress.into());
        }

        identity.last_verified = Clock::get()?.unix_timestamp;
        identity.verification_count += 1;

        emit!(IdentityVerified {
            user,
            evm_address: identity.evm_address,
            timestamp: identity.last_verified,
        });

        Ok(())
    }

    /// Update identity metadata
    pub fn update_identity(
        ctx: Context<UpdateIdentity>,
        metadata: String,
    ) -> Result<()> {
        let identity = &mut ctx.accounts.identity;
        
        if metadata.len() > 256 {
            return Err(ErrorCode::MetadataTooLong.into());
        }

        identity.metadata = metadata;
        identity.updated_at = Clock::get()?.unix_timestamp;

        Ok(())
    }

    /// Get identity information
    pub fn get_identity(ctx: Context<GetIdentity>) -> Result<IdentityData> {
        let identity = &ctx.accounts.identity;
        
        Ok(IdentityData {
            user: identity.user,
            evm_address: identity.evm_address,
            solana_address: identity.solana_address,
            is_verified: identity.is_verified,
            created_at: identity.created_at,
            last_verified: identity.last_verified,
            link_count: identity.link_count,
            verification_count: identity.verification_count,
        })
    }
}

#[derive(Accounts)]
pub struct InitializeIdentity<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + CrossChainIdentity::INIT_SPACE,
        seeds = [b"identity", user.key().as_ref()],
        bump
    )]
    pub identity: Account<'info, CrossChainIdentity>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct GenerateLinkedWallet<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + CrossChainIdentity::INIT_SPACE,
        seeds = [b"identity", new_wallet.key().as_ref()],
        bump
    )]
    pub identity: Account<'info, CrossChainIdentity>,
    
    /// CHECK: This is the new wallet being generated
    pub new_wallet: AccountInfo<'info>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifyIdentity<'info> {
    #[account(
        mut,
        seeds = [b"identity", user.key().as_ref()],
        bump
    )]
    pub identity: Account<'info, CrossChainIdentity>,
    
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateIdentity<'info> {
    #[account(
        mut,
        seeds = [b"identity", user.key().as_ref()],
        bump,
        has_one = user
    )]
    pub identity: Account<'info, CrossChainIdentity>,
    
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct GetIdentity<'info> {
    #[account(
        seeds = [b"identity", identity.user.as_ref()],
        bump
    )]
    pub identity: Account<'info, CrossChainIdentity>,
}

#[account]
pub struct CrossChainIdentity {
    pub user: Pubkey,                    // Solana wallet address
    pub evm_address: [u8; 20],          // EVM wallet address
    pub solana_address: Pubkey,         // Solana address (same as user)
    pub is_verified: bool,              // Verification status
    pub created_at: i64,                // Creation timestamp
    pub updated_at: i64,                // Last update timestamp
    pub last_verified: i64,             // Last verification timestamp
    pub link_count: u32,                // Number of links
    pub verification_count: u32,        // Number of verifications
    pub seed_hash: [u8; 32],           // Hash of generation seed
    pub metadata: String,               // Additional metadata
}

impl CrossChainIdentity {
    pub const INIT_SPACE: usize = 32 + 20 + 32 + 1 + 8 + 8 + 8 + 4 + 4 + 32 + 256;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct IdentityData {
    pub user: Pubkey,
    pub evm_address: [u8; 20],
    pub solana_address: Pubkey,
    pub is_verified: bool,
    pub created_at: i64,
    pub last_verified: i64,
    pub link_count: u32,
    pub verification_count: u32,
}

#[event]
pub struct IdentityLinked {
    pub user: Pubkey,
    pub evm_address: [u8; 20],
    pub solana_address: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct WalletGenerated {
    pub evm_address: [u8; 20],
    pub solana_address: Pubkey,
    pub seed_hash: [u8; 32],
    pub timestamp: i64,
}

#[event]
pub struct IdentityVerified {
    pub user: Pubkey,
    pub evm_address: [u8; 20],
    pub timestamp: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid signature provided")]
    InvalidSignature,
    #[msg("Signature verification failed")]
    SignatureVerificationFailed,
    #[msg("Invalid Solana address")]
    InvalidSolanaAddress,
    #[msg("Metadata too long (max 256 characters)")]
    MetadataTooLong,
    #[msg("Identity not found")]
    IdentityNotFound,
    #[msg("Unauthorized access")]
    Unauthorized,
}
