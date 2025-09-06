import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { useSBT } from '../../contexts/SBTContext';
import { useDID } from '../../contexts/DIDContext';
import { useWallet } from '../../contexts/WalletContext';
import { 
  Trophy, 
  Star, 
  Target, 
  Flame, 
  Award, 
  TrendingUp,
  Calendar,
  Zap,
  Gift,
  Crown,
  Medal,
  Sparkles
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AchievementCardProps {
  token: any;
  index: number;
}

const AchievementCard: React.FC<AchievementCardProps> = ({ token, index }) => {
  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'common': return 'bg-gray-500';
      case 'rare': return 'bg-blue-500';
      case 'epic': return 'bg-purple-500';
      case 'legendary': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getAchievementIcon = (type: string) => {
    switch (type) {
      case 'payment_milestone': return <Target className="h-5 w-5" />;
      case 'activity_streak': return <Flame className="h-5 w-5" />;
      case 'loyalty_tier': return <Crown className="h-5 w-5" />;
      case 'special_event': return <Sparkles className="h-5 w-5" />;
      default: return <Award className="h-5 w-5" />;
    }
  };

  const rarity = token.metadata.attributes.find((attr: any) => attr.trait_type === 'Rarity')?.value || 'Common';

  return (
    <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
      <div className={`absolute top-0 right-0 w-16 h-16 ${getRarityColor(rarity)} opacity-10 rounded-bl-full`} />
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            {getAchievementIcon(token.metadata.achievement_type)}
            <div>
              <CardTitle className="text-lg">{token.metadata.name}</CardTitle>
              <CardDescription className="text-sm">
                {token.metadata.description}
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className={`${getRarityColor(rarity)} text-white`}>
            {rarity}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Earned</span>
            <span className="font-medium">
              {new Date(token.metadata.earned_date).toLocaleDateString()}
            </span>
          </div>
          
          {token.metadata.milestone_value && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Milestone</span>
              <span className="font-medium">{token.metadata.milestone_value} payments</span>
            </div>
          )}
          
          {token.metadata.streak_days && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Streak</span>
              <span className="font-medium">{token.metadata.streak_days} days</span>
            </div>
          )}
          
          <div className="pt-2 border-t">
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <Medal className="h-3 w-3" />
              <span>Token #{token.tokenId}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const LoyaltyDashboard: React.FC = () => {
  const { isConnected } = useWallet();
  const { getReputationScore } = useDID();
  const {
    userTokens,
    totalTokens,
    userProgress,
    paymentMilestones,
    activityStreaks,
    getTokensByType,
    getNextMilestone,
    checkAndMintMilestones,
    checkAndMintStreaks,
    loading
  } = useSBT();

  const [selectedTab, setSelectedTab] = useState<'overview' | 'achievements' | 'progress' | 'leaderboard'>('overview');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  // Load leaderboard data
  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const response = await fetch('/api/sbt/leaderboard?type=tokens&limit=10');
        if (response.ok) {
          const data = await response.json();
          setLeaderboard(data.leaderboard || []);
        }
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
      }
    };

    if (selectedTab === 'leaderboard') {
      loadLeaderboard();
    }
  }, [selectedTab]);

  const handleRefreshAchievements = async () => {
    try {
      await checkAndMintMilestones();
      await checkAndMintStreaks();
      toast.success('Achievements refreshed!');
    } catch (err) {
      toast.error('Failed to refresh achievements');
    }
  };

  const nextMilestone = getNextMilestone();
  const milestoneProgress = nextMilestone 
    ? (userProgress.totalPayments / nextMilestone.requiredAmount) * 100 
    : 100;

  const paymentTokens = getTokensByType('payment_milestone');
  const streakTokens = getTokensByType('activity_streak');
  const loyaltyTokens = getTokensByType('loyalty_tier');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'achievements', label: 'Achievements', icon: <Trophy className="h-4 w-4" /> },
    { id: 'progress', label: 'Progress', icon: <Target className="h-4 w-4" /> },
    { id: 'leaderboard', label: 'Leaderboard', icon: <Crown className="h-4 w-4" /> }
  ];

  if (!isConnected) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12">
            <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
            <p className="text-gray-600">
              Connect your wallet to view your loyalty achievements and progress
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Loyalty Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Track your achievements, streaks, and reputation on VPay
          </p>
        </div>
        <Button onClick={handleRefreshAchievements} disabled={loading}>
          <Zap className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Trophy className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-600">Total Achievements</p>
                <p className="text-2xl font-bold">{totalTokens}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Total Payments</p>
                <p className="text-2xl font-bold">{userProgress.totalPayments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Flame className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-gray-600">Best Streak</p>
                <p className="text-2xl font-bold">
                  {Math.max(
                    userProgress.currentLoginStreak,
                    userProgress.currentPaymentStreak,
                    userProgress.currentTaskStreak
                  )} days
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Star className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Reputation</p>
                <p className="text-2xl font-bold">{getReputationScore()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`
                flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm
                ${selectedTab === tab.id
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          {/* Next Milestone */}
          {nextMilestone && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Next Milestone</span>
                </CardTitle>
                <CardDescription>{nextMilestone.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{nextMilestone.name}</span>
                    <span className="text-sm text-gray-600">
                      {userProgress.totalPayments} / {nextMilestone.requiredAmount}
                    </span>
                  </div>
                  <Progress value={milestoneProgress} className="w-full" />
                  <p className="text-sm text-gray-600">
                    {nextMilestone.requiredAmount - userProgress.totalPayments} more payments to unlock
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active Streaks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Flame className="h-5 w-5" />
                <span>Current Streaks</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Calendar className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-600">{userProgress.currentLoginStreak}</p>
                  <p className="text-sm text-gray-600">Login Streak</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Target className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">{userProgress.currentPaymentStreak}</p>
                  <p className="text-sm text-gray-600">Payment Streak</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Award className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-purple-600">{userProgress.currentTaskStreak}</p>
                  <p className="text-sm text-gray-600">Task Streak</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Achievements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="h-5 w-5" />
                <span>Recent Achievements</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userTokens.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userTokens.slice(0, 6).map((token, index) => (
                    <AchievementCard key={token.tokenId} token={token} index={index} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No achievements yet. Start making payments to earn your first SBT!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {selectedTab === 'achievements' && (
        <div className="space-y-6">
          {/* Achievement Categories */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  <span>Payment Milestones</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{paymentTokens.length}</p>
                <p className="text-sm text-gray-600">Achievements earned</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  <span>Activity Streaks</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{streakTokens.length}</p>
                <p className="text-sm text-gray-600">Achievements earned</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  <span>Loyalty Tiers</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{loyaltyTokens.length}</p>
                <p className="text-sm text-gray-600">Achievements earned</p>
              </CardContent>
            </Card>
          </div>

          {/* All Achievements */}
          <Card>
            <CardHeader>
              <CardTitle>All Achievements</CardTitle>
              <CardDescription>
                Your complete collection of Soulbound Tokens
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userTokens.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userTokens.map((token, index) => (
                    <AchievementCard key={token.tokenId} token={token} index={index} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Achievements Yet</h3>
                  <p className="text-gray-600">
                    Complete your first payment or maintain a streak to earn your first SBT!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {selectedTab === 'progress' && (
        <div className="space-y-6">
          {/* Milestone Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Milestones</CardTitle>
              <CardDescription>
                Track your progress towards payment achievement milestones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {paymentMilestones.map((milestone) => {
                  const isCompleted = userProgress.achievements.includes(milestone.id);
                  const progress = Math.min((userProgress.totalPayments / milestone.requiredAmount) * 100, 100);
                  
                  return (
                    <div key={milestone.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {isCompleted ? (
                            <Trophy className="h-5 w-5 text-yellow-500" />
                          ) : (
                            <Target className="h-5 w-5 text-gray-400" />
                          )}
                          <span className="font-medium">{milestone.name}</span>
                          {isCompleted && (
                            <Badge variant="default" className="bg-green-500">Completed</Badge>
                          )}
                        </div>
                        <span className="text-sm text-gray-600">
                          {userProgress.totalPayments} / {milestone.requiredAmount}
                        </span>
                      </div>
                      <Progress value={progress} className="w-full" />
                      <p className="text-sm text-gray-600">{milestone.description}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Streak Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Streaks</CardTitle>
              <CardDescription>
                Monitor your activity streaks and upcoming achievements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {activityStreaks.map((streak) => {
                  const isCompleted = userProgress.achievements.includes(streak.id);
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
                  
                  const progress = Math.min((currentStreak / streak.requiredDays) * 100, 100);
                  
                  return (
                    <div key={streak.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {isCompleted ? (
                            <Flame className="h-5 w-5 text-orange-500" />
                          ) : (
                            <Calendar className="h-5 w-5 text-gray-400" />
                          )}
                          <span className="font-medium">{streak.name}</span>
                          {isCompleted && (
                            <Badge variant="default" className="bg-orange-500">Completed</Badge>
                          )}
                        </div>
                        <span className="text-sm text-gray-600">
                          {currentStreak} / {streak.requiredDays} days
                        </span>
                      </div>
                      <Progress value={progress} className="w-full" />
                      <p className="text-sm text-gray-600">{streak.description}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedTab === 'leaderboard' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Crown className="h-5 w-5" />
              <span>Achievement Leaderboard</span>
            </CardTitle>
            <CardDescription>
              Top users by total achievements earned
            </CardDescription>
          </CardHeader>
          <CardContent>
            {leaderboard.length > 0 ? (
              <div className="space-y-3">
                {leaderboard.map((entry, index) => (
                  <div
                    key={entry.address}
                    className={`
                      flex items-center justify-between p-4 rounded-lg
                      ${index < 3 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200' : 'bg-gray-50'}
                    `}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                        ${index === 0 ? 'bg-yellow-500 text-white' :
                          index === 1 ? 'bg-gray-400 text-white' :
                          index === 2 ? 'bg-orange-600 text-white' :
                          'bg-gray-200 text-gray-600'}
                      `}>
                        {entry.rank}
                      </div>
                      <div>
                        <p className="font-medium">
                          {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {entry.totalPayments} payments • Max streak: {entry.maxStreak} days
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">{entry.tokens}</p>
                      <p className="text-sm text-gray-600">achievements</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Crown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No leaderboard data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
