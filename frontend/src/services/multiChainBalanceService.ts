import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { ethers } from 'ethers';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { snsService } from './snsService';

export interface TokenBalance {
  mint: string;
  symbol: string;
  name: string;
  balance: number;
  decimals: number;
  usdValue?: number;
  logoUri?: string;
}

export interface ChainBalance {
  chainId: number;
  chainName: string;
  nativeToken: {
    symbol: string;
    balance: number;
    usdValue?: number;
  };
  tokens: TokenBalance[];
  totalUsdValue: number;
}

export interface MultiChainPortfolio {
  totalUsdValue: number;
  solana: ChainBalance;
  ethereum: ChainBalance;
  polygon: ChainBalance;
  lastUpdated: number;
}

export interface TransactionRoute {
  id: string;
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  estimatedGas: number;
  estimatedTime: number; // seconds
  totalCost: number; // USD
  steps: RouteStep[];
  confidence: number; // 0-1
}

export interface RouteStep {
  type: 'bridge' | 'swap' | 'transfer';
  protocol: string;
  estimatedGas: number;
  estimatedTime: number;
  description: string;
}

class MultiChainBalanceService {
  private solanaConnection: Connection;
  private ethereumProvider: ethers.JsonRpcProvider;
  private polygonProvider: ethers.JsonRpcProvider;
  
  // Token lists for different chains
  private solanaTokens = new Map([
    ['So11111111111111111111111111111111111111112', { symbol: 'SOL', name: 'Solana', decimals: 9 }],
    ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', { symbol: 'USDC', name: 'USD Coin', decimals: 6 }],
    ['Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', { symbol: 'USDT', name: 'Tether', decimals: 6 }],
  ]);

  private ethereumTokens = new Map([
    ['0x0000000000000000000000000000000000000000', { symbol: 'ETH', name: 'Ethereum', decimals: 18 }],
    ['0xA0b86a33E6441b8435b662f98137B8C6A1b47013', { symbol: 'USDC', name: 'USD Coin', decimals: 6 }],
    ['0xdAC17F958D2ee523a2206206994597C13D831ec7', { symbol: 'USDT', name: 'Tether', decimals: 6 }],
  ]);

  constructor() {
    this.solanaConnection = new Connection(
      process.env.REACT_APP_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );
    
    this.ethereumProvider = new ethers.JsonRpcProvider(
      process.env.REACT_APP_ETHEREUM_RPC_URL || 'https://eth-mainnet.alchemyapi.io/v2/demo'
    );
    
    this.polygonProvider = new ethers.JsonRpcProvider(
      process.env.REACT_APP_POLYGON_RPC_URL || 'https://polygon-rpc.com'
    );
  }

  // Get comprehensive multi-chain portfolio
  async getMultiChainPortfolio(
    solanaWallet?: PublicKey,
    evmAddress?: string
  ): Promise<MultiChainPortfolio> {
    const [solanaBalance, ethereumBalance, polygonBalance] = await Promise.all([
      solanaWallet ? this.getSolanaBalance(solanaWallet) : this.getEmptyChainBalance(900, 'Solana'),
      evmAddress ? this.getEthereumBalance(evmAddress) : this.getEmptyChainBalance(1, 'Ethereum'),
      evmAddress ? this.getPolygonBalance(evmAddress) : this.getEmptyChainBalance(137, 'Polygon'),
    ]);

    const totalUsdValue = solanaBalance.totalUsdValue + ethereumBalance.totalUsdValue + polygonBalance.totalUsdValue;

    return {
      totalUsdValue,
      solana: solanaBalance,
      ethereum: ethereumBalance,
      polygon: polygonBalance,
      lastUpdated: Date.now(),
    };
  }

  // Get Solana chain balances
  async getSolanaBalance(wallet: PublicKey): Promise<ChainBalance> {
    try {
      // Get SOL balance
      const solBalance = await this.solanaConnection.getBalance(wallet);
      const solAmount = solBalance / LAMPORTS_PER_SOL;
      
      // Get token accounts
      const tokenAccounts = await this.solanaConnection.getParsedTokenAccountsByOwner(
        wallet,
        { programId: TOKEN_PROGRAM_ID }
      );

      const tokens: TokenBalance[] = [];
      
      for (const account of tokenAccounts.value) {
        const tokenInfo = account.account.data.parsed.info;
        const mint = tokenInfo.mint;
        const balance = tokenInfo.tokenAmount.uiAmount || 0;
        
        if (balance > 0) {
          const tokenMeta = this.solanaTokens.get(mint) || {
            symbol: mint.slice(0, 8),
            name: 'Unknown Token',
            decimals: tokenInfo.tokenAmount.decimals,
          };

          tokens.push({
            mint,
            symbol: tokenMeta.symbol,
            name: tokenMeta.name,
            balance,
            decimals: tokenMeta.decimals,
            usdValue: await this.getTokenUsdValue(tokenMeta.symbol, balance),
          });
        }
      }

      const solUsdValue = await this.getTokenUsdValue('SOL', solAmount);
      const totalTokenValue = tokens.reduce((sum, token) => sum + (token.usdValue || 0), 0);

      return {
        chainId: 900, // Solana identifier
        chainName: 'Solana',
        nativeToken: {
          symbol: 'SOL',
          balance: solAmount,
          usdValue: solUsdValue,
        },
        tokens,
        totalUsdValue: solUsdValue + totalTokenValue,
      };
    } catch (error) {
      console.error('Error fetching Solana balance:', error);
      return this.getEmptyChainBalance(900, 'Solana');
    }
  }

  // Get Ethereum chain balances
  async getEthereumBalance(address: string): Promise<ChainBalance> {
    try {
      const ethBalance = await this.ethereumProvider.getBalance(address);
      const ethAmount = parseFloat(ethers.formatEther(ethBalance));
      
      // Get ERC-20 token balances (simplified - would use token list in production)
      const tokens: TokenBalance[] = [];
      
      // Example: Get USDC balance
      const usdcContract = new ethers.Contract(
        '0xA0b86a33E6441b8435b662f98137B8C6A1b47013',
        ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'],
        this.ethereumProvider
      );

      try {
        const usdcBalance = await usdcContract.balanceOf(address);
        const usdcDecimals = await usdcContract.decimals();
        const usdcAmount = parseFloat(ethers.formatUnits(usdcBalance, usdcDecimals));
        
        if (usdcAmount > 0) {
          tokens.push({
            mint: '0xA0b86a33E6441b8435b662f98137B8C6A1b47013',
            symbol: 'USDC',
            name: 'USD Coin',
            balance: usdcAmount,
            decimals: usdcDecimals,
            usdValue: usdcAmount, // USDC ≈ $1
          });
        }
      } catch (error) {
        console.error('Error fetching USDC balance:', error);
      }

      const ethUsdValue = await this.getTokenUsdValue('ETH', ethAmount);
      const totalTokenValue = tokens.reduce((sum, token) => sum + (token.usdValue || 0), 0);

      return {
        chainId: 1,
        chainName: 'Ethereum',
        nativeToken: {
          symbol: 'ETH',
          balance: ethAmount,
          usdValue: ethUsdValue,
        },
        tokens,
        totalUsdValue: ethUsdValue + totalTokenValue,
      };
    } catch (error) {
      console.error('Error fetching Ethereum balance:', error);
      return this.getEmptyChainBalance(1, 'Ethereum');
    }
  }

  // Get Polygon chain balances
  async getPolygonBalance(address: string): Promise<ChainBalance> {
    try {
      const maticBalance = await this.polygonProvider.getBalance(address);
      const maticAmount = parseFloat(ethers.formatEther(maticBalance));
      
      const tokens: TokenBalance[] = [];
      const maticUsdValue = await this.getTokenUsdValue('MATIC', maticAmount);

      return {
        chainId: 137,
        chainName: 'Polygon',
        nativeToken: {
          symbol: 'MATIC',
          balance: maticAmount,
          usdValue: maticUsdValue,
        },
        tokens,
        totalUsdValue: maticUsdValue,
      };
    } catch (error) {
      console.error('Error fetching Polygon balance:', error);
      return this.getEmptyChainBalance(137, 'Polygon');
    }
  }

  // Get optimal transaction routes
  async getOptimalRoutes(
    fromChain: number,
    toChain: number,
    fromToken: string,
    toToken: string,
    amount: number
  ): Promise<TransactionRoute[]> {
    const routes: TransactionRoute[] = [];

    // Direct route (same chain)
    if (fromChain === toChain) {
      routes.push({
        id: 'direct',
        fromChain,
        toChain,
        fromToken,
        toToken,
        estimatedGas: this.estimateGasCost(fromChain, 'swap'),
        estimatedTime: 30,
        totalCost: this.estimateGasCost(fromChain, 'swap') * 0.001, // Mock USD cost
        steps: [{
          type: 'swap',
          protocol: 'Jupiter', // or Uniswap for EVM
          estimatedGas: this.estimateGasCost(fromChain, 'swap'),
          estimatedTime: 30,
          description: `Swap ${fromToken} to ${toToken}`,
        }],
        confidence: 0.95,
      });
    }

    // Cross-chain routes
    if (fromChain !== toChain) {
      // Wormhole route
      routes.push({
        id: 'wormhole',
        fromChain,
        toChain,
        fromToken,
        toToken,
        estimatedGas: this.estimateGasCost(fromChain, 'bridge') + this.estimateGasCost(toChain, 'swap'),
        estimatedTime: 900, // 15 minutes
        totalCost: (this.estimateGasCost(fromChain, 'bridge') + this.estimateGasCost(toChain, 'swap')) * 0.001,
        steps: [
          {
            type: 'bridge',
            protocol: 'Wormhole',
            estimatedGas: this.estimateGasCost(fromChain, 'bridge'),
            estimatedTime: 600,
            description: `Bridge ${fromToken} via Wormhole`,
          },
          {
            type: 'swap',
            protocol: 'Jupiter',
            estimatedGas: this.estimateGasCost(toChain, 'swap'),
            estimatedTime: 300,
            description: `Convert to ${toToken}`,
          },
        ],
        confidence: 0.85,
      });

      // LayerZero route (if available)
      if (this.isLayerZeroSupported(fromChain, toChain)) {
        routes.push({
          id: 'layerzero',
          fromChain,
          toChain,
          fromToken,
          toToken,
          estimatedGas: this.estimateGasCost(fromChain, 'bridge') * 0.7, // LayerZero is cheaper
          estimatedTime: 300, // 5 minutes
          totalCost: this.estimateGasCost(fromChain, 'bridge') * 0.7 * 0.001,
          steps: [{
            type: 'bridge',
            protocol: 'LayerZero',
            estimatedGas: this.estimateGasCost(fromChain, 'bridge') * 0.7,
            estimatedTime: 300,
            description: `Bridge ${fromToken} to ${toToken} via LayerZero`,
          }],
          confidence: 0.90,
        });
      }
    }

    // Sort by total cost (cheapest first)
    return routes.sort((a, b) => a.totalCost - b.totalCost);
  }

  // Get cheapest route for a transaction
  async getCheapestRoute(
    fromChain: number,
    toChain: number,
    fromToken: string,
    toToken: string,
    amount: number
  ): Promise<TransactionRoute | null> {
    const routes = await this.getOptimalRoutes(fromChain, toChain, fromToken, toToken, amount);
    return routes.length > 0 ? routes[0] : null;
  }

  // Real-time balance sync with Solana indexer
  async syncSolanaAssets(wallet: WalletContextState): Promise<void> {
    if (!wallet.publicKey) return;

    try {
      // Get SNS domain
      const snsDomain = await snsService.reverseLookup(wallet.publicKey) || 'user.sol';
      
      // This would call the asset-indexer Rust program
      // For now, simulating the sync
      const balance = await this.solanaConnection.getBalance(wallet.publicKey);
      
      // Emit sync event (would be handled by the Rust program)
      console.log('Syncing Solana assets:', {
        user: wallet.publicKey.toString(),
        snsDomain,
        solBalance: balance,
        timestamp: Date.now(),
      });

      // In production, this would trigger the asset-indexer program
      // to update on-chain records and emit events
    } catch (error) {
      console.error('Failed to sync Solana assets:', error);
    }
  }

  // Helper methods
  private getEmptyChainBalance(chainId: number, chainName: string): ChainBalance {
    return {
      chainId,
      chainName,
      nativeToken: { symbol: '', balance: 0, usdValue: 0 },
      tokens: [],
      totalUsdValue: 0,
    };
  }

  private async getTokenUsdValue(symbol: string, amount: number): Promise<number> {
    // Mock price data - in production, use CoinGecko, Jupiter, or other price APIs
    const mockPrices: Record<string, number> = {
      SOL: 100,
      ETH: 2000,
      MATIC: 0.8,
      USDC: 1,
      USDT: 1,
    };

    return (mockPrices[symbol] || 0) * amount;
  }

  private estimateGasCost(chainId: number, operation: 'swap' | 'bridge' | 'transfer'): number {
    // Mock gas estimates - in production, use real gas estimation APIs
    const gasEstimates: Record<number, Record<string, number>> = {
      1: { swap: 150000, bridge: 300000, transfer: 21000 }, // Ethereum
      137: { swap: 100000, bridge: 200000, transfer: 21000 }, // Polygon
      900: { swap: 5000, bridge: 10000, transfer: 5000 }, // Solana (compute units)
    };

    return gasEstimates[chainId]?.[operation] || 100000;
  }

  private isLayerZeroSupported(fromChain: number, toChain: number): boolean {
    const supportedChains = [1, 137, 56, 43114]; // ETH, Polygon, BSC, Avalanche
    return supportedChains.includes(fromChain) && supportedChains.includes(toChain);
  }

  // Portfolio analytics
  async getPortfolioAnalytics(portfolio: MultiChainPortfolio) {
    const chainDistribution = {
      solana: (portfolio.solana.totalUsdValue / portfolio.totalUsdValue) * 100,
      ethereum: (portfolio.ethereum.totalUsdValue / portfolio.totalUsdValue) * 100,
      polygon: (portfolio.polygon.totalUsdValue / portfolio.totalUsdValue) * 100,
    };

    const topTokens = [
      ...portfolio.solana.tokens,
      ...portfolio.ethereum.tokens,
      ...portfolio.polygon.tokens,
    ]
      .sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0))
      .slice(0, 5);

    return {
      chainDistribution,
      topTokens,
      totalValue: portfolio.totalUsdValue,
      lastUpdated: portfolio.lastUpdated,
    };
  }
}

export const multiChainBalanceService = new MultiChainBalanceService();
