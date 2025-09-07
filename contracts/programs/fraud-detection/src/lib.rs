use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use switchboard_v2::AggregatorAccountData;

declare_id!("FraudDetection1111111111111111111111111111111");

#[program]
pub mod fraud_detection {
    use super::*;

    pub fn initialize_compliance_module(
        ctx: Context<InitializeComplianceModule>,
        authority: Pubkey,
        high_value_threshold_usd: u64,
        velocity_threshold: u32,
        max_daily_volume_usd: u64,
    ) -> Result<()> {
        let compliance_config = &mut ctx.accounts.compliance_config;
        compliance_config.authority = authority;
        compliance_config.high_value_threshold_usd = high_value_threshold_usd;
        compliance_config.velocity_threshold = velocity_threshold;
        compliance_config.max_daily_volume_usd = max_daily_volume_usd;
        compliance_config.is_active = true;
        compliance_config.total_flagged_transactions = 0;
        compliance_config.total_blocked_transactions = 0;
        compliance_config.last_updated_slot = Clock::get()?.slot;
        compliance_config.bump = *ctx.bumps.get("compliance_config").unwrap();

        emit!(ComplianceModuleInitialized {
            authority,
            high_value_threshold_usd,
            velocity_threshold,
            max_daily_volume_usd,
            slot: compliance_config.last_updated_slot,
        });

        Ok(())
    }

    pub fn register_user_profile(
        ctx: Context<RegisterUserProfile>,
        user_pubkey: Pubkey,
        sns_domain: String,
        kyc_level: KYCLevel,
    ) -> Result<()> {
        let user_profile = &mut ctx.accounts.user_profile;
        user_profile.user = user_pubkey;
        user_profile.sns_domain = sns_domain;
        user_profile.kyc_level = kyc_level;
        user_profile.risk_score = 0;
        user_profile.total_transaction_count = 0;
        user_profile.total_volume_usd = 0;
        user_profile.daily_transaction_count = 0;
        user_profile.daily_volume_usd = 0;
        user_profile.last_transaction_slot = 0;
        user_profile.last_daily_reset_slot = Clock::get()?.slot;
        user_profile.is_flagged = false;
        user_profile.is_blocked = false;
        user_profile.flags = Vec::new();
        user_profile.bump = *ctx.bumps.get("user_profile").unwrap();

        emit!(UserProfileRegistered {
            user: user_pubkey,
            sns_domain: user_profile.sns_domain.clone(),
            kyc_level,
            slot: Clock::get()?.slot,
        });

        Ok(())
    }

    pub fn add_high_risk_address(
        ctx: Context<AddHighRiskAddress>,
        address: Pubkey,
        risk_category: RiskCategory,
        risk_level: RiskLevel,
        description: String,
    ) -> Result<()> {
        let risk_registry = &mut ctx.accounts.risk_registry;
        let compliance_config = &ctx.accounts.compliance_config;

        require!(
            ctx.accounts.authority.key() == compliance_config.authority,
            FraudDetectionError::UnauthorizedAccess
        );

        risk_registry.address = address;
        risk_registry.risk_category = risk_category;
        risk_level = risk_level;
        risk_registry.description = description;
        risk_registry.added_at_slot = Clock::get()?.slot;
        risk_registry.is_active = true;
        risk_registry.bump = *ctx.bumps.get("risk_registry").unwrap();

        emit!(HighRiskAddressAdded {
            address,
            risk_category,
            risk_level,
            slot: risk_registry.added_at_slot,
        });

        Ok(())
    }

    pub fn monitor_transaction(
        ctx: Context<MonitorTransaction>,
        amount_lamports: u64,
        recipient: Pubkey,
        transaction_type: TransactionType,
    ) -> Result<TransactionStatus> {
        let user_profile = &mut ctx.accounts.user_profile;
        let compliance_config = &ctx.accounts.compliance_config;
        let current_slot = Clock::get()?.slot;

        // Reset daily counters if needed (assuming ~2.5 slots per second, 216,000 slots per day)
        if current_slot - user_profile.last_daily_reset_slot > 216_000 {
            user_profile.daily_transaction_count = 0;
            user_profile.daily_volume_usd = 0;
            user_profile.last_daily_reset_slot = current_slot;
        }

        // Get USD value from price oracle
        let usd_amount = get_usd_value_from_oracle(
            &ctx.accounts.price_oracle,
            amount_lamports,
        )?;

        // Check if user is already blocked
        if user_profile.is_blocked {
            return Ok(TransactionStatus::Blocked);
        }

        let mut flags = Vec::new();
        let mut should_block = false;

        // High-value transaction check
        if usd_amount > compliance_config.high_value_threshold_usd {
            flags.push(FraudFlag {
                flag_type: FlagType::HighValueTransaction,
                severity: FlagSeverity::High,
                description: format!("Transaction amount ${} exceeds threshold ${}", 
                    usd_amount, compliance_config.high_value_threshold_usd),
                detected_at_slot: current_slot,
            });
        }

        // Velocity check
        if user_profile.daily_transaction_count >= compliance_config.velocity_threshold {
            flags.push(FraudFlag {
                flag_type: FlagType::HighVelocity,
                severity: FlagSeverity::Medium,
                description: format!("Daily transaction count {} exceeds threshold {}", 
                    user_profile.daily_transaction_count, compliance_config.velocity_threshold),
                detected_at_slot: current_slot,
            });
        }

        // Daily volume check
        let projected_daily_volume = user_profile.daily_volume_usd + usd_amount;
        if projected_daily_volume > compliance_config.max_daily_volume_usd {
            flags.push(FraudFlag {
                flag_type: FlagType::ExcessiveVolume,
                severity: FlagSeverity::High,
                description: format!("Daily volume ${} would exceed limit ${}", 
                    projected_daily_volume, compliance_config.max_daily_volume_usd),
                detected_at_slot: current_slot,
            });
            should_block = true;
        }

        // Check recipient against high-risk registry
        if let Ok(risk_registry) = ctx.remaining_accounts.get(0) {
            let risk_data = risk_registry.try_borrow_data()?;
            if risk_data.len() > 0 {
                flags.push(FraudFlag {
                    flag_type: FlagType::HighRiskRecipient,
                    severity: FlagSeverity::Critical,
                    description: "Transaction to high-risk address detected".to_string(),
                    detected_at_slot: current_slot,
                });
                should_block = true;
            }
        }

        // Unusual pattern detection (simplified)
        let time_since_last_tx = current_slot - user_profile.last_transaction_slot;
        if time_since_last_tx < 10 && user_profile.total_transaction_count > 0 {
            flags.push(FraudFlag {
                flag_type: FlagType::UnusualPattern,
                severity: FlagSeverity::Medium,
                description: "Rapid successive transactions detected".to_string(),
                detected_at_slot: current_slot,
            });
        }

        // KYC level checks
        match user_profile.kyc_level {
            KYCLevel::None => {
                if usd_amount > 1000 {
                    flags.push(FraudFlag {
                        flag_type: FlagType::KYCRequired,
                        severity: FlagSeverity::High,
                        description: "KYC required for transactions over $1000".to_string(),
                        detected_at_slot: current_slot,
                    });
                    should_block = true;
                }
            },
            KYCLevel::Basic => {
                if usd_amount > 10000 {
                    flags.push(FraudFlag {
                        flag_type: FlagType::KYCUpgradeRequired,
                        severity: FlagSeverity::Medium,
                        description: "Enhanced KYC required for transactions over $10,000".to_string(),
                        detected_at_slot: current_slot,
                    });
                }
            },
            KYCLevel::Enhanced => {
                // No additional restrictions for enhanced KYC
            }
        }

        // Update user profile
        user_profile.total_transaction_count += 1;
        user_profile.total_volume_usd += usd_amount;
        user_profile.daily_transaction_count += 1;
        user_profile.daily_volume_usd += usd_amount;
        user_profile.last_transaction_slot = current_slot;

        // Calculate risk score based on flags
        let risk_score_increase = flags.iter().map(|flag| {
            match flag.severity {
                FlagSeverity::Low => 1,
                FlagSeverity::Medium => 5,
                FlagSeverity::High => 15,
                FlagSeverity::Critical => 50,
            }
        }).sum::<u32>();

        user_profile.risk_score += risk_score_increase;

        // Auto-block if risk score is too high
        if user_profile.risk_score > 100 {
            should_block = true;
            user_profile.is_blocked = true;
        }

        // Store flags
        user_profile.flags.extend(flags.clone());
        if !flags.is_empty() {
            user_profile.is_flagged = true;
        }

        // Determine transaction status
        let status = if should_block {
            TransactionStatus::Blocked
        } else if !flags.is_empty() {
            TransactionStatus::Flagged
        } else {
            TransactionStatus::Approved
        };

        // Create transaction record
        let transaction_record = &mut ctx.accounts.transaction_record;
        transaction_record.user = user_profile.user;
        transaction_record.recipient = recipient;
        transaction_record.amount_lamports = amount_lamports;
        transaction_record.amount_usd = usd_amount;
        transaction_record.transaction_type = transaction_type;
        transaction_record.status = status;
        transaction_record.flags = flags.clone();
        transaction_record.processed_at_slot = current_slot;
        transaction_record.bump = *ctx.bumps.get("transaction_record").unwrap();

        // Emit events
        if !flags.is_empty() {
            emit!(TransactionFlagged {
                user: user_profile.user,
                transaction_id: transaction_record.key(),
                flags: flags.clone(),
                status,
                slot: current_slot,
            });
        }

        emit!(TransactionMonitored {
            user: user_profile.user,
            recipient,
            amount_usd: usd_amount,
            status,
            risk_score: user_profile.risk_score,
            slot: current_slot,
        });

        Ok(status)
    }

    pub fn update_risk_score_ai(
        ctx: Context<UpdateRiskScoreAI>,
        ai_risk_score: u32,
        anomaly_indicators: Vec<String>,
    ) -> Result<()> {
        let user_profile = &mut ctx.accounts.user_profile;
        let compliance_config = &ctx.accounts.compliance_config;

        require!(
            ctx.accounts.authority.key() == compliance_config.authority,
            FraudDetectionError::UnauthorizedAccess
        );

        // Update risk score based on AI analysis
        user_profile.risk_score = (user_profile.risk_score + ai_risk_score) / 2;

        // Add AI-detected anomalies as flags
        for indicator in anomaly_indicators {
            user_profile.flags.push(FraudFlag {
                flag_type: FlagType::AIAnomaly,
                severity: if ai_risk_score > 75 { FlagSeverity::Critical } 
                         else if ai_risk_score > 50 { FlagSeverity::High }
                         else if ai_risk_score > 25 { FlagSeverity::Medium }
                         else { FlagSeverity::Low },
                description: indicator,
                detected_at_slot: Clock::get()?.slot,
            });
        }

        // Auto-block if AI risk score is critical
        if ai_risk_score > 90 {
            user_profile.is_blocked = true;
        }

        emit!(AIRiskScoreUpdated {
            user: user_profile.user,
            old_risk_score: user_profile.risk_score,
            new_risk_score: user_profile.risk_score,
            ai_risk_score,
            slot: Clock::get()?.slot,
        });

        Ok(())
    }

    pub fn whitelist_address(
        ctx: Context<WhitelistAddress>,
        address: Pubkey,
    ) -> Result<()> {
        let whitelist = &mut ctx.accounts.whitelist;
        let compliance_config = &ctx.accounts.compliance_config;

        require!(
            ctx.accounts.authority.key() == compliance_config.authority,
            FraudDetectionError::UnauthorizedAccess
        );

        whitelist.address = address;
        whitelist.whitelisted_at_slot = Clock::get()?.slot;
        whitelist.is_active = true;
        whitelist.bump = *ctx.bumps.get("whitelist").unwrap();

        emit!(AddressWhitelisted {
            address,
            slot: whitelist.whitelisted_at_slot,
        });

        Ok(())
    }

    pub fn unblock_user(
        ctx: Context<UnblockUser>,
        reason: String,
    ) -> Result<()> {
        let user_profile = &mut ctx.accounts.user_profile;
        let compliance_config = &ctx.accounts.compliance_config;

        require!(
            ctx.accounts.authority.key() == compliance_config.authority,
            FraudDetectionError::UnauthorizedAccess
        );

        user_profile.is_blocked = false;
        user_profile.risk_score = user_profile.risk_score / 2; // Reduce risk score

        emit!(UserUnblocked {
            user: user_profile.user,
            reason,
            slot: Clock::get()?.slot,
        });

        Ok(())
    }
}

// Helper function to get USD value from price oracle
fn get_usd_value_from_oracle(
    price_oracle: &AccountInfo,
    amount_lamports: u64,
) -> Result<u64> {
    let aggregator = AggregatorAccountData::new(price_oracle)?;
    let price = aggregator.get_result()?.try_into()?;
    
    // Convert lamports to SOL, then to USD
    let sol_amount = amount_lamports as f64 / 1_000_000_000.0;
    let usd_amount = sol_amount * price;
    
    Ok(usd_amount as u64)
}

#[derive(Accounts)]
pub struct InitializeComplianceModule<'info> {
    #[account(
        init,
        payer = authority,
        space = ComplianceConfig::LEN,
        seeds = [b"compliance_config"],
        bump
    )]
    pub compliance_config: Account<'info, ComplianceConfig>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(user_pubkey: Pubkey)]
pub struct RegisterUserProfile<'info> {
    #[account(
        init,
        payer = authority,
        space = UserProfile::LEN,
        seeds = [b"user_profile", user_pubkey.as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(address: Pubkey)]
pub struct AddHighRiskAddress<'info> {
    #[account(
        init,
        payer = authority,
        space = RiskRegistry::LEN,
        seeds = [b"risk_registry", address.as_ref()],
        bump
    )]
    pub risk_registry: Account<'info, RiskRegistry>,
    #[account(
        seeds = [b"compliance_config"],
        bump = compliance_config.bump
    )]
    pub compliance_config: Account<'info, ComplianceConfig>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MonitorTransaction<'info> {
    #[account(
        mut,
        seeds = [b"user_profile", user_profile.user.as_ref()],
        bump = user_profile.bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    #[account(
        seeds = [b"compliance_config"],
        bump = compliance_config.bump
    )]
    pub compliance_config: Account<'info, ComplianceConfig>,
    #[account(
        init,
        payer = authority,
        space = TransactionRecord::LEN,
        seeds = [b"transaction_record", user_profile.user.as_ref(), &Clock::get().unwrap().slot.to_le_bytes()],
        bump
    )]
    pub transaction_record: Account<'info, TransactionRecord>,
    /// CHECK: Price oracle account for USD conversion
    pub price_oracle: AccountInfo<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateRiskScoreAI<'info> {
    #[account(
        mut,
        seeds = [b"user_profile", user_profile.user.as_ref()],
        bump = user_profile.bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    #[account(
        seeds = [b"compliance_config"],
        bump = compliance_config.bump
    )]
    pub compliance_config: Account<'info, ComplianceConfig>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(address: Pubkey)]
pub struct WhitelistAddress<'info> {
    #[account(
        init,
        payer = authority,
        space = Whitelist::LEN,
        seeds = [b"whitelist", address.as_ref()],
        bump
    )]
    pub whitelist: Account<'info, Whitelist>,
    #[account(
        seeds = [b"compliance_config"],
        bump = compliance_config.bump
    )]
    pub compliance_config: Account<'info, ComplianceConfig>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UnblockUser<'info> {
    #[account(
        mut,
        seeds = [b"user_profile", user_profile.user.as_ref()],
        bump = user_profile.bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    #[account(
        seeds = [b"compliance_config"],
        bump = compliance_config.bump
    )]
    pub compliance_config: Account<'info, ComplianceConfig>,
    pub authority: Signer<'info>,
}

#[account]
pub struct ComplianceConfig {
    pub authority: Pubkey,
    pub high_value_threshold_usd: u64,
    pub velocity_threshold: u32,
    pub max_daily_volume_usd: u64,
    pub is_active: bool,
    pub total_flagged_transactions: u64,
    pub total_blocked_transactions: u64,
    pub last_updated_slot: u64,
    pub bump: u8,
}

impl ComplianceConfig {
    pub const LEN: usize = 8 + 32 + 8 + 4 + 8 + 1 + 8 + 8 + 8 + 1;
}

#[account]
pub struct UserProfile {
    pub user: Pubkey,
    pub sns_domain: String,
    pub kyc_level: KYCLevel,
    pub risk_score: u32,
    pub total_transaction_count: u64,
    pub total_volume_usd: u64,
    pub daily_transaction_count: u32,
    pub daily_volume_usd: u64,
    pub last_transaction_slot: u64,
    pub last_daily_reset_slot: u64,
    pub is_flagged: bool,
    pub is_blocked: bool,
    pub flags: Vec<FraudFlag>,
    pub bump: u8,
}

impl UserProfile {
    pub const LEN: usize = 8 + 32 + 64 + 1 + 4 + 8 + 8 + 4 + 8 + 8 + 8 + 1 + 1 + 512 + 1;
}

#[account]
pub struct RiskRegistry {
    pub address: Pubkey,
    pub risk_category: RiskCategory,
    pub risk_level: RiskLevel,
    pub description: String,
    pub added_at_slot: u64,
    pub is_active: bool,
    pub bump: u8,
}

impl RiskRegistry {
    pub const LEN: usize = 8 + 32 + 1 + 1 + 256 + 8 + 1 + 1;
}

#[account]
pub struct TransactionRecord {
    pub user: Pubkey,
    pub recipient: Pubkey,
    pub amount_lamports: u64,
    pub amount_usd: u64,
    pub transaction_type: TransactionType,
    pub status: TransactionStatus,
    pub flags: Vec<FraudFlag>,
    pub processed_at_slot: u64,
    pub bump: u8,
}

impl TransactionRecord {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 1 + 1 + 512 + 8 + 1;
}

#[account]
pub struct Whitelist {
    pub address: Pubkey,
    pub whitelisted_at_slot: u64,
    pub is_active: bool,
    pub bump: u8,
}

impl Whitelist {
    pub const LEN: usize = 8 + 32 + 8 + 1 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum KYCLevel {
    None,
    Basic,
    Enhanced,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum RiskCategory {
    Sanctions,
    PEP, // Politically Exposed Person
    HighRiskJurisdiction,
    KnownScammer,
    MixerService,
    DarknetMarket,
    Ransomware,
    Other,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum RiskLevel {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum TransactionType {
    Payment,
    Transfer,
    Swap,
    Bridge,
    Stake,
    Other,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum TransactionStatus {
    Approved,
    Flagged,
    Blocked,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum FlagType {
    HighValueTransaction,
    HighVelocity,
    ExcessiveVolume,
    HighRiskRecipient,
    UnusualPattern,
    KYCRequired,
    KYCUpgradeRequired,
    AIAnomaly,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum FlagSeverity {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct FraudFlag {
    pub flag_type: FlagType,
    pub severity: FlagSeverity,
    pub description: String,
    pub detected_at_slot: u64,
}

// Events
#[event]
pub struct ComplianceModuleInitialized {
    pub authority: Pubkey,
    pub high_value_threshold_usd: u64,
    pub velocity_threshold: u32,
    pub max_daily_volume_usd: u64,
    pub slot: u64,
}

#[event]
pub struct UserProfileRegistered {
    pub user: Pubkey,
    pub sns_domain: String,
    pub kyc_level: KYCLevel,
    pub slot: u64,
}

#[event]
pub struct HighRiskAddressAdded {
    pub address: Pubkey,
    pub risk_category: RiskCategory,
    pub risk_level: RiskLevel,
    pub slot: u64,
}

#[event]
pub struct TransactionMonitored {
    pub user: Pubkey,
    pub recipient: Pubkey,
    pub amount_usd: u64,
    pub status: TransactionStatus,
    pub risk_score: u32,
    pub slot: u64,
}

#[event]
pub struct TransactionFlagged {
    pub user: Pubkey,
    pub transaction_id: Pubkey,
    pub flags: Vec<FraudFlag>,
    pub status: TransactionStatus,
    pub slot: u64,
}

#[event]
pub struct AIRiskScoreUpdated {
    pub user: Pubkey,
    pub old_risk_score: u32,
    pub new_risk_score: u32,
    pub ai_risk_score: u32,
    pub slot: u64,
}

#[event]
pub struct AddressWhitelisted {
    pub address: Pubkey,
    pub slot: u64,
}

#[event]
pub struct UserUnblocked {
    pub user: Pubkey,
    pub reason: String,
    pub slot: u64,
}

#[error_code]
pub enum FraudDetectionError {
    #[msg("Unauthorized access")]
    UnauthorizedAccess,
    #[msg("User is blocked")]
    UserBlocked,
    #[msg("Transaction exceeds limits")]
    TransactionExceedsLimits,
    #[msg("High risk recipient")]
    HighRiskRecipient,
    #[msg("KYC verification required")]
    KYCRequired,
    #[msg("Invalid price oracle data")]
    InvalidPriceOracle,
}
