import { ethers } from 'ethers';

// ESG Score Categories
export interface ESGScore {
  overall: number; // 0-100
  environmental: number; // 0-100
  social: number; // 0-100
  governance: number; // 0-100
  lastUpdated: string;
  certifications: string[];
  impactMetrics: ImpactMetrics;
}

export interface ImpactMetrics {
  carbonFootprint: number; // kg CO2 equivalent
  energyEfficiency: number; // kWh per unit
  waterUsage: number; // liters per unit
  wasteReduction: number; // percentage
  jobsCreated: number;
  communityBenefit: number; // 0-100 score
  localEconomicImpact: number; // USD value
  socialPrograms: number; // count of programs
}

export interface ESGCertification {
  id: string;
  name: string;
  issuer: string;
  validUntil: string;
  score: number;
  category: 'environmental' | 'social' | 'governance';
  verified: boolean;
}

export interface AssetESGProfile {
  assetId: string;
  assetType: string;
  esgScore: ESGScore;
  certifications: ESGCertification[];
  impactReports: ImpactReport[];
  sustainabilityGoals: SustainabilityGoal[];
  complianceStatus: ComplianceStatus;
}

export interface ImpactReport {
  id: string;
  title: string;
  period: string;
  metrics: ImpactMetrics;
  narrative: string;
  verifiedBy: string;
  publishedDate: string;
}

export interface SustainabilityGoal {
  id: string;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: string;
  category: 'environmental' | 'social' | 'governance';
  progress: number; // 0-100
}

export interface ComplianceStatus {
  regulations: string[];
  lastAudit: string;
  nextAudit: string;
  status: 'compliant' | 'pending' | 'non-compliant';
  issues: string[];
}

export interface ESGFilter {
  minOverallScore?: number;
  minEnvironmentalScore?: number;
  minSocialScore?: number;
  minGovernanceScore?: number;
  certifications?: string[];
  assetTypes?: string[];
  impactCategories?: string[];
  sustainabilityGoals?: boolean;
}

class ESGService {
  private apiKey: string = process.env.NEXT_PUBLIC_ESG_API_KEY || '';
  private baseUrl: string = 'https://api.esg-data.com/v1';

  // ESG Scoring Algorithms
  calculateEnvironmentalScore(metrics: ImpactMetrics, assetType: string): number {
    let score = 50; // Base score

    // Carbon footprint impact (30% weight)
    const carbonScore = this.getCarbonScore(metrics.carbonFootprint, assetType);
    score += (carbonScore - 50) * 0.3;

    // Energy efficiency (25% weight)
    const energyScore = this.getEnergyScore(metrics.energyEfficiency, assetType);
    score += (energyScore - 50) * 0.25;

    // Water usage efficiency (20% weight)
    const waterScore = this.getWaterScore(metrics.waterUsage, assetType);
    score += (waterScore - 50) * 0.2;

    // Waste reduction (25% weight)
    const wasteScore = Math.min(100, metrics.wasteReduction * 2);
    score += (wasteScore - 50) * 0.25;

    return Math.max(0, Math.min(100, score));
  }

  calculateSocialScore(metrics: ImpactMetrics, assetType: string): number {
    let score = 50; // Base score

    // Jobs created (30% weight)
    const jobsScore = this.getJobsScore(metrics.jobsCreated, assetType);
    score += (jobsScore - 50) * 0.3;

    // Community benefit (35% weight)
    score += (metrics.communityBenefit - 50) * 0.35;

    // Local economic impact (20% weight)
    const economicScore = this.getEconomicImpactScore(metrics.localEconomicImpact, assetType);
    score += (economicScore - 50) * 0.2;

    // Social programs (15% weight)
    const programsScore = Math.min(100, metrics.socialPrograms * 10);
    score += (programsScore - 50) * 0.15;

    return Math.max(0, Math.min(100, score));
  }

  calculateGovernanceScore(certifications: ESGCertification[], complianceStatus: ComplianceStatus): number {
    let score = 50; // Base score

    // Compliance status (40% weight)
    const complianceScore = complianceStatus.status === 'compliant' ? 90 : 
                           complianceStatus.status === 'pending' ? 60 : 30;
    score += (complianceScore - 50) * 0.4;

    // Certifications (35% weight)
    const certScore = this.getCertificationScore(certifications);
    score += (certScore - 50) * 0.35;

    // Audit frequency (25% weight)
    const auditScore = this.getAuditScore(complianceStatus.lastAudit, complianceStatus.nextAudit);
    score += (auditScore - 50) * 0.25;

    return Math.max(0, Math.min(100, score));
  }

  calculateOverallESGScore(environmental: number, social: number, governance: number): number {
    // Weighted average: E(40%), S(35%), G(25%)
    return (environmental * 0.4) + (social * 0.35) + (governance * 0.25);
  }

  // Helper scoring methods
  private getCarbonScore(carbonFootprint: number, assetType: string): number {
    const benchmarks: { [key: string]: number } = {
      'real-estate': 50, // kg CO2 per sqm per year
      'renewable-energy': 10,
      'carbon-credits': 0,
      'transportation': 100,
      'agriculture': 30,
      'manufacturing': 80
    };

    const benchmark = benchmarks[assetType] || 50;
    const ratio = carbonFootprint / benchmark;
    
    if (ratio <= 0.5) return 100;
    if (ratio <= 0.75) return 80;
    if (ratio <= 1.0) return 60;
    if (ratio <= 1.5) return 40;
    return 20;
  }

  private getEnergyScore(energyEfficiency: number, assetType: string): number {
    const benchmarks: { [key: string]: number } = {
      'real-estate': 100, // kWh per sqm per year
      'renewable-energy': 0,
      'manufacturing': 200,
      'data-center': 300
    };

    const benchmark = benchmarks[assetType] || 100;
    const ratio = energyEfficiency / benchmark;
    
    if (ratio <= 0.5) return 100;
    if (ratio <= 0.75) return 80;
    if (ratio <= 1.0) return 60;
    if (ratio <= 1.5) return 40;
    return 20;
  }

  private getWaterScore(waterUsage: number, assetType: string): number {
    const benchmarks: { [key: string]: number } = {
      'real-estate': 1000, // liters per sqm per year
      'agriculture': 5000,
      'manufacturing': 2000
    };

    const benchmark = benchmarks[assetType] || 1000;
    const ratio = waterUsage / benchmark;
    
    if (ratio <= 0.5) return 100;
    if (ratio <= 0.75) return 80;
    if (ratio <= 1.0) return 60;
    if (ratio <= 1.5) return 40;
    return 20;
  }

  private getJobsScore(jobsCreated: number, assetType: string): number {
    const benchmarks: { [key: string]: number } = {
      'real-estate': 10,
      'manufacturing': 50,
      'renewable-energy': 20,
      'agriculture': 30
    };

    const benchmark = benchmarks[assetType] || 20;
    const ratio = jobsCreated / benchmark;
    
    if (ratio >= 2.0) return 100;
    if (ratio >= 1.5) return 80;
    if (ratio >= 1.0) return 60;
    if (ratio >= 0.5) return 40;
    return 20;
  }

  private getEconomicImpactScore(impact: number, assetType: string): number {
    const benchmarks: { [key: string]: number } = {
      'real-estate': 100000, // USD
      'manufacturing': 500000,
      'renewable-energy': 200000
    };

    const benchmark = benchmarks[assetType] || 100000;
    const ratio = impact / benchmark;
    
    if (ratio >= 2.0) return 100;
    if (ratio >= 1.5) return 80;
    if (ratio >= 1.0) return 60;
    if (ratio >= 0.5) return 40;
    return 20;
  }

  private getCertificationScore(certifications: ESGCertification[]): number {
    if (certifications.length === 0) return 30;
    
    const weights: { [key: string]: number } = {
      'LEED': 25,
      'BREEAM': 25,
      'Energy Star': 20,
      'B Corp': 30,
      'ISO 14001': 20,
      'TCFD': 15,
      'GRI': 15,
      'SASB': 15
    };

    let totalScore = 0;
    let maxPossible = 0;

    certifications.forEach(cert => {
      const weight = weights[cert.name] || 10;
      totalScore += cert.verified ? weight : weight * 0.5;
      maxPossible += weight;
    });

    return Math.min(100, (totalScore / Math.max(maxPossible, 50)) * 100);
  }

  private getAuditScore(lastAudit: string, nextAudit: string): number {
    const lastAuditDate = new Date(lastAudit);
    const nextAuditDate = new Date(nextAudit);
    const now = new Date();

    const daysSinceLastAudit = (now.getTime() - lastAuditDate.getTime()) / (1000 * 60 * 60 * 24);
    const daysUntilNextAudit = (nextAuditDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    // Prefer recent audits and upcoming scheduled audits
    if (daysSinceLastAudit <= 90 && daysUntilNextAudit > 0) return 100;
    if (daysSinceLastAudit <= 180 && daysUntilNextAudit > 0) return 80;
    if (daysSinceLastAudit <= 365) return 60;
    return 40;
  }

  // Data fetching and management
  async getAssetESGProfile(assetId: string): Promise<AssetESGProfile> {
    try {
      // In production, this would fetch from ESG data providers
      // For now, return mock data based on asset type
      return this.generateMockESGProfile(assetId);
    } catch (error) {
      console.error('Error fetching ESG profile:', error);
      throw error;
    }
  }

  async updateESGScore(assetId: string, metrics: ImpactMetrics, assetType: string): Promise<ESGScore> {
    const environmental = this.calculateEnvironmentalScore(metrics, assetType);
    const social = this.calculateSocialScore(metrics, assetType);
    
    // Mock governance data for calculation
    const mockCertifications: ESGCertification[] = [];
    const mockCompliance: ComplianceStatus = {
      regulations: ['SEC', 'EPA'],
      lastAudit: '2024-01-15',
      nextAudit: '2025-01-15',
      status: 'compliant',
      issues: []
    };
    
    const governance = this.calculateGovernanceScore(mockCertifications, mockCompliance);
    const overall = this.calculateOverallESGScore(environmental, social, governance);

    const esgScore: ESGScore = {
      overall,
      environmental,
      social,
      governance,
      lastUpdated: new Date().toISOString(),
      certifications: [],
      impactMetrics: metrics
    };

    // In production, save to database
    return esgScore;
  }

  async searchAssetsByESG(filter: ESGFilter): Promise<AssetESGProfile[]> {
    // In production, this would query the database with ESG filters
    const mockAssets = this.generateMockAssetList();
    
    return mockAssets.filter(asset => {
      if (filter.minOverallScore && asset.esgScore.overall < filter.minOverallScore) return false;
      if (filter.minEnvironmentalScore && asset.esgScore.environmental < filter.minEnvironmentalScore) return false;
      if (filter.minSocialScore && asset.esgScore.social < filter.minSocialScore) return false;
      if (filter.minGovernanceScore && asset.esgScore.governance < filter.minGovernanceScore) return false;
      
      if (filter.certifications && filter.certifications.length > 0) {
        const assetCertNames = asset.certifications.map(c => c.name);
        if (!filter.certifications.some(cert => assetCertNames.includes(cert))) return false;
      }
      
      if (filter.assetTypes && filter.assetTypes.length > 0) {
        if (!filter.assetTypes.includes(asset.assetType)) return false;
      }
      
      return true;
    });
  }

  getESGBenchmarks(assetType: string): { [key: string]: number } {
    const benchmarks: { [key: string]: { [key: string]: number } } = {
      'real-estate': {
        carbonFootprint: 50,
        energyEfficiency: 100,
        waterUsage: 1000,
        jobsCreated: 10,
        economicImpact: 100000
      },
      'renewable-energy': {
        carbonFootprint: 10,
        energyEfficiency: 0,
        waterUsage: 100,
        jobsCreated: 20,
        economicImpact: 200000
      },
      'carbon-credits': {
        carbonFootprint: 0,
        energyEfficiency: 0,
        waterUsage: 0,
        jobsCreated: 5,
        economicImpact: 50000
      }
    };

    return benchmarks[assetType] || benchmarks['real-estate'];
  }

  // Mock data generation for development
  private generateMockESGProfile(assetId: string): AssetESGProfile {
    const assetTypes = ['real-estate', 'renewable-energy', 'carbon-credits', 'agriculture'];
    const assetType = assetTypes[Math.floor(Math.random() * assetTypes.length)];
    
    const mockMetrics: ImpactMetrics = {
      carbonFootprint: Math.random() * 100,
      energyEfficiency: Math.random() * 200,
      waterUsage: Math.random() * 2000,
      wasteReduction: Math.random() * 50,
      jobsCreated: Math.floor(Math.random() * 100),
      communityBenefit: Math.random() * 100,
      localEconomicImpact: Math.random() * 1000000,
      socialPrograms: Math.floor(Math.random() * 10)
    };

    const environmental = this.calculateEnvironmentalScore(mockMetrics, assetType);
    const social = this.calculateSocialScore(mockMetrics, assetType);
    const governance = 70 + Math.random() * 30; // Mock governance score
    const overall = this.calculateOverallESGScore(environmental, social, governance);

    return {
      assetId,
      assetType,
      esgScore: {
        overall,
        environmental,
        social,
        governance,
        lastUpdated: new Date().toISOString(),
        certifications: ['LEED Gold', 'Energy Star'],
        impactMetrics: mockMetrics
      },
      certifications: this.generateMockCertifications(),
      impactReports: [],
      sustainabilityGoals: this.generateMockGoals(),
      complianceStatus: {
        regulations: ['SEC', 'EPA'],
        lastAudit: '2024-01-15',
        nextAudit: '2025-01-15',
        status: 'compliant',
        issues: []
      }
    };
  }

  private generateMockCertifications(): ESGCertification[] {
    const certNames = ['LEED', 'BREEAM', 'Energy Star', 'B Corp', 'ISO 14001'];
    return certNames.slice(0, Math.floor(Math.random() * 3) + 1).map((name, index) => ({
      id: `cert-${index}`,
      name,
      issuer: `${name} Council`,
      validUntil: '2025-12-31',
      score: 70 + Math.random() * 30,
      category: index % 3 === 0 ? 'environmental' : index % 3 === 1 ? 'social' : 'governance',
      verified: Math.random() > 0.2
    }));
  }

  private generateMockGoals(): SustainabilityGoal[] {
    return [
      {
        id: 'goal-1',
        title: 'Carbon Neutral by 2030',
        description: 'Achieve net-zero carbon emissions',
        targetValue: 0,
        currentValue: 25,
        unit: 'kg CO2',
        deadline: '2030-12-31',
        category: 'environmental',
        progress: 75
      },
      {
        id: 'goal-2',
        title: 'Create 100 Local Jobs',
        description: 'Generate employment opportunities in local community',
        targetValue: 100,
        currentValue: 65,
        unit: 'jobs',
        deadline: '2025-12-31',
        category: 'social',
        progress: 65
      }
    ];
  }

  private generateMockAssetList(): AssetESGProfile[] {
    const assets = [];
    for (let i = 1; i <= 20; i++) {
      assets.push(this.generateMockESGProfile(`asset-${i}`));
    }
    return assets;
  }
}

export const esgService = new ESGService();
