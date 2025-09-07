import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js'
import { ethers } from 'ethers'
import { 
  getEmitterAddressEth,
  getEmitterAddressSolana,
  parseSequenceFromLogEth,
  parseSequenceFromLogSolana,
  getSignedVAAWithRetry,
  createWrappedOnSolana,
  createWrappedOnEth,
  attestFromEth,
  attestFromSolana,
  transferFromEth,
  transferFromSolana,
  redeemOnSolana,
  redeemOnEth,
  getForeignAssetSolana,
  getForeignAssetEth,
  hexToUint8Array,
  uint8ArrayToHex,
  tryNativeToHexString,
  CHAIN_ID_ETH,
  CHAIN_ID_POLYGON,
  CHAIN_ID_SOLANA,
  isEVMChain
} from '@certusone/wormhole-sdk'

// Wormhole contract addresses
const WORMHOLE_CONTRACTS = {
  ethereum: {
    core: '0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B',
    token_bridge: '0x3ee18B2214AFF97000D974cf647E7C347E8fa585'
  },
  polygon: {
    core: '0x7A4B5a56256163F07b2C80A7cA55aBE66c4ec4d7',
    token_bridge: '0x5a58505a96D1dbf8dF91cB21B54419FC36e93fdE'
  },
  solana: {
    core: 'worm2ZoG2kUd4vFXhvjh93UUH596ayRfgQ2MgjNMTth',
    token_bridge: 'wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb'
  }
}

// Token addresses
const TOKEN_ADDRESSES = {
  ethereum: {
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    USDC: '0xA0b86a33E6441b8Db0c3d8c7F2C5f3b6C6e8d3E8'
  },
  polygon: {
    WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
  },
  solana: {
    WSOL: 'So11111111111111111111111111111111111111112',
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
  }
}

export interface BridgeTransferRequest {
  sourceChain: 'ethereum' | 'polygon'
  targetChain: 'solana'
  tokenAddress: string
  amount: string
  recipientAddress: string
  senderAddress: string
}

export interface BridgeTransferResult {
  sourceTransactionHash: string
  sequence: string
  emitterAddress: string
  vaa?: Uint8Array
  targetTransactionHash?: string
  status: 'pending' | 'attested' | 'redeemed' | 'failed'
}

class WormholeBridgeService {
  private solanaConnection: Connection
  private ethereumProvider: ethers.providers.JsonRpcProvider
  private polygonProvider: ethers.providers.JsonRpcProvider
  private wormholeRpcHosts: string[]

  constructor() {
    this.solanaConnection = new Connection(
      import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    )
    
    this.ethereumProvider = new ethers.providers.JsonRpcProvider(
      import.meta.env.VITE_ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo'
    )
    
    this.polygonProvider = new ethers.providers.JsonRpcProvider(
      import.meta.env.VITE_POLYGON_RPC_URL || 'https://polygon-mainnet.g.alchemy.com/v2/demo'
    )
    
    this.wormholeRpcHosts = [
      'https://wormhole-v2-mainnet-api.certus.one',
      'https://wormhole.inotel.ro',
      'https://wormhole-v2-mainnet-api.mcf.rocks',
      'https://wormhole-v2-mainnet-api.chainlayer.network'
    ]
  }

  /**
   * Get supported tokens for bridging
   */
  getSupportedTokens() {
    return {
      ethereum: [
        { symbol: 'WETH', address: TOKEN_ADDRESSES.ethereum.WETH, decimals: 18 },
        { symbol: 'USDT', address: TOKEN_ADDRESSES.ethereum.USDT, decimals: 6 },
        { symbol: 'USDC', address: TOKEN_ADDRESSES.ethereum.USDC, decimals: 6 }
      ],
      polygon: [
        { symbol: 'WETH', address: TOKEN_ADDRESSES.polygon.WETH, decimals: 18 },
        { symbol: 'USDT', address: TOKEN_ADDRESSES.polygon.USDT, decimals: 6 },
        { symbol: 'USDC', address: TOKEN_ADDRESSES.polygon.USDC, decimals: 6 }
      ]
    }
  }

  /**
   * Initiate transfer from EVM chain to Solana
   */
  async initiateTransfer(request: BridgeTransferRequest): Promise<BridgeTransferResult> {
    try {
      const provider = request.sourceChain === 'ethereum' ? this.ethereumProvider : this.polygonProvider
      const chainId = request.sourceChain === 'ethereum' ? CHAIN_ID_ETH : CHAIN_ID_POLYGON
      
      // Create signer (user will need to connect wallet)
      const signer = provider.getSigner()
      
      // Get token bridge contract address
      const tokenBridgeAddress = WORMHOLE_CONTRACTS[request.sourceChain].token_bridge
      
      // Parse amount with proper decimals
      const amount = ethers.utils.parseUnits(request.amount, 18) // Adjust decimals as needed
      
      // Transfer tokens through Wormhole
      const receipt = await transferFromEth(
        tokenBridgeAddress,
        signer,
        request.tokenAddress,
        amount,
        CHAIN_ID_SOLANA,
        hexToUint8Array(tryNativeToHexString(request.recipientAddress, CHAIN_ID_SOLANA))
      )
      
      // Parse sequence from transaction receipt
      const sequence = parseSequenceFromLogEth(receipt, WORMHOLE_CONTRACTS[request.sourceChain].core)
      const emitterAddress = getEmitterAddressEth(tokenBridgeAddress)
      
      return {
        sourceTransactionHash: receipt.transactionHash,
        sequence: sequence.toString(),
        emitterAddress: uint8ArrayToHex(emitterAddress),
        status: 'pending'
      }
      
    } catch (error) {
      console.error('Bridge transfer failed:', error)
      throw new Error(`Bridge transfer failed: ${error.message}`)
    }
  }

  /**
   * Get VAA (Verifiable Action Approval) for completed transfer
   */
  async getVAA(
    sourceChain: 'ethereum' | 'polygon',
    sequence: string,
    emitterAddress: string
  ): Promise<Uint8Array> {
    try {
      const chainId = sourceChain === 'ethereum' ? CHAIN_ID_ETH : CHAIN_ID_POLYGON
      
      const { vaaBytes } = await getSignedVAAWithRetry(
        this.wormholeRpcHosts,
        chainId,
        emitterAddress,
        sequence
      )
      
      return vaaBytes
    } catch (error) {
      console.error('Failed to get VAA:', error)
      throw new Error(`Failed to get VAA: ${error.message}`)
    }
  }

  /**
   * Redeem tokens on Solana
   */
  async redeemOnSolana(
    vaa: Uint8Array,
    recipientWallet: any
  ): Promise<string> {
    try {
      const tokenBridgeAddress = new PublicKey(WORMHOLE_CONTRACTS.solana.token_bridge)
      
      const transaction = await redeemOnSolana(
        this.solanaConnection,
        tokenBridgeAddress,
        recipientWallet.publicKey,
        vaa
      )
      
      const signature = await recipientWallet.sendTransaction(transaction, this.solanaConnection)
      await this.solanaConnection.confirmTransaction(signature, 'confirmed')
      
      return signature
    } catch (error) {
      console.error('Redeem on Solana failed:', error)
      throw new Error(`Redeem on Solana failed: ${error.message}`)
    }
  }

  /**
   * Complete bridge transfer (initiate + wait for VAA + redeem)
   */
  async completeBridgeTransfer(
    request: BridgeTransferRequest,
    recipientWallet: any
  ): Promise<BridgeTransferResult> {
    try {
      // Step 1: Initiate transfer
      console.log('Initiating bridge transfer...')
      const transferResult = await this.initiateTransfer(request)
      
      // Step 2: Wait for VAA
      console.log('Waiting for VAA...')
      await this.waitForVAA(transferResult.sequence, transferResult.emitterAddress)
      
      const vaa = await this.getVAA(
        request.sourceChain,
        transferResult.sequence,
        transferResult.emitterAddress
      )
      
      // Step 3: Redeem on Solana
      console.log('Redeeming on Solana...')
      const redeemSignature = await this.redeemOnSolana(vaa, recipientWallet)
      
      return {
        ...transferResult,
        vaa,
        targetTransactionHash: redeemSignature,
        status: 'redeemed'
      }
      
    } catch (error) {
      console.error('Complete bridge transfer failed:', error)
      throw error
    }
  }

  /**
   * Wait for VAA to be available
   */
  private async waitForVAA(sequence: string, emitterAddress: string, maxRetries = 60): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.getVAA('ethereum', sequence, emitterAddress) // Try with ethereum first
        return
      } catch (error) {
        if (i === maxRetries - 1) {
          throw new Error('VAA not available after maximum retries')
        }
        await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
      }
    }
  }

  /**
   * Get foreign asset address on Solana
   */
  async getForeignAssetSolana(
    sourceChain: 'ethereum' | 'polygon',
    tokenAddress: string
  ): Promise<string | null> {
    try {
      const chainId = sourceChain === 'ethereum' ? CHAIN_ID_ETH : CHAIN_ID_POLYGON
      const tokenBridgeAddress = new PublicKey(WORMHOLE_CONTRACTS.solana.token_bridge)
      
      const foreignAsset = await getForeignAssetSolana(
        this.solanaConnection,
        tokenBridgeAddress,
        chainId,
        hexToUint8Array(tryNativeToHexString(tokenAddress, chainId))
      )
      
      return foreignAsset ? foreignAsset.toString() : null
    } catch (error) {
      console.error('Failed to get foreign asset:', error)
      return null
    }
  }

  /**
   * Attest token (create wrapped version)
   */
  async attestToken(
    sourceChain: 'ethereum' | 'polygon',
    tokenAddress: string,
    signer: ethers.Signer
  ): Promise<string> {
    try {
      const tokenBridgeAddress = WORMHOLE_CONTRACTS[sourceChain].token_bridge
      
      const receipt = await attestFromEth(
        tokenBridgeAddress,
        signer,
        tokenAddress
      )
      
      return receipt.transactionHash
    } catch (error) {
      console.error('Token attestation failed:', error)
      throw new Error(`Token attestation failed: ${error.message}`)
    }
  }

  /**
   * Create wrapped token on Solana
   */
  async createWrappedTokenSolana(
    vaa: Uint8Array,
    payerWallet: any
  ): Promise<string> {
    try {
      const tokenBridgeAddress = new PublicKey(WORMHOLE_CONTRACTS.solana.token_bridge)
      
      const transaction = await createWrappedOnSolana(
        this.solanaConnection,
        tokenBridgeAddress,
        payerWallet.publicKey,
        vaa
      )
      
      const signature = await payerWallet.sendTransaction(transaction, this.solanaConnection)
      await this.solanaConnection.confirmTransaction(signature, 'confirmed')
      
      return signature
    } catch (error) {
      console.error('Create wrapped token failed:', error)
      throw new Error(`Create wrapped token failed: ${error.message}`)
    }
  }

  /**
   * Get transfer status
   */
  async getTransferStatus(
    sourceChain: 'ethereum' | 'polygon',
    transactionHash: string
  ): Promise<'pending' | 'attested' | 'redeemed' | 'failed'> {
    try {
      const provider = sourceChain === 'ethereum' ? this.ethereumProvider : this.polygonProvider
      const receipt = await provider.getTransactionReceipt(transactionHash)
      
      if (!receipt) return 'pending'
      if (receipt.status === 0) return 'failed'
      
      // Check if VAA is available
      try {
        const sequence = parseSequenceFromLogEth(receipt, WORMHOLE_CONTRACTS[sourceChain].core)
        const emitterAddress = getEmitterAddressEth(WORMHOLE_CONTRACTS[sourceChain].token_bridge)
        
        await this.getVAA(sourceChain, sequence.toString(), uint8ArrayToHex(emitterAddress))
        return 'attested'
      } catch (error) {
        return 'pending'
      }
    } catch (error) {
      console.error('Failed to get transfer status:', error)
      return 'failed'
    }
  }

  /**
   * Estimate bridge fees
   */
  async estimateBridgeFees(
    sourceChain: 'ethereum' | 'polygon',
    tokenAddress: string,
    amount: string
  ): Promise<{ networkFee: string; bridgeFee: string; total: string }> {
    try {
      const provider = sourceChain === 'ethereum' ? this.ethereumProvider : this.polygonProvider
      const gasPrice = await provider.getGasPrice()
      
      // Estimate gas for bridge transaction (approximate)
      const estimatedGas = ethers.BigNumber.from('200000') // Typical bridge gas usage
      const networkFee = gasPrice.mul(estimatedGas)
      
      // Wormhole doesn't charge bridge fees for most tokens
      const bridgeFee = ethers.BigNumber.from('0')
      
      const total = networkFee.add(bridgeFee)
      
      return {
        networkFee: ethers.utils.formatEther(networkFee),
        bridgeFee: ethers.utils.formatEther(bridgeFee),
        total: ethers.utils.formatEther(total)
      }
    } catch (error) {
      console.error('Failed to estimate bridge fees:', error)
      return {
        networkFee: '0.01', // Fallback estimates
        bridgeFee: '0',
        total: '0.01'
      }
    }
  }
}

export const wormholeBridgeService = new WormholeBridgeService()
export default wormholeBridgeService
