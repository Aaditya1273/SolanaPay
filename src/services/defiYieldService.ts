import { EventEmitter } from 'events';

// Types and Interfaces
export interface CollateralAsset {
  id: string;
  nftContract: string;
  tokenId: string;
  owner: string;
  collateralValue: number;
  loanAmount: number;
  ltv: number;
  liquidationThreshold: number;
  healthFactor: number;
  isActive: boolean;
  lendingProtocol: string;
  lastValuation: string;
}

export interface StakedAsset {
  id: string;
  nftContract: string;
  tokenId: string;
  owner: string;
  stakedAmount: number;
  stakingTime: string;
  lastRewardClaim: string;
  accumulatedRewards: number;
  yieldRate: number;
  poolId: string;
  isActive: boolean;
}

export interface LendingPool {
  id: string;
  name: string;
  asset: string;
  totalSupply: number;
  totalBorrow: number;
  supplyRate: number;
  borrowRate: number;
  utilizationRate: number;
  tvl: number;
  isActive: boolean;
  protocol: 'aave' | 'compound' | 'onechain';
}

export interface YieldPool {
  id: string;
  name: string;
  rewardToken: string;
  totalStaked: number;
  totalRewards: number;
  apy: number;
  minStakingPeriod: number;
  lockupPeriod: number;
  isActive: boolean;
  allowedNFTs: string[];
}

export interface UserPosition {
  address: string;
  totalSupplied: number;
  totalBorrowed: number;
  totalStaked: number;
  totalRewards: number;
  healthFactor: number;
  collaterals: CollateralAsset[];
  stakes: StakedAsset[];
  lastActivity: string;
}

export interface LendingProtocol {
  name: string;
  protocol: 'aave' | 'compound' | 'onechain';
  address: string;
  maxLTV: number;
  liquidationThreshold: number;
  isActive: boolean;
  supportedAssets: string[];
  totalTVL: number;
}

export interface YieldStrategy {
  id: string;
  name: string;
  description: string;
  apy: number;
  risk: 'low' | 'medium' | 'high';
  protocol: string;
  minAmount: number;
  lockupPeriod: number;
  autoCompound: boolean;
}

export interface DeFiMetrics {
  totalValueLocked: number;
  totalSupplied: number;
  totalBorrowed: number;
  totalStaked: number;
  totalRewardsDistributed: number;
  averageAPY: number;
  activeUsers: number;
  protocolCount: number;
}

// Mock data constants
const MOCK_ASSETS = [
  { symbol: 'USDC', name: 'USD Coin', address: '0x...', decimals: 6 },
  { symbol: 'USDT', name: 'Tether USD', address: '0x...', decimals: 6 },
  { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x...', decimals: 18 },
  { symbol: 'WETH', name: 'Wrapped Ether', address: '0x...', decimals: 18 },
  { symbol: 'OCT', name: 'OneChain Token', address: '0x...', decimals: 18 },
];

const MOCK_NFT_CONTRACTS = [
  { name: 'RWA Real Estate', address: '0x...', type: 'real_estate' },
  { name: 'RWA Carbon Credits', address: '0x...', type: 'carbon_credits' },
  { name: 'RWA Precious Metals', address: '0x...', type: 'precious_metals' },
  { name: 'RWA Infrastructure', address: '0x...', type: 'infrastructure' },
];

class DeFiYieldService extends EventEmitter {
  private collateralAssets: Map<string, CollateralAsset> = new Map();
  private stakedAssets: Map<string, StakedAsset> = new Map();
  private lendingPools: Map<string, LendingPool> = new Map();
  private yieldPools: Map<string, YieldPool> = new Map();
  private userPositions: Map<string, UserPosition> = new Map();
  private lendingProtocols: Map<string, LendingProtocol> = new Map();
  private yieldStrategies: Map<string, YieldStrategy> = new Map();

  constructor() {
    super();
    this.initializeMockData();
  }

  private initializeMockData() {
    this.generateMockLendingPools();
    this.generateMockYieldPools();
    this.generateMockProtocols();
    this.generateMockStrategies();
    this.generateMockPositions();
  }

  private generateMockLendingPools() {
    const pools = [
      {
        id: 'aave-usdc',
        name: 'Aave USDC Pool',
        asset: 'USDC',
        totalSupply: 50000000,
        totalBorrow: 35000000,
        supplyRate: 3.2,
        borrowRate: 4.8,
        utilizationRate: 70,
        tvl: 50000000,
        isActive: true,
        protocol: 'aave' as const,
      },
      {
        id: 'compound-dai',
        name: 'Compound DAI Pool',
        asset: 'DAI',
        totalSupply: 25000000,
        totalBorrow: 18000000,
        supplyRate: 2.8,
        borrowRate: 4.2,
        utilizationRate: 72,
        tvl: 25000000,
        isActive: true,
        protocol: 'compound' as const,
      },
      {
        id: 'onechain-oct',
        name: 'OneChain OCT Pool',
        asset: 'OCT',
        totalSupply: 10000000,
        totalBorrow: 6000000,
        supplyRate: 5.5,
        borrowRate: 8.2,
        utilizationRate: 60,
        tvl: 10000000,
        isActive: true,
        protocol: 'onechain' as const,
      },
    ];

    pools.forEach(pool => {
      this.lendingPools.set(pool.id, pool);
    });
  }

  private generateMockYieldPools() {
    const pools = [
      {
        id: 'rwa-real-estate',
        name: 'RWA Real Estate Staking',
        rewardToken: 'OCT',
        totalStaked: 5000000,
        totalRewards: 250000,
        apy: 12.5,
        minStakingPeriod: 30 * 24 * 60 * 60, // 30 days
        lockupPeriod: 7 * 24 * 60 * 60, // 7 days
        isActive: true,
        allowedNFTs: ['0x...real-estate'],
      },
      {
        id: 'rwa-carbon-credits',
        name: 'Carbon Credits Yield Pool',
        rewardToken: 'USDC',
        totalStaked: 2000000,
        totalRewards: 180000,
        apy: 15.2,
        minStakingPeriod: 60 * 24 * 60 * 60, // 60 days
        lockupPeriod: 14 * 24 * 60 * 60, // 14 days
        isActive: true,
        allowedNFTs: ['0x...carbon-credits'],
      },
      {
        id: 'rwa-precious-metals',
        name: 'Precious Metals Vault',
        rewardToken: 'DAI',
        totalStaked: 8000000,
        totalRewards: 640000,
        apy: 8.8,
        minStakingPeriod: 90 * 24 * 60 * 60, // 90 days
        lockupPeriod: 21 * 24 * 60 * 60, // 21 days
        isActive: true,
        allowedNFTs: ['0x...precious-metals'],
      },
    ];

    pools.forEach(pool => {
      this.yieldPools.set(pool.id, pool);
    });
  }

  private generateMockProtocols() {
    const protocols = [
      {
        name: 'Aave V3',
        protocol: 'aave' as const,
        address: '0x...aave',
        maxLTV: 75,
        liquidationThreshold: 80,
        isActive: true,
        supportedAssets: ['USDC', 'USDT', 'DAI', 'WETH'],
        totalTVL: 75000000,
      },
      {
        name: 'Compound V3',
        protocol: 'compound' as const,
        address: '0x...compound',
        maxLTV: 70,
        liquidationThreshold: 75,
        isActive: true,
        supportedAssets: ['USDC', 'DAI', 'WETH'],
        totalTVL: 45000000,
      },
      {
        name: 'OneChain Lending',
        protocol: 'onechain' as const,
        address: '0x...onechain',
        maxLTV: 80,
        liquidationThreshold: 85,
        isActive: true,
        supportedAssets: ['OCT', 'USDC', 'WETH'],
        totalTVL: 15000000,
      },
    ];

    protocols.forEach(protocol => {
      this.lendingProtocols.set(protocol.protocol, protocol);
    });
  }

  private generateMockStrategies() {
    const strategies = [
      {
        id: 'conservative-stablecoin',
        name: 'Conservative Stablecoin Strategy',
        description: 'Low-risk strategy focusing on stablecoin lending with RWA collateral',
        apy: 6.5,
        risk: 'low' as const,
        protocol: 'aave',
        minAmount: 1000,
        lockupPeriod: 0,
        autoCompound: true,
      },
      {
        id: 'balanced-yield',
        name: 'Balanced Yield Strategy',
        description: 'Medium-risk strategy combining lending and staking for optimal returns',
        apy: 11.2,
        risk: 'medium' as const,
        protocol: 'compound',
        minAmount: 5000,
        lockupPeriod: 30 * 24 * 60 * 60,
        autoCompound: true,
      },
      {
        id: 'aggressive-defi',
        name: 'Aggressive DeFi Strategy',
        description: 'High-yield strategy leveraging multiple protocols and yield farming',
        apy: 18.7,
        risk: 'high' as const,
        protocol: 'onechain',
        minAmount: 10000,
        lockupPeriod: 90 * 24 * 60 * 60,
        autoCompound: false,
      },
    ];

    strategies.forEach(strategy => {
      this.yieldStrategies.set(strategy.id, strategy);
    });
  }

  private generateMockPositions() {
    // Generate mock user positions with collateral and staking data
    for (let i = 1; i <= 20; i++) {
      const userAddress = `0x${Math.random().toString(16).substr(2, 40)}`;
      
      const collaterals = this.generateMockCollaterals(userAddress, Math.floor(Math.random() * 3) + 1);
      const stakes = this.generateMockStakes(userAddress, Math.floor(Math.random() * 2) + 1);
      
      const totalSupplied = Math.floor(Math.random() * 100000) + 10000;
      const totalBorrowed = Math.floor(Math.random() * 50000);
      const totalStaked = stakes.reduce((sum, stake) => sum + stake.stakedAmount, 0);
      const totalRewards = stakes.reduce((sum, stake) => sum + stake.accumulatedRewards, 0);
      
      const position: UserPosition = {
        address: userAddress,
        totalSupplied,
        totalBorrowed,
        totalStaked,
        totalRewards,
        healthFactor: totalBorrowed > 0 ? (totalSupplied * 0.8) / totalBorrowed : 999,
        collaterals,
        stakes,
        lastActivity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      this.userPositions.set(userAddress, position);
    }
  }

  private generateMockCollaterals(userAddress: string, count: number): CollateralAsset[] {
    const collaterals: CollateralAsset[] = [];
    
    for (let i = 0; i < count; i++) {
      const nftContract = MOCK_NFT_CONTRACTS[Math.floor(Math.random() * MOCK_NFT_CONTRACTS.length)];
      const collateralValue = Math.floor(Math.random() * 500000) + 50000;
      const loanAmount = Math.floor(collateralValue * (0.3 + Math.random() * 0.4));
      
      const collateral: CollateralAsset = {
        id: `collateral_${userAddress}_${i}`,
        nftContract: nftContract.address,
        tokenId: (Math.floor(Math.random() * 1000) + 1).toString(),
        owner: userAddress,
        collateralValue,
        loanAmount,
        ltv: (loanAmount / collateralValue) * 100,
        liquidationThreshold: 80,
        healthFactor: (collateralValue * 0.8) / loanAmount,
        isActive: true,
        lendingProtocol: ['aave', 'compound', 'onechain'][Math.floor(Math.random() * 3)],
        lastValuation: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
      };
      
      collaterals.push(collateral);
      this.collateralAssets.set(collateral.id, collateral);
    }
    
    return collaterals;
  }

  private generateMockStakes(userAddress: string, count: number): StakedAsset[] {
    const stakes: StakedAsset[] = [];
    const poolIds = Array.from(this.yieldPools.keys());
    
    for (let i = 0; i < count; i++) {
      const poolId = poolIds[Math.floor(Math.random() * poolIds.length)];
      const pool = this.yieldPools.get(poolId)!;
      const stakedAmount = Math.floor(Math.random() * 100000) + 10000;
      const stakingTime = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000);
      const accumulatedRewards = Math.floor(stakedAmount * pool.apy * 0.01 * Math.random());
      
      const stake: StakedAsset = {
        id: `stake_${userAddress}_${i}`,
        nftContract: pool.allowedNFTs[0],
        tokenId: (Math.floor(Math.random() * 1000) + 1).toString(),
        owner: userAddress,
        stakedAmount,
        stakingTime: stakingTime.toISOString(),
        lastRewardClaim: new Date(stakingTime.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        accumulatedRewards,
        yieldRate: pool.apy,
        poolId,
        isActive: true,
      };
      
      stakes.push(stake);
      this.stakedAssets.set(stake.id, stake);
    }
    
    return stakes;
  }

  // Public API methods
  async getUserPosition(userAddress: string): Promise<UserPosition | null> {
    return this.userPositions.get(userAddress) || null;
  }

  async getLendingPools(): Promise<LendingPool[]> {
    return Array.from(this.lendingPools.values());
  }

  async getYieldPools(): Promise<YieldPool[]> {
    return Array.from(this.yieldPools.values());
  }

  async getLendingProtocols(): Promise<LendingProtocol[]> {
    return Array.from(this.lendingProtocols.values());
  }

  async getYieldStrategies(): Promise<YieldStrategy[]> {
    return Array.from(this.yieldStrategies.values());
  }

  async depositCollateral(
    userAddress: string,
    nftContract: string,
    tokenId: string,
    protocol: string
  ): Promise<string> {
    const collateralId = `collateral_${userAddress}_${Date.now()}`;
    const collateralValue = Math.floor(Math.random() * 500000) + 50000;
    
    const collateral: CollateralAsset = {
      id: collateralId,
      nftContract,
      tokenId,
      owner: userAddress,
      collateralValue,
      loanAmount: 0,
      ltv: 0,
      liquidationThreshold: 80,
      healthFactor: 999,
      isActive: true,
      lendingProtocol: protocol,
      lastValuation: new Date().toISOString(),
    };
    
    this.collateralAssets.set(collateralId, collateral);
    
    // Update user position
    const position = this.userPositions.get(userAddress);
    if (position) {
      position.collaterals.push(collateral);
      position.lastActivity = new Date().toISOString();
    }
    
    this.emit('collateral_deposited', { userAddress, collateralId, collateral });
    
    return collateralId;
  }

  async borrowAgainstCollateral(
    userAddress: string,
    collateralId: string,
    borrowAmount: number,
    asset: string
  ): Promise<void> {
    const collateral = this.collateralAssets.get(collateralId);
    if (!collateral || collateral.owner !== userAddress) {
      throw new Error('Invalid collateral');
    }
    
    const maxBorrow = collateral.collateralValue * 0.75; // 75% LTV
    if (borrowAmount > maxBorrow) {
      throw new Error('Borrow amount exceeds LTV limit');
    }
    
    collateral.loanAmount = borrowAmount;
    collateral.ltv = (borrowAmount / collateral.collateralValue) * 100;
    collateral.healthFactor = (collateral.collateralValue * 0.8) / borrowAmount;
    
    // Update user position
    const position = this.userPositions.get(userAddress);
    if (position) {
      position.totalBorrowed += borrowAmount;
      position.healthFactor = position.totalSupplied > 0 ? 
        (position.totalSupplied * 0.8) / position.totalBorrowed : 999;
      position.lastActivity = new Date().toISOString();
    }
    
    this.emit('loan_created', { userAddress, collateralId, borrowAmount, asset });
  }

  async stakeAsset(
    userAddress: string,
    nftContract: string,
    tokenId: string,
    poolId: string,
    amount: number
  ): Promise<string> {
    const pool = this.yieldPools.get(poolId);
    if (!pool || !pool.isActive) {
      throw new Error('Invalid or inactive pool');
    }
    
    const stakeId = `stake_${userAddress}_${Date.now()}`;
    
    const stake: StakedAsset = {
      id: stakeId,
      nftContract,
      tokenId,
      owner: userAddress,
      stakedAmount: amount,
      stakingTime: new Date().toISOString(),
      lastRewardClaim: new Date().toISOString(),
      accumulatedRewards: 0,
      yieldRate: pool.apy,
      poolId,
      isActive: true,
    };
    
    this.stakedAssets.set(stakeId, stake);
    
    // Update pool
    pool.totalStaked += amount;
    
    // Update user position
    const position = this.userPositions.get(userAddress);
    if (position) {
      position.stakes.push(stake);
      position.totalStaked += amount;
      position.lastActivity = new Date().toISOString();
    }
    
    this.emit('asset_staked', { userAddress, stakeId, stake });
    
    return stakeId;
  }

  async unstakeAsset(userAddress: string, stakeId: string): Promise<number> {
    const stake = this.stakedAssets.get(stakeId);
    if (!stake || stake.owner !== userAddress) {
      throw new Error('Invalid stake');
    }
    
    const pool = this.yieldPools.get(stake.poolId);
    if (!pool) {
      throw new Error('Pool not found');
    }
    
    // Calculate rewards
    const stakingDuration = Date.now() - new Date(stake.stakingTime).getTime();
    const annualRewards = stake.stakedAmount * (stake.yieldRate / 100);
    const rewards = (annualRewards * stakingDuration) / (365 * 24 * 60 * 60 * 1000);
    
    stake.isActive = false;
    stake.accumulatedRewards += rewards;
    
    // Update pool
    pool.totalStaked -= stake.stakedAmount;
    pool.totalRewards += rewards;
    
    // Update user position
    const position = this.userPositions.get(userAddress);
    if (position) {
      position.totalStaked -= stake.stakedAmount;
      position.totalRewards += rewards;
      position.lastActivity = new Date().toISOString();
    }
    
    this.emit('asset_unstaked', { userAddress, stakeId, rewards });
    
    return rewards;
  }

  async claimRewards(userAddress: string, stakeId: string): Promise<number> {
    const stake = this.stakedAssets.get(stakeId);
    if (!stake || stake.owner !== userAddress) {
      throw new Error('Invalid stake');
    }
    
    // Calculate pending rewards
    const lastClaim = new Date(stake.lastRewardClaim).getTime();
    const now = Date.now();
    const timeDiff = now - lastClaim;
    const annualRewards = stake.stakedAmount * (stake.yieldRate / 100);
    const pendingRewards = (annualRewards * timeDiff) / (365 * 24 * 60 * 60 * 1000);
    
    stake.accumulatedRewards += pendingRewards;
    stake.lastRewardClaim = new Date().toISOString();
    
    // Update user position
    const position = this.userPositions.get(userAddress);
    if (position) {
      position.totalRewards += pendingRewards;
      position.lastActivity = new Date().toISOString();
    }
    
    this.emit('rewards_claimed', { userAddress, stakeId, rewards: pendingRewards });
    
    return pendingRewards;
  }

  async getDeFiMetrics(): Promise<DeFiMetrics> {
    const totalValueLocked = Array.from(this.lendingPools.values())
      .reduce((sum, pool) => sum + pool.tvl, 0) +
      Array.from(this.yieldPools.values())
      .reduce((sum, pool) => sum + pool.totalStaked, 0);
    
    const totalSupplied = Array.from(this.lendingPools.values())
      .reduce((sum, pool) => sum + pool.totalSupply, 0);
    
    const totalBorrowed = Array.from(this.lendingPools.values())
      .reduce((sum, pool) => sum + pool.totalBorrow, 0);
    
    const totalStaked = Array.from(this.yieldPools.values())
      .reduce((sum, pool) => sum + pool.totalStaked, 0);
    
    const totalRewardsDistributed = Array.from(this.yieldPools.values())
      .reduce((sum, pool) => sum + pool.totalRewards, 0);
    
    const averageAPY = Array.from(this.yieldPools.values())
      .reduce((sum, pool) => sum + pool.apy, 0) / this.yieldPools.size;
    
    return {
      totalValueLocked,
      totalSupplied,
      totalBorrowed,
      totalStaked,
      totalRewardsDistributed,
      averageAPY,
      activeUsers: this.userPositions.size,
      protocolCount: this.lendingProtocols.size,
    };
  }

  async getCollateralHealth(collateralId: string): Promise<{
    healthFactor: number;
    liquidationRisk: 'low' | 'medium' | 'high';
    recommendedActions: string[];
  }> {
    const collateral = this.collateralAssets.get(collateralId);
    if (!collateral) {
      throw new Error('Collateral not found');
    }
    
    const healthFactor = collateral.healthFactor;
    let liquidationRisk: 'low' | 'medium' | 'high' = 'low';
    const recommendedActions: string[] = [];
    
    if (healthFactor < 1.2) {
      liquidationRisk = 'high';
      recommendedActions.push('Repay loan immediately to avoid liquidation');
      recommendedActions.push('Add more collateral to improve health factor');
    } else if (healthFactor < 1.5) {
      liquidationRisk = 'medium';
      recommendedActions.push('Consider repaying part of the loan');
      recommendedActions.push('Monitor collateral value closely');
    } else {
      liquidationRisk = 'low';
      recommendedActions.push('Position is healthy');
    }
    
    return { healthFactor, liquidationRisk, recommendedActions };
  }
}

export const defiYieldService = new DeFiYieldService();
export default defiYieldService;
