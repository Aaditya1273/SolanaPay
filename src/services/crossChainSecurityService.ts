import { EventEmitter } from 'events';

// Types and Interfaces
export interface SecurityAlert {
  id: string;
  type: 'fraud_detection' | 'anomaly_detection' | 'suspicious_activity' | 'bridge_exploit' | 'flash_loan_attack';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: string;
  chainId: number;
  chainName: string;
  transactionHash?: string;
  walletAddress?: string;
  assetAddress?: string;
  amount?: string;
  riskScore: number;
  indicators: string[];
  recommendedActions: string[];
  status: 'active' | 'investigating' | 'resolved' | 'false_positive';
  metadata?: Record<string, any>;
}

export interface TransactionAnalysis {
  transactionHash: string;
  chainId: number;
  from: string;
  to: string;
  value: string;
  gasUsed: string;
  timestamp: string;
  riskScore: number;
  anomalyFlags: AnomalyFlag[];
  patterns: DetectedPattern[];
  confidence: number;
}

export interface AnomalyFlag {
  type: 'unusual_amount' | 'suspicious_timing' | 'blacklisted_address' | 'rapid_succession' | 'cross_chain_pattern' | 'minting_anomaly';
  severity: 'low' | 'medium' | 'high';
  description: string;
  confidence: number;
  metadata?: Record<string, any>;
}

export interface DetectedPattern {
  type: 'wash_trading' | 'pump_dump' | 'sandwich_attack' | 'front_running' | 'bridge_exploit' | 'flash_loan_attack';
  confidence: number;
  description: string;
  relatedTransactions: string[];
  timeframe: string;
}

export interface BridgeTransfer {
  id: string;
  sourceChain: number;
  targetChain: number;
  sourceHash: string;
  targetHash?: string;
  asset: string;
  amount: string;
  sender: string;
  recipient: string;
  timestamp: string;
  status: 'pending' | 'completed' | 'failed' | 'suspicious';
  riskScore: number;
  flags: AnomalyFlag[];
}

export interface WalletProfile {
  address: string;
  riskScore: number;
  transactionCount: number;
  totalVolume: string;
  firstSeen: string;
  lastActivity: string;
  chains: number[];
  flags: string[];
  reputation: 'trusted' | 'neutral' | 'suspicious' | 'blacklisted';
  behaviorPatterns: string[];
}

export interface SecurityMetrics {
  totalTransactionsMonitored: number;
  alertsGenerated: number;
  threatsDetected: number;
  falsePositiveRate: number;
  averageResponseTime: number;
  topRiskChains: Array<{ chainId: number; riskScore: number; alertCount: number }>;
  alertsByType: Record<string, number>;
  alertsBySeverity: Record<string, number>;
  recentTrends: Array<{ date: string; alerts: number; threats: number }>;
}

// Mock data for demonstration
const MOCK_CHAINS = [
  { id: 1, name: 'Ethereum', rpc: 'https://mainnet.infura.io/v3/' },
  { id: 137, name: 'Polygon', rpc: 'https://polygon-rpc.com' },
  { id: 56, name: 'BSC', rpc: 'https://bsc-dataseed.binance.org' },
  { id: 1000, name: 'OneChain', rpc: 'https://mainnet-rpc.onechain.ai' },
  { id: 43114, name: 'Avalanche', rpc: 'https://api.avax.network/ext/bc/C/rpc' },
];

const BLACKLISTED_ADDRESSES = [
  '0x1234567890123456789012345678901234567890',
  '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  '0x9876543210987654321098765432109876543210',
];

class CrossChainSecurityService extends EventEmitter {
  private alerts: SecurityAlert[] = [];
  private bridgeTransfers: BridgeTransfer[] = [];
  private walletProfiles: Map<string, WalletProfile> = new Map();
  private isMonitoring: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.initializeMockData();
  }

  // Initialize with mock data for demonstration
  private initializeMockData() {
    // Generate mock alerts
    this.alerts = this.generateMockAlerts();
    
    // Generate mock bridge transfers
    this.bridgeTransfers = this.generateMockBridgeTransfers();
    
    // Generate mock wallet profiles
    this.generateMockWalletProfiles();
  }

  private generateMockAlerts(): SecurityAlert[] {
    const alertTypes = ['fraud_detection', 'anomaly_detection', 'suspicious_activity', 'bridge_exploit', 'flash_loan_attack'] as const;
    const severities = ['low', 'medium', 'high', 'critical'] as const;
    const statuses = ['active', 'investigating', 'resolved', 'false_positive'] as const;

    return Array.from({ length: 15 }, (_, i) => {
      const type = alertTypes[Math.floor(Math.random() * alertTypes.length)];
      const severity = severities[Math.floor(Math.random() * severities.length)];
      const chain = MOCK_CHAINS[Math.floor(Math.random() * MOCK_CHAINS.length)];
      
      return {
        id: `alert_${Date.now()}_${i}`,
        type,
        severity,
        title: this.getAlertTitle(type, severity),
        description: this.getAlertDescription(type),
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        chainId: chain.id,
        chainName: chain.name,
        transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        walletAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
        assetAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
        amount: (Math.random() * 1000000).toFixed(2),
        riskScore: Math.floor(Math.random() * 100),
        indicators: this.getAlertIndicators(type),
        recommendedActions: this.getRecommendedActions(type, severity),
        status: statuses[Math.floor(Math.random() * statuses.length)],
        metadata: {
          detectionMethod: 'ML_ALGORITHM',
          confidence: Math.random(),
          relatedAlerts: Math.floor(Math.random() * 5),
        }
      };
    });
  }

  private generateMockBridgeTransfers(): BridgeTransfer[] {
    return Array.from({ length: 10 }, (_, i) => {
      const sourceChain = MOCK_CHAINS[Math.floor(Math.random() * MOCK_CHAINS.length)];
      const targetChain = MOCK_CHAINS[Math.floor(Math.random() * MOCK_CHAINS.length)];
      const riskScore = Math.floor(Math.random() * 100);
      
      return {
        id: `bridge_${Date.now()}_${i}`,
        sourceChain: sourceChain.id,
        targetChain: targetChain.id,
        sourceHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        targetHash: Math.random() > 0.3 ? `0x${Math.random().toString(16).substr(2, 64)}` : undefined,
        asset: `0x${Math.random().toString(16).substr(2, 40)}`,
        amount: (Math.random() * 100000).toFixed(2),
        sender: `0x${Math.random().toString(16).substr(2, 40)}`,
        recipient: `0x${Math.random().toString(16).substr(2, 40)}`,
        timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        status: riskScore > 80 ? 'suspicious' : Math.random() > 0.1 ? 'completed' : 'pending',
        riskScore,
        flags: riskScore > 70 ? this.generateAnomalyFlags() : [],
      };
    });
  }

  private generateMockWalletProfiles() {
    const addresses = Array.from({ length: 20 }, () => `0x${Math.random().toString(16).substr(2, 40)}`);
    
    addresses.forEach(address => {
      const riskScore = Math.floor(Math.random() * 100);
      const reputation = riskScore > 80 ? 'blacklisted' : riskScore > 60 ? 'suspicious' : riskScore > 30 ? 'neutral' : 'trusted';
      
      this.walletProfiles.set(address, {
        address,
        riskScore,
        transactionCount: Math.floor(Math.random() * 10000),
        totalVolume: (Math.random() * 10000000).toFixed(2),
        firstSeen: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        lastActivity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        chains: MOCK_CHAINS.slice(0, Math.floor(Math.random() * MOCK_CHAINS.length) + 1).map(c => c.id),
        flags: riskScore > 50 ? ['high_frequency_trading', 'cross_chain_activity'] : [],
        reputation,
        behaviorPatterns: this.generateBehaviorPatterns(riskScore),
      });
    });
  }

  private generateAnomalyFlags(): AnomalyFlag[] {
    const flagTypes = ['unusual_amount', 'suspicious_timing', 'blacklisted_address', 'rapid_succession', 'cross_chain_pattern', 'minting_anomaly'] as const;
    const severities = ['low', 'medium', 'high'] as const;
    
    return Array.from({ length: Math.floor(Math.random() * 3) + 1 }, () => {
      const type = flagTypes[Math.floor(Math.random() * flagTypes.length)];
      return {
        type,
        severity: severities[Math.floor(Math.random() * severities.length)],
        description: this.getFlagDescription(type),
        confidence: Math.random(),
      };
    });
  }

  private generateBehaviorPatterns(riskScore: number): string[] {
    const patterns = ['normal_trading', 'high_frequency', 'cross_chain_arbitrage', 'liquidity_provision', 'mev_bot', 'wash_trading', 'pump_dump'];
    const count = riskScore > 70 ? 3 : riskScore > 40 ? 2 : 1;
    return patterns.slice(0, count);
  }

  // Alert generation helpers
  private getAlertTitle(type: string, severity: string): string {
    const titles = {
      fraud_detection: `${severity.toUpperCase()} Fraud Detection Alert`,
      anomaly_detection: `Anomalous Activity Detected - ${severity.toUpperCase()}`,
      suspicious_activity: `Suspicious Transaction Pattern - ${severity.toUpperCase()}`,
      bridge_exploit: `Potential Bridge Exploit - ${severity.toUpperCase()}`,
      flash_loan_attack: `Flash Loan Attack Detected - ${severity.toUpperCase()}`,
    };
    return titles[type as keyof typeof titles] || 'Security Alert';
  }

  private getAlertDescription(type: string): string {
    const descriptions = {
      fraud_detection: 'Fraudulent transaction patterns detected using machine learning algorithms',
      anomaly_detection: 'Unusual transaction behavior that deviates from normal patterns',
      suspicious_activity: 'Multiple indicators suggest potentially malicious activity',
      bridge_exploit: 'Potential exploitation of cross-chain bridge vulnerabilities detected',
      flash_loan_attack: 'Flash loan attack pattern identified with unusual MEV activity',
    };
    return descriptions[type as keyof typeof descriptions] || 'Security threat detected';
  }

  private getAlertIndicators(type: string): string[] {
    const indicators = {
      fraud_detection: ['Unusual transaction amounts', 'Rapid succession of transactions', 'Known fraudulent patterns'],
      anomaly_detection: ['Statistical deviation from normal behavior', 'Unusual gas usage patterns', 'Atypical transaction timing'],
      suspicious_activity: ['Multiple red flags triggered', 'Blacklisted address interaction', 'High-risk transaction pattern'],
      bridge_exploit: ['Bridge contract vulnerability', 'Unusual cross-chain activity', 'Potential reentrancy attack'],
      flash_loan_attack: ['Flash loan utilization', 'Price manipulation detected', 'MEV bot activity'],
    };
    return indicators[type as keyof typeof indicators] || ['Unknown threat pattern'];
  }

  private getRecommendedActions(type: string, severity: string): string[] {
    const baseActions = ['Monitor closely', 'Review transaction details', 'Check wallet reputation'];
    const severityActions = {
      low: ['Continue monitoring'],
      medium: ['Increase monitoring frequency', 'Alert relevant parties'],
      high: ['Immediate investigation required', 'Consider temporary restrictions'],
      critical: ['Emergency response protocol', 'Immediate asset protection measures', 'Contact security team'],
    };
    return [...baseActions, ...severityActions[severity as keyof typeof severityActions]];
  }

  private getFlagDescription(type: string): string {
    const descriptions = {
      unusual_amount: 'Transaction amount significantly deviates from normal patterns',
      suspicious_timing: 'Transaction timing suggests coordinated or automated activity',
      blacklisted_address: 'Interaction with known malicious or blacklisted address',
      rapid_succession: 'Multiple transactions in rapid succession indicating bot activity',
      cross_chain_pattern: 'Unusual cross-chain transaction patterns detected',
      minting_anomaly: 'Abnormal asset minting behavior detected',
    };
    return descriptions[type as keyof typeof descriptions] || 'Anomalous behavior detected';
  }

  // Public API Methods
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      throw new Error('Monitoring is already active');
    }

    this.isMonitoring = true;
    console.log('Cross-chain security monitoring started');

    // Simulate real-time monitoring
    this.monitoringInterval = setInterval(() => {
      this.simulateRealTimeDetection();
    }, 30000); // Check every 30 seconds

    this.emit('monitoring_started');
  }

  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      throw new Error('Monitoring is not active');
    }

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    console.log('Cross-chain security monitoring stopped');
    this.emit('monitoring_stopped');
  }

  private simulateRealTimeDetection() {
    // Randomly generate new alerts to simulate real-time detection
    if (Math.random() < 0.3) { // 30% chance of new alert
      const newAlert = this.generateMockAlerts()[0];
      newAlert.timestamp = new Date().toISOString();
      this.alerts.unshift(newAlert);
      
      // Keep only last 50 alerts
      if (this.alerts.length > 50) {
        this.alerts = this.alerts.slice(0, 50);
      }

      this.emit('new_alert', newAlert);
      console.log(`New security alert: ${newAlert.title}`);
    }
  }

  async analyzeTransaction(transactionHash: string, chainId: number): Promise<TransactionAnalysis> {
    // Simulate transaction analysis
    await new Promise(resolve => setTimeout(resolve, 1000));

    const riskScore = Math.floor(Math.random() * 100);
    const anomalyFlags = riskScore > 60 ? this.generateAnomalyFlags() : [];
    
    return {
      transactionHash,
      chainId,
      from: `0x${Math.random().toString(16).substr(2, 40)}`,
      to: `0x${Math.random().toString(16).substr(2, 40)}`,
      value: (Math.random() * 1000).toFixed(18),
      gasUsed: Math.floor(Math.random() * 500000).toString(),
      timestamp: new Date().toISOString(),
      riskScore,
      anomalyFlags,
      patterns: riskScore > 80 ? [{
        type: 'wash_trading',
        confidence: Math.random(),
        description: 'Potential wash trading pattern detected',
        relatedTransactions: [`0x${Math.random().toString(16).substr(2, 64)}`],
        timeframe: '1 hour',
      }] : [],
      confidence: Math.random(),
    };
  }

  async analyzeBridgeTransfer(transferId: string): Promise<BridgeTransfer> {
    const transfer = this.bridgeTransfers.find(t => t.id === transferId);
    if (!transfer) {
      throw new Error('Bridge transfer not found');
    }

    // Simulate additional analysis
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return transfer;
  }

  async getWalletProfile(address: string): Promise<WalletProfile> {
    let profile = this.walletProfiles.get(address);
    
    if (!profile) {
      // Create new profile for unknown wallet
      const riskScore = Math.floor(Math.random() * 100);
      profile = {
        address,
        riskScore,
        transactionCount: 0,
        totalVolume: '0',
        firstSeen: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        chains: [],
        flags: [],
        reputation: 'neutral',
        behaviorPatterns: ['new_wallet'],
      };
      this.walletProfiles.set(address, profile);
    }

    return profile;
  }

  async getSecurityAlerts(filters?: {
    severity?: string;
    type?: string;
    chainId?: number;
    status?: string;
    limit?: number;
  }): Promise<SecurityAlert[]> {
    let filteredAlerts = [...this.alerts];

    if (filters) {
      if (filters.severity) {
        filteredAlerts = filteredAlerts.filter(alert => alert.severity === filters.severity);
      }
      if (filters.type) {
        filteredAlerts = filteredAlerts.filter(alert => alert.type === filters.type);
      }
      if (filters.chainId) {
        filteredAlerts = filteredAlerts.filter(alert => alert.chainId === filters.chainId);
      }
      if (filters.status) {
        filteredAlerts = filteredAlerts.filter(alert => alert.status === filters.status);
      }
      if (filters.limit) {
        filteredAlerts = filteredAlerts.slice(0, filters.limit);
      }
    }

    return filteredAlerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async getBridgeTransfers(filters?: {
    chainId?: number;
    status?: string;
    riskThreshold?: number;
    limit?: number;
  }): Promise<BridgeTransfer[]> {
    let filteredTransfers = [...this.bridgeTransfers];

    if (filters) {
      if (filters.chainId) {
        filteredTransfers = filteredTransfers.filter(
          transfer => transfer.sourceChain === filters.chainId || transfer.targetChain === filters.chainId
        );
      }
      if (filters.status) {
        filteredTransfers = filteredTransfers.filter(transfer => transfer.status === filters.status);
      }
      if (filters.riskThreshold) {
        filteredTransfers = filteredTransfers.filter(transfer => transfer.riskScore >= filters.riskThreshold);
      }
      if (filters.limit) {
        filteredTransfers = filteredTransfers.slice(0, filters.limit);
      }
    }

    return filteredTransfers.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async getSecurityMetrics(): Promise<SecurityMetrics> {
    const totalTransactions = Math.floor(Math.random() * 1000000) + 500000;
    const alertsGenerated = this.alerts.length;
    const threatsDetected = this.alerts.filter(alert => alert.severity === 'high' || alert.severity === 'critical').length;
    
    return {
      totalTransactionsMonitored: totalTransactions,
      alertsGenerated,
      threatsDetected,
      falsePositiveRate: Math.random() * 0.1, // 0-10%
      averageResponseTime: Math.random() * 300 + 60, // 60-360 seconds
      topRiskChains: MOCK_CHAINS.map(chain => ({
        chainId: chain.id,
        riskScore: Math.floor(Math.random() * 100),
        alertCount: Math.floor(Math.random() * 50),
      })).sort((a, b) => b.riskScore - a.riskScore).slice(0, 5),
      alertsByType: {
        fraud_detection: this.alerts.filter(a => a.type === 'fraud_detection').length,
        anomaly_detection: this.alerts.filter(a => a.type === 'anomaly_detection').length,
        suspicious_activity: this.alerts.filter(a => a.type === 'suspicious_activity').length,
        bridge_exploit: this.alerts.filter(a => a.type === 'bridge_exploit').length,
        flash_loan_attack: this.alerts.filter(a => a.type === 'flash_loan_attack').length,
      },
      alertsBySeverity: {
        low: this.alerts.filter(a => a.severity === 'low').length,
        medium: this.alerts.filter(a => a.severity === 'medium').length,
        high: this.alerts.filter(a => a.severity === 'high').length,
        critical: this.alerts.filter(a => a.severity === 'critical').length,
      },
      recentTrends: Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        alerts: Math.floor(Math.random() * 20) + 5,
        threats: Math.floor(Math.random() * 5) + 1,
      })).reverse(),
    };
  }

  async updateAlertStatus(alertId: string, status: SecurityAlert['status']): Promise<SecurityAlert> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }

    alert.status = status;
    this.emit('alert_updated', alert);
    
    return alert;
  }

  async generateSecurityReport(timeframe: 'day' | 'week' | 'month'): Promise<{
    summary: string;
    totalAlerts: number;
    criticalThreats: number;
    topRisks: string[];
    recommendations: string[];
    metrics: SecurityMetrics;
  }> {
    const metrics = await this.getSecurityMetrics();
    const criticalAlerts = this.alerts.filter(alert => alert.severity === 'critical');
    
    return {
      summary: `Security analysis for the past ${timeframe} shows ${metrics.alertsGenerated} alerts generated with ${metrics.threatsDetected} confirmed threats detected.`,
      totalAlerts: metrics.alertsGenerated,
      criticalThreats: criticalAlerts.length,
      topRisks: [
        'Bridge exploit attempts',
        'Flash loan attacks',
        'Unusual minting patterns',
        'Cross-chain arbitrage abuse',
        'Wash trading detection'
      ],
      recommendations: [
        'Increase monitoring frequency for high-risk chains',
        'Implement additional bridge security measures',
        'Review and update anomaly detection algorithms',
        'Enhance wallet reputation scoring',
        'Strengthen real-time alert mechanisms'
      ],
      metrics,
    };
  }

  // Utility methods
  isAddressBlacklisted(address: string): boolean {
    return BLACKLISTED_ADDRESSES.includes(address.toLowerCase());
  }

  getSupportedChains(): Array<{ id: number; name: string }> {
    return MOCK_CHAINS.map(({ id, name }) => ({ id, name }));
  }

  getMonitoringStatus(): { isActive: boolean; uptime: number; lastCheck: string } {
    return {
      isActive: this.isMonitoring,
      uptime: this.isMonitoring ? Math.random() * 100 : 0,
      lastCheck: new Date().toISOString(),
    };
  }
}

// Export singleton instance
export const crossChainSecurityService = new CrossChainSecurityService();
export default crossChainSecurityService;
