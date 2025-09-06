const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

// Streak Service for managing user streaks
class StreakService {
  static async updateStreak(userId, streakType) {
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
        // Already updated today, no change needed
        return streak;
      } else if (lastActivityDate.getTime() === yesterday.getTime()) {
        // Consecutive day, increment streak
        const newCount = streak.currentCount + 1;
        const newMaxCount = Math.max(streak.maxCount, newCount);
        const newMultiplier = Math.min(1.0 + (newCount * 0.1), 3.0); // Max 3x multiplier

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
        // Streak broken, reset to 1
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

  static async checkStreakMilestones(userId, streakType, count) {
    const milestones = [7, 14, 30, 50, 100, 365];
    
    if (milestones.includes(count)) {
      // Award milestone badge
      const badgeData = {
        name: `${count}-Day ${streakType} Streak`,
        description: `Maintained a ${count}-day streak in ${streakType.toLowerCase().replace('_', ' ')}`,
        image: `/badges/streak_${streakType.toLowerCase()}_${count}.png`,
        rarity: this.getStreakRarity(count),
        category: 'STREAK',
        metadata: {
          streakType,
          streakCount: count,
          earnedAt: new Date().toISOString()
        },
        mintCondition: { streakType, minCount: count }
      };

      const badge = await prisma.nFTBadge.create({ data: badgeData });

      await prisma.userBadge.create({
        data: {
          userId,
          badgeId: badge.id,
          metadata: {
            streakType,
            streakCount: count,
            earnedAt: new Date().toISOString(),
            rank: 0,
            rewardsEarned: 0
          }
        }
      });

      // Award bonus points for milestone
      const bonusPoints = count * 10;
      await prisma.user.update({
        where: { id: userId },
        data: {
          rewardPoints: { increment: bonusPoints }
        }
      });
    }
  }

  static getStreakRarity(count) {
    if (count >= 365) return 'MYTHIC';
    if (count >= 100) return 'LEGENDARY';
    if (count >= 50) return 'EPIC';
    if (count >= 30) return 'RARE';
    return 'COMMON';
  }

  static async getStreakMultiplier(userId, streakType) {
    const streak = await prisma.streak.findUnique({
      where: { userId_type: { userId, type: streakType } }
    });
    return streak?.multiplier || 1.0;
  }

  static async checkAndUpdateAllStreaks(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check all streak types for potential breaks
    const streaks = await prisma.streak.findMany({
      where: { userId, isActive: true }
    });

    for (const streak of streaks) {
      const lastActivityDate = new Date(streak.lastActivity);
      lastActivityDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((today - lastActivityDate) / (1000 * 60 * 60 * 24));

      if (daysDiff > 1) {
        // Streak broken, deactivate
        await prisma.streak.update({
          where: { id: streak.id },
          data: {
            isActive: false,
            currentCount: 0,
            multiplier: 1.0
          }
        });
      }
    }
  }
}

// Get user streaks
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const streaks = await prisma.streak.findMany({
      where: { userId },
      orderBy: { currentCount: 'desc' }
    });

    // Calculate streak statistics
    const stats = {
      totalActiveStreaks: streaks.filter(s => s.isActive).length,
      longestCurrentStreak: Math.max(...streaks.map(s => s.currentCount), 0),
      longestEverStreak: Math.max(...streaks.map(s => s.maxCount), 0),
      totalStreakDays: streaks.reduce((sum, s) => sum + s.maxCount, 0)
    };

    res.json({
      success: true,
      data: {
        streaks,
        stats
      }
    });
  } catch (error) {
    console.error('Error fetching streaks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch streaks'
    });
  }
});

// Update streak (called by activity tracking)
router.post('/update', authMiddleware, async (req, res) => {
  try {
    const { streakType } = req.body;
    const userId = req.user.id;

    if (!streakType) {
      return res.status(400).json({
        success: false,
        message: 'Streak type is required'
      });
    }

    const validTypes = ['LOGIN', 'PAYMENT', 'TASK_COMPLETION', 'QUEST_COMPLETION'];
    if (!validTypes.includes(streakType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid streak type'
      });
    }

    const streak = await StreakService.updateStreak(userId, streakType);

    res.json({
      success: true,
      data: streak,
      message: `${streakType} streak updated`
    });
  } catch (error) {
    console.error('Error updating streak:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update streak'
    });
  }
});

// Get streak leaderboard
router.get('/leaderboard/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { limit = 10 } = req.query;

    const topStreaks = await prisma.streak.findMany({
      where: { 
        type: type.toUpperCase(),
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        }
      },
      orderBy: { currentCount: 'desc' },
      take: parseInt(limit)
    });

    res.json({
      success: true,
      data: topStreaks.map((streak, index) => ({
        rank: index + 1,
        user: streak.user,
        streakCount: streak.currentCount,
        maxStreak: streak.maxCount,
        multiplier: streak.multiplier,
        lastActivity: streak.lastActivity
      }))
    });
  } catch (error) {
    console.error('Error fetching streak leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch streak leaderboard'
    });
  }
});

// Get streak multiplier for rewards
router.get('/multiplier/:type', authMiddleware, async (req, res) => {
  try {
    const { type } = req.params;
    const userId = req.user.id;

    const multiplier = await StreakService.getStreakMultiplier(userId, type.toUpperCase());

    res.json({
      success: true,
      data: {
        streakType: type.toUpperCase(),
        multiplier
      }
    });
  } catch (error) {
    console.error('Error fetching streak multiplier:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch streak multiplier'
    });
  }
});

// Check for broken streaks (cron job endpoint)
router.post('/check-breaks', async (req, res) => {
  try {
    // This would typically be called by a cron job
    const users = await prisma.user.findMany({
      select: { id: true }
    });

    for (const user of users) {
      await StreakService.checkAndUpdateAllStreaks(user.id);
    }

    res.json({
      success: true,
      message: `Checked streaks for ${users.length} users`
    });
  } catch (error) {
    console.error('Error checking streak breaks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check streak breaks'
    });
  }
});

// Get streak history
router.get('/history/:type', authMiddleware, async (req, res) => {
  try {
    const { type } = req.params;
    const userId = req.user.id;
    const { days = 30 } = req.query;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get user activities for the streak type
    const activities = await prisma.userActivity.findMany({
      where: {
        userId,
        activityType: type.toUpperCase(),
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { timestamp: 'asc' }
    });

    // Group activities by day
    const dailyActivity = {};
    activities.forEach(activity => {
      const date = activity.timestamp.toISOString().split('T')[0];
      dailyActivity[date] = (dailyActivity[date] || 0) + 1;
    });

    // Generate streak history
    const history = [];
    for (let i = 0; i < parseInt(days); i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      history.push({
        date: dateStr,
        hasActivity: !!dailyActivity[dateStr],
        activityCount: dailyActivity[dateStr] || 0
      });
    }

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error fetching streak history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch streak history'
    });
  }
});

module.exports = router;
