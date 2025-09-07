import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, web3, BN, IdlAccounts } from '@project-serum/anchor';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { snsService } from './snsService';
import toast from 'react-hot-toast';

// Types matching the Rust program
export interface UserProfile {
  authority: PublicKey;
  snsDomain: string;
  reputationScore: number;
  totalQuestsCompleted: number;
  currentStreak: number;
  longestStreak: number;
  lastActivity: number;
  level: number;
  totalXp: number;
  achievementsCount: number;
  bump: number;
}

export interface Quest {
  questId: string;
  title: string;
  description: string;
  questType: QuestType;
  category: QuestCategory;
  difficulty: QuestDifficulty;
  requirements: QuestRequirements;
  rewards: QuestRewards;
  creator: PublicKey;
  isActive: boolean;
  createdAt: number;
  expiresAt: number;
  completions: number;
  bump: number;
}

export interface UserQuest {
  user: PublicKey;
  quest: PublicKey;
  questId: string;
  status: QuestStatus;
  progress: QuestProgress;
  startedAt: number;
  completedAt?: number;
  expiresAt: number;
  bump: number;
}

export enum QuestType {
  Daily = 'Daily',
  Weekly = 'Weekly',
  Monthly = 'Monthly',
  Special = 'Special',
  Achievement = 'Achievement',
}

export enum QuestCategory {
  Payment = 'Payment',
  Task = 'Task',
  Social = 'Social',
  Streak = 'Streak',
  Milestone = 'Milestone',
}

export enum QuestDifficulty {
  Easy = 'Easy',
  Medium = 'Medium',
  Hard = 'Hard',
  Legendary = 'Legendary',
}

export enum QuestStatus {
  Active = 'Active',
  Completed = 'Completed',
  Failed = 'Failed',
  Expired = 'Expired',
}

export enum AchievementType {
  FirstPayment = 'FirstPayment',
  PaymentStreak = 'PaymentStreak',
  VolumeTrader = 'VolumeTrader',
  QuestMaster = 'QuestMaster',
  SocialButterfly = 'SocialButterfly',
  TaskCompleter = 'TaskCompleter',
  LoyalCustomer = 'LoyalCustomer',
  CommunityChampion = 'CommunityChampion',
}

export interface QuestProgress {
  paymentsMade: number;
  volumeTraded: number;
  streakDays: number;
  tasksCompleted: number;
  socialInteractions: number;
}

export interface QuestRequirements {
  type: 'PaymentCount' | 'VolumeAmount' | 'StreakDays' | 'TasksCompleted' | 'SocialInteractions';
  count?: number;
  amount?: number;
  days?: number;
}

export interface QuestRewards {
  xpReward: number;
  reputationPoints: number;
  tokenReward?: number;
  nftReward: boolean;
  badgeReward?: string;
}

class QuestRewardsService {
  private connection: Connection;
  private programId: PublicKey;

  constructor() {
    this.connection = new Connection(
      process.env.REACT_APP_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );
    this.programId = new PublicKey('QuestRewards11111111111111111111111111111111');
  }

  // Initialize user profile with SNS domain
  async initializeUserProfile(
    wallet: WalletContextState,
    snsDomain?: string
  ): Promise<{ signature: string; userProfile: PublicKey }> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }

    try {
      // Get or register SNS domain
      let domain = snsDomain;
      if (!domain) {
        domain = await snsService.reverseLookup(wallet.publicKey);
        if (!domain) {
          const username = `user${Math.floor(Math.random() * 10000)}`;
          domain = `${username}.sol`;
          await snsService.registerDomain(domain, wallet.publicKey);
        }
      }

      const [userProfilePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('user_profile'), wallet.publicKey.toBuffer()],
        this.programId
      );

      const transaction = new Transaction();
      
      // This would be the actual instruction creation using Anchor
      // For now, simulating the transaction
      const instruction = SystemProgram.createAccount({
        fromPubkey: wallet.publicKey,
        newAccountPubkey: userProfilePDA,
        lamports: await this.connection.getMinimumBalanceForRentExemption(200),
        space: 200,
        programId: this.programId,
      });

      transaction.add(instruction);

      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;

      const signedTransaction = await wallet.signTransaction(transaction);
      const signature = await this.connection.sendRawTransaction(signedTransaction.serialize());

      await this.connection.confirmTransaction(signature);

      return { signature, userProfile: userProfilePDA };
    } catch (error) {
      console.error('Failed to initialize user profile:', error);
      throw error;
    }
  }

  // Get user profile
  async getUserProfile(userPubkey: PublicKey): Promise<UserProfile | null> {
    try {
      const [userProfilePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('user_profile'), userPubkey.toBuffer()],
        this.programId
      );

      // Simulate fetching account data
      // In real implementation, this would deserialize the account data
      const mockProfile: UserProfile = {
        authority: userPubkey,
        snsDomain: await snsService.reverseLookup(userPubkey) || 'user.sol',
        reputationScore: Math.floor(Math.random() * 1000),
        totalQuestsCompleted: Math.floor(Math.random() * 50),
        currentStreak: Math.floor(Math.random() * 10),
        longestStreak: Math.floor(Math.random() * 20),
        lastActivity: Date.now() / 1000,
        level: Math.floor(Math.random() * 10) + 1,
        totalXp: Math.floor(Math.random() * 10000),
        achievementsCount: Math.floor(Math.random() * 20),
        bump: 255,
      };

      return mockProfile;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  // Create a new quest
  async createQuest(
    wallet: WalletContextState,
    questData: {
      questId: string;
      title: string;
      description: string;
      questType: QuestType;
      category: QuestCategory;
      difficulty: QuestDifficulty;
      requirements: QuestRequirements;
      rewards: QuestRewards;
      durationHours: number;
    }
  ): Promise<string> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }

    try {
      // Simulate quest creation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success(`Quest "${questData.title}" created successfully!`);
      return 'mock_signature_' + Date.now();
    } catch (error) {
      console.error('Failed to create quest:', error);
      throw error;
    }
  }

  // Start a quest
  async startQuest(
    wallet: WalletContextState,
    questId: string
  ): Promise<string> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }

    try {
      // Simulate starting quest
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast.success('Quest started successfully!');
      return 'mock_signature_' + Date.now();
    } catch (error) {
      console.error('Failed to start quest:', error);
      throw error;
    }
  }

  // Update quest progress
  async updateQuestProgress(
    wallet: WalletContextState,
    questId: string,
    progress: QuestProgress
  ): Promise<string> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }

    try {
      // Simulate progress update
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return 'mock_signature_' + Date.now();
    } catch (error) {
      console.error('Failed to update quest progress:', error);
      throw error;
    }
  }

  // Update user streak
  async updateStreak(wallet: WalletContextState): Promise<string> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }

    try {
      // Simulate streak update
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return 'mock_signature_' + Date.now();
    } catch (error) {
      console.error('Failed to update streak:', error);
      throw error;
    }
  }

  // Mint compressed achievement NFT
  async mintAchievementNFT(
    wallet: WalletContextState,
    achievementType: AchievementType,
    metadataUri: string
  ): Promise<string> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }

    try {
      // Simulate NFT minting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const domain = await snsService.reverseLookup(wallet.publicKey) || 'user.sol';
      toast.success(`${achievementType} achievement NFT minted to ${domain}!`);
      
      return 'mock_signature_' + Date.now();
    } catch (error) {
      console.error('Failed to mint achievement NFT:', error);
      throw error;
    }
  }

  // Get available quests
  async getAvailableQuests(): Promise<Quest[]> {
    try {
      // Mock quest data
      const mockQuests: Quest[] = [
        {
          questId: 'daily_payment_1',
          title: 'Daily Spender',
          description: 'Make 3 payments today',
          questType: QuestType.Daily,
          category: QuestCategory.Payment,
          difficulty: QuestDifficulty.Easy,
          requirements: { type: 'PaymentCount', count: 3 },
          rewards: { xpReward: 100, reputationPoints: 50, nftReward: false },
          creator: new PublicKey('11111111111111111111111111111111'),
          isActive: true,
          createdAt: Date.now() / 1000,
          expiresAt: (Date.now() / 1000) + 86400, // 24 hours
          completions: 0,
          bump: 255,
        },
        {
          questId: 'weekly_streak_1',
          title: 'Streak Master',
          description: 'Maintain a 7-day activity streak',
          questType: QuestType.Weekly,
          category: QuestCategory.Streak,
          difficulty: QuestDifficulty.Medium,
          requirements: { type: 'StreakDays', days: 7 },
          rewards: { xpReward: 500, reputationPoints: 200, nftReward: true },
          creator: new PublicKey('11111111111111111111111111111111'),
          isActive: true,
          createdAt: Date.now() / 1000,
          expiresAt: (Date.now() / 1000) + 604800, // 7 days
          completions: 0,
          bump: 255,
        },
        {
          questId: 'volume_trader_1',
          title: 'Volume Trader',
          description: 'Trade $1000 worth of tokens',
          questType: QuestType.Achievement,
          category: QuestCategory.Milestone,
          difficulty: QuestDifficulty.Hard,
          requirements: { type: 'VolumeAmount', amount: 1000 },
          rewards: { xpReward: 1000, reputationPoints: 500, nftReward: true, badgeReward: 'Volume Trader' },
          creator: new PublicKey('11111111111111111111111111111111'),
          isActive: true,
          createdAt: Date.now() / 1000,
          expiresAt: (Date.now() / 1000) + 2592000, // 30 days
          completions: 0,
          bump: 255,
        },
      ];

      return mockQuests;
    } catch (error) {
      console.error('Failed to get available quests:', error);
      return [];
    }
  }

  // Get user's active quests
  async getUserQuests(userPubkey: PublicKey): Promise<UserQuest[]> {
    try {
      // Mock user quest data
      const mockUserQuests: UserQuest[] = [
        {
          user: userPubkey,
          quest: new PublicKey('11111111111111111111111111111111'),
          questId: 'daily_payment_1',
          status: QuestStatus.Active,
          progress: {
            paymentsMade: 1,
            volumeTraded: 0,
            streakDays: 0,
            tasksCompleted: 0,
            socialInteractions: 0,
          },
          startedAt: Date.now() / 1000,
          expiresAt: (Date.now() / 1000) + 86400,
          bump: 255,
        },
      ];

      return mockUserQuests;
    } catch (error) {
      console.error('Failed to get user quests:', error);
      return [];
    }
  }

  // Get user reputation score
  async getUserReputation(userPubkey: PublicKey): Promise<number> {
    try {
      const profile = await this.getUserProfile(userPubkey);
      return profile?.reputationScore || 0;
    } catch (error) {
      console.error('Failed to get user reputation:', error);
      return 0;
    }
  }

  // Auto-track payment activity for quest progress
  async trackPaymentActivity(
    wallet: WalletContextState,
    amount: number
  ): Promise<void> {
    if (!wallet.publicKey) return;

    try {
      // Update streak
      await this.updateStreak(wallet);

      // Get active quests and update progress
      const userQuests = await this.getUserQuests(wallet.publicKey);
      
      for (const userQuest of userQuests) {
        if (userQuest.status === QuestStatus.Active) {
          const newProgress = { ...userQuest.progress };
          newProgress.paymentsMade += 1;
          newProgress.volumeTraded += amount;

          await this.updateQuestProgress(wallet, userQuest.questId, newProgress);
        }
      }

      // Check for achievement triggers
      const profile = await this.getUserProfile(wallet.publicKey);
      if (profile) {
        // First payment achievement
        if (profile.totalQuestsCompleted === 0) {
          await this.mintAchievementNFT(
            wallet,
            AchievementType.FirstPayment,
            'https://example.com/metadata/first-payment.json'
          );
        }

        // Volume trader achievement
        if (amount >= 1000) {
          await this.mintAchievementNFT(
            wallet,
            AchievementType.VolumeTrader,
            'https://example.com/metadata/volume-trader.json'
          );
        }
      }
    } catch (error) {
      console.error('Failed to track payment activity:', error);
    }
  }

  // Auto-track task completion for quest progress
  async trackTaskCompletion(wallet: WalletContextState): Promise<void> {
    if (!wallet.publicKey) return;

    try {
      // Update streak
      await this.updateStreak(wallet);

      // Get active quests and update progress
      const userQuests = await this.getUserQuests(wallet.publicKey);
      
      for (const userQuest of userQuests) {
        if (userQuest.status === QuestStatus.Active) {
          const newProgress = { ...userQuest.progress };
          newProgress.tasksCompleted += 1;

          await this.updateQuestProgress(wallet, userQuest.questId, newProgress);
        }
      }

      // Task completer achievement
      await this.mintAchievementNFT(
        wallet,
        AchievementType.TaskCompleter,
        'https://example.com/metadata/task-completer.json'
      );
    } catch (error) {
      console.error('Failed to track task completion:', error);
    }
  }

  // Get leaderboard data
  async getLeaderboard(limit: number = 10): Promise<Array<{
    user: PublicKey;
    snsDomain: string;
    reputationScore: number;
    level: number;
    totalXp: number;
  }>> {
    try {
      // Mock leaderboard data
      const mockLeaderboard = Array.from({ length: limit }, (_, i) => ({
        user: new PublicKey('11111111111111111111111111111111'),
        snsDomain: `user${i + 1}.sol`,
        reputationScore: Math.floor(Math.random() * 5000) + 1000,
        level: Math.floor(Math.random() * 20) + 1,
        totalXp: Math.floor(Math.random() * 50000) + 5000,
      }));

      return mockLeaderboard.sort((a, b) => b.reputationScore - a.reputationScore);
    } catch (error) {
      console.error('Failed to get leaderboard:', error);
      return [];
    }
  }
}

export const questRewardsService = new QuestRewardsService();
