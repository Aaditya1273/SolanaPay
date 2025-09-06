import { Router, Request, Response } from 'express';
import { OmniFlowSDK } from '../../sdk';
import { ChainId } from '../../sdk/core/types';

const router = Router();

/**
 * @swagger
 * /api/bridge/transfers:
 *   get:
 *     summary: Get bridge transfers
 *     tags: [Bridge]
 *     parameters:
 *       - in: query
 *         name: userAddress
 *         schema:
 *           type: string
 *         description: Filter by user address
 *     responses:
 *       200:
 *         description: List of bridge transfers
 */
router.get('/transfers', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    const userAddress = req.query.userAddress as string;
    
    const transfers = await sdk.bridge.getBridgeTransfers(userAddress);
    
    res.json({
      success: true,
      data: transfers,
      count: transfers.length,
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
 * /api/bridge/transfers/{id}:
 *   get:
 *     summary: Get bridge transfer by ID
 *     tags: [Bridge]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bridge transfer details
 *       404:
 *         description: Transfer not found
 */
router.get('/transfers/:id', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    const transfer = await sdk.bridge.getBridgeTransfer(req.params.id);
    
    if (!transfer) {
      return res.status(404).json({
        success: false,
        error: 'Bridge transfer not found',
      });
    }

    res.json({
      success: true,
      data: transfer,
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
 * /api/bridge/transfer:
 *   post:
 *     summary: Bridge RWA asset to another chain
 *     tags: [Bridge]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assetId:
 *                 type: string
 *               targetChainId:
 *                 type: string
 *                 enum: [onechain, ethereum, polygon, bsc]
 *               recipient:
 *                 type: string
 *             required:
 *               - assetId
 *               - targetChainId
 *     responses:
 *       201:
 *         description: Bridge transfer initiated
 */
router.post('/transfer', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    const { assetId, targetChainId, recipient } = req.body;
    
    if (!assetId || !targetChainId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: assetId, targetChainId',
      });
    }

    const asset = await sdk.assets.getAsset(assetId);
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found',
      });
    }

    const transfer = await sdk.bridge.bridgeAsset(asset, targetChainId as ChainId, recipient);
    
    res.status(201).json({
      success: true,
      data: transfer,
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
 * /api/bridge/estimate:
 *   post:
 *     summary: Estimate bridge cost and time
 *     tags: [Bridge]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assetId:
 *                 type: string
 *               targetChainId:
 *                 type: string
 *                 enum: [onechain, ethereum, polygon, bsc]
 *             required:
 *               - assetId
 *               - targetChainId
 *     responses:
 *       200:
 *         description: Bridge estimation
 */
router.post('/estimate', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    const { assetId, targetChainId } = req.body;
    
    if (!assetId || !targetChainId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: assetId, targetChainId',
      });
    }

    const asset = await sdk.assets.getAsset(assetId);
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found',
      });
    }

    const estimation = await sdk.bridge.estimateBridge(asset, targetChainId as ChainId);
    
    res.json({
      success: true,
      data: estimation,
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
 * /api/bridge/routes:
 *   get:
 *     summary: Get supported bridge routes
 *     tags: [Bridge]
 *     responses:
 *       200:
 *         description: List of supported bridge routes
 */
router.get('/routes', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    const routes = await sdk.bridge.getSupportedRoutes();
    
    res.json({
      success: true,
      data: routes,
      count: routes.length,
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
 * /api/bridge/transfers/{id}/cancel:
 *   post:
 *     summary: Cancel pending bridge transfer
 *     tags: [Bridge]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transfer cancelled successfully
 */
router.post('/transfers/:id/cancel', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    const transaction = await sdk.bridge.cancelBridgeTransfer(req.params.id);
    
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
 * /api/bridge/analytics:
 *   get:
 *     summary: Get bridge analytics
 *     tags: [Bridge]
 *     responses:
 *       200:
 *         description: Bridge analytics data
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    const analytics = await sdk.bridge.getBridgeAnalytics();
    
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
