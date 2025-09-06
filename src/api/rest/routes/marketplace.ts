import { Router, Request, Response } from 'express';
import { OmniFlowSDK } from '../../sdk';
import { MarketplaceFilter, ListingType } from '../../sdk/core/types';

const router = Router();

/**
 * @swagger
 * /api/marketplace/listings:
 *   get:
 *     summary: Get marketplace listings
 *     tags: [Marketplace]
 *     parameters:
 *       - in: query
 *         name: chainId
 *         schema:
 *           type: string
 *           enum: [onechain, ethereum, polygon, bsc]
 *       - in: query
 *         name: listingType
 *         schema:
 *           type: string
 *           enum: [fixed, auction]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, sold, cancelled, expired]
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: List of marketplace listings
 */
router.get('/listings', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    
    const filter: MarketplaceFilter = {
      chainId: req.query.chainId as any,
      listingType: req.query.listingType as ListingType,
      status: req.query.status as any,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
    };

    const listings = await sdk.marketplace.getListings(filter);
    
    res.json({
      success: true,
      data: listings,
      count: listings.length,
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
 * /api/marketplace/listings/{id}:
 *   get:
 *     summary: Get listing by ID
 *     tags: [Marketplace]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Listing details
 *       404:
 *         description: Listing not found
 */
router.get('/listings/:id', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    const listing = await sdk.marketplace.getListing(req.params.id);
    
    if (!listing) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found',
      });
    }

    // Track view
    await sdk.marketplace.trackView(req.params.id);

    res.json({
      success: true,
      data: listing,
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
 * /api/marketplace/listings:
 *   post:
 *     summary: Create marketplace listing
 *     tags: [Marketplace]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assetId:
 *                 type: string
 *               price:
 *                 type: string
 *               listingType:
 *                 type: string
 *                 enum: [fixed, auction]
 *               duration:
 *                 type: number
 *             required:
 *               - assetId
 *               - price
 *               - listingType
 *     responses:
 *       201:
 *         description: Listing created successfully
 */
router.post('/listings', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    const { assetId, price, listingType, duration } = req.body;
    
    if (!assetId || !price || !listingType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: assetId, price, listingType',
      });
    }

    // Get asset first
    const asset = await sdk.assets.getAsset(assetId);
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found',
      });
    }

    const listing = await sdk.marketplace.createListing(asset, price, listingType, duration);
    
    res.status(201).json({
      success: true,
      data: listing,
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
 * /api/marketplace/listings/{id}/purchase:
 *   post:
 *     summary: Purchase asset from marketplace
 *     tags: [Marketplace]
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
 *               buyerAddress:
 *                 type: string
 *             required:
 *               - buyerAddress
 *     responses:
 *       200:
 *         description: Purchase successful
 */
router.post('/listings/:id/purchase', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    const { buyerAddress } = req.body;
    
    if (!buyerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: buyerAddress',
      });
    }

    const transaction = await sdk.marketplace.purchaseAsset(req.params.id, buyerAddress);
    
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
 * /api/marketplace/listings/{id}/bid:
 *   post:
 *     summary: Place bid on auction listing
 *     tags: [Marketplace]
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
 *               bidderAddress:
 *                 type: string
 *               bidAmount:
 *                 type: string
 *             required:
 *               - bidderAddress
 *               - bidAmount
 *     responses:
 *       200:
 *         description: Bid placed successfully
 */
router.post('/listings/:id/bid', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    const { bidderAddress, bidAmount } = req.body;
    
    if (!bidderAddress || !bidAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: bidderAddress, bidAmount',
      });
    }

    const transaction = await sdk.marketplace.placeBid(req.params.id, bidderAddress, bidAmount);
    
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
 * /api/marketplace/listings/{id}/cancel:
 *   post:
 *     summary: Cancel marketplace listing
 *     tags: [Marketplace]
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
 *               sellerAddress:
 *                 type: string
 *             required:
 *               - sellerAddress
 *     responses:
 *       200:
 *         description: Listing cancelled successfully
 */
router.post('/listings/:id/cancel', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    const { sellerAddress } = req.body;
    
    if (!sellerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: sellerAddress',
      });
    }

    const transaction = await sdk.marketplace.cancelListing(req.params.id, sellerAddress);
    
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
 * /api/marketplace/listings/{id}/price:
 *   put:
 *     summary: Update listing price
 *     tags: [Marketplace]
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
 *               newPrice:
 *                 type: string
 *               sellerAddress:
 *                 type: string
 *             required:
 *               - newPrice
 *               - sellerAddress
 *     responses:
 *       200:
 *         description: Price updated successfully
 */
router.put('/listings/:id/price', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    const { newPrice, sellerAddress } = req.body;
    
    if (!newPrice || !sellerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: newPrice, sellerAddress',
      });
    }

    const listing = await sdk.marketplace.updateListingPrice(req.params.id, newPrice, sellerAddress);
    
    res.json({
      success: true,
      data: listing,
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
 * /api/marketplace/stats:
 *   get:
 *     summary: Get marketplace statistics
 *     tags: [Marketplace]
 *     responses:
 *       200:
 *         description: Marketplace statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    const stats = await sdk.marketplace.getMarketplaceStats();
    
    res.json({
      success: true,
      data: stats,
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
 * /api/marketplace/trending:
 *   get:
 *     summary: Get trending listings
 *     tags: [Marketplace]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *     responses:
 *       200:
 *         description: Trending listings
 */
router.get('/trending', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const listings = await sdk.marketplace.getTrendingListings(limit);
    
    res.json({
      success: true,
      data: listings,
      count: listings.length,
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
 * /api/marketplace/recent-sales:
 *   get:
 *     summary: Get recent sales
 *     tags: [Marketplace]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *     responses:
 *       200:
 *         description: Recent sales
 */
router.get('/recent-sales', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const sales = await sdk.marketplace.getRecentSales(limit);
    
    res.json({
      success: true,
      data: sales,
      count: sales.length,
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
 * /api/marketplace/search:
 *   get:
 *     summary: Search marketplace listings
 *     tags: [Marketplace]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
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

    const listings = await sdk.marketplace.searchListings(query);
    
    res.json({
      success: true,
      data: listings,
      count: listings.length,
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
 * /api/marketplace/listings/{id}/favorite:
 *   post:
 *     summary: Toggle favorite status for listing
 *     tags: [Marketplace]
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
 *               userAddress:
 *                 type: string
 *             required:
 *               - userAddress
 *     responses:
 *       200:
 *         description: Favorite status toggled
 */
router.post('/listings/:id/favorite', async (req: Request, res: Response) => {
  try {
    const sdk = req.app.get('sdk') as OmniFlowSDK;
    const { userAddress } = req.body;
    
    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: userAddress',
      });
    }

    const isFavorited = await sdk.marketplace.toggleFavorite(req.params.id, userAddress);
    
    res.json({
      success: true,
      data: { isFavorited },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
