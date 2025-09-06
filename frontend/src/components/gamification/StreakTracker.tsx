import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, Flame, TrendingUp, Zap, Trophy, Target } from 'lucide-react';

interface Streak {
  id: string;
  type: 'LOGIN' | 'PAYMENT' | 'TASK_COMPLETION' | 'QUEST_COMPLETION';
  currentCount: number;
  maxCount: number;
  lastActivity: string;
  isActive: boolean;
  multiplier: number;
}

interface StreakStats {
  totalActiveStreaks: number;
  longestCurrentStreak: number;
  longestEverStreak: number;
  totalStreakDays: number;
}

interface StreakHistory {
  date: string;
  hasActivity: boolean;
  activityCount: number;
}

const StreakTracker: React.FC = () => {
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [stats, setStats] = useState<StreakStats | null>(null);
  const [history, setHistory] = useState<StreakHistory[]>([]);
  const [selectedStreakType, setSelectedStreakType] = useState<string>('LOGIN');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStreaks();
    fetchStreakHistory(selectedStreakType);
  }, []);

  useEffect(() => {
    fetchStreakHistory(selectedStreakType);
  }, [selectedStreakType]);

  const fetchStreaks = async () => {
    try {
      const response = await fetch('/api/streaks', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('SolanaPay-token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setStreaks(data.data.streaks);
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error('Error fetching streaks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStreakHistory = async (type: string) => {
    try {
      const response = await fetch(`/api/streaks/history/${type}?days=30`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('SolanaPay-token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setHistory(data.data);
      }
    } catch (error) {
      console.error('Error fetching streak history:', error);
    }
  };

  const getStreakIcon = (type: string) => {
    const icons = {
      'LOGIN': <Calendar className="h-5 w-5" />,
      'PAYMENT': <Zap className="h-5 w-5" />,
      'TASK_COMPLETION': <Target className="h-5 w-5" />,
      'QUEST_COMPLETION': <Trophy className="h-5 w-5" />
    };
    return icons[type as keyof typeof icons] || <Flame className="h-5 w-5" />;
  };

  const getStreakColor = (type: string) => {
    const colors = {
      'LOGIN': 'text-blue-500',
      'PAYMENT': 'text-green-500',
      'TASK_COMPLETION': 'text-purple-500',
      'QUEST_COMPLETION': 'text-yellow-500'
    };
    return colors[type as keyof typeof colors] || 'text-gray-500';
  };

  const getStreakTitle = (type: string) => {
    const titles = {
      'LOGIN': 'Daily Login',
      'PAYMENT': 'Payment Streak',
      'TASK_COMPLETION': 'Task Completion',
      'QUEST_COMPLETION': 'Quest Completion'
    };
    return titles[type as keyof typeof titles] || type;
  };

  const getMultiplierBadge = (multiplier: number) => {
    if (multiplier <= 1) return null;
    
    const color = multiplier >= 3 ? 'bg-purple-100 text-purple-800' : 
                  multiplier >= 2 ? 'bg-blue-100 text-blue-800' : 
                  'bg-green-100 text-green-800';
    
    return (
      <Badge className={color}>
        {multiplier.toFixed(1)}x multiplier
      </Badge>
    );
  };

  const StreakCard: React.FC<{ streak: Streak }> = ({ streak }) => {
    const progressToNext = Math.min((streak.currentCount % 7) / 7 * 100, 100);
    const nextMilestone = Math.ceil(streak.currentCount / 7) * 7;
    
    return (
      <Card className="transition-all hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={getStreakColor(streak.type)}>
                {getStreakIcon(streak.type)}
              </div>
              <CardTitle className="text-lg">{getStreakTitle(streak.type)}</CardTitle>
            </div>
            {getMultiplierBadge(streak.multiplier)}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">{streak.currentCount}</div>
            <div className="text-sm text-gray-500">Current Streak</div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress to {nextMilestone} days</span>
              <span>{streak.currentCount % 7}/7</span>
            </div>
            <Progress value={progressToNext} className="h-2" />
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-gray-900">{streak.maxCount}</div>
              <div className="text-gray-500">Best Streak</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-900">
                {new Date(streak.lastActivity).toLocaleDateString()}
              </div>
              <div className="text-gray-500">Last Activity</div>
            </div>
          </div>
          
          <div className={`text-center p-2 rounded-lg ${
            streak.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {streak.isActive ? '🔥 Active' : '❄️ Inactive'}
          </div>
        </CardContent>
      </Card>
    );
  };

  const StreakCalendar: React.FC = () => {
    const weeks = [];
    let currentWeek = [];
    
    history.forEach((day, index) => {
      currentWeek.push(day);
      if (currentWeek.length === 7 || index === history.length - 1) {
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
    });

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {getStreakTitle(selectedStreakType)} History (30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex gap-1">
                {week.map((day) => (
                  <div
                    key={day.date}
                    className={`w-8 h-8 rounded flex items-center justify-center text-xs ${
                      day.hasActivity 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-100 text-gray-400'
                    }`}
                    title={`${day.date}: ${day.activityCount} activities`}
                  >
                    {new Date(day.date).getDate()}
                  </div>
                ))}
              </div>
            ))}
          </div>
          
          <div className="flex items-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Active Day</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-100 rounded"></div>
              <span>Inactive Day</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-48"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Streak Tracker</h1>
        <p className="text-gray-600">Maintain your streaks to earn bonus rewards and multipliers</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Streaks</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.totalActiveStreaks}</p>
                </div>
                <Flame className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Longest Current</p>
                  <p className="text-2xl font-bold text-green-600">{stats.longestCurrentStreak}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">All-Time Best</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.longestEverStreak}</p>
                </div>
                <Trophy className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Days</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.totalStreakDays}</p>
                </div>
                <Calendar className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Streak Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {streaks.map((streak) => (
          <StreakCard key={streak.id} streak={streak} />
        ))}
      </div>

      {/* Streak Type Selector */}
      <div className="flex gap-2 flex-wrap">
        {['LOGIN', 'PAYMENT', 'TASK_COMPLETION', 'QUEST_COMPLETION'].map((type) => (
          <button
            key={type}
            onClick={() => setSelectedStreakType(type)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedStreakType === type
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {getStreakTitle(type)}
          </button>
        ))}
      </div>

      {/* Calendar */}
      <StreakCalendar />
    </div>
  );
};

export default StreakTracker;
