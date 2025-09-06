import { ethers } from 'ethers';

export interface WalletConnection {
  address: string;
  provider: ethers.BrowserProvider;
  walletType: string;
}

class WalletService {
  private currentConnection: WalletConnection | null = null;

  async connectMetaMask(): Promise<WalletConnection> {
    if (!window.ethereum?.isMetaMask) {
      throw new Error('MetaMask is not installed');
    }

    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    });

    if (accounts.length === 0) {
      throw new Error('No accounts found');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const connection: WalletConnection = {
      address: accounts[0],
      provider,
      walletType: 'MetaMask'
    };

    this.currentConnection = connection;
    return connection;
  }

  async connectCoinbaseWallet(): Promise<WalletConnection> {
    if (!window.ethereum?.isCoinbaseWallet) {
      throw new Error('Coinbase Wallet is not installed');
    }

    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    });

    if (accounts.length === 0) {
      throw new Error('No accounts found');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const connection: WalletConnection = {
      address: accounts[0],
      provider,
      walletType: 'Coinbase Wallet'
    };

    this.currentConnection = connection;
    return connection;
  }

  async connectTrustWallet(): Promise<WalletConnection> {
    if (!window.ethereum?.isTrust) {
      throw new Error('Trust Wallet is not installed');
    }

    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    });

    if (accounts.length === 0) {
      throw new Error('No accounts found');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const connection: WalletConnection = {
      address: accounts[0],
      provider,
      walletType: 'Trust Wallet'
    };

    this.currentConnection = connection;
    return connection;
  }

  async connectWalletConnect(): Promise<WalletConnection> {
    // For now, we'll use the default ethereum provider
    // In a full implementation, you'd integrate WalletConnect SDK
    if (!window.ethereum) {
      throw new Error('No wallet provider found');
    }

    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    });

    if (accounts.length === 0) {
      throw new Error('No accounts found');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const connection: WalletConnection = {
      address: accounts[0],
      provider,
      walletType: 'WalletConnect'
    };

    this.currentConnection = connection;
    return connection;
  }

  async connectWallet(walletId: string): Promise<WalletConnection> {
    switch (walletId) {
      case 'metamask':
        return this.connectMetaMask();
      case 'coinbase':
        return this.connectCoinbaseWallet();
      case 'trust':
        return this.connectTrustWallet();
      case 'walletconnect':
        return this.connectWalletConnect();
      default:
        throw new Error(`Unsupported wallet: ${walletId}`);
    }
  }

  getCurrentConnection(): WalletConnection | null {
    return this.currentConnection;
  }

  disconnect(): void {
    this.currentConnection = null;
  }

  async checkExistingConnection(): Promise<WalletConnection | null> {
    if (!window.ethereum) {
      return null;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const connection: WalletConnection = {
          address: accounts[0],
          provider,
          walletType: this.detectWalletType()
        };
        this.currentConnection = connection;
        return connection;
      }
    } catch (error) {
      console.error('Error checking existing connection:', error);
    }

    return null;
  }

  private detectWalletType(): string {
    if (window.ethereum?.isMetaMask) return 'MetaMask';
    if (window.ethereum?.isCoinbaseWallet) return 'Coinbase Wallet';
    if (window.ethereum?.isTrust) return 'Trust Wallet';
    return 'Unknown Wallet';
  }
}

export const walletService = new WalletService();
