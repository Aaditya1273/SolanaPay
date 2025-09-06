/**
 * Core types and interfaces for the OmniFlow SDK
 */

export type ChainId = 'onechain' | 'ethereum' | 'polygon' | 'bsc';
export type Environment = 'mainnet' | 'testnet' | 'development';
export type AssetType = 'real-estate' | 'carbon-credits' | 'precious-metals' | 'commodities' | 'renewable-energy' | 'infrastructure' | 'art' | 'bonds';

/**
 * SDK Configuration
 */
export interface SDKConfig {
  apiKey: string;
  chains: ChainId[];
  preferredChain: ChainId;
  environment: Environment;
  apiEndpoint?: string;
  wsEndpoint?: string;
  enableAnalytics?: boolean;
  enableRealTime?: boolean;
  rpcEndpoints?: Partial<Record<ChainId, string>>;
  contractAddresses?: Partial<Record<ChainId, ContractAddresses>>;
  plugins?: string[];
}

/**
 * Contract addresses for each chain
 */
export interface ContractAddresses {
  rwaRegistry: string;
  rwaToken: string;
  marketplace: string;
  bridge: string;
  staking: string;
  lending: string;
}

/**
 * Chain Provider Interface
 */
export interface ChainProvider {
  chainId: ChainId;
  initialize(): Promise<void>;
  disconnect(): Promise<void>;
  isHealthy(): Promise<boolean>;
  getBalance(address: string): Promise<string>;
  sendTransaction(tx: TransactionRequest): Promise<Transaction>;
  call(to: string, data: string): Promise<string>;
  estimateGas(tx: TransactionRequest): Promise<string>;
  getBlockNumber(): Promise<number>;
  waitForTransaction(hash: string): Promise<TransactionReceipt>;
}

/**
 * Asset representation
 */
export interface Asset {
  id: string;
  tokenId: number;
  chainId: ChainId;
  type: AssetType;
  name: string;
  description: string;
  owner: string;
  value: {
    current: number;
    currency: string;
    lastUpdated: string;
  };
  location: {
    lat: number;
    lng: number;
    country: string;
    city: string;
    address?: string;
  };
  metadata: {
    images: string[];
    documents: string[];
    attributes: Record<string, any>;
    compliance: {
      kyc: boolean;
      aml: boolean;
      regulatory: string[];
    };
  };
  trading: {
    isListed: boolean;
    price?: number;
    auction?: AuctionData;
  };
  fractional?: {
    totalShares: number;
    availableShares: number;
    pricePerShare: number;
  };
  status: 'active' | 'pending' | 'suspended' | 'transferred';
  createdAt: string;
  updatedAt: string;
}

/**
 * Transaction types
 */
export interface Transaction {
  hash: string;
  chainId: ChainId;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  gasLimit: string;
  data: string;
  nonce: number;
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber?: number;
  timestamp?: string;
}

export interface TransactionRequest {
  to: string;
  value?: string;
  data?: string;
  gasPrice?: string;
  gasLimit?: string;
}

export interface TransactionReceipt {
  hash: string;
  blockNumber: number;
  gasUsed: string;
  status: boolean;
  logs: Log[];
}

export interface Log {
  address: string;
  topics: string[];
  data: string;
}

/**
 * Marketplace types
 */
export interface MarketplaceListing {
  id: string;
  assetId: string;
  seller: string;
  price: number;
  currency: string;
  listingType: 'fixed' | 'auction' | 'fractional';
  status: 'active' | 'sold' | 'cancelled' | 'expired';
  createdAt: string;
  expiresAt?: string;
}

export interface AuctionData {
  startPrice: number;
  currentBid: number;
  highestBidder: string;
  endTime: string;
  minBidIncrement: number;
}

export interface Order {
  id: string;
  assetId: string;
  buyer: string;
  seller: string;
  amount: number;
  price: number;
  orderType: 'buy' | 'sell';
  status: 'pending' | 'filled' | 'cancelled';
  createdAt: string;
}

/**
 * DeFi types
 */
export interface StakingPosition {
  id: string;
  assetId: string;
  staker: string;
  amount: number;
  poolId: string;
  apy: number;
  startTime: string;
  lockupPeriod: number;
  rewards: number;
  status: 'active' | 'unstaked' | 'locked';
}

export interface LendingPosition {
  id: string;
  assetId: string;
  borrower: string;
  collateralValue: number;
  loanAmount: number;
  interestRate: number;
  healthFactor: number;
  liquidationThreshold: number;
  startTime: string;
  status: 'active' | 'repaid' | 'liquidated';
}

/**
 * Cross-chain bridge types
 */
export interface BridgeTransfer {
  id: string;
  assetId: string;
  fromChain: ChainId;
  toChain: ChainId;
  sender: string;
  recipient: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'failed';
  txHashSource?: string;
  txHashDestination?: string;
  createdAt: string;
  completedAt?: string;
}

/**
 * Analytics types
 */
export interface AnalyticsData {
  type: string;
  data: any;
  timestamp: string;
  chainId?: ChainId;
}

export interface PriceData {
  assetId: string;
  price: number;
  change24h: number;
  volume24h: number;
  timestamp: string;
}

export interface MarketStats {
  totalAssets: number;
  totalValue: number;
  totalVolume24h: number;
  averagePrice: number;
  topPerformers: Asset[];
}

/**
 * Plugin system types
 */
export interface Plugin {
  name: string;
  version: string;
  description: string;
  author: string;
  initialize(sdk: any): Promise<void>;
  cleanup(): Promise<void>;
  getCapabilities(): string[];
}

export interface PluginConfig {
  name: string;
  enabled: boolean;
  config: Record<string, any>;
}

/**
 * API Response types
 */
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
}

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
  chainId?: ChainId;
}

/**
 * Event types
 */
export interface SDKEvent {
  type: string;
  data: any;
  timestamp: string;
  chainId?: ChainId;
}

export type EventType = 
  | 'asset_created'
  | 'asset_transferred'
  | 'asset_listed'
  | 'asset_sold'
  | 'price_updated'
  | 'staking_started'
  | 'staking_ended'
  | 'loan_created'
  | 'loan_repaid'
  | 'bridge_transfer'
  | 'chain_connected'
  | 'chain_disconnected'
  | 'error';

/**
 * Utility types
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterOptions {
  assetType?: AssetType;
  chainId?: ChainId;
  owner?: string;
  priceRange?: [number, number];
  location?: {
    country?: string;
    city?: string;
  };
  status?: string;
}

/**
 * Error types
 */
export class SDKError extends Error {
  constructor(
    message: string,
    public code: string,
    public chainId?: ChainId,
    public details?: any
  ) {
    super(message);
    this.name = 'SDKError';
  }
}

export class ChainError extends SDKError {
  constructor(message: string, chainId: ChainId, details?: any) {
    super(message, 'CHAIN_ERROR', chainId, details);
    this.name = 'ChainError';
  }
}

export class TransactionError extends SDKError {
  constructor(message: string, txHash?: string, details?: any) {
    super(message, 'TRANSACTION_ERROR', undefined, { txHash, ...details });
    this.name = 'TransactionError';
  }
}

export class APIError extends SDKError {
  constructor(message: string, statusCode?: number, details?: any) {
    super(message, 'API_ERROR', undefined, { statusCode, ...details });
    this.name = 'APIError';
  }
}
