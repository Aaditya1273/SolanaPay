import { EventEmitter } from 'events';
import { ChainProvider } from '../core/types';
import { 
  Asset, 
  DeFiPosition, 
  Transaction, 
  ChainId,
  SDKError,
  StakingPool,
  YieldStrategy
} from '../core/types';

/**
 * DeFi Manager - Handles RWA DeFi operations including staking, lending, and yield farming
 */
export class DeFiManager extends EventEmitter {
  private providers: Map<ChainId, ChainProvider>;
  private positions: Map<string, DeFiPosition> = new Map();
  private stakingPools: Map<string, StakingPool> = new Map();

  constructor(providers: Map<ChainId, ChainProvider>) {
    super();
    this.providers = providers;
    this.initializeStakingPools();
  }

  /**
   * Stake RWA assets for yield generation
   */
  async stakeAsset(
    asset: Asset,
    poolId: string,
    amount: string,
    lockupPeriod?: number
  ): Promise<DeFiPosition> {
    const provider = this.providers.get(asset.chainId);
    if (!provider) {
      throw new SDKError(`Provider not found for chain: ${asset.chainId}`, 'CHAIN_ERROR');
    }

    const pool = this.stakingPools.get(poolId);
    if (!pool) {
      throw new SDKError(`Staking pool not found: ${poolId}`, 'DEFI_ERROR');
    }

    try {
      const positionId = `${asset.chainId}-stake-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create staking transaction
      const tx = await provider.sendTransaction({
        to: pool.contractAddress,
        data: this.encodeStakeData(asset.tokenId, amount, lockupPeriod),
      });

      const position: DeFiPosition = {
        id: positionId,
        assetId: asset.id,
        chainId: asset.chainId,
        protocol: pool.protocol,
        type: 'staking',
        amount,
        apy: pool.apy,
        startDate: new Date(),
        lockupPeriod,
        status: 'active',
        rewards: {
          earned: '0',
          pending: '0',
          claimed: '0',
        },
        transactionHash: tx.hash,
      };

      this.positions.set(positionId, position);
      this.emit('assetStaked', { position, transaction: tx });

      return position;
    } catch (error) {
      throw new SDKError(`Failed to stake asset: ${error}`, 'TRANSACTION_ERROR');
    }
  }

  /**
   * Unstake assets and claim rewards
   */
  async unstakeAsset(positionId: string): Promise<Transaction> {
    const position = this.positions.get(positionId);
    if (!position) {
      throw new SDKError(`Position not found: ${positionId}`, 'DEFI_ERROR');
    }

    if (position.status !== 'active') {
      throw new SDKError(`Cannot unstake position with status: ${position.status}`, 'DEFI_ERROR');
    }

    // Check lockup period
    if (position.lockupPeriod && position.startDate) {
      const lockupEnd = new Date(position.startDate.getTime() + position.lockupPeriod * 1000);
      if (new Date() < lockupEnd) {
        throw new SDKError('Assets are still in lockup period', 'DEFI_ERROR');
      }
    }

    const provider = this.providers.get(position.chainId);
    if (!provider) {
      throw new SDKError(`Provider not found for chain: ${position.chainId}`, 'CHAIN_ERROR');
    }

    try {
      // Create unstaking transaction
      const tx = await provider.sendTransaction({
        to: position.contractAddress || '',
        data: this.encodeUnstakeData(position.id),
      });

      // Update position status
      position.status = 'completed';
      position.endDate = new Date();
      this.positions.set(positionId, position);

      this.emit('assetUnstaked', { position, transaction: tx });
      return tx;
    } catch (error) {
      throw new SDKError(`Failed to unstake asset: ${error}`, 'TRANSACTION_ERROR');
    }
  }

  /**
   * Claim pending rewards
   */
  async claimRewards(positionId: string): Promise<Transaction> {
    const position = this.positions.get(positionId);
    if (!position) {
      throw new SDKError(`Position not found: ${positionId}`, 'DEFI_ERROR');
    }

    const provider = this.providers.get(position.chainId);
    if (!provider) {
      throw new SDKError(`Provider not found for chain: ${position.chainId}`, 'CHAIN_ERROR');
    }

    try {
      // Update pending rewards before claiming
      await this.updateRewards(positionId);

      const tx = await provider.sendTransaction({
        to: position.contractAddress || '',
        data: this.encodeClaimData(position.id),
      });

      // Update rewards after claiming
      const pendingAmount = parseFloat(position.rewards.pending);
      position.rewards.claimed = (parseFloat(position.rewards.claimed) + pendingAmount).toString();
      position.rewards.pending = '0';
      this.positions.set(positionId, position);

      this.emit('rewardsClaimed', { position, amount: pendingAmount.toString(), transaction: tx });
      return tx;
    } catch (error) {
      throw new SDKError(`Failed to claim rewards: ${error}`, 'TRANSACTION_ERROR');
    }
  }

  /**
   * Use RWA as collateral for lending
   */
  async depositCollateral(
    asset: Asset,
    protocol: string,
    amount: string
  ): Promise<DeFiPosition> {
    const provider = this.providers.get(asset.chainId);
    if (!provider) {
      throw new SDKError(`Provider not found for chain: ${asset.chainId}`, 'CHAIN_ERROR');
    }

    try {
      const positionId = `${asset.chainId}-collateral-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create collateral deposit transaction
      const tx = await provider.sendTransaction({
        to: this.getProtocolAddress(protocol, asset.chainId),
        data: this.encodeCollateralData(asset.tokenId, amount),
      });

      const position: DeFiPosition = {
        id: positionId,
        assetId: asset.id,
        chainId: asset.chainId,
        protocol,
        type: 'lending',
        amount,
        apy: '0', // Collateral doesn't earn yield directly
        startDate: new Date(),
        status: 'active',
        collateral: {
          deposited: amount,
          healthFactor: '2.5', // Mock health factor
          liquidationThreshold: '0.8',
        },
        transactionHash: tx.hash,
      };

      this.positions.set(positionId, position);
      this.emit('collateralDeposited', { position, transaction: tx });

      return position;
    } catch (error) {
      throw new SDKError(`Failed to deposit collateral: ${error}`, 'TRANSACTION_ERROR');
    }
  }

  /**
   * Borrow against RWA collateral
   */
  async borrowAgainstCollateral(
    positionId: string,
    borrowAmount: string,
    borrowToken: string
  ): Promise<Transaction> {
    const position = this.positions.get(positionId);
    if (!position || position.type !== 'lending') {
      throw new SDKError(`Lending position not found: ${positionId}`, 'DEFI_ERROR');
    }

    const provider = this.providers.get(position.chainId);
    if (!provider) {
      throw new SDKError(`Provider not found for chain: ${position.chainId}`, 'CHAIN_ERROR');
    }

    try {
      const tx = await provider.sendTransaction({
        to: position.contractAddress || '',
        data: this.encodeBorrowData(position.id, borrowAmount, borrowToken),
      });

      // Update position with borrow details
      if (!position.borrowed) {
        position.borrowed = [];
      }
      position.borrowed.push({
        amount: borrowAmount,
        token: borrowToken,
        timestamp: new Date(),
      });

      this.positions.set(positionId, position);
      this.emit('borrowExecuted', { position, borrowAmount, borrowToken, transaction: tx });

      return tx;
    } catch (error) {
      throw new SDKError(`Failed to borrow: ${error}`, 'TRANSACTION_ERROR');
    }
  }

  /**
   * Get all DeFi positions for a user
   */
  async getPositions(userAddress?: string): Promise<DeFiPosition[]> {
    let positions = Array.from(this.positions.values());

    if (userAddress) {
      // Filter by user address (would need asset ownership lookup in real implementation)
      positions = positions.filter(position => position.owner === userAddress);
    }

    return positions.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  }

  /**
   * Get available staking pools
   */
  async getStakingPools(): Promise<StakingPool[]> {
    return Array.from(this.stakingPools.values());
  }

  /**
   * Get yield farming strategies
   */
  async getYieldStrategies(): Promise<YieldStrategy[]> {
    return [
      {
        id: 'rwa-stable-yield',
        name: 'RWA Stable Yield',
        description: 'Conservative yield strategy for RWA assets',
        apy: '8.5',
        risk: 'low',
        protocols: ['Aave', 'Compound'],
        supportedAssets: ['real-estate', 'bonds'],
      },
      {
        id: 'rwa-growth-yield',
        name: 'RWA Growth Yield',
        description: 'Higher yield strategy with moderate risk',
        apy: '15.2',
        risk: 'medium',
        protocols: ['Aave', 'Compound', 'Yearn'],
        supportedAssets: ['renewable-energy', 'carbon-credits'],
      },
      {
        id: 'rwa-aggressive-yield',
        name: 'RWA Aggressive Yield',
        description: 'Maximum yield with higher risk tolerance',
        apy: '25.8',
        risk: 'high',
        protocols: ['Aave', 'Compound', 'Yearn', 'Convex'],
        supportedAssets: ['precious-metals', 'commodities'],
      },
    ];
  }

  /**
   * Calculate potential yield for an asset
   */
  async calculateYield(
    asset: Asset,
    strategy: string,
    duration: number
  ): Promise<{
    principal: string;
    estimatedYield: string;
    totalReturn: string;
    apy: string;
  }> {
    const strategies = await this.getYieldStrategies();
    const selectedStrategy = strategies.find(s => s.id === strategy);
    
    if (!selectedStrategy) {
      throw new SDKError(`Strategy not found: ${strategy}`, 'DEFI_ERROR');
    }

    const principal = parseFloat(asset.value);
    const apy = parseFloat(selectedStrategy.apy) / 100;
    const years = duration / (365 * 24 * 3600); // Convert seconds to years
    
    const estimatedYield = principal * apy * years;
    const totalReturn = principal + estimatedYield;

    return {
      principal: principal.toString(),
      estimatedYield: estimatedYield.toString(),
      totalReturn: totalReturn.toString(),
      apy: selectedStrategy.apy,
    };
  }

  /**
   * Update rewards for a position
   */
  async updateRewards(positionId: string): Promise<void> {
    const position = this.positions.get(positionId);
    if (!position || position.type !== 'staking') return;

    // Calculate rewards based on time elapsed and APY
    const now = new Date();
    const timeElapsed = now.getTime() - position.startDate.getTime();
    const years = timeElapsed / (365 * 24 * 3600 * 1000);
    
    const principal = parseFloat(position.amount);
    const apy = parseFloat(position.apy) / 100;
    const totalEarned = principal * apy * years;
    const alreadyClaimed = parseFloat(position.rewards.claimed);
    const pending = Math.max(0, totalEarned - alreadyClaimed);

    position.rewards.earned = totalEarned.toString();
    position.rewards.pending = pending.toString();
    
    this.positions.set(positionId, position);
  }

  /**
   * Get DeFi analytics
   */
  async getDeFiAnalytics(): Promise<{
    totalValueLocked: string;
    totalRewardsEarned: string;
    activePositions: number;
    averageAPY: string;
    topProtocols: Array<{ protocol: string; tvl: string }>;
  }> {
    const positions = Array.from(this.positions.values());
    const activePositions = positions.filter(p => p.status === 'active');

    const totalValueLocked = activePositions.reduce((sum, pos) => sum + parseFloat(pos.amount), 0);
    const totalRewardsEarned = positions.reduce((sum, pos) => sum + parseFloat(pos.rewards?.earned || '0'), 0);
    
    const apys = activePositions.map(p => parseFloat(p.apy)).filter(apy => apy > 0);
    const averageAPY = apys.length > 0 ? apys.reduce((sum, apy) => sum + apy, 0) / apys.length : 0;

    // Calculate protocol TVL
    const protocolTVL = new Map<string, number>();
    activePositions.forEach(pos => {
      const current = protocolTVL.get(pos.protocol) || 0;
      protocolTVL.set(pos.protocol, current + parseFloat(pos.amount));
    });

    const topProtocols = Array.from(protocolTVL.entries())
      .map(([protocol, tvl]) => ({ protocol, tvl: tvl.toString() }))
      .sort((a, b) => parseFloat(b.tvl) - parseFloat(a.tvl))
      .slice(0, 5);

    return {
      totalValueLocked: totalValueLocked.toString(),
      totalRewardsEarned: totalRewardsEarned.toString(),
      activePositions: activePositions.length,
      averageAPY: averageAPY.toString(),
      topProtocols,
    };
  }

  /**
   * Private helper methods
   */
  private initializeStakingPools(): void {
    const pools: StakingPool[] = [
      {
        id: 'rwa-real-estate-pool',
        name: 'RWA Real Estate Pool',
        protocol: 'OmniFlow',
        apy: '12.5',
        tvl: '50000000',
        supportedAssets: ['real-estate'],
        lockupPeriod: 2592000, // 30 days
        contractAddress: '0x1111111111111111111111111111111111111111',
      },
      {
        id: 'rwa-energy-pool',
        name: 'RWA Renewable Energy Pool',
        protocol: 'OmniFlow',
        apy: '15.8',
        tvl: '25000000',
        supportedAssets: ['renewable-energy'],
        lockupPeriod: 7776000, // 90 days
        contractAddress: '0x2222222222222222222222222222222222222222',
      },
      {
        id: 'rwa-carbon-pool',
        name: 'RWA Carbon Credits Pool',
        protocol: 'OmniFlow',
        apy: '18.2',
        tvl: '15000000',
        supportedAssets: ['carbon-credits'],
        lockupPeriod: 1296000, // 15 days
        contractAddress: '0x3333333333333333333333333333333333333333',
      },
    ];

    pools.forEach(pool => {
      this.stakingPools.set(pool.id, pool);
    });
  }

  private getProtocolAddress(protocol: string, chainId: ChainId): string {
    // Mock protocol addresses
    const addresses: Record<string, Record<ChainId, string>> = {
      'Aave': {
        'onechain': '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        'ethereum': '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9',
        'polygon': '0x8dFf5E27EA6b7AC08EbFdf9eB090F32ee9a30fcf',
        'bsc': '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      },
      'Compound': {
        'onechain': '0xcccccccccccccccccccccccccccccccccccccccc',
        'ethereum': '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B',
        'polygon': '0xdddddddddddddddddddddddddddddddddddddddd',
        'bsc': '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      },
    };

    return addresses[protocol]?.[chainId] || '0x0000000000000000000000000000000000000000';
  }

  private encodeStakeData(tokenId: number, amount: string, lockupPeriod?: number): string {
    return `0x${tokenId.toString(16).padStart(64, '0')}${parseInt(amount).toString(16).padStart(64, '0')}${(lockupPeriod || 0).toString(16).padStart(64, '0')}`;
  }

  private encodeUnstakeData(positionId: string): string {
    return `0x${positionId.slice(-32)}`;
  }

  private encodeClaimData(positionId: string): string {
    return `0x${positionId.slice(-32)}`;
  }

  private encodeCollateralData(tokenId: number, amount: string): string {
    return `0x${tokenId.toString(16).padStart(64, '0')}${parseInt(amount).toString(16).padStart(64, '0')}`;
  }

  private encodeBorrowData(positionId: string, amount: string, token: string): string {
    return `0x${positionId.slice(-32)}${parseInt(amount).toString(16).padStart(64, '0')}${token.slice(2).padStart(64, '0')}`;
  }
}
