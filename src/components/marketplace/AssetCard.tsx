"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Eye, Star, TrendingUp, Shield, Zap } from "lucide-react";

interface Asset {
  id: string;
  name: string;
  type: string;
  price: number;
  image: string;
  yield: number;
  available: number;
  description: string;
  verified: boolean;
  chain: string;
}

interface AssetCardProps {
  asset: Asset;
  onBuy: (assetId: string) => void;
}

export default function AssetCard({ asset, onBuy }: AssetCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleBuy = async () => {
    setIsLoading(true);
    // Simulate transaction delay
    setTimeout(() => {
      onBuy(asset.id);
      setIsLoading(false);
    }, 2000);
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
    <motion.div
      className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-all"
      whileHover={{ scale: 1.02 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Asset Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-4xl">{asset.image}</div>
          <div className="flex flex-col gap-1">
            <div className={`px-2 py-1 rounded-full text-xs text-white ${getChainColor(asset.chain)}`}>
              {asset.chain}
            </div>
            {asset.verified && (
              <div className="flex items-center gap-1 text-green-400 text-xs">
                <Shield className="w-3 h-3" />
                Verified
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 text-yellow-400 fill-current" />
          <span className="text-white text-sm">4.8</span>
        </div>
      </div>

      {/* Asset Info */}
      <h3 className="text-white font-bold text-xl mb-2 line-clamp-2">
        {asset.name}
      </h3>
      
      <p className="text-gray-400 text-sm mb-4 line-clamp-2">
        {asset.description}
      </p>

      <div className="space-y-3 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Price per Token</span>
          <span className="text-white font-bold text-lg">${asset.price.toLocaleString()}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Expected Yield</span>
          <span className="text-green-400 font-medium flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            {asset.yield}% APY
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Available Tokens</span>
          <span className="text-white font-medium">{asset.available.toLocaleString()}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Asset Type</span>
          <span className="text-blue-400 font-medium">{asset.type}</span>
        </div>
      </div>

      {/* Progress Bar for Availability */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Sold</span>
          <span>{Math.floor(Math.random() * 30)}% sold</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.floor(Math.random() * 30)}%` }}
          ></div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button 
          onClick={handleBuy}
          disabled={isLoading}
          className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-600 disabled:to-gray-700 text-white py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Processing...
            </>
          ) : (
            <>
              <ShoppingCart className="w-4 h-4" />
              Buy Now
            </>
          )}
        </button>
        
        <button className="p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
          <Eye className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Stats */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex justify-between text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-yellow-400" />
            <span>Instant Settlement</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-green-400" />
            <span>Insured</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
