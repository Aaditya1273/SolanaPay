# Cross-Chain Bridge Integration Guide

## Overview

This guide covers the complete cross-chain bridge integration that enables one-click asset transfers from EVM chains (Ethereum, Polygon) to Solana with automatic conversion to native tokens.

## Features

### 🌉 Dual Bridge Support
- **Wormhole Bridge**: Most reliable, supports WETH, USDT, USDC
- **LayerZero Bridge**: Lower fees, supports USDT, USDC across multiple chains
- **Automatic Route Selection**: Chooses optimal bridge based on cost, time, and reliability

### 🔄 Automatic Asset Conversion
- **Wrapped Token Conversion**: WETH → SOL, USDT → USDC, wUSDC → USDC
- **On-Chain Rust Program**: Handles conversions with configurable fees
- **Batch Conversion**: Convert multiple assets in single transaction

### 🚀 One-Click Flow
- **Unified Interface**: Single UI for all bridge operations
- **Step-by-Step Progress**: Real-time status updates
- **Error Handling**: Automatic retry and fallback mechanisms

## Architecture

```
EVM Chain (Ethereum/Polygon)
    ↓ (Wormhole/LayerZero)
Solana (Wrapped Tokens)
    ↓ (Asset Converter Program)
Solana (Native Tokens)
```

## Installation

### 1. Frontend Dependencies

```bash
cd frontend
npm install @certusone/wormhole-sdk @coral-xyz/anchor ethers
```

### 2. Backend Dependencies

```bash
cd backend
npm install @solana/web3.js @coral-xyz/anchor ed25519-hd-key
```

### 3. Rust Program Dependencies

```bash
cd contracts/programs/asset-converter
cargo build-bpf
```

## Environment Configuration

### Frontend (.env)

```bash
# Wormhole Configuration
VITE_WORMHOLE_RPC_HOSTS=https://wormhole-v2-mainnet-api.certus.one,https://wormhole.inotel.ro

# LayerZero Configuration
VITE_LAYERZERO_ENDPOINT_ETHEREUM=0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675
VITE_LAYERZERO_ENDPOINT_POLYGON=0x3c2269811836af69497E5F486A85D7316753cf62

# RPC URLs
VITE_ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
VITE_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
VITE_ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
VITE_OPTIMISM_RPC_URL=https://mainnet.optimism.io

# Asset Converter Program
VITE_ASSET_CONVERTER_PROGRAM_ID=AssetConv11111111111111111111111111111111
```

### Backend (.env)

```bash
# Bridge Configuration
WORMHOLE_CORE_ETHEREUM=0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B
WORMHOLE_TOKEN_BRIDGE_ETHEREUM=0x3ee18B2214AFF97000D974cf647E7C347E8fa585
WORMHOLE_CORE_POLYGON=0x7A4B5a56256163F07b2C80A7cA55aBE66c4ec4d7
WORMHOLE_TOKEN_BRIDGE_POLYGON=0x5a58505a96D1dbf8dF91cB21B54419FC36e93fdE

# Asset Converter
ASSET_CONVERTER_ADMIN=YOUR_ADMIN_PUBKEY
CONVERSION_FEE_RATE=25  # 0.25% in basis points
```

## Usage

### 1. Basic Bridge Transfer

```typescript
import { bridgeAbstractionService } from '../services/bridgeAbstractionService'

const bridgeRequest = {
  sourceChain: 'ethereum',
  targetChain: 'solana',
  token: 'WETH',
  amount: '0.5',
  recipientAddress: wallet.publicKey.toString(),
  senderAddress: evmAddress,
  autoConvert: true
}

const result = await bridgeAbstractionService.executeBridge(bridgeRequest, wallet)
```

### 2. Get Optimal Routes

```typescript
const routes = await bridgeAbstractionService.getOptimalRoute(bridgeRequest)
console.log('Best route:', routes[0])
```

### 3. Asset Conversion Only

```typescript
import { assetConverterService } from '../services/assetConverterService'

const conversionResult = await assetConverterService.convertAsset({
  sourceToken: 'WETH',
  amount: 0.5
}, wallet)
```

### 4. Batch Conversion

```typescript
const batchResults = await assetConverterService.batchConvertAssets([
  { sourceToken: 'WETH', amount: 0.1 },
  { sourceToken: 'USDT', amount: 100 }
], wallet)
```

## Supported Assets

### Wormhole Bridge
| Chain | Tokens | Contract Addresses |
|-------|--------|-------------------|
| Ethereum | WETH, USDT, USDC | 0xC02a..., 0xdAC1..., 0xA0b8... |
| Polygon | WETH, USDT, USDC | 0x7ceB..., 0xc213..., 0x2791... |

### LayerZero Bridge
| Chain | Tokens | Estimated Time |
|-------|--------|----------------|
| Ethereum | USDT, USDC | 5-10 minutes |
| Polygon | USDT, USDC | 3-8 minutes |
| Arbitrum | USDT, USDC | 2-5 minutes |
| Optimism | USDT, USDC | 2-5 minutes |

### Asset Conversions
| Source Token | Target Token | Conversion Rate | Fee |
|--------------|--------------|-----------------|-----|
| WETH | SOL | 1:1 | 0.25% |
| USDT | USDC | 1:1 | 0.25% |
| wUSDC | USDC | 1:1 | 0.25% |

## API Reference

### BridgeAbstractionService

#### `getOptimalRoute(request: UnifiedBridgeRequest): Promise<BridgeRoute[]>`
Returns available bridge routes sorted by optimal score.

#### `executeBridge(request: UnifiedBridgeRequest, wallet: any): Promise<UnifiedBridgeResult>`
Executes complete bridge transfer with optional auto-conversion.

#### `getBridgeStatus(provider: string, sourceChain: string, txHash: string): Promise<string>`
Checks status of ongoing bridge transfer.

#### `estimateTotalCost(request: UnifiedBridgeRequest): Promise<CostEstimate>`
Estimates total cost including bridge and conversion fees.

### AssetConverterService

#### `getConversionQuote(request: ConversionRequest): Promise<ConversionQuote>`
Gets conversion quote with fees and rates.

#### `convertAsset(request: ConversionRequest, wallet: any): Promise<ConversionResult>`
Executes asset conversion on Solana.

#### `batchConvertAssets(requests: ConversionRequest[], wallet: any): Promise<ConversionResult[]>`
Converts multiple assets in single transaction.

#### `getWrappedTokenBalances(wallet: any): Promise<Record<string, number>>`
Gets user's wrapped token balances.

## UI Components

### CrossChainBridge Component

```tsx
import CrossChainBridge from '../components/bridge/CrossChainBridge'

function BridgePage() {
  return <CrossChainBridge />
}
```

Features:
- Chain and token selection
- Bridge provider comparison
- Real-time progress tracking
- Cost estimation
- Transaction history

## Smart Contract Integration

### Asset Converter Program

The Rust program handles automatic conversion of wrapped tokens:

```rust
// Initialize converter
pub fn initialize(
    ctx: Context<Initialize>,
    conversion_fee_rate: u64,
    admin: Pubkey,
) -> Result<()>

// Add conversion pair
pub fn add_conversion_pair(
    ctx: Context<AddConversionPair>,
    source_mint: Pubkey,
    target_mint: Pubkey,
    conversion_rate: u64,
    min_amount: u64,
    max_amount: u64,
) -> Result<()>

// Convert assets
pub fn convert_asset(
    ctx: Context<ConvertAsset>,
    amount: u64,
) -> Result<()>
```

### Deployment

```bash
# Build program
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Initialize converter state
anchor run initialize
```

## Testing

### Run Bridge Tests

```bash
node test-cross-chain-bridge.js
```

Tests include:
- Wormhole bridge integration
- LayerZero bridge integration
- Asset converter functionality
- Bridge abstraction layer
- One-click flow
- Route optimization

### Manual Testing

1. **Bridge Transfer**:
   - Connect EVM wallet (MetaMask)
   - Connect Solana wallet
   - Select source chain and token
   - Execute bridge transfer
   - Verify tokens received

2. **Asset Conversion**:
   - Check wrapped token balances
   - Execute conversion
   - Verify native tokens received

## Monitoring & Analytics

### Bridge Statistics

```typescript
const stats = await bridgeAbstractionService.getBridgeHistory(wallet)
console.log('Total bridges:', stats.length)
```

### Conversion Analytics

```typescript
const stats = await assetConverterService.getConversionStats()
console.log('Popular pairs:', stats.popularPairs)
```

## Security Considerations

### Bridge Security
- **VAA Verification**: All Wormhole transfers verified with VAAs
- **Nonce Tracking**: LayerZero transfers tracked by nonce
- **Timeout Handling**: Automatic retry for failed transfers
- **Slippage Protection**: Configurable slippage tolerance

### Converter Security
- **Admin Controls**: Pause/resume functionality
- **Rate Limits**: Min/max conversion amounts
- **Fee Collection**: Secure fee withdrawal
- **Overflow Protection**: Safe math operations

## Troubleshooting

### Common Issues

1. **Bridge Transfer Stuck**:
   - Check VAA availability (Wormhole)
   - Verify nonce status (LayerZero)
   - Retry with higher gas

2. **Conversion Failed**:
   - Check wrapped token balance
   - Verify conversion pair active
   - Ensure amount within limits

3. **High Fees**:
   - Try different bridge provider
   - Check network congestion
   - Use batch operations

### Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `BRIDGE_001` | Insufficient balance | Add funds to source wallet |
| `BRIDGE_002` | Unsupported token | Check supported assets list |
| `BRIDGE_003` | Network congestion | Retry with higher gas |
| `CONVERT_001` | Conversion pair inactive | Contact admin |
| `CONVERT_002` | Amount too small/large | Adjust amount |

## Performance Optimization

### Gas Optimization
- **Batch Operations**: Combine multiple conversions
- **Route Selection**: Choose optimal bridge automatically
- **Fee Estimation**: Accurate gas estimation

### User Experience
- **Progress Tracking**: Real-time status updates
- **Error Recovery**: Automatic retry mechanisms
- **Cost Transparency**: Clear fee breakdown

## Roadmap

### Phase 1 (Current)
- ✅ Wormhole integration
- ✅ LayerZero integration
- ✅ Asset converter program
- ✅ One-click UI

### Phase 2 (Planned)
- [ ] Additional chains (Avalanche, BSC)
- [ ] More token support
- [ ] Advanced routing algorithms
- [ ] MEV protection

### Phase 3 (Future)
- [ ] Cross-chain governance
- [ ] Liquidity optimization
- [ ] Institutional features
- [ ] Mobile app integration

## Support

For technical support or questions:
- GitHub Issues: [Repository Issues](https://github.com/your-repo/issues)
- Discord: [Community Discord](https://discord.gg/your-server)
- Documentation: [Full Docs](https://docs.your-project.com)

---

*Last updated: January 2024*
