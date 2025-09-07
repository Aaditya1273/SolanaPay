# SolanaPay Integration Setup Guide

This guide covers the complete setup and deployment of the SolanaPay integration with SOL/USDC payments, escrow functionality, cashback NFTs, and cross-chain identity management.

## 🚀 Features Implemented

### ✅ Core Payment System
- **Native SOL and USDC payments** with real-time balance checking
- **Escrow-based secure transactions** with auto-release functionality
- **QR code payment generation** for mobile and web compatibility
- **Instant payment option** for direct transfers
- **Transaction history** with detailed status tracking

### ✅ Advanced Features
- **Automatic cashback NFT minting** (Bronze/Silver/Gold/Platinum tiers)
- **Micro-rewards distribution system** for user incentives
- **Merchant payouts** with configurable low fees (0.5% vs 2.5% standard)
- **Cross-chain identity linking** between EVM and Solana wallets
- **Real-time payment notifications** and status updates

### ✅ Security & Compliance
- **Cryptographic signature verification** for wallet ownership
- **Deterministic wallet generation** (no private key storage)
- **Rate limiting** on authentication endpoints
- **On-chain escrow** with dispute resolution capabilities

## 📦 Installation

### 1. Install Dependencies

#### Frontend Dependencies
```bash
cd frontend
npm install @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets @solana/wallet-adapter-base @solana/web3.js @solana/spl-token @solana/pay @metaplex-foundation/js @coral-xyz/anchor bignumber.js qrcode.react
```

#### Backend Dependencies
```bash
cd backend
npm install @solana/web3.js ed25519-hd-key
```

### 2. Environment Configuration

#### Frontend (.env)
```bash
# Solana Configuration
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_SOLANA_NETWORK=devnet
VITE_SOLANAPAY_PROGRAM_ID=your_program_id_here

# Web3Auth Configuration
VITE_WEB3AUTH_CLIENT_ID=your_web3auth_client_id
VITE_WEB3AUTH_NETWORK=sapphire_devnet

# Cross-chain Identity
VITE_CROSS_CHAIN_PROGRAM_ID=your_cross_chain_program_id
```

#### Backend (.env)
```bash
# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
SOLANAPAY_PROGRAM_ID=your_solanapay_program_id_here

# Payment Configuration
USDC_MINT_ADDRESS=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
PLATFORM_FEE_RATE=0.025
MERCHANT_FEE_RATE=0.005

# NFT Metadata
NFT_METADATA_URI=https://your-metadata-server.com/nft/
CASHBACK_NFT_COLLECTION=your_nft_collection_address_here

# Cross-chain Identity
CROSS_CHAIN_PROGRAM_ID=your_cross_chain_program_id_here
```

## 🏗️ Architecture Overview

### Frontend Components

#### 1. SolanaPaymentInterface
- **Location**: `frontend/src/components/payments/SolanaPaymentInterface.tsx`
- **Features**: Send/Receive payments, QR code generation, escrow options
- **Supports**: SOL and USDC with real-time fee calculation

#### 2. CashbackNFTDisplay
- **Location**: `frontend/src/components/payments/CashbackNFTDisplay.tsx`
- **Features**: Display earned NFTs, claim rewards, tier visualization
- **Tiers**: Bronze (1%), Silver (2%), Gold (3%), Platinum (5%)

#### 3. PaymentHistory
- **Location**: `frontend/src/components/payments/PaymentHistory.tsx`
- **Features**: Transaction history, filtering, status tracking

#### 4. SolanaPayDashboard
- **Location**: `frontend/src/pages/payments/SolanaPayDashboard.tsx`
- **Features**: Unified dashboard with stats, recent activity, balance display

### Backend Services

#### 1. Solana Payment Service
- **Location**: `frontend/src/services/solanaPayService.ts`
- **Features**: Payment processing, QR generation, balance checking
- **Methods**: 
  - `createEscrowPayment()` - Secure escrow transactions
  - `createInstantPayment()` - Direct transfers
  - `createPaymentQR()` - Generate payment QR codes
  - `getBalances()` - Check SOL/USDC balances

#### 2. Authentication Integration
- **Location**: `backend/src/routes/auth.ts`
- **Features**: Web3 user sync, Solana wallet generation, cross-chain linking
- **Endpoints**:
  - `POST /auth/web3-sync` - Sync Web3 user data
  - `POST /auth/generate-solana-wallet` - Generate linked Solana wallet
  - `POST /auth/link-cross-chain` - Link EVM and Solana identities

### Smart Contracts

#### 1. SolanaPay Payment Contract
- **Location**: `contracts/programs/solanapay-payments/src/lib.rs`
- **Features**: Escrow payments, micro-rewards, merchant payouts, NFT minting
- **Instructions**:
  - `create_payment` - Initialize escrow payment
  - `release_payment` - Release funds to recipient
  - `dispute_payment` - Handle payment disputes
  - `mint_cashback_nft` - Automatic NFT rewards

#### 2. Cross-Chain Identity Contract
- **Location**: `contracts/programs/cross-chain-identity/src/lib.rs`
- **Features**: EVM signature verification, identity linking, metadata management

## 🎯 Usage Guide

### 1. Making Payments

#### Standard Payment Flow
```typescript
import { solanaPayService } from './services/solanaPayService'

// Create instant payment
const result = await solanaPayService.createInstantPayment(wallet, {
  recipient: 'recipient_address',
  amount: 1.5,
  currency: 'SOL',
  description: 'Payment for services'
})
```

#### Escrow Payment Flow
```typescript
// Create escrow payment with auto-release
const result = await solanaPayService.createEscrowPayment(wallet, {
  recipient: 'recipient_address',
  amount: 10.0,
  currency: 'USDC',
  autoRelease: true,
  autoReleaseTime: 24 * 3600 // 24 hours
})
```

### 2. QR Code Payments

```typescript
// Generate payment QR code
const paymentUrl = await solanaPayService.createPaymentQR({
  recipient: 'recipient_address',
  amount: 5.0,
  currency: 'SOL',
  description: 'Scan to pay'
})

// Generate QR code image
const qrImage = await solanaPayService.generateQRCode(paymentUrl)
```

### 3. Cashback NFT System

#### Automatic NFT Minting
- **Bronze Tier**: 10+ SOL payments → 1% cashback
- **Silver Tier**: 50+ SOL payments → 2% cashback  
- **Gold Tier**: 100+ SOL payments → 3% cashback
- **Platinum Tier**: 500+ SOL payments → 5% cashback

#### NFT Metadata Structure
```json
{
  "name": "SolanaPay Cashback - Gold Tier",
  "description": "Earned from payment of 100 SOL",
  "image": "https://metadata-server.com/gold-tier.png",
  "attributes": [
    {"trait_type": "Tier", "value": "Gold"},
    {"trait_type": "Cashback Amount", "value": 3.0},
    {"trait_type": "Payment Amount", "value": 100.0},
    {"trait_type": "Minted At", "value": 1704067200}
  ]
}
```

## 🔧 Development

### 1. Running the Application

#### Start Frontend
```bash
cd frontend
npm run dev
```

#### Start Backend
```bash
cd backend
npm run dev
```

### 2. Building Smart Contracts

#### Build Solana Programs
```bash
cd contracts
anchor build
```

#### Deploy to Devnet
```bash
anchor deploy --provider.cluster devnet
```

### 3. Testing

#### Frontend Tests
```bash
cd frontend
npm run test
```

#### Smart Contract Tests
```bash
cd contracts
anchor test
```

## 🌐 Deployment

### 1. Frontend Deployment
- Configure environment variables for production
- Build: `npm run build`
- Deploy to Vercel/Netlify with Solana RPC endpoints

### 2. Backend Deployment
- Set production environment variables
- Deploy to Railway/Heroku with database connection
- Configure CORS for frontend domain

### 3. Smart Contract Deployment
- Deploy to Solana mainnet: `anchor deploy --provider.cluster mainnet`
- Update program IDs in environment variables
- Verify contract on Solana Explorer

## 🔐 Security Considerations

### 1. Private Key Management
- Never store private keys in code or environment files
- Use secure key management services (AWS KMS, HashiCorp Vault)
- Implement proper key rotation policies

### 2. Transaction Security
- Always verify transaction signatures
- Implement proper slippage protection
- Use secure RPC endpoints with rate limiting

### 3. Smart Contract Security
- Audit contracts before mainnet deployment
- Implement proper access controls
- Use secure random number generation for NFT traits

## 📊 Monitoring & Analytics

### 1. Payment Metrics
- Track payment volume and success rates
- Monitor gas fees and transaction times
- Analyze user payment patterns

### 2. NFT Analytics
- Track NFT minting rates by tier
- Monitor cashback distribution
- Analyze user engagement with rewards

### 3. Error Monitoring
- Implement comprehensive error logging
- Set up alerts for failed transactions
- Monitor RPC endpoint health

## 🆘 Troubleshooting

### Common Issues

#### 1. Wallet Connection Issues
```bash
Error: Wallet not connected
Solution: Ensure wallet adapter is properly configured and user has approved connection
```

#### 2. Insufficient Balance
```bash
Error: Insufficient funds for transaction
Solution: Check user balance and account for network fees
```

#### 3. RPC Endpoint Issues
```bash
Error: Failed to connect to Solana RPC
Solution: Verify RPC URL and check endpoint status
```

#### 4. Smart Contract Errors
```bash
Error: Program account not found
Solution: Verify program ID and ensure contract is deployed to correct network
```

## 📚 API Reference

### SolanaPayService Methods

#### Payment Methods
- `createInstantPayment(wallet, request)` - Direct payment
- `createEscrowPayment(wallet, request)` - Escrow payment
- `releasePayment(wallet, paymentId)` - Release escrow funds
- `getPaymentStatus(paymentId)` - Check payment status

#### Utility Methods
- `getBalances(publicKey)` - Get SOL/USDC balances
- `estimateFees(request)` - Calculate transaction fees
- `createPaymentQR(request)` - Generate payment QR code
- `generateQRCode(url)` - Create QR code image

#### History Methods
- `getTransactionHistory(publicKey, limit)` - Get transaction history
- `subscribeToPayment(paymentId, callback)` - Real-time updates

## 🎉 Success Metrics

### Implementation Completed
- ✅ SOL and USDC payment flows
- ✅ Escrow-based secure transactions
- ✅ QR code payment generation
- ✅ Automatic cashback NFT minting
- ✅ Cross-chain identity integration
- ✅ Real-time transaction monitoring
- ✅ Comprehensive error handling
- ✅ Mobile-responsive UI components

### Performance Targets
- **Transaction Success Rate**: >99%
- **Average Transaction Time**: <5 seconds
- **QR Code Generation**: <1 second
- **Balance Updates**: Real-time
- **NFT Minting**: Automatic on qualifying payments

## 📞 Support

For technical support or questions:
- Review this documentation
- Check the troubleshooting section
- Examine error logs and console output
- Verify environment configuration
- Test on devnet before mainnet deployment

---

**Note**: This integration provides a complete SolanaPay solution with advanced features like escrow payments, automatic NFT rewards, and cross-chain identity management. All components are production-ready and follow Solana best practices.
