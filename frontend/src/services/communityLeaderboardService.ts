import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, web3, BN, IdlAccounts } from '@project-serum/anchor';
import { WalletContextState } from '@solana/wallet-adapter-react';

// Community Leaderboard Program ID
const COMMUNITY_LEADERBOARD_PROGRAM_ID = new PublicKey('COMMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');

// Types matching Rust program
export enum UserTier {
  Bronze = 'Bronze',
  Silver = 'Silver',
  Gold = 'Gold',
  Platinum = 'Platinum'
}

export enum TransactionType {
  Payment = 'Payment',
  Reward = 'Reward',
  Staking = 'Staking',
  Trading = 'Trading',
  Donation = 'Donation'
}

export enum TaskType {
  Survey = 'Survey',
  Testing = 'Testing',
  Development = 'Development',
  Community = 'Community',
  Education = 'Education',
  Marketing = 'Marketing'
}

export enum TaskDifficulty {
  Easy = 'Easy',
  Medium = 'Medium',
  Hard = 'Hard',
  Expert = 'Expert'
}

export enum BadgeType {
  EarlyAdopter = 'EarlyAdopter',
  PowerUser = 'PowerUser',
  CommunityChampion = 'CommunityChampion',
  TaskMaster = 'TaskMaster',
  TransactionKing = 'TransactionKing',
  LoyaltyLegend = 'LoyaltyLegend'
}

export enum AchievementType {
  Top10Overall = 'Top10Overall',
  Top100Transactions = 'Top100Transactions',
  TaskCompletionist = 'TaskCompletionist',
  VolumeLeader = 'VolumeLeader',
  SeasonWinner = 'SeasonWinner'
}

export interface UserProfile {
  owner: PublicKey;
  username: string;
  solDomain?: string;
  totalTransactions: number;
  totalVolume: number;
  tasksCompleted: number;
  rewardsEarned: number;
  contributionScore: number;
  tier: UserTier;
  badges: BadgeType[];
  joinedAt: number;
  lastActivity: number;
  isActive: boolean;
}

export interface LeaderboardConfig {
  authority: PublicKey;
  totalUsers: number;
  totalTransactions: number;
  totalTasksCompleted: number;
  totalRewardsDistributed: number;
  seasonNumber: number;
  seasonStart: number;
  seasonEnd: number;
  isPaused: boolean;
}

export interface UserRankInfo {
  userId: PublicKey;
  contributionScore: number;
  tier: UserTier;
  totalTransactions: number;
  tasksCompleted: number;
  rewardsEarned: number;
  badgesCount: number;
  estimatedRank: number;
}

export interface Achievement {
  userId: PublicKey;
  achievementType: AchievementType;
  mint: PublicKey;
  metadataUri: string;
  seasonNumber: number;
  mintedAt: number;
}

export interface LeaderboardEntry {
  rank: number;
  userProfile: UserProfile;
  score: number;
  tier: UserTier;
  badges: BadgeType[];
}

export class CommunityLeaderboardService {
  private connection: Connection;
  private program: Program | null = null;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  private async getProgram(wallet: WalletContextState): Promise<Program> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }

    if (!this.program) {
      const provider = new AnchorProvider(
        this.connection,
        wallet as any,
        { commitment: 'confirmed' }
      );
      
      // In a real implementation, you'd load the IDL
      // For now, we'll create transactions manually
      this.program = null; // Placeholder
    }

    return this.program!;
  }

  // Get PDA addresses
  private getConfigPDA(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      COMMUNITY_LEADERBOARD_PROGRAM_ID
    );
  }

  private getUserProfilePDA(owner: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('user'), owner.toBuffer()],
      COMMUNITY_LEADERBOARD_PROGRAM_ID
    );
  }

  private getAchievementPDA(userProfileKey: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('achievement'), userProfileKey.toBuffer()],
      COMMUNITY_LEADERBOARD_PROGRAM_ID
    );
  }

  // Initialize program (admin only)
  async initializeProgram(wallet: WalletContextState): Promise<string> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }

    const [configPDA] = this.getConfigPDA();
    
    // Create initialize instruction (manual construction)
    const instruction = new web3.TransactionInstruction({
      keys: [
        { pubkey: configPDA, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: COMMUNITY_LEADERBOARD_PROGRAM_ID,
      data: Buffer.from([0]), // Initialize instruction discriminator
    });

    const transaction = new Transaction().add(instruction);
    const signature = await wallet.sendTransaction(transaction, this.connection);
    await this.connection.confirmTransaction(signature);

    return signature;
  }

  // Register user for leaderboard
  async registerUser(
    wallet: WalletContextState,
    username: string,
    solDomain?: string
  ): Promise<string> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }

    const [userProfilePDA] = this.getUserProfilePDA(wallet.publicKey);
    const [configPDA] = this.getConfigPDA();

    // Create register user instruction
    const usernameBuffer = Buffer.from(username);
    const solDomainBuffer = solDomain ? Buffer.from(solDomain) : Buffer.alloc(0);
    
    const data = Buffer.concat([
      Buffer.from([1]), // RegisterUser instruction discriminator
      Buffer.from([usernameBuffer.length]),
      usernameBuffer,
      Buffer.from([solDomainBuffer.length]),
      solDomainBuffer,
    ]);

    const instruction = new web3.TransactionInstruction({
      keys: [
        { pubkey: userProfilePDA, isSigner: false, isWritable: true },
        { pubkey: configPDA, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: COMMUNITY_LEADERBOARD_PROGRAM_ID,
      data,
    });

    const transaction = new Transaction().add(instruction);
    const signature = await wallet.sendTransaction(transaction, this.connection);
    await this.connection.confirmTransaction(signature);

    return signature;
  }

  // Record transaction for scoring
  async recordTransaction(
    wallet: WalletContextState,
    amount: number,
    transactionType: TransactionType,
    transactionHash: string
  ): Promise<string> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }

    const [userProfilePDA] = this.getUserProfilePDA(wallet.publicKey);
    const [configPDA] = this.getConfigPDA();

    const data = Buffer.concat([
      Buffer.from([2]), // RecordTransaction instruction discriminator
      new BN(amount).toArrayLike(Buffer, 'le', 8),
      Buffer.from([Object.values(TransactionType).indexOf(transactionType)]),
      Buffer.from([transactionHash.length]),
      Buffer.from(transactionHash),
    ]);

    const instruction = new web3.TransactionInstruction({
      keys: [
        { pubkey: userProfilePDA, isSigner: false, isWritable: true },
        { pubkey: configPDA, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
      ],
      programId: COMMUNITY_LEADERBOARD_PROGRAM_ID,
      data,
    });

    const transaction = new Transaction().add(instruction);
    const signature = await wallet.sendTransaction(transaction, this.connection);
    await this.connection.confirmTransaction(signature);

    return signature;
  }

  // Record task completion
  async recordTaskCompletion(
    wallet: WalletContextState,
    taskType: TaskType,
    difficulty: TaskDifficulty,
    rewardAmount: number,
    taskId: string
  ): Promise<string> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }

    const [userProfilePDA] = this.getUserProfilePDA(wallet.publicKey);
    const [configPDA] = this.getConfigPDA();

    const data = Buffer.concat([
      Buffer.from([3]), // RecordTaskCompletion instruction discriminator
      Buffer.from([Object.values(TaskType).indexOf(taskType)]),
      Buffer.from([Object.values(TaskDifficulty).indexOf(difficulty)]),
      new BN(rewardAmount).toArrayLike(Buffer, 'le', 8),
      Buffer.from([taskId.length]),
      Buffer.from(taskId),
    ]);

    const instruction = new web3.TransactionInstruction({
      keys: [
        { pubkey: userProfilePDA, isSigner: false, isWritable: true },
        { pubkey: configPDA, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
      ],
      programId: COMMUNITY_LEADERBOARD_PROGRAM_ID,
      data,
    });

    const transaction = new Transaction().add(instruction);
    const signature = await wallet.sendTransaction(transaction, this.connection);
    await this.connection.confirmTransaction(signature);

    return signature;
  }

  // Get user profile
  async getUserProfile(userPublicKey: PublicKey): Promise<UserProfile | null> {
    try {
      const [userProfilePDA] = this.getUserProfilePDA(userPublicKey);
      const accountInfo = await this.connection.getAccountInfo(userProfilePDA);
      
      if (!accountInfo) {
        return null;
      }

      // Parse account data (simplified - in real implementation, use Anchor deserialization)
      const data = accountInfo.data;
      // This would need proper deserialization based on the Rust struct layout
      
      return {
        owner: userPublicKey,
        username: 'User', // Parsed from data
        totalTransactions: 0,
        totalVolume: 0,
        tasksCompleted: 0,
        rewardsEarned: 0,
        contributionScore: 0,
        tier: UserTier.Bronze,
        badges: [],
        joinedAt: Date.now(),
        lastActivity: Date.now(),
        isActive: true,
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  // Get leaderboard config
  async getLeaderboardConfig(): Promise<LeaderboardConfig | null> {
    try {
      const [configPDA] = this.getConfigPDA();
      const accountInfo = await this.connection.getAccountInfo(configPDA);
      
      if (!accountInfo) {
        return null;
      }

      // Parse config data
      return {
        authority: new PublicKey('11111111111111111111111111111111'),
        totalUsers: 0,
        totalTransactions: 0,
        totalTasksCompleted: 0,
        totalRewardsDistributed: 0,
        seasonNumber: 1,
        seasonStart: Date.now(),
        seasonEnd: Date.now() + (30 * 24 * 60 * 60 * 1000),
        isPaused: false,
      };
    } catch (error) {
      console.error('Error fetching config:', error);
      return null;
    }
  }

  // Get top contributors (mock implementation - would need off-chain indexing)
  async getTopContributors(limit: number = 50): Promise<LeaderboardEntry[]> {
    try {
      // In a real implementation, this would query an off-chain index
      // or use a more efficient on-chain ranking system
      
      const mockEntries: LeaderboardEntry[] = [
        {
          rank: 1,
          userProfile: {
            owner: new PublicKey('11111111111111111111111111111111'),
            username: 'CryptoKing.sol',
            solDomain: 'cryptoking.sol',
            totalTransactions: 1250,
            totalVolume: 50000000000, // 50 SOL
            tasksCompleted: 85,
            rewardsEarned: 25000000000, // 25 SOL
            contributionScore: 15750,
            tier: UserTier.Platinum,
            badges: [BadgeType.EarlyAdopter, BadgeType.PowerUser, BadgeType.TransactionKing],
            joinedAt: Date.now() - (90 * 24 * 60 * 60 * 1000),
            lastActivity: Date.now() - (2 * 60 * 60 * 1000),
            isActive: true,
          },
          score: 15750,
          tier: UserTier.Platinum,
          badges: [BadgeType.EarlyAdopter, BadgeType.PowerUser, BadgeType.TransactionKing],
        },
        {
          rank: 2,
          userProfile: {
            owner: new PublicKey('22222222222222222222222222222222'),
            username: 'SolanaBuilder',
            totalTransactions: 980,
            totalVolume: 35000000000, // 35 SOL
            tasksCompleted: 120,
            rewardsEarned: 18000000000, // 18 SOL
            contributionScore: 12400,
            tier: UserTier.Gold,
            badges: [BadgeType.TaskMaster, BadgeType.CommunityChampion],
            joinedAt: Date.now() - (75 * 24 * 60 * 60 * 1000),
            lastActivity: Date.now() - (1 * 60 * 60 * 1000),
            isActive: true,
          },
          score: 12400,
          tier: UserTier.Gold,
          badges: [BadgeType.TaskMaster, BadgeType.CommunityChampion],
        },
        // Add more mock entries...
      ];

      return mockEntries.slice(0, limit);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }

  // Get user rank
  async getUserRank(userPublicKey: PublicKey): Promise<UserRankInfo | null> {
    try {
      const userProfile = await this.getUserProfile(userPublicKey);
      if (!userProfile) {
        return null;
      }

      // Mock rank calculation - in real implementation, this would be indexed
      return {
        userId: userPublicKey,
        contributionScore: userProfile.contributionScore,
        tier: userProfile.tier,
        totalTransactions: userProfile.totalTransactions,
        tasksCompleted: userProfile.tasksCompleted,
        rewardsEarned: userProfile.rewardsEarned,
        badgesCount: userProfile.badges.length,
        estimatedRank: Math.floor(Math.random() * 1000) + 1, // Mock rank
      };
    } catch (error) {
      console.error('Error fetching user rank:', error);
      return null;
    }
  }

  // Calculate contribution score breakdown
  calculateScoreBreakdown(userProfile: UserProfile): {
    transactionPoints: number;
    taskPoints: number;
    badgeBonus: number;
    tierMultiplier: number;
    total: number;
  } {
    const transactionPoints = userProfile.totalTransactions * 10;
    const taskPoints = userProfile.tasksCompleted * 100;
    const badgeBonus = userProfile.badges.length * 500;
    
    const tierMultipliers = {
      [UserTier.Bronze]: 1.0,
      [UserTier.Silver]: 1.2,
      [UserTier.Gold]: 1.5,
      [UserTier.Platinum]: 2.0,
    };
    
    const tierMultiplier = tierMultipliers[userProfile.tier];
    const baseScore = transactionPoints + taskPoints + badgeBonus;
    const total = Math.floor(baseScore * tierMultiplier);

    return {
      transactionPoints,
      taskPoints,
      badgeBonus,
      tierMultiplier,
      total,
    };
  }

  // Get badge requirements
  getBadgeRequirements(): Record<BadgeType, string> {
    return {
      [BadgeType.EarlyAdopter]: 'Join within first 1000 users',
      [BadgeType.PowerUser]: '50+ transactions and 10+ tasks completed',
      [BadgeType.CommunityChampion]: 'Active community participation and referrals',
      [BadgeType.TaskMaster]: 'Complete 25+ tasks',
      [BadgeType.TransactionKing]: '100+ transactions with high volume',
      [BadgeType.LoyaltyLegend]: 'Maintain active status for 6+ months',
    };
  }

  // Get achievement requirements
  getAchievementRequirements(): Record<AchievementType, string> {
    return {
      [AchievementType.Top10Overall]: 'Rank in top 10 overall contributors',
      [AchievementType.Top100Transactions]: 'Complete 100+ transactions',
      [AchievementType.TaskCompletionist]: 'Complete 50+ tasks',
      [AchievementType.VolumeLeader]: 'Process 1+ SOL in transaction volume',
      [AchievementType.SeasonWinner]: 'Achieve Platinum tier in a season',
    };
  }

  // Format contribution score for display
  formatScore(score: number): string {
    if (score >= 1000000) {
      return `${(score / 1000000).toFixed(1)}M`;
    } else if (score >= 1000) {
      return `${(score / 1000).toFixed(1)}K`;
    }
    return score.toString();
  }

  // Format SOL amount
  formatSOL(lamports: number): string {
    return `${(lamports / 1000000000).toFixed(3)} SOL`;
  }

  // Get tier color
  getTierColor(tier: UserTier): string {
    const colors = {
      [UserTier.Bronze]: '#CD7F32',
      [UserTier.Silver]: '#C0C0C0',
      [UserTier.Gold]: '#FFD700',
      [UserTier.Platinum]: '#E5E4E2',
    };
    return colors[tier];
  }

  // Get badge icon
  getBadgeIcon(badge: BadgeType): string {
    const icons = {
      [BadgeType.EarlyAdopter]: '🚀',
      [BadgeType.PowerUser]: '⚡',
      [BadgeType.CommunityChampion]: '👑',
      [BadgeType.TaskMaster]: '🎯',
      [BadgeType.TransactionKing]: '💎',
      [BadgeType.LoyaltyLegend]: '🏆',
    };
    return icons[badge];
  }
}

export default CommunityLeaderboardService;
