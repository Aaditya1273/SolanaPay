"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { formatDate } from "@/lib/date-utils";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Globe,
  Shield,
  Zap,
  Eye,
  RefreshCw,
  ExternalLink,
  DollarSign,
  Activity,
  BarChart3,
  ArrowRightLeft,
  Coins,
  Star
} from "lucide-react";

interface Asset {
  id: string;
  name: string;
  type: string;
  value: number;
  change24h: number;
  yield: number;
  fractions: number;
  chain: string;
  image: string;
}

const mockAssets: Asset[] = [
  {
    id: "1",
    name: "Manhattan Office Complex",
    type: "Real Estate",
    value: 312500,
    change24h: 2.5,
    yield: 8.5,
    fractions: 125,
    chain: "Ethereum",
    image: "🏢"
  },
  {
    id: "2", 
    name: "Amazon Carbon Credits",
    type: "Carbon Credits",
    value: 112500,
    change24h: -1.2,
    yield: 12.3,
    fractions: 2500,
    chain: "Polygon",
    image: "🌱"
  },
  {
    id: "3",
    name: "Swiss Gold Reserves", 
    type: "Precious Metals",
    value: 3100000,
    change24h: 4.8,
    yield: 5.2,
    fractions: 25,
    chain: "BSC",
    image: "🥇"
  }
];

export default function SimpleDashboard() {
  const [assets, setAssets] = useState<Asset[]>(mockAssets);
  const [isLoading, setIsLoading] = useState(false);

  const formatCurrency = (value: number) => {
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toLocaleString()}`;
  };

  const getChainColor = (chain: string) => {
    switch (chain) {
      case "Ethereum": return "bg-blue-500";
      case "Polygon": return "bg-purple-500"; 
      case "BSC": return "bg-yellow-500";
      case "Solana": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Portfolio Dashboard
            </h1>
            <p className="text-gray-300">
              Track your RWA investments and performance
            </p>
          </div>
          <div className="flex gap-4">
            <button className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors">
              + Add Asset
            </button>
            <button className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors">
              Marketplace
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div 
            className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center justify-between mb-4">
              <Wallet className="w-8 h-8 text-blue-400" />
              <span className="text-green-400 text-sm flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                +12.5%
              </span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">$3.53M</h3>
            <p className="text-gray-400 text-sm">Total Portfolio Value</p>
          </motion.div>

          <motion.div 
            className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center justify-between mb-4">
              <Activity className="w-8 h-8 text-green-400" />
              <span className="text-green-400 text-sm">8.7% APY</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">$287K</h3>
            <p className="text-gray-400 text-sm">Annual Yield</p>
          </motion.div>

          <motion.div 
            className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center justify-between mb-4">
              <Coins className="w-8 h-8 text-purple-400" />
              <span className="text-blue-400 text-sm">2,650 total</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">3</h3>
            <p className="text-gray-400 text-sm">Active Assets</p>
          </motion.div>

          <motion.div 
            className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center justify-between mb-4">
              <Globe className="w-8 h-8 text-orange-400" />
              <span className="text-green-400 text-sm">Multi-chain</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">4</h3>
            <p className="text-gray-400 text-sm">Supported Chains</p>
          </motion.div>
        </div>

        {/* Assets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assets.map((asset) => (
            <motion.div
              key={asset.id}
              className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-all"
              whileHover={{ scale: 1.02 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Asset Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{asset.image}</div>
                  <div className={`px-2 py-1 rounded-full text-xs text-white ${getChainColor(asset.chain)}`}>
                    {asset.chain}
                  </div>
                </div>
                <button className="text-gray-400 hover:text-white">
                  <Eye className="w-5 h-5" />
                </button>
              </div>

              {/* Asset Info */}
              <h3 className="text-white font-semibold text-lg mb-2 line-clamp-2">
                {asset.name}
              </h3>
              
              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Holdings</span>
                  <span className="text-white font-medium">{asset.fractions} fractions</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Current Value</span>
                  <span className="text-white font-bold">{formatCurrency(asset.value)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">24h Change</span>
                  <span className={`font-medium flex items-center ${
                    asset.change24h >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {asset.change24h >= 0 ? (
                      <TrendingUp className="w-4 h-4 mr-1" />
                    ) : (
                      <TrendingDown className="w-4 h-4 mr-1" />
                    )}
                    {asset.change24h >= 0 ? '+' : ''}{asset.change24h}%
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Yield</span>
                  <span className="text-green-400 font-medium">{asset.yield}% APY</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg font-medium transition-colors">
                  Trade
                </button>
                <button className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
                  <ExternalLink className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700">
          <h3 className="text-white font-semibold text-lg mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="flex items-center gap-3 p-4 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-colors">
              <ArrowRightLeft className="w-6 h-6 text-blue-400" />
              <span className="text-white font-medium">Bridge Assets</span>
            </button>
            <button className="flex items-center gap-3 p-4 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-colors">
              <Shield className="w-6 h-6 text-green-400" />
              <span className="text-white font-medium">Verify Identity</span>
            </button>
            <button className="flex items-center gap-3 p-4 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-colors">
              <Zap className="w-6 h-6 text-yellow-400" />
              <span className="text-white font-medium">Stake Rewards</span>
            </button>
            <button className="flex items-center gap-3 p-4 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-colors">
              <BarChart3 className="w-6 h-6 text-purple-400" />
              <span className="text-white font-medium">Analytics</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
