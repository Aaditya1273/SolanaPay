import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { AnchorProvider, Program, Wallet, BN } from '@project-serum/anchor';
import { useWallet } from '@solana/wallet-adapter-react';

export interface FraudFlag {
  flag_type: 'HighValueTransaction' | 'HighVelocity' | 'ExcessiveVolume' | 'HighRiskRecipient' | 'UnusualPattern' | 'KYCRequired' | 'KYCUpgradeRequired' | 'AIAnomaly';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  description: string;
  detected_at_slot: number;
}

export interface UserProfile {
  user: PublicKey;
  sns_domain: string;
  kyc_level: 'None' | 'Basic' | 'Enhanced';
  risk_score: number;
  total_transaction_count: number;
  total_volume_usd: number;
  daily_transaction_count: number;
  daily_volume_usd: number;
  last_transaction_slot: number;
  last_daily_reset_slot: number;
  is_flagged: boolean;
  is_blocked: boolean;
  flags: FraudFlag[];
}

export interface TransactionRecord {
  user: PublicKey;
  recipient: PublicKey;
  amount_lamports: number;
  amount_usd: number;
  transaction_type: 'Payment' | 'Transfer' | 'Swap' | 'Bridge' | 'Stake' | 'Other';
  status: 'Approved' | 'Flagged' | 'Blocked';
  flags: FraudFlag[];
  processed_at_slot: number;
}

export interface ComplianceConfig {
  authority: PublicKey;
  high_value_threshold_usd: number;
  velocity_threshold: number;
  max_daily_volume_usd: number;
  is_active: boolean;
  total_flagged_transactions: number;
  total_blocked_transactions: number;
  last_updated_slot: number;
}

export interface AIAnomalyAnalysis {
  anomalyScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical' | 'unknown';
  indicators: string[];
  recommendations: string[];
  confidence: number;
}

class FraudDetectionService {
  private connection: Connection;
  private programId: PublicKey;
  private program: Program | null = null;

  constructor() {
    this.connection = new Connection(
      process.env.REACT_APP_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );
    this.programId = new PublicKey(
      process.env.REACT_APP_FRAUD_DETECTION_PROGRAM_ID || 'FraudDetection1111111111111111111111111111111'
    );
  }

  /**
   * Initialize the Anchor program
   */
  async initializeProgram(wallet: any): Promise<void> {
    try {
      const provider = new AnchorProvider(this.connection, wallet, {
        commitment: 'confirmed',
      });

      // Load IDL (would be imported from generated types)
      const idl = await Program.fetchIdl(this.programId, provider);
      if (idl) {
        this.program = new Program(idl, this.programId, provider);
      }
    } catch (error) {
      console.error('Failed to initialize fraud detection program:', error);
    }
  }

  /**
   * Register user profile for fraud monitoring
   */
  async registerUserProfile(
    userPubkey: PublicKey,
    snsDomain: string,
    kycLevel: 'None' | 'Basic' | 'Enhanced'
  ): Promise<string> {
    if (!this.program) throw new Error('Program not initialized');

    try {
      const [userProfilePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('user_profile'), userPubkey.toBuffer()],
        this.programId
      );

      const tx = await this.program.methods
        .registerUserProfile(userPubkey, snsDomain, { [kycLevel.toLowerCase()]: {} })
        .accounts({
          userProfile: userProfilePDA,
          authority: this.program.provider.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return tx;
    } catch (error) {
      console.error('Failed to register user profile:', error);
      throw error;
    }
  }

  /**
   * Monitor transaction for fraud indicators
   */
  async monitorTransaction(
    userPubkey: PublicKey,
    recipient: PublicKey,
    amountLamports: number,
    transactionType: 'Payment' | 'Transfer' | 'Swap' | 'Bridge' | 'Stake' | 'Other'
  ): Promise<{ status: 'Approved' | 'Flagged' | 'Blocked'; flags: FraudFlag[] }> {
    if (!this.program) throw new Error('Program not initialized');

    try {
      const [userProfilePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('user_profile'), userPubkey.toBuffer()],
        this.programId
      );

      const [complianceConfigPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('compliance_config')],
        this.programId
      );

      const currentSlot = await this.connection.getSlot();
      const [transactionRecordPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('transaction_record'),
          userPubkey.toBuffer(),
          new BN(currentSlot).toArrayLike(Buffer, 'le', 8)
        ],
        this.programId
      );

      // Get price oracle account (would be configured)
      const priceOracle = new PublicKey('So11111111111111111111111111111111111111112'); // SOL price feed

      const result = await this.program.methods
        .monitorTransaction(
          new BN(amountLamports),
          recipient,
          { [transactionType.toLowerCase()]: {} }
        )
        .accounts({
          userProfile: userProfilePDA,
          complianceConfig: complianceConfigPDA,
          transactionRecord: transactionRecordPDA,
          priceOracle: priceOracle,
          authority: this.program.provider.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Fetch the transaction record to get the result
      const transactionRecord = await this.getTransactionRecord(transactionRecordPDA);
      
      return {
        status: transactionRecord.status,
        flags: transactionRecord.flags
      };

    } catch (error) {
      console.error('Failed to monitor transaction:', error);
      throw error;
    }
  }

  /**
   * Get user profile with fraud indicators
   */
  async getUserProfile(userPubkey: PublicKey): Promise<UserProfile | null> {
    if (!this.program) throw new Error('Program not initialized');

    try {
      const [userProfilePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('user_profile'), userPubkey.toBuffer()],
        this.programId
      );

      const userProfile = await this.program.account.userProfile.fetch(userProfilePDA);
      return userProfile as UserProfile;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  /**
   * Get transaction record
   */
  async getTransactionRecord(transactionRecordPDA: PublicKey): Promise<TransactionRecord> {
    if (!this.program) throw new Error('Program not initialized');

    try {
      const record = await this.program.account.transactionRecord.fetch(transactionRecordPDA);
      return record as TransactionRecord;
    } catch (error) {
      console.error('Failed to get transaction record:', error);
      throw error;
    }
  }

  /**
   * Get compliance configuration
   */
  async getComplianceConfig(): Promise<ComplianceConfig | null> {
    if (!this.program) throw new Error('Program not initialized');

    try {
      const [complianceConfigPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('compliance_config')],
        this.programId
      );

      const config = await this.program.account.complianceConfig.fetch(complianceConfigPDA);
      return config as ComplianceConfig;
    } catch (error) {
      console.error('Failed to get compliance config:', error);
      return null;
    }
  }

  /**
   * Add high-risk address to registry
   */
  async addHighRiskAddress(
    address: PublicKey,
    riskCategory: 'Sanctions' | 'PEP' | 'HighRiskJurisdiction' | 'KnownScammer' | 'MixerService' | 'DarknetMarket' | 'Ransomware' | 'Other',
    riskLevel: 'Low' | 'Medium' | 'High' | 'Critical',
    description: string
  ): Promise<string> {
    if (!this.program) throw new Error('Program not initialized');

    try {
      const [riskRegistryPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('risk_registry'), address.toBuffer()],
        this.programId
      );

      const [complianceConfigPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('compliance_config')],
        this.programId
      );

      const tx = await this.program.methods
        .addHighRiskAddress(
          address,
          { [riskCategory.toLowerCase()]: {} },
          { [riskLevel.toLowerCase()]: {} },
          description
        )
        .accounts({
          riskRegistry: riskRegistryPDA,
          complianceConfig: complianceConfigPDA,
          authority: this.program.provider.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return tx;
    } catch (error) {
      console.error('Failed to add high-risk address:', error);
      throw error;
    }
  }

  /**
   * Whitelist address to bypass fraud checks
   */
  async whitelistAddress(address: PublicKey): Promise<string> {
    if (!this.program) throw new Error('Program not initialized');

    try {
      const [whitelistPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('whitelist'), address.toBuffer()],
        this.programId
      );

      const [complianceConfigPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('compliance_config')],
        this.programId
      );

      const tx = await this.program.methods
        .whitelistAddress(address)
        .accounts({
          whitelist: whitelistPDA,
          complianceConfig: complianceConfigPDA,
          authority: this.program.provider.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return tx;
    } catch (error) {
      console.error('Failed to whitelist address:', error);
      throw error;
    }
  }

  /**
   * Unblock user after manual review
   */
  async unblockUser(userPubkey: PublicKey, reason: string): Promise<string> {
    if (!this.program) throw new Error('Program not initialized');

    try {
      const [userProfilePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('user_profile'), userPubkey.toBuffer()],
        this.programId
      );

      const [complianceConfigPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('compliance_config')],
        this.programId
      );

      const tx = await this.program.methods
        .unblockUser(reason)
        .accounts({
          userProfile: userProfilePDA,
          complianceConfig: complianceConfigPDA,
          authority: this.program.provider.publicKey,
        })
        .rpc();

      return tx;
    } catch (error) {
      console.error('Failed to unblock user:', error);
      throw error;
    }
  }

  /**
   * Analyze transaction with AI anomaly detection
   */
  async analyzeTransactionAI(
    userPubkey: PublicKey,
    transactionData: {
      amount_usd: number;
      recipient: string;
      sender: string;
      transaction_type: string;
      timestamp: number;
      crossChain?: boolean;
      gasPrice?: number;
      networkCongestion?: number;
      recipientRiskScore?: number;
      kycLevel?: number;
    }
  ): Promise<AIAnomalyAnalysis> {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/fraud/analyze-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('SolanaPay-token')}`
        },
        body: JSON.stringify({
          userPubkey: userPubkey.toString(),
          transactionData
        })
      });

      if (!response.ok) {
        throw new Error('AI analysis request failed');
      }

      const analysis: AIAnomalyAnalysis = await response.json();
      return analysis;

    } catch (error) {
      console.error('AI anomaly analysis failed:', error);
      return {
        anomalyScore: 0,
        riskLevel: 'unknown',
        indicators: ['AI analysis unavailable'],
        recommendations: ['Manual review recommended'],
        confidence: 0
      };
    }
  }

  /**
   * Get user transaction history for analysis
   */
  async getUserTransactionHistory(
    userPubkey: PublicKey,
    limit: number = 100
  ): Promise<TransactionRecord[]> {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/fraud/transaction-history/${userPubkey.toString()}?limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('SolanaPay-token')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch transaction history');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get transaction history:', error);
      return [];
    }
  }

  /**
   * Get fraud detection statistics
   */
  async getFraudStatistics(): Promise<{
    totalTransactionsMonitored: number;
    totalFlagged: number;
    totalBlocked: number;
    flaggedPercentage: number;
    blockedPercentage: number;
    topFlagTypes: { type: string; count: number }[];
    riskDistribution: { level: string; count: number }[];
  }> {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/fraud/statistics`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('SolanaPay-token')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch fraud statistics');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get fraud statistics:', error);
      return {
        totalTransactionsMonitored: 0,
        totalFlagged: 0,
        totalBlocked: 0,
        flaggedPercentage: 0,
        blockedPercentage: 0,
        topFlagTypes: [],
        riskDistribution: []
      };
    }
  }

  /**
   * Subscribe to fraud detection events
   */
  subscribeToFraudEvents(
    callback: (event: {
      type: 'TransactionFlagged' | 'TransactionBlocked' | 'UserBlocked' | 'AIRiskScoreUpdated';
      data: any;
    }) => void
  ): () => void {
    if (!this.program) {
      console.error('Program not initialized');
      return () => {};
    }

    const eventListeners: number[] = [];

    // Listen for transaction flagged events
    const flaggedListener = this.program.addEventListener('TransactionFlagged', (event) => {
      callback({
        type: 'TransactionFlagged',
        data: event
      });
    });
    eventListeners.push(flaggedListener);

    // Listen for AI risk score updates
    const aiUpdateListener = this.program.addEventListener('AIRiskScoreUpdated', (event) => {
      callback({
        type: 'AIRiskScoreUpdated',
        data: event
      });
    });
    eventListeners.push(aiUpdateListener);

    // Listen for user blocked events
    const blockedListener = this.program.addEventListener('UserUnblocked', (event) => {
      callback({
        type: 'UserBlocked',
        data: event
      });
    });
    eventListeners.push(blockedListener);

    // Return cleanup function
    return () => {
      eventListeners.forEach(listener => {
        this.program?.removeEventListener(listener);
      });
    };
  }

  /**
   * Format risk level for display
   */
  formatRiskLevel(riskLevel: string): { color: string; label: string } {
    switch (riskLevel.toLowerCase()) {
      case 'critical':
        return { color: 'red', label: 'Critical Risk' };
      case 'high':
        return { color: 'orange', label: 'High Risk' };
      case 'medium':
        return { color: 'yellow', label: 'Medium Risk' };
      case 'low':
        return { color: 'green', label: 'Low Risk' };
      default:
        return { color: 'gray', label: 'Unknown Risk' };
    }
  }

  /**
   * Format transaction status for display
   */
  formatTransactionStatus(status: string): { color: string; label: string; icon: string } {
    switch (status.toLowerCase()) {
      case 'approved':
        return { color: 'green', label: 'Approved', icon: '✅' };
      case 'flagged':
        return { color: 'yellow', label: 'Flagged', icon: '⚠️' };
      case 'blocked':
        return { color: 'red', label: 'Blocked', icon: '🚫' };
      default:
        return { color: 'gray', label: 'Unknown', icon: '❓' };
    }
  }
}

export default FraudDetectionService;
