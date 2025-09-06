const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

// NFT Badge Service for dynamic metadata generation
class NFTBadgeService {
  static async generateBadgeMetadata(userId, badge, userBadge) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userLevel: true,
        streaks: true,
        userQuests: { where: { status: 'COMPLETED' } }
      }
    });

    const baseMetadata = {
      name: badge.name,
      description: badge.description,
      image: badge.image,
      external_url: `https://SolanaPay.app/badges/${badge.id}`,
      attributes: [
        {
          trait_type: "Rarity",
          value: badge.rarity
        },
        {
          trait_type: "Category",
          value: badge.category
        },
        {
          trait_type: "Earned Date",
          value: userBadge.mintedAt.toISOString().split('T')[0]
        }
      ]
    };

    // Add dynamic attributes based on badge category
    switch (badge.category) {
      case 'STREAK':
        const streakData = userBadge.metadata;
        baseMetadata.attributes.push(
          {
            trait_type: "Streak Count",
            value: streakData.streakCount || 0,
            display_type: "number"
          },
          {
            trait_type: "Streak Type",
            value: streakData.streakType || "UNKNOWN"
          }
        );
        break;

      case 'MILESTONE':
        const level = userBadge.metadata.level || user?.userLevel?.level || 1;
        baseMetadata.attributes.push(
          {
            trait_type: "Level Achieved",
            value: level,
            display_type: "number"
          },
          {
            trait_type: "Total XP",
            value: user?.userLevel?.totalXp || 0,
            display_type: "number"
          }
        );
        break;

      case 'QUEST':
        const questsCompleted = user?.userQuests?.length || 0;
        baseMetadata.attributes.push(
          {
            trait_type: "Quests Completed",
            value: questsCompleted,
            display_type: "number"
          },
          {
            trait_type: "Quest Category",
            value: userBadge.metadata.questCategory || "GENERAL"
          }
        );
        break;

      case 'ACHIEVEMENT':
        baseMetadata.attributes.push(
          {
            trait_type: "Achievement Type",
            value: userBadge.metadata.achievementType || "GENERAL"
          },
          {
            trait_type: "Points Earned",
            value: userBadge.metadata.rewardsEarned || 0,
            display_type: "number"
          }
        );
        break;
    }

    // Add user stats
    baseMetadata.attributes.push(
      {
        trait_type: "User Level",
        value: user?.userLevel?.level || 1,
        display_type: "number"
      },
      {
        trait_type: "Total Points",
        value: user?.rewardPoints || 0,
        display_type: "number"
      },
      {
        trait_type: "User Tier",
        value: user?.tier || "Bronze"
      }
    );

    return baseMetadata;
  }

  static async mintBadgeNFT(userId, badgeId) {
    // This would integrate with actual NFT minting contract
    // For now, we'll simulate the minting process
    
    const userBadge = await prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId } },
      include: { badge: true }
    });

    if (!userBadge) {
      throw new Error('User badge not found');
    }

    // Generate dynamic metadata
    const metadata = await this.generateBadgeMetadata(userId, userBadge.badge, userBadge);

    // Simulate minting (in real implementation, this would call smart contract)
    const tokenId = `${badgeId}_${userId}_${Date.now()}`;
    const contractAddress = process.env.NFT_BADGE_CONTRACT_ADDRESS || '0x1234...';
    const txHash = `0x${Math.random().toString(16).substr(2, 64)}`;

    // Update user badge with minting info
    await prisma.userBadge.update({
      where: { id: userBadge.id },
      data: {
        tokenId,
        contractAddress,
        txHash,
        metadata
      }
    });

    return {
      tokenId,
      contractAddress,
      txHash,
      metadata
    };
  }

  static getRarityScore(rarity) {
    const scores = {
      'COMMON': 1,
      'RARE': 2,
      'EPIC': 3,
      'LEGENDARY': 4,
      'MYTHIC': 5
    };
    return scores[rarity] || 1;
  }
}

// Get all available badges
router.get('/', async (req, res) => {
  try {
    const { category, rarity, isActive = true } = req.query;
    
    const filters = { isActive: isActive === 'true' };
    if (category) filters.category = category.toUpperCase();
    if (rarity) filters.rarity = rarity.toUpperCase();

    const badges = await prisma.nFTBadge.findMany({
      where: filters,
      orderBy: [
        { rarity: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    res.json({
      success: true,
      data: badges
    });
  } catch (error) {
    console.error('Error fetching badges:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch badges'
    });
  }
});

// Get user's badges
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { category, rarity, minted } = req.query;

    const filters = { userId };
    if (minted === 'true') filters.tokenId = { not: null };
    if (minted === 'false') filters.tokenId = null;

    const userBadges = await prisma.userBadge.findMany({
      where: filters,
      include: {
        badge: {
          where: {
            ...(category && { category: category.toUpperCase() }),
            ...(rarity && { rarity: rarity.toUpperCase() })
          }
        }
      },
      orderBy: { mintedAt: 'desc' }
    });

    // Filter out badges that don't match badge criteria
    const filteredBadges = userBadges.filter(ub => ub.badge);

    res.json({
      success: true,
      data: filteredBadges
    });
  } catch (error) {
    console.error('Error fetching user badges:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user badges'
    });
  }
});

// Get user's badge collection stats
router.get('/user/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;

    const stats = await prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true }
    });

    const collection = {
      total: stats.length,
      minted: stats.filter(b => b.tokenId).length,
      byRarity: {},
      byCategory: {},
      rarityScore: 0
    };

    stats.forEach(userBadge => {
      const rarity = userBadge.badge.rarity;
      const category = userBadge.badge.category;

      collection.byRarity[rarity] = (collection.byRarity[rarity] || 0) + 1;
      collection.byCategory[category] = (collection.byCategory[category] || 0) + 1;
      collection.rarityScore += NFTBadgeService.getRarityScore(rarity);
    });

    res.json({
      success: true,
      data: collection
    });
  } catch (error) {
    console.error('Error fetching badge stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch badge stats'
    });
  }
});

// Mint badge as NFT
router.post('/:badgeId/mint', authMiddleware, async (req, res) => {
  try {
    const { badgeId } = req.params;
    const userId = req.user.id;

    // Check if user owns this badge
    const userBadge = await prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId } }
    });

    if (!userBadge) {
      return res.status(404).json({
        success: false,
        message: 'Badge not found in your collection'
      });
    }

    if (userBadge.tokenId) {
      return res.status(400).json({
        success: false,
        message: 'Badge already minted as NFT'
      });
    }

    const mintResult = await NFTBadgeService.mintBadgeNFT(userId, badgeId);

    res.json({
      success: true,
      data: mintResult,
      message: 'Badge minted as NFT successfully'
    });
  } catch (error) {
    console.error('Error minting badge:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mint badge as NFT'
    });
  }
});

// Get badge metadata (for NFT standards)
router.get('/:badgeId/metadata/:userId', async (req, res) => {
  try {
    const { badgeId, userId } = req.params;

    const userBadge = await prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId } },
      include: { badge: true }
    });

    if (!userBadge) {
      return res.status(404).json({
        success: false,
        message: 'Badge not found'
      });
    }

    const metadata = await NFTBadgeService.generateBadgeMetadata(userId, userBadge.badge, userBadge);

    res.json(metadata);
  } catch (error) {
    console.error('Error generating badge metadata:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate badge metadata'
    });
  }
});

// Get badge leaderboard (most badges collected)
router.get('/leaderboard', async (req, res) => {
  try {
    const { category, rarity, limit = 10 } = req.query;

    let badgeFilter = {};
    if (category) badgeFilter.category = category.toUpperCase();
    if (rarity) badgeFilter.rarity = rarity.toUpperCase();

    const userBadgeCounts = await prisma.userBadge.groupBy({
      by: ['userId'],
      where: {
        badge: badgeFilter
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: parseInt(limit)
    });

    // Get user details
    const leaderboard = await Promise.all(
      userBadgeCounts.map(async (entry, index) => {
        const user = await prisma.user.findUnique({
          where: { id: entry.userId },
          select: {
            id: true,
            username: true,
            avatar: true,
            tier: true
          }
        });

        // Calculate rarity score
        const userBadges = await prisma.userBadge.findMany({
          where: { 
            userId: entry.userId,
            badge: badgeFilter
          },
          include: { badge: true }
        });

        const rarityScore = userBadges.reduce((sum, ub) => 
          sum + NFTBadgeService.getRarityScore(ub.badge.rarity), 0
        );

        return {
          rank: index + 1,
          user,
          badgeCount: entry._count.id,
          rarityScore
        };
      })
    );

    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    console.error('Error fetching badge leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch badge leaderboard'
    });
  }
});

// Create new badge (admin)
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const {
      name,
      description,
      image,
      rarity = 'COMMON',
      category,
      metadata = {},
      mintCondition = {}
    } = req.body;

    // Validate required fields
    if (!name || !description || !category) {
      return res.status(400).json({
        success: false,
        message: 'Name, description, and category are required'
      });
    }

    const badge = await prisma.nFTBadge.create({
      data: {
        name,
        description,
        image: image || `/badges/${category.toLowerCase()}_${rarity.toLowerCase()}.png`,
        rarity: rarity.toUpperCase(),
        category: category.toUpperCase(),
        metadata,
        mintCondition
      }
    });

    res.json({
      success: true,
      data: badge,
      message: 'Badge created successfully'
    });
  } catch (error) {
    console.error('Error creating badge:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create badge'
    });
  }
});

// Award badge to user (admin or system)
router.post('/:badgeId/award/:userId', async (req, res) => {
  try {
    const { badgeId, userId } = req.params;
    const { metadata = {} } = req.body;

    // Check if badge exists
    const badge = await prisma.nFTBadge.findUnique({
      where: { id: badgeId }
    });

    if (!badge) {
      return res.status(404).json({
        success: false,
        message: 'Badge not found'
      });
    }

    // Check if user already has this badge
    const existingUserBadge = await prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId } }
    });

    if (existingUserBadge) {
      return res.status(400).json({
        success: false,
        message: 'User already has this badge'
      });
    }

    const userBadge = await prisma.userBadge.create({
      data: {
        userId,
        badgeId,
        metadata: {
          earnedAt: new Date().toISOString(),
          ...metadata
        }
      }
    });

    res.json({
      success: true,
      data: userBadge,
      message: 'Badge awarded successfully'
    });
  } catch (error) {
    console.error('Error awarding badge:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to award badge'
    });
  }
});

module.exports = router;
