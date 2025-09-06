const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Gamification Integration Service
// Connects gamification features with the existing rewards engine
class GamificationIntegration {
  
  // Track user activity and update streaks, quests, and achievements
  static async trackActivity(userId, activityType, metadata = {}) {
    try {
      // Log the activity
      await prisma.userActivity.create({
        data: {
          userId,
          activityType,
          metadata,
          amount: metadata.amount || null,
          category: metadata.category || null
        }
      });

      // Update streaks
      await this.updateStreaks(userId, activityType);

      // Update quest progress
      await this.updateQuestProgress(userId, activityType);

      // Check for achievements
      await this.checkAchievements(userId, activityType, metadata);

      // Update leaderboards
      await this.updateLeaderboards(userId, activityType, metadata);

      return { success: true };
    } catch (error) {
      console.error('Error tracking activity:', error);
      return { success: false, error: error.message };
    }
  }

  // Update user streaks based on activity
  static async updateStreaks(userId, activityType) {
    const streakTypes = {
      'LOGIN': 'LOGIN',
      'PAYMENT_SENT': 'PAYMENT',
      'PAYMENT_RECEIVED': 'PAYMENT',
      'TASK_COMPLETED': 'TASK_COMPLETION',
      'QUEST_COMPLETED': 'QUEST_COMPLETION'
    };

    const streakType = streakTypes[activityType];
    if (!streakType) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let streak = await prisma.streak.findUnique({
      where: { userId_type: { userId, type: streakType } }
    });

    if (!streak) {
      // Create new streak
      streak = await prisma.streak.create({
        data: {
          userId,
          type: streakType,
          currentCount: 1,
          maxCount: 1,
          lastActivity: new Date(),
          multiplier: 1.0
        }
      });
    } else {
      const lastActivityDate = new Date(streak.lastActivity);
      lastActivityDate.setHours(0, 0, 0, 0);

      if (lastActivityDate.getTime() === today.getTime()) {
        // Already updated today
        return streak;
      } else if (lastActivityDate.getTime() === yesterday.getTime()) {
        // Consecutive day, increment streak
        const newCount = streak.currentCount + 1;
        const newMaxCount = Math.max(streak.maxCount, newCount);
        const newMultiplier = Math.min(1.0 + (newCount * 0.1), 3.0);

        streak = await prisma.streak.update({
          where: { id: streak.id },
          data: {
            currentCount: newCount,
            maxCount: newMaxCount,
            lastActivity: new Date(),
            multiplier: newMultiplier
          }
        });

        // Award streak milestone badges
        await this.checkStreakMilestones(userId, streakType, newCount);
      } else {
        // Streak broken, reset
        streak = await prisma.streak.update({
          where: { id: streak.id },
          data: {
            currentCount: 1,
            lastActivity: new Date(),
            multiplier: 1.0
          }
        });
      }
    }

    return streak;
  }

  // Update quest progress
  static async updateQuestProgress(userId, activityType) {
    const activeQuests = await prisma.userQuest.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: { quest: true }
    });

    for (const userQuest of activeQuests) {
      const quest = userQuest.quest;
      const requirements = quest.requirements;

      if (requirements.type === activityType) {
        const progress = userQuest.progress || {};
        const currentCount = progress[activityType] || 0;
        const newCount = currentCount + 1;

        await prisma.userQuest.update({
          where: { id: userQuest.id },
          data: {
            progress: {
              ...progress,
              [activityType]: newCount
            }
          }
        });

        // Check if quest is completed
        if (newCount >= requirements.count) {
          await this.completeQuest(userId, userQuest.questId);
        }
      }
    }
  }

  // Complete a quest and award rewards
  static async completeQuest(userId, questId) {
    const userQuest = await prisma.userQuest.findUnique({
      where: { userId_questId: { userId, questId } },
      include: { quest: true }
    });

    if (!userQuest || userQuest.status !== 'ACTIVE') return;

    const quest = userQuest.quest;

    // Mark quest as completed
    await prisma.userQuest.update({
      where: { id: userQuest.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });

    // Award points
    await prisma.user.update({
      where: { id: userId },
      data: {
        rewardPoints: { increment: quest.pointsReward }
      }
    });

    // Award XP and update level
    await this.awardXP(userId, quest.xpReward);

    // Award badges if specified
    if (quest.rewards.badge) {
      await this.awardBadge(userId, quest.rewards.badge, {
        questId: quest.id,
        questTitle: quest.title
      });
    }

    // Track quest completion activity
    await this.trackActivity(userId, 'QUEST_COMPLETED', {
      questId: quest.id,
      questTitle: quest.title,
      pointsEarned: quest.pointsReward,
      xpEarned: quest.xpReward
    });

    return userQuest;
  }

  // Award XP and handle level ups
  static async awardXP(userId, xpAmount) {
    let userLevel = await prisma.userLevel.findUnique({
      where: { userId }
    });

    if (!userLevel) {
      userLevel = await prisma.userLevel.create({
        data: {
          userId,
          level: 1,
          xp: 0,
          xpToNext: 100,
          totalXp: 0
        }
      });
    }

    const newXp = userLevel.xp + xpAmount;
    const newTotalXp = userLevel.totalXp + xpAmount;
    let newLevel = userLevel.level;
    let xpToNext = userLevel.xpToNext;

    // Check for level up
    while (newXp >= xpToNext) {
      newLevel += 1;
      const remainingXp = newXp - xpToNext;
      xpToNext = Math.floor(100 * Math.pow(1.5, newLevel - 1));
      
      // Award level up badge
      await this.awardLevelUpBadge(userId, newLevel);
      
      // Award level up rewards
      const levelRewards = newLevel * 100; // Points per level
      await prisma.user.update({
        where: { id: userId },
        data: {
          rewardPoints: { increment: levelRewards }
        }
      });
    }

    await prisma.userLevel.update({
      where: { userId },
      data: {
        level: newLevel,
        xp: newXp >= xpToNext ? newXp - xpToNext : newXp,
        xpToNext,
        totalXp: newTotalXp
      }
    });

    return { newLevel, leveledUp: newLevel > userLevel.level };
  }

  // Award badges
  static async awardBadge(userId, badgeType, metadata = {}) {
    // Check if badge type exists
    let badge = await prisma.nFTBadge.findFirst({
      where: { category: badgeType }
    });

    if (!badge) {
      // Create new badge type
      badge = await prisma.nFTBadge.create({
        data: {
          name: `${badgeType} Badge`,
          description: `Earned for ${badgeType.toLowerCase().replace('_', ' ')} achievement`,
          image: `/badges/${badgeType.toLowerCase()}.png`,
          rarity: this.getBadgeRarity(badgeType),
          category: badgeType,
          metadata: {},
          mintCondition: { type: badgeType }
        }
      });
    }

    // Check if user already has this badge
    const existingUserBadge = await prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId: badge.id } }
    });

    if (existingUserBadge) return existingUserBadge;

    // Award badge to user
    const userBadge = await prisma.userBadge.create({
      data: {
        userId,
        badgeId: badge.id,
        metadata: {
          earnedAt: new Date().toISOString(),
          ...metadata
        }
      }
    });

    return userBadge;
  }

  // Award level up badge
  static async awardLevelUpBadge(userId, level) {
    const badge = await prisma.nFTBadge.create({
      data: {
        name: `Level ${level} Master`,
        description: `Reached level ${level} in SolanaPay`,
        image: `/badges/level_${level}.png`,
        rarity: level >= 50 ? 'LEGENDARY' : level >= 25 ? 'EPIC' : level >= 10 ? 'RARE' : 'COMMON',
        category: 'MILESTONE',
        metadata: { level },
        mintCondition: { level }
      }
    });

    await prisma.userBadge.create({
      data: {
        userId,
        badgeId: badge.id,
        metadata: {
          level,
          earnedAt: new Date().toISOString()
        }
      }
    });
  }

  // Check streak milestones
  static async checkStreakMilestones(userId, streakType, count) {
    const milestones = [7, 14, 30, 50, 100, 365];
    
    if (milestones.includes(count)) {
      await this.awardBadge(userId, 'STREAK_MILESTONE', {
        streakType,
        streakCount: count
      });

      // Award bonus points
      const bonusPoints = count * 10;
      await prisma.user.update({
        where: { id: userId },
        data: {
          rewardPoints: { increment: bonusPoints }
        }
      });
    }
  }

  // Check for achievements
  static async checkAchievements(userId, activityType, metadata) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userQuests: { where: { status: 'COMPLETED' } },
        transactions: { where: { status: 'COMPLETED' } },
        userBadges: true
      }
    });

    if (!user) return;

    // First payment achievement
    if (activityType === 'PAYMENT_SENT' && user.transactions.filter(t => t.type === 'PAYMENT').length === 1) {
      await this.awardBadge(userId, 'FIRST_PAYMENT');
    }

    // Quest master achievements
    const completedQuests = user.userQuests.length;
    if ([5, 10, 25, 50, 100].includes(completedQuests)) {
      await this.awardBadge(userId, 'QUEST_MASTER', { questsCompleted: completedQuests });
    }

    // Badge collector achievements
    const badgeCount = user.userBadges.length;
    if ([5, 10, 25, 50].includes(badgeCount)) {
      await this.awardBadge(userId, 'BADGE_COLLECTOR', { badgesCollected: badgeCount });
    }
  }

  // Update leaderboards
  static async updateLeaderboards(userId, activityType, metadata) {
    // This would typically be done in batch jobs, but we can update specific entries
    const categories = ['POINTS', 'XP', 'QUESTS_COMPLETED', 'STREAK_LENGTH'];
    
    for (const category of categories) {
      // Update relevant leaderboards based on activity
      if (activityType === 'QUEST_COMPLETED' && category === 'QUESTS_COMPLETED') {
        // Update quest completion leaderboard
        await this.updateLeaderboardEntry(userId, 'GLOBAL', category, 'ALL_TIME');
      }
      
      if (activityType === 'REWARD_CLAIMED' && category === 'POINTS') {
        // Update points leaderboard
        await this.updateLeaderboardEntry(userId, 'GLOBAL', category, 'ALL_TIME');
      }
    }
  }

  // Update specific leaderboard entry
  static async updateLeaderboardEntry(userId, type, category, period) {
    const leaderboard = await prisma.leaderboard.findFirst({
      where: { type, category, period }
    });

    if (!leaderboard) return;

    // Calculate user's score for this category
    let score = 0;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userLevel: true,
        userQuests: { where: { status: 'COMPLETED' } },
        streaks: true
      }
    });

    switch (category) {
      case 'POINTS':
        score = user.rewardPoints;
        break;
      case 'XP':
        score = user.userLevel?.totalXp || 0;
        break;
      case 'QUESTS_COMPLETED':
        score = user.userQuests.length;
        break;
      case 'STREAK_LENGTH':
        score = Math.max(...user.streaks.map(s => s.currentCount), 0);
        break;
    }

    // Update or create leaderboard entry
    await prisma.leaderboardEntry.upsert({
      where: {
        leaderboardId_userId: {
          leaderboardId: leaderboard.id,
          userId
        }
      },
      update: {
        score,
        updatedAt: new Date()
      },
      create: {
        leaderboardId: leaderboard.id,
        userId,
        rank: 1, // Will be recalculated in batch job
        score
      }
    });
  }

  // Get badge rarity
  static getBadgeRarity(badgeType) {
    const rarityMap = {
      'FIRST_PAYMENT': 'COMMON',
      'QUEST_MASTER': 'EPIC',
      'BADGE_COLLECTOR': 'RARE',
      'STREAK_MILESTONE': 'RARE',
      'LEVEL_MASTER': 'LEGENDARY'
    };
    return rarityMap[badgeType] || 'COMMON';
  }

  // Initialize user gamification data
  static async initializeUser(userId) {
    try {
      // Create user level if not exists
      const existingLevel = await prisma.userLevel.findUnique({
        where: { userId }
      });

      if (!existingLevel) {
        await prisma.userLevel.create({
          data: {
            userId,
            level: 1,
            xp: 0,
            xpToNext: 100,
            totalXp: 0
          }
        });
      }

      // Award welcome badge
      await this.awardBadge(userId, 'WELCOME', {
        joinedAt: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      console.error('Error initializing user gamification:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user gamification summary
  static async getUserSummary(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          userLevel: true,
          userQuests: {
            where: { status: 'ACTIVE' },
            include: { quest: true }
          },
          streaks: { where: { isActive: true } },
          userBadges: {
            include: { badge: true }
          }
        }
      });

      if (!user) return null;

      const completedQuests = await prisma.userQuest.count({
        where: { userId, status: 'COMPLETED' }
      });

      return {
        level: user.userLevel?.level || 1,
        xp: user.userLevel?.xp || 0,
        totalXp: user.userLevel?.totalXp || 0,
        points: user.rewardPoints,
        activeQuests: user.userQuests.length,
        completedQuests,
        activeStreaks: user.streaks.length,
        longestStreak: Math.max(...user.streaks.map(s => s.maxCount), 0),
        badges: user.userBadges.length,
        mintedNFTs: user.userBadges.filter(b => b.tokenId).length
      };
    } catch (error) {
      console.error('Error getting user summary:', error);
      return null;
    }
  }
}

module.exports = GamificationIntegration;
