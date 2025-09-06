import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Trophy, 
  Star, 
  Target, 
  Flame, 
  Crown, 
  TrendingUp, 
  Gift,
  Award,
  Gem
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import QuestDashboard from './QuestDashboard';
import StreakTracker from './StreakTracker';
import LeaderboardDashboard from './LeaderboardDashboard';
import NFTBadgeCollection from './NFTBadgeCollection';

interface UserLevel {
  level: number;
  xp: number;
  xpToNext: number;
  totalXp: number;
  prestige: number;
}

interface GamificationStats {
  userLevel: UserLevel;
  totalPoints: number;
  activeQuests: number;
  completedQuests: number;
  activeStreaks: number;
  longestStreak: number;
  totalBadges: number;
  mintedNFTs: number;
  globalRank: number;
  weeklyRank: number;
}

const GamifiedLoyaltyDashboard: React.FC = () => {
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [progressData, setProgressData] = useState<any[]>([]);

  useEffect(() => {
    fetchGamificationStats();
    fetchProgressData();
  }, []);

  const fetchGamificationStats = async () => {
    try {
      // This would be a combined API call to get all gamification stats
      const [levelRes, questsRes, streaksRes, badgesRes, leaderboardRes] = await Promise.all([
        fetch('/api/user/level', { headers: { 'Authorization': `Bearer ${localStorage.getItem('vpay-token')}` } }),
        fetch('/api/quests', { headers: { 'Authorization': `Bearer ${localStorage.getItem('vpay-token')}` } }),
        fetch('/api/streaks', { headers: { 'Authorization': `Bearer ${localStorage.getItem('vpay-token')}` } }),
        fetch('/api/nft-badges/user/current-user/stats', { headers: { 'Authorization': `Bearer ${localStorage.getItem('vpay-token')}` } }),
        fetch('/api/leaderboards/global/points/rank/current-user', { headers: { 'Authorization': `Bearer ${localStorage.getItem('vpay-token')}` } })
      ]);

      // Parse real API responses
      const [levelData, questsData, streaksData, badgesData, leaderboardData] = await Promise.all([
        levelRes.json(),
        questsRes.json(),
        streaksRes.json(),
        badgesRes.json(),
        leaderboardRes.json()
      ]);

      setStats({
        userLevel: levelData.data || {
          level: 1,
          xp: 0,
          xpToNext: 1000,
          totalXp: 0,
          prestige: 0
        },
        totalPoints: questsData.totalPoints || 0,
        activeQuests: questsData.activeQuests || 0,
        completedQuests: questsData.completedQuests || 0,
        activeStreaks: streaksData.activeStreaks || 0,
        longestStreak: streaksData.longestStreak || 0,
        totalBadges: badgesData.totalBadges || 0,
        mintedNFTs: badgesData.mintedNFTs || 0,
        globalRank: leaderboardData.globalRank || 0,
        weeklyRank: leaderboardData.weeklyRank || 0
      });
    } catch (error) {
      console.error('Error fetching gamification stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProgressData = async () => {
    try {
      const response = await fetch('/api/user/progress/weekly', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('vpay-token')}` }
      });
      const data = await response.json();
      setProgressData(data.data || []);
    } catch (error) {
      console.error('Error fetching progress data:', error);
      setProgressData([]);
    }
  };

  const getLevelProgress = () => {
    if (!stats) return 0;
    return (stats.userLevel.xp / stats.userLevel.xpToNext) * 100;
  };

  const getNextLevelRewards = () => {
    if (!stats) return [];
    const level = stats.userLevel.level + 1;
    return [
      { type: 'points', amount: level * 100 },
      { type: 'badge', name: `Level ${level} Master` },
      { type: 'multiplier', amount: 1.1 }
    ];
  };

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Level Progress Card */}
      <Card className="bg-gradient-to-r from-purple-500 to-blue-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Level {stats?.userLevel.level}</h2>
              <p className="opacity-90">VPay Champion</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{stats?.userLevel.xp.toLocaleString()}</div>
              <div className="text-sm opacity-90">/ {stats?.userLevel.xpToNext.toLocaleString()} XP</div>
            </div>
          </div>
          <Progress value={getLevelProgress()} className="h-3 bg-white/20" />
          <div className="mt-2 text-sm opacity-90">
            {stats?.userLevel.xpToNext && stats?.userLevel.xp ? 
              `${(stats.userLevel.xpToNext - stats.userLevel.xp).toLocaleString()} XP to next level` : 
              'Loading...'
            }
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Points</p>
                <p className="text-2xl font-bold text-purple-600">{stats?.totalPoints.toLocaleString()}</p>
              </div>
              <Star className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Global Rank</p>
                <p className="text-2xl font-bold text-blue-600">#{stats?.globalRank}</p>
              </div>
              <Trophy className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Streaks</p>
                <p className="text-2xl font-bold text-orange-600">{stats?.activeStreaks}</p>
              </div>
              <Flame className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">NFT Badges</p>
                <p className="text-2xl font-bold text-green-600">{stats?.mintedNFTs}</p>
              </div>
              <Gem className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="xp" stroke="#8b5cf6" strokeWidth={2} />
                <Line type="monotone" dataKey="points" stroke="#06b6d4" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quest Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="quests" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Next Level Rewards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Next Level Rewards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {getNextLevelRewards().map((reward, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  {reward.type === 'points' && <Star className="h-5 w-5 text-purple-600" />}
                  {reward.type === 'badge' && <Award className="h-5 w-5 text-purple-600" />}
                  {reward.type === 'multiplier' && <TrendingUp className="h-5 w-5 text-purple-600" />}
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {reward.type === 'points' && `${reward.amount} Points`}
                    {reward.type === 'badge' && reward.name}
                    {reward.type === 'multiplier' && `${reward.amount}x Multiplier`}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{reward.type} Reward</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2"
              onClick={() => setActiveTab('quests')}
            >
              <Target className="h-6 w-6" />
              <span className="text-sm">View Quests</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2"
              onClick={() => setActiveTab('streaks')}
            >
              <Flame className="h-6 w-6" />
              <span className="text-sm">Track Streaks</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2"
              onClick={() => setActiveTab('leaderboards')}
            >
              <Trophy className="h-6 w-6" />
              <span className="text-sm">Leaderboards</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2"
              onClick={() => setActiveTab('badges')}
            >
              <Crown className="h-6 w-6" />
              <span className="text-sm">NFT Badges</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-32"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gamified Loyalty</h1>
          <p className="text-gray-600">Level up, complete quests, and earn exclusive NFT badges</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-sm">
            <Crown className="h-4 w-4 mr-1" />
            Level {stats?.userLevel.level}
          </Badge>
          <Badge variant="outline" className="text-sm">
            <Star className="h-4 w-4 mr-1" />
            {stats?.totalPoints.toLocaleString()} Points
          </Badge>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="quests" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Quests
          </TabsTrigger>
          <TabsTrigger value="streaks" className="flex items-center gap-2">
            <Flame className="h-4 w-4" />
            Streaks
          </TabsTrigger>
          <TabsTrigger value="leaderboards" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Leaderboards
          </TabsTrigger>
          <TabsTrigger value="badges" className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            NFT Badges
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="quests" className="mt-6">
          <QuestDashboard />
        </TabsContent>

        <TabsContent value="streaks" className="mt-6">
          <StreakTracker />
        </TabsContent>

        <TabsContent value="leaderboards" className="mt-6">
          <LeaderboardDashboard />
        </TabsContent>

        <TabsContent value="badges" className="mt-6">
          <NFTBadgeCollection />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GamifiedLoyaltyDashboard;
