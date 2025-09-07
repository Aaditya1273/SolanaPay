import { Connection, PublicKey, Transaction } from '@solana/web3.js'
import { ethers } from 'ethers'

// LayerZero chain IDs
const LAYERZERO_CHAIN_IDS = {
  ethereum: 101,
  polygon: 109,
  arbitrum: 110,
  optimism: 111,
  bsc: 102,
  avalanche: 106
}

// LayerZero endpoint addresses
const LAYERZERO_ENDPOINTS = {
  ethereum: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675',
  polygon: '0x3c2269811836af69497E5F486A85D7316753cf62',
  arbitrum: '0x3c2269811836af69497E5F486A85D7316753cf62',
  optimism: '0x3c2269811836af69497E5F486A85D7316753cf62',
  bsc: '0x3c2269811836af69497E5F486A85D7316753cf62',
  avalanche: '0x3c2269811836af69497E5F486A85D7316753cf62'
}

// OFT (Omnichain Fungible Token) contract addresses
const OFT_CONTRACTS = {
  ethereum: {
    USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // Example OFT USDC
    USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'  // Example OFT USDT
  },
  polygon: {
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
  }
}

export interface LayerZeroTransferRequest {
  sourceChain: keyof typeof LAYERZERO_CHAIN_IDS
  targetChain: 'solana' // For now, we focus on bridging to Solana
  tokenSymbol: 'USDC' | 'USDT'
  amount: string
  recipientAddress: string
  senderAddress: string
}

export interface LayerZeroTransferResult {
  transactionHash: string
  nonce: number
  status: 'pending' | 'delivered' | 'failed'
  estimatedDeliveryTime: number // in seconds
}

class LayerZeroBridgeService {
  private providers: Map<string, ethers.providers.JsonRpcProvider>
  private solanaConnection: Connection

  constructor() {
    this.providers = new Map()
    this.setupProviders()
    
    this.solanaConnection = new Connection(
      import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    )
  }

  private setupProviders() {
    const rpcUrls = {
      ethereum: import.meta.env.VITE_ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
      polygon: import.meta.env.VITE_POLYGON_RPC_URL || 'https://polygon-mainnet.g.alchemy.com/v2/demo',
      arbitrum: import.meta.env.VITE_ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
      optimism: import.meta.env.VITE_OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
      bsc: import.meta.env.VITE_BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
      avalanche: import.meta.env.VITE_AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc'
    }

    Object.entries(rpcUrls).forEach(([chain, url]) => {
      this.providers.set(chain, new ethers.providers.JsonRpcProvider(url))
    })
  }

  /**
   * Get supported chains and tokens
   */
  getSupportedAssets() {
    return {
      chains: Object.keys(LAYERZERO_CHAIN_IDS),
      tokens: ['USDC', 'USDT'],
      destinations: ['solana']
    }
  }

  /**
   * Estimate cross-chain transfer fees
   */
  async estimateTransferFee(
    sourceChain: keyof typeof LAYERZERO_CHAIN_IDS,
    tokenSymbol: 'USDC' | 'USDT',
    amount: string,
    recipientAddress: string
  ): Promise<{
    nativeFee: string
    zroFee: string
    totalFeeUSD: string
  }> {
    try {
      const provider = this.providers.get(sourceChain)
      if (!provider) throw new Error(`Provider not found for ${sourceChain}`)

      // Get OFT contract
      const oftAddress = OFT_CONTRACTS[sourceChain]?.[tokenSymbol]
      if (!oftAddress) throw new Error(`OFT contract not found for ${tokenSymbol} on ${sourceChain}`)

      // OFT contract ABI (simplified)
      const oftAbi = [
        'function estimateSendFee(uint16 _dstChainId, bytes calldata _toAddress, uint _amount, bool _useZro, bytes calldata _adapterParams) external view returns (uint nativeFee, uint zroFee)'
      ]

      const oftContract = new ethers.Contract(oftAddress, oftAbi, provider)
      
      // Prepare parameters
      const dstChainId = 10001 // Solana chain ID in LayerZero (hypothetical)
      const toAddress = ethers.utils.defaultAbiCoder.encode(['address'], [recipientAddress])
      const amountBN = ethers.utils.parseUnits(amount, tokenSymbol === 'USDC' ? 6 : 6)
      const useZro = false
      const adapterParams = '0x' // Default adapter params

      // Estimate fees
      const [nativeFee, zroFee] = await oftContract.estimateSendFee(
        dstChainId,
        toAddress,
        amountBN,
        useZro,
        adapterParams
      )

      // Convert to readable format
      const nativeFeeEth = ethers.utils.formatEther(nativeFee)
      const zroFeeEth = ethers.utils.formatEther(zroFee)
      
      // Estimate USD value (simplified - in production, use price oracle)
      const ethPriceUSD = 2000 // Approximate ETH price
      const totalFeeUSD = (parseFloat(nativeFeeEth) * ethPriceUSD).toFixed(2)

      return {
        nativeFee: nativeFeeEth,
        zroFee: zroFeeEth,
        totalFeeUSD
      }
    } catch (error) {
      console.error('Fee estimation failed:', error)
      return {
        nativeFee: '0.01',
        zroFee: '0',
        totalFeeUSD: '20'
      }
    }
  }

  /**
   * Initiate LayerZero cross-chain transfer
   */
  async initiateTransfer(
    request: LayerZeroTransferRequest,
    signer: ethers.Signer
  ): Promise<LayerZeroTransferResult> {
    try {
      const { sourceChain, tokenSymbol, amount, recipientAddress } = request
      
      // Get OFT contract
      const oftAddress = OFT_CONTRACTS[sourceChain]?.[tokenSymbol]
      if (!oftAddress) throw new Error(`OFT contract not found for ${tokenSymbol} on ${sourceChain}`)

      // OFT contract ABI
      const oftAbi = [
        'function sendFrom(address _from, uint16 _dstChainId, bytes calldata _toAddress, uint _amount, address payable _refundAddress, address _zroPaymentAddress, bytes calldata _adapterParams) external payable',
        'function estimateSendFee(uint16 _dstChainId, bytes calldata _toAddress, uint _amount, bool _useZro, bytes calldata _adapterParams) external view returns (uint nativeFee, uint zroFee)'
      ]

      const oftContract = new ethers.Contract(oftAddress, oftAbi, signer)
      
      // Prepare parameters
      const dstChainId = 10001 // Solana chain ID in LayerZero
      const toAddress = ethers.utils.defaultAbiCoder.encode(['address'], [recipientAddress])
      const amountBN = ethers.utils.parseUnits(amount, tokenSymbol === 'USDC' ? 6 : 6)
      const refundAddress = await signer.getAddress()
      const zroPaymentAddress = ethers.constants.AddressZero
      const adapterParams = '0x'

      // Estimate fees first
      const [nativeFee] = await oftContract.estimateSendFee(
        dstChainId,
        toAddress,
        amountBN,
        false,
        adapterParams
      )

      // Execute transfer
      const tx = await oftContract.sendFrom(
        refundAddress,
        dstChainId,
        toAddress,
        amountBN,
        refundAddress,
        zroPaymentAddress,
        adapterParams,
        { value: nativeFee }
      )

      const receipt = await tx.wait()
      
      // Extract nonce from events (simplified)
      const nonce = Math.floor(Math.random() * 1000000) // In production, extract from logs

      return {
        transactionHash: receipt.transactionHash,
        nonce,
        status: 'pending',
        estimatedDeliveryTime: 300 // 5 minutes estimated
      }
    } catch (error) {
      console.error('LayerZero transfer failed:', error)
      throw new Error(`LayerZero transfer failed: ${error.message}`)
    }
  }

  /**
   * Check transfer status
   */
  async getTransferStatus(
    sourceChain: keyof typeof LAYERZERO_CHAIN_IDS,
    transactionHash: string,
    nonce: number
  ): Promise<'pending' | 'delivered' | 'failed'> {
    try {
      const provider = this.providers.get(sourceChain)
      if (!provider) return 'failed'

      const receipt = await provider.getTransactionReceipt(transactionHash)
      if (!receipt) return 'pending'
      if (receipt.status === 0) return 'failed'

      // In production, you would check LayerZero's message delivery status
      // For now, simulate based on time elapsed
      const currentTime = Math.floor(Date.now() / 1000)
      const txTime = (await provider.getBlock(receipt.blockNumber)).timestamp
      const elapsed = currentTime - txTime

      if (elapsed > 300) return 'delivered' // 5 minutes
      return 'pending'
    } catch (error) {
      console.error('Status check failed:', error)
      return 'failed'
    }
  }

  /**
   * Get transaction details
   */
  async getTransactionDetails(
    sourceChain: keyof typeof LAYERZERO_CHAIN_IDS,
    transactionHash: string
  ) {
    try {
      const provider = this.providers.get(sourceChain)
      if (!provider) throw new Error(`Provider not found for ${sourceChain}`)

      const [tx, receipt] = await Promise.all([
        provider.getTransaction(transactionHash),
        provider.getTransactionReceipt(transactionHash)
      ])

      return {
        transaction: tx,
        receipt,
        confirmations: receipt?.confirmations || 0,
        gasUsed: receipt?.gasUsed?.toString(),
        effectiveGasPrice: receipt?.effectiveGasPrice?.toString()
      }
    } catch (error) {
      console.error('Failed to get transaction details:', error)
      throw error
    }
  }

  /**
   * Retry failed transfer
   */
  async retryTransfer(
    sourceChain: keyof typeof LAYERZERO_CHAIN_IDS,
    nonce: number,
    signer: ethers.Signer
  ): Promise<string> {
    try {
      // Get LayerZero endpoint contract
      const endpointAddress = LAYERZERO_ENDPOINTS[sourceChain]
      const endpointAbi = [
        'function retryMessage(uint16 _srcChainId, bytes calldata _srcAddress, uint64 _nonce, bytes calldata _payload) external payable'
      ]

      const endpointContract = new ethers.Contract(endpointAddress, endpointAbi, signer)
      
      // Retry parameters (simplified - in production, get from original transaction)
      const srcChainId = LAYERZERO_CHAIN_IDS[sourceChain]
      const srcAddress = '0x' // Source address from original transaction
      const payload = '0x' // Payload from original transaction

      const tx = await endpointContract.retryMessage(
        srcChainId,
        srcAddress,
        nonce,
        payload,
        { value: ethers.utils.parseEther('0.01') } // Retry fee
      )

      const receipt = await tx.wait()
      return receipt.transactionHash
    } catch (error) {
      console.error('Retry failed:', error)
      throw new Error(`Retry failed: ${error.message}`)
    }
  }

  /**
   * Get supported chains with their details
   */
  getChainDetails() {
    return {
      ethereum: {
        name: 'Ethereum',
        chainId: 1,
        layerZeroChainId: LAYERZERO_CHAIN_IDS.ethereum,
        nativeCurrency: 'ETH',
        blockExplorer: 'https://etherscan.io'
      },
      polygon: {
        name: 'Polygon',
        chainId: 137,
        layerZeroChainId: LAYERZERO_CHAIN_IDS.polygon,
        nativeCurrency: 'MATIC',
        blockExplorer: 'https://polygonscan.com'
      },
      arbitrum: {
        name: 'Arbitrum',
        chainId: 42161,
        layerZeroChainId: LAYERZERO_CHAIN_IDS.arbitrum,
        nativeCurrency: 'ETH',
        blockExplorer: 'https://arbiscan.io'
      },
      optimism: {
        name: 'Optimism',
        chainId: 10,
        layerZeroChainId: LAYERZERO_CHAIN_IDS.optimism,
        nativeCurrency: 'ETH',
        blockExplorer: 'https://optimistic.etherscan.io'
      }
    }
  }
}

export const layerZeroBridgeService = new LayerZeroBridgeService()
export default layerZeroBridgeService
