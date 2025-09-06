const { PrismaClient } = require('@prisma/client');

// Initialize Prisma Client
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Database connection helper
async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    return prisma;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

// Graceful shutdown
async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    console.log('✅ Database disconnected successfully');
  } catch (error) {
    console.error('❌ Database disconnection failed:', error);
  }
}

// User operations
const UserModel = {
  // Create new user
  async create(data) {
    return await prisma.user.create({
      data: {
        walletAddress: data.walletAddress,
        name: data.name,
        kycStatus: data.kycStatus || 'PENDING'
      }
    });
  },

  // Find user by wallet address
  async findByWallet(walletAddress) {
    return await prisma.user.findUnique({
      where: { walletAddress },
      include: {
        tasks: true,
        rewards: true
      }
    });
  },

  // Find user by ID
  async findById(id) {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        tasks: true,
        rewards: true
      }
    });
  },

  // Update user
  async update(id, data) {
    return await prisma.user.update({
      where: { id },
      data
    });
  },

  // List all users
  async findAll() {
    return await prisma.user.findMany({
      include: {
        tasks: true,
        rewards: true
      }
    });
  }
};

// Task operations
const TaskModel = {
  // Create new task
  async create(data) {
    return await prisma.task.create({
      data: {
        description: data.description,
        amount: data.amount,
        status: data.status || 'OPEN',
        worker: data.worker,
        creatorId: data.creatorId
      },
      include: {
        creator: true
      }
    });
  },

  // Find task by ID
  async findById(id) {
    return await prisma.task.findUnique({
      where: { id },
      include: {
        creator: true
      }
    });
  },

  // Update task
  async update(id, data) {
    return await prisma.task.update({
      where: { id },
      data,
      include: {
        creator: true
      }
    });
  },

  // List all tasks
  async findAll(filters = {}) {
    const where = {};
    
    if (filters.status) {
      where.status = filters.status;
    }
    
    if (filters.worker) {
      where.worker = filters.worker;
    }

    return await prisma.task.findMany({
      where,
      include: {
        creator: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  },

  // Assign task to worker
  async assign(id, workerAddress) {
    return await prisma.task.update({
      where: { id },
      data: {
        worker: workerAddress,
        status: 'IN_PROGRESS'
      },
      include: {
        creator: true
      }
    });
  },

  // Complete task
  async complete(id) {
    return await prisma.task.update({
      where: { id },
      data: {
        status: 'COMPLETED'
      },
      include: {
        creator: true
      }
    });
  }
};

// Reward operations
const RewardModel = {
  // Create new reward entry
  async create(data) {
    return await prisma.reward.create({
      data: {
        userId: data.userId,
        points: data.points,
        reason: data.reason
      },
      include: {
        user: true
      }
    });
  },

  // Find rewards by user ID
  async findByUserId(userId) {
    return await prisma.reward.findMany({
      where: { userId },
      include: {
        user: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  },

  // Get total points for user
  async getTotalPoints(userId) {
    const result = await prisma.reward.aggregate({
      where: { userId },
      _sum: {
        points: true
      }
    });
    
    return result._sum.points || 0;
  },

  // List all rewards
  async findAll() {
    return await prisma.reward.findMany({
      include: {
        user: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }
};

// Export everything
module.exports = {
  prisma,
  connectDatabase,
  disconnectDatabase,
  UserModel,
  TaskModel,
  RewardModel
};
