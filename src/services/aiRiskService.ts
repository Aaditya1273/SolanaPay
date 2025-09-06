import { ethers } from 'ethers';

export interface TransactionAnalysis {
  address: string;
  transactionCount: number;
  totalVolume: string;
  averageGasPrice: string;
  uniqueContracts: number;
  timeSpan: number;
  patterns: string[];
}

export interface RiskMetrics {
  velocityScore: number;
  diversificationScore: number;
  behaviorScore: number;
  complianceScore: number;
  liquidityScore: number;
}

export interface AIRiskAnalysis {
  riskScore: number;
  riskLevel: 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH' | 'BLACKLISTED';
  confidence: number;
  factors: string[];
  recommendations: string[];
  lastAnalyzed: Date;
}

export class AIRiskService {
  private provider: ethers.Provider;
  private riskEngineAddress: string;
  
  constructor(provider: ethers.Provider, riskEngineAddress: string) {
    this.provider = provider;
    this.riskEngineAddress = riskEngineAddress;
  }

  /**
   * Analyze wallet transaction history for risk patterns
   */
  async analyzeWalletTransactions(address: string, blockRange: number = 10000): Promise<TransactionAnalysis> {
    try {
      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - blockRange);
      
      // Get transaction history
      const transactions = await this.getTransactionHistory(address, fromBlock, currentBlock);
      
      // Analyze patterns
      const analysis = this.analyzeTransactionPatterns(transactions);
      
      return {
        address,
        transactionCount: transactions.length,
        totalVolume: this.calculateTotalVolume(transactions),
        averageGasPrice: this.calculateAverageGasPrice(transactions),
        uniqueContracts: this.countUniqueContracts(transactions),
        timeSpan: this.calculateTimeSpan(transactions),
        patterns: analysis.patterns,
      };
    } catch (error) {
      console.error('Error analyzing wallet transactions:', error);
      throw error;
    }
  }

  /**
   * Calculate comprehensive risk metrics
   */
  async calculateRiskMetrics(address: string): Promise<RiskMetrics> {
    const analysis = await this.analyzeWalletTransactions(address);
    
    return {
      velocityScore: this.calculateVelocityScore(analysis),
      diversificationScore: this.calculateDiversificationScore(analysis),
      behaviorScore: this.calculateBehaviorScore(analysis),
      complianceScore: await this.calculateComplianceScore(address),
      liquidityScore: await this.calculateLiquidityScore(address),
    };
  }

  /**
   * Generate AI-powered risk assessment
   */
  async generateRiskAssessment(address: string): Promise<AIRiskAnalysis> {
    const metrics = await this.calculateRiskMetrics(address);
    const transactionAnalysis = await this.analyzeWalletTransactions(address);
    
    // AI scoring algorithm
    const riskScore = this.calculateCompositeRiskScore(metrics, transactionAnalysis);
    const riskLevel = this.determineRiskLevel(riskScore);
    const confidence = this.calculateConfidence(metrics, transactionAnalysis);
    
    // Generate risk factors and recommendations
    const factors = this.identifyRiskFactors(metrics, transactionAnalysis);
    const recommendations = this.generateRecommendations(riskLevel, factors);
    
    return {
      riskScore,
      riskLevel,
      confidence,
      factors,
      recommendations,
      lastAnalyzed: new Date(),
    };
  }

  /**
   * Detect fraud patterns using ML-inspired heuristics
   */
  detectFraudPatterns(transactions: any[]): string[] {
    const patterns: string[] = [];
    
    // Rapid transaction pattern
    if (this.detectRapidTransactions(transactions)) {
      patterns.push('rapid_transactions');
    }
    
    // Wash trading pattern
    if (this.detectWashTrading(transactions)) {
      patterns.push('wash_trading');
    }
    
    // Circular transaction pattern
    if (this.detectCircularTransactions(transactions)) {
      patterns.push('circular_transactions');
    }
    
    // Sybil attack pattern
    if (this.detectSybilPattern(transactions)) {
      patterns.push('sybil_attack');
    }
    
    // Front-running pattern
    if (this.detectFrontRunning(transactions)) {
      patterns.push('front_running');
    }
    
    // Sandwich attack pattern
    if (this.detectSandwichAttack(transactions)) {
      patterns.push('sandwich_attack');
    }
    
    return patterns;
  }

  /**
   * Analyze asset-specific risks
   */
  async analyzeAssetRisk(tokenContract: string, tokenId: string): Promise<AIRiskAnalysis> {
    try {
      // Get asset metadata and transaction history
      const assetData = await this.getAssetData(tokenContract, tokenId);
      const ownershipHistory = await this.getOwnershipHistory(tokenContract, tokenId);
      
      // Calculate asset-specific metrics
      const liquidityScore = await this.calculateAssetLiquidity(tokenContract, tokenId);
      const ownershipScore = this.calculateOwnershipScore(ownershipHistory);
      const complianceScore = await this.calculateAssetCompliance(tokenContract, tokenId);
      
      // Generate risk assessment
      const riskScore = this.calculateAssetRiskScore({
        liquidityScore,
        ownershipScore,
        complianceScore,
        transactionCount: ownershipHistory.length,
      });
      
      const riskLevel = this.determineRiskLevel(riskScore);
      const factors = this.identifyAssetRiskFactors({
        liquidityScore,
        ownershipScore,
        complianceScore,
      });
      
      return {
        riskScore,
        riskLevel,
        confidence: 0.85, // Asset analysis typically has high confidence
        factors,
        recommendations: this.generateAssetRecommendations(riskLevel, factors),
        lastAnalyzed: new Date(),
      };
    } catch (error) {
      console.error('Error analyzing asset risk:', error);
      throw error;
    }
  }

  // Private helper methods
  private async getTransactionHistory(address: string, fromBlock: number, toBlock: number): Promise<any[]> {
    // Mock implementation - in production, use proper indexing service
    return [
      {
        hash: '0x123...',
        from: address,
        to: '0x456...',
        value: ethers.parseEther('1.0'),
        gasPrice: ethers.parseUnits('20', 'gwei'),
        timestamp: Date.now() - 3600000,
        blockNumber: toBlock - 100,
      },
      // More transactions...
    ];
  }

  private analyzeTransactionPatterns(transactions: any[]): { patterns: string[] } {
    const patterns = this.detectFraudPatterns(transactions);
    return { patterns };
  }

  private calculateTotalVolume(transactions: any[]): string {
    const total = transactions.reduce((sum, tx) => sum + BigInt(tx.value || 0), BigInt(0));
    return ethers.formatEther(total);
  }

  private calculateAverageGasPrice(transactions: any[]): string {
    if (transactions.length === 0) return '0';
    const total = transactions.reduce((sum, tx) => sum + BigInt(tx.gasPrice || 0), BigInt(0));
    const average = total / BigInt(transactions.length);
    return ethers.formatUnits(average, 'gwei');
  }

  private countUniqueContracts(transactions: any[]): number {
    const contracts = new Set(transactions.map(tx => tx.to).filter(to => to !== null));
    return contracts.size;
  }

  private calculateTimeSpan(transactions: any[]): number {
    if (transactions.length < 2) return 0;
    const timestamps = transactions.map(tx => tx.timestamp).sort((a, b) => a - b);
    return timestamps[timestamps.length - 1] - timestamps[0];
  }

  private calculateVelocityScore(analysis: TransactionAnalysis): number {
    // High transaction velocity increases risk
    const txPerHour = analysis.transactionCount / (analysis.timeSpan / 3600000);
    if (txPerHour > 10) return 800; // Very high velocity
    if (txPerHour > 5) return 600;  // High velocity
    if (txPerHour > 1) return 300;  // Moderate velocity
    return 100; // Normal velocity
  }

  private calculateDiversificationScore(analysis: TransactionAnalysis): number {
    // Low diversification increases risk
    const diversificationRatio = analysis.uniqueContracts / Math.max(analysis.transactionCount, 1);
    if (diversificationRatio < 0.1) return 700; // Very low diversification
    if (diversificationRatio < 0.3) return 400; // Low diversification
    if (diversificationRatio < 0.6) return 200; // Moderate diversification
    return 50; // High diversification
  }

  private calculateBehaviorScore(analysis: TransactionAnalysis): number {
    // Analyze behavioral patterns
    let score = 0;
    
    // Check for suspicious patterns
    if (analysis.patterns.includes('rapid_transactions')) score += 200;
    if (analysis.patterns.includes('wash_trading')) score += 300;
    if (analysis.patterns.includes('circular_transactions')) score += 250;
    if (analysis.patterns.includes('sybil_attack')) score += 400;
    
    return Math.min(score, 1000);
  }

  private async calculateComplianceScore(address: string): Promise<number> {
    // Mock compliance check - in production, integrate with compliance services
    const isKYCVerified = false; // Check KYC status
    const isOnSanctionsList = false; // Check sanctions lists
    const hasComplianceFlags = false; // Check compliance flags
    
    let score = 0;
    if (!isKYCVerified) score += 300;
    if (isOnSanctionsList) score += 1000;
    if (hasComplianceFlags) score += 200;
    
    return Math.min(score, 1000);
  }

  private async calculateLiquidityScore(address: string): Promise<number> {
    // Mock liquidity analysis
    return 150; // Medium liquidity risk
  }

  private calculateCompositeRiskScore(metrics: RiskMetrics, analysis: TransactionAnalysis): number {
    // Weighted composite score
    const weights = {
      velocity: 0.25,
      diversification: 0.20,
      behavior: 0.25,
      compliance: 0.20,
      liquidity: 0.10,
    };
    
    const compositeScore = 
      metrics.velocityScore * weights.velocity +
      metrics.diversificationScore * weights.diversification +
      metrics.behaviorScore * weights.behavior +
      metrics.complianceScore * weights.compliance +
      metrics.liquidityScore * weights.liquidity;
    
    return Math.round(Math.min(compositeScore, 1000));
  }

  private determineRiskLevel(riskScore: number): 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH' | 'BLACKLISTED' {
    if (riskScore <= 100) return 'VERY_LOW';
    if (riskScore <= 250) return 'LOW';
    if (riskScore <= 500) return 'MEDIUM';
    if (riskScore <= 750) return 'HIGH';
    if (riskScore <= 900) return 'VERY_HIGH';
    return 'BLACKLISTED';
  }

  private calculateConfidence(metrics: RiskMetrics, analysis: TransactionAnalysis): number {
    // Confidence based on data quality and quantity
    let confidence = 0.5; // Base confidence
    
    // More transactions = higher confidence
    if (analysis.transactionCount > 100) confidence += 0.2;
    else if (analysis.transactionCount > 50) confidence += 0.1;
    
    // Longer time span = higher confidence
    if (analysis.timeSpan > 30 * 24 * 3600000) confidence += 0.2; // 30 days
    else if (analysis.timeSpan > 7 * 24 * 3600000) confidence += 0.1; // 7 days
    
    // Pattern detection = higher confidence
    if (analysis.patterns.length > 0) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  private identifyRiskFactors(metrics: RiskMetrics, analysis: TransactionAnalysis): string[] {
    const factors: string[] = [];
    
    if (metrics.velocityScore > 500) factors.push('High transaction velocity');
    if (metrics.diversificationScore > 400) factors.push('Low portfolio diversification');
    if (metrics.behaviorScore > 300) factors.push('Suspicious behavioral patterns');
    if (metrics.complianceScore > 200) factors.push('Compliance concerns');
    if (analysis.transactionCount < 10) factors.push('Limited transaction history');
    if (analysis.patterns.length > 0) factors.push('Fraud pattern detected');
    
    return factors;
  }

  private generateRecommendations(riskLevel: string, factors: string[]): string[] {
    const recommendations: string[] = [];
    
    switch (riskLevel) {
      case 'VERY_LOW':
        recommendations.push('Proceed with standard verification');
        break;
      case 'LOW':
        recommendations.push('Enhanced due diligence recommended');
        break;
      case 'MEDIUM':
        recommendations.push('Additional verification required');
        recommendations.push('Monitor transaction patterns');
        break;
      case 'HIGH':
        recommendations.push('Comprehensive risk assessment required');
        recommendations.push('Consider transaction limits');
        break;
      case 'VERY_HIGH':
        recommendations.push('Manual review required');
        recommendations.push('Implement strict monitoring');
        break;
      case 'BLACKLISTED':
        recommendations.push('Block all transactions');
        recommendations.push('Report to authorities if required');
        break;
    }
    
    return recommendations;
  }

  // Fraud detection methods
  private detectRapidTransactions(transactions: any[]): boolean {
    if (transactions.length < 5) return false;
    
    // Check for rapid succession of transactions
    const sortedTxs = transactions.sort((a, b) => a.timestamp - b.timestamp);
    let rapidCount = 0;
    
    for (let i = 1; i < sortedTxs.length; i++) {
      const timeDiff = sortedTxs[i].timestamp - sortedTxs[i-1].timestamp;
      if (timeDiff < 60000) { // Less than 1 minute
        rapidCount++;
      }
    }
    
    return rapidCount > transactions.length * 0.3; // 30% of transactions are rapid
  }

  private detectWashTrading(transactions: any[]): boolean {
    // Look for back-and-forth transactions with same addresses
    const addressPairs = new Map<string, number>();
    
    for (const tx of transactions) {
      const pair = [tx.from, tx.to].sort().join('-');
      addressPairs.set(pair, (addressPairs.get(pair) || 0) + 1);
    }
    
    // If any pair has more than 5 transactions, flag as potential wash trading
    return Array.from(addressPairs.values()).some(count => count > 5);
  }

  private detectCircularTransactions(transactions: any[]): boolean {
    // Simplified circular transaction detection
    const addresses = new Set([...transactions.map(tx => tx.from), ...transactions.map(tx => tx.to)]);
    return addresses.size < transactions.length * 0.5; // High address reuse
  }

  private detectSybilPattern(transactions: any[]): boolean {
    // Look for interactions with many new addresses
    const newAddresses = new Set(transactions.map(tx => tx.to));
    return newAddresses.size > transactions.length * 0.8; // High new address ratio
  }

  private detectFrontRunning(transactions: any[]): boolean {
    // Simplified front-running detection based on gas price patterns
    const sortedByGas = transactions.sort((a, b) => Number(b.gasPrice) - Number(a.gasPrice));
    const highGasTxs = sortedByGas.slice(0, Math.ceil(transactions.length * 0.1));
    
    return highGasTxs.length > 0 && Number(highGasTxs[0].gasPrice) > Number(sortedByGas[sortedByGas.length - 1].gasPrice) * 2;
  }

  private detectSandwichAttack(transactions: any[]): boolean {
    // Look for sandwich patterns in transaction ordering
    // This is a simplified heuristic
    return transactions.some((tx, i) => {
      if (i === 0 || i === transactions.length - 1) return false;
      const prev = transactions[i - 1];
      const next = transactions[i + 1];
      return prev.from === next.from && prev.to === next.to && tx.from !== prev.from;
    });
  }

  // Asset-specific methods
  private async getAssetData(tokenContract: string, tokenId: string): Promise<any> {
    // Mock asset data retrieval
    return {
      name: 'Sample Asset',
      description: 'Sample RWA',
      verified: false,
    };
  }

  private async getOwnershipHistory(tokenContract: string, tokenId: string): Promise<any[]> {
    // Mock ownership history
    return [
      { from: '0x000...', to: '0x111...', timestamp: Date.now() - 86400000 },
    ];
  }

  private async calculateAssetLiquidity(tokenContract: string, tokenId: string): Promise<number> {
    // Mock liquidity calculation
    return 300; // Medium liquidity risk
  }

  private calculateOwnershipScore(ownershipHistory: any[]): number {
    // Frequent ownership changes increase risk
    if (ownershipHistory.length > 10) return 600;
    if (ownershipHistory.length > 5) return 300;
    return 100;
  }

  private async calculateAssetCompliance(tokenContract: string, tokenId: string): Promise<number> {
    // Mock compliance check for assets
    return 150;
  }

  private calculateAssetRiskScore(metrics: {
    liquidityScore: number;
    ownershipScore: number;
    complianceScore: number;
    transactionCount: number;
  }): number {
    const weights = {
      liquidity: 0.3,
      ownership: 0.3,
      compliance: 0.3,
      activity: 0.1,
    };
    
    const activityScore = metrics.transactionCount < 5 ? 400 : 100;
    
    return Math.round(
      metrics.liquidityScore * weights.liquidity +
      metrics.ownershipScore * weights.ownership +
      metrics.complianceScore * weights.compliance +
      activityScore * weights.activity
    );
  }

  private identifyAssetRiskFactors(metrics: {
    liquidityScore: number;
    ownershipScore: number;
    complianceScore: number;
  }): string[] {
    const factors: string[] = [];
    
    if (metrics.liquidityScore > 400) factors.push('Low liquidity');
    if (metrics.ownershipScore > 400) factors.push('Frequent ownership changes');
    if (metrics.complianceScore > 300) factors.push('Compliance issues');
    
    return factors;
  }

  private generateAssetRecommendations(riskLevel: string, factors: string[]): string[] {
    const recommendations: string[] = [];
    
    if (riskLevel === 'HIGH' || riskLevel === 'VERY_HIGH') {
      recommendations.push('Require additional asset verification');
      recommendations.push('Implement enhanced monitoring');
    }
    
    if (factors.includes('Low liquidity')) {
      recommendations.push('Consider liquidity requirements');
    }
    
    if (factors.includes('Compliance issues')) {
      recommendations.push('Verify regulatory compliance');
    }
    
    return recommendations;
  }
}
