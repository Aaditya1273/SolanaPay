import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Trophy, Medal, Crown, Star, TrendingUp, Users, Target, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface LeaderboardEntry {
  rank: number;
  user: {
    id: string;
    username: string;
    avatar?: string;
    tier: string;
  };
  score: number;
  metadata: any;
}

interface LeaderboardData {
  leaderboard: {
    id: string;
    type: string;
    category: string;
    period: string;
    updatedAt: string;
  };
  entries: LeaderboardEntry[];
}

const LeaderboardDashboard: React.FC = () => {
  const [leaderboards, setLeaderboards] = useState<{
    points?: LeaderboardData;
    xp?: LeaderboardData;
    quests?: LeaderboardData;
    streaks?: LeaderboardData;
  }>({});
  const [selectedPeriod, setSelectedPeriod] = useState('ALL_TIME');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('points');

  useEffect(() => {
    fetchLeaderboards();
  }, [selectedPeriod]);

  const fetchLeaderboards = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/leaderboards/dashboard?period=${selectedPeriod}&limit=10`);
      const data = await response.json();
      
      if (data.success) {
        setLeaderboards(data.data);
      }
    } catch (error) {
      console.error('Error fetching leaderboards:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Trophy className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-gray-500">#{rank}</span>;
    }
  };

  const getTierColor = (tier: string) => {
    const colors = {
      'Bronze': 'bg-amber-100 text-amber-800',
      'Silver': 'bg-gray-100 text-gray-800',
      'Gold': 'bg-yellow-100 text-yellow-800',
      'Platinum': 'bg-purple-100 text-purple-800',
      'Diamond': 'bg-blue-100 text-blue-800'
    };
    return colors[tier as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const LeaderboardList: React.FC<{ data?: LeaderboardData; title: string; icon: React.ReactNode; scoreLabel: string }> = ({ 
    data, 
    title, 
    icon, 
    scoreLabel 
  }) => (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : data?.entries?.length ? (
          <div className="space-y-3">
            {data.entries.map((entry) => (
              <div key={entry.user.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8">
                    {getRankIcon(entry.rank)}
                  </div>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={entry.user.avatar} />
                    <AvatarFallback>{entry.user.username.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{entry.user.username}</p>
                    <Badge variant="secondary" className={`text-xs ${getTierColor(entry.user.tier)}`}>
                      {entry.user.tier}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-purple-600">{entry.score.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{scoreLabel}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const generateChartData = (entries: LeaderboardEntry[]) => {
    return entries.slice(0, 5).map(entry => ({
      name: entry.user.username,
      score: entry.score,
      rank: entry.rank
    }));
  };

  const generatePieData = () => {
    const categories = [
      { name: 'Points Leaders', value: leaderboards.points?.entries.length || 0, color: '#8b5cf6' },
      { name: 'XP Leaders', value: leaderboards.xp?.entries.length || 0, color: '#06b6d4' },
      { name: 'Quest Masters', value: leaderboards.quests?.entries.length || 0, color: '#10b981' },
      { name: 'Streak Kings', value: leaderboards.streaks?.entries.length || 0, color: '#f59e0b' }
    ];
    return categories.filter(cat => cat.value > 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leaderboards</h1>
          <p className="text-gray-600">Compete with other VPay users and climb the ranks</p>
        </div>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DAILY">Daily</SelectItem>
            <SelectItem value="WEEKLY">Weekly</SelectItem>
            <SelectItem value="MONTHLY">Monthly</SelectItem>
            <SelectItem value="ALL_TIME">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Top Points</p>
                <p className="text-2xl font-bold text-purple-600">
                  {leaderboards.points?.entries[0]?.score.toLocaleString() || '0'}
                </p>
              </div>
              <Star className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Top XP</p>
                <p className="text-2xl font-bold text-cyan-600">
                  {leaderboards.xp?.entries[0]?.score.toLocaleString() || '0'}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-cyan-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Most Quests</p>
                <p className="text-2xl font-bold text-green-600">
                  {leaderboards.quests?.entries[0]?.score || '0'}
                </p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Longest Streak</p>
                <p className="text-2xl font-bold text-amber-600">
                  {leaderboards.streaks?.entries[0]?.score || '0'}
                </p>
              </div>
              <Zap className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Performers Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={generateChartData(leaderboards[activeTab as keyof typeof leaderboards]?.entries || [])}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="score" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leaderboard Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={generatePieData()}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {generatePieData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="points" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Points
          </TabsTrigger>
          <TabsTrigger value="xp" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Experience
          </TabsTrigger>
          <TabsTrigger value="quests" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Quests
          </TabsTrigger>
          <TabsTrigger value="streaks" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Streaks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="points" className="mt-6">
          <LeaderboardList 
            data={leaderboards.points} 
            title="Points Leaderboard" 
            icon={<Star className="h-5 w-5 text-purple-500" />}
            scoreLabel="points"
          />
        </TabsContent>

        <TabsContent value="xp" className="mt-6">
          <LeaderboardList 
            data={leaderboards.xp} 
            title="Experience Leaderboard" 
            icon={<TrendingUp className="h-5 w-5 text-cyan-500" />}
            scoreLabel="XP"
          />
        </TabsContent>

        <TabsContent value="quests" className="mt-6">
          <LeaderboardList 
            data={leaderboards.quests} 
            title="Quest Masters" 
            icon={<Target className="h-5 w-5 text-green-500" />}
            scoreLabel="quests completed"
          />
        </TabsContent>

        <TabsContent value="streaks" className="mt-6">
          <LeaderboardList 
            data={leaderboards.streaks} 
            title="Streak Champions" 
            icon={<Zap className="h-5 w-5 text-amber-500" />}
            scoreLabel="day streak"
          />
        </TabsContent>
      </Tabs>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button onClick={fetchLeaderboards} disabled={loading} variant="outline">
          {loading ? 'Refreshing...' : 'Refresh Leaderboards'}
        </Button>
      </div>
    </div>
  );
};

export default LeaderboardDashboard;
