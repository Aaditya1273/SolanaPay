import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js'
import { Program, AnchorProvider, web3, BN, IdlAccounts } from '@coral-xyz/anchor'
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { AssetConverter } from '../types/asset_converter'
import assetConverterIdl from '../idl/asset_converter.json'

// Asset conversion mappings
const ASSET_CONVERSIONS = {
  // Wrapped ETH to SOL
  'WETH': {
    targetToken: 'SOL',
    conversionRate: 1000000000, // 1:1 ratio (adjustable)
    minAmount: 0.001, // 0.001 WETH minimum
    maxAmount: 100,   // 100 WETH maximum
    description: 'Convert Wrapped Ethereum to Solana'
  },
  // Wrapped USDT to USDC
  'USDT': {
    targetToken: 'USDC',
    conversionRate: 1000000, // 1:1 ratio for stablecoins
    minAmount: 1,     // $1 minimum
    maxAmount: 100000, // $100k maximum
    description: 'Convert Tether USD to USD Coin'
  },
  // Wrapped USDC to native USDC
  'wUSDC': {
    targetToken: 'USDC',
    conversionRate: 1000000, // 1:1 ratio
    minAmount: 1,
    maxAmount: 100000,
    description: 'Convert Wrapped USDC to native USDC'
  }
}

// Token mint addresses (these would be the actual wrapped token addresses from bridges)
const TOKEN_MINTS = {
  // Wormhole wrapped tokens on Solana
  'WETH': '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs', // Wormhole WETH
  'USDT': 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // Wormhole USDT
  'wUSDC': 'A9mUU4qviSctJVPJdBJWkb28deg915LYJKrzQ19ji3FM', // Wormhole USDC
  
  // Native Solana tokens
  'SOL': 'So11111111111111111111111111111111111111112', // Wrapped SOL
  'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // Native USDC
}

export interface ConversionRequest {
  sourceToken: keyof typeof ASSET_CONVERSIONS
  amount: number
  slippage?: number // Slippage tolerance (default 1%)
}

export interface ConversionResult {
  signature: string
  sourceAmount: number
  targetAmount: number
  feeAmount: number
  conversionRate: number
  timestamp: number
}

export interface ConversionQuote {
  sourceToken: string
  targetToken: string
  sourceAmount: number
  targetAmount: number
  feeAmount: number
  conversionRate: number
  priceImpact: number
  estimatedGas: number
}

class AssetConverterService {
  private connection: Connection
  private program: Program<AssetConverter> | null = null
  private programId: PublicKey

  constructor() {
    this.connection = new Connection(
      import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    )
    this.programId = new PublicKey('AssetConv11111111111111111111111111111111')
  }

  /**
   * Initialize the program with wallet
   */
  async initializeProgram(wallet: any) {
    if (!wallet.publicKey) throw new Error('Wallet not connected')
    
    const provider = new AnchorProvider(
      this.connection,
      wallet,
      { commitment: 'confirmed' }
    )
    
    this.program = new Program(assetConverterIdl as AssetConverter, this.programId, provider)
  }

  /**
   * Get available conversion pairs
   */
  getAvailableConversions() {
    return Object.entries(ASSET_CONVERSIONS).map(([source, config]) => ({
      sourceToken: source,
      targetToken: config.targetToken,
      minAmount: config.minAmount,
      maxAmount: config.maxAmount,
      description: config.description
    }))
  }

  /**
   * Get conversion quote
   */
  async getConversionQuote(request: ConversionRequest): Promise<ConversionQuote> {
    const config = ASSET_CONVERSIONS[request.sourceToken]
    if (!config) throw new Error(`Unsupported conversion: ${request.sourceToken}`)

    // Validate amount
    if (request.amount < config.minAmount) {
      throw new Error(`Amount below minimum: ${config.minAmount}`)
    }
    if (request.amount > config.maxAmount) {
      throw new Error(`Amount above maximum: ${config.maxAmount}`)
    }

    // Calculate conversion
    const conversionRate = config.conversionRate / 1e9 // Normalize from lamports
    const targetAmount = request.amount * conversionRate
    
    // Calculate fees (0.25% conversion fee)
    const feeRate = 0.0025
    const feeAmount = targetAmount * feeRate
    const finalAmount = targetAmount - feeAmount

    // Estimate price impact (simplified)
    const priceImpact = request.amount > 10 ? 0.1 : 0.05 // Higher impact for larger amounts

    return {
      sourceToken: request.sourceToken,
      targetToken: config.targetToken,
      sourceAmount: request.amount,
      targetAmount: finalAmount,
      feeAmount,
      conversionRate,
      priceImpact,
      estimatedGas: 0.001 // Estimated SOL for gas
    }
  }

  /**
   * Execute asset conversion
   */
  async convertAsset(
    request: ConversionRequest,
    wallet: any
  ): Promise<ConversionResult> {
    if (!this.program) {
      await this.initializeProgram(wallet)
    }
    if (!this.program) throw new Error('Program not initialized')

    const config = ASSET_CONVERSIONS[request.sourceToken]
    if (!config) throw new Error(`Unsupported conversion: ${request.sourceToken}`)

    try {
      // Get token mints
      const sourceMint = new PublicKey(TOKEN_MINTS[request.sourceToken])
      const targetMint = new PublicKey(TOKEN_MINTS[config.targetToken as keyof typeof TOKEN_MINTS])

      // Get program accounts
      const [converterState] = PublicKey.findProgramAddressSync(
        [Buffer.from('converter_state')],
        this.programId
      )

      const [conversionPair] = PublicKey.findProgramAddressSync(
        [Buffer.from('conversion_pair'), sourceMint.toBuffer(), targetMint.toBuffer()],
        this.programId
      )

      // Get user token accounts
      const userSourceAccount = await getAssociatedTokenAddress(
        sourceMint,
        wallet.publicKey
      )

      const userTargetAccount = await getAssociatedTokenAddress(
        targetMint,
        wallet.publicKey
      )

      // Get program vaults
      const sourceVault = await getAssociatedTokenAddress(
        sourceMint,
        converterState,
        true
      )

      const targetVault = await getAssociatedTokenAddress(
        targetMint,
        converterState,
        true
      )

      // Get admin fee account (for fee collection)
      const adminFeeAccount = await getAssociatedTokenAddress(
        targetMint,
        new PublicKey('11111111111111111111111111111112'), // Admin pubkey
        true
      )

      // Convert amount to proper decimals
      const decimals = request.sourceToken === 'WETH' ? 18 : 6
      const amount = new BN(request.amount * Math.pow(10, decimals))

      // Execute conversion
      const tx = await this.program.methods
        .convertAsset(amount)
        .accounts({
          converterState,
          conversionPair,
          sourceMint,
          targetMint,
          userSourceAccount,
          userTargetAccount,
          sourceVault,
          targetVault,
          adminFeeAccount,
          user: wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      // Calculate result amounts
      const quote = await this.getConversionQuote(request)

      return {
        signature: tx,
        sourceAmount: request.amount,
        targetAmount: quote.targetAmount,
        feeAmount: quote.feeAmount,
        conversionRate: quote.conversionRate,
        timestamp: Date.now()
      }

    } catch (error) {
      console.error('Conversion failed:', error)
      throw new Error(`Conversion failed: ${error.message}`)
    }
  }

  /**
   * Batch convert multiple assets
   */
  async batchConvertAssets(
    requests: ConversionRequest[],
    wallet: any
  ): Promise<ConversionResult[]> {
    if (requests.length > 5) {
      throw new Error('Maximum 5 conversions per batch')
    }

    const results: ConversionResult[] = []

    for (const request of requests) {
      try {
        const result = await this.convertAsset(request, wallet)
        results.push(result)
      } catch (error) {
        console.error(`Batch conversion failed for ${request.sourceToken}:`, error)
        // Continue with other conversions
      }
    }

    return results
  }

  /**
   * Get conversion history for user
   */
  async getConversionHistory(wallet: any): Promise<ConversionResult[]> {
    if (!this.program) {
      await this.initializeProgram(wallet)
    }
    if (!this.program) throw new Error('Program not initialized')

    try {
      // Fetch conversion events for the user
      const events = await this.program.account.converterState.all()
      
      // Filter and format events (simplified)
      return events.map(event => ({
        signature: 'mock_signature',
        sourceAmount: 0,
        targetAmount: 0,
        feeAmount: 0,
        conversionRate: 1,
        timestamp: Date.now()
      }))
    } catch (error) {
      console.error('Failed to fetch conversion history:', error)
      return []
    }
  }

  /**
   * Get user's wrapped token balances
   */
  async getWrappedTokenBalances(wallet: any): Promise<Record<string, number>> {
    const balances: Record<string, number> = {}

    try {
      for (const [token, mintAddress] of Object.entries(TOKEN_MINTS)) {
        if (['WETH', 'USDT', 'wUSDC'].includes(token)) {
          const mint = new PublicKey(mintAddress)
          const tokenAccount = await getAssociatedTokenAddress(mint, wallet.publicKey)
          
          try {
            const accountInfo = await this.connection.getTokenAccountBalance(tokenAccount)
            const decimals = token === 'WETH' ? 18 : 6
            balances[token] = accountInfo.value.uiAmount || 0
          } catch (error) {
            balances[token] = 0 // Account doesn't exist
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch wrapped token balances:', error)
    }

    return balances
  }

  /**
   * Check if conversion pair exists and is active
   */
  async isConversionPairActive(sourceToken: string, targetToken: string): Promise<boolean> {
    if (!this.program) return false

    try {
      const sourceMint = new PublicKey(TOKEN_MINTS[sourceToken as keyof typeof TOKEN_MINTS])
      const targetMint = new PublicKey(TOKEN_MINTS[targetToken as keyof typeof TOKEN_MINTS])

      const [conversionPair] = PublicKey.findProgramAddressSync(
        [Buffer.from('conversion_pair'), sourceMint.toBuffer(), targetMint.toBuffer()],
        this.programId
      )

      const pairAccount = await this.program.account.conversionPair.fetch(conversionPair)
      return pairAccount.isActive
    } catch (error) {
      return false
    }
  }

  /**
   * Estimate conversion time
   */
  estimateConversionTime(sourceToken: string): number {
    // Instant conversion for wrapped assets already on Solana
    if (['WETH', 'USDT', 'wUSDC'].includes(sourceToken)) {
      return 5 // 5 seconds
    }
    
    // Longer for assets that need bridging first
    return 300 // 5 minutes
  }

  /**
   * Get conversion statistics
   */
  async getConversionStats(): Promise<{
    totalConversions: number
    totalVolume: number
    popularPairs: Array<{ source: string; target: string; count: number }>
  }> {
    // In production, this would fetch from on-chain data or analytics service
    return {
      totalConversions: 1250,
      totalVolume: 2500000, // USD
      popularPairs: [
        { source: 'WETH', target: 'SOL', count: 450 },
        { source: 'USDT', target: 'USDC', count: 380 },
        { source: 'wUSDC', target: 'USDC', count: 420 }
      ]
    }
  }

  /**
   * Simulate conversion without executing
   */
  async simulateConversion(request: ConversionRequest): Promise<{
    success: boolean
    quote: ConversionQuote | null
    error?: string
  }> {
    try {
      const quote = await this.getConversionQuote(request)
      return { success: true, quote }
    } catch (error) {
      return { 
        success: false, 
        quote: null, 
        error: error.message 
      }
    }
  }
}

export const assetConverterService = new AssetConverterService()
export default assetConverterService
