# VPay Development Setup Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git
- MetaMask or compatible Web3 wallet

### Installation

1. **Clone and Install Dependencies**
```bash
# Frontend
cd frontend
npm install

# Backend  
cd ../backend
npm install

# Smart Contracts
cd ../contracts
npm install
```

2. **Environment Setup**
```bash
# Copy environment files
cp .env.example .env
```

3. **Configure Environment Variables**

**Frontend (.env)**
```
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=http://localhost:3001
VITE_CHAIN_ID=31337
```

**Backend (.env)**
```
DATABASE_URL="file:./dev.db"
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
PORT=3001
NODE_ENV=development
```

**Contracts (.env)**
```
PRIVATE_KEY=your-private-key-here
INFURA_PROJECT_ID=your-infura-project-id
ETHERSCAN_API_KEY=your-etherscan-api-key
```

## 🗄️ Database Setup

```bash
cd backend

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Initialize database with sample data
node scripts/init-db.js
```

## 🔗 Smart Contract Deployment

### Local Development (Hardhat Network)
```bash
cd contracts

# Start local blockchain
npx hardhat node

# Deploy contracts (in new terminal)
npx hardhat run scripts/deploy.js --network localhost

# Verify contracts (optional)
npx hardhat run scripts/verify.js --network localhost
```

### Testnet Deployment
```bash
# Deploy to Sepolia testnet
npx hardhat run scripts/deploy.js --network sepolia

# Verify on Etherscan
npx hardhat run scripts/verify.js --network sepolia
```

## 🏃‍♂️ Running the Application

### Development Mode
```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend  
cd frontend
npm run dev

# Terminal 3: Start local blockchain (if using local contracts)
cd contracts
npx hardhat node
```

### Production Build
```bash
# Build frontend
cd frontend
npm run build

# Build backend
cd backend
npm run build
npm start
```

## 📱 Application URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api
- **API Health**: http://localhost:3001/api/health
- **Database Studio**: `npm run db:studio` (in backend folder)

## 🔧 Development Scripts

### Frontend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run test         # Run tests
```

### Backend
```bash
npm run dev          # Start with nodemon
npm run build        # Compile TypeScript
npm run start        # Start production server
npm run test         # Run tests
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema changes
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio
```

### Smart Contracts
```bash
npx hardhat compile     # Compile contracts
npx hardhat test        # Run tests
npx hardhat node        # Start local blockchain
npx hardhat run scripts/deploy.js --network <network>
npx hardhat verify <address> --network <network>
```

## 🏗️ Project Structure

```
VeryPay/
├── frontend/           # React + Vite + TailwindCSS
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # Page components
│   │   ├── contexts/   # React Context providers
│   │   ├── lib/        # Utilities and configurations
│   │   └── hooks/      # Custom React hooks
│   └── package.json
├── backend/            # Node.js + Express + Prisma
│   ├── src/
│   │   ├── routes/     # API route handlers
│   │   ├── middleware/ # Express middleware
│   │   ├── utils/      # Utility functions
│   │   └── index.ts    # Main server file
│   ├── prisma/         # Database schema and migrations
│   └── package.json
├── contracts/          # Solidity smart contracts
│   ├── contracts/      # Contract source files
│   ├── scripts/        # Deployment and utility scripts
│   ├── test/          # Contract tests
│   └── hardhat.config.js
└── docs/              # Documentation files
```

## 🔐 Security Notes

- Never commit private keys or sensitive data
- Use environment variables for all secrets
- Enable 2FA on all external services
- Regularly update dependencies
- Test smart contracts thoroughly before mainnet deployment

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Kill process on port 3001
   npx kill-port 3001
   ```

2. **Database connection issues**
   ```bash
   # Reset database
   cd backend
   npm run db:reset
   ```

3. **Smart contract deployment fails**
   ```bash
   # Check network configuration in hardhat.config.js
   # Ensure sufficient ETH balance for gas fees
   ```

4. **Frontend build errors**
   ```bash
   # Clear node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

### Getting Help

- Check the GitHub Issues page
- Review error logs in terminal
- Verify environment variables are set correctly
- Ensure all services are running on correct ports

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Wallet Endpoints
- `GET /api/wallet/balance` - Get wallet balance
- `GET /api/wallet/transactions` - Get transaction history
- `POST /api/wallet/send` - Send payment
- `POST /api/wallet/request` - Create payment request

### Task Endpoints
- `GET /api/tasks` - List all tasks
- `POST /api/tasks` - Create new task
- `GET /api/tasks/:id` - Get task details
- `POST /api/tasks/:id/apply` - Apply to task

### Rewards Endpoints
- `GET /api/rewards` - List available rewards
- `POST /api/rewards/:id/claim` - Claim reward
- `GET /api/rewards/achievements` - List achievements

## 🚀 Deployment

### Frontend (Netlify/Vercel)
1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables

### Backend (Railway/Heroku)
1. Connect GitHub repository
2. Set start command: `npm start`
3. Add environment variables
4. Configure database URL

### Smart Contracts (Mainnet)
1. Audit contracts thoroughly
2. Test on testnets first
3. Use multi-sig wallet for ownership
4. Verify contracts on Etherscan

---

**Happy coding! 🎉**
