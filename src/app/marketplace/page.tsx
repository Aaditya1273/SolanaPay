"use client";

import React, { useState } from 'react';
import AssetCard from '@/components/marketplace/AssetCard';
import SimpleWallet from '@/components/wallet/SimpleWallet';
import TransactionModal from '@/components/marketplace/TransactionModal';
import { Filter, Search, LayoutGrid, List } from 'lucide-react';

// Expanded mock data for a richer marketplace experience
const mockAssets = [
  {
    id: 'RWA001',
    name: 'Manhattan Office Complex',
    type: 'Real Estate',
    price: 1250,
    image: '🏢',
    yield: 8.5,
    available: 1250,
    description: 'Fractional ownership of a prime commercial real estate property in downtown Manhattan.',
    verified: true,
    chain: 'Ethereum',
  },
  {
    id: 'RWA002',
    name: 'Amazon Carbon Credits',
    type: 'Carbon Credits',
    price: 85,
    image: '🌱',
    yield: 12.3,
    available: 25000,
    description: 'Verified carbon credits from a major Amazon rainforest preservation project.',
    verified: true,
    chain: 'Polygon',
  },
  {
    id: 'RWA003',
    name: 'Swiss Gold Reserves',
    type: 'Precious Metals',
    price: 2100,
    image: '🥇',
    yield: 5.2,
    available: 500,
    description: 'Tokenized ownership of physical gold stored in a secure Swiss vault.',
    verified: true,
    chain: 'BSC',
  },
  {
    id: 'RWA004',
    name: 'Vintage Wine Collection',
    type: 'Collectibles',
    price: 750,
    image: '🍷',
    yield: 15.1,
    available: 300,
    description: 'Shares in a curated collection of investment-grade vintage wines.',
    verified: false,
    chain: 'Solana',
  },
  {
    id: 'RWA005',
    name: 'Renewable Energy Bond',
    type: 'Bonds',
    price: 1000,
    image: '⚡',
    yield: 6.8,
    available: 10000,
    description: 'Corporate bond from a leading solar energy provider, funding new projects.',
    verified: true,
    chain: 'Ethereum',
  },
  {
    id: 'RWA006',
    name: 'Fine Art NFT (Banksy)',
    type: 'Art',
    price: 5500,
    image: '🎨',
    yield: 22.5, // Based on appreciation
    available: 100,
    description: 'Fractionalized NFT representing ownership of a physical Banksy artwork.',
    verified: true,
    chain: 'Polygon',
  },
];

export default function MarketplacePage() {
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleBuyClick = (asset: any) => {
    setSelectedAsset(asset);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAsset(null);
  };

  const handleConfirmTransaction = async () => {
    // Mock transaction logic
    console.log(`Processing purchase for ${selectedAsset?.name}`);
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate delay
    const success = Math.random() > 0.2; // 80% success rate
    console.log(success ? 'Transaction successful' : 'Transaction failed');
    return success;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6 text-white">
      <div className="max-w-7xl mx-auto">
        {/* Header and Wallet */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold">RWA Marketplace</h1>
            <p className="text-gray-300">Discover, trade, and invest in tokenized real-world assets.</p>
          </div>
          <SimpleWallet />
        </div>

        {/* Filters and Controls */}
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-4 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-gray-700/50 rounded-lg px-3">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search assets..."
              className="bg-transparent py-2 focus:outline-none w-full md:w-64"
            />
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 text-gray-300 hover:text-white">
              <Filter className="w-4 h-4" />
              Filters
            </button>
            <div className="flex items-center bg-gray-700/50 rounded-lg p-1">
              <button className="p-2 bg-gray-600 rounded-md">
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-white">
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Assets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockAssets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} onBuy={() => handleBuyClick(asset)} />
          ))}
        </div>
      </div>

      {/* Transaction Modal */}
      {selectedAsset && (
        <TransactionModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          assetName={selectedAsset.name}
          price={selectedAsset.price}
          onConfirm={handleConfirmTransaction}
        />
      )}
    </div>
  );
}