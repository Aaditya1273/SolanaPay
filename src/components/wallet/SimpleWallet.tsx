"use client";

import React from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { Wallet, CheckCircle, Loader } from 'lucide-react';
import { formatEther } from 'viem';

export default function SimpleWallet() {
  const { isConnected, address, balance, login, logout, isLoading } = useWallet();

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  if (isLoading) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 flex items-center gap-2">
        <Loader className="w-4 h-4 animate-spin" />
        <span className="text-sm">Initializing...</span>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
      {!isConnected ? (
        <button
          onClick={login}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Wallet className="w-4 h-4" />
          Connect Wallet
        </button>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-white text-sm font-medium">{address ? formatAddress(address) : '...'}</p>
              <p className="text-green-400 text-xs">{balance ? `${parseFloat(formatEther(BigInt(balance))).toFixed(4)} ETH` : '...'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="text-gray-400 hover:text-white text-sm"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
