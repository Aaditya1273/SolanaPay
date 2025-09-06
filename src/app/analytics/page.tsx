"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  PieChart,
  Activity,
  Globe,
  Users,
  DollarSign,
  Zap,
  Shield,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Building,
  Leaf,
  Gem,
  Factory,
  Filter,
  Calendar,
  Download,
  RefreshCw
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { cn, formatCurrency, formatNumber, formatPercentage } from "@/lib/utils";
import Link from "next/link";

interface MarketData {
  totalMarketCap: number;
  totalVolume24h: number;
  totalAssets: number;
  activeTraders: number;
  avgYield: number;
  marketCapChange: number;
  volumeChange: number;
  assetsChange: number;
  tradersChange: number;
}

interface AssetTypeData {
  type: string;
  name: string;
  marketCap: number;
  volume24h: number;
  assets: number;
  avgYield: number;
  change24h: number;
  icon: any;
  color: string;
}

interface ChainData {
  name: string;
  marketCap: number;
  volume24h: number;
  assets: number;
  transactions: number;
  change24h: number;
  color: string;
}

const mockMarketData: MarketData = {
  totalMarketCap: 4600000000,
  totalVolume24h: 89432000,
  totalAssets: 3262,
  activeTraders: 12847,
  avgYield: 9.2,
  marketCapChange: 12.5,
  volumeChange: -3.2,
  assetsChange: 8.7,
  tradersChange: 15.3,
};

const mockAssetTypeData: AssetTypeData[] = [
  {
    type: 'real-estate',
    name: 'Real Estate',
    marketCap: 2400000000,
    volume24h: 45000000,
    assets: 1247,
    avgYield: 8.5,
    change24h: 2.5,
    icon: Building,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    type: 'commodities',
    name: 'Commodities',
    marketCap: 1200000000,
    volume24h: 23000000,
    assets: 678,
    avgYield: 11.2,
    change24h: -1.8,
    icon: Factory,
    color: 'from-purple-500 to-pink-500',
  },
  {
    type: 'precious-metals',
    name: 'Precious Metals',
    marketCap: 890000000,
    volume24h: 18000000,
    assets: 445,
    avgYield: 5.2,
    change24h: 4.8,
    icon: Gem,
    color: 'from-yellow-500 to-orange-500',
  },
  {
    type: 'carbon-credits',
    name: 'Carbon Credits',
    marketCap: 156000000,
    volume24h: 3432000,
    assets: 892,
    avgYield: 12.3,
    change24h: -0.5,
    icon: Leaf,
    color: 'from-green-500 to-emerald-500',
  },
];

const mockChainData: ChainData[] = [
  {
    name: 'Ethereum',
    marketCap: 2100000000,
    volume24h: 42000000,
    assets: 1456,
    transactions: 45678,
    change24h: 3.2,
    color: 'bg-blue-500',
  },
  {
    name: 'OneChain',
    marketCap: 1200000000,
    volume24h: 28000000,
    assets: 892,
    transactions: 23456,
    change24h: 8.7,
    color: 'bg-gold-500',
  },
  {
    name: 'Polygon',
    marketCap: 890000000,
    volume24h: 15000000,
    assets: 634,
    transactions: 34567,
    change24h: -1.5,
    color: 'bg-purple-500',
  },
  {
    name: 'BSC',
    marketCap: 410000000,
    volume24h: 4432000,
    assets: 280,
    transactions: 12345,
    change24h: 2.1,
    color: 'bg-yellow-500',
  },
];

export default function AnalyticsPage() {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d' | '1y'>('24h');
  const [activeTab, setActiveTab] = useState<'overview' | 'assets' | 'chains' | 'traders'>('overview');
  const [isLoading, setIsLoading] = useState(false);

  const refreshData = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  const MarketOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-gold-500 to-gold-600 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div className={cn(
              "flex items-center space-x-1 text-sm font-medium",
              mockMarketData.marketCapChange >= 0 ? "text-green-400" : "text-red-400"
            )}>
              {mockMarketData.marketCapChange >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>{formatPercentage(mockMarketData.marketCapChange)}</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {formatCurrency(mockMarketData.totalMarketCap)}
          </div>
          <div className="text-sm text-white/60">Total Market Cap</div>
        </GlassCard>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div className={cn(
              "flex items-center space-x-1 text-sm font-medium",
              mockMarketData.volumeChange >= 0 ? "text-green-400" : "text-red-400"
            )}>
              {mockMarketData.volumeChange >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>{formatPercentage(mockMarketData.volumeChange)}</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {formatCurrency(mockMarketData.totalVolume24h)}
          </div>
          <div className="text-sm text-white/60">24h Volume</div>
        </GlassCard>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
              <PieChart className="w-6 h-6 text-white" />
            </div>
            <div className={cn(
              "flex items-center space-x-1 text-sm font-medium",
              mockMarketData.assetsChange >= 0 ? "text-green-400" : "text-red-400"
            )}>
              {mockMarketData.assetsChange >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>{formatPercentage(mockMarketData.assetsChange)}</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {formatNumber(mockMarketData.totalAssets)}
          </div>
          <div className="text-sm text-white/60">Total Assets</div>
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
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className={cn(
              "flex items-center space-x-1 text-sm font-medium",
              mockMarketData.tradersChange >= 0 ? "text-green-400" : "text-red-400"
            )}>
              {mockMarketData.tradersChange >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>{formatPercentage(mockMarketData.tradersChange)}</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {formatNumber(mockMarketData.activeTraders)}
          </div>
          <div className="text-sm text-white/60">Active Traders</div>
        </GlassCard>
      </motion.div>
    </div>
  );

  const AssetTypeBreakdown = () => (
    <GlassCard className="p-6">
      <h3 className="text-xl font-bold text-white mb-6">Asset Type Performance</h3>
      <div className="space-y-4">
        {mockAssetTypeData.map((assetType, index) => {
          const IconComponent = assetType.icon;
          const marketShare = (assetType.marketCap / mockMarketData.totalMarketCap) * 100;
          
          return (
            <motion.div
              key={assetType.type}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center",
                  assetType.color
                )}>
                  <IconComponent className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="font-medium text-white">{assetType.name}</div>
                  <div className="text-sm text-white/60">
                    {assetType.assets.toLocaleString()} assets • {marketShare.toFixed(1)}% share
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-bold text-white">{formatCurrency(assetType.marketCap)}</div>
                <div className="text-sm text-white/60">{formatCurrency(assetType.volume24h)} volume</div>
                <div className={cn(
                  "text-sm font-medium flex items-center justify-end space-x-1",
                  assetType.change24h >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  {assetType.change24h >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>{formatPercentage(assetType.change24h)}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </GlassCard>
  );

  const ChainAnalytics = () => (
    <GlassCard className="p-6">
      <h3 className="text-xl font-bold text-white mb-6">Cross-Chain Analytics</h3>
      <div className="space-y-4">
        {mockChainData.map((chain, index) => {
          const marketShare = (chain.marketCap / mockMarketData.totalMarketCap) * 100;
          
          return (
            <motion.div
              key={chain.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className={cn("w-4 h-4 rounded-full", chain.color)} />
                <div>
                  <div className="font-medium text-white">{chain.name}</div>
                  <div className="text-sm text-white/60">
                    {chain.assets.toLocaleString()} assets • {chain.transactions.toLocaleString()} txs
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-bold text-white">{formatCurrency(chain.marketCap)}</div>
                <div className="text-sm text-white/60">{marketShare.toFixed(1)}% share</div>
                <div className={cn(
                  "text-sm font-medium flex items-center justify-end space-x-1",
                  chain.change24h >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  {chain.change24h >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>{formatPercentage(chain.change24h)}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </GlassCard>
  );

  const TopPerformers = () => (
    <GlassCard className="p-6">
      <h3 className="text-xl font-bold text-white mb-6">Top Performers (24h)</h3>
      <div className="space-y-3">
        {[
          { name: 'Swiss Gold Reserves', change: 4.8, volume: 567000, type: 'precious-metals' },
          { name: 'Manhattan Office Complex', change: 2.5, volume: 125000, type: 'real-estate' },
          { name: 'Texas Oil Wells', change: 2.1, volume: 234000, type: 'commodities' },
          { name: 'Amazon Carbon Credits', change: -0.5, volume: 89000, type: 'carbon-credits' },
        ].map((asset, index) => (
          <motion.div
            key={asset.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-gold-400 to-gold-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                {index + 1}
              </div>
              <div>
                <div className="font-medium text-white text-sm">{asset.name}</div>
                <div className="text-xs text-white/60">{formatCurrency(asset.volume)} volume</div>
              </div>
            </div>
            
            <div className={cn(
              "font-bold text-sm flex items-center space-x-1",
              asset.change >= 0 ? "text-green-400" : "text-red-400"
            )}>
              {asset.change >= 0 ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              <span>{formatPercentage(asset.change)}</span>
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
                Market Analytics
              </h1>
              <p className="text-white/60 mt-1">
                Real-time insights into the RWA marketplace
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex space-x-1 bg-white/5 rounded-xl p-1">
                {['24h', '7d', '30d', '1y'].map((timeframe) => (
                  <button
                    key={timeframe}
                    onClick={() => setSelectedTimeframe(timeframe as any)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-sm font-medium transition-all",
                      selectedTimeframe === timeframe
                        ? "bg-gold-500/20 text-gold-400"
                        : "text-white/60 hover:text-white"
                    )}
                  >
                    {timeframe}
                  </button>
                ))}
              </div>
              
              <button
                onClick={refreshData}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 border border-white/20 rounded-xl text-white hover:border-white/40 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                <span>Refresh</span>
              </button>
              
              <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-600 rounded-xl font-medium hover:from-gold-600 hover:to-gold-700 transition-all">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-1 mt-6 bg-white/5 rounded-xl p-1">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'assets', label: 'Asset Types', icon: PieChart },
              { id: 'chains', label: 'Chains', icon: Globe },
              { id: 'traders', label: 'Traders', icon: Users },
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
              <MarketOverview />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <AssetTypeBreakdown />
                <TopPerformers />
              </div>
              
              <ChainAnalytics />
            </motion.div>
          )}

          {activeTab === 'assets' && (
            <motion.div
              key="assets"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AssetTypeBreakdown />
            </motion.div>
          )}

          {activeTab === 'chains' && (
            <motion.div
              key="chains"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ChainAnalytics />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}