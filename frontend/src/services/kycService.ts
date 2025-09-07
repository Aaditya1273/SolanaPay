import { Program, AnchorProvider, web3 } from '@project-serum/anchor';
import { PublicKey, Connection, Keypair } from '@solana/web3.js';
import { IDL as KycVerificationIDL } from '../../contracts/target/types/kyc_verification';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';

export const KYC_VERIFICATION_PROGRAM_ID = new PublicKey('KYCVerification11111111111111111111111111111');

export class KYCService {
  private program: Program;
  private connection: Connection;
  private wallet: any;

  constructor(connection: Connection, wallet: any) {
    this.connection = connection;
    this.wallet = wallet;
    
    const provider = new AnchorProvider(
      connection,
      wallet,
      AnchorProvider.defaultOptions()
    );
    
    this.program = new Program(KycVerificationIDL, KYC_VERIFICATION_PROGRAM_ID, provider);
  }

  // Get the KYC SBT mint address
  async getKycMint(): Promise<PublicKey> {
    const [mint] = await PublicKey.findProgramAddress(
      [Buffer.from('kyc_mint')],
      this.program.programId
    );
    return mint;
  }

  // Check if a user has a KYC SBT
  async hasKycVerification(user: PublicKey): Promise<boolean> {
    try {
      const mint = await this.getKycMint();
      const userAta = await getAssociatedTokenAddress(
        mint,
        user,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      
      const accountInfo = await this.connection.getAccountInfo(userAta);
      return accountInfo !== null && accountInfo.lamports > 0;
    } catch (error) {
      console.error('Error checking KYC status:', error);
      return false;
    }
  }

  // Verify KYC and mint SBT to user
  async verifyKyc(): Promise<string> {
    try {
      const mint = await this.getKycMint();
      const user = this.wallet.publicKey;
      
      const userAta = await getAssociatedTokenAddress(
        mint,
        user,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      
      const tx = await this.program.methods
        .verifyKyc()
        .accounts({
          mint,
          user,
          userAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();
      
      return tx;
    } catch (error) {
      console.error('Error verifying KYC:', error);
      throw error;
    }
  }

  // Get KYC status for a user
  async getKycStatus(user: PublicKey): Promise<{
    isVerified: boolean;
    mint: string;
    tokenAccount?: string;
  }> {
    try {
      const mint = await this.getKycMint();
      const userAta = await getAssociatedTokenAddress(
        mint,
        user,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      
      const accountInfo = await this.connection.getAccountInfo(userAta);
      const hasToken = accountInfo !== null && accountInfo.lamports > 0;
      
      return {
        isVerified: hasToken,
        mint: mint.toString(),
        tokenAccount: hasToken ? userAta.toString() : undefined
      };
    } catch (error) {
      console.error('Error getting KYC status:', error);
      return {
        isVerified: false,
        mint: (await this.getKycMint()).toString()
      };
    }
  }
}

// Helper function to initialize the KYC service
export const initKYCService = (connection: Connection, wallet: any): KYCService => {
  return new KYCService(connection, wallet);
};
