"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { web3AuthService, IProvider } from '@/lib/web3auth';

interface WalletContextType {
  provider: IProvider | null;
  address: string | null;
  balance: string | null;
  isConnected: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getUserInfo: () => Promise<any>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [provider, setProvider] = useState<IProvider | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        await web3AuthService.init();
        if (web3AuthService.isConnected()) {
          const web3authProvider = web3AuthService.getProvider();
          setProvider(web3authProvider);
          await fetchWalletData(web3authProvider);
        }
      } catch (error) {
        console.error("Failed to initialize wallet:", error);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const fetchWalletData = async (p: IProvider | null) => {
    if (!p) return;
    try {
      const accounts = await p.request({ method: 'eth_accounts' }) as string[];
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        const balance = await p.request({ method: 'eth_getBalance', params: [accounts[0], 'latest'] }) as string;
        setBalance(balance);
        setIsConnected(true);
      }
    } catch (error) {
      console.error("Failed to fetch wallet data:", error);
    }
  };

  const login = async () => {
    setIsLoading(true);
    try {
      const web3authProvider = await web3AuthService.login();
      setProvider(web3authProvider);
      await fetchWalletData(web3authProvider);
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await web3AuthService.logout();
      setProvider(null);
      setAddress(null);
      setBalance(null);
      setIsConnected(false);
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getUserInfo = async () => {
    return await web3AuthService.getUserInfo();
  };

  return (
    <WalletContext.Provider value={{ provider, address, balance, isConnected, isLoading, login, logout, getUserInfo }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
