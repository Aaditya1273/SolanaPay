import { http } from 'wagmi'
import { mainnet, polygon, bsc } from 'wagmi/chains'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'

// Chain configurations with RPC endpoints
export const supportedChains = [mainnet, polygon, bsc] as const

// Chain metadata for UI display
export const chainMetadata = {
  [mainnet.id]: {
    name: 'Ethereum',
    shortName: 'ETH',
    icon: '⟠',
    color: '#627EEA',
    blockExplorer: 'https://etherscan.io',
    nativeCurrency: 'ETH',
    stablecoins: {
      USDC: '0xA0b86a33E6441b8435b662303c0f218C8c7e8e56',
      USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
    }
  },
  [polygon.id]: {
    name: 'Polygon',
    shortName: 'MATIC',
    icon: '⬟',
    color: '#8247E5',
    blockExplorer: 'https://polygonscan.com',
    nativeCurrency: 'MATIC',
    stablecoins: {
      USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063'
    }
  },
  [bsc.id]: {
    name: 'BNB Smart Chain',
    shortName: 'BSC',
    icon: '⬢',
    color: '#F3BA2F',
    blockExplorer: 'https://bscscan.com',
    nativeCurrency: 'BNB',
    stablecoins: {
      USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      USDT: '0x55d398326f99059fF775485246999027B3197955',
      BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'
    }
  }
} as const

// RainbowKit configuration
export const config = getDefaultConfig({
  appName: 'VPay - Web3 Micro-Economy',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '2f05a7cdc2674bb905d564890b2b130c',
  chains: supportedChains,
  transports: {
    [mainnet.id]: http(import.meta.env.VITE_ETHEREUM_RPC_URL || 'https://eth.llamarpc.com'),
    [polygon.id]: http(import.meta.env.VITE_POLYGON_RPC_URL || 'https://polygon.llamarpc.com'),
    [bsc.id]: http(import.meta.env.VITE_BSC_RPC_URL || 'https://bsc.llamarpc.com'),
  },
})

// Chain utilities
export const getChainById = (chainId: number) => {
  return supportedChains.find(chain => chain.id === chainId)
}

export const getChainMetadata = (chainId: number) => {
  return chainMetadata[chainId as keyof typeof chainMetadata]
}

export const isChainSupported = (chainId: number) => {
  return supportedChains.some(chain => chain.id === chainId)
}

// Default chain (Polygon for lower fees)
export const defaultChain = polygon

// Contract addresses for each chain
export const contractAddresses = {
  [mainnet.id]: {
    VPayPayments: import.meta.env.NEXT_PUBLIC_ETHEREUM_VPAY_PAYMENTS || '',
    VPayEscrow: import.meta.env.NEXT_PUBLIC_ETHEREUM_VPAY_ESCROW || '',
    VPayRewards: import.meta.env.NEXT_PUBLIC_ETHEREUM_VPAY_REWARDS || '',
  },
  [polygon.id]: {
    VPayPayments: import.meta.env.NEXT_PUBLIC_POLYGON_VPAY_PAYMENTS || '',
    VPayEscrow: import.meta.env.NEXT_PUBLIC_POLYGON_VPAY_ESCROW || '',
    VPayRewards: import.meta.env.NEXT_PUBLIC_POLYGON_VPAY_REWARDS || '',
  },
  [bsc.id]: {
    VPayPayments: import.meta.env.NEXT_PUBLIC_BSC_VPAY_PAYMENTS || '',
    VPayEscrow: import.meta.env.NEXT_PUBLIC_BSC_VPAY_ESCROW || '',
    VPayRewards: import.meta.env.NEXT_PUBLIC_BSC_VPAY_REWARDS || '',
  },
} as const

export type SupportedChainId = typeof supportedChains[number]['id']
export type ChainMetadata = typeof chainMetadata[keyof typeof chainMetadata]
