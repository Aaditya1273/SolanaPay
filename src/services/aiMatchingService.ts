import { EventEmitter } from 'events';

// Core Types
export interface InvestorProfile {
  id: string;
  walletAddress: string;
  name?: string;
  email?: string;
  createdAt: string;
  lastActive: string;
  preferences: InvestorPreferences;
  riskProfile: RiskProfile;
  investmentHistory: InvestmentHistory[];
  demographics: Demographics;
  behaviorMetrics: BehaviorMetrics;
  clusterGroup?: string;
  matchingScore?: number;
}

export interface InvestorPreferences {
  assetTypes: AssetType[];
  geographicPreferences: string[];
  investmentAmount: {
    min: number;
    max: number;
    preferred: number;
  };
  timeHorizon: 'short' | 'medium' | 'long';
  liquidityPreference: 'high' | 'medium' | 'low';
  sustainabilityFocus: boolean;
  technologyAdoption: 'conservative' | 'moderate' | 'aggressive';
  diversificationGoals: string[];
  excludedSectors: string[];
}

export interface RiskProfile {
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  riskScore: number; // 0-100
  volatilityTolerance: number;
  maxDrawdown: number;
  riskFactors: {
    marketRisk: number;
    creditRisk: number;
    liquidityRisk: number;
    operationalRisk: number;
    regulatoryRisk: number;
  };
}

export interface Demographics {
  age?: number;
  ageRange: string;
  location: {
    country: string;
    region: string;
    city?: string;
  };
  occupation?: string;
  incomeRange: string;
  netWorth?: string;
  investmentExperience: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface BehaviorMetrics {
  activityLevel: number;
  decisionSpeed: 'fast' | 'moderate' | 'slow';
  researchDepth: 'minimal' | 'moderate' | 'extensive';
  socialInfluence: number;
  contrarian: boolean;
  portfolioTurnover: number;
  averageHoldingPeriod: number;
}

export interface InvestmentHistory {
  assetId: string;
  assetType: AssetType;
  investmentAmount: number;
  investmentDate: string;
  currentValue?: number;
  roi?: number;
  satisfaction?: number;
}

export type AssetType = 
  | 'real_estate'
  | 'carbon_credits'
  | 'precious_metals'
  | 'commodities'
  | 'renewable_energy'
  | 'infrastructure'
  | 'art_collectibles'
  | 'bonds';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  description: string;
  location: {
    country: string;
    region: string;
    city?: string;
  };
  financialMetrics: {
    currentValue: number;
    minimumInvestment: number;
    expectedReturn: number;
    volatility: number;
    liquidityScore: number;
    riskScore: number;
  };
  characteristics: {
    sector: string;
    sustainability: {
      esgScore: number;
      carbonFootprint?: number;
      socialImpact?: number;
    };
  };
  performance: {
    historicalReturns: number[];
    sharpeRatio: number;
    maxDrawdown: number;
  };
  metadata: {
    createdAt: string;
    popularity: number;
    investorCount: number;
    totalInvested: number;
  };
}

export interface MatchingRecommendation {
  assetId: string;
  asset: Asset;
  matchScore: number;
  confidence: number;
  reasoning: string[];
  riskAlignment: number;
  preferenceAlignment: number;
  financialFit: number;
  geographicFit: number;
  warnings?: string[];
  opportunities?: string[];
}

export interface ClusterAnalysis {
  clusterId: string;
  clusterName: string;
  description: string;
  memberCount: number;
  characteristics: {
    avgRiskScore: number;
    commonAssetTypes: AssetType[];
    avgInvestmentAmount: number;
    commonLocations: string[];
    avgAge: number;
  };
}

// Mock data constants
const MOCK_ASSET_TYPES: AssetType[] = [
  'real_estate', 'carbon_credits', 'precious_metals', 'commodities',
  'renewable_energy', 'infrastructure', 'art_collectibles', 'bonds'
];

const MOCK_LOCATIONS = [
  { country: 'United States', region: 'North America', city: 'New York' },
  { country: 'United Kingdom', region: 'Europe', city: 'London' },
  { country: 'Germany', region: 'Europe', city: 'Berlin' },
  { country: 'Singapore', region: 'Asia Pacific', city: 'Singapore' },
  { country: 'Australia', region: 'Asia Pacific', city: 'Sydney' },
  { country: 'Canada', region: 'North America', city: 'Toronto' },
];

const SECTORS = ['Technology', 'Healthcare', 'Finance', 'Energy', 'Real Estate', 'Consumer Goods'];

class AIMatchingService extends EventEmitter {
  private investorProfiles: Map<string, InvestorProfile> = new Map();
  private assets: Map<string, Asset> = new Map();
  private clusterAnalysis: ClusterAnalysis[] = [];

  constructor() {
    super();
    this.initializeMockData();
  }

  private initializeMockData() {
    this.generateMockInvestorProfiles();
    this.generateMockAssets();
    this.performClustering();
  }

  private generateMockInvestorProfiles() {
    for (let i = 0; i < 50; i++) {
      const profile = this.createMockInvestorProfile(i);
      this.investorProfiles.set(profile.id, profile);
    }
  }

  private createMockInvestorProfile(index: number): InvestorProfile {
    const location = MOCK_LOCATIONS[Math.floor(Math.random() * MOCK_LOCATIONS.length)];
    const riskTolerance = ['conservative', 'moderate', 'aggressive'][Math.floor(Math.random() * 3)] as 'conservative' | 'moderate' | 'aggressive';
    const riskScore = riskTolerance === 'conservative' ? 20 + Math.random() * 30 : 
                     riskTolerance === 'moderate' ? 40 + Math.random() * 30 : 
                     70 + Math.random() * 30;

    return {
      id: `investor_${index + 1}`,
      walletAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
      name: `Investor ${index + 1}`,
      email: `investor${index + 1}@example.com`,
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      lastActive: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      preferences: {
        assetTypes: this.getRandomAssetTypes(),
        geographicPreferences: [location.region, location.country],
        investmentAmount: {
          min: Math.floor(Math.random() * 50000) + 10000,
          max: Math.floor(Math.random() * 500000) + 100000,
          preferred: Math.floor(Math.random() * 200000) + 50000,
        },
        timeHorizon: ['short', 'medium', 'long'][Math.floor(Math.random() * 3)] as 'short' | 'medium' | 'long',
        liquidityPreference: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)] as 'high' | 'medium' | 'low',
        sustainabilityFocus: Math.random() > 0.5,
        technologyAdoption: ['conservative', 'moderate', 'aggressive'][Math.floor(Math.random() * 3)] as 'conservative' | 'moderate' | 'aggressive',
        diversificationGoals: ['Geographic', 'Sector', 'Asset Class'].slice(0, Math.floor(Math.random() * 3) + 1),
        excludedSectors: Math.random() > 0.7 ? [SECTORS[Math.floor(Math.random() * SECTORS.length)]] : [],
      },
      riskProfile: {
        riskTolerance,
        riskScore,
        volatilityTolerance: Math.floor(Math.random() * 100),
        maxDrawdown: Math.floor(Math.random() * 30) + 5,
        riskFactors: {
          marketRisk: Math.floor(Math.random() * 100),
          creditRisk: Math.floor(Math.random() * 100),
          liquidityRisk: Math.floor(Math.random() * 100),
          operationalRisk: Math.floor(Math.random() * 100),
          regulatoryRisk: Math.floor(Math.random() * 100),
        },
      },
      investmentHistory: this.generateInvestmentHistory(),
      demographics: {
        age: Math.floor(Math.random() * 50) + 25,
        ageRange: this.getAgeRange(Math.floor(Math.random() * 50) + 25),
        location,
        occupation: ['Engineer', 'Doctor', 'Lawyer', 'Executive', 'Entrepreneur'][Math.floor(Math.random() * 5)],
        incomeRange: ['$50k-$100k', '$100k-$250k', '$250k-$500k', '$500k+'][Math.floor(Math.random() * 4)],
        netWorth: ['$100k-$500k', '$500k-$1M', '$1M-$5M', '$5M+'][Math.floor(Math.random() * 4)],
        investmentExperience: ['beginner', 'intermediate', 'advanced', 'expert'][Math.floor(Math.random() * 4)] as 'beginner' | 'intermediate' | 'advanced' | 'expert',
      },
      behaviorMetrics: {
        activityLevel: Math.floor(Math.random() * 100),
        decisionSpeed: ['fast', 'moderate', 'slow'][Math.floor(Math.random() * 3)] as 'fast' | 'moderate' | 'slow',
        researchDepth: ['minimal', 'moderate', 'extensive'][Math.floor(Math.random() * 3)] as 'minimal' | 'moderate' | 'extensive',
        socialInfluence: Math.floor(Math.random() * 100),
        contrarian: Math.random() > 0.7,
        portfolioTurnover: Math.random() * 5,
        averageHoldingPeriod: Math.floor(Math.random() * 1000) + 30,
      },
    };
  }

  private generateMockAssets() {
    for (let i = 0; i < 100; i++) {
      const asset = this.createMockAsset(i);
      this.assets.set(asset.id, asset);
    }
  }

  private createMockAsset(index: number): Asset {
    const assetType = MOCK_ASSET_TYPES[Math.floor(Math.random() * MOCK_ASSET_TYPES.length)];
    const location = MOCK_LOCATIONS[Math.floor(Math.random() * MOCK_LOCATIONS.length)];
    const sector = SECTORS[Math.floor(Math.random() * SECTORS.length)];
    
    return {
      id: `asset_${index + 1}`,
      name: `${assetType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Asset ${index + 1}`,
      type: assetType,
      description: `Premium ${assetType.replace('_', ' ')} investment opportunity in ${location.city}, ${location.country}`,
      location,
      financialMetrics: {
        currentValue: Math.floor(Math.random() * 10000000) + 1000000,
        minimumInvestment: Math.floor(Math.random() * 100000) + 10000,
        expectedReturn: Math.random() * 15 + 3,
        volatility: Math.random() * 30 + 5,
        liquidityScore: Math.floor(Math.random() * 100),
        riskScore: Math.floor(Math.random() * 100),
      },
      characteristics: {
        sector,
        sustainability: {
          esgScore: Math.floor(Math.random() * 100),
          carbonFootprint: Math.random() * 1000,
          socialImpact: Math.floor(Math.random() * 100),
        },
      },
      performance: {
        historicalReturns: Array.from({ length: 12 }, () => (Math.random() - 0.5) * 20),
        sharpeRatio: Math.random() * 2,
        maxDrawdown: Math.random() * 30,
      },
      metadata: {
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        popularity: Math.floor(Math.random() * 100),
        investorCount: Math.floor(Math.random() * 1000),
        totalInvested: Math.floor(Math.random() * 50000000),
      },
    };
  }

  // Helper methods
  private getRandomAssetTypes(): AssetType[] {
    const count = Math.floor(Math.random() * 4) + 1;
    const shuffled = [...MOCK_ASSET_TYPES].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  private getAgeRange(age: number): string {
    if (age < 30) return '18-29';
    if (age < 40) return '30-39';
    if (age < 50) return '40-49';
    if (age < 60) return '50-59';
    return '60+';
  }

  private generateInvestmentHistory(): InvestmentHistory[] {
    const count = Math.floor(Math.random() * 10) + 1;
    return Array.from({ length: count }, () => {
      const assetType = MOCK_ASSET_TYPES[Math.floor(Math.random() * MOCK_ASSET_TYPES.length)];
      const investmentAmount = Math.floor(Math.random() * 500000) + 10000;
      const roi = (Math.random() - 0.3) * 50;
      
      return {
        assetId: `asset_${Math.floor(Math.random() * 100) + 1}`,
        assetType,
        investmentAmount,
        investmentDate: new Date(Date.now() - Math.random() * 2 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        currentValue: investmentAmount * (1 + roi / 100),
        roi,
        satisfaction: Math.floor(Math.random() * 5) + 1,
      };
    });
  }

  // Core AI Methods
  async getInvestorProfile(investorId: string): Promise<InvestorProfile | null> {
    return this.investorProfiles.get(investorId) || null;
  }

  async getRecommendations(investorId: string, limit: number = 10): Promise<MatchingRecommendation[]> {
    const profile = this.investorProfiles.get(investorId);
    if (!profile) throw new Error('Investor profile not found');

    const assets = Array.from(this.assets.values());
    const recommendations: MatchingRecommendation[] = [];

    for (const asset of assets) {
      const matchScore = this.calculateMatchScore(profile, asset);
      if (matchScore.matchScore > 30) {
        recommendations.push(matchScore);
      }
    }

    return recommendations
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  }

  private calculateMatchScore(profile: InvestorProfile, asset: Asset): MatchingRecommendation {
    const riskAlignment = this.calculateRiskAlignment(profile.riskProfile, asset);
    const preferenceAlignment = this.calculatePreferenceAlignment(profile.preferences, asset);
    const financialFit = this.calculateFinancialFit(profile.preferences.investmentAmount, asset);
    const geographicFit = this.calculateGeographicFit(profile.preferences.geographicPreferences, asset);

    const matchScore = Math.round(
      riskAlignment * 0.3 +
      preferenceAlignment * 0.25 +
      financialFit * 0.25 +
      geographicFit * 0.2
    );

    return {
      assetId: asset.id,
      asset,
      matchScore,
      confidence: Math.min(matchScore / 100, 0.95),
      reasoning: this.generateReasoning(profile, asset, { riskAlignment, preferenceAlignment, financialFit, geographicFit }),
      riskAlignment,
      preferenceAlignment,
      financialFit,
      geographicFit,
      warnings: this.generateWarnings(profile, asset),
      opportunities: this.generateOpportunities(profile, asset),
    };
  }

  private calculateRiskAlignment(riskProfile: RiskProfile, asset: Asset): number {
    const riskDiff = Math.abs(riskProfile.riskScore - asset.financialMetrics.riskScore);
    return Math.max(0, 100 - riskDiff);
  }

  private calculatePreferenceAlignment(preferences: InvestorPreferences, asset: Asset): number {
    let score = 0;
    
    if (preferences.assetTypes.includes(asset.type)) {
      score += 80;
    } else {
      score += 20;
    }

    if (preferences.sustainabilityFocus && asset.characteristics.sustainability.esgScore > 70) {
      score += 20;
    }

    if (preferences.excludedSectors.includes(asset.characteristics.sector)) {
      return 0;
    }

    return Math.min(100, score);
  }

  private calculateFinancialFit(investmentAmount: InvestorPreferences['investmentAmount'], asset: Asset): number {
    const minInvestment = asset.financialMetrics.minimumInvestment;
    
    if (minInvestment > investmentAmount.max) return 0;
    if (minInvestment <= investmentAmount.min) return 100;
    
    const fitRatio = investmentAmount.preferred / minInvestment;
    return Math.min(100, fitRatio * 80);
  }

  private calculateGeographicFit(preferences: string[], asset: Asset): number {
    const assetLocation = [asset.location.country, asset.location.region];
    const matches = preferences.filter(pref => assetLocation.includes(pref));
    return (matches.length / Math.max(preferences.length, 1)) * 100;
  }

  private generateReasoning(profile: InvestorProfile, asset: Asset, scores: any): string[] {
    const reasoning = [];

    if (scores.riskAlignment > 80) {
      reasoning.push(`Excellent risk alignment with your ${profile.riskProfile.riskTolerance} risk profile`);
    }

    if (scores.preferenceAlignment > 80) {
      reasoning.push(`Matches your preferred asset types and investment criteria`);
    }

    if (scores.financialFit > 80) {
      reasoning.push(`Fits well within your investment budget range`);
    }

    if (asset.characteristics.sustainability.esgScore > 70 && profile.preferences.sustainabilityFocus) {
      reasoning.push(`High ESG score aligns with your sustainability focus`);
    }

    return reasoning;
  }

  private generateWarnings(profile: InvestorProfile, asset: Asset): string[] {
    const warnings = [];

    if (asset.financialMetrics.riskScore > profile.riskProfile.riskScore + 20) {
      warnings.push('Asset risk level may be higher than your comfort zone');
    }

    if (asset.financialMetrics.liquidityScore < 30 && profile.preferences.liquidityPreference === 'high') {
      warnings.push('Low liquidity may not meet your liquidity requirements');
    }

    return warnings;
  }

  private generateOpportunities(profile: InvestorProfile, asset: Asset): string[] {
    const opportunities = [];

    if (asset.financialMetrics.expectedReturn > 12) {
      opportunities.push('High expected returns with strong growth potential');
    }

    if (asset.metadata.popularity < 30) {
      opportunities.push('Undervalued opportunity with low competition');
    }

    if (asset.characteristics.sustainability.esgScore > 80) {
      opportunities.push('Excellent ESG credentials for sustainable investing');
    }

    return opportunities;
  }

  private performClustering(): ClusterAnalysis[] {
    // Simple clustering simulation
    const profiles = Array.from(this.investorProfiles.values());
    
    this.clusterAnalysis = [
      {
        clusterId: 'conservative_investors',
        clusterName: 'Conservative Investors',
        description: 'Risk-averse investors focused on capital preservation',
        memberCount: profiles.filter(p => p.riskProfile.riskTolerance === 'conservative').length,
        characteristics: {
          avgRiskScore: 35,
          commonAssetTypes: ['bonds', 'real_estate'],
          avgInvestmentAmount: 75000,
          commonLocations: ['North America', 'Europe'],
          avgAge: 55,
        },
      },
      {
        clusterId: 'growth_seekers',
        clusterName: 'Growth Seekers',
        description: 'Moderate risk investors seeking growth opportunities',
        memberCount: profiles.filter(p => p.riskProfile.riskTolerance === 'moderate').length,
        characteristics: {
          avgRiskScore: 65,
          commonAssetTypes: ['real_estate', 'renewable_energy', 'infrastructure'],
          avgInvestmentAmount: 150000,
          commonLocations: ['North America', 'Asia Pacific'],
          avgAge: 42,
        },
      },
      {
        clusterId: 'aggressive_traders',
        clusterName: 'Aggressive Traders',
        description: 'High-risk investors pursuing maximum returns',
        memberCount: profiles.filter(p => p.riskProfile.riskTolerance === 'aggressive').length,
        characteristics: {
          avgRiskScore: 85,
          commonAssetTypes: ['carbon_credits', 'precious_metals', 'art_collectibles'],
          avgInvestmentAmount: 250000,
          commonLocations: ['Asia Pacific', 'Europe'],
          avgAge: 38,
        },
      },
    ];

    return this.clusterAnalysis;
  }

  async getAllProfiles(): Promise<InvestorProfile[]> {
    return Array.from(this.investorProfiles.values());
  }

  async getAllAssets(): Promise<Asset[]> {
    return Array.from(this.assets.values());
  }

  async getClusterAnalysis(): Promise<ClusterAnalysis[]> {
    return this.clusterAnalysis;
  }

  async getMatchingMetrics() {
    const profiles = Array.from(this.investorProfiles.values());
    const assets = Array.from(this.assets.values());

    return {
      totalProfiles: profiles.length,
      totalAssets: assets.length,
      matchingAccuracy: 0.87,
      avgMatchScore: 72,
      clusterCount: this.clusterAnalysis.length,
      recommendationClickRate: 0.34,
      investmentConversionRate: 0.12,
      userSatisfactionScore: 4.2,
    };
  }
}

export const aiMatchingService = new AIMatchingService();
export default aiMatchingService;
