const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();
// Enable loading of TypeScript route files at runtime
require('ts-node').register({ transpileOnly: true });
const { txLogger, kycCheck, rateLimiter } = require('./middleware/security');

// Import AI Rewards routes
const aiRewardsRoutes = require('./routes/aiRewards');
const didRoutes = require('./routes/did');
const sbtRoutes = require('./routes/sbt');
const questRoutes = require('./routes/quests');
const streakRoutes = require('./routes/streaks');
const leaderboardRoutes = require('./routes/leaderboards');
const nftBadgeRoutes = require('./routes/nftBadges');
const onrampRoutes = require('./routes/onramp')
const settlementsRoutes = require('./src/routes/settlements.ts').default;

// Import TypeScript routes (use default exports)
const authRoutes = require('./src/routes/auth.ts').default;
const emailRoutes = require('./src/routes/email.ts').default;
const kycRoutes = require('./src/routes/kyc.ts').default;
const walletRoutes = require('./src/routes/wallet.ts').default;

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});
// Make io available to routes via req.app.get('io')
app.set('io', io);
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    process.env.FRONTEND_URL || 'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Security middlewares
app.use(txLogger); // log all requests
app.use('/api', rateLimiter, kycCheck); // rate limit + mock KYC on API routes

// Ethers.js setup for contract interaction
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://127.0.0.1:8545');
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);

// Contract addresses (update these after deployment)
const CONTRACT_ADDRESSES = {
  SolanaPayPayments: process.env.SolanaPay_PAYMENTS_ADDRESS || '',
  SolanaPayEscrow: process.env.SolanaPay_ESCROW_ADDRESS || '',
  SolanaPayRewards: process.env.SolanaPay_REWARDS_ADDRESS || ''
};

// Contract ABIs (simplified for demo)
const PAYMENT_ABI = [
  "function deposit() external payable",
  "function transfer(address to, uint256 amount) external",
  "function withdraw(uint256 amount) external",
  "function balances(address user) external view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 amount, uint256 fee)"
];

const ESCROW_ABI = [
  "function createEscrow(address buyer, address seller, uint256 amount, string memory description) external returns (uint256)",
  "function completeEscrow(uint256 escrowId) external",
  "function getEscrow(uint256 escrowId) external view returns (tuple(address buyer, address seller, uint256 amount, string description, uint8 status))",
  "event EscrowCreated(uint256 indexed escrowId, address indexed buyer, address indexed seller, uint256 amount)"
];

const REWARDS_ABI = [
  "function awardPoints(address user, uint256 points) external",
  "function redeemReward(uint256 rewardId) external",
  "function getUserPoints(address user) external view returns (uint256)",
  "function createReward(string memory name, string memory description, uint256 pointsCost, uint256 tokenReward, uint256 stock, uint256 tierRequired) external",
  "event PointsAwarded(address indexed user, uint256 points)",
  "event RewardRedeemed(address indexed user, uint256 rewardId, uint256 pointsCost)"
];

// Contract instances
let paymentsContract, escrowContract, rewardsContract;

// Initialize contracts
async function initializeContracts() {
  try {
    if (CONTRACT_ADDRESSES.SolanaPayPayments) {
      paymentsContract = new ethers.Contract(CONTRACT_ADDRESSES.SolanaPayPayments, PAYMENT_ABI, wallet);
    }
    if (CONTRACT_ADDRESSES.SolanaPayEscrow) {
      escrowContract = new ethers.Contract(CONTRACT_ADDRESSES.SolanaPayEscrow, ESCROW_ABI, wallet);
    }
    if (CONTRACT_ADDRESSES.SolanaPayRewards) {
      rewardsContract = new ethers.Contract(CONTRACT_ADDRESSES.SolanaPayRewards, REWARDS_ABI, wallet);
    }
    console.log('✅ Smart contracts initialized');
  } catch (error) {
    console.error('❌ Error initializing contracts:', error.message);
  }
}

// In-memory storage for demo (use database in production)
let users = [];
let tasks = [
  {
    id: 1,
    title: "Design a Modern Logo",
    description: "I need a professional logo for my tech startup. Looking for clean, modern design with tech elements. Please provide 3 concept variations.",
    reward: 150,
    category: "Design",
    duration: "3-5 days",
    location: "Remote",
    skills: ["Graphic Design", "Logo Design", "Adobe Illustrator"],
    status: "open",
    creator: "techfounder",
    assignee: null,
    escrowId: null,
    applications: 12,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    completedAt: null
  },
  {
    id: 2,
    title: "Write Product Descriptions",
    description: "Need compelling product descriptions for 20 e-commerce items. Must be SEO-friendly and engaging. Experience with fashion/lifestyle products preferred.",
    reward: 80,
    category: "Writing",
    duration: "2-3 days",
    location: "Remote",
    skills: ["Copywriting", "SEO", "E-commerce"],
    status: "open",
    creator: "shopowner",
    assignee: null,
    escrowId: null,
    applications: 8,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    completedAt: null
  },
  {
    id: 3,
    title: "Social Media Content Creation",
    description: "Create 10 Instagram posts for a fitness brand. Need eye-catching graphics and captions. Must understand fitness/wellness niche.",
    reward: 120,
    category: "Marketing",
    duration: "1 week",
    location: "Remote",
    skills: ["Social Media", "Content Creation", "Canva", "Fitness"],
    status: "open",
    creator: "fitnessbrand",
    assignee: null,
    escrowId: null,
    applications: 15,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    completedAt: null
  },
  {
    id: 4,
    title: "Data Entry for Customer Database",
    description: "Clean and organize customer data from various sources into a unified spreadsheet. Attention to detail required. ~500 entries.",
    reward: 60,
    category: "Data Entry",
    duration: "2 days",
    location: "Remote",
    skills: ["Data Entry", "Excel", "Data Cleaning"],
    status: "open",
    creator: "businessowner",
    assignee: null,
    escrowId: null,
    applications: 25,
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    completedAt: null
  },
  {
    id: 5,
    title: "Mobile App Testing",
    description: "Test our new iOS/Android app for bugs and usability issues. Need detailed reports with screenshots. Multiple devices preferred.",
    reward: 90,
    category: "Testing",
    duration: "3-4 days",
    location: "Remote",
    skills: ["QA Testing", "Mobile Testing", "Bug Reporting"],
    status: "open",
    creator: "appdev",
    assignee: null,
    escrowId: null,
    applications: 18,
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    completedAt: null
  },
  {
    id: 6,
    title: "React Component Development",
    description: "Build 5 reusable React components for our dashboard. TypeScript required. Must follow our design system and be fully responsive.",
    reward: 200,
    category: "Development",
    duration: "1 week",
    location: "Remote",
    skills: ["React", "TypeScript", "CSS", "JavaScript"],
    status: "open",
    creator: "startupdev",
    assignee: null,
    escrowId: null,
    applications: 7,
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    completedAt: null
  },
  {
    id: 7,
    title: "Translate Marketing Materials",
    description: "Translate website content and marketing materials from English to Spanish. Native Spanish speaker preferred. ~2000 words total.",
    reward: 100,
    category: "Translation",
    duration: "2-3 days",
    location: "Remote",
    skills: ["Spanish Translation", "Marketing Translation", "Localization"],
    status: "open",
    creator: "marketingagency",
    assignee: null,
    escrowId: null,
    applications: 11,
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    completedAt: null
  }
];
let rewards = [
  { id: 1, name: 'Welcome Bonus', description: 'Get 100 points for joining', pointsCost: 0, tokenReward: 100, stock: 1000 },
  { id: 2, name: 'Task Master', description: 'Complete 5 tasks', pointsCost: 500, tokenReward: 50, stock: 100 },
  { id: 3, name: 'Premium Access', description: '30 days premium features', pointsCost: 1000, tokenReward: 0, stock: 50 }
];

// =============================================================================
// API ROUTES
// =============================================================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    contracts: {
      payments: !!paymentsContract,
      escrow: !!escrowContract,
      rewards: !!rewardsContract
    }
  });
});

// =============================================================================
// /api/users - Onboarding placeholder
// =============================================================================

app.get('/api/users', (req, res) => {
  res.json({
    success: true,
    users: users.map(u => ({ id: u.id, address: u.address, username: u.username, points: u.points }))
  });
});

app.post('/api/users/onboard', async (req, res) => {
  try {
    const { address, username } = req.body;
    
    if (!address || !username) {
      return res.status(400).json({ error: 'Address and username required' });
    }

    // Check if user already exists
    const existingUser = users.find(u => u.address.toLowerCase() === address.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const newUser = {
      id: users.length + 1,
      address: address.toLowerCase(),
      username,
      points: 0,
      tasksCompleted: 0,
      joinedAt: new Date().toISOString()
    };

    users.push(newUser);

    // Award welcome bonus points via smart contract
    if (rewardsContract) {
      try {
        const tx = await rewardsContract.awardPoints(address, 100);
        await tx.wait();
        newUser.points = 100;
        console.log(`✅ Awarded 100 welcome points to ${username}`);
      } catch (error) {
        console.error('❌ Error awarding welcome points:', error.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'User onboarded successfully',
      user: newUser
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const user = users.find(u => u.address.toLowerCase() === address.toLowerCase());
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get latest points from smart contract
    if (rewardsContract) {
      try {
        const points = await rewardsContract.getUserPoints(address);
        user.points = parseInt(points.toString());
      } catch (error) {
        console.error('❌ Error fetching user points:', error.message);
      }
    }

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// /api/tasks - Create, fetch, complete tasks
// =============================================================================

app.get('/api/tasks', (req, res) => {
  // Transform tasks to match frontend interface
  const transformedTasks = tasks.map(t => ({
    id: t.id.toString(),
    title: t.title,
    description: t.description,
    category: t.category || 'General',
    budget: t.reward || 0,
    duration: t.duration || 'Flexible',
    location: t.location || 'Remote',
    poster: {
      username: t.creator || 'Anonymous',
      rating: 4.5,
      avatar: null
    },
    skills: t.skills || ['General'],
    applications: t.applications || 0,
    postedAt: t.createdAt || new Date().toISOString(),
    status: t.status === 'open' ? 'open' : t.status === 'in_progress' ? 'in_progress' : t.status === 'completed' ? 'completed' : 'open'
  }));

  res.json({
    success: true,
    tasks: transformedTasks,
    total: transformedTasks.length,
    page: 1,
    limit: 50
  });
});

app.post('/api/tasks/create', async (req, res) => {
  try {
    const { title, description, reward, creator, category, duration, location, skills } = req.body;
    
    if (!title || !description || !reward || !creator) {
      return res.status(400).json({ error: 'Title, description, reward, and creator required' });
    }

    const newTask = {
      id: tasks.length + 1,
      title,
      description,
      reward: parseFloat(reward),
      category: category || 'General',
      duration: duration || 'Flexible',
      location: location || 'Remote',
      skills: Array.isArray(skills) ? skills : (skills ? skills.split(',').map(s => s.trim()) : ['General']),
      status: 'open',
      creator,
      assignee: null,
      escrowId: null,
      applications: 0,
      createdAt: new Date().toISOString(),
      completedAt: null
    };

    // Create escrow for task payment
    if (escrowContract) {
      try {
        const rewardWei = ethers.parseEther(reward.toString());
        const tx = await escrowContract.createEscrow(
          ethers.ZeroAddress, // Buyer (will be set when task is assigned)
          creator,
          rewardWei,
          `Task: ${title}`
        );
        const receipt = await tx.wait();
        
        // Extract escrow ID from event logs
        const escrowCreatedEvent = receipt.logs.find(log => 
          log.topics[0] === ethers.id("EscrowCreated(uint256,address,address,uint256)")
        );
        
        if (escrowCreatedEvent) {
          newTask.escrowId = parseInt(escrowCreatedEvent.topics[1]);
          console.log(`✅ Created escrow ${newTask.escrowId} for task ${newTask.id}`);
        }
      } catch (error) {
        console.error('❌ Error creating escrow:', error.message);
      }
    }

    tasks.push(newTask);

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task: newTask
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tasks/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { assignee } = req.body;
    
    const task = tasks.find(t => t.id === parseInt(id));
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.status !== 'open') {
      return res.status(400).json({ error: 'Task is not available for assignment' });
    }

    task.assignee = assignee;
    task.status = 'in_progress';

    res.json({
      success: true,
      message: 'Task assigned successfully',
      task
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tasks/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    
    const task = tasks.find(t => t.id === parseInt(id));
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.status !== 'in_progress') {
      return res.status(400).json({ error: 'Task is not in progress' });
    }

    // Complete escrow to release payment
    if (escrowContract && task.escrowId) {
      try {
        const tx = await escrowContract.completeEscrow(task.escrowId);
        await tx.wait();
        console.log(`✅ Completed escrow ${task.escrowId} for task ${task.id}`);
      } catch (error) {
        console.error('❌ Error completing escrow:', error.message);
      }
    }

    // Award completion points
    if (rewardsContract && task.assignee) {
      try {
        const completionPoints = Math.floor(task.reward * 10); // 10 points per token
        const tx = await rewardsContract.awardPoints(task.assignee, completionPoints);
        await tx.wait();
        
        // Update user points
        const user = users.find(u => u.address.toLowerCase() === task.assignee.toLowerCase());
        if (user) {
          user.points += completionPoints;
          user.tasksCompleted += 1;
        }
        
        console.log(`✅ Awarded ${completionPoints} points to ${task.assignee}`);
      } catch (error) {
        console.error('❌ Error awarding completion points:', error.message);
      }
    }

    task.status = 'completed';
    task.completedAt = new Date().toISOString();

    res.json({
      success: true,
      message: 'Task completed successfully',
      task
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// /api/rewards - Earn, redeem points
// =============================================================================

app.get('/api/rewards', (req, res) => {
  res.json({
    success: true,
    rewards
  });
});

// Leaderboard - top 10 users by points
app.get('/api/rewards/leaderboard', (req, res) => {
  try {
    const top = [...users]
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .slice(0, 10)
      .map((u, idx) => ({
        rank: idx + 1,
        address: u.address,
        username: u.username,
        points: u.points || 0,
        tasksCompleted: u.tasksCompleted || 0,
      }));
    res.json({ success: true, leaderboard: top });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/rewards/earn', async (req, res) => {
  try {
    const { address, points, reason } = req.body;
    
    if (!address || !points) {
      return res.status(400).json({ error: 'Address and points required' });
    }

    // Award points via smart contract
    if (rewardsContract) {
      try {
        const tx = await rewardsContract.awardPoints(address, points);
        await tx.wait();
        
        // Update local user data
        const user = users.find(u => u.address.toLowerCase() === address.toLowerCase());
        if (user) {
          user.points += parseInt(points);
        }
        
        console.log(`✅ Awarded ${points} points to ${address} for: ${reason || 'Manual award'}`);
        
        res.json({
          success: true,
          message: `Awarded ${points} points successfully`,
          reason: reason || 'Manual award'
        });
      } catch (error) {
        console.error('❌ Error awarding points:', error.message);
        res.status(500).json({ error: 'Failed to award points on blockchain' });
      }
    } else {
      // Fallback to local storage if contract not available
      const user = users.find(u => u.address.toLowerCase() === address.toLowerCase());
      if (user) {
        user.points += parseInt(points);
        res.json({
          success: true,
          message: `Awarded ${points} points successfully (local)`,
          reason: reason || 'Manual award'
        });
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/rewards/:id/redeem', async (req, res) => {
  try {
    const { id } = req.params;
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({ error: 'Address required' });
    }

    const reward = rewards.find(r => r.id === parseInt(id));
    if (!reward) {
      return res.status(404).json({ error: 'Reward not found' });
    }

    const user = users.find(u => u.address.toLowerCase() === address.toLowerCase());
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get current points from smart contract
    let currentPoints = user.points;
    if (rewardsContract) {
      try {
        const points = await rewardsContract.getUserPoints(address);
        currentPoints = parseInt(points.toString());
      } catch (error) {
        console.error('❌ Error fetching user points:', error.message);
      }
    }

    if (currentPoints < reward.pointsCost) {
      return res.status(400).json({ 
        error: 'Insufficient points',
        required: reward.pointsCost,
        current: currentPoints
      });
    }

    if (reward.stock <= 0) {
      return res.status(400).json({ error: 'Reward out of stock' });
    }

    // Redeem via smart contract
    if (rewardsContract) {
      try {
        const tx = await rewardsContract.redeemReward(reward.id);
        await tx.wait();
        console.log(`✅ Redeemed reward ${reward.id} for ${address}`);
      } catch (error) {
        console.error('❌ Error redeeming reward:', error.message);
        return res.status(500).json({ error: 'Failed to redeem reward on blockchain' });
      }
    }

    // Update local data
    user.points -= reward.pointsCost;
    reward.stock -= 1;

    res.json({
      success: true,
      message: `Successfully redeemed ${reward.name}`,
      reward,
      remainingPoints: user.points
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/rewards/user/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    let points = 0;
    if (rewardsContract) {
      try {
        const userPoints = await rewardsContract.getUserPoints(address);
        points = parseInt(userPoints.toString());
      } catch (error) {
        console.error('❌ Error fetching user points:', error.message);
        // Fallback to local data
        const user = users.find(u => u.address.toLowerCase() === address.toLowerCase());
        points = user ? user.points : 0;
      }
    } else {
      const user = users.find(u => u.address.toLowerCase() === address.toLowerCase());
      points = user ? user.points : 0;
    }

    res.json({
      success: true,
      address,
      points,
      availableRewards: rewards.filter(r => r.pointsCost <= points && r.stock > 0)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI Rewards Routes
app.use('/api/rewards', aiRewardsRoutes);

// DID Routes
app.use('/api/did', didRoutes);

// SBT Routes
app.use('/api/sbt', sbtRoutes);

// Gamification Routes
app.use('/api/quests', questRoutes);
app.use('/api/streaks', streakRoutes);
app.use('/api/leaderboards', leaderboardRoutes);
app.use('/api/nft-badges', nftBadgeRoutes);

// On-ramp Routes
app.use('/api/onramp', onrampRoutes);

// Settlement Routes
app.use('/api/settlements', settlementsRoutes);

// Compliance Routes
const complianceRoutes = require('./routes/compliance');
app.use('/api/compliance', complianceRoutes);

// Auth Routes (TypeScript)
app.use('/api/auth', authRoutes);

// Email Routes (TypeScript)
app.use('/api/email', emailRoutes);

// KYC Routes (TypeScript)
app.use('/api/kyc', kycRoutes);

// Wallet Routes (TypeScript)
app.use('/api/wallet', walletRoutes);

// =============================================================================
// SERVER STARTUP
// =============================================================================

app.listen(PORT, async () => {
  console.log(`🚀 SolanaPay Backend Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  
  // Initialize smart contracts
  await initializeContracts();
  
  console.log('\n📋 Available Routes:');
  console.log('GET  /api/health - Health check');
  console.log('GET  /api/users - List users');
  console.log('POST /api/users/onboard - Onboard new user');
  console.log('GET  /api/users/:address - Get user details');
  console.log('GET  /api/tasks - List tasks');
  console.log('POST /api/tasks/create - Create new task');
  console.log('POST /api/tasks/:id/assign - Assign task');
  console.log('POST /api/tasks/:id/complete - Complete task');
  console.log('GET  /api/rewards - List rewards');
  console.log('POST /api/rewards/earn - Award points');
  console.log('POST /api/rewards/:id/redeem - Redeem reward');
  console.log('GET  /api/rewards/user/:address - Get user rewards');
  console.log('GET  /api/rewards/recommend - Get AI recommendations');
  console.log('POST /api/rewards/recommend/:id/claim - Claim AI recommendation');
  console.log('GET  /api/rewards/analytics - Get user analytics');
  console.log('GET  /api/rewards/redemption/history - Get redemption history');
  console.log('POST /api/rewards/nft/mint - Mint reward NFT');
  console.log('POST /api/rewards/tokens/transfer - Transfer bonus tokens');
});

// WebSocket connection handling for VeryChat
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join user to their personal room
  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`User ${userId} joined their room`);
  });

  // Join merchant-customer chat room
  socket.on('join-chat-room', (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });

  // Handle chat messages
  socket.on('send-message', (data) => {
    const { roomId, message, sender, type } = data;
    
    // Broadcast message to room
    io.to(roomId).emit('receive-message', {
      id: Date.now(),
      message,
      sender,
      type,
      timestamp: new Date().toISOString()
    });
  });

  // Handle payment notifications
  socket.on('payment-event', (data) => {
    const { userId, type, amount, status, transactionId } = data;
    
    // Send automated message for payment events
    const automatedMessage = {
      id: Date.now(),
      message: generatePaymentMessage(type, status, amount, transactionId),
      sender: 'VeryChat Assistant',
      type: 'automated',
      timestamp: new Date().toISOString()
    };
    
    io.to(`user-${userId}`).emit('receive-message', automatedMessage);
  });

  // Handle AI chatbot queries
  socket.on('ai-query', async (data) => {
    const { userId, query, context } = data;
    
    try {
      // Process AI query (integrate with VeryChat API)
      const aiResponse = await processAIQuery(query, context);
      
      const aiMessage = {
        id: Date.now(),
        message: aiResponse,
        sender: 'VeryChat AI',
        type: 'ai-response',
        timestamp: new Date().toISOString()
      };
      
      socket.emit('receive-message', aiMessage);
    } catch (error) {
      console.error('AI query error:', error);
      socket.emit('ai-error', { error: 'Failed to process query' });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Helper function to generate payment messages
function generatePaymentMessage(type, status, amount, transactionId) {
  const statusEmoji = status === 'success' ? '✅' : '❌';
  const typeText = type === 'send' ? 'sent' : 'received';
  
  if (status === 'success') {
    return `${statusEmoji} Payment ${typeText} successfully! Amount: $${amount}. Transaction ID: ${transactionId}. Your receipt is ready.`;
  } else {
    return `${statusEmoji} Payment ${typeText} failed. Amount: $${amount}. Please try again or contact support.`;
  }
}

// Import local AI service
const { processAIQuery: processLocalAI, generatePaymentMessage, enhanceResponseWithContext } = require('./services/localAIService');

// AI query processing function (now uses local AI)
async function processAIQuery(query, context) {
  try {
    const response = await processLocalAI(query, context);
    return enhanceResponseWithContext(response.message, context);
  } catch (error) {
    console.error('Local AI error:', error);
    // Fall back to basic responses
  }

  // Fallback responses if local AI fails
  return "I'm here to help with SolanaPay! I can assist with wallet management, payments, KYC verification, tasks, and rewards. What would you like to know?";
  
  if (lowerQuery.includes('payment') && lowerQuery.includes('failed')) {
    return "❌ **Payment Failed - Troubleshooting**\n\nHere's what to check when payments fail:\n\n1. **Wallet Balance** - Ensure sufficient funds\n2. **Network Status** - Check your internet connection\n3. **Recipient Address** - Verify it's correct\n4. **Transaction Limits** - You might have hit daily limits\n5. **KYC Status** - Some payments require verification\n\nTry the payment again, or contact our support team if the issue persists.";
  }
  
  if (lowerQuery.includes('kyc') || lowerQuery.includes('verification')) {
    return "🔐 **KYC Verification**\n\nKYC (Know Your Customer) verification helps keep SolanaPay secure:\n\n• **Required for**: Large transactions, merchant features\n• **Documents needed**: ID, proof of address\n• **Processing time**: 1-3 business days\n• **Status check**: Go to Profile → KYC Status\n\nStart your KYC verification in the Profile section!";
  }
  
  if (lowerQuery.includes('task') || lowerQuery.includes('work') || lowerQuery.includes('job')) {
    return "💼 **SolanaPay Tasks & Marketplace**\n\nEarn money by completing micro-tasks:\n\n• **Browse Tasks**: Check the Tasks page for available work\n• **Categories**: Design, Writing, Development, Data Entry, and more\n• **Apply**: Submit proposals for tasks you're interested in\n• **Get Paid**: Secure escrow payments upon completion\n\nReady to start earning? Visit the Tasks section!";
  }
  
  if (lowerQuery.includes('support') || lowerQuery.includes('help')) {
    return "🤝 **SolanaPay Support**\n\nI'm here to help with:\n\n• 💳 **Payments** - Send, receive, troubleshoot\n• 📄 **Receipts** - Find and download transaction records\n• 💰 **Wallet** - Balance, history, security\n• 🔐 **KYC** - Verification process and status\n• 💼 **Tasks** - Finding work and getting paid\n• 🏪 **Merchant** - Business features and settlements\n\nWhat specific assistance do you need today?";
  }
  
  if (lowerQuery.includes('balance') || lowerQuery.includes('wallet')) {
    return "💰 **Wallet & Balance**\n\nManage your SolanaPay wallet:\n\n• **Current Balance**: View in the Wallet section\n• **Transaction History**: See all payments and receipts\n• **Add Funds**: Deposit money via bank transfer or card\n• **Withdraw**: Transfer funds to your bank account\n• **Security**: Multi-signature protection and encryption\n\nYour wallet is your gateway to the SolanaPay ecosystem!";
  }
  
  if (lowerQuery.includes('merchant') || lowerQuery.includes('business') || lowerQuery.includes('settlement')) {
    return "🏪 **Merchant & Business Features**\n\nSolanaPay for Business:\n\n• **Accept Payments**: Integrate SolanaPay into your business\n• **Settlement Dashboard**: Track earnings and payouts\n• **Customer Chat**: Communicate with buyers\n• **Analytics**: Monitor transaction patterns\n• **KYC Required**: Business verification needed\n\nReady to grow your business with SolanaPay? Check the Merchant Settlement section!";
  }
  
  if (lowerQuery.includes('fee') || lowerQuery.includes('cost') || lowerQuery.includes('charge')) {
    return "💸 **SolanaPay Fees & Costs**\n\nTransparent pricing:\n\n• **Personal Transfers**: Free between SolanaPay users\n• **Merchant Payments**: 2.9% + $0.30 per transaction\n• **Withdrawals**: $1.50 to bank accounts\n• **International**: Additional 1.5% for cross-border\n• **Task Escrow**: 3% platform fee on completion\n\nNo hidden fees - what you see is what you pay!";
  }
  
  // Default response with more personality
  return "🤖 **VeryChat AI Assistant**\n\nI'm here to help with all things SolanaPay! I can assist with:\n\n• Payment troubleshooting\n• Wallet management\n• Task marketplace guidance\n• KYC verification help\n• Merchant features\n• General platform questions\n\nCould you please be more specific about what you'd like help with? The more details you provide, the better I can assist you!";
}

// Start server with WebSocket support and port conflict handling
const startServer = (port) => {
  server.listen(port, () => {
    console.log(`🚀 SolanaPay Backend Server running on port ${port}`);
    console.log(`📊 Health check: http://localhost:${port}/api/health`);
    console.log(`🔗 API Base URL: http://localhost:${port}/api`);
    console.log(`📡 WebSocket server ready for real-time chat`);
    console.log(`🤖 VeryChat AI assistant integrated`);
    console.log('\n📋 Available API Endpoints:');
    console.log('💳 Payment & Wallet:');
    console.log('POST /api/wallet/connect - Connect wallet');
    console.log('POST /api/wallet/deposit - Deposit funds');
    console.log('POST /api/wallet/transfer - Transfer funds');
    console.log('POST /api/wallet/withdraw - Withdraw funds');
    console.log('GET  /api/wallet/balance/:address - Get balance');
    console.log('GET  /api/wallet/transactions/:address - Get transactions');
    console.log('👥 User Management:');
    console.log('POST /api/users/register - Register new user');
    console.log('POST /api/users/login - User login');
    console.log('POST /api/users/onboard - Onboard new user');
    console.log('GET  /api/users/:address - Get user details');
    console.log('📋 Task Management:');
    console.log('GET  /api/tasks - List tasks');
    console.log('POST /api/tasks/create - Create new task');
    console.log('POST /api/tasks/:id/assign - Assign task');
    console.log('POST /api/tasks/:id/complete - Complete task');
    console.log('🎁 Rewards & Gamification:');
    console.log('GET  /api/rewards - List rewards');
    console.log('POST /api/rewards/earn - Award points');
    console.log('POST /api/rewards/:id/redeem - Redeem reward');
    console.log('GET  /api/rewards/user/:address - Get user rewards');
    console.log('GET  /api/quests/user/:userId - Get user quests');
    console.log('POST /api/streaks/update - Update user streaks');
    console.log('GET  /api/leaderboards/points - Get leaderboards');
    console.log('GET  /api/nft-badges/user/:userId - Get user badges');
    console.log('🤖 AI & Chat:');
    console.log('WebSocket: Real-time chat and AI assistance');
    console.log('WebSocket: Payment notifications and receipts');
    console.log('WebSocket: Merchant-customer support chat');
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`❌ Port ${port} is already in use, trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('❌ Server error:', err);
    }
  });
};

// Start the server
startServer(PORT);

module.exports = app;
