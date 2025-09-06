const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

// Leaderboard Service for managing rankings
class LeaderboardService {
  static async updateLeaderboard(type, category, period = 'ALL_TIME') {
    const leaderboard = await prisma.leaderboard.findFirst({
      where: { type, category, period }
    });

    let leaderboardId = leaderboard?.id;
    if (!leaderboard) {
      const newLeaderboard = await prisma.leaderboard.create({
        data: { type, category, period }
      });
      leaderboardId = newLeaderboard.id;
    }

    // Calculate scores based on category
    let userScores = [];
    
    switch (category) {
      case 'POINTS':
        userScores = await this.calculatePointsLeaderboard(period);
        break;
      case 'XP':
        userScores = await this.calculateXPLeaderboard(period);
        break;
      case 'QUESTS_COMPLETED':
        userScores = await this.calculateQuestsLeaderboard(period);
        break;
      case 'STREAK_LENGTH':
        userScores = await this.calculateStreakLeaderboard(period);
        break;
      case 'EARNINGS':
        userScores = await this.calculateEarningsLeaderboard(period);
        break;
      default:
        throw new Error(`Unknown category: ${category}`);
    }

    // Clear existing entries
    await prisma.leaderboardEntry.deleteMany({
      where: { leaderboardId }
    });

    // Insert new entries
    for (let i = 0; i < userScores.length; i++) {
      const userScore = userScores[i];
      await prisma.leaderboardEntry.create({
        data: {
          leaderboardId,
          userId: userScore.userId,
          rank: i + 1,
          score: userScore.score,
          metadata: userScore.metadata || {}
        }
      });
    }

    return leaderboardId;
  }

  static async calculatePointsLeaderboard(period) {
    const dateFilter = this.getDateFilter(period);
    
    if (period === 'ALL_TIME') {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          rewardPoints: true
        },
        orderBy: { rewardPoints: 'desc' },
        take: 100
      });

      return users.map(user => ({
        userId: user.id,
        score: user.rewardPoints,
        metadata: { totalPoints: user.rewardPoints }
      }));
    } else {
      // Calculate points earned in period from activities
      const pointsData = await prisma.userActivity.groupBy({
        by: ['userId'],
        where: {
          activityType: { in: ['REWARD_CLAIMED', 'QUEST_COMPLETED'] },
          timestamp: dateFilter
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 100
      });

      return pointsData.map(data => ({
        userId: data.userId,
        score: data._sum.amount || 0,
        metadata: { pointsInPeriod: data._sum.amount || 0 }
      }));
    }
  }

  static async calculateXPLeaderboard(period) {
    if (period === 'ALL_TIME') {
      const users = await prisma.userLevel.findMany({
        select: {
          userId: true,
          totalXp: true,
          level: true
        },
        orderBy: { totalXp: 'desc' },
        take: 100
      });

      return users.map(user => ({
        userId: user.userId,
        score: user.totalXp,
        metadata: { level: user.level, totalXp: user.totalXp }
      }));
    } else {
      // For period-based XP, we'd need to track XP gains in activities
      // For now, return all-time data
      return this.calculateXPLeaderboard('ALL_TIME');
    }
  }

  static async calculateQuestsLeaderboard(period) {
    const dateFilter = this.getDateFilter(period);
    
    const questData = await prisma.userQuest.groupBy({
      by: ['userId'],
      where: {
        status: 'COMPLETED',
        completedAt: dateFilter
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 100
    });

    return questData.map(data => ({
      userId: data.userId,
      score: data._count.id,
      metadata: { questsCompleted: data._count.id }
    }));
  }

  static async calculateStreakLeaderboard(period) {
    const streaks = await prisma.streak.findMany({
      where: { isActive: true },
      include: {
        user: { select: { id: true } }
      },
      orderBy: { currentCount: 'desc' },
      take: 100
    });

    // Group by user and take their best streak
    const userStreaks = {};
    streaks.forEach(streak => {
      const userId = streak.userId;
      if (!userStreaks[userId] || userStreaks[userId].currentCount < streak.currentCount) {
        userStreaks[userId] = streak;
      }
    });

    return Object.values(userStreaks).map(streak => ({
      userId: streak.userId,
      score: streak.currentCount,
      metadata: { 
        streakType: streak.type,
        maxStreak: streak.maxCount,
        multiplier: streak.multiplier
      }
    }));
  }

  static async calculateEarningsLeaderboard(period) {
    const dateFilter = this.getDateFilter(period);
    
    if (period === 'ALL_TIME') {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          totalEarnings: true
        },
        orderBy: { totalEarnings: 'desc' },
        take: 100
      });

      return users.map(user => ({
        userId: user.id,
        score: user.totalEarnings,
        metadata: { totalEarnings: user.totalEarnings }
      }));
    } else {
      const earningsData = await prisma.transaction.groupBy({
        by: ['userId'],
        where: {
          type: { in: ['PAYMENT', 'REWARD'] },
          status: 'COMPLETED',
          createdAt: dateFilter
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 100
      });

      return earningsData.map(data => ({
        userId: data.userId,
        score: data._sum.amount || 0,
        metadata: { earningsInPeriod: data._sum.amount || 0 }
      }));
    }
  }

  static getDateFilter(period) {
    const now = new Date();
    
    switch (period) {
      case 'DAILY':
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        return { gte: today };
        
      case 'WEEKLY':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        return { gte: weekStart };
        
      case 'MONTHLY':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return { gte: monthStart };
        
      default:
        return undefined; // ALL_TIME
    }
  }
}

// Get leaderboard
router.get('/:type/:category', async (req, res) => {
  try {
    const { type, category } = req.params;
    const { period = 'ALL_TIME', limit = 50 } = req.query;

    const leaderboard = await prisma.leaderboard.findFirst({
      where: { 
        type: type.toUpperCase(), 
        category: category.toUpperCase(), 
        period: period.toUpperCase() 
      },
      include: {
        entries: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                tier: true
              }
            }
          },
          orderBy: { rank: 'asc' },
          take: parseInt(limit)
        }
      }
    });

    if (!leaderboard) {
      // Generate leaderboard if it doesn't exist
      const leaderboardId = await LeaderboardService.updateLeaderboard(
        type.toUpperCase(), 
        category.toUpperCase(), 
        period.toUpperCase()
      );

      return res.redirect(`/api/leaderboards/${type}/${category}?period=${period}&limit=${limit}`);
    }

    res.json({
      success: true,
      data: {
        leaderboard: {
          id: leaderboard.id,
          type: leaderboard.type,
          category: leaderboard.category,
          period: leaderboard.period,
          updatedAt: leaderboard.updatedAt
        },
        entries: leaderboard.entries
      }
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboard'
    });
  }
});

// Get user's rank in leaderboard
router.get('/:type/:category/rank/:userId', async (req, res) => {
  try {
    const { type, category, userId } = req.params;
    const { period = 'ALL_TIME' } = req.query;

    const leaderboard = await prisma.leaderboard.findFirst({
      where: { 
        type: type.toUpperCase(), 
        category: category.toUpperCase(), 
        period: period.toUpperCase() 
      }
    });

    if (!leaderboard) {
      return res.status(404).json({
        success: false,
        message: 'Leaderboard not found'
      });
    }

    const entry = await prisma.leaderboardEntry.findUnique({
      where: { 
        leaderboardId_userId: { 
          leaderboardId: leaderboard.id, 
          userId 
        } 
      },
      include: {
        user: {
          select: {
            username: true,
            avatar: true,
            tier: true
          }
        }
      }
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'User not found in leaderboard'
      });
    }

    // Get total entries count
    const totalEntries = await prisma.leaderboardEntry.count({
      where: { leaderboardId: leaderboard.id }
    });

    res.json({
      success: true,
      data: {
        rank: entry.rank,
        score: entry.score,
        user: entry.user,
        metadata: entry.metadata,
        totalEntries,
        percentile: Math.round(((totalEntries - entry.rank + 1) / totalEntries) * 100)
      }
    });
  } catch (error) {
    console.error('Error fetching user rank:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user rank'
    });
  }
});

// Update leaderboard (admin or cron job)
router.post('/:type/:category/update', async (req, res) => {
  try {
    const { type, category } = req.params;
    const { period = 'ALL_TIME' } = req.body;

    const leaderboardId = await LeaderboardService.updateLeaderboard(
      type.toUpperCase(), 
      category.toUpperCase(), 
      period.toUpperCase()
    );

    res.json({
      success: true,
      message: 'Leaderboard updated successfully',
      leaderboardId
    });
  } catch (error) {
    console.error('Error updating leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update leaderboard'
    });
  }
});

// Get multiple leaderboards (dashboard view)
router.get('/dashboard', async (req, res) => {
  try {
    const { period = 'ALL_TIME', limit = 10 } = req.query;

    const leaderboards = await Promise.all([
      // Points leaderboard
      prisma.leaderboard.findFirst({
        where: { type: 'GLOBAL', category: 'POINTS', period: period.toUpperCase() },
        include: {
          entries: {
            include: {
              user: { select: { id: true, username: true, avatar: true } }
            },
            orderBy: { rank: 'asc' },
            take: parseInt(limit)
          }
        }
      }),
      // XP leaderboard
      prisma.leaderboard.findFirst({
        where: { type: 'GLOBAL', category: 'XP', period: period.toUpperCase() },
        include: {
          entries: {
            include: {
              user: { select: { id: true, username: true, avatar: true } }
            },
            orderBy: { rank: 'asc' },
            take: parseInt(limit)
          }
        }
      }),
      // Quests leaderboard
      prisma.leaderboard.findFirst({
        where: { type: 'GLOBAL', category: 'QUESTS_COMPLETED', period: period.toUpperCase() },
        include: {
          entries: {
            include: {
              user: { select: { id: true, username: true, avatar: true } }
            },
            orderBy: { rank: 'asc' },
            take: parseInt(limit)
          }
        }
      }),
      // Streaks leaderboard
      prisma.leaderboard.findFirst({
        where: { type: 'GLOBAL', category: 'STREAK_LENGTH', period: period.toUpperCase() },
        include: {
          entries: {
            include: {
              user: { select: { id: true, username: true, avatar: true } }
            },
            orderBy: { rank: 'asc' },
            take: parseInt(limit)
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        points: leaderboards[0],
        xp: leaderboards[1],
        quests: leaderboards[2],
        streaks: leaderboards[3]
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard leaderboards:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard leaderboards'
    });
  }
});

// Update all leaderboards (cron job)
router.post('/update-all', async (req, res) => {
  try {
    const categories = ['POINTS', 'XP', 'QUESTS_COMPLETED', 'STREAK_LENGTH', 'EARNINGS'];
    const periods = ['DAILY', 'WEEKLY', 'MONTHLY', 'ALL_TIME'];

    const updatePromises = [];
    
    for (const category of categories) {
      for (const period of periods) {
        updatePromises.push(
          LeaderboardService.updateLeaderboard('GLOBAL', category, period)
        );
      }
    }

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: `Updated ${updatePromises.length} leaderboards`
    });
  } catch (error) {
    console.error('Error updating all leaderboards:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update leaderboards'
    });
  }
});

module.exports = router;
