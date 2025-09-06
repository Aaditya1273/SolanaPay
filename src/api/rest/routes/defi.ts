import { Router, Request, Response } from 'express';
import { OmniFlowSDK } from '../../sdk';

const router = Router();

/**
 * @swagger
 * /api/defi/positions:
 *   get:
 *     summary: Get DeFi positions
 *     tags: [DeFi]
 *     parameters:
 *       - in: query
 *         name: userAddress
 *         schema:
 *           type: string
 *         description: Filter by user address
 *     responses:
 *       200:
 *         description: List of DeFi positions
 */
router.get('/positions', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    const userAddress = req.query.userAddress as string;
    
    const positions = await sdk.defi.getPositions(userAddress);
    
    res.json({
      success: true,
      data: positions,
      count: positions.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/defi/stake:
 *   post:
 *     summary: Stake RWA asset for yield
 *     tags: [DeFi]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assetId:
 *                 type: string
 *               poolId:
 *                 type: string
 *               amount:
 *                 type: string
 *               lockupPeriod:
 *                 type: number
 *             required:
 *               - assetId
 *               - poolId
 *               - amount
 *     responses:
 *       201:
 *         description: Staking position created
 */
router.post('/stake', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    const { assetId, poolId, amount, lockupPeriod } = req.body;
    
    if (!assetId || !poolId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: assetId, poolId, amount',
      });
    }

    const asset = await sdk.assets.getAsset(assetId);
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found',
      });
    }

    const position = await sdk.defi.stakeAsset(asset, poolId, amount, lockupPeriod);
    
    res.status(201).json({
      success: true,
      data: position,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/defi/unstake/{positionId}:
 *   post:
 *     summary: Unstake assets and claim rewards
 *     tags: [DeFi]
 *     parameters:
 *       - in: path
 *         name: positionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Unstaking transaction initiated
 */
router.post('/unstake/:positionId', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    const transaction = await sdk.defi.unstakeAsset(req.params.positionId);
    
    res.json({
      success: true,
      data: { transaction },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/defi/claim-rewards/{positionId}:
 *   post:
 *     summary: Claim pending rewards
 *     tags: [DeFi]
 *     parameters:
 *       - in: path
 *         name: positionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rewards claimed successfully
 */
router.post('/claim-rewards/:positionId', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    const transaction = await sdk.defi.claimRewards(req.params.positionId);
    
    res.json({
      success: true,
      data: { transaction },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/defi/collateral:
 *   post:
 *     summary: Deposit RWA as collateral
 *     tags: [DeFi]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assetId:
 *                 type: string
 *               protocol:
 *                 type: string
 *               amount:
 *                 type: string
 *             required:
 *               - assetId
 *               - protocol
 *               - amount
 *     responses:
 *       201:
 *         description: Collateral deposited successfully
 */
router.post('/collateral', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    const { assetId, protocol, amount } = req.body;
    
    if (!assetId || !protocol || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: assetId, protocol, amount',
      });
    }

    const asset = await sdk.assets.getAsset(assetId);
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found',
      });
    }

    const position = await sdk.defi.depositCollateral(asset, protocol, amount);
    
    res.status(201).json({
      success: true,
      data: position,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/defi/borrow:
 *   post:
 *     summary: Borrow against RWA collateral
 *     tags: [DeFi]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               positionId:
 *                 type: string
 *               borrowAmount:
 *                 type: string
 *               borrowToken:
 *                 type: string
 *             required:
 *               - positionId
 *               - borrowAmount
 *               - borrowToken
 *     responses:
 *       200:
 *         description: Borrow transaction successful
 */
router.post('/borrow', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    const { positionId, borrowAmount, borrowToken } = req.body;
    
    if (!positionId || !borrowAmount || !borrowToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: positionId, borrowAmount, borrowToken',
      });
    }

    const transaction = await sdk.defi.borrowAgainstCollateral(positionId, borrowAmount, borrowToken);
    
    res.json({
      success: true,
      data: { transaction },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/defi/pools:
 *   get:
 *     summary: Get available staking pools
 *     tags: [DeFi]
 *     responses:
 *       200:
 *         description: List of staking pools
 */
router.get('/pools', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    const pools = await sdk.defi.getStakingPools();
    
    res.json({
      success: true,
      data: pools,
      count: pools.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/defi/strategies:
 *   get:
 *     summary: Get yield farming strategies
 *     tags: [DeFi]
 *     responses:
 *       200:
 *         description: List of yield strategies
 */
router.get('/strategies', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    const strategies = await sdk.defi.getYieldStrategies();
    
    res.json({
      success: true,
      data: strategies,
      count: strategies.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/defi/calculate-yield:
 *   post:
 *     summary: Calculate potential yield for asset
 *     tags: [DeFi]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assetId:
 *                 type: string
 *               strategy:
 *                 type: string
 *               duration:
 *                 type: number
 *             required:
 *               - assetId
 *               - strategy
 *               - duration
 *     responses:
 *       200:
 *         description: Yield calculation results
 */
router.post('/calculate-yield', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    const { assetId, strategy, duration } = req.body;
    
    if (!assetId || !strategy || !duration) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: assetId, strategy, duration',
      });
    }

    const asset = await sdk.assets.getAsset(assetId);
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found',
      });
    }

    const yieldCalculation = await sdk.defi.calculateYield(asset, strategy, duration);
    
    res.json({
      success: true,
      data: yieldCalculation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/defi/analytics:
 *   get:
 *     summary: Get DeFi analytics
 *     tags: [DeFi]
 *     responses:
 *       200:
 *         description: DeFi analytics data
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    const analytics = await sdk.defi.getDeFiAnalytics();
    
    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
