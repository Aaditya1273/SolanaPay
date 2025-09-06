const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/authMiddleware');
const { body, validationResult, query } = require('express-validator');

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Get compliance overview
router.get('/overview', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get date ranges
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get user's KYC status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { kycStatus: true, kycLevel: true, kycUpdatedAt: true }
    });

    // Get transaction statistics
    const [
      totalOnrampTransactions,
      totalSettlements,
      flaggedTransactions,
      pendingKycUsers,
      recentOnrampVolume,
      recentSettlementVolume
    ] = await Promise.all([
      // Total on-ramp transactions
      prisma.onrampTransaction.count({
        where: { userId }
      }),

      // Total settlements
      prisma.merchantSettlement.count({
        where: { userId }
      }),

      // Flagged transactions (high amounts or suspicious patterns)
      prisma.onrampTransaction.count({
        where: {
          userId,
          OR: [
            { fiatValue: { gte: 10000 } }, // Transactions >= $10k
            { status: 'FAILED' }
          ]
        }
      }),

      // Users needing KYC verification
      prisma.user.count({
        where: {
          kycStatus: { in: ['PENDING', 'REQUIRED'] }
        }
      }),

      // Recent on-ramp volume (last 30 days)
      prisma.onrampTransaction.aggregate({
        where: {
          userId,
          createdAt: { gte: last30Days },
          status: 'COMPLETED'
        },
        _sum: { fiatValue: true }
      }),

      // Recent settlement volume (last 30 days)
      prisma.merchantSettlement.aggregate({
        where: {
          userId,
          createdAt: { gte: last30Days },
          status: 'COMPLETED'
        },
        _sum: { netAmount: true }
      })
    ]);

    // Calculate compliance score
    let complianceScore = 100;
    if (user.kycStatus !== 'VERIFIED') complianceScore -= 30;
    if (flaggedTransactions > 0) complianceScore -= Math.min(flaggedTransactions * 5, 20);
    if (!user.kycUpdatedAt || (now - user.kycUpdatedAt) > 365 * 24 * 60 * 60 * 1000) {
      complianceScore -= 15; // KYC older than 1 year
    }

    // Get recent activity for risk assessment
    const recentActivity = await prisma.onrampTransaction.findMany({
      where: {
        userId,
        createdAt: { gte: last7Days }
      },
      select: {
        fiatValue: true,
        fiatCurrency: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate velocity (transactions per day)
    const velocity = recentActivity.length / 7;
    const avgTransactionSize = recentActivity.length > 0 
      ? recentActivity.reduce((sum, tx) => sum + tx.fiatValue, 0) / recentActivity.length 
      : 0;

    // Risk level assessment
    let riskLevel = 'LOW';
    if (velocity > 5 || avgTransactionSize > 5000 || user.kycStatus !== 'VERIFIED') {
      riskLevel = 'MEDIUM';
    }
    if (velocity > 10 || avgTransactionSize > 10000 || flaggedTransactions > 3) {
      riskLevel = 'HIGH';
    }

    const overview = {
      kycStatus: {
        status: user.kycStatus,
        level: user.kycLevel,
        lastUpdated: user.kycUpdatedAt,
        requiresUpdate: user.kycUpdatedAt && (now - user.kycUpdatedAt) > 365 * 24 * 60 * 60 * 1000
      },
      statistics: {
        totalOnrampTransactions,
        totalSettlements,
        flaggedTransactions,
        pendingKycUsers,
        recentOnrampVolume: recentOnrampVolume._sum.fiatValue || 0,
        recentSettlementVolume: recentSettlementVolume._sum.netAmount || 0
      },
      riskAssessment: {
        complianceScore: Math.max(complianceScore, 0),
        riskLevel,
        velocity,
        avgTransactionSize,
        recentActivityCount: recentActivity.length
      },
      alerts: []
    };

    // Generate alerts
    if (user.kycStatus !== 'VERIFIED') {
      overview.alerts.push({
        type: 'KYC_REQUIRED',
        severity: 'HIGH',
        message: 'KYC verification required for continued service',
        action: 'Complete identity verification'
      });
    }

    if (velocity > 8) {
      overview.alerts.push({
        type: 'HIGH_VELOCITY',
        severity: 'MEDIUM',
        message: 'High transaction velocity detected',
        action: 'Review transaction patterns'
      });
    }

    if (avgTransactionSize > 8000) {
      overview.alerts.push({
        type: 'LARGE_TRANSACTIONS',
        severity: 'MEDIUM',
        message: 'Large average transaction size',
        action: 'Enhanced monitoring recommended'
      });
    }

    res.json({
      success: true,
      overview
    });

  } catch (error) {
    console.error('Compliance overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch compliance overview'
    });
  }
});

// Get detailed compliance report
router.get('/report', [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('type').optional().isIn(['onramp', 'settlement', 'all'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const { startDate, endDate, type = 'all' } = req.query;

    // Set default date range (last 30 days)
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const whereClause = {
      userId,
      createdAt: {
        gte: start,
        lte: end
      }
    };

    let onrampData = [];
    let settlementData = [];

    if (type === 'onramp' || type === 'all') {
      onrampData = await prisma.onrampTransaction.findMany({
        where: whereClause,
        select: {
          id: true,
          status: true,
          fiatCurrency: true,
          cryptoCurrency: true,
          fiatValue: true,
          cryptoValue: true,
          externalId: true,
          createdAt: true,
          updatedAt: true,
          metadata: true
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    if (type === 'settlement' || type === 'all') {
      settlementData = await prisma.merchantSettlement.findMany({
        where: whereClause,
        select: {
          id: true,
          settlementType: true,
          currency: true,
          amount: true,
          fees: true,
          netAmount: true,
          status: true,
          provider: true,
          createdAt: true,
          updatedAt: true,
          metadata: true
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    // Generate compliance metrics
    const metrics = {
      onramp: {
        totalTransactions: onrampData.length,
        totalVolume: onrampData.reduce((sum, tx) => sum + tx.fiatValue, 0),
        completedTransactions: onrampData.filter(tx => tx.status === 'COMPLETED').length,
        failedTransactions: onrampData.filter(tx => tx.status === 'FAILED').length,
        averageTransactionSize: onrampData.length > 0 
          ? onrampData.reduce((sum, tx) => sum + tx.fiatValue, 0) / onrampData.length 
          : 0,
        currencyBreakdown: onrampData.reduce((acc, tx) => {
          acc[tx.fiatCurrency] = (acc[tx.fiatCurrency] || 0) + tx.fiatValue;
          return acc;
        }, {})
      },
      settlement: {
        totalSettlements: settlementData.length,
        totalVolume: settlementData.reduce((sum, tx) => sum + tx.netAmount, 0),
        totalFees: settlementData.reduce((sum, tx) => sum + tx.fees, 0),
        completedSettlements: settlementData.filter(tx => tx.status === 'COMPLETED').length,
        failedSettlements: settlementData.filter(tx => tx.status === 'FAILED').length,
        typeBreakdown: settlementData.reduce((acc, tx) => {
          acc[tx.settlementType] = (acc[tx.settlementType] || 0) + tx.netAmount;
          return acc;
        }, {})
      }
    };

    // Flag suspicious activities
    const suspiciousActivities = [];

    // Check for rapid successive transactions
    const rapidTransactions = onrampData.filter((tx, index) => {
      if (index === 0) return false;
      const prevTx = onrampData[index - 1];
      const timeDiff = new Date(tx.createdAt) - new Date(prevTx.createdAt);
      return timeDiff < 5 * 60 * 1000; // Less than 5 minutes apart
    });

    if (rapidTransactions.length > 0) {
      suspiciousActivities.push({
        type: 'RAPID_TRANSACTIONS',
        count: rapidTransactions.length,
        description: 'Multiple transactions within short time periods',
        transactions: rapidTransactions.map(tx => tx.id)
      });
    }

    // Check for large transactions
    const largeTransactions = [...onrampData, ...settlementData].filter(tx => {
      const amount = tx.fiatValue || tx.netAmount;
      return amount >= 10000;
    });

    if (largeTransactions.length > 0) {
      suspiciousActivities.push({
        type: 'LARGE_TRANSACTIONS',
        count: largeTransactions.length,
        description: 'Transactions exceeding $10,000',
        transactions: largeTransactions.map(tx => tx.id)
      });
    }

    res.json({
      success: true,
      report: {
        period: { start, end },
        metrics,
        transactions: {
          onramp: onrampData,
          settlement: settlementData
        },
        suspiciousActivities,
        generatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Compliance report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate compliance report'
    });
  }
});

// Get AML monitoring data
router.get('/aml-monitoring', async (req, res) => {
  try {
    const userId = req.user.id;
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get user's transaction patterns
    const transactions = await prisma.onrampTransaction.findMany({
      where: {
        userId,
        createdAt: { gte: last30Days }
      },
      select: {
        id: true,
        fiatValue: true,
        fiatCurrency: true,
        cryptoCurrency: true,
        status: true,
        createdAt: true,
        metadata: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Pattern analysis
    const patterns = {
      dailyVolumes: {},
      currencyPatterns: {},
      timePatterns: {},
      amountPatterns: {
        small: 0,    // < $1000
        medium: 0,   // $1000 - $5000
        large: 0,    // $5000 - $10000
        veryLarge: 0 // > $10000
      }
    };

    transactions.forEach(tx => {
      const date = tx.createdAt.toISOString().split('T')[0];
      const hour = tx.createdAt.getHours();
      
      // Daily volumes
      patterns.dailyVolumes[date] = (patterns.dailyVolumes[date] || 0) + tx.fiatValue;
      
      // Currency patterns
      patterns.currencyPatterns[tx.fiatCurrency] = (patterns.currencyPatterns[tx.fiatCurrency] || 0) + 1;
      
      // Time patterns (by hour)
      patterns.timePatterns[hour] = (patterns.timePatterns[hour] || 0) + 1;
      
      // Amount patterns
      if (tx.fiatValue < 1000) patterns.amountPatterns.small++;
      else if (tx.fiatValue < 5000) patterns.amountPatterns.medium++;
      else if (tx.fiatValue < 10000) patterns.amountPatterns.large++;
      else patterns.amountPatterns.veryLarge++;
    });

    // Risk indicators
    const riskIndicators = [];

    // Check for unusual volume spikes
    const volumes = Object.values(patterns.dailyVolumes);
    const avgDailyVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const maxDailyVolume = Math.max(...volumes);

    if (maxDailyVolume > avgDailyVolume * 3) {
      riskIndicators.push({
        type: 'VOLUME_SPIKE',
        severity: 'MEDIUM',
        description: 'Unusual daily volume spike detected',
        value: maxDailyVolume,
        threshold: avgDailyVolume * 3
      });
    }

    // Check for off-hours activity
    const nightHours = [0, 1, 2, 3, 4, 5];
    const nightActivity = nightHours.reduce((sum, hour) => sum + (patterns.timePatterns[hour] || 0), 0);
    const totalActivity = Object.values(patterns.timePatterns).reduce((a, b) => a + b, 0);

    if (nightActivity / totalActivity > 0.3) {
      riskIndicators.push({
        type: 'OFF_HOURS_ACTIVITY',
        severity: 'LOW',
        description: 'High percentage of transactions during off-hours',
        percentage: (nightActivity / totalActivity * 100).toFixed(1)
      });
    }

    // Check for structuring (many transactions just under reporting thresholds)
    const nearThresholdTransactions = transactions.filter(tx => 
      tx.fiatValue >= 9000 && tx.fiatValue < 10000
    );

    if (nearThresholdTransactions.length >= 3) {
      riskIndicators.push({
        type: 'POTENTIAL_STRUCTURING',
        severity: 'HIGH',
        description: 'Multiple transactions near reporting threshold',
        count: nearThresholdTransactions.length
      });
    }

    res.json({
      success: true,
      amlData: {
        transactionCount: transactions.length,
        totalVolume: transactions.reduce((sum, tx) => sum + tx.fiatValue, 0),
        patterns,
        riskIndicators,
        monitoringPeriod: {
          start: last30Days,
          end: new Date()
        }
      }
    });

  } catch (error) {
    console.error('AML monitoring error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch AML monitoring data'
    });
  }
});

// Update KYC status (admin function)
router.post('/kyc/update', [
  body('targetUserId').isString(),
  body('status').isIn(['PENDING', 'VERIFIED', 'REJECTED', 'REQUIRED']),
  body('level').optional().isIn(['BASIC', 'ENHANCED', 'PREMIUM']),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Check if user has admin privileges (simplified check)
    const adminUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true }
    });

    if (adminUser.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient privileges'
      });
    }

    const { targetUserId, status, level, notes } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        kycStatus: status,
        kycLevel: level || 'BASIC',
        kycUpdatedAt: new Date()
      }
    });

    // Log the KYC update
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'KYC_UPDATE',
        targetUserId,
        details: {
          newStatus: status,
          newLevel: level,
          notes,
          updatedBy: req.user.id
        }
      }
    }).catch(() => {}); // Ignore if audit log table doesn't exist

    res.json({
      success: true,
      message: 'KYC status updated successfully',
      user: {
        id: updatedUser.id,
        kycStatus: updatedUser.kycStatus,
        kycLevel: updatedUser.kycLevel,
        kycUpdatedAt: updatedUser.kycUpdatedAt
      }
    });

  } catch (error) {
    console.error('KYC update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update KYC status'
    });
  }
});

// Export compliance report
router.get('/export', [
  query('format').optional().isIn(['json', 'csv']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const { format = 'json', startDate, endDate } = req.query;

    // Get report data (reuse logic from /report endpoint)
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [onrampData, settlementData] = await Promise.all([
      prisma.onrampTransaction.findMany({
        where: {
          userId,
          createdAt: { gte: start, lte: end }
        }
      }),
      prisma.merchantSettlement.findMany({
        where: {
          userId,
          createdAt: { gte: start, lte: end }
        }
      })
    ]);

    if (format === 'csv') {
      // Generate CSV format
      const csvData = [];
      csvData.push('Type,ID,Date,Amount,Currency,Status,Provider');
      
      onrampData.forEach(tx => {
        csvData.push(`Onramp,${tx.id},${tx.createdAt.toISOString()},${tx.fiatValue},${tx.fiatCurrency},${tx.status},Ramp`);
      });
      
      settlementData.forEach(tx => {
        csvData.push(`Settlement,${tx.id},${tx.createdAt.toISOString()},${tx.netAmount},${tx.currency},${tx.status},${tx.provider || 'N/A'}`);
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=compliance-report-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.csv`);
      res.send(csvData.join('\n'));
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=compliance-report-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.json`);
      res.json({
        reportPeriod: { start, end },
        onrampTransactions: onrampData,
        settlementTransactions: settlementData,
        generatedAt: new Date(),
        generatedBy: userId
      });
    }

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export compliance report'
    });
  }
});

module.exports = router;
