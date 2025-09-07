// Program IDs for deployed contracts
export const FIAT_BRIDGE_PROGRAM_ID = 'FiatBridge1111111111111111111111111111111111111';
export const MERCHANT_REWARDS_PROGRAM_ID = 'MerchantRewards11111111111111111111111111111';
export const KYC_VERIFICATION_PROGRAM_ID = 'KYCVerification11111111111111111111111111111';

// USDC mint address (mainnet)
export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// Devnet USDC mint (for testing)
export const DEVNET_USDC_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';

// Network configuration
export const NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';

export const PROGRAM_IDS = {
  fiatBridge: {
    devnet: FIAT_BRIDGE_PROGRAM_ID,
    'mainnet-beta': FIAT_BRIDGE_PROGRAM_ID,
  },
  merchantRewards: {
    devnet: MERCHANT_REWARDS_PROGRAM_ID,
    'mainnet-beta': MERCHANT_REWARDS_PROGRAM_ID,
  },
  kycVerification: {
    devnet: KYC_VERIFICATION_PROGRAM_ID,
    'mainnet-beta': KYC_VERIFICATION_PROGRAM_ID,
  },
  usdcMint: {
    devnet: DEVNET_USDC_MINT,
    'mainnet-beta': USDC_MINT,
  },
} as const;

// Helper function to get program ID for current network
export function getProgramId(programName: keyof typeof PROGRAM_IDS): string {
  return PROGRAM_IDS[programName][NETWORK as keyof typeof PROGRAM_IDS[typeof programName]];
}
