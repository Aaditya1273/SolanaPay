const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

// Quest Service for dynamic quest generation and management
class QuestService {
  static async generateDailyQuests(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { userLevel: true, streaks: true }
    });

    const dailyQuests = [
      {
        title: "Daily Login Streak",
        description: "Log in to VPay today to maintain your streak",
        type: "DAILY",
        category: "STREAK",
        difficulty: "EASY",
        requirements: { type: "LOGIN", count: 1 },
        rewards: { points: 10, xp: 5 },
        pointsReward: 10,
        xpReward: 5
      },
      {
        title: "Make a Payment",
        description: "Send a payment to another user",
        type: "DAILY",
        category: "PAYMENT",
        difficulty: "EASY",
        requirements: { type: "PAYMENT_SENT", count: 1 },
        rewards: { points: 25, xp: 15 },
        pointsReward: 25,
        xpReward: 15
      },
      {
        title: "Complete a Task",
        description: "Successfully complete any task",
        type: "DAILY",
        category: "TASK",
        difficulty: "MEDIUM",
        requirements: { type: "TASK_COMPLETED", count: 1 },
        rewards: { points: 50, xp: 30 },
        pointsReward: 50,
        xpReward: 30
      }
    ];

    // Add level-appropriate quests
    if (user?.userLevel?.level >= 5) {
      dailyQuests.push({
        title: "Mentor a Newcomer",
        description: "Help a new user by completing a task together",
        type: "DAILY",
        category: "SOCIAL",
        difficulty: "HARD",
        requirements: { type: "MENTOR_HELP", count: 1 },
        rewards: { points: 100, xp: 75, badge: "MENTOR" },
        pointsReward: 100,
        xpReward: 75
      });
    }

    return dailyQuests;
  }

  static async generateWeeklyQuests(userId) {
    return [
      {
        title: "Payment Master",
        description: "Send 10 payments this week",
        type: "WEEKLY",
        category: "PAYMENT",
        difficulty: "MEDIUM",
        requirements: { type: "PAYMENT_SENT", count: 10 },
        rewards: { points: 200, xp: 150, badge: "PAYMENT_MASTER" },
        pointsReward: 200,
        xpReward: 150
      },
      {
        title: "Task Completionist",
        description: "Complete 5 tasks this week",
        type: "WEEKLY",
        category: "TASK",
        difficulty: "HARD",
        requirements: { type: "TASK_COMPLETED", count: 5 },
        rewards: { points: 500, xp: 300, badge: "COMPLETIONIST" },
        pointsReward: 500,
        xpReward: 300
      },
      {
        title: "Streak Keeper",
        description: "Maintain a 7-day login streak",
        type: "WEEKLY",
        category: "STREAK",
        difficulty: "MEDIUM",
        requirements: { type: "LOGIN_STREAK", count: 7 },
        rewards: { points: 300, xp: 200, badge: "STREAK_KEEPER" },
        pointsReward: 300,
        xpReward: 200
      }
    ];
  }

  static async checkQuestCompletion(userId, questId) {
    const userQuest = await prisma.userQuest.findUnique({
      where: { userId_questId: { userId, questId } },
      include: { quest: true }
    });

    if (!userQuest || userQuest.status !== 'ACTIVE') {
      return false;
    }

    const quest = userQuest.quest;
    const requirements = quest.requirements;
    const progress = userQuest.progress || {};

    // Check if quest requirements are met
    const currentCount = progress[requirements.type] || 0;
    if (currentCount >= requirements.count) {
      // Complete the quest
      await prisma.userQuest.update({
        where: { id: userQuest.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      });

      // Award rewards
      await this.awardQuestRewards(userId, quest);
      return true;
    }

    return false;
  }

  static async awardQuestRewards(userId, quest) {
    // Award points and XP
    await prisma.user.update({
      where: { id: userId },
      data: {
        rewardPoints: { increment: quest.pointsReward }
      }
    });

    // Update user level and XP
    const userLevel = await prisma.userLevel.findUnique({
      where: { userId }
    });

    if (userLevel) {
      const newXp = userLevel.xp + quest.xpReward;
      const newTotalXp = userLevel.totalXp + quest.xpReward;
      let newLevel = userLevel.level;
      let xpToNext = userLevel.xpToNext;

      // Check for level up
      if (newXp >= xpToNext) {
        newLevel += 1;
        const remainingXp = newXp - xpToNext;
        xpToNext = Math.floor(100 * Math.pow(1.5, newLevel - 1)); // Exponential XP curve
        
        await prisma.userLevel.update({
          where: { userId },
          data: {
            level: newLevel,
            xp: remainingXp,
            xpToNext,
            totalXp: newTotalXp
          }
        });

        // Award level up badge
        await this.awardLevelUpBadge(userId, newLevel);
      } else {
        await prisma.userLevel.update({
          where: { userId },
          data: {
            xp: newXp,
            totalXp: newTotalXp
          }
        });
      }
    }

    // Award badges if specified in rewards
    if (quest.rewards.badge) {
      await this.awardBadge(userId, quest.rewards.badge, quest);
    }
  }

  static async awardBadge(userId, badgeType, quest) {
    // Check if badge already exists
    const existingBadge = await prisma.nFTBadge.findFirst({
      where: { category: badgeType }
    });

    let badge = existingBadge;
    if (!badge) {
      // Create new badge
      badge = await prisma.nFTBadge.create({
        data: {
          name: `${badgeType} Badge`,
          description: `Earned by completing: ${quest.title}`,
          image: `/badges/${badgeType.toLowerCase()}.png`,
          rarity: this.getBadgeRarity(badgeType),
          category: badgeType,
          metadata: {
            questId: quest.id,
            questTitle: quest.title,
            earnedAt: new Date().toISOString()
          },
          mintCondition: { questType: badgeType }
        }
      });
    }

    // Award badge to user
    await prisma.userBadge.create({
      data: {
        userId,
        badgeId: badge.id,
        metadata: {
          questCompleted: quest.title,
          earnedAt: new Date().toISOString(),
          streakCount: 0,
          rank: 0,
          rewardsEarned: quest.pointsReward
        }
      }
    });
  }

  static async awardLevelUpBadge(userId, level) {
    const badge = await prisma.nFTBadge.create({
      data: {
        name: `Level ${level} Master`,
        description: `Reached level ${level} in VPay`,
        image: `/badges/level_${level}.png`,
        rarity: level >= 50 ? 'LEGENDARY' : level >= 25 ? 'EPIC' : level >= 10 ? 'RARE' : 'COMMON',
        category: 'MILESTONE',
        metadata: {
          level,
          earnedAt: new Date().toISOString()
        },
        mintCondition: { level }
      }
    });

    await prisma.userBadge.create({
      data: {
        userId,
        badgeId: badge.id,
        metadata: {
          level,
          earnedAt: new Date().toISOString(),
          streakCount: 0,
          rank: 0,
          rewardsEarned: 0
        }
      }
    });
  }

  static getBadgeRarity(badgeType) {
    const rarityMap = {
      'MENTOR': 'EPIC',
      'PAYMENT_MASTER': 'RARE',
      'COMPLETIONIST': 'EPIC',
      'STREAK_KEEPER': 'RARE',
      'FIRST_PAYMENT': 'COMMON',
      'TASK_MASTER': 'LEGENDARY'
    };
    return rarityMap[badgeType] || 'COMMON';
  }
}

// Get all available quests for user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get active quests
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

    // Generate new daily quests if none exist
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayQuests = activeQuests.filter(uq => 
      uq.quest.type === 'DAILY' && 
      uq.startedAt >= today
    );

    if (todayQuests.length === 0) {
      const dailyQuests = await QuestService.generateDailyQuests(userId);
      
      for (const questData of dailyQuests) {
        // Create quest if it doesn't exist
        let quest = await prisma.quest.findFirst({
          where: { 
            title: questData.title,
            type: 'DAILY'
          }
        });

        if (!quest) {
          quest = await prisma.quest.create({ data: questData });
        }

        // Assign to user
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        await prisma.userQuest.create({
          data: {
            userId,
            questId: quest.id,
            expiresAt: tomorrow,
            progress: {}
          }
        });
      }
    }

    // Get updated active quests
    const allActiveQuests = await prisma.userQuest.findMany({
      where: { 
        userId,
        status: 'ACTIVE',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: { quest: true },
      orderBy: { startedAt: 'desc' }
    });

    res.json({
      success: true,
      data: allActiveQuests
    });
  } catch (error) {
    console.error('Error fetching quests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quests'
    });
  }
});

// Get quest progress
router.get('/:questId/progress', authMiddleware, async (req, res) => {
  try {
    const { questId } = req.params;
    const userId = req.user.id;

    const userQuest = await prisma.userQuest.findUnique({
      where: { userId_questId: { userId, questId } },
      include: { quest: true }
    });

    if (!userQuest) {
      return res.status(404).json({
        success: false,
        message: 'Quest not found'
      });
    }

    const progress = userQuest.progress || {};
    const requirements = userQuest.quest.requirements;
    const currentCount = progress[requirements.type] || 0;
    const progressPercentage = Math.min((currentCount / requirements.count) * 100, 100);

    res.json({
      success: true,
      data: {
        questId,
        status: userQuest.status,
        progress: currentCount,
        required: requirements.count,
        percentage: progressPercentage,
        isCompleted: userQuest.status === 'COMPLETED'
      }
    });
  } catch (error) {
    console.error('Error fetching quest progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quest progress'
    });
  }
});

// Update quest progress (called by activity tracking)
router.post('/:questId/progress', authMiddleware, async (req, res) => {
  try {
    const { questId } = req.params;
    const { activityType, increment = 1 } = req.body;
    const userId = req.user.id;

    const userQuest = await prisma.userQuest.findUnique({
      where: { userId_questId: { userId, questId } },
      include: { quest: true }
    });

    if (!userQuest || userQuest.status !== 'ACTIVE') {
      return res.status(404).json({
        success: false,
        message: 'Active quest not found'
      });
    }

    const progress = userQuest.progress || {};
    const currentCount = progress[activityType] || 0;
    const newCount = currentCount + increment;

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
    const isCompleted = await QuestService.checkQuestCompletion(userId, questId);

    res.json({
      success: true,
      data: {
        progress: newCount,
        isCompleted,
        message: isCompleted ? 'Quest completed!' : 'Progress updated'
      }
    });
  } catch (error) {
    console.error('Error updating quest progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update quest progress'
    });
  }
});

// Get completed quests
router.get('/completed', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const completedQuests = await prisma.userQuest.findMany({
      where: { 
        userId,
        status: 'COMPLETED'
      },
      include: { quest: true },
      orderBy: { completedAt: 'desc' },
      skip: (page - 1) * limit,
      take: parseInt(limit)
    });

    const total = await prisma.userQuest.count({
      where: { 
        userId,
        status: 'COMPLETED'
      }
    });

    res.json({
      success: true,
      data: completedQuests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching completed quests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch completed quests'
    });
  }
});

// Generate weekly quests (admin or cron job)
router.post('/generate/weekly', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const weeklyQuests = await QuestService.generateWeeklyQuests(userId);

    for (const questData of weeklyQuests) {
      let quest = await prisma.quest.findFirst({
        where: { 
          title: questData.title,
          type: 'WEEKLY'
        }
      });

      if (!quest) {
        quest = await prisma.quest.create({ data: questData });
      }

      // Check if user already has this weekly quest
      const existingUserQuest = await prisma.userQuest.findFirst({
        where: {
          userId,
          questId: quest.id,
          status: 'ACTIVE'
        }
      });

      if (!existingUserQuest) {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);

        await prisma.userQuest.create({
          data: {
            userId,
            questId: quest.id,
            expiresAt: nextWeek,
            progress: {}
          }
        });
      }
    }

    res.json({
      success: true,
      message: 'Weekly quests generated successfully'
    });
  } catch (error) {
    console.error('Error generating weekly quests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate weekly quests'
    });
  }
});

module.exports = router;
