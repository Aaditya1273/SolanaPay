import { ethers } from 'ethers';

// Portfolio Data Types
export interface PortfolioAsset {
  id: string;
  name: string;
  symbol: string;
  assetType: string;
  shares: number;
  totalShares: number;
  ownershipPercentage: number;
  purchasePrice: number;
  currentPrice: number;
  totalValue: number;
  unrealizedGainLoss: number;
  unrealizedGainLossPercentage: number;
  purchaseDate: string;
  lastUpdated: string;
  dividendYield: number;
  annualDividends: number;
  location: string;
  esgScore?: number;
}

export interface DividendPayment {
  id: string;
  assetId: string;
  assetName: string;
  amount: number;
  currency: string;
  paymentDate: string;
  exDividendDate: string;
  recordDate: string;
  paymentType: 'quarterly' | 'monthly' | 'annual' | 'special';
  status: 'pending' | 'paid' | 'processing';
  taxWithheld?: number;
}

export interface PortfolioPerformance {
  totalValue: number;
  totalInvested: number;
  totalGainLoss: number;
  totalGainLossPercentage: number;
  totalDividends: number;
  annualYield: number;
  monthlyReturn: number;
  yearToDateReturn: number;
  allTimeReturn: number;
  sharpeRatio: number;
  volatility: number;
  beta: number;
  lastUpdated: string;
}

export interface HistoricalData {
  date: string;
  portfolioValue: number;
  totalInvested: number;
  gainLoss: number;
  gainLossPercentage: number;
  dividendPayments: number;
  cumulativeDividends: number;
}

export interface AssetAllocation {
  assetType: string;
  value: number;
  percentage: number;
  count: number;
  avgYield: number;
}

export interface GeographicAllocation {
  region: string;
  country: string;
  value: number;
  percentage: number;
  count: number;
}

export interface PortfolioAnalytics {
  performance: PortfolioPerformance;
  assets: PortfolioAsset[];
  dividends: DividendPayment[];
  historicalData: HistoricalData[];
  assetAllocation: AssetAllocation[];
  geographicAllocation: GeographicAllocation[];
  topPerformers: PortfolioAsset[];
  worstPerformers: PortfolioAsset[];
  upcomingDividends: DividendPayment[];
  recentTransactions: Transaction[];
}

export interface Transaction {
  id: string;
  type: 'buy' | 'sell' | 'dividend' | 'fee';
  assetId: string;
  assetName: string;
  shares?: number;
  price?: number;
  amount: number;
  currency: string;
  date: string;
  fees: number;
  hash?: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface ExportOptions {
  format: 'csv' | 'pdf';
  dateRange: {
    start: string;
    end: string;
  };
  includeTransactions: boolean;
  includeDividends: boolean;
  includePerformance: boolean;
  includeAllocation: boolean;
}

class PortfolioService {
  private walletAddress: string = '';
  private apiKey: string = process.env.NEXT_PUBLIC_PORTFOLIO_API_KEY || '';

  setWalletAddress(address: string) {
    this.walletAddress = address;
  }

  // Portfolio Performance Calculations
  async getPortfolioAnalytics(): Promise<PortfolioAnalytics> {
    try {
      // In production, this would fetch from blockchain and APIs
      const mockData = this.generateMockPortfolioData();
      return mockData;
    } catch (error) {
      console.error('Error fetching portfolio analytics:', error);
      throw error;
    }
  }

  calculatePortfolioPerformance(assets: PortfolioAsset[], dividends: DividendPayment[]): PortfolioPerformance {
    const totalValue = assets.reduce((sum, asset) => sum + asset.totalValue, 0);
    const totalInvested = assets.reduce((sum, asset) => sum + (asset.shares * asset.purchasePrice), 0);
    const totalGainLoss = totalValue - totalInvested;
    const totalGainLossPercentage = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;
    
    const totalDividends = dividends
      .filter(d => d.status === 'paid')
      .reduce((sum, dividend) => sum + dividend.amount, 0);
    
    const annualYield = totalInvested > 0 ? (totalDividends / totalInvested) * 100 : 0;

    // Calculate time-based returns
    const { monthlyReturn, yearToDateReturn, allTimeReturn } = this.calculateTimeBasedReturns(assets, dividends);
    
    // Calculate risk metrics
    const { sharpeRatio, volatility, beta } = this.calculateRiskMetrics(assets);

    return {
      totalValue,
      totalInvested,
      totalGainLoss,
      totalGainLossPercentage,
      totalDividends,
      annualYield,
      monthlyReturn,
      yearToDateReturn,
      allTimeReturn,
      sharpeRatio,
      volatility,
      beta,
      lastUpdated: new Date().toISOString()
    };
  }

  private calculateTimeBasedReturns(assets: PortfolioAsset[], dividends: DividendPayment[]) {
    // Mock calculations - in production, use historical data
    const monthlyReturn = Math.random() * 10 - 2; // -2% to 8%
    const yearToDateReturn = Math.random() * 30 - 5; // -5% to 25%
    const allTimeReturn = Math.random() * 100 + 10; // 10% to 110%

    return { monthlyReturn, yearToDateReturn, allTimeReturn };
  }

  private calculateRiskMetrics(assets: PortfolioAsset[]) {
    // Mock risk calculations - in production, use historical price data
    const sharpeRatio = Math.random() * 2 + 0.5; // 0.5 to 2.5
    const volatility = Math.random() * 30 + 10; // 10% to 40%
    const beta = Math.random() * 1.5 + 0.5; // 0.5 to 2.0

    return { sharpeRatio, volatility, beta };
  }

  calculateAssetAllocation(assets: PortfolioAsset[]): AssetAllocation[] {
    const totalValue = assets.reduce((sum, asset) => sum + asset.totalValue, 0);
    const allocationMap = new Map<string, AssetAllocation>();

    assets.forEach(asset => {
      const existing = allocationMap.get(asset.assetType);
      if (existing) {
        existing.value += asset.totalValue;
        existing.count += 1;
        existing.avgYield = (existing.avgYield + asset.dividendYield) / 2;
      } else {
        allocationMap.set(asset.assetType, {
          assetType: asset.assetType,
          value: asset.totalValue,
          percentage: 0,
          count: 1,
          avgYield: asset.dividendYield
        });
      }
    });

    const allocations = Array.from(allocationMap.values());
    allocations.forEach(allocation => {
      allocation.percentage = totalValue > 0 ? (allocation.value / totalValue) * 100 : 0;
    });

    return allocations.sort((a, b) => b.value - a.value);
  }

  calculateGeographicAllocation(assets: PortfolioAsset[]): GeographicAllocation[] {
    const totalValue = assets.reduce((sum, asset) => sum + asset.totalValue, 0);
    const allocationMap = new Map<string, GeographicAllocation>();

    assets.forEach(asset => {
      const region = this.getRegionFromLocation(asset.location);
      const existing = allocationMap.get(region);
      if (existing) {
        existing.value += asset.totalValue;
        existing.count += 1;
      } else {
        allocationMap.set(region, {
          region,
          country: asset.location,
          value: asset.totalValue,
          percentage: 0,
          count: 1
        });
      }
    });

    const allocations = Array.from(allocationMap.values());
    allocations.forEach(allocation => {
      allocation.percentage = totalValue > 0 ? (allocation.value / totalValue) * 100 : 0;
    });

    return allocations.sort((a, b) => b.value - a.value);
  }

  private getRegionFromLocation(location: string): string {
    const regionMap: { [key: string]: string } = {
      'United States': 'North America',
      'Canada': 'North America',
      'Mexico': 'North America',
      'United Kingdom': 'Europe',
      'Germany': 'Europe',
      'France': 'Europe',
      'Spain': 'Europe',
      'Italy': 'Europe',
      'Japan': 'Asia Pacific',
      'China': 'Asia Pacific',
      'India': 'Asia Pacific',
      'Australia': 'Asia Pacific',
      'Brazil': 'Latin America',
      'Argentina': 'Latin America',
      'South Africa': 'Africa',
      'Nigeria': 'Africa'
    };
    return regionMap[location] || 'Other';
  }

  // Dividend Calculations
  calculateDividendYield(asset: PortfolioAsset, dividends: DividendPayment[]): number {
    const assetDividends = dividends.filter(d => 
      d.assetId === asset.id && 
      d.status === 'paid' &&
      new Date(d.paymentDate) >= new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    );
    
    const annualDividends = assetDividends.reduce((sum, dividend) => sum + dividend.amount, 0);
    return asset.totalValue > 0 ? (annualDividends / asset.totalValue) * 100 : 0;
  }

  getUpcomingDividends(dividends: DividendPayment[]): DividendPayment[] {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    return dividends
      .filter(d => {
        const paymentDate = new Date(d.paymentDate);
        return paymentDate >= now && paymentDate <= thirtyDaysFromNow && d.status === 'pending';
      })
      .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
  }

  // Historical Data Generation
  generateHistoricalData(startDate: string, endDate: string): HistoricalData[] {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const data: HistoricalData[] = [];
    
    let currentValue = 100000; // Starting portfolio value
    let totalInvested = 100000;
    let cumulativeDividends = 0;

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      // Simulate daily changes
      const dailyChange = (Math.random() - 0.5) * 0.02; // -1% to +1% daily
      currentValue *= (1 + dailyChange);
      
      // Simulate dividend payments (random chance)
      const dividendPayment = Math.random() < 0.02 ? Math.random() * 500 : 0; // 2% chance of dividend
      cumulativeDividends += dividendPayment;
      
      const gainLoss = currentValue - totalInvested + cumulativeDividends;
      const gainLossPercentage = totalInvested > 0 ? (gainLoss / totalInvested) * 100 : 0;

      data.push({
        date: date.toISOString().split('T')[0],
        portfolioValue: currentValue,
        totalInvested,
        gainLoss,
        gainLossPercentage,
        dividendPayments: dividendPayment,
        cumulativeDividends
      });
    }

    return data;
  }

  // Export Functions
  async exportToCSV(options: ExportOptions): Promise<string> {
    const analytics = await this.getPortfolioAnalytics();
    let csvContent = '';

    if (options.includePerformance) {
      csvContent += 'Portfolio Performance\n';
      csvContent += 'Metric,Value\n';
      csvContent += `Total Value,$${analytics.performance.totalValue.toFixed(2)}\n`;
      csvContent += `Total Invested,$${analytics.performance.totalInvested.toFixed(2)}\n`;
      csvContent += `Total Gain/Loss,$${analytics.performance.totalGainLoss.toFixed(2)}\n`;
      csvContent += `Total Gain/Loss %,${analytics.performance.totalGainLossPercentage.toFixed(2)}%\n`;
      csvContent += `Annual Yield,${analytics.performance.annualYield.toFixed(2)}%\n`;
      csvContent += '\n';
    }

    if (options.includeAllocation) {
      csvContent += 'Asset Allocation\n';
      csvContent += 'Asset Type,Value,Percentage,Count\n';
      analytics.assetAllocation.forEach(allocation => {
        csvContent += `${allocation.assetType},$${allocation.value.toFixed(2)},${allocation.percentage.toFixed(2)}%,${allocation.count}\n`;
      });
      csvContent += '\n';
    }

    csvContent += 'Portfolio Assets\n';
    csvContent += 'Name,Symbol,Type,Shares,Current Price,Total Value,Gain/Loss,Gain/Loss %,Dividend Yield\n';
    analytics.assets.forEach(asset => {
      csvContent += `${asset.name},${asset.symbol},${asset.assetType},${asset.shares},$${asset.currentPrice.toFixed(2)},$${asset.totalValue.toFixed(2)},$${asset.unrealizedGainLoss.toFixed(2)},${asset.unrealizedGainLossPercentage.toFixed(2)}%,${asset.dividendYield.toFixed(2)}%\n`;
    });

    if (options.includeDividends) {
      csvContent += '\nDividend Payments\n';
      csvContent += 'Asset,Amount,Payment Date,Type,Status\n';
      analytics.dividends.forEach(dividend => {
        csvContent += `${dividend.assetName},$${dividend.amount.toFixed(2)},${dividend.paymentDate},${dividend.paymentType},${dividend.status}\n`;
      });
    }

    if (options.includeTransactions) {
      csvContent += '\nTransactions\n';
      csvContent += 'Type,Asset,Shares,Price,Amount,Date,Status\n';
      analytics.recentTransactions.forEach(transaction => {
        csvContent += `${transaction.type},${transaction.assetName},${transaction.shares || ''},$${transaction.price?.toFixed(2) || ''},$${transaction.amount.toFixed(2)},${transaction.date},${transaction.status}\n`;
      });
    }

    return csvContent;
  }

  async exportToPDF(options: ExportOptions): Promise<Blob> {
    // In a real implementation, you would use a PDF library like jsPDF
    // For now, return a mock PDF blob
    const csvContent = await this.exportToCSV(options);
    const blob = new Blob([csvContent], { type: 'application/pdf' });
    return blob;
  }

  // Mock Data Generation
  private generateMockPortfolioData(): PortfolioAnalytics {
    const assets = this.generateMockAssets();
    const dividends = this.generateMockDividends(assets);
    const performance = this.calculatePortfolioPerformance(assets, dividends);
    const assetAllocation = this.calculateAssetAllocation(assets);
    const geographicAllocation = this.calculateGeographicAllocation(assets);
    const historicalData = this.generateHistoricalData('2023-01-01', new Date().toISOString().split('T')[0]);
    
    const topPerformers = [...assets]
      .sort((a, b) => b.unrealizedGainLossPercentage - a.unrealizedGainLossPercentage)
      .slice(0, 5);
    
    const worstPerformers = [...assets]
      .sort((a, b) => a.unrealizedGainLossPercentage - b.unrealizedGainLossPercentage)
      .slice(0, 5);
    
    const upcomingDividends = this.getUpcomingDividends(dividends);
    const recentTransactions = this.generateMockTransactions();

    return {
      performance,
      assets,
      dividends,
      historicalData,
      assetAllocation,
      geographicAllocation,
      topPerformers,
      worstPerformers,
      upcomingDividends,
      recentTransactions
    };
  }

  private generateMockAssets(): PortfolioAsset[] {
    const assetTypes = ['Real Estate', 'Renewable Energy', 'Carbon Credits', 'Agriculture', 'Infrastructure'];
    const locations = ['United States', 'United Kingdom', 'Germany', 'Japan', 'Australia', 'Canada'];
    
    return Array.from({ length: 12 }, (_, index) => {
      const assetType = assetTypes[index % assetTypes.length];
      const purchasePrice = 50 + Math.random() * 200;
      const currentPrice = purchasePrice * (0.8 + Math.random() * 0.6); // -20% to +40%
      const shares = Math.floor(Math.random() * 1000) + 100;
      const totalShares = shares * (5 + Math.random() * 15); // 5x to 20x dilution
      
      return {
        id: `asset-${index + 1}`,
        name: `${assetType} Asset ${index + 1}`,
        symbol: `RWA${index + 1}`,
        assetType,
        shares,
        totalShares,
        ownershipPercentage: (shares / totalShares) * 100,
        purchasePrice,
        currentPrice,
        totalValue: shares * currentPrice,
        unrealizedGainLoss: shares * (currentPrice - purchasePrice),
        unrealizedGainLossPercentage: ((currentPrice - purchasePrice) / purchasePrice) * 100,
        purchaseDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        lastUpdated: new Date().toISOString(),
        dividendYield: Math.random() * 8 + 2, // 2% to 10%
        annualDividends: shares * currentPrice * (Math.random() * 0.08 + 0.02),
        location: locations[index % locations.length],
        esgScore: Math.random() * 40 + 60 // 60-100 ESG score
      };
    });
  }

  private generateMockDividends(assets: PortfolioAsset[]): DividendPayment[] {
    const dividends: DividendPayment[] = [];
    
    assets.forEach(asset => {
      // Generate 4 quarterly dividends for the past year
      for (let quarter = 0; quarter < 4; quarter++) {
        const paymentDate = new Date();
        paymentDate.setMonth(paymentDate.getMonth() - (quarter * 3));
        
        dividends.push({
          id: `div-${asset.id}-${quarter}`,
          assetId: asset.id,
          assetName: asset.name,
          amount: (asset.annualDividends / 4) * (0.9 + Math.random() * 0.2), // ±10% variation
          currency: 'USD',
          paymentDate: paymentDate.toISOString(),
          exDividendDate: new Date(paymentDate.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          recordDate: new Date(paymentDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          paymentType: 'quarterly',
          status: quarter < 3 ? 'paid' : 'pending',
          taxWithheld: Math.random() * 50
        });
      }
      
      // Generate upcoming dividend
      const upcomingDate = new Date();
      upcomingDate.setMonth(upcomingDate.getMonth() + 1);
      
      dividends.push({
        id: `div-${asset.id}-upcoming`,
        assetId: asset.id,
        assetName: asset.name,
        amount: asset.annualDividends / 4,
        currency: 'USD',
        paymentDate: upcomingDate.toISOString(),
        exDividendDate: new Date(upcomingDate.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        recordDate: new Date(upcomingDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        paymentType: 'quarterly',
        status: 'pending'
      });
    });
    
    return dividends;
  }

  private generateMockTransactions(): Transaction[] {
    const transactions: Transaction[] = [];
    const types: ('buy' | 'sell' | 'dividend' | 'fee')[] = ['buy', 'sell', 'dividend', 'fee'];
    
    for (let i = 0; i < 20; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const date = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000);
      
      transactions.push({
        id: `tx-${i}`,
        type,
        assetId: `asset-${Math.floor(Math.random() * 12) + 1}`,
        assetName: `Asset ${Math.floor(Math.random() * 12) + 1}`,
        shares: type === 'buy' || type === 'sell' ? Math.floor(Math.random() * 100) + 10 : undefined,
        price: type === 'buy' || type === 'sell' ? Math.random() * 200 + 50 : undefined,
        amount: Math.random() * 10000 + 1000,
        currency: 'USD',
        date: date.toISOString(),
        fees: Math.random() * 50,
        hash: `0x${Math.random().toString(16).substr(2, 64)}`,
        status: Math.random() > 0.1 ? 'completed' : 'pending'
      });
    }
    
    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
}

export const portfolioService = new PortfolioService();
