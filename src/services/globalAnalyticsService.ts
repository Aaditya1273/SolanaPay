import { EventEmitter } from 'events';

// Types for global asset analytics
export interface GlobalAsset {
  id: string;
  tokenId: number;
  name: string;
  type: 'real-estate' | 'carbon-credits' | 'precious-metals' | 'commodities' | 'renewable-energy' | 'infrastructure' | 'art' | 'bonds';
  location: {
    lat: number;
    lng: number;
    country: string;
    city: string;
    address?: string;
  };
  value: {
    current: number;
    currency: string;
    change24h: number;
    changePercent24h: number;
    marketCap: number;
  };
  ownership: {
    totalShares: number;
    availableShares: number;
    holders: number;
    topHolder: string;
    distributionScore: number; // 0-100, higher = more distributed
  };
  trading: {
    volume24h: number;
    trades24h: number;
    lastTradePrice: number;
    lastTradeTime: string;
    liquidity: number;
    spread: number;
  };
  performance: {
    roi1d: number;
    roi7d: number;
    roi30d: number;
    roi1y: number;
    volatility: number;
    sharpeRatio: number;
  };
  metadata: {
    description: string;
    images: string[];
    documents: string[];
    compliance: {
      kyc: boolean;
      aml: boolean;
      regulatory: string[];
    };
    sustainability: {
      esgScore: number;
      carbonFootprint: number;
      sustainabilityRating: 'A' | 'B' | 'C' | 'D';
    };
  };
  status: 'active' | 'pending' | 'suspended' | 'delisted';
  createdAt: string;
  lastUpdated: string;
}

export interface MarketOverview {
  totalAssets: number;
  totalValue: number;
  totalVolume24h: number;
  totalTrades24h: number;
  averageRoi24h: number;
  topPerformers: GlobalAsset[];
  mostTraded: GlobalAsset[];
  recentlyListed: GlobalAsset[];
  marketSentiment: 'bullish' | 'bearish' | 'neutral';
  volatilityIndex: number;
}

export interface RegionalData {
  region: string;
  country: string;
  assetCount: number;
  totalValue: number;
  volume24h: number;
  averageRoi: number;
  topAssetTypes: Array<{
    type: string;
    count: number;
    value: number;
  }>;
  marketShare: number;
}

export interface TradingActivity {
  timestamp: string;
  assetId: string;
  type: 'buy' | 'sell' | 'transfer';
  amount: number;
  price: number;
  volume: number;
  buyer?: string;
  seller?: string;
  location: {
    lat: number;
    lng: number;
  };
}

export interface PriceAlert {
  id: string;
  assetId: string;
  type: 'price_increase' | 'price_decrease' | 'volume_spike' | 'new_listing' | 'large_trade';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  data: any;
}

class GlobalAnalyticsService extends EventEmitter {
  private assets: Map<string, GlobalAsset> = new Map();
  private tradingActivity: TradingActivity[] = [];
  private priceAlerts: PriceAlert[] = [];
  private updateInterval: NodeJS.Timeout | null = null;
  private isConnected = false;

  constructor() {
    super();
    this.initializeMockData();
    this.startRealTimeUpdates();
  }

  // Initialize with comprehensive mock data
  private initializeMockData() {
    const mockAssets: GlobalAsset[] = [
      // Real Estate Assets
      {
        id: 'asset-1',
        tokenId: 1001,
        name: 'Manhattan Luxury Apartment',
        type: 'real-estate',
        location: { lat: 40.7589, lng: -73.9851, country: 'USA', city: 'New York' },
        value: { current: 2500000, currency: 'USD', change24h: 15000, changePercent24h: 0.6, marketCap: 2500000 },
        ownership: { totalShares: 1000, availableShares: 250, holders: 45, topHolder: '0x123...', distributionScore: 78 },
        trading: { volume24h: 125000, trades24h: 8, lastTradePrice: 2515, lastTradeTime: new Date().toISOString(), liquidity: 95000, spread: 0.5 },
        performance: { roi1d: 0.6, roi7d: 2.1, roi30d: 8.5, roi1y: 15.2, volatility: 12.5, sharpeRatio: 1.8 },
        metadata: {
          description: 'Premium luxury apartment in Manhattan with city views',
          images: ['/assets/real-estate-1.jpg'],
          documents: ['deed.pdf', 'appraisal.pdf'],
          compliance: { kyc: true, aml: true, regulatory: ['SEC', 'FINRA'] },
          sustainability: { esgScore: 85, carbonFootprint: 2.5, sustainabilityRating: 'A' }
        },
        status: 'active',
        createdAt: '2024-01-15T10:00:00Z',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'asset-2',
        tokenId: 1002,
        name: 'London Commercial Property',
        type: 'real-estate',
        location: { lat: 51.5074, lng: -0.1278, country: 'UK', city: 'London' },
        value: { current: 1800000, currency: 'USD', change24h: -8000, changePercent24h: -0.4, marketCap: 1800000 },
        ownership: { totalShares: 800, availableShares: 120, holders: 32, topHolder: '0x456...', distributionScore: 65 },
        trading: { volume24h: 89000, trades24h: 5, lastTradePrice: 2250, lastTradeTime: new Date(Date.now() - 3600000).toISOString(), liquidity: 67000, spread: 0.8 },
        performance: { roi1d: -0.4, roi7d: 1.2, roi30d: 5.8, roi1y: 12.1, volatility: 15.2, sharpeRatio: 1.4 },
        metadata: {
          description: 'Prime commercial property in Central London',
          images: ['/assets/real-estate-2.jpg'],
          documents: ['lease.pdf', 'valuation.pdf'],
          compliance: { kyc: true, aml: true, regulatory: ['FCA'] },
          sustainability: { esgScore: 78, carbonFootprint: 3.2, sustainabilityRating: 'B' }
        },
        status: 'active',
        createdAt: '2024-02-01T14:30:00Z',
        lastUpdated: new Date().toISOString()
      },
      // Carbon Credits
      {
        id: 'asset-3',
        tokenId: 2001,
        name: 'Amazon Rainforest Carbon Credits',
        type: 'carbon-credits',
        location: { lat: -3.4653, lng: -62.2159, country: 'Brazil', city: 'Manaus' },
        value: { current: 450000, currency: 'USD', change24h: 12000, changePercent24h: 2.7, marketCap: 450000 },
        ownership: { totalShares: 5000, availableShares: 1200, holders: 89, topHolder: '0x789...', distributionScore: 92 },
        trading: { volume24h: 34000, trades24h: 15, lastTradePrice: 90, lastTradeTime: new Date(Date.now() - 1800000).toISOString(), liquidity: 28000, spread: 1.2 },
        performance: { roi1d: 2.7, roi7d: 8.5, roi30d: 18.2, roi1y: 45.8, volatility: 25.8, sharpeRatio: 2.1 },
        metadata: {
          description: 'Verified carbon credits from Amazon rainforest conservation',
          images: ['/assets/carbon-1.jpg'],
          documents: ['verification.pdf', 'impact-report.pdf'],
          compliance: { kyc: true, aml: true, regulatory: ['VERRA', 'UNFCCC'] },
          sustainability: { esgScore: 98, carbonFootprint: -150.5, sustainabilityRating: 'A' }
        },
        status: 'active',
        createdAt: '2024-01-20T09:15:00Z',
        lastUpdated: new Date().toISOString()
      },
      // Precious Metals
      {
        id: 'asset-4',
        tokenId: 3001,
        name: 'Swiss Gold Vault Holdings',
        type: 'precious-metals',
        location: { lat: 46.2044, lng: 6.1432, country: 'Switzerland', city: 'Geneva' },
        value: { current: 980000, currency: 'USD', change24h: 5500, changePercent24h: 0.6, marketCap: 980000 },
        ownership: { totalShares: 1000, availableShares: 180, holders: 67, topHolder: '0xabc...', distributionScore: 73 },
        trading: { volume24h: 67000, trades24h: 12, lastTradePrice: 980, lastTradeTime: new Date(Date.now() - 900000).toISOString(), liquidity: 45000, spread: 0.3 },
        performance: { roi1d: 0.6, roi7d: 3.2, roi30d: 7.8, roi1y: 18.5, volatility: 8.9, sharpeRatio: 2.3 },
        metadata: {
          description: 'Physical gold stored in Swiss secure vaults',
          images: ['/assets/gold-1.jpg'],
          documents: ['certificate.pdf', 'audit-report.pdf'],
          compliance: { kyc: true, aml: true, regulatory: ['FINMA'] },
          sustainability: { esgScore: 65, carbonFootprint: 1.8, sustainabilityRating: 'B' }
        },
        status: 'active',
        createdAt: '2024-01-10T16:45:00Z',
        lastUpdated: new Date().toISOString()
      },
      // Renewable Energy
      {
        id: 'asset-5',
        tokenId: 4001,
        name: 'California Solar Farm',
        type: 'renewable-energy',
        location: { lat: 35.3733, lng: -119.0187, country: 'USA', city: 'Bakersfield' },
        value: { current: 3200000, currency: 'USD', change24h: 28000, changePercent24h: 0.9, marketCap: 3200000 },
        ownership: { totalShares: 2000, availableShares: 450, holders: 156, topHolder: '0xdef...', distributionScore: 88 },
        trading: { volume24h: 145000, trades24h: 18, lastTradePrice: 1600, lastTradeTime: new Date(Date.now() - 600000).toISOString(), liquidity: 98000, spread: 0.4 },
        performance: { roi1d: 0.9, roi7d: 4.2, roi30d: 12.5, roi1y: 22.8, volatility: 18.5, sharpeRatio: 1.9 },
        metadata: {
          description: '50MW solar farm generating clean energy',
          images: ['/assets/solar-1.jpg'],
          documents: ['ppa.pdf', 'environmental-impact.pdf'],
          compliance: { kyc: true, aml: true, regulatory: ['FERC', 'EPA'] },
          sustainability: { esgScore: 95, carbonFootprint: -45.2, sustainabilityRating: 'A' }
        },
        status: 'active',
        createdAt: '2024-02-05T11:20:00Z',
        lastUpdated: new Date().toISOString()
      },
      // Art & Collectibles
      {
        id: 'asset-6',
        tokenId: 5001,
        name: 'Contemporary Art Collection',
        type: 'art',
        location: { lat: 48.8566, lng: 2.3522, country: 'France', city: 'Paris' },
        value: { current: 750000, currency: 'USD', change24h: 18000, changePercent24h: 2.4, marketCap: 750000 },
        ownership: { totalShares: 500, availableShares: 85, holders: 28, topHolder: '0x111...', distributionScore: 58 },
        trading: { volume24h: 42000, trades24h: 6, lastTradePrice: 1500, lastTradeTime: new Date(Date.now() - 7200000).toISOString(), liquidity: 32000, spread: 1.5 },
        performance: { roi1d: 2.4, roi7d: 6.8, roi30d: 15.2, roi1y: 28.5, volatility: 32.1, sharpeRatio: 1.6 },
        metadata: {
          description: 'Curated collection of contemporary artworks',
          images: ['/assets/art-1.jpg'],
          documents: ['provenance.pdf', 'appraisal.pdf'],
          compliance: { kyc: true, aml: true, regulatory: ['CNIL'] },
          sustainability: { esgScore: 72, carbonFootprint: 0.8, sustainabilityRating: 'B' }
        },
        status: 'active',
        createdAt: '2024-01-25T13:10:00Z',
        lastUpdated: new Date().toISOString()
      },
      // Infrastructure
      {
        id: 'asset-7',
        tokenId: 6001,
        name: 'Singapore Data Center',
        type: 'infrastructure',
        location: { lat: 1.3521, lng: 103.8198, country: 'Singapore', city: 'Singapore' },
        value: { current: 5500000, currency: 'USD', change24h: 35000, changePercent24h: 0.6, marketCap: 5500000 },
        ownership: { totalShares: 5000, availableShares: 750, holders: 234, topHolder: '0x222...', distributionScore: 91 },
        trading: { volume24h: 198000, trades24h: 22, lastTradePrice: 1100, lastTradeTime: new Date(Date.now() - 300000).toISOString(), liquidity: 156000, spread: 0.2 },
        performance: { roi1d: 0.6, roi7d: 2.8, roi30d: 9.5, roi1y: 16.8, volatility: 11.2, sharpeRatio: 2.1 },
        metadata: {
          description: 'Tier 3 data center with 99.9% uptime guarantee',
          images: ['/assets/datacenter-1.jpg'],
          documents: ['lease-agreement.pdf', 'technical-specs.pdf'],
          compliance: { kyc: true, aml: true, regulatory: ['MAS'] },
          sustainability: { esgScore: 82, carbonFootprint: 8.5, sustainabilityRating: 'A' }
        },
        status: 'active',
        createdAt: '2024-01-30T08:30:00Z',
        lastUpdated: new Date().toISOString()
      },
      // Commodities
      {
        id: 'asset-8',
        tokenId: 7001,
        name: 'Australian Lithium Mine',
        type: 'commodities',
        location: { lat: -30.7554, lng: 121.4692, country: 'Australia', city: 'Kalgoorlie' },
        value: { current: 4200000, currency: 'USD', change24h: 65000, changePercent24h: 1.6, marketCap: 4200000 },
        ownership: { totalShares: 3000, availableShares: 520, holders: 187, topHolder: '0x333...', distributionScore: 85 },
        trading: { volume24h: 178000, trades24h: 16, lastTradePrice: 1400, lastTradeTime: new Date(Date.now() - 1200000).toISOString(), liquidity: 134000, spread: 0.6 },
        performance: { roi1d: 1.6, roi7d: 7.2, roi30d: 22.8, roi1y: 38.5, volatility: 28.9, sharpeRatio: 1.8 },
        metadata: {
          description: 'High-grade lithium mining operation for EV batteries',
          images: ['/assets/lithium-1.jpg'],
          documents: ['mining-license.pdf', 'reserves-report.pdf'],
          compliance: { kyc: true, aml: true, regulatory: ['ASIC', 'ACMA'] },
          sustainability: { esgScore: 68, carbonFootprint: 12.5, sustainabilityRating: 'B' }
        },
        status: 'active',
        createdAt: '2024-02-10T12:45:00Z',
        lastUpdated: new Date().toISOString()
      }
    ];

    // Store assets in map
    mockAssets.forEach(asset => {
      this.assets.set(asset.id, asset);
    });

    // Generate initial trading activity
    this.generateTradingActivity();
  }

  // Start real-time updates
  private startRealTimeUpdates() {
    this.isConnected = true;
    this.updateInterval = setInterval(() => {
      this.updateAssetPrices();
      this.generateTradingActivity();
      this.checkPriceAlerts();
      this.emit('dataUpdate', {
        assets: Array.from(this.assets.values()),
        tradingActivity: this.tradingActivity.slice(-50),
        alerts: this.priceAlerts.slice(-10)
      });
    }, 5000); // Update every 5 seconds
  }

  // Update asset prices with realistic fluctuations
  private updateAssetPrices() {
    this.assets.forEach((asset, id) => {
      const volatility = asset.performance.volatility / 100;
      const randomChange = (Math.random() - 0.5) * 2 * volatility * 0.1;
      const newPrice = asset.value.current * (1 + randomChange);
      const change24h = newPrice - asset.value.current;
      const changePercent24h = (change24h / asset.value.current) * 100;

      // Update asset values
      asset.value.current = Math.max(newPrice, asset.value.current * 0.95); // Prevent extreme drops
      asset.value.change24h = change24h;
      asset.value.changePercent24h = changePercent24h;
      asset.lastUpdated = new Date().toISOString();

      // Update performance metrics
      asset.performance.roi1d = changePercent24h;
      asset.performance.roi7d += randomChange * 7;
      asset.performance.roi30d += randomChange * 30;

      this.assets.set(id, asset);
    });
  }

  // Generate realistic trading activity
  private generateTradingActivity() {
    const assets = Array.from(this.assets.values());
    const numTrades = Math.floor(Math.random() * 5) + 1;

    for (let i = 0; i < numTrades; i++) {
      const asset = assets[Math.floor(Math.random() * assets.length)];
      const activity: TradingActivity = {
        timestamp: new Date().toISOString(),
        assetId: asset.id,
        type: Math.random() > 0.5 ? 'buy' : 'sell',
        amount: Math.floor(Math.random() * 100) + 1,
        price: asset.value.current / asset.ownership.totalShares,
        volume: Math.floor(Math.random() * 50000) + 1000,
        buyer: `0x${Math.random().toString(16).substr(2, 8)}...`,
        seller: `0x${Math.random().toString(16).substr(2, 8)}...`,
        location: {
          lat: asset.location.lat + (Math.random() - 0.5) * 0.1,
          lng: asset.location.lng + (Math.random() - 0.5) * 0.1
        }
      };

      this.tradingActivity.push(activity);

      // Update asset trading stats
      asset.trading.volume24h += activity.volume;
      asset.trading.trades24h += 1;
      asset.trading.lastTradePrice = activity.price;
      asset.trading.lastTradeTime = activity.timestamp;
    }

    // Keep only recent activity (last 1000 trades)
    if (this.tradingActivity.length > 1000) {
      this.tradingActivity = this.tradingActivity.slice(-1000);
    }
  }

  // Check for price alerts
  private checkPriceAlerts() {
    this.assets.forEach(asset => {
      // Price increase alert
      if (asset.value.changePercent24h > 5) {
        this.addPriceAlert({
          id: `alert-${Date.now()}-${asset.id}`,
          assetId: asset.id,
          type: 'price_increase',
          message: `${asset.name} is up ${asset.value.changePercent24h.toFixed(1)}% in 24h`,
          severity: asset.value.changePercent24h > 10 ? 'high' : 'medium',
          timestamp: new Date().toISOString(),
          data: { changePercent: asset.value.changePercent24h }
        });
      }

      // Volume spike alert
      if (asset.trading.volume24h > asset.value.current * 0.1) {
        this.addPriceAlert({
          id: `alert-${Date.now()}-vol-${asset.id}`,
          assetId: asset.id,
          type: 'volume_spike',
          message: `High trading volume detected for ${asset.name}`,
          severity: 'medium',
          timestamp: new Date().toISOString(),
          data: { volume24h: asset.trading.volume24h }
        });
      }
    });
  }

  // Add price alert
  private addPriceAlert(alert: PriceAlert) {
    this.priceAlerts.push(alert);
    if (this.priceAlerts.length > 100) {
      this.priceAlerts = this.priceAlerts.slice(-100);
    }
    this.emit('priceAlert', alert);
  }

  // Public API methods
  async getAllAssets(): Promise<GlobalAsset[]> {
    return Array.from(this.assets.values());
  }

  async getAssetById(id: string): Promise<GlobalAsset | null> {
    return this.assets.get(id) || null;
  }

  async getAssetsByRegion(country?: string, city?: string): Promise<GlobalAsset[]> {
    const assets = Array.from(this.assets.values());
    return assets.filter(asset => {
      if (country && asset.location.country !== country) return false;
      if (city && asset.location.city !== city) return false;
      return true;
    });
  }

  async getAssetsByType(type: GlobalAsset['type']): Promise<GlobalAsset[]> {
    const assets = Array.from(this.assets.values());
    return assets.filter(asset => asset.type === type);
  }

  async getMarketOverview(): Promise<MarketOverview> {
    const assets = Array.from(this.assets.values());
    const totalValue = assets.reduce((sum, asset) => sum + asset.value.current, 0);
    const totalVolume24h = assets.reduce((sum, asset) => sum + asset.trading.volume24h, 0);
    const totalTrades24h = assets.reduce((sum, asset) => sum + asset.trading.trades24h, 0);
    const averageRoi24h = assets.reduce((sum, asset) => sum + asset.performance.roi1d, 0) / assets.length;

    return {
      totalAssets: assets.length,
      totalValue,
      totalVolume24h,
      totalTrades24h,
      averageRoi24h,
      topPerformers: assets.sort((a, b) => b.performance.roi1d - a.performance.roi1d).slice(0, 5),
      mostTraded: assets.sort((a, b) => b.trading.volume24h - a.trading.volume24h).slice(0, 5),
      recentlyListed: assets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
      marketSentiment: averageRoi24h > 1 ? 'bullish' : averageRoi24h < -1 ? 'bearish' : 'neutral',
      volatilityIndex: assets.reduce((sum, asset) => sum + asset.performance.volatility, 0) / assets.length
    };
  }

  async getRegionalData(): Promise<RegionalData[]> {
    const assets = Array.from(this.assets.values());
    const regionMap = new Map<string, RegionalData>();

    assets.forEach(asset => {
      const key = asset.location.country;
      if (!regionMap.has(key)) {
        regionMap.set(key, {
          region: asset.location.country,
          country: asset.location.country,
          assetCount: 0,
          totalValue: 0,
          volume24h: 0,
          averageRoi: 0,
          topAssetTypes: [],
          marketShare: 0
        });
      }

      const region = regionMap.get(key)!;
      region.assetCount += 1;
      region.totalValue += asset.value.current;
      region.volume24h += asset.trading.volume24h;
      region.averageRoi += asset.performance.roi1d;
    });

    const totalValue = assets.reduce((sum, asset) => sum + asset.value.current, 0);
    
    return Array.from(regionMap.values()).map(region => ({
      ...region,
      averageRoi: region.averageRoi / region.assetCount,
      marketShare: (region.totalValue / totalValue) * 100
    }));
  }

  async getTradingActivity(limit = 50): Promise<TradingActivity[]> {
    return this.tradingActivity.slice(-limit);
  }

  async getPriceAlerts(limit = 20): Promise<PriceAlert[]> {
    return this.priceAlerts.slice(-limit);
  }

  // Real-time connection management
  connect(): void {
    if (!this.isConnected) {
      this.startRealTimeUpdates();
    }
  }

  disconnect(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isConnected = false;
  }

  isConnectedToRealTime(): boolean {
    return this.isConnected;
  }

  // Event subscription helpers
  onDataUpdate(callback: (data: any) => void): void {
    this.on('dataUpdate', callback);
  }

  onPriceAlert(callback: (alert: PriceAlert) => void): void {
    this.on('priceAlert', callback);
  }

  // Search and filtering
  async searchAssets(query: string): Promise<GlobalAsset[]> {
    const assets = Array.from(this.assets.values());
    const lowercaseQuery = query.toLowerCase();
    
    return assets.filter(asset => 
      asset.name.toLowerCase().includes(lowercaseQuery) ||
      asset.location.city.toLowerCase().includes(lowercaseQuery) ||
      asset.location.country.toLowerCase().includes(lowercaseQuery) ||
      asset.type.toLowerCase().includes(lowercaseQuery)
    );
  }

  async getAssetsByPriceRange(min: number, max: number): Promise<GlobalAsset[]> {
    const assets = Array.from(this.assets.values());
    return assets.filter(asset => asset.value.current >= min && asset.value.current <= max);
  }

  async getAssetsByPerformance(minRoi: number): Promise<GlobalAsset[]> {
    const assets = Array.from(this.assets.values());
    return assets.filter(asset => asset.performance.roi1d >= minRoi);
  }
}

// Export singleton instance
export const globalAnalyticsService = new GlobalAnalyticsService();
export default globalAnalyticsService;
