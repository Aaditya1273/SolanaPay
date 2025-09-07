import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { AnchorProvider, Program } from '@project-serum/anchor';
import { IDL as FiatBridgeIDL } from '../../contracts/target/types/fiat_bridge';
import { IDL as MerchantRewardsIDL } from '../../contracts/target/types/merchant_rewards';
import { IDL as KycVerificationIDL } from '../../contracts/target/types/kyc_verification';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import axios from 'axios';

// Program IDs (update these after deployment)
export const FIAT_BRIDGE_PROGRAM_ID = new PublicKey('FiatBridge1111111111111111111111111111111111111');
export const MERCHANT_REWARDS_PROGRAM_ID = new PublicKey('MerchantRewards11111111111111111111111111111');
export const KYC_VERIFICATION_PROGRAM_ID = new PublicKey('KYCVerification11111111111111111111111111111');

// USDC mint address (mainnet)
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

interface BridgeConfig {
  circleApiKey: string;
  circleBaseUrl: string;
  circleEntitySecret: string;
  circleMasterWalletId: string;
  solanaNetwork: string;
}

export class FiatBridgeService {
  private connection: Connection;
  private wallet: any;
  private config: BridgeConfig;
  private provider: AnchorProvider;
  
  constructor(connection: Connection, wallet: any, config: BridgeConfig) {
    this.connection = connection;
    this.wallet = wallet;
    this.config = config;
    this.provider = new AnchorProvider(connection, wallet, {});
  }

  // Get bridge state PDA
  private async getBridgeStatePDA() {
    const [pda] = await PublicKey.findProgramAddress(
      [Buffer.from('bridge_state')],
      FIAT_BRIDGE_PROGRAM_ID
    );
    return pda;
  }

  // Get user's USDC ATA
  private async getUserUSDCATA(user: PublicKey) {
    return getAssociatedTokenAddress(
      USDC_MINT,
      user,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
  }

  // Initialize fiat deposit through Circle API
  async initiateFiatDeposit(amount: string, returnUrl: string) {
    try {
      const response = await axios.post(
        `${this.config.circleBaseUrl}/v1/paymentIntents`,
        {
          amount: {
            amount,
            currency: 'USD'
          },
          settlementCurrency: 'USD',
          paymentMethods: [{
            type: 'credit_card',
            metadata: {
              email: `${this.wallet.publicKey.toString()}@solanapay.com`,
              phoneNumber: '+1234567890'
            }
          }],
          metadata: {
            userId: this.wallet.publicKey.toString(),
            type: 'fiat_deposit'
          },
          autoClaim: true,
          verificationSuccessUrl: `${returnUrl}?status=success`,
          verificationFailureUrl: `${returnUrl}?status=failed`
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.circleApiKey}`
          }
        }
      );

      return response.data.data;
    } catch (error) {
      console.error('Error initiating fiat deposit:', error);
      throw error;
    }
  }

  // Process fiat deposit on-chain
  async processFiatDeposit(amount: string, circleTxId: string) {
    try {
      const bridgeStatePDA = await this.getBridgeStatePDA();
      const userAta = await this.getUserUSDCATA(this.wallet.publicKey);
      
      // Get program accounts
      const program = new Program(FiatBridgeIDL, FIAT_BRIDGE_PROGRAM_ID, this.provider);
      
      // Find or create processed tx account
      const [processedTxPDA] = await PublicKey.findProgramAddress(
        [Buffer.from('processed_tx'), Buffer.from(circleTxId)],
        FIAT_BRIDGE_PROGRAM_ID
      );
      
      // Create transaction
      const tx = await program.methods
        .processFiatDeposit(
          BigInt(amount),
          this.wallet.publicKey,
          circleTxId
        )
        .accounts({
          bridgeState: bridgeStatePDA,
          bridgeVault: await this.getBridgeVault(),
          feeVault: await this.getFeeVault(),
          processedTx: processedTxPDA,
          userAta,
          admin: this.wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId,
        })
        .transaction();
      
      // Sign and send transaction
      const { blockhash } = await this.connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = this.wallet.publicKey;
      
      const signedTx = await this.wallet.signTransaction(tx);
      const txId = await this.connection.sendRawTransaction(signedTx.serialize());
      
      // Confirm transaction
      await this.connection.confirmTransaction(txId);
      
      return txId;
    } catch (error) {
      console.error('Error processing fiat deposit:', error);
      throw error;
    }
  }

  // Get bridge vault address
  private async getBridgeVault() {
    const bridgeStatePDA = await this.getBridgeStatePDA();
    const [vault] = await PublicKey.findProgramAddress(
      [bridgeStatePDA.toBuffer(), Buffer.from('vault')],
      FIAT_BRIDGE_PROGRAM_ID
    );
    return vault;
  }

  // Get fee vault address
  private async getFeeVault() {
    const bridgeStatePDA = await this.getBridgeStatePDA();
    const [vault] = await PublicKey.findProgramAddress(
      [bridgeStatePDA.toBuffer(), Buffer.from('fee_vault')],
      FIAT_BRIDGE_PROGRAM_ID
    );
    return vault;
  }

  // Get bridge state
  async getBridgeState() {
    try {
      const bridgeStatePDA = await this.getBridgeStatePDA();
      const program = new Program(FiatBridgeIDL, FIAT_BRIDGE_PROGRAM_ID, this.provider);
      return await program.account.bridgeState.fetch(bridgeStatePDA);
    } catch (error) {
      console.error('Error getting bridge state:', error);
      throw error;
    }
  }

  // Check if a transaction has been processed
  async isTransactionProcessed(txId: string) {
    try {
      const [processedTxPDA] = await PublicKey.findProgramAddress(
        [Buffer.from('processed_tx'), Buffer.from(txId)],
        FIAT_BRIDGE_PROGRAM_ID
      );
      
      const accountInfo = await this.connection.getAccountInfo(processedTxPDA);
      return accountInfo !== null;
    } catch (error) {
      console.error('Error checking transaction status:', error);
      return false;
    }
  }
}

// Helper function to initialize the fiat bridge service
export const initFiatBridgeService = (
  connection: Connection, 
  wallet: any, 
  config: BridgeConfig
): FiatBridgeService => {
  return new FiatBridgeService(connection, wallet, config);
};
