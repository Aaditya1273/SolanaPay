import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Target, 
  Clock, 
  Star, 
  CheckCircle, 
  Calendar, 
  Trophy, 
  Zap, 
  Gift,
  Flame,
  Users,
  CreditCard,
  Briefcase
} from 'lucide-react';
import { toast } from 'sonner';

interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'SPECIAL' | 'ACHIEVEMENT';
  category: 'PAYMENT' | 'TASK' | 'SOCIAL' | 'STREAK' | 'MILESTONE';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'LEGENDARY';
  requirements: any;
  rewards: any;
  pointsReward: number;
  xpReward: number;
  isActive: boolean;
  isRepeatable: boolean;
  startDate?: string;
  endDate?: string;
}

interface UserQuest {
  id: string;
  questId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
  progress: any;
  startedAt: string;
  completedAt?: string;
  expiresAt?: string;
  quest: Quest;
}

const QuestDashboard: React.FC = () => {
  const [activeQuests, setActiveQuests] = useState<UserQuest[]>([]);
  const [completedQuests, setCompletedQuests] = useState<UserQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    fetchQuests();
    fetchCompletedQuests();
  }, []);

  const fetchQuests = async () => {
    try {
      const response = await fetch('/api/quests', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('vpay-token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setActiveQuests(data.data);
      }
    } catch (error) {
      console.error('Error fetching quests:', error);
      toast.error('Failed to load quests');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletedQuests = async () => {
    try {
      const response = await fetch('/api/quests/completed?limit=20', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('vpay-token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setCompletedQuests(data.data);
      }
    } catch (error) {
      console.error('Error fetching completed quests:', error);
    }
  };

  const generateWeeklyQuests = async () => {
    try {
      const response = await fetch('/api/quests/generate/weekly', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('vpay-token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success('Weekly quests generated!');
        fetchQuests();
      }
    } catch (error) {
      console.error('Error generating weekly quests:', error);
      toast.error('Failed to generate weekly quests');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      'EASY': 'bg-green-100 text-green-800',
      'MEDIUM': 'bg-yellow-100 text-yellow-800',
      'HARD': 'bg-red-100 text-red-800',
      'LEGENDARY': 'bg-purple-100 text-purple-800'
    };
    return colors[difficulty as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      'PAYMENT': <CreditCard className="h-4 w-4" />,
      'TASK': <Briefcase className="h-4 w-4" />,
      'SOCIAL': <Users className="h-4 w-4" />,
      'STREAK': <Flame className="h-4 w-4" />,
      'MILESTONE': <Trophy className="h-4 w-4" />
    };
    return icons[category as keyof typeof icons] || <Target className="h-4 w-4" />;
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      'DAILY': <Calendar className="h-4 w-4" />,
      'WEEKLY': <Clock className="h-4 w-4" />,
      'MONTHLY': <Star className="h-4 w-4" />,
      'SPECIAL': <Gift className="h-4 w-4" />,
      'ACHIEVEMENT': <Trophy className="h-4 w-4" />
    };
    return icons[type as keyof typeof icons] || <Target className="h-4 w-4" />;
  };

  const calculateProgress = (userQuest: UserQuest) => {
    const progress = userQuest.progress || {};
    const requirements = userQuest.quest.requirements;
    const currentCount = progress[requirements.type] || 0;
    const percentage = Math.min((currentCount / requirements.count) * 100, 100);
    return { currentCount, required: requirements.count, percentage };
  };

  const getTimeRemaining = (expiresAt?: string) => {
    if (!expiresAt) return null;
    
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    
    return `${hours}h ${minutes}m`;
  };

  const QuestCard: React.FC<{ userQuest: UserQuest; isCompleted?: boolean }> = ({ userQuest, isCompleted = false }) => {
    const { quest } = userQuest;
    const progress = calculateProgress(userQuest);
    const timeRemaining = getTimeRemaining(userQuest.expiresAt);

    return (
      <Card className={`transition-all hover:shadow-md ${isCompleted ? 'opacity-75' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {getCategoryIcon(quest.category)}
              <CardTitle className="text-lg">{quest.title}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {getTypeIcon(quest.type)}
              <Badge variant="secondary" className={getDifficultyColor(quest.difficulty)}>
                {quest.difficulty}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-gray-600">{quest.description}</p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Progress */}
          {!isCompleted && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{progress.currentCount}/{progress.required}</span>
              </div>
              <Progress value={progress.percentage} className="h-2" />
            </div>
          )}

          {/* Rewards */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-purple-500" />
              <span>{quest.pointsReward} points</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="h-4 w-4 text-cyan-500" />
              <span>{quest.xpReward} XP</span>
            </div>
            {quest.rewards.badge && (
              <div className="flex items-center gap-1">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <span>Badge</span>
              </div>
            )}
          </div>

          {/* Time remaining */}
          {timeRemaining && !isCompleted && (
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>{timeRemaining} remaining</span>
            </div>
          )}

          {/* Completion status */}
          {isCompleted && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Completed on {new Date(userQuest.completedAt!).toLocaleDateString()}</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const QuestStats = () => {
    const totalActive = activeQuests.length;
    const totalCompleted = completedQuests.length;
    const dailyQuests = activeQuests.filter(q => q.quest.type === 'DAILY').length;
    const weeklyQuests = activeQuests.filter(q => q.quest.type === 'WEEKLY').length;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Quests</p>
                <p className="text-2xl font-bold text-blue-600">{totalActive}</p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{totalCompleted}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Daily Quests</p>
                <p className="text-2xl font-bold text-orange-600">{dailyQuests}</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Weekly Quests</p>
                <p className="text-2xl font-bold text-purple-600">{weeklyQuests}</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quest Dashboard</h1>
          <p className="text-gray-600">Complete quests to earn points, XP, and exclusive badges</p>
        </div>
        <Button onClick={generateWeeklyQuests} variant="outline">
          Generate Weekly Quests
        </Button>
      </div>

      {/* Stats */}
      <QuestStats />

      {/* Quest Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Active Quests ({activeQuests.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Completed ({completedQuests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          {activeQuests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeQuests.map((userQuest) => (
                <QuestCard key={userQuest.id} userQuest={userQuest} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Target className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Quests</h3>
                <p className="text-gray-600 mb-4">New daily quests will be available tomorrow!</p>
                <Button onClick={generateWeeklyQuests} variant="outline">
                  Generate Weekly Quests
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {completedQuests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedQuests.map((userQuest) => (
                <QuestCard key={userQuest.id} userQuest={userQuest} isCompleted />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Completed Quests</h3>
                <p className="text-gray-600">Complete your first quest to see it here!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QuestDashboard;
