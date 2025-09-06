# Enhanced Authentication Setup Guide

This guide covers the setup and deployment of the enhanced Web3Auth and cross-chain identity system for SolanaPay.

## Overview

The enhanced authentication system includes:
- **Web3Auth Integration**: Social login (Google, Twitter, Discord, GitHub) and MetaMask support
- **Cross-Chain Identity**: Automatic Solana wallet generation linked to EVM addresses
- **Session Persistence**: Seamless login/logout experience across page refreshes
- **Unified User Management**: Single identity across EVM and Solana ecosystems

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │     Backend      │    │   Blockchain    │
│                 │    │                  │    │                 │
│ ┌─────────────┐ │    │ ┌──────────────┐ │    │ ┌─────────────┐ │
│ │ Web3Auth    │ │◄──►│ │ Auth Routes  │ │    │ │ Cross-Chain │ │
│ │ Service     │ │    │ │ - web3-sync  │ │    │ │ Identity    │ │
│ └─────────────┘ │    │ │ - gen-wallet │ │    │ │ Program     │ │
│                 │    │ └──────────────┘ │    │ └─────────────┘ │
│ ┌─────────────┐ │    │                  │    │                 │
│ │ Enhanced    │ │    │ ┌──────────────┐ │    │ ┌─────────────┐ │
│ │ Login UI    │ │    │ │ Database     │ │    │ │ Solana      │ │
│ └─────────────┘ │    │ │ - Users      │ │    │ │ Network     │ │
│                 │    │ │ - Wallets    │ │    │ └─────────────┘ │
└─────────────────┘    │ └──────────────┘ │    └─────────────────┘
                       └──────────────────┘
```

## Installation & Dependencies

### Frontend Dependencies

Install the required Web3Auth and blockchain packages:

```bash
cd frontend
npm install @web3auth/modal @web3auth/base @web3auth/ethereum-provider ethers
```

### Backend Dependencies

Install Solana and crypto packages:

```bash
cd backend
npm install @solana/web3.js ed25519-hd-key
```

### Database Schema Updates

Add the following fields to your User model in Prisma schema:

```prisma
model User {
  // ... existing fields
  walletAddress        String?  @unique
  solanaWalletAddress  String?  @unique
  provider            String?  // 'email', 'google', 'metamask', etc.
  lastLoginAt         DateTime?
}
```

Run migration:
```bash
cd backend
npx prisma migrate dev --name add-web3-fields
```

## Environment Configuration

### Frontend (.env)

```env
# Web3Auth Configuration
VITE_WEB3AUTH_CLIENT_ID=BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ
VITE_WEB3AUTH_NETWORK=sapphire_mainnet

# Cross-Chain Identity
VITE_CROSS_CHAIN_PROGRAM_ID=CCIDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com

# API Configuration
VITE_API_URL=http://localhost:3002/api
```

### Backend (.env)

```env
# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
CROSS_CHAIN_PROGRAM_ID=CCIDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Existing JWT and database configs...
JWT_SECRET=your_jwt_secret_here
DATABASE_URL=your_database_url_here
```

## Deployment Steps

### 1. Deploy Solana Program

```bash
cd contracts/programs/cross-chain-identity
anchor build
anchor deploy --provider.cluster devnet
```

Update the program ID in environment variables after deployment.

### 2. Start Backend Server

```bash
cd backend
npm run dev
```

### 3. Start Frontend Development Server

```bash
cd frontend
npm run dev
```

## Usage Examples

### Social Login

```typescript
import { useAuth } from '../contexts/AuthContext'

const { loginWithSocial } = useAuth()

// Login with Google
await loginWithSocial('google')

// Login with Discord
await loginWithSocial('discord')
```

### MetaMask Login

```typescript
const { loginWithMetaMask } = useAuth()

await loginWithMetaMask()
```

### Generate Solana Wallet

```typescript
const { generateSolanaWallet } = useAuth()

const solanaAddress = await generateSolanaWallet()
console.log('Generated Solana wallet:', solanaAddress)
```

## API Endpoints

### POST /api/auth/web3-sync
Synchronizes Web3 user data with backend database.

**Request:**
```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b8D4C2C4e07C5c4e4e",
  "email": "user@example.com",
  "name": "John Doe",
  "provider": "google",
  "profileImage": "https://example.com/avatar.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "user": { /* user object */ },
  "token": "jwt_token_here"
}
```

### POST /api/auth/generate-solana-wallet
Generates a deterministic Solana wallet linked to EVM address.

**Request:**
```json
{
  "evmAddress": "0x742d35Cc6634C0532925a3b8D4C2C4e07C5c4e4e"
}
```

**Response:**
```json
{
  "success": true,
  "solanaAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  "user": { /* updated user object */ }
}
```

## Security Considerations

1. **Private Key Management**: Solana wallets are generated deterministically but private keys are not stored in the database
2. **Signature Verification**: EVM signatures are verified before linking addresses
3. **Session Management**: JWT tokens are used for session persistence with configurable expiration
4. **Rate Limiting**: Authentication endpoints are rate-limited to prevent abuse

## Testing

### Unit Tests

```bash
# Frontend tests
cd frontend
npm run test

# Backend tests
cd backend
npm run test
```

### Integration Tests

```bash
# Test AI integration (includes auth flows)
node test-ai-integration.js
```

### Manual Testing Checklist

- [ ] Social login with Google works
- [ ] Social login with Discord works
- [ ] MetaMask connection works
- [ ] Session persists across page refresh
- [ ] Solana wallet generation works
- [ ] Cross-chain identity linking works
- [ ] Logout clears all sessions

## Troubleshooting

### Common Issues

1. **Web3Auth Client ID Error**
   - Ensure `VITE_WEB3AUTH_CLIENT_ID` is set correctly
   - Verify the client ID is valid for your domain

2. **MetaMask Connection Failed**
   - Check if MetaMask is installed
   - Ensure user has approved the connection

3. **Solana Wallet Generation Error**
   - Verify Solana RPC URL is accessible
   - Check if user has an EVM wallet connected first

4. **Database Connection Issues**
   - Ensure Prisma schema is up to date
   - Run `npx prisma generate` after schema changes

### Debug Mode

Enable debug logging by setting:
```env
DEBUG=solanapay:auth
```

## Performance Optimizations

1. **Session Caching**: User sessions are cached in localStorage
2. **Lazy Loading**: Web3Auth modal is loaded on-demand
3. **Connection Pooling**: Database connections are pooled for efficiency
4. **Deterministic Wallets**: Solana wallets are generated without network calls

## Future Enhancements

- [ ] Multi-signature wallet support
- [ ] Hardware wallet integration
- [ ] Biometric authentication
- [ ] Cross-chain transaction routing
- [ ] Advanced identity verification (KYC)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the console logs for error details
3. Ensure all environment variables are configured
4. Verify all dependencies are installed correctly

---

This enhanced authentication system provides a seamless Web3 experience while maintaining security and user privacy across multiple blockchain ecosystems.
