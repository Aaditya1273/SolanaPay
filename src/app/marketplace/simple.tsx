"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Eye, Star, TrendingUp } from "lucide-react";

interface RWAAsset {
  id: string;
  name: string;
  type: string;
  price: number;
  image: string;
  yield: number;
  available: number;
}

const assets: RWAAsset[] = [
  {
    id: "1",
    name: "NYC Real Estate Token",
    type: "Real Estate",
    price: 2500,
    image: "🏢",
    yield: 8.5,
    available: 100
  },
  {
    id: "2", 
    name: "Gold Reserve NFT",
    type: "Precious Metals",
    price: 5000,
    image: "🥇",
    yield: 5.2,
    available: 50
  },
  {
    id: "3",
    name: "Carbon Credit Token",
    type: "Environmental",
    price: 45,
    image: "🌱",
    yield: 12.3,
    available: 1000
  }
];

export default function SimpleMarketplace() {
  const [cart, setCart] = useState<string[]>([]);

  const buyAsset = (assetId: string) => {
    setCart([...cart, assetId]);
    alert("Asset added to cart! (Mock transaction)");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">RWA Marketplace</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {assets.map((asset) => (
            <motion.div
              key={asset.id}
              className="bg-gray-800/50 rounded-xl p-6 border border-gray-700"
              whileHover={{ scale: 1.02 }}
            >
              <div className="text-4xl mb-4">{asset.image}</div>
              <h3 className="text-white font-bold text-xl mb-2">{asset.name}</h3>
              <p className="text-gray-400 mb-4">{asset.type}</p>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Price:</span>
                  <span className="text-white font-bold">${asset.price}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Yield:</span>
                  <span className="text-green-400">{asset.yield}% APY</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Available:</span>
                  <span className="text-white">{asset.available}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => buyAsset(asset.id)}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Buy Now
                </button>
                <button className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-400">Cart: {cart.length} items</p>
        </div>
      </div>
    </div>
  );
}
