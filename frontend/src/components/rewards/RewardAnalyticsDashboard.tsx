import React, { useState, useEffect } from 'react';
import { usePersonalizedRewards } from '../../hooks/usePersonalizedRewards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, DollarSign, Activity, Target, Award } from 'lucide-react';

const TrendIcon = ({ direction }: { direction: string }) => {
  switch (direction) {
    case 'UP':
    case 'INCREASING':
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    case 'DOWN':
    case 'DECREASING':
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    default:
      return <Minus className="h-4 w-4 text-gray-500" />;
  }
};

const SpendingChart = ({ categories }: { categories: Array<{ category: string; amount: number; frequency: number }> }) => {
  const maxAmount = Math.max(...categories.map(c => c.amount));
  
  return (
    <div className="space-y-4">
      {categories.map((category, index) => (
        <div key={index} className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">{category.category}</span>
            <div className="text-right">
              <div className="text-sm font-semibold">${category.amount.toFixed(2)}</div>
              <div className="text-xs text-gray-500">{category.frequency} transactions</div>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(category.amount / maxAmount) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const RecommendationStatusChart = ({ stats }: { stats: Array<{ status: string; _count: { _all: number } }> }) => {
  const total = stats.reduce((sum, stat) => sum + stat._count._all, 0);
  
  const statusColors = {
    PENDING: 'bg-blue-500',
    VIEWED: 'bg-yellow-500',
    CLAIMED: 'bg-green-500',
    EXPIRED: 'bg-gray-500'
  };

  return (
    <div className="space-y-4">
      {stats.map((stat, index) => {
        const percentage = total > 0 ? (stat._count._all / total) * 100 : 0;
        return (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${statusColors[stat.status as keyof typeof statusColors] || 'bg-gray-400'}`} />
              <span className="text-sm font-medium capitalize">{stat.status.toLowerCase()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">{stat._count._all}</span>
              <div className="w-20 bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${statusColors[stat.status as keyof typeof statusColors] || 'bg-gray-400'}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 w-8">{percentage.toFixed(0)}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const MetricCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue, 
  color = 'blue' 
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  color?: string;
}) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600'
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {trend && trendValue && (
              <div className="flex items-center mt-1">
                <TrendIcon direction={trend.toUpperCase()} />
                <span className={`text-sm ml-1 ${
                  trend === 'up' ? 'text-green-600' : 
                  trend === 'down' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {trendValue}
                </span>
              </div>
            )}
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colorClasses[color as keyof typeof colorClasses]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const RewardAnalyticsDashboard: React.FC = () => {
  const { analytics, loading, error, fetchAnalytics } = usePersonalizedRewards();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  if (loading && !analytics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">Reward Analytics</h2>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-gray-200 animate-pulse rounded-lg h-32"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Analytics</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={handleRefresh}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-gray-800 mb-2">No Analytics Data</h3>
        <p className="text-gray-600 mb-6">Start using SolanaPay to see your reward analytics!</p>
        <button
          onClick={handleRefresh}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium"
        >
          Check for Data
        </button>
      </div>
    );
  }

  const { spendingAnalysis, recommendationStats, spendingPatterns } = analytics;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Reward Analytics Dashboard</h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Spent"
          value={`$${spendingAnalysis.totalSpent.toFixed(2)}`}
          icon={DollarSign}
          trend={spendingAnalysis.spendingTrend.toLowerCase() as 'up' | 'down' | 'stable'}
          trendValue={spendingAnalysis.spendingTrend}
          color="green"
        />
        <MetricCard
          title="Avg Transaction"
          value={`$${spendingAnalysis.avgTransactionAmount.toFixed(2)}`}
          icon={Activity}
          color="blue"
        />
        <MetricCard
          title="Transaction Count"
          value={spendingAnalysis.transactionFrequency}
          icon={Target}
          color="purple"
        />
        <MetricCard
          title="Risk Profile"
          value={spendingAnalysis.riskProfile}
          icon={Award}
          color="orange"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Spending by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Spending by Category</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SpendingChart categories={spendingAnalysis.topCategories} />
          </CardContent>
        </Card>

        {/* Recommendation Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="h-5 w-5" />
              <span>Recommendation Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RecommendationStatusChart stats={recommendationStats} />
          </CardContent>
        </Card>
      </div>

      {/* Spending Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Spending Patterns & Trends</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {spendingPatterns.map((pattern, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-800">{pattern.category}</h4>
                  <TrendIcon direction={pattern.trendDirection} />
                </div>
                <div className="space-y-1">
                  <div className="text-lg font-semibold text-gray-900">
                    ${pattern.totalAmount.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {pattern.frequency} transactions
                  </div>
                  <div className="text-xs text-gray-500 capitalize">
                    Trend: {pattern.trendDirection.toLowerCase()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights & Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>AI Insights</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Spending Behavior</h4>
              <p className="text-sm text-blue-700">
                Your spending trend is <strong>{spendingAnalysis.spendingTrend.toLowerCase()}</strong> with 
                an average transaction of <strong>${spendingAnalysis.avgTransactionAmount.toFixed(2)}</strong>. 
                You have a <strong>{spendingAnalysis.riskProfile.toLowerCase()}</strong> risk profile.
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2">Reward Opportunities</h4>
              <p className="text-sm text-green-700">
                Based on your patterns, you're eligible for personalized rewards in 
                <strong> {spendingAnalysis.topCategories[0]?.category}</strong> category. 
                Check the AI Rewards tab for recommendations!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RewardAnalyticsDashboard;
