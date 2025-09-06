const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for metadata uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// In-memory storage for demo (use database in production)
const userTokens = new Map();
const userProgress = new Map();
const tokenMetadata = new Map();
const activityLogs = new Map();

// Initialize default progress for new users
const initializeUserProgress = (address) => {
  if (!userProgress.has(address)) {
    userProgress.set(address, {
      totalPayments: 0,
      totalAmount: 0,
      currentLoginStreak: 0,
      currentPaymentStreak: 0,
      currentTaskStreak: 0,
      lastActivity: '',
      lastLoginDate: '',
      lastPaymentDate: '',
      lastTaskDate: '',
      achievements: [],
      createdAt: new Date().toISOString()
    });
  }
};

// Get user's SBT tokens
router.get('/tokens/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const tokens = userTokens.get(address.toLowerCase()) || [];
    
    res.json({
      success: true,
      address,
      total: tokens.length,
      tokens
    });
  } catch (error) {
    console.error('Error fetching user tokens:', error);
    res.status(500).json({ error: 'Failed to fetch tokens' });
  }
});

// Get user progress
router.get('/progress/:address', async (req, res) => {
  try {
    const { address } = req.params;
    initializeUserProgress(address.toLowerCase());
    
    const progress = userProgress.get(address.toLowerCase());
    
    res.json({
      success: true,
      address,
      progress
    });
  } catch (error) {
    console.error('Error fetching user progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Update user progress
router.post('/progress/update', async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({ error: 'Address required' });
    }

    initializeUserProgress(address.toLowerCase());
    
    // Recalculate progress from activity logs
    const activities = activityLogs.get(address.toLowerCase()) || [];
    const progress = userProgress.get(address.toLowerCase());
    
    // Calculate totals
    const payments = activities.filter(a => a.type === 'payment');
    progress.totalPayments = payments.length;
    progress.totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    // Calculate current streaks
    progress.currentLoginStreak = calculateStreak(activities, 'login');
    progress.currentPaymentStreak = calculateStreak(activities, 'payment');
    progress.currentTaskStreak = calculateStreak(activities, 'task_completion');
    
    // Update last activity
    if (activities.length > 0) {
      progress.lastActivity = activities[activities.length - 1].timestamp;
    }
    
    userProgress.set(address.toLowerCase(), progress);
    
    res.json({
      success: true,
      progress
    });
  } catch (error) {
    console.error('Error updating user progress:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Record payment activity
router.post('/activity/payment', async (req, res) => {
  try {
    const { address, amount } = req.body;
    
    if (!address || amount === undefined) {
      return res.status(400).json({ error: 'Address and amount required' });
    }

    initializeUserProgress(address.toLowerCase());
    
    // Record activity
    const activities = activityLogs.get(address.toLowerCase()) || [];
    const newActivity = {
      id: crypto.randomUUID(),
      type: 'payment',
      amount: parseFloat(amount),
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0]
    };
    
    activities.push(newActivity);
    activityLogs.set(address.toLowerCase(), activities);
    
    // Update progress
    const progress = userProgress.get(address.toLowerCase());
    progress.totalPayments += 1;
    progress.totalAmount += parseFloat(amount);
    progress.lastPaymentDate = newActivity.date;
    progress.lastActivity = newActivity.timestamp;
    
    // Update payment streak
    progress.currentPaymentStreak = calculateStreak(activities, 'payment');
    
    userProgress.set(address.toLowerCase(), progress);
    
    res.json({
      success: true,
      message: 'Payment activity recorded',
      activity: newActivity,
      progress
    });
  } catch (error) {
    console.error('Error recording payment activity:', error);
    res.status(500).json({ error: 'Failed to record payment activity' });
  }
});

// Record general activity
router.post('/activity/record', async (req, res) => {
  try {
    const { address, activityType } = req.body;
    
    if (!address || !activityType) {
      return res.status(400).json({ error: 'Address and activityType required' });
    }

    initializeUserProgress(address.toLowerCase());
    
    // Record activity
    const activities = activityLogs.get(address.toLowerCase()) || [];
    const newActivity = {
      id: crypto.randomUUID(),
      type: activityType,
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0]
    };
    
    activities.push(newActivity);
    activityLogs.set(address.toLowerCase(), activities);
    
    // Update progress
    const progress = userProgress.get(address.toLowerCase());
    progress.lastActivity = newActivity.timestamp;
    
    // Update specific streaks
    switch (activityType) {
      case 'login':
        progress.lastLoginDate = newActivity.date;
        progress.currentLoginStreak = calculateStreak(activities, 'login');
        break;
      case 'task_completion':
        progress.lastTaskDate = newActivity.date;
        progress.currentTaskStreak = calculateStreak(activities, 'task_completion');
        break;
    }
    
    userProgress.set(address.toLowerCase(), progress);
    
    res.json({
      success: true,
      message: 'Activity recorded',
      activity: newActivity,
      progress
    });
  } catch (error) {
    console.error('Error recording activity:', error);
    res.status(500).json({ error: 'Failed to record activity' });
  }
});

// Upload metadata for SBT
router.post('/metadata/upload', async (req, res) => {
  try {
    const { metadata } = req.body;
    
    if (!metadata) {
      return res.status(400).json({ error: 'Metadata required' });
    }

    // Generate unique metadata ID
    const metadataId = crypto.randomUUID();
    
    // Store metadata (in production, upload to IPFS)
    tokenMetadata.set(metadataId, {
      ...metadata,
      uploadedAt: new Date().toISOString()
    });
    
    // Create token URI
    const tokenURI = `https://api.SolanaPay.com/sbt/metadata/${metadataId}`;
    
    res.json({
      success: true,
      metadataId,
      tokenURI,
      metadata
    });
  } catch (error) {
    console.error('Error uploading metadata:', error);
    res.status(500).json({ error: 'Failed to upload metadata' });
  }
});

// Get metadata by ID
router.get('/metadata/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const metadata = tokenMetadata.get(id);
    
    if (!metadata) {
      return res.status(404).json({ error: 'Metadata not found' });
    }

    res.json(metadata);
  } catch (error) {
    console.error('Error fetching metadata:', error);
    res.status(500).json({ error: 'Failed to fetch metadata' });
  }
});

// Mint SBT (called after blockchain transaction)
router.post('/mint', async (req, res) => {
  try {
    const { address, tokenId, achievementId, metadataId, transactionHash } = req.body;
    
    if (!address || !tokenId || !achievementId || !metadataId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const metadata = tokenMetadata.get(metadataId);
    if (!metadata) {
      return res.status(404).json({ error: 'Metadata not found' });
    }

    // Create SBT record
    const sbtToken = {
      tokenId: parseInt(tokenId),
      owner: address.toLowerCase(),
      metadata,
      mintedAt: new Date().toISOString(),
      achievementId,
      transactionHash: transactionHash || '',
      metadataId
    };

    // Store token
    const tokens = userTokens.get(address.toLowerCase()) || [];
    tokens.push(sbtToken);
    userTokens.set(address.toLowerCase(), tokens);

    // Update user progress to include achievement
    const progress = userProgress.get(address.toLowerCase());
    if (progress && !progress.achievements.includes(achievementId)) {
      progress.achievements.push(achievementId);
      userProgress.set(address.toLowerCase(), progress);
    }

    res.json({
      success: true,
      message: 'SBT minted successfully',
      token: sbtToken
    });
  } catch (error) {
    console.error('Error minting SBT:', error);
    res.status(500).json({ error: 'Failed to mint SBT' });
  }
});

// Get achievements by type
router.get('/achievements/:address/:type', async (req, res) => {
  try {
    const { address, type } = req.params;
    const tokens = userTokens.get(address.toLowerCase()) || [];
    
    const filteredTokens = tokens.filter(token => 
      token.metadata.achievement_type === type
    );

    res.json({
      success: true,
      address,
      type,
      count: filteredTokens.length,
      tokens: filteredTokens
    });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { type = 'tokens', limit = 10 } = req.query;
    
    const leaderboard = [];
    
    for (const [address, tokens] of userTokens.entries()) {
      const progress = userProgress.get(address) || {};
      
      let score = 0;
      switch (type) {
        case 'tokens':
          score = tokens.length;
          break;
        case 'payments':
          score = progress.totalPayments || 0;
          break;
        case 'amount':
          score = progress.totalAmount || 0;
          break;
        case 'streaks':
          score = Math.max(
            progress.currentLoginStreak || 0,
            progress.currentPaymentStreak || 0,
            progress.currentTaskStreak || 0
          );
          break;
      }
      
      leaderboard.push({
        address,
        score,
        tokens: tokens.length,
        totalPayments: progress.totalPayments || 0,
        totalAmount: progress.totalAmount || 0,
        maxStreak: Math.max(
          progress.currentLoginStreak || 0,
          progress.currentPaymentStreak || 0,
          progress.currentTaskStreak || 0
        )
      });
    }
    
    // Sort by score descending
    leaderboard.sort((a, b) => b.score - a.score);
    
    // Add rankings
    const rankedLeaderboard = leaderboard.slice(0, parseInt(limit)).map((entry, index) => ({
      rank: index + 1,
      ...entry
    }));

    res.json({
      success: true,
      type,
      leaderboard: rankedLeaderboard
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Get activity history
router.get('/activity/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const { type, limit = 50 } = req.query;
    
    let activities = activityLogs.get(address.toLowerCase()) || [];
    
    // Filter by type if specified
    if (type) {
      activities = activities.filter(a => a.type === type);
    }
    
    // Sort by timestamp descending and limit
    activities = activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      address,
      count: activities.length,
      activities
    });
  } catch (error) {
    console.error('Error fetching activity history:', error);
    res.status(500).json({ error: 'Failed to fetch activity history' });
  }
});

// Helper function to calculate streak
function calculateStreak(activities, activityType) {
  const relevantActivities = activities
    .filter(a => a.type === activityType)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (relevantActivities.length === 0) return 0;

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  for (const activity of relevantActivities) {
    const activityDate = new Date(activity.date);
    activityDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((currentDate.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === streak) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else if (daysDiff > streak) {
      break;
    }
  }

  return streak;
}

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'SBT Service',
    timestamp: new Date().toISOString(),
    stats: {
      totalUsers: userProgress.size,
      totalTokens: Array.from(userTokens.values()).reduce((sum, tokens) => sum + tokens.length, 0),
      totalActivities: Array.from(activityLogs.values()).reduce((sum, activities) => sum + activities.length, 0),
      metadataCount: tokenMetadata.size
    }
  });
});

module.exports = router;
