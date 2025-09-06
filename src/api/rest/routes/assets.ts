import { Router, Request, Response } from 'express';
import { OmniFlowSDK } from '../../sdk';
import { CreateAssetRequest, AssetFilter } from '../../sdk/core/types';

const router = Router();

/**
 * @swagger
 * /api/assets:
 *   get:
 *     summary: Get all RWA assets
 *     tags: [Assets]
 *     parameters:
 *       - in: query
 *         name: chainId
 *         schema:
 *           type: string
 *           enum: [onechain, ethereum, polygon, bsc]
 *         description: Filter by blockchain
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by asset type
 *       - in: query
 *         name: owner
 *         schema:
 *           type: string
 *         description: Filter by owner address
 *       - in: query
 *         name: minValue
 *         schema:
 *           type: number
 *         description: Minimum asset value
 *       - in: query
 *         name: maxValue
 *         schema:
 *           type: number
 *         description: Maximum asset value
 *     responses:
 *       200:
 *         description: List of assets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Asset'
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    
    const filter: AssetFilter = {
      chainId: req.query.chainId as any,
      type: req.query.type as any,
      owner: req.query.owner as string,
      minValue: req.query.minValue ? parseFloat(req.query.minValue as string) : undefined,
      maxValue: req.query.maxValue ? parseFloat(req.query.maxValue as string) : undefined,
    };

    const assets = await sdk.assets.getAssets(filter);
    
    res.json({
      success: true,
      data: assets,
      count: assets.length,
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
 * /api/assets/{id}:
 *   get:
 *     summary: Get asset by ID
 *     tags: [Assets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: Asset details
 *       404:
 *         description: Asset not found
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    const asset = await sdk.assets.getAsset(req.params.id);
    
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found',
      });
    }

    res.json({
      success: true,
      data: asset,
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
 * /api/assets:
 *   post:
 *     summary: Create new RWA asset
 *     tags: [Assets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAssetRequest'
 *     responses:
 *       201:
 *         description: Asset created successfully
 *       400:
 *         description: Invalid request data
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    const assetRequest: CreateAssetRequest = req.body;
    
    // Validate required fields
    if (!assetRequest.name || !assetRequest.type || !assetRequest.value || !assetRequest.chainId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, type, value, chainId',
      });
    }

    const asset = await sdk.assets.createAsset(assetRequest);
    
    res.status(201).json({
      success: true,
      data: asset,
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
 * /api/assets/{id}/transfer:
 *   post:
 *     summary: Transfer asset to new owner
 *     tags: [Assets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               toAddress:
 *                 type: string
 *                 description: Recipient address
 *             required:
 *               - toAddress
 *     responses:
 *       200:
 *         description: Transfer initiated
 */
router.post('/:id/transfer', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    const { toAddress } = req.body;
    
    if (!toAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: toAddress',
      });
    }

    const transaction = await sdk.assets.transferAsset(req.params.id, toAddress);
    
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
 * /api/assets/{id}/fractional:
 *   post:
 *     summary: Enable fractional ownership for asset
 *     tags: [Assets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               totalShares:
 *                 type: number
 *               pricePerShare:
 *                 type: string
 *             required:
 *               - totalShares
 *               - pricePerShare
 *     responses:
 *       200:
 *         description: Fractional ownership enabled
 */
router.post('/:id/fractional', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    const { totalShares, pricePerShare } = req.body;
    
    if (!totalShares || !pricePerShare) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: totalShares, pricePerShare',
      });
    }

    const asset = await sdk.assets.enableFractionalOwnership(
      req.params.id,
      totalShares,
      pricePerShare
    );
    
    res.json({
      success: true,
      data: asset,
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
 * /api/assets/{id}/valuation:
 *   get:
 *     summary: Get asset valuation and history
 *     tags: [Assets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Asset valuation data
 */
router.get('/:id/valuation', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    const valuation = await sdk.assets.getAssetValuation(req.params.id);
    
    res.json({
      success: true,
      data: valuation,
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
 * /api/assets/{id}/compliance:
 *   get:
 *     summary: Validate asset compliance
 *     tags: [Assets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Compliance validation results
 */
router.get('/:id/compliance', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    const compliance = await sdk.assets.validateCompliance(req.params.id);
    
    res.json({
      success: true,
      data: compliance,
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
 * /api/assets/search:
 *   get:
 *     summary: Search assets by name or description
 *     tags: [Assets]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    const query = req.query.q as string;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Missing search query parameter: q',
      });
    }

    const assets = await sdk.assets.searchAssets(query);
    
    res.json({
      success: true,
      data: assets,
      count: assets.length,
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
 * /api/assets/types/{type}:
 *   get:
 *     summary: Get assets by type
 *     tags: [Assets]
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset type
 *     responses:
 *       200:
 *         description: Assets of specified type
 */
router.get('/types/:type', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    const assets = await sdk.assets.getAssetsByType(req.params.type as any);
    
    res.json({
      success: true,
      data: assets,
      count: assets.length,
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
 * /api/assets/owners/{address}:
 *   get:
 *     summary: Get assets by owner
 *     tags: [Assets]
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         description: Owner address
 *     responses:
 *       200:
 *         description: Assets owned by address
 */
router.get('/owners/:address', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    const assets = await sdk.assets.getAssetsByOwner(req.params.address);
    
    res.json({
      success: true,
      data: assets,
      count: assets.length,
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
 * /api/assets/chains/{chainId}:
 *   get:
 *     summary: Get assets by chain
 *     tags: [Assets]
 *     parameters:
 *       - in: path
 *         name: chainId
 *         required: true
 *         schema:
 *           type: string
 *           enum: [onechain, ethereum, polygon, bsc]
 *         description: Chain ID
 *     responses:
 *       200:
 *         description: Assets on specified chain
 */
router.get('/chains/:chainId', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    const assets = await sdk.assets.getAssetsByChain(req.params.chainId as any);
    
    res.json({
      success: true,
      data: assets,
      count: assets.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
