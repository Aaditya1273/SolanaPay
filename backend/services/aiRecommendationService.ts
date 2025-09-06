import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface UserSpendingAnalysis {
  totalSpent: number;
  avgTransactionAmount: number;
  transactionFrequency: number;
  topCategories: Array<{ category: string; amount: number; frequency: number }>;
  spendingTrend: 'INCREASING' | 'DECREASING' | 'STABLE';
  riskProfile: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface RewardRecommendation {
  type: 'CASHBACK' | 'NFT' | 'BONUS_TOKENS' | 'DISCOUNT' | 'EXCLUSIVE_ACCESS';
  title: string;
  description: string;
  value: number;
  confidence: number;
  reasoning: string;
  metadata?: Record<string, any>;
  expiresAt?: Date;
}

export class AIRecommendationService {
  
  /**
   * Analyze user spending patterns and behavior
   */
  async analyzeUserSpending(userId: string, days: number = 30): Promise<UserSpendingAnalysis> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get user transactions
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        createdAt: { gte: startDate },
        status: 'COMPLETED'
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get user activities
    const activities = await prisma.userActivity.findMany({
      where: {
        userId,
        timestamp: { gte: startDate }
      },
      orderBy: { timestamp: 'desc' }
    });

    const totalSpent = transactions
      .filter(t => ['PAYMENT', 'WITHDRAWAL'].includes(t.type))
      .reduce((sum, t) => sum + t.amount, 0);

    const avgTransactionAmount = transactions.length > 0 ? totalSpent / transactions.length : 0;
    const transactionFrequency = transactions.length / days;

    // Analyze spending by category
    const categorySpending = new Map<string, { amount: number; frequency: number }>();
    
    activities.forEach(activity => {
      if (activity.amount && activity.category) {
        const existing = categorySpending.get(activity.category) || { amount: 0, frequency: 0 };
        categorySpending.set(activity.category, {
          amount: existing.amount + activity.amount,
          frequency: existing.frequency + 1
        });
      }
    });

    const topCategories = Array.from(categorySpending.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Calculate spending trend
    const midPoint = Math.floor(transactions.length / 2);
    const recentSpending = transactions.slice(0, midPoint).reduce((sum, t) => sum + t.amount, 0);
    const olderSpending = transactions.slice(midPoint).reduce((sum, t) => sum + t.amount, 0);
    
    let spendingTrend: 'INCREASING' | 'DECREASING' | 'STABLE' = 'STABLE';
    if (recentSpending > olderSpending * 1.2) spendingTrend = 'INCREASING';
    else if (recentSpending < olderSpending * 0.8) spendingTrend = 'DECREASING';

    // Determine risk profile
    let riskProfile: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (avgTransactionAmount > 1000 || transactionFrequency > 5) riskProfile = 'HIGH';
    else if (avgTransactionAmount > 100 || transactionFrequency > 2) riskProfile = 'MEDIUM';

    return {
      totalSpent,
      avgTransactionAmount,
      transactionFrequency,
      topCategories,
      spendingTrend,
      riskProfile
    };
  }

  /**
   * Generate personalized reward recommendations using AI analysis
   */
  async generateRecommendations(userId: string): Promise<RewardRecommendation[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userPreferences: true,
        transactions: {
          take: 50,
          orderBy: { createdAt: 'desc' }
        },
        userActivities: {
          take: 100,
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    if (!user) throw new Error('User not found');

    const spendingAnalysis = await this.analyzeUserSpending(userId);
    const recommendations: RewardRecommendation[] = [];

    // Cashback recommendations based on spending patterns
    if (spendingAnalysis.totalSpent > 500) {
      const cashbackRate = this.calculateCashbackRate(spendingAnalysis);
      recommendations.push({
        type: 'CASHBACK',
        title: `${cashbackRate}% Cashback on Next Purchase`,
        description: `Earn ${cashbackRate}% cashback on your next payment based on your spending history`,
        value: spendingAnalysis.avgTransactionAmount * (cashbackRate / 100),
        confidence: 0.85,
        reasoning: `High spending activity (${spendingAnalysis.totalSpent.toFixed(2)} in 30 days) qualifies for premium cashback`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });
    }

    // NFT recommendations for high-value users
    if (user.tier === 'Gold' || user.tier === 'Platinum' || spendingAnalysis.totalSpent > 2000) {
      recommendations.push({
        type: 'NFT',
        title: 'Exclusive VPay NFT Collection',
        description: 'Unlock exclusive NFTs based on your VPay activity and tier status',
        value: 150,
        confidence: 0.75,
        reasoning: `${user.tier} tier status and high activity qualifies for exclusive NFT rewards`,
        metadata: {
          nftType: 'EXCLUSIVE_COLLECTION',
          rarity: user.tier === 'Platinum' ? 'LEGENDARY' : 'RARE'
        }
      });
    }

    // Bonus tokens for frequent users
    if (spendingAnalysis.transactionFrequency > 3) {
      const bonusAmount = Math.floor(spendingAnalysis.transactionFrequency * 10);
      recommendations.push({
        type: 'BONUS_TOKENS',
        title: `${bonusAmount} Bonus VPay Tokens`,
        description: 'Earn bonus tokens for your frequent platform usage',
        value: bonusAmount,
        confidence: 0.9,
        reasoning: `High transaction frequency (${spendingAnalysis.transactionFrequency.toFixed(1)} per day) earns bonus tokens`,
        metadata: {
          tokenAmount: bonusAmount,
          tokenType: 'VPAY'
        }
      });
    }

    // Category-specific discounts
    if (spendingAnalysis.topCategories.length > 0) {
      const topCategory = spendingAnalysis.topCategories[0];
      recommendations.push({
        type: 'DISCOUNT',
        title: `15% Discount on ${topCategory.category}`,
        description: `Special discount on your most used category: ${topCategory.category}`,
        value: topCategory.amount * 0.15,
        confidence: 0.8,
        reasoning: `Most active in ${topCategory.category} category with ${topCategory.frequency} transactions`,
        metadata: {
          discountPercentage: 15,
          category: topCategory.category
        },
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
      });
    }

    // Exclusive access for premium users
    if (user.rewardPoints > 1000) {
      recommendations.push({
        type: 'EXCLUSIVE_ACCESS',
        title: 'VIP Early Access Program',
        description: 'Get early access to new VPay features and premium services',
        value: 0,
        confidence: 0.7,
        reasoning: `High reward points (${user.rewardPoints}) qualifies for VIP access`,
        metadata: {
          accessType: 'VIP_EARLY_ACCESS',
          features: ['NEW_FEATURES', 'PREMIUM_SUPPORT', 'EXCLUSIVE_EVENTS']
        }
      });
    }

    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate dynamic cashback rate based on user behavior
   */
  private calculateCashbackRate(analysis: UserSpendingAnalysis): number {
    let baseRate = 1; // 1% base rate
    
    // Increase rate based on spending volume
    if (analysis.totalSpent > 2000) baseRate += 2;
    else if (analysis.totalSpent > 1000) baseRate += 1;
    
    // Increase rate based on frequency
    if (analysis.transactionFrequency > 5) baseRate += 1;
    else if (analysis.transactionFrequency > 2) baseRate += 0.5;
    
    // Bonus for increasing trend
    if (analysis.spendingTrend === 'INCREASING') baseRate += 0.5;
    
    return Math.min(baseRate, 5); // Cap at 5%
  }

  /**
   * Save recommendations to database
   */
  async saveRecommendations(userId: string, recommendations: RewardRecommendation[]): Promise<void> {
    const data = recommendations.map(rec => ({
      userId,
      rewardType: rec.type,
      title: rec.title,
      description: rec.description,
      value: rec.value,
      confidence: rec.confidence,
      reasoning: rec.reasoning,
      metadata: rec.metadata || {},
      expiresAt: rec.expiresAt
    }));

    await prisma.rewardRecommendation.createMany({ data });
  }

  /**
   * Track user activity for AI analysis
   */
  async trackActivity(
    userId: string, 
    activityType: string, 
    metadata?: Record<string, any>,
    amount?: number,
    category?: string
  ): Promise<void> {
    await prisma.userActivity.create({
      data: {
        userId,
        activityType,
        metadata: metadata || {},
        amount,
        category
      }
    });
  }

  /**
   * Update spending patterns periodically
   */
  async updateSpendingPatterns(userId: string): Promise<void> {
    const analysis = await this.analyzeUserSpending(userId);
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1); // Start of month
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of month

    for (const category of analysis.topCategories) {
      await prisma.spendingPattern.upsert({
        where: {
          userId_category_periodStart: {
            userId,
            category: category.category,
            periodStart
          }
        },
        update: {
          totalAmount: category.amount,
          frequency: category.frequency,
          avgAmount: category.amount / category.frequency,
          lastActivity: now,
          trendDirection: analysis.spendingTrend,
          periodEnd
        },
        create: {
          userId,
          category: category.category,
          totalAmount: category.amount,
          frequency: category.frequency,
          avgAmount: category.amount / category.frequency,
          lastActivity: now,
          trendDirection: analysis.spendingTrend,
          periodStart,
          periodEnd
        }
      });
    }
  }
}

export const aiRecommendationService = new AIRecommendationService();
