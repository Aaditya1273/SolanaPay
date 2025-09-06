import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

export interface PersonalizedReward {
  id: string;
  rewardType: 'CASHBACK' | 'NFT' | 'BONUS_TOKENS' | 'DISCOUNT' | 'EXCLUSIVE_ACCESS';
  title: string;
  description: string;
  value: number;
  confidence: number;
  reasoning: string;
  metadata?: Record<string, any>;
  status: 'PENDING' | 'VIEWED' | 'CLAIMED' | 'EXPIRED';
  expiresAt?: string;
  createdAt: string;
}

export interface RewardAnalytics {
  spendingAnalysis: {
    totalSpent: number;
    avgTransactionAmount: number;
    transactionFrequency: number;
    topCategories: Array<{ category: string; amount: number; frequency: number }>;
    spendingTrend: 'INCREASING' | 'DECREASING' | 'STABLE';
    riskProfile: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  recommendationStats: Array<{ status: string; _count: { _all: number } }>;
  spendingPatterns: Array<{
    category: string;
    totalAmount: number;
    frequency: number;
    trendDirection: string;
  }>;
}

export const usePersonalizedRewards = () => {
  const [recommendations, setRecommendations] = useState<PersonalizedReward[]>([]);
  const [analytics, setAnalytics] = useState<RewardAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('vpay-token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`${API_BASE_URL}/rewards/recommend`, {
        headers: getAuthHeaders()
      });
      
      if (response.data.success) {
        setRecommendations(response.data.data.recommendations);
      } else {
        throw new Error(response.data.error || 'Failed to fetch recommendations');
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch recommendations');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/rewards/analytics`, {
        headers: getAuthHeaders()
      });
      
      if (response.data.success) {
        setAnalytics(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  }, []);

  const claimReward = useCallback(async (recommendationId: string) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/rewards/recommend/${recommendationId}/claim`,
        {},
        { headers: getAuthHeaders() }
      );
      
      if (response.data.success) {
        // Update the recommendation status locally
        setRecommendations(prev => 
          prev.map(rec => 
            rec.id === recommendationId 
              ? { ...rec, status: 'CLAIMED' as const }
              : rec
          )
        );
        
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to claim reward');
      }
    } catch (err) {
      console.error('Error claiming reward:', err);
      throw err;
    }
  }, []);

  const markAsViewed = useCallback(async (recommendationId: string) => {
    try {
      // Update locally first for immediate UI feedback
      setRecommendations(prev => 
        prev.map(rec => 
          rec.id === recommendationId 
            ? { ...rec, status: 'VIEWED' as const }
            : rec
        )
      );
      
      // You could add an API call here to track views if needed
    } catch (err) {
      console.error('Error marking as viewed:', err);
    }
  }, []);

  const refreshRecommendations = useCallback(async () => {
    await fetchRecommendations();
    await fetchAnalytics();
  }, [fetchRecommendations, fetchAnalytics]);

  useEffect(() => {
    fetchRecommendations();
    fetchAnalytics();
  }, [fetchRecommendations, fetchAnalytics]);

  return {
    recommendations,
    analytics,
    loading,
    error,
    claimReward,
    markAsViewed,
    refreshRecommendations,
    fetchRecommendations,
    fetchAnalytics
  };
};
