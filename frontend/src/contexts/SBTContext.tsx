import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { useDID } from './DIDContext';
import { toast } from 'react-hot-toast';

interface SBTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  achievement_type: 'payment_milestone' | 'activity_streak' | 'loyalty_tier' | 'special_event';
  earned_date: string;
  milestone_value?: number;
  streak_days?: number;
}

interface SoulboundToken {
  tokenId: number;
  owner: string;
  metadata: SBTMetadata;
  mintedAt: string;
  achievementId: string;
}

interface PaymentMilestone {
  id: string;
  name: string;
  description: string;
  requiredAmount: number;
  tokenReward: SBTMetadata;
  isActive: boolean;
}

interface ActivityStreak {
  id: string;
  name: string;
  description: string;
  requiredDays: number;
  activityType: 'login' | 'payment' | 'task_completion' | 'social_interaction';
  tokenReward: SBTMetadata;
  isActive: boolean;
}

interface UserProgress {
  totalPayments: number;
  totalAmount: number;
  currentLoginStreak: number;
  currentPaymentStreak: number;
  currentTaskStreak: number;
  lastActivity: string;
  achievements: string[];
}

interface SBTContextType {
  // SBT Management
  userTokens: SoulboundToken[];
  totalTokens: number;
  
  // Milestones & Streaks
  paymentMilestones: PaymentMilestone[];
  activityStreaks: ActivityStreak[];
  userProgress: UserProgress;
  
  // Actions
  checkAndMintMilestones: () => Promise<void>;
  checkAndMintStreaks: () => Promise<void>;
  mintAchievementSBT: (achievementId: string, metadata: SBTMetadata) => Promise<string | null>;
  
  // Progress Tracking
  recordPayment: (amount: number) => Promise<void>;
  recordActivity: (activityType: string) => Promise<void>;
  updateUserProgress: () => Promise<void>;
  
  // Queries
  getTokensByType: (type: string) => SoulboundToken[];
  getNextMilestone: () => PaymentMilestone | null;
  getActiveStreaks: () => ActivityStreak[];
  
  // Utils
  loading: boolean;
  error: string | null;
}

const SBTContext = createContext<SBTContextType | undefined>(undefined);

// SBT Contract ABI (simplified)
const SBT_ABI = [
  'function mint(address to, string memory tokenURI, string memory achievementId) external returns (uint256)',
  'function tokenURI(uint256 tokenId) external view returns (string)',
  'function balanceOf(address owner) external view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)',
  'function getTokensByOwner(address owner) external view returns (uint256[])',
  'function getAchievementId(uint256 tokenId) external view returns (string)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
];

const SBT_CONTRACT_ADDRESS = import.meta.env.VITE_SBT_CONTRACT_ADDRESS || '';

interface SBTProviderProps {
  children: ReactNode;
}

export const SBTProvider: React.FC<SBTProviderProps> = ({ children }) => {
  const { address, isConnected } = useAccount();
  const { did, isDidCreated } = useDID();

  const [userTokens, setUserTokens] = useState<SoulboundToken[]>([]);
  const [totalTokens, setTotalTokens] = useState(0);
  const [userProgress, setUserProgress] = useState<UserProgress>({
    totalPayments: 0,
    totalAmount: 0,
    currentLoginStreak: 0,
    currentPaymentStreak: 0,
    currentTaskStreak: 0,
    lastActivity: '',
    achievements: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Predefined milestones and streaks
  const paymentMilestones: PaymentMilestone[] = [
    {
      id: 'first_payment',
      name: 'First Payment',
      description: 'Complete your first payment on SolanaPay',
      requiredAmount: 1,
      tokenReward: {
        name: 'SolanaPay Pioneer',
        description: 'Congratulations on your first SolanaPay payment!',
        image: 'https://api.SolanaPay.com/sbt/images/first_payment.png',
        attributes: [
          { trait_type: 'Achievement Type', value: 'First Payment' },
          { trait_type: 'Rarity', value: 'Common' },
          { trait_type: 'Category', value: 'Milestone' }
        ],
        achievement_type: 'payment_milestone',
        earned_date: '',
        milestone_value: 1
      },
      isActive: true
    },
    {
      id: 'payment_100',
      name: 'Century Club',
      description: 'Complete 100 payments on SolanaPay',
      requiredAmount: 100,
      tokenReward: {
        name: 'SolanaPay Century',
        description: 'You have completed 100 payments on SolanaPay!',
        image: 'https://api.SolanaPay.com/sbt/images/century.png',
        attributes: [
          { trait_type: 'Achievement Type', value: 'Payment Milestone' },
          { trait_type: 'Rarity', value: 'Rare' },
          { trait_type: 'Payments', value: 100 }
        ],
        achievement_type: 'payment_milestone',
        earned_date: '',
        milestone_value: 100
      },
      isActive: true
    },
    {
      id: 'payment_1000',
      name: 'Payment Master',
      description: 'Complete 1000 payments on SolanaPay',
      requiredAmount: 1000,
      tokenReward: {
        name: 'SolanaPay Master',
        description: 'Elite status: 1000 payments completed!',
        image: 'https://api.SolanaPay.com/sbt/images/master.png',
        attributes: [
          { trait_type: 'Achievement Type', value: 'Payment Milestone' },
          { trait_type: 'Rarity', value: 'Legendary' },
          { trait_type: 'Payments', value: 1000 }
        ],
        achievement_type: 'payment_milestone',
        earned_date: '',
        milestone_value: 1000
      },
      isActive: true
    }
  ];

  const activityStreaks: ActivityStreak[] = [
    {
      id: 'login_7',
      name: 'Week Warrior',
      description: 'Login for 7 consecutive days',
      requiredDays: 7,
      activityType: 'login',
      tokenReward: {
        name: 'Week Warrior',
        description: 'Consistent engagement for 7 days straight!',
        image: 'https://api.SolanaPay.com/sbt/images/week_warrior.png',
        attributes: [
          { trait_type: 'Achievement Type', value: 'Login Streak' },
          { trait_type: 'Rarity', value: 'Common' },
          { trait_type: 'Streak Days', value: 7 }
        ],
        achievement_type: 'activity_streak',
        earned_date: '',
        streak_days: 7
      },
      isActive: true
    },
    {
      id: 'login_30',
      name: 'Monthly Champion',
      description: 'Login for 30 consecutive days',
      requiredDays: 30,
      activityType: 'login',
      tokenReward: {
        name: 'Monthly Champion',
        description: 'Incredible dedication: 30 days of continuous engagement!',
        image: 'https://api.SolanaPay.com/sbt/images/monthly_champion.png',
        attributes: [
          { trait_type: 'Achievement Type', value: 'Login Streak' },
          { trait_type: 'Rarity', value: 'Epic' },
          { trait_type: 'Streak Days', value: 30 }
        ],
        achievement_type: 'activity_streak',
        earned_date: '',
        streak_days: 30
      },
      isActive: true
    },
    {
      id: 'payment_streak_10',
      name: 'Payment Streak Pro',
      description: 'Make payments for 10 consecutive days',
      requiredDays: 10,
      activityType: 'payment',
      tokenReward: {
        name: 'Payment Streak Pro',
        description: 'Consistent payment activity for 10 days!',
        image: 'https://api.SolanaPay.com/sbt/images/payment_streak.png',
        attributes: [
          { trait_type: 'Achievement Type', value: 'Payment Streak' },
          { trait_type: 'Rarity', value: 'Rare' },
          { trait_type: 'Streak Days', value: 10 }
        ],
        achievement_type: 'activity_streak',
        earned_date: '',
        streak_days: 10
      },
      isActive: true
    }
  ];

  // Contract read hooks
  const { data: tokenBalance } = useReadContract({
    address: SBT_CONTRACT_ADDRESS as `0x${string}`,
    abi: SBT_ABI,
    functionName: 'balanceOf',
    args: [address],
    query: {
      enabled: !!address && !!SBT_CONTRACT_ADDRESS
    }
  });

  // Contract write hook
  const { writeContractAsync: mintSBT } = useWriteContract();

  // Load user tokens and progress
  useEffect(() => {
    if (isConnected && address && isDidCreated) {
      loadUserTokens();
      loadUserProgress();
    }
  }, [isConnected, address, isDidCreated]);

  // Load user's SBT tokens
  const loadUserTokens = async () => {
    if (!address) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/sbt/tokens/${address}`);
      if (response.ok) {
        const data = await response.json();
        setUserTokens(data.tokens || []);
        setTotalTokens(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to load user tokens:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load user progress
  const loadUserProgress = async () => {
    if (!address) return;

    try {
      const response = await fetch(`/api/sbt/progress/${address}`);
      if (response.ok) {
        const data = await response.json();
        setUserProgress(data.progress || userProgress);
      }
    } catch (err) {
      console.error('Failed to load user progress:', err);
    }
  };

  // Update user progress
  const updateUserProgress = async (): Promise<void> => {
    if (!address) return;

    try {
      const response = await fetch('/api/sbt/progress/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address })
      });

      if (response.ok) {
        const data = await response.json();
        setUserProgress(data.progress);
      }
    } catch (err) {
      console.error('Failed to update user progress:', err);
    }
  };

  // Record payment activity
  const recordPayment = async (amount: number): Promise<void> => {
    if (!address) return;

    try {
      await fetch('/api/sbt/activity/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address, amount })
      });

      // Update progress and check for new achievements
      await updateUserProgress();
      await checkAndMintMilestones();
      await checkAndMintStreaks();
    } catch (err) {
      console.error('Failed to record payment:', err);
    }
  };

  // Record general activity
  const recordActivity = async (activityType: string): Promise<void> => {
    if (!address) return;

    try {
      await fetch('/api/sbt/activity/record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address, activityType })
      });

      // Update progress and check for streaks
      await updateUserProgress();
      await checkAndMintStreaks();
    } catch (err) {
      console.error('Failed to record activity:', err);
    }
  };

  // Check and mint milestone achievements
  const checkAndMintMilestones = async (): Promise<void> => {
    if (!address) return;

    for (const milestone of paymentMilestones) {
      if (milestone.isActive && 
          userProgress.totalPayments >= milestone.requiredAmount &&
          !userProgress.achievements.includes(milestone.id)) {
        
        const metadata = {
          ...milestone.tokenReward,
          earned_date: new Date().toISOString()
        };

        const tokenId = await mintAchievementSBT(milestone.id, metadata);
        if (tokenId) {
          toast.success(`🏆 Achievement unlocked: ${milestone.name}!`);
        }
      }
    }
  };

  // Check and mint streak achievements
  const checkAndMintStreaks = async (): Promise<void> => {
    if (!address) return;

    for (const streak of activityStreaks) {
      if (!streak.isActive || userProgress.achievements.includes(streak.id)) {
        continue;
      }

      let currentStreak = 0;
      switch (streak.activityType) {
        case 'login':
          currentStreak = userProgress.currentLoginStreak;
          break;
        case 'payment':
          currentStreak = userProgress.currentPaymentStreak;
          break;
        case 'task_completion':
          currentStreak = userProgress.currentTaskStreak;
          break;
      }

      if (currentStreak >= streak.requiredDays) {
        const metadata = {
          ...streak.tokenReward,
          earned_date: new Date().toISOString()
        };

        const tokenId = await mintAchievementSBT(streak.id, metadata);
        if (tokenId) {
          toast.success(`🔥 Streak achievement: ${streak.name}!`);
        }
      }
    }
  };

  // Mint achievement SBT
  const mintAchievementSBT = async (achievementId: string, metadata: SBTMetadata): Promise<string | null> => {
    if (!address || !mintSBT) return null;

    try {
      setLoading(true);

      // Upload metadata to IPFS or backend
      const metadataResponse = await fetch('/api/sbt/metadata/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ metadata })
      });

      if (!metadataResponse.ok) {
        throw new Error('Failed to upload metadata');
      }

      const { tokenURI } = await metadataResponse.json();

      // Mint the SBT
      const txHash = await mintSBT({
        address: SBT_CONTRACT_ADDRESS as `0x${string}`,
        abi: SBT_ABI,
        functionName: 'mint',
        args: [address, tokenURI, achievementId]
      });

      // For now, we'll return the transaction hash as the token ID
      // In a production environment, you'd want to wait for the transaction
      // and extract the actual token ID from the transaction receipt
      
      // Update local state
      await loadUserTokens();
      await updateUserProgress();

      return txHash;
    } catch (err) {
      console.error('Failed to mint SBT:', err);
      setError('Failed to mint achievement token');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Get tokens by achievement type
  const getTokensByType = (type: string): SoulboundToken[] => {
    return userTokens.filter(token => token.metadata.achievement_type === type);
  };

  // Get next milestone
  const getNextMilestone = (): PaymentMilestone | null => {
    const unearned = paymentMilestones.filter(m => 
      m.isActive && 
      userProgress.totalPayments < m.requiredAmount &&
      !userProgress.achievements.includes(m.id)
    );
    
    return unearned.length > 0 ? unearned[0] : null;
  };

  // Get active streaks
  const getActiveStreaks = (): ActivityStreak[] => {
    return activityStreaks.filter(s => s.isActive);
  };

  const value: SBTContextType = {
    // SBT Management
    userTokens,
    totalTokens,
    
    // Milestones & Streaks
    paymentMilestones,
    activityStreaks,
    userProgress,
    
    // Actions
    checkAndMintMilestones,
    checkAndMintStreaks,
    mintAchievementSBT,
    
    // Progress Tracking
    recordPayment,
    recordActivity,
    updateUserProgress,
    
    // Queries
    getTokensByType,
    getNextMilestone,
    getActiveStreaks,
    
    // Utils
    loading,
    error
  };

  return (
    <SBTContext.Provider value={value}>
      {children}
    </SBTContext.Provider>
  );
};

export const useSBT = (): SBTContextType => {
  const context = useContext(SBTContext);
  if (context === undefined) {
    throw new Error('useSBT must be used within an SBTProvider');
  }
  return context;
};
