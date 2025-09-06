import { ethers } from "ethers";
import axios from "axios";

// Chainlink Price Feed ABI
const PRICE_FEED_ABI = [
  "function latestRoundData() external view returns (uint80 roundId, int256 price, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function decimals() external view returns (uint8)",
  "function description() external view returns (string memory)",
];

// Chainlink VRF ABI (for randomness)
const VRF_ABI = [
  "function requestRandomWords(bytes32 keyHash, uint64 subId, uint16 minimumRequestConfirmations, uint32 callbackGasLimit, uint32 numWords) external returns (uint256 requestId)",
];

export interface PriceFeedData {
  asset: string;
  price: number;
  decimals: number;
  updatedAt: number;
  roundId: string;
  source: string;
}

export interface RWAVerificationData {
  assetId: string;
  verificationType: "document" | "valuation" | "compliance" | "ownership";
  verificationHash: string;
  oracleSignature: string;
  timestamp: number;
  verifier: string;
  status: "pending" | "verified" | "rejected";
}

export interface OracleConfig {
  chainId: number;
  rpcUrl: string;
  priceFeeds: Record<string, string>; // asset -> contract address
  vrfCoordinator?: string;
  keyHash?: string;
  subscriptionId?: string;
}

class OracleIntegrationService {
  private provider: ethers.providers.JsonRpcProvider;
  private config: OracleConfig;
  private priceFeeds: Map<string, ethers.Contract> = new Map();

  constructor(config: OracleConfig) {
    this.config = config;
    this.provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    this.initializePriceFeeds();
  }

  private initializePriceFeeds() {
    Object.entries(this.config.priceFeeds).forEach(([asset, address]) => {
      const contract = new ethers.Contract(address, PRICE_FEED_ABI, this.provider);
      this.priceFeeds.set(asset, contract);
    });
  }

  /**
   * Get real-time price from Chainlink price feeds
   */
  async getAssetPrice(asset: string): Promise<PriceFeedData | null> {
    try {
      const priceFeed = this.priceFeeds.get(asset.toUpperCase());
      if (!priceFeed) {
        console.warn(`Price feed not available for ${asset}`);
        return null;
      }

      const [roundId, price, startedAt, updatedAt, answeredInRound] = 
        await priceFeed.latestRoundData();
      
      const decimals = await priceFeed.decimals();
      const description = await priceFeed.description();

      const priceData: PriceFeedData = {
        asset: description,
        price: parseFloat(ethers.utils.formatUnits(price, decimals)),
        decimals,
        updatedAt: updatedAt.toNumber(),
        roundId: roundId.toString(),
        source: "Chainlink",
      };

      return priceData;
    } catch (error) {
      console.error(`Error fetching price for ${asset}:`, error);
      return null;
    }
  }

  /**
   * Get multiple asset prices in batch
   */
  async getBatchPrices(assets: string[]): Promise<Record<string, PriceFeedData | null>> {
    const results: Record<string, PriceFeedData | null> = {};
    
    const promises = assets.map(async (asset) => {
      const price = await this.getAssetPrice(asset);
      results[asset] = price;
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Get RWA-specific pricing using external APIs and oracles
   */
  async getRWAPrice(
    category: "real_estate" | "carbon_credits" | "precious_metals" | "commodities" | "certificates",
    specifications: Record<string, any>,
    location?: string
  ): Promise<PriceFeedData> {
    try {
      switch (category) {
        case "real_estate":
          return await this.getRealEstatePrice(specifications, location);
        case "carbon_credits":
          return await this.getCarbonCreditPrice(specifications);
        case "precious_metals":
          return await this.getPreciousMetalPrice(specifications);
        case "commodities":
          return await this.getCommodityPrice(specifications);
        case "certificates":
          return await this.getCertificatePrice(specifications);
        default:
          throw new Error(`Unsupported RWA category: ${category}`);
      }
    } catch (error) {
      console.error(`Error getting RWA price for ${category}:`, error);
      throw error;
    }
  }

  /**
   * Real estate pricing using Zillow/similar APIs
   */
  private async getRealEstatePrice(
    specifications: Record<string, any>,
    location?: string
  ): Promise<PriceFeedData> {
    try {
      // Mock implementation - in production, integrate with Zillow API, CoreLogic, etc.
      const basePrice = 250000;
      const sqft = specifications.square_feet || 2000;
      const bedrooms = specifications.bedrooms || 3;
      const bathrooms = specifications.bathrooms || 2;
      
      // Simple pricing model
      let price = basePrice;
      price += (sqft - 2000) * 150; // $150 per additional sqft
      price += (bedrooms - 3) * 25000; // $25k per additional bedroom
      price += (bathrooms - 2) * 15000; // $15k per additional bathroom
      
      // Location multiplier (mock)
      const locationMultipliers: Record<string, number> = {
        "california": 2.5,
        "new_york": 2.2,
        "texas": 1.1,
        "florida": 1.3,
        "default": 1.0,
      };
      
      const multiplier = locationMultipliers[location?.toLowerCase() || "default"];
      price *= multiplier;

      return {
        asset: "Real Estate",
        price,
        decimals: 0,
        updatedAt: Date.now() / 1000,
        roundId: Date.now().toString(),
        source: "RWA Oracle - Real Estate",
      };
    } catch (error) {
      console.error("Error getting real estate price:", error);
      throw error;
    }
  }

  /**
   * Carbon credit pricing
   */
  private async getCarbonCreditPrice(specifications: Record<string, any>): Promise<PriceFeedData> {
    try {
      // Mock implementation - integrate with carbon credit exchanges
      const basePrice = 15; // $15 per ton CO2
      const creditType = specifications.credit_type || "forest_conservation";
      const vintage = specifications.vintage || new Date().getFullYear();
      const standard = specifications.standard || "VCS";
      
      // Pricing adjustments
      let price = basePrice;
      
      // Credit type multipliers
      const typeMultipliers: Record<string, number> = {
        "renewable_energy": 1.2,
        "forest_conservation": 1.0,
        "direct_air_capture": 3.0,
        "methane_capture": 0.8,
      };
      
      price *= typeMultipliers[creditType] || 1.0;
      
      // Vintage adjustment (newer = more expensive)
      const currentYear = new Date().getFullYear();
      const ageDiscount = Math.max(0, (currentYear - vintage) * 0.05);
      price *= (1 - ageDiscount);
      
      // Standard premium
      if (standard === "Gold Standard") {
        price *= 1.15;
      }

      return {
        asset: "Carbon Credits",
        price,
        decimals: 2,
        updatedAt: Date.now() / 1000,
        roundId: Date.now().toString(),
        source: "RWA Oracle - Carbon Credits",
      };
    } catch (error) {
      console.error("Error getting carbon credit price:", error);
      throw error;
    }
  }

  /**
   * Precious metals pricing using Chainlink feeds
   */
  private async getPreciousMetalPrice(specifications: Record<string, any>): Promise<PriceFeedData> {
    try {
      const metal = specifications.metal_type || "gold";
      const weight = specifications.weight_oz || 1;
      const purity = specifications.purity || 0.999;
      
      // Get base metal price from Chainlink
      let basePrice: PriceFeedData | null = null;
      
      switch (metal.toLowerCase()) {
        case "gold":
          basePrice = await this.getAssetPrice("XAU");
          break;
        case "silver":
          basePrice = await this.getAssetPrice("XAG");
          break;
        default:
          // Mock price for other metals
          basePrice = {
            asset: metal,
            price: 2000,
            decimals: 2,
            updatedAt: Date.now() / 1000,
            roundId: Date.now().toString(),
            source: "Mock Oracle",
          };
      }
      
      if (!basePrice) {
        throw new Error(`Unable to get price for ${metal}`);
      }
      
      // Calculate total value
      const totalValue = basePrice.price * weight * purity;
      
      return {
        asset: `${metal} (${weight}oz, ${purity * 100}% pure)`,
        price: totalValue,
        decimals: basePrice.decimals,
        updatedAt: basePrice.updatedAt,
        roundId: basePrice.roundId,
        source: basePrice.source,
      };
    } catch (error) {
      console.error("Error getting precious metal price:", error);
      throw error;
    }
  }

  /**
   * Commodity pricing
   */
  private async getCommodityPrice(specifications: Record<string, any>): Promise<PriceFeedData> {
    try {
      const commodity = specifications.commodity_type || "oil";
      const quantity = specifications.quantity || 1;
      const unit = specifications.unit || "barrel";
      
      // Mock commodity prices - integrate with CME, ICE, etc.
      const commodityPrices: Record<string, number> = {
        "oil": 80,
        "natural_gas": 3.5,
        "wheat": 7.5,
        "corn": 6.2,
        "soybeans": 14.8,
        "copper": 8500,
        "aluminum": 2200,
      };
      
      const basePrice = commodityPrices[commodity.toLowerCase()] || 100;
      const totalValue = basePrice * quantity;
      
      return {
        asset: `${commodity} (${quantity} ${unit})`,
        price: totalValue,
        decimals: 2,
        updatedAt: Date.now() / 1000,
        roundId: Date.now().toString(),
        source: "RWA Oracle - Commodities",
      };
    } catch (error) {
      console.error("Error getting commodity price:", error);
      throw error;
    }
  }

  /**
   * Certificate/credential pricing
   */
  private async getCertificatePrice(specifications: Record<string, any>): Promise<PriceFeedData> {
    try {
      const certificateType = specifications.certificate_type || "diploma";
      const institution = specifications.institution || "unknown";
      const level = specifications.level || "bachelor";
      
      // Mock certificate valuations
      const basePrices: Record<string, number> = {
        "diploma": 50000,
        "certificate": 10000,
        "license": 25000,
        "patent": 100000,
        "trademark": 75000,
      };
      
      let price = basePrices[certificateType] || 10000;
      
      // Institution premium
      const prestigiousInstitutions = ["harvard", "mit", "stanford", "oxford", "cambridge"];
      if (prestigiousInstitutions.some(inst => institution.toLowerCase().includes(inst))) {
        price *= 2.0;
      }
      
      // Level adjustment
      const levelMultipliers: Record<string, number> = {
        "associate": 0.5,
        "bachelor": 1.0,
        "master": 1.5,
        "doctorate": 2.5,
        "professional": 2.0,
      };
      
      price *= levelMultipliers[level] || 1.0;
      
      return {
        asset: `${certificateType} - ${institution}`,
        price,
        decimals: 0,
        updatedAt: Date.now() / 1000,
        roundId: Date.now().toString(),
        source: "RWA Oracle - Certificates",
      };
    } catch (error) {
      console.error("Error getting certificate price:", error);
      throw error;
    }
  }

  /**
   * Verify RWA authenticity using external verification services
   */
  async verifyRWAAuthenticity(
    assetId: string,
    verificationType: RWAVerificationData["verificationType"],
    documentHash: string,
    additionalData?: Record<string, any>
  ): Promise<RWAVerificationData> {
    try {
      // Mock verification process - integrate with real verification services
      const verificationData: RWAVerificationData = {
        assetId,
        verificationType,
        verificationHash: documentHash,
        oracleSignature: this.generateMockSignature(documentHash),
        timestamp: Date.now(),
        verifier: "OmniFlow Verification Oracle",
        status: "pending",
      };

      // Simulate verification process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock verification result (90% success rate)
      verificationData.status = Math.random() > 0.1 ? "verified" : "rejected";
      
      return verificationData;
    } catch (error) {
      console.error("Error verifying RWA authenticity:", error);
      throw error;
    }
  }

  /**
   * Get price history for an asset
   */
  async getPriceHistory(
    asset: string,
    timeframe: "1h" | "24h" | "7d" | "30d" = "24h"
  ): Promise<Array<{ timestamp: number; price: number }>> {
    try {
      // Mock price history - integrate with historical data providers
      const currentPrice = (await this.getAssetPrice(asset))?.price || 100;
      const dataPoints = timeframe === "1h" ? 60 : timeframe === "24h" ? 24 : timeframe === "7d" ? 7 : 30;
      const interval = timeframe === "1h" ? 60000 : timeframe === "24h" ? 3600000 : 86400000;
      
      const history = [];
      for (let i = dataPoints; i >= 0; i--) {
        const timestamp = Date.now() - (i * interval);
        const volatility = 0.02; // 2% volatility
        const change = (Math.random() - 0.5) * volatility;
        const price = currentPrice * (1 + change);
        
        history.push({ timestamp, price });
      }
      
      return history;
    } catch (error) {
      console.error("Error getting price history:", error);
      return [];
    }
  }

  /**
   * Request random number from Chainlink VRF (for fair asset distribution, etc.)
   */
  async requestRandomness(
    signer: ethers.Signer,
    numWords: number = 1
  ): Promise<string> {
    try {
      if (!this.config.vrfCoordinator || !this.config.keyHash || !this.config.subscriptionId) {
        throw new Error("VRF configuration not provided");
      }

      const vrfContract = new ethers.Contract(
        this.config.vrfCoordinator,
        VRF_ABI,
        signer
      );

      const tx = await vrfContract.requestRandomWords(
        this.config.keyHash,
        this.config.subscriptionId,
        3, // minimum confirmations
        100000, // callback gas limit
        numWords
      );

      const receipt = await tx.wait();
      return receipt.transactionHash;
    } catch (error) {
      console.error("Error requesting randomness:", error);
      throw error;
    }
  }

  /**
   * Get supported price feeds
   */
  getSupportedAssets(): string[] {
    return Array.from(this.priceFeeds.keys());
  }

  /**
   * Private helper methods
   */
  private generateMockSignature(data: string): string {
    // Mock signature generation - use real cryptographic signing in production
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(data + Date.now()));
  }
}

// Default configurations for different networks
export const getOracleConfig = (network: "ethereum" | "polygon" | "bsc" = "ethereum"): OracleConfig => {
  const configs = {
    ethereum: {
      chainId: 1,
      rpcUrl: "https://rpc.ankr.com/eth",
      priceFeeds: {
        "ETH": "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
        "BTC": "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c",
        "XAU": "0x214eD9Da11D2fbe465a6fc601a91E62EbEc1a0D6", // Gold
        "XAG": "0x379589227b15F1a12195D3f2d90bBc9F31f95235", // Silver
        "USDC": "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6",
      },
      vrfCoordinator: "0x271682DEB8C4E0901D1a1550aD2e64D568E69909",
      keyHash: "0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef",
      subscriptionId: "1",
    },
    polygon: {
      chainId: 137,
      rpcUrl: "https://rpc.ankr.com/polygon",
      priceFeeds: {
        "MATIC": "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0",
        "ETH": "0xF9680D99D6C9589e2a93a78A04A279e509205945",
        "BTC": "0xc907E116054Ad103354f2D350FD2514433D57F6f",
      },
    },
    bsc: {
      chainId: 56,
      rpcUrl: "https://bsc-dataseed1.binance.org",
      priceFeeds: {
        "BNB": "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE",
        "ETH": "0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e",
        "BTC": "0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf",
      },
    },
  };

  return configs[network];
};

// Export factory function
export const createOracleService = (network: "ethereum" | "polygon" | "bsc" = "ethereum") => {
  const config = getOracleConfig(network);
  return new OracleIntegrationService(config);
};

export { OracleIntegrationService };
