"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart3,
  Activity,
  Wallet,
  Clock,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Eye,
  Send,
  Download,
  Filter,
  Calendar,
  Building,
  Leaf,
  Gem,
  Factory,
  Globe,
  Shield,
  Zap
} from "lucide-react";
import { GlassCard } from "../../components/ui/glass-card";
import { cn, formatCurrency, formatNumber, formatPercentage } from "../../lib/utils";
import Link from "next/link";

interface PortfolioAsset {
  id: string;
  name: string;
  type: 'real-estate' | 'carbon-credits' | 'precious-metals' | 'commodities';
  amount: number;
  value: number;
  purchasePrice: number;
  currentPrice: number;
  change24h: number;
  changeTotal: number;
  fractions: number;
  totalFractions: number;
  yield: number;
  chain: string;
  lastUpdated: string;
}

interface Transaction {
  id: string;
  type: 'buy' | 'sell' | 'yield' | 'transfer';
  asset: string;
  amount: number;
  price: number;
  total: number;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
  txHash: string;
}

const mockPortfolioAssets: PortfolioAsset[] = [
  {
    id: '1',
    name: 'Manhattan Office Complex',
    type: 'real-estate',
    amount: 125,
    value: 312500,
    purchasePrice: 2400,
    currentPrice: 2500,
    change24h: 2.5,
    changeTotal: 4.17,
    fractions: 125,
    totalFractions: 2000,
    yield: 8.5,
    chain: 'Ethereum',
    lastUpdated: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    name: 'Amazon Carbon Credits',
    type: 'carbon-credits',
    amount: 2500,
    value: 112500,
    purchasePrice: 42,
    currentPrice: 45,
    change24h: -1.2,
    changeTotal: 7.14,
    fractions: 2500,
    totalFractions: 50000,
    yield: 12.3,
    chain: 'Polygon',
    lastUpdated: '2024-01-15T10:25:00Z',
  },
  {
    id: '3',
    name: 'Swiss Gold Reserves',
    type: 'precious-metals',
    amount: 25,
    value: 3125000,
    purchasePrice: 120000,
    currentPrice: 125000,
    change24h: 4.8,
    changeTotal: 4.17,
    fractions: 25,
    totalFractions: 200,
    yield: 5.2,
    chain: 'OneChain',
    lastUpdated: '2024-01-15T10:20:00Z',
  },
];

const mockTransactions: Transaction[] = [
  {
    id: '1',
    type: 'buy',
    asset: 'Manhattan Office Complex',
    amount: 50,
    price: 2500,
    total: 125000,
    timestamp: '2024-01-15T09:30:00Z',
    status: 'completed',
    txHash: '0x1234567890abcdef...',
  },
  {
    id: '2',
    type: 'yield',
    asset: 'Swiss Gold Reserves',
    amount: 25,
    price: 0,
    total: 1625,
    timestamp: '2024-01-15T08:00:00Z',
    status: 'completed',
    txHash: '0xabcdef1234567890...',
  },
  {
    id: '3',
    type: 'sell',
    asset: 'Amazon Carbon Credits',
    amount: 500,
    price: 45,
    total: 22500,
    timestamp: '2024-01-14T16:45:00Z',
    status: 'completed',
    txHash: '0x9876543210fedcba...',
  },
];

const assetTypeIcons = {
  'real-estate': Building,
  'carbon-credits': Leaf,
  'precious-metals': Gem,
  'commodities': Factory,
};

const assetTypeColors = {
  'real-estate': 'from-blue-500 to-cyan-500',
  'carbon-credits': 'from-green-500 to-emerald-500',
  'precious-metals': 'from-yellow-500 to-orange-500',
  'commodities': 'from-purple-500 to-pink-500',
};

const chainColors = {
  'Ethereum': 'bg-blue-500',
  'Polygon': 'bg-purple-500',
  'OneChain': 'bg-gold-500',
  'BSC': 'bg-yellow-500',
};

export default function PortfolioPage() {
  const [portfolioAssets, setPortfolioAssets] = useState<PortfolioAsset[]>(mockPortfolioAssets);
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d' | '1y'>('24h');
  const [activeTab, setActiveTab] = useState<'overview' | 'assets' | 'transactions' | 'analytics'>('overview');

  // Calculate portfolio stats
  const totalValue = portfolioAssets.reduce((sum, asset) => sum + asset.value, 0);
  const totalChange24h = portfolioAssets.reduce((sum, asset) => sum + (asset.value * asset.change24h / 100), 0);
  const totalChangePercent = (totalChange24h / totalValue) * 100;
  const totalYield = portfolioAssets.reduce((sum, asset) => sum + (asset.value * asset.yield / 100), 0);
  const avgYield = (totalYield / totalValue) * 100;

  const PortfolioStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-gold-500 to-gold-600 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div className={cn(
              "flex items-center space-x-1 text-sm font-medium",
              totalChangePercent >= 0 ? "text-green-400" : "text-red-400"
            )}>
              {totalChangePercent >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>{formatPercentage(totalChangePercent)}</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {formatCurrency(totalValue)}
          </div>
          <div className="text-sm text-white/60">Total Portfolio Value</div>
        </GlassCard>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div className="text-sm text-green-400 font-medium">
              +{avgYield.toFixed(1)}% APY
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {formatCurrency(totalYield)}
          </div>
          <div className="text-sm text-white/60">Annual Yield</div>
        </GlassCard>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <PieChart className="w-6 h-6 text-white" />
            </div>
            <div className="text-sm text-blue-400 font-medium">
              {portfolioAssets.length} Assets
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {formatCurrency(totalChange24h)}
          </div>
          <div className="text-sm text-white/60">24h Change</div>
        </GlassCard>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div className="text-sm text-purple-400 font-medium">
              {transactions.length} Transactions
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {transactions.filter(tx => tx.status === 'completed').length}
          </div>
          <div className="text-sm text-white/60">Completed</div>
        </GlassCard>
      </motion.div>
    </div>
  );

  const AssetAllocation = () => (
    <GlassCard className="p-6">
      <h3 className="text-xl font-bold text-white mb-6">Asset Allocation</h3>
      <div className="space-y-4">
        {portfolioAssets.map((asset, index) => {
          const IconComponent = assetTypeIcons[asset.type];
          const percentage = (asset.value / totalValue) * 100;
          
          return (
            <motion.div
              key={asset.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className={cn(
                  "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center",
                  assetTypeColors[asset.type]
                )}>
                  <IconComponent className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-medium text-white">{asset.name}</div>
                  <div className="text-sm text-white/60">
                    {asset.fractions.toLocaleString()} fractions
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-bold text-white">{formatCurrency(asset.value)}</div>
                <div className="text-sm text-white/60">{percentage.toFixed(1)}%</div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </GlassCard>
  );

  const RecentTransactions = () => (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">Recent Transactions</h3>
        <Link href="/transactions">
          <button className="text-gold-400 hover:text-gold-300 text-sm font-medium flex items-center space-x-1">
            <span>View All</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </Link>
      </div>
      
      <div className="space-y-3">
        {transactions.slice(0, 5).map((tx, index) => (
          <motion.div
            key={tx.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center space-x-4">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                tx.type === 'buy' ? 'bg-green-500/20 text-green-400' :
                tx.type === 'sell' ? 'bg-red-500/20 text-red-400' :
                tx.type === 'yield' ? 'bg-gold-500/20 text-gold-400' :
                'bg-blue-500/20 text-blue-400'
              )}>
                {tx.type === 'buy' && <ArrowDownRight className="w-5 h-5" />}
                {tx.type === 'sell' && <ArrowUpRight className="w-5 h-5" />}
                {tx.type === 'yield' && <Star className="w-5 h-5" />}
                {tx.type === 'transfer' && <Send className="w-5 h-5" />}
              </div>
              
              <div>
                <div className="font-medium text-white capitalize">
                  {tx.type} {tx.asset}
                </div>
                <div className="text-sm text-white/60">
                  {new Date(tx.timestamp).toLocaleDateString()}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className={cn(
                "font-bold",
                tx.type === 'buy' || tx.type === 'transfer' ? 'text-red-400' : 'text-green-400'
              )}>
                {tx.type === 'buy' || tx.type === 'transfer' ? '-' : '+'}
                {formatCurrency(tx.total)}
              </div>
              <div className="text-sm text-white/60">
                {tx.amount.toLocaleString()} units
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </GlassCard>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-royal-950 via-royal-900 to-royal-800 text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-royal-950/80 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-royal font-bold bg-gradient-to-r from-gold-400 to-gold-600 bg-clip-text text-transparent">
                Portfolio Dashboard
              </h1>
              <p className="text-white/60 mt-1">
                Track your RWA investments and performance
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-600 rounded-xl font-medium hover:from-gold-600 hover:to-gold-700 transition-all">
                <Plus className="w-4 h-4" />
                <span>Add Asset</span>
              </button>
              
              <Link href="/marketplace">
                <button className="px-4 py-2 border border-white/20 rounded-xl text-white hover:border-white/40 transition-colors">
                  Marketplace
                </button>
              </Link>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-1 mt-6 bg-white/5 rounded-xl p-1">
            {[
              { id: 'overview', label: 'Overview', icon: PieChart },
              { id: 'assets', label: 'Assets', icon: Building },
              { id: 'transactions', label: 'Transactions', icon: Activity },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-gold-500/20 text-gold-400"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <PortfolioStats />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <AssetAllocation />
                <RecentTransactions />
              </div>
            </motion.div>
          )}

          {activeTab === 'assets' && (
            <motion.div
              key="assets"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {portfolioAssets.map((asset, index) => {
                  const IconComponent = assetTypeIcons[asset.type];
                  
                  return (
                    <motion.div
                      key={asset.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <GlassCard className="p-6 group cursor-pointer hover:shadow-glow">
                        <div className="flex items-start justify-between mb-4">
                          <div className={cn(
                            "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center",
                            assetTypeColors[asset.type]
                          )}>
                            <IconComponent className="w-6 h-6 text-white" />
                          </div>
                          
                          <div className={cn("px-2 py-1 rounded-full text-xs font-medium text-white", chainColors[asset.chain])}>
                            {asset.chain}
                          </div>
                        </div>
                        
                        <h3 className="text-lg font-bold text-white mb-2">{asset.name}</h3>
                        
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-white/60">Holdings</span>
                            <span className="text-white font-medium">
                              {asset.fractions.toLocaleString()} fractions
                            </span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span className="text-white/60">Current Value</span>
                            <span className="text-gold-400 font-bold">
                              {formatCurrency(asset.value)}
                            </span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span className="text-white/60">24h Change</span>
                            <span className={cn(
                              "font-medium flex items-center space-x-1",
                              asset.change24h >= 0 ? "text-green-400" : "text-red-400"
                            )}>
                              {asset.change24h >= 0 ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : (
                                <TrendingDown className="w-3 h-3" />
                              )}
                              <span>{formatPercentage(asset.change24h)}</span>
                            </span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span className="text-white/60">Yield</span>
                            <span className="text-green-400 font-medium">
                              {asset.yield}% APY
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2 mt-6">
                          <button className="flex-1 bg-gradient-to-r from-gold-500 to-gold-600 text-white py-2 px-4 rounded-xl font-medium hover:from-gold-600 hover:to-gold-700 transition-all">
                            Trade
                          </button>
                          <button className="px-4 py-2 border border-white/20 rounded-xl text-white hover:border-white/40 transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </GlassCard>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}