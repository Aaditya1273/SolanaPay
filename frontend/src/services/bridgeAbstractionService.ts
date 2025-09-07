import { Connection, PublicKey } from '@solana/web3.js'
import wormholeBridgeService, { BridgeTransferRequest as WormholeBridgeRequest } from './wormholeBridgeService'
import layerZeroBridgeService, { LayerZeroTransferRequest } from './layerZeroBridgeService'
import assetConverterService, { ConversionRequest } from './assetConverterService'

export interface UnifiedBridgeRequest {
  sourceChain: 'ethereum' | 'polygon' | 'arbitrum' | 'optimism' | 'bsc' | 'avalanche'
  targetChain: 'solana'
  token: string
  amount: string
  recipientAddress: string
  senderAddress: string
  preferredProvider?: 'wormhole' | 'layerzero' | 'auto'
  autoConvert?: boolean // Whether to auto-convert wrapped tokens to native
  slippage?: number
}

export interface BridgeRoute {
  provider: 'wormhole' | 'layerzero'
  estimatedTime: number // seconds
  estimatedFee: string // in ETH/native token
  estimatedFeeUSD: string
  reliability: number // 0-100 score
  supported: boolean
}

export interface UnifiedBridgeResult {
  provider: 'wormhole' | 'layerzero'
  sourceTransactionHash: string
  targetTransactionHash?: string
  conversionTransactionHash?: string
  status: 'pending' | 'bridging' | 'converting' | 'completed' | 'failed'
  estimatedCompletion: number
  steps: Array<{
    name: string
    status: 'pending' | 'active' | 'completed' | 'failed'
    transactionHash?: string
    estimatedTime?: number
  }>
}

class BridgeAbstractionService {
  private connection: Connection

  constructor() {
    this.connection = new Connection(
      import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    )
  }

  /**
   * Get optimal bridge route based on cost, time, and reliability
   */
  async getOptimalRoute(request: UnifiedBridgeRequest): Promise<BridgeRoute[]> {
    const routes: BridgeRoute[] = []

    try {
      // Check Wormhole route
      if (this.isWormholeSupported(request.sourceChain, request.token)) {
        const wormholeFees = await wormholeBridgeService.estimateBridgeFees(
          request.sourceChain as 'ethereum' | 'polygon',
          this.getTokenAddress(request.sourceChain, request.token),
          request.amount
        )

        routes.push({
          provider: 'wormhole',
          estimatedTime: 600, // 10 minutes
          estimatedFee: wormholeFees.total,
          estimatedFeeUSD: (parseFloat(wormholeFees.total) * 2000).toFixed(2), // Rough ETH price
          reliability: 95,
          supported: true
        })
      }

      // Check LayerZero route
      if (this.isLayerZeroSupported(request.sourceChain, request.token)) {
        const layerZeroFees = await layerZeroBridgeService.estimateTransferFee(
          request.sourceChain as any,
          request.token as any,
          request.amount,
          request.recipientAddress
        )

        routes.push({
          provider: 'layerzero',
          estimatedTime: 300, // 5 minutes
          estimatedFee: layerZeroFees.nativeFee,
          estimatedFeeUSD: layerZeroFees.totalFeeUSD,
          reliability: 90,
          supported: true
        })
      }

      // Sort by best overall score (considering time, cost, reliability)
      routes.sort((a, b) => {
        const scoreA = this.calculateRouteScore(a)
        const scoreB = this.calculateRouteScore(b)
        return scoreB - scoreA
      })

      return routes
    } catch (error) {
      console.error('Failed to get optimal routes:', error)
      return []
    }
  }

  /**
   * Execute unified bridge transfer with automatic provider selection
   */
  async executeBridge(
    request: UnifiedBridgeRequest,
    wallet: any
  ): Promise<UnifiedBridgeResult> {
    try {
      // Get optimal route if provider not specified
      let provider = request.preferredProvider
      if (!provider || provider === 'auto') {
        const routes = await this.getOptimalRoute(request)
        if (routes.length === 0) {
          throw new Error('No supported bridge routes found')
        }
        provider = routes[0].provider
      }

      // Initialize result
      const result: UnifiedBridgeResult = {
        provider,
        sourceTransactionHash: '',
        status: 'pending',
        estimatedCompletion: Date.now() + (provider === 'wormhole' ? 600000 : 300000),
        steps: [
          { name: 'Approve Tokens', status: 'pending', estimatedTime: 30 },
          { name: 'Bridge Transfer', status: 'pending', estimatedTime: provider === 'wormhole' ? 600 : 300 },
          ...(request.autoConvert ? [{ name: 'Auto-Convert', status: 'pending', estimatedTime: 10 }] : []),
          { name: 'Complete', status: 'pending' }
        ]
      }

      // Step 1: Token Approval (simulated)
      result.steps[0].status = 'active'
      await this.simulateDelay(2000)
      result.steps[0].status = 'completed'

      // Step 2: Execute bridge transfer
      result.steps[1].status = 'active'
      result.status = 'bridging'

      if (provider === 'wormhole') {
        const wormholeRequest: WormholeBridgeRequest = {
          sourceChain: request.sourceChain as 'ethereum' | 'polygon',
          targetChain: 'solana',
          tokenAddress: this.getTokenAddress(request.sourceChain, request.token),
          amount: request.amount,
          recipientAddress: request.recipientAddress,
          senderAddress: request.senderAddress
        }

        const bridgeResult = await wormholeBridgeService.completeBridgeTransfer(
          wormholeRequest,
          wallet
        )

        result.sourceTransactionHash = bridgeResult.sourceTransactionHash
        result.targetTransactionHash = bridgeResult.targetTransactionHash
        result.steps[1].transactionHash = bridgeResult.sourceTransactionHash
      } else {
        const layerZeroRequest: LayerZeroTransferRequest = {
          sourceChain: request.sourceChain as any,
          targetChain: 'solana',
          tokenSymbol: request.token as any,
          amount: request.amount,
          recipientAddress: request.recipientAddress,
          senderAddress: request.senderAddress
        }

        const bridgeResult = await layerZeroBridgeService.initiateTransfer(
          layerZeroRequest,
          wallet
        )

        result.sourceTransactionHash = bridgeResult.transactionHash
        result.steps[1].transactionHash = bridgeResult.transactionHash
      }

      result.steps[1].status = 'completed'

      // Step 3: Auto-convert if requested
      if (request.autoConvert) {
        const convertStepIndex = result.steps.findIndex(s => s.name === 'Auto-Convert')
        if (convertStepIndex !== -1) {
          result.steps[convertStepIndex].status = 'active'
          result.status = 'converting'

          const conversionRequest: ConversionRequest = {
            sourceToken: this.getWrappedTokenSymbol(request.token),
            amount: parseFloat(request.amount),
            slippage: request.slippage
          }

          const conversionResult = await assetConverterService.convertAsset(
            conversionRequest,
            wallet
          )

          result.conversionTransactionHash = conversionResult.signature
          result.steps[convertStepIndex].transactionHash = conversionResult.signature
          result.steps[convertStepIndex].status = 'completed'
        }
      }

      // Step 4: Complete
      const completeStepIndex = result.steps.findIndex(s => s.name === 'Complete')
      if (completeStepIndex !== -1) {
        result.steps[completeStepIndex].status = 'completed'
      }
      
      result.status = 'completed'
      return result

    } catch (error) {
      console.error('Bridge execution failed:', error)
      throw new Error(`Bridge execution failed: ${error.message}`)
    }
  }

  /**
   * Get bridge status for ongoing transfer
   */
  async getBridgeStatus(
    provider: 'wormhole' | 'layerzero',
    sourceChain: string,
    transactionHash: string
  ): Promise<'pending' | 'bridging' | 'converting' | 'completed' | 'failed'> {
    try {
      if (provider === 'wormhole') {
        const status = await wormholeBridgeService.getTransferStatus(
          sourceChain as 'ethereum' | 'polygon',
          transactionHash
        )
        return this.mapWormholeStatus(status)
      } else {
        const status = await layerZeroBridgeService.getTransferStatus(
          sourceChain as any,
          transactionHash,
          0 // nonce would be stored
        )
        return this.mapLayerZeroStatus(status)
      }
    } catch (error) {
      console.error('Failed to get bridge status:', error)
      return 'failed'
    }
  }

  /**
   * Get supported chains and tokens
   */
  getSupportedAssets() {
    const wormholeAssets = wormholeBridgeService.getSupportedTokens()
    const layerZeroAssets = layerZeroBridgeService.getSupportedAssets()

    return {
      chains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'bsc', 'avalanche'],
      tokens: {
        ethereum: ['WETH', 'USDT', 'USDC', 'WBTC', 'DAI'],
        polygon: ['WETH', 'USDT', 'USDC', 'WMATIC'],
        arbitrum: ['WETH', 'USDT', 'USDC'],
        optimism: ['WETH', 'USDT', 'USDC'],
        bsc: ['WBNB', 'USDT', 'USDC'],
        avalanche: ['WAVAX', 'USDT', 'USDC']
      },
      providers: {
        wormhole: {
          chains: ['ethereum', 'polygon'],
          tokens: ['WETH', 'USDT', 'USDC']
        },
        layerzero: {
          chains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'bsc', 'avalanche'],
          tokens: ['USDT', 'USDC']
        }
      }
    }
  }

  /**
   * Estimate total bridge cost including conversion
   */
  async estimateTotalCost(request: UnifiedBridgeRequest): Promise<{
    bridgeFee: string
    conversionFee: string
    totalFee: string
    totalFeeUSD: string
  }> {
    try {
      const routes = await this.getOptimalRoute(request)
      if (routes.length === 0) {
        throw new Error('No supported routes found')
      }

      const bestRoute = routes[0]
      let conversionFee = '0'
      let conversionFeeUSD = '0'

      if (request.autoConvert) {
        const conversionQuote = await assetConverterService.getConversionQuote({
          sourceToken: this.getWrappedTokenSymbol(request.token),
          amount: parseFloat(request.amount)
        })
        conversionFee = conversionQuote.feeAmount.toString()
        conversionFeeUSD = (conversionQuote.feeAmount * 1).toFixed(2) // Assuming 1:1 USD for stablecoins
      }

      const totalFeeUSD = (parseFloat(bestRoute.estimatedFeeUSD) + parseFloat(conversionFeeUSD)).toFixed(2)

      return {
        bridgeFee: bestRoute.estimatedFee,
        conversionFee,
        totalFee: (parseFloat(bestRoute.estimatedFee) + parseFloat(conversionFee)).toFixed(6),
        totalFeeUSD
      }
    } catch (error) {
      console.error('Failed to estimate total cost:', error)
      return {
        bridgeFee: '0.01',
        conversionFee: '0',
        totalFee: '0.01',
        totalFeeUSD: '20'
      }
    }
  }

  /**
   * Get bridge history for user
   */
  async getBridgeHistory(wallet: any): Promise<Array<{
    id: string
    sourceChain: string
    targetChain: string
    token: string
    amount: string
    provider: string
    status: string
    timestamp: number
    sourceTransactionHash: string
    targetTransactionHash?: string
  }>> {
    // In production, this would fetch from a database or indexer
    return [
      {
        id: '1',
        sourceChain: 'ethereum',
        targetChain: 'solana',
        token: 'WETH',
        amount: '0.5',
        provider: 'wormhole',
        status: 'completed',
        timestamp: Date.now() - 3600000,
        sourceTransactionHash: '0x123...',
        targetTransactionHash: '5J7...'
      }
    ]
  }

  // Private helper methods
  private calculateRouteScore(route: BridgeRoute): number {
    // Score based on reliability (40%), cost (30%), time (30%)
    const reliabilityScore = route.reliability
    const costScore = Math.max(0, 100 - parseFloat(route.estimatedFeeUSD))
    const timeScore = Math.max(0, 100 - (route.estimatedTime / 60)) // Lower time = higher score

    return (reliabilityScore * 0.4) + (costScore * 0.3) + (timeScore * 0.3)
  }

  private isWormholeSupported(chain: string, token: string): boolean {
    const supportedChains = ['ethereum', 'polygon']
    const supportedTokens = ['WETH', 'USDT', 'USDC']
    return supportedChains.includes(chain) && supportedTokens.includes(token)
  }

  private isLayerZeroSupported(chain: string, token: string): boolean {
    const supportedChains = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'bsc', 'avalanche']
    const supportedTokens = ['USDT', 'USDC']
    return supportedChains.includes(chain) && supportedTokens.includes(token)
  }

  private getTokenAddress(chain: string, token: string): string {
    const addresses: Record<string, Record<string, string>> = {
      ethereum: {
        WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        USDC: '0xA0b86a33E6441b8Db0c3d8c7F2C5f3b6C6e8d3E8'
      },
      polygon: {
        WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
        USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
      }
    }
    return addresses[chain]?.[token] || ''
  }

  private getWrappedTokenSymbol(token: string): any {
    const mapping: Record<string, string> = {
      'WETH': 'WETH',
      'USDT': 'USDT',
      'USDC': 'wUSDC'
    }
    return mapping[token] || token
  }

  private mapWormholeStatus(status: string): 'pending' | 'bridging' | 'converting' | 'completed' | 'failed' {
    switch (status) {
      case 'pending': return 'bridging'
      case 'attested': return 'bridging'
      case 'redeemed': return 'completed'
      case 'failed': return 'failed'
      default: return 'pending'
    }
  }

  private mapLayerZeroStatus(status: string): 'pending' | 'bridging' | 'converting' | 'completed' | 'failed' {
    switch (status) {
      case 'pending': return 'bridging'
      case 'delivered': return 'completed'
      case 'failed': return 'failed'
      default: return 'pending'
    }
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export const bridgeAbstractionService = new BridgeAbstractionService()
export default bridgeAbstractionService
