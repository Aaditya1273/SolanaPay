import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Program, AnchorProvider, web3, BN, IdlAccounts } from '@project-serum/anchor';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { EscrowArbitration } from '../types/escrow_arbitration';

export interface EscrowData {
  buyer: PublicKey;
  seller: PublicKey;
  amount: BN;
  status: EscrowStatus;
  description: string;
  createdAt: BN;
  completedAt?: BN;
  autoReleaseTime?: BN;
  isDisputed: boolean;
}

export interface DisputeData {
  escrow: PublicKey;
  disputer: PublicKey;
  reason: string;
  status: DisputeStatus;
  createdAt: BN;
  resolvedAt?: BN;
  assignedArbiter?: PublicKey;
  decision?: DisputeDecision;
  reasoning?: string;
}

export interface ArbiterData {
  pubkey: PublicKey;
  stake: BN;
  reputation: number;
  casesResolved: number;
  isActive: boolean;
  joinedAt: BN;
}

export enum EscrowStatus {
  Active = 'Active',
  Completed = 'Completed',
  Refunded = 'Refunded',
  Cancelled = 'Cancelled'
}

export enum DisputeStatus {
  Open = 'Open',
  Resolved = 'Resolved',
  Appealed = 'Appealed'
}

export enum DisputeDecision {
  FavorBuyer = 'FavorBuyer',
  FavorSeller = 'FavorSeller'
}

export class EscrowArbitrationService {
  private connection: Connection;
  private program: Program<EscrowArbitration>;
  private programId: PublicKey;

  constructor(connection: Connection, program: Program<EscrowArbitration>) {
    this.connection = connection;
    this.program = program;
    this.programId = program.programId;
  }

  static async initialize(
    connection: Connection,
    wallet: WalletContextState,
    idl: any
  ): Promise<EscrowArbitrationService> {
    const provider = new AnchorProvider(connection, wallet as any, {});
    const programId = new PublicKey(process.env.REACT_APP_ESCROW_ARBITRATION_PROGRAM_ID!);
    const program = new Program(idl, programId, provider);
    
    return new EscrowArbitrationService(connection, program);
  }

  // Get config PDA
  private getConfigPDA(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      this.programId
    );
  }

  // Get escrow PDA
  private getEscrowPDA(buyer: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('escrow'), buyer.toBuffer()],
      this.programId
    );
  }

  // Get dispute PDA
  private getDisputePDA(escrowId: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('dispute'), escrowId.toBuffer()],
      this.programId
    );
  }

  // Get arbiter PDA
  private getArbiterPDA(arbiterAccount: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('arbiter'), arbiterAccount.toBuffer()],
      this.programId
    );
  }

  // Initialize the program
  async initializeProgram(
    authority: PublicKey,
    treasury: PublicKey
  ): Promise<string> {
    const [configPDA] = this.getConfigPDA();

    const tx = await this.program.methods
      .initialize()
      .accounts({
        config: configPDA,
        authority,
        treasury,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  // Create escrow
  async createEscrow(
    buyer: PublicKey,
    seller: PublicKey,
    amount: number,
    description: string,
    autoReleaseTime?: number
  ): Promise<string> {
    const [escrowPDA] = this.getEscrowPDA(buyer);
    const [configPDA] = this.getConfigPDA();

    const amountLamports = new BN(amount * LAMPORTS_PER_SOL);
    const autoReleaseTimeBN = autoReleaseTime ? new BN(autoReleaseTime) : null;

    const tx = await this.program.methods
      .createEscrow(amountLamports, description, autoReleaseTimeBN)
      .accounts({
        escrow: escrowPDA,
        config: configPDA,
        buyer,
        seller,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  // Release escrow
  async releaseEscrow(
    escrowId: PublicKey,
    authority: PublicKey,
    seller: PublicKey
  ): Promise<string> {
    const tx = await this.program.methods
      .releaseEscrow()
      .accounts({
        escrow: escrowId,
        authority,
        seller,
      })
      .rpc();

    return tx;
  }

  // Create dispute
  async createDispute(
    escrowId: PublicKey,
    disputer: PublicKey,
    reason: string
  ): Promise<string> {
    const [disputePDA] = this.getDisputePDA(escrowId);
    const [configPDA] = this.getConfigPDA();

    const tx = await this.program.methods
      .createDispute(reason)
      .accounts({
        dispute: disputePDA,
        escrow: escrowId,
        config: configPDA,
        disputer,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  // Add arbiter to DAO
  async addArbiter(
    authority: PublicKey,
    arbiterAccount: PublicKey,
    stakeAmount: number
  ): Promise<string> {
    const [arbiterPDA] = this.getArbiterPDA(arbiterAccount);
    const [configPDA] = this.getConfigPDA();

    const stakeAmountLamports = new BN(stakeAmount * LAMPORTS_PER_SOL);

    const tx = await this.program.methods
      .addArbiter(stakeAmountLamports)
      .accounts({
        arbiter: arbiterPDA,
        config: configPDA,
        authority,
        arbiterAccount,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  // Resolve dispute
  async resolveDispute(
    disputeId: PublicKey,
    escrowId: PublicKey,
    arbiterId: PublicKey,
    buyer: PublicKey,
    seller: PublicKey,
    decision: DisputeDecision,
    reasoning: string
  ): Promise<string> {
    const decisionEnum = decision === DisputeDecision.FavorBuyer 
      ? { favorBuyer: {} } 
      : { favorSeller: {} };

    const tx = await this.program.methods
      .resolveDispute(decisionEnum, reasoning)
      .accounts({
        dispute: disputeId,
        escrow: escrowId,
        arbiter: arbiterId,
        buyer,
        seller,
      })
      .rpc();

    return tx;
  }

  // Fetch escrow data
  async getEscrow(escrowId: PublicKey): Promise<EscrowData | null> {
    try {
      const escrowAccount = await this.program.account.escrow.fetch(escrowId);
      return {
        buyer: escrowAccount.buyer,
        seller: escrowAccount.seller,
        amount: escrowAccount.amount,
        status: this.parseEscrowStatus(escrowAccount.status),
        description: escrowAccount.description,
        createdAt: escrowAccount.createdAt,
        completedAt: escrowAccount.completedAt,
        autoReleaseTime: escrowAccount.autoReleaseTime,
        isDisputed: escrowAccount.isDisputed,
      };
    } catch (error) {
      console.error('Error fetching escrow:', error);
      return null;
    }
  }

  // Fetch dispute data
  async getDispute(disputeId: PublicKey): Promise<DisputeData | null> {
    try {
      const disputeAccount = await this.program.account.dispute.fetch(disputeId);
      return {
        escrow: disputeAccount.escrow,
        disputer: disputeAccount.disputer,
        reason: disputeAccount.reason,
        status: this.parseDisputeStatus(disputeAccount.status),
        createdAt: disputeAccount.createdAt,
        resolvedAt: disputeAccount.resolvedAt,
        assignedArbiter: disputeAccount.assignedArbiter,
        decision: disputeAccount.decision ? this.parseDisputeDecision(disputeAccount.decision) : undefined,
        reasoning: disputeAccount.reasoning,
      };
    } catch (error) {
      console.error('Error fetching dispute:', error);
      return null;
    }
  }

  // Fetch arbiter data
  async getArbiter(arbiterId: PublicKey): Promise<ArbiterData | null> {
    try {
      const arbiterAccount = await this.program.account.arbiter.fetch(arbiterId);
      return {
        pubkey: arbiterAccount.pubkey,
        stake: arbiterAccount.stake,
        reputation: arbiterAccount.reputation,
        casesResolved: arbiterAccount.casesResolved,
        isActive: arbiterAccount.isActive,
        joinedAt: arbiterAccount.joinedAt,
      };
    } catch (error) {
      console.error('Error fetching arbiter:', error);
      return null;
    }
  }

  // Get all escrows for a user
  async getUserEscrows(userPubkey: PublicKey): Promise<EscrowData[]> {
    try {
      const escrows = await this.program.account.escrow.all([
        {
          memcmp: {
            offset: 8, // Skip discriminator
            bytes: userPubkey.toBase58(),
          },
        },
      ]);

      return escrows.map(escrow => ({
        buyer: escrow.account.buyer,
        seller: escrow.account.seller,
        amount: escrow.account.amount,
        status: this.parseEscrowStatus(escrow.account.status),
        description: escrow.account.description,
        createdAt: escrow.account.createdAt,
        completedAt: escrow.account.completedAt,
        autoReleaseTime: escrow.account.autoReleaseTime,
        isDisputed: escrow.account.isDisputed,
      }));
    } catch (error) {
      console.error('Error fetching user escrows:', error);
      return [];
    }
  }

  // Get all active disputes
  async getActiveDisputes(): Promise<DisputeData[]> {
    try {
      const disputes = await this.program.account.dispute.all([
        {
          memcmp: {
            offset: 8 + 32 + 32 + 500, // Skip to status field
            bytes: Buffer.from([0]).toString('base64'), // Open status
          },
        },
      ]);

      return disputes.map(dispute => ({
        escrow: dispute.account.escrow,
        disputer: dispute.account.disputer,
        reason: dispute.account.reason,
        status: this.parseDisputeStatus(dispute.account.status),
        createdAt: dispute.account.createdAt,
        resolvedAt: dispute.account.resolvedAt,
        assignedArbiter: dispute.account.assignedArbiter,
        decision: dispute.account.decision ? this.parseDisputeDecision(dispute.account.decision) : undefined,
        reasoning: dispute.account.reasoning,
      }));
    } catch (error) {
      console.error('Error fetching active disputes:', error);
      return [];
    }
  }

  // Get all arbiters
  async getAllArbiters(): Promise<ArbiterData[]> {
    try {
      const arbiters = await this.program.account.arbiter.all();

      return arbiters.map(arbiter => ({
        pubkey: arbiter.account.pubkey,
        stake: arbiter.account.stake,
        reputation: arbiter.account.reputation,
        casesResolved: arbiter.account.casesResolved,
        isActive: arbiter.account.isActive,
        joinedAt: arbiter.account.joinedAt,
      }));
    } catch (error) {
      console.error('Error fetching arbiters:', error);
      return [];
    }
  }

  // Subscribe to escrow events
  subscribeToEscrowEvents(callback: (event: any) => void): number {
    return this.program.addEventListener('EscrowCreated', callback);
  }

  // Subscribe to dispute events
  subscribeToDisputeEvents(callback: (event: any) => void): number {
    return this.program.addEventListener('DisputeCreated', callback);
  }

  // Unsubscribe from events
  unsubscribeFromEvents(listenerId: number): void {
    this.program.removeEventListener(listenerId);
  }

  // Helper methods to parse enums
  private parseEscrowStatus(status: any): EscrowStatus {
    if (status.active) return EscrowStatus.Active;
    if (status.completed) return EscrowStatus.Completed;
    if (status.refunded) return EscrowStatus.Refunded;
    if (status.cancelled) return EscrowStatus.Cancelled;
    return EscrowStatus.Active;
  }

  private parseDisputeStatus(status: any): DisputeStatus {
    if (status.open) return DisputeStatus.Open;
    if (status.resolved) return DisputeStatus.Resolved;
    if (status.appealed) return DisputeStatus.Appealed;
    return DisputeStatus.Open;
  }

  private parseDisputeDecision(decision: any): DisputeDecision {
    if (decision.favorBuyer) return DisputeDecision.FavorBuyer;
    if (decision.favorSeller) return DisputeDecision.FavorSeller;
    return DisputeDecision.FavorBuyer;
  }

  // Calculate escrow statistics
  async getEscrowStats(): Promise<{
    totalEscrows: number;
    totalDisputes: number;
    totalVolume: number;
    activeEscrows: number;
  }> {
    try {
      const [configPDA] = this.getConfigPDA();
      const config = await this.program.account.escrowConfig.fetch(configPDA);
      
      const allEscrows = await this.program.account.escrow.all();
      const activeEscrows = allEscrows.filter(e => 
        this.parseEscrowStatus(e.account.status) === EscrowStatus.Active
      ).length;

      const totalVolume = allEscrows.reduce((sum, escrow) => 
        sum + escrow.account.amount.toNumber(), 0
      ) / LAMPORTS_PER_SOL;

      return {
        totalEscrows: config.totalEscrows.toNumber(),
        totalDisputes: config.totalDisputes.toNumber(),
        totalVolume,
        activeEscrows,
      };
    } catch (error) {
      console.error('Error fetching escrow stats:', error);
      return {
        totalEscrows: 0,
        totalDisputes: 0,
        totalVolume: 0,
        activeEscrows: 0,
      };
    }
  }
}
