import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { getChainById, getChainMetadata, isChainSupported, defaultChain, type SupportedChainId } from '../config/wagmi';

interface MultiChainWalletContextType {
  // Connection state
  isConnected: boolean;
  address?: string;
  chainId: number;
  
  // Chain management
  currentChain: any;
  supportedChains: any[];
  switchToChain: (chainId: SupportedChainId) => Promise<void>;
  isChainSupported: boolean;
  
  // Connection methods
  connect: (connectorId?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  
  // UI state
  isConnecting: boolean;
  isSwitching: boolean;
  error: string | null;
  
  // Multi-chain balances
  balances: Record<number, string>;
  refreshBalances: () => Promise<void>;
}

const MultiChainWalletContext = createContext<MultiChainWalletContextType | undefined>(undefined);

export const useMultiChainWallet = () => {
  const context = useContext(MultiChainWalletContext);
  if (!context) {
    throw new Error('useMultiChainWallet must be used within a MultiChainWalletProvider');
  }
  return context;
};

export const MultiChainWalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { address, isConnected } = useAccount();
  const { connect: wagmiConnect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  
  const [error, setError] = useState<string | null>(null);
  const [balances, setBalances] = useState<Record<number, string>>({});

  // Get current chain info
  const currentChain = getChainById(chainId);
  const chainMetadata = getChainMetadata(chainId);
  const isCurrentChainSupported = isChainSupported(chainId);

  // Connect to wallet
  const connect = async (connectorId?: string) => {
    try {
      setError(null);
      const connector = connectorId 
        ? connectors.find(c => c.id === connectorId) 
        : connectors[0];
      
      if (connector) {
        await wagmiConnect({ connector });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    }
  };

  // Disconnect wallet
  const disconnect = async () => {
    try {
      setError(null);
      await wagmiDisconnect();
      setBalances({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect wallet');
    }
  };

  // Switch to specific chain
  const switchToChain = async (targetChainId: SupportedChainId) => {
    try {
      setError(null);
      await switchChain({ chainId: targetChainId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch chain');
    }
  };

  // Refresh balances across all chains
  const refreshBalances = async () => {
    if (!address || !isConnected) return;

    try {
      // This would typically fetch balances from each chain
      // For now, we'll use mock data
      const mockBalances = {
        1: '1.234', // Ethereum
        137: '5.678', // Polygon
        56: '2.345', // BSC
      };
      
      setBalances(mockBalances);
    } catch (err) {
      console.error('Failed to refresh balances:', err);
    }
  };

  // Auto-refresh balances when connected
  useEffect(() => {
    if (isConnected && address) {
      refreshBalances();
    }
  }, [isConnected, address, chainId]);

  // Auto-switch to supported chain if current chain is not supported
  useEffect(() => {
    if (isConnected && !isCurrentChainSupported) {
      console.log('Unsupported chain detected, switching to default chain');
      switchToChain(defaultChain.id as SupportedChainId);
    }
  }, [isConnected, isCurrentChainSupported]);

  const value: MultiChainWalletContextType = {
    // Connection state
    isConnected,
    address,
    chainId,
    
    // Chain management
    currentChain,
    supportedChains: [
      { id: 1, name: 'Ethereum', ...getChainMetadata(1) },
      { id: 137, name: 'Polygon', ...getChainMetadata(137) },
      { id: 56, name: 'BNB Smart Chain', ...getChainMetadata(56) },
    ],
    switchToChain,
    isChainSupported: isCurrentChainSupported,
    
    // Connection methods
    connect,
    disconnect,
    
    // UI state
    isConnecting,
    isSwitching,
    error,
    
    // Multi-chain balances
    balances,
    refreshBalances,
  };

  return (
    <MultiChainWalletContext.Provider value={value}>
      {children}
    </MultiChainWalletContext.Provider>
  );
};
