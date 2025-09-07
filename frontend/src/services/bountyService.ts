import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { AnchorProvider, Program, Wallet, BN } from '@project-serum/anchor';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';

export interface BountyData {
  creator: PublicKey;
  title: string;
  description: string;
  reward_amount: number;
  deadline: number;
  category: 'Development' | 'Design' | 'Marketing' | 'Content' | 'Research' | 'Testing' | 'Community' | 'Other';
  required_skills: string[];
  max_participants: number;
  current_participants: number;
  status: 'Open' | 'Completed' | 'Cancelled' | 'Expired';
  created_at: number;
  completed_at: number;
  winner?: PublicKey;
  submissions_count: number;
}

export interface SubmissionData {
  bounty: PublicKey;
  worker: PublicKey;
  submission_data: string;
  submission_hash: string;
  submitted_at: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  review_notes: string;
}

export interface BountyConfig {
  authority: PublicKey;
  platform_fee_bps: number;
  min_bounty_amount: number;
  total_bounties_created: number;
  total_bounties_completed: number;
  total_rewards_distributed: number;
  is_active: boolean;
}

class BountyService {
  private connection: Connection;
  private programId: PublicKey;
  private program: Program | null = null;

  constructor() {
    this.connection = new Connection(
      process.env.REACT_APP_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );
    this.programId = new PublicKey(
      process.env.REACT_APP_BOUNTY_PROGRAM_ID || 'BountySystem111111111111111111111111111111111'
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
      console.error('Failed to initialize bounty program:', error);
    }
  }

  /**
   * Create a new bounty
   */
  async createBounty(
    title: string,
    description: string,
    rewardAmount: number,
    deadline: Date,
    category: string,
    requiredSkills: string[],
    maxParticipants: number,
    rewardMint: PublicKey
  ): Promise<string> {
    if (!this.program) throw new Error('Program not initialized');

    try {
      const creator = this.program.provider.publicKey!;
      const currentTimestamp = Math.floor(Date.now() / 1000);
      
      const [bountyPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('bounty'), creator.toBuffer(), new BN(currentTimestamp).toArrayLike(Buffer, 'le', 8)],
        this.programId
      );

      const [bountyConfigPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('bounty_config')],
        this.programId
      );

      const escrowTokenAccount = await getAssociatedTokenAddress(
        rewardMint,
        bountyPDA,
        true
      );

      const creatorTokenAccount = await getAssociatedTokenAddress(
        rewardMint,
        creator
      );

      const tx = await this.program.methods
        .createBounty(
          title,
          description,
          new BN(rewardAmount),
          new BN(Math.floor(deadline.getTime() / 1000)),
          { [category.toLowerCase()]: {} },
          requiredSkills,
          maxParticipants
        )
        .accounts({
          bounty: bountyPDA,
          bountyConfig: bountyConfigPDA,
          escrowTokenAccount,
          creatorTokenAccount,
          rewardMint,
          creator,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return tx;
    } catch (error) {
      console.error('Failed to create bounty:', error);
      throw error;
    }
  }

  /**
   * Submit work for a bounty
   */
  async submitWork(
    bountyPDA: PublicKey,
    submissionData: string,
    submissionHash: string
  ): Promise<string> {
    if (!this.program) throw new Error('Program not initialized');

    try {
      const worker = this.program.provider.publicKey!;
      
      const [submissionPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('submission'), bountyPDA.toBuffer(), worker.toBuffer()],
        this.programId
      );

      const tx = await this.program.methods
        .submitWork(submissionData, submissionHash)
        .accounts({
          bounty: bountyPDA,
          submission: submissionPDA,
          worker,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return tx;
    } catch (error) {
      console.error('Failed to submit work:', error);
      throw error;
    }
  }

  /**
   * Approve submission and mint NFT proof
   */
  async approveSubmissionAndMintNFT(
    bountyPDA: PublicKey,
    submissionPDA: PublicKey,
    reviewNotes: string,
    nftName: string,
    nftSymbol: string,
    nftUri: string,
    rewardMint: PublicKey
  ): Promise<string> {
    if (!this.program) throw new Error('Program not initialized');

    try {
      const creator = this.program.provider.publicKey!;
      
      const [bountyConfigPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('bounty_config')],
        this.programId
      );

      // Get submission data to find worker
      const submission = await this.program.account.submission.fetch(submissionPDA);
      const worker = submission.worker;

      const escrowTokenAccount = await getAssociatedTokenAddress(
        rewardMint,
        bountyPDA,
        true
      );

      const workerTokenAccount = await getAssociatedTokenAddress(
        rewardMint,
        worker
      );

      const bountyConfig = await this.program.account.bountyConfig.fetch(bountyConfigPDA);
      const platformFeeAccount = await getAssociatedTokenAddress(
        rewardMint,
        bountyConfig.authority
      );

      // Create NFT mint
      const nftMint = new PublicKey(0); // Would generate new keypair
      const workerNftAccount = await getAssociatedTokenAddress(
        nftMint,
        worker
      );

      const [nftMetadata] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s').toBuffer(),
          nftMint.toBuffer(),
        ],
        new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
      );

      const tx = await this.program.methods
        .approveSubmissionAndMintNft(reviewNotes, nftName, nftSymbol, nftUri)
        .accounts({
          bounty: bountyPDA,
          submission: submissionPDA,
          bountyConfig: bountyConfigPDA,
          escrowTokenAccount,
          workerTokenAccount,
          platformFeeAccount,
          nftMint,
          workerNftAccount,
          nftMetadata,
          rewardMint,
          creator,
          metadataProgram: new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return tx;
    } catch (error) {
      console.error('Failed to approve submission and mint NFT:', error);
      throw error;
    }
  }

  /**
   * Get all bounties
   */
  async getAllBounties(): Promise<BountyData[]> {
    if (!this.program) throw new Error('Program not initialized');

    try {
      const bounties = await this.program.account.bounty.all();
      return bounties.map(bounty => ({
        ...bounty.account,
        publicKey: bounty.publicKey,
      })) as BountyData[];
    } catch (error) {
      console.error('Failed to get bounties:', error);
      return [];
    }
  }

  /**
   * Get bounty by public key
   */
  async getBounty(bountyPDA: PublicKey): Promise<BountyData | null> {
    if (!this.program) throw new Error('Program not initialized');

    try {
      const bounty = await this.program.account.bounty.fetch(bountyPDA);
      return bounty as BountyData;
    } catch (error) {
      console.error('Failed to get bounty:', error);
      return null;
    }
  }

  /**
   * Get submissions for a bounty
   */
  async getBountySubmissions(bountyPDA: PublicKey): Promise<SubmissionData[]> {
    if (!this.program) throw new Error('Program not initialized');

    try {
      const submissions = await this.program.account.submission.all([
        {
          memcmp: {
            offset: 8, // After discriminator
            bytes: bountyPDA.toBase58(),
          },
        },
      ]);

      return submissions.map(submission => ({
        ...submission.account,
        publicKey: submission.publicKey,
      })) as SubmissionData[];
    } catch (error) {
      console.error('Failed to get submissions:', error);
      return [];
    }
  }

  /**
   * Get user's submissions
   */
  async getUserSubmissions(userPubkey: PublicKey): Promise<SubmissionData[]> {
    if (!this.program) throw new Error('Program not initialized');

    try {
      const submissions = await this.program.account.submission.all([
        {
          memcmp: {
            offset: 40, // After discriminator + bounty pubkey
            bytes: userPubkey.toBase58(),
          },
        },
      ]);

      return submissions.map(submission => ({
        ...submission.account,
        publicKey: submission.publicKey,
      })) as SubmissionData[];
    } catch (error) {
      console.error('Failed to get user submissions:', error);
      return [];
    }
  }

  /**
   * Get bounty statistics
   */
  async getBountyStatistics(): Promise<{
    totalBounties: number;
    activeBounties: number;
    completedBounties: number;
    totalRewardsDistributed: number;
    averageReward: number;
    categoryDistribution: { [key: string]: number };
  }> {
    try {
      const bounties = await this.getAllBounties();
      
      const totalBounties = bounties.length;
      const activeBounties = bounties.filter(b => b.status === 'Open').length;
      const completedBounties = bounties.filter(b => b.status === 'Completed').length;
      const totalRewardsDistributed = bounties
        .filter(b => b.status === 'Completed')
        .reduce((sum, b) => sum + b.reward_amount, 0);
      const averageReward = completedBounties > 0 ? totalRewardsDistributed / completedBounties : 0;
      
      const categoryDistribution: { [key: string]: number } = {};
      bounties.forEach(bounty => {
        categoryDistribution[bounty.category] = (categoryDistribution[bounty.category] || 0) + 1;
      });

      return {
        totalBounties,
        activeBounties,
        completedBounties,
        totalRewardsDistributed,
        averageReward,
        categoryDistribution,
      };
    } catch (error) {
      console.error('Failed to get bounty statistics:', error);
      return {
        totalBounties: 0,
        activeBounties: 0,
        completedBounties: 0,
        totalRewardsDistributed: 0,
        averageReward: 0,
        categoryDistribution: {},
      };
    }
  }

  /**
   * Subscribe to bounty events
   */
  subscribeToBountyEvents(
    callback: (event: {
      type: 'BountyCreated' | 'WorkSubmitted' | 'BountyCompleted' | 'SubmissionRejected';
      data: any;
    }) => void
  ): () => void {
    if (!this.program) {
      console.error('Program not initialized');
      return () => {};
    }

    const eventListeners: number[] = [];

    // Listen for bounty created events
    const createdListener = this.program.addEventListener('BountyCreated', (event) => {
      callback({
        type: 'BountyCreated',
        data: event
      });
    });
    eventListeners.push(createdListener);

    // Listen for work submitted events
    const submittedListener = this.program.addEventListener('WorkSubmitted', (event) => {
      callback({
        type: 'WorkSubmitted',
        data: event
      });
    });
    eventListeners.push(submittedListener);

    // Listen for bounty completed events
    const completedListener = this.program.addEventListener('BountyCompleted', (event) => {
      callback({
        type: 'BountyCompleted',
        data: event
      });
    });
    eventListeners.push(completedListener);

    // Listen for submission rejected events
    const rejectedListener = this.program.addEventListener('SubmissionRejected', (event) => {
      callback({
        type: 'SubmissionRejected',
        data: event
      });
    });
    eventListeners.push(rejectedListener);

    // Return cleanup function
    return () => {
      eventListeners.forEach(listener => {
        this.program?.removeEventListener(listener);
      });
    };
  }

  /**
   * Format category for display
   */
  formatCategory(category: string): { label: string; color: string; icon: string } {
    const categoryMap: { [key: string]: { label: string; color: string; icon: string } } = {
      development: { label: 'Development', color: 'blue', icon: '💻' },
      design: { label: 'Design', color: 'purple', icon: '🎨' },
      marketing: { label: 'Marketing', color: 'green', icon: '📢' },
      content: { label: 'Content', color: 'yellow', icon: '✍️' },
      research: { label: 'Research', color: 'indigo', icon: '🔬' },
      testing: { label: 'Testing', color: 'red', icon: '🧪' },
      community: { label: 'Community', color: 'pink', icon: '👥' },
      other: { label: 'Other', color: 'gray', icon: '📋' },
    };

    return categoryMap[category.toLowerCase()] || categoryMap.other;
  }

  /**
   * Format bounty status for display
   */
  formatStatus(status: string): { label: string; color: string; icon: string } {
    const statusMap: { [key: string]: { label: string; color: string; icon: string } } = {
      open: { label: 'Open', color: 'green', icon: '🟢' },
      completed: { label: 'Completed', color: 'blue', icon: '✅' },
      cancelled: { label: 'Cancelled', color: 'red', icon: '❌' },
      expired: { label: 'Expired', color: 'gray', icon: '⏰' },
    };

    return statusMap[status.toLowerCase()] || statusMap.open;
  }
}

export default BountyService;
