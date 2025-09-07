import { Router } from 'express';
import { graphqlHTTP } from 'express-graphql';
import { buildSchema } from 'graphql';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GraphQL Schema
const schema = buildSchema(`
  type Merchant {
    id: ID!
    businessName: String!
    businessType: String!
    website: String
    description: String
    status: String!
    isActive: Boolean!
    apiKey: String!
    totalTransactions: Int!
    totalRevenue: Float!
    createdAt: String!
    updatedAt: String!
  }

  type PaymentIntent {
    id: ID!
    merchantId: ID!
    amount: Float!
    currency: String!
    description: String
    customerEmail: String
    status: String!
    transactionHash: String
    metadata: String
    expiresAt: String!
    createdAt: String!
    completedAt: String
  }

  type Customer {
    email: String!
    totalSpent: Float!
    transactionCount: Int!
    lastTransaction: String!
  }

  type LoyaltyReward {
    id: ID!
    merchantId: ID!
    customerEmail: String!
    points: Int!
    reason: String!
    status: String!
    createdAt: String!
  }

  type Analytics {
    period: String!
    totalTransactions: Int!
    totalRevenue: Float!
    successfulPayments: Int!
    failedPayments: Int!
    successRate: String!
    topCustomers: [Customer!]!
    recentTransactions: [PaymentIntent!]!
  }

  type PaginatedPayments {
    payments: [PaymentIntent!]!
    total: Int!
    page: Int!
    pages: Int!
  }

  type PaginatedCustomers {
    customers: [Customer!]!
    total: Int!
    page: Int!
    pages: Int!
  }

  type PaginatedRewards {
    rewards: [LoyaltyReward!]!
    total: Int!
    page: Int!
    pages: Int!
  }

  input CreatePaymentInput {
    amount: Float!
    currency: String!
    description: String
    customerEmail: String
    metadata: String
  }

  input CreateLoyaltyRewardInput {
    customerEmail: String!
    points: Int!
    reason: String!
  }

  type Query {
    merchant(apiKey: String!): Merchant
    paymentIntent(id: ID!, apiKey: String!): PaymentIntent
    paymentIntents(apiKey: String!, page: Int, limit: Int): PaginatedPayments
    merchantAnalytics(apiKey: String!, period: String): Analytics
    merchantCustomers(apiKey: String!, page: Int, limit: Int): PaginatedCustomers
    loyaltyRewards(apiKey: String!, customerEmail: String, page: Int, limit: Int): PaginatedRewards
  }

  type Mutation {
    createPaymentIntent(apiKey: String!, input: CreatePaymentInput!): PaymentIntent
    createLoyaltyReward(apiKey: String!, input: CreateLoyaltyRewardInput!): LoyaltyReward
  }
`);

// GraphQL Resolvers
const root = {
  // Queries
  merchant: async ({ apiKey }: { apiKey: string }) => {
    const merchant = await prisma.merchant.findUnique({
      where: { apiKey },
      include: {
        _count: {
          select: {
            transactions: true
          }
        }
      }
    });

    if (!merchant) {
      throw new Error('Merchant not found');
    }

    const totalRevenue = await prisma.paymentIntent.aggregate({
      where: {
        merchantId: merchant.id,
        status: 'COMPLETED'
      },
      _sum: { amount: true }
    });

    return {
      ...merchant,
      totalTransactions: merchant._count.transactions,
      totalRevenue: totalRevenue._sum.amount || 0
    };
  },

  paymentIntent: async ({ id, apiKey }: { id: string; apiKey: string }) => {
    const merchant = await prisma.merchant.findUnique({
      where: { apiKey },
      select: { id: true }
    });

    if (!merchant) {
      throw new Error('Invalid API key');
    }

    const paymentIntent = await prisma.paymentIntent.findFirst({
      where: {
        id,
        merchantId: merchant.id
      }
    });

    if (!paymentIntent) {
      throw new Error('Payment intent not found');
    }

    return {
      ...paymentIntent,
      metadata: JSON.stringify(paymentIntent.metadata)
    };
  },

  paymentIntents: async ({ 
    apiKey, 
    page = 1, 
    limit = 20 
  }: { 
    apiKey: string; 
    page?: number; 
    limit?: number; 
  }) => {
    const merchant = await prisma.merchant.findUnique({
      where: { apiKey },
      select: { id: true }
    });

    if (!merchant) {
      throw new Error('Invalid API key');
    }

    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      prisma.paymentIntent.findMany({
        where: { merchantId: merchant.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.paymentIntent.count({
        where: { merchantId: merchant.id }
      })
    ]);

    return {
      payments: payments.map(p => ({
        ...p,
        metadata: JSON.stringify(p.metadata)
      })),
      total,
      page,
      pages: Math.ceil(total / limit)
    };
  },

  merchantAnalytics: async ({ 
    apiKey, 
    period = '30d' 
  }: { 
    apiKey: string; 
    period?: string; 
  }) => {
    const merchant = await prisma.merchant.findUnique({
      where: { apiKey },
      select: { id: true }
    });

    if (!merchant) {
      throw new Error('Invalid API key');
    }

    const startDate = getStartDate(period);

    const [
      totalTransactions,
      totalRevenue,
      successfulPayments,
      failedPayments,
      topCustomers,
      recentTransactions
    ] = await Promise.all([
      prisma.paymentIntent.count({
        where: {
          merchantId: merchant.id,
          createdAt: { gte: startDate }
        }
      }),
      prisma.paymentIntent.aggregate({
        where: {
          merchantId: merchant.id,
          status: 'COMPLETED',
          createdAt: { gte: startDate }
        },
        _sum: { amount: true }
      }),
      prisma.paymentIntent.count({
        where: {
          merchantId: merchant.id,
          status: 'COMPLETED',
          createdAt: { gte: startDate }
        }
      }),
      prisma.paymentIntent.count({
        where: {
          merchantId: merchant.id,
          status: 'FAILED',
          createdAt: { gte: startDate }
        }
      }),
      prisma.paymentIntent.groupBy({
        by: ['customerEmail'],
        where: {
          merchantId: merchant.id,
          status: 'COMPLETED',
          customerEmail: { not: null },
          createdAt: { gte: startDate }
        },
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 10
      }),
      prisma.paymentIntent.findMany({
        where: {
          merchantId: merchant.id,
          createdAt: { gte: startDate }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      })
    ]);

    return {
      period,
      totalTransactions,
      totalRevenue: totalRevenue._sum.amount || 0,
      successfulPayments,
      failedPayments,
      successRate: totalTransactions > 0 ? (successfulPayments / totalTransactions * 100).toFixed(2) : '0.00',
      topCustomers: topCustomers.map(customer => ({
        email: customer.customerEmail,
        totalSpent: customer._sum.amount,
        transactionCount: customer._count.id,
        lastTransaction: new Date().toISOString() // Placeholder
      })),
      recentTransactions: recentTransactions.map(t => ({
        ...t,
        metadata: JSON.stringify(t.metadata)
      }))
    };
  },

  merchantCustomers: async ({ 
    apiKey, 
    page = 1, 
    limit = 20 
  }: { 
    apiKey: string; 
    page?: number; 
    limit?: number; 
  }) => {
    const merchant = await prisma.merchant.findUnique({
      where: { apiKey },
      select: { id: true }
    });

    if (!merchant) {
      throw new Error('Invalid API key');
    }

    const skip = (page - 1) * limit;

    const customers = await prisma.paymentIntent.groupBy({
      by: ['customerEmail'],
      where: {
        merchantId: merchant.id,
        customerEmail: { not: null }
      },
      _sum: { amount: true },
      _count: { id: true },
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: 'desc' } },
      skip,
      take: limit
    });

    const total = await prisma.paymentIntent.groupBy({
      by: ['customerEmail'],
      where: {
        merchantId: merchant.id,
        customerEmail: { not: null }
      }
    }).then(result => result.length);

    return {
      customers: customers.map(customer => ({
        email: customer.customerEmail,
        totalSpent: customer._sum.amount || 0,
        transactionCount: customer._count.id,
        lastTransaction: customer._max.createdAt?.toISOString() || new Date().toISOString()
      })),
      total,
      page,
      pages: Math.ceil(total / limit)
    };
  },

  loyaltyRewards: async ({ 
    apiKey, 
    customerEmail, 
    page = 1, 
    limit = 20 
  }: { 
    apiKey: string; 
    customerEmail?: string; 
    page?: number; 
    limit?: number; 
  }) => {
    const merchant = await prisma.merchant.findUnique({
      where: { apiKey },
      select: { id: true }
    });

    if (!merchant) {
      throw new Error('Invalid API key');
    }

    const skip = (page - 1) * limit;
    const where: any = { merchantId: merchant.id };
    if (customerEmail) {
      where.customerEmail = customerEmail;
    }

    const [rewards, total] = await Promise.all([
      prisma.loyaltyReward.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.loyaltyReward.count({ where })
    ]);

    return {
      rewards,
      total,
      page,
      pages: Math.ceil(total / limit)
    };
  },

  // Mutations
  createPaymentIntent: async ({ 
    apiKey, 
    input 
  }: { 
    apiKey: string; 
    input: any; 
  }) => {
    const merchant = await prisma.merchant.findUnique({
      where: { apiKey },
      select: { id: true, isActive: true, status: true }
    });

    if (!merchant || !merchant.isActive || merchant.status !== 'APPROVED') {
      throw new Error('Invalid or inactive API key');
    }

    const paymentIntent = await prisma.paymentIntent.create({
      data: {
        merchantId: merchant.id,
        amount: input.amount,
        currency: input.currency,
        description: input.description,
        customerEmail: input.customerEmail,
        metadata: input.metadata ? JSON.parse(input.metadata) : {},
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      }
    });

    return {
      ...paymentIntent,
      metadata: JSON.stringify(paymentIntent.metadata)
    };
  },

  createLoyaltyReward: async ({ 
    apiKey, 
    input 
  }: { 
    apiKey: string; 
    input: any; 
  }) => {
    const merchant = await prisma.merchant.findUnique({
      where: { apiKey },
      select: { id: true }
    });

    if (!merchant) {
      throw new Error('Invalid API key');
    }

    const loyaltyReward = await prisma.loyaltyReward.create({
      data: {
        merchantId: merchant.id,
        customerEmail: input.customerEmail,
        points: input.points,
        reason: input.reason,
        status: 'ACTIVE'
      }
    });

    return loyaltyReward;
  }
};

// Helper function
function getStartDate(period: string): Date {
  const now = new Date();
  switch (period) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case '1y':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}

// GraphQL endpoint
router.use('/graphql', graphqlHTTP({
  schema: schema,
  rootValue: root,
  graphiql: process.env.NODE_ENV === 'development'
}));

export default router;
