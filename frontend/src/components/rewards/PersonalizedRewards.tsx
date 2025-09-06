import React, { useState } from 'react';
import { usePersonalizedRewards, PersonalizedReward } from '../../hooks/usePersonalizedRewards';
import { toast } from 'react-hot-toast';
import { Target, Star, Zap, Gift, Crown } from 'lucide-react';

const RewardTypeIcon = ({ type }: { type: PersonalizedReward['rewardType'] }) => {
  const iconComponents = {
    CASHBACK: <Target className="h-6 w-6 text-green-600" />,
    NFT: <Star className="h-6 w-6 text-purple-600" />,
    BONUS_TOKENS: <Zap className="h-6 w-6 text-yellow-600" />,
    DISCOUNT: <Gift className="h-6 w-6 text-blue-600" />,
    EXCLUSIVE_ACCESS: <Crown className="h-6 w-6 text-orange-600" />
  };
  return <div className="w-8 h-8 flex items-center justify-center">{iconComponents[type]}</div>;
};

const ConfidenceBar = ({ confidence }: { confidence: number }) => {
  const percentage = Math.round(confidence * 100);
  const getColor = () => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="w-20 bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full ${getColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-gray-600">{percentage}%</span>
    </div>
  );
};

const RewardCard = ({ 
  reward, 
  onClaim, 
  onView 
}: { 
  reward: PersonalizedReward;
  onClaim: (id: string) => Promise<void>;
  onView: (id: string) => void;
}) => {
  const [claiming, setClaiming] = useState(false);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      await onClaim(reward.id);
      toast.success(`${reward.title} claimed successfully!`);
    } catch (error) {
      toast.error('Failed to claim reward');
    } finally {
      setClaiming(false);
    }
  };

  const handleView = () => {
    if (reward.status === 'PENDING') {
      onView(reward.id);
    }
  };

  const isExpired = reward.expiresAt && new Date(reward.expiresAt) < new Date();
  const canClaim = reward.status === 'VIEWED' && !isExpired;

  return (
    <div 
      className={`bg-white rounded-lg shadow-md p-6 border-l-4 transition-all duration-200 hover:shadow-lg ${
        reward.status === 'PENDING' ? 'border-blue-500 cursor-pointer' : 
        reward.status === 'CLAIMED' ? 'border-green-500' :
        isExpired ? 'border-gray-400 opacity-60' : 'border-yellow-500'
      }`}
      onClick={handleView}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <RewardTypeIcon type={reward.rewardType} />
          <div>
            <h3 className="font-semibold text-lg text-gray-800">{reward.title}</h3>
            <p className="text-sm text-gray-600">{reward.rewardType.replace('_', ' ')}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-green-600">
            {reward.rewardType === 'DISCOUNT' ? `${reward.value}%` : `$${reward.value.toFixed(2)}`}
          </div>
          <ConfidenceBar confidence={reward.confidence} />
        </div>
      </div>

      <p className="text-gray-700 mb-4">{reward.description}</p>

      <div className="bg-blue-50 p-3 rounded-md mb-4">
        <p className="text-sm text-blue-800">
          <span className="font-medium">AI Insight:</span> {reward.reasoning}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            reward.status === 'PENDING' ? 'bg-blue-100 text-blue-800' :
            reward.status === 'VIEWED' ? 'bg-yellow-100 text-yellow-800' :
            reward.status === 'CLAIMED' ? 'bg-green-100 text-green-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {reward.status}
          </span>
          {reward.expiresAt && (
            <span className="text-xs text-gray-500">
              Expires: {new Date(reward.expiresAt).toLocaleDateString()}
            </span>
          )}
        </div>

        {canClaim && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClaim();
            }}
            disabled={claiming}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          >
            {claiming ? 'Claiming...' : 'Claim Reward'}
          </button>
        )}
      </div>
    </div>
  );
};

const PersonalizedRewards: React.FC = () => {
  const { 
    recommendations, 
    analytics, 
    loading, 
    error, 
    claimReward, 
    markAsViewed, 
    refreshRecommendations 
  } = usePersonalizedRewards();

  if (loading && recommendations.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">Personalized Rewards</h2>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-200 animate-pulse rounded-lg h-48"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Recommendations</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={refreshRecommendations}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  const pendingRewards = recommendations.filter(r => r.status === 'PENDING');
  const viewedRewards = recommendations.filter(r => r.status === 'VIEWED');
  const claimedRewards = recommendations.filter(r => r.status === 'CLAIMED');

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">AI-Powered Personalized Rewards</h2>
        <button
          onClick={refreshRecommendations}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {analytics && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Spending Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">
                ${analytics.spendingAnalysis.totalSpent.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Total Spent</div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">
                ${analytics.spendingAnalysis.avgTransactionAmount.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Avg Transaction</div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600">
                {analytics.spendingAnalysis.spendingTrend}
              </div>
              <div className="text-sm text-gray-600">Spending Trend</div>
            </div>
          </div>
        </div>
      )}

      {recommendations.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-medium text-gray-800 mb-2">No Recommendations Yet</h3>
          <p className="text-gray-600 mb-6">
            Start using VPay to receive personalized AI-powered reward recommendations!
          </p>
          <button
            onClick={refreshRecommendations}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium"
          >
            Check for Recommendations
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {pendingRewards.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm mr-3">
                  {pendingRewards.length}
                </span>
                New Recommendations
              </h3>
              <div className="grid gap-4">
                {pendingRewards.map(reward => (
                  <RewardCard
                    key={reward.id}
                    reward={reward}
                    onClaim={claimReward}
                    onView={markAsViewed}
                  />
                ))}
              </div>
            </div>
          )}

          {viewedRewards.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm mr-3">
                  {viewedRewards.length}
                </span>
                Ready to Claim
              </h3>
              <div className="grid gap-4">
                {viewedRewards.map(reward => (
                  <RewardCard
                    key={reward.id}
                    reward={reward}
                    onClaim={claimReward}
                    onView={markAsViewed}
                  />
                ))}
              </div>
            </div>
          )}

          {claimedRewards.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm mr-3">
                  {claimedRewards.length}
                </span>
                Claimed Rewards
              </h3>
              <div className="grid gap-4">
                {claimedRewards.slice(0, 3).map(reward => (
                  <RewardCard
                    key={reward.id}
                    reward={reward}
                    onClaim={claimReward}
                    onView={markAsViewed}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PersonalizedRewards;
