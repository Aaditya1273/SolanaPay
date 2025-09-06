/**
 * SolanaFlow RWA SDK - Cross-Chain Real World Asset Integration
 * 
 * A comprehensive SDK for integrating with the SolanaFlow RWA marketplace
 * across multiple blockchain networks with OneChain-first architecture.
 */

export * from './core/SolanaFlowSDK';
export * from './core/types';
export * from './core/constants';

// Chain-specific modules
export * from './chains/OneChainProvider';
export * from './chains/EthereumProvider';
export * from './chains/PolygonProvider';
export * from './chains/BSCProvider';

// Asset management
export * from './assets/AssetManager';
export * from './assets/TokenManager';
export * from './assets/MetadataManager';

// Trading and marketplace
export * from './trading/MarketplaceManager';
export * from './trading/OrderManager';
export * from './trading/AuctionManager';

// DeFi integration
export * from './defi/YieldManager';
export * from './defi/StakingManager';
export * from './defi/LendingManager';

// Cross-chain functionality
export * from './bridge/CrossChainBridge';
export * from './bridge/AssetBridge';

// Analytics and monitoring
export * from './analytics/AnalyticsManager';
export * from './analytics/PriceOracle';

// Utilities
export * from './utils/validation';
export * from './utils/formatting';
export * from './utils/encryption';

// Plugin system
export * from './plugins/PluginManager';
export * from './plugins/types';

// Version info
export const SDK_VERSION = '1.0.0';
export const SUPPORTED_CHAINS = ['onechain', 'ethereum', 'polygon', 'bsc'] as const;
