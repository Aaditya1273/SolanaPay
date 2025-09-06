import { Web3Auth } from "@web3auth/modal";
import { CHAIN_NAMESPACES, IProvider, WEB3AUTH_NETWORK } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { ethers } from "ethers";

// Web3Auth configuration
const clientId = import.meta.env.VITE_WEB3AUTH_CLIENT_ID || "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ";

const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0x1", // Ethereum Mainnet
  rpcTarget: "https://rpc.ankr.com/eth",
  displayName: "Ethereum Mainnet",
  blockExplorer: "https://etherscan.io",
  ticker: "ETH",
  tickerName: "Ethereum",
};

const privateKeyProvider = new EthereumPrivateKeyProvider({
  config: { chainConfig },
});

const web3auth = new Web3Auth({
  clientId,
  web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
  privateKeyProvider,
});

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  profileImage?: string;
  walletAddress: string;
  provider: string;
  idToken?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  provider: IProvider | null;
  loading: boolean;
}

class Web3AuthService {
  private isInitialized = false;
  private authState: AuthState = {
    isAuthenticated: false,
    user: null,
    provider: null,
    loading: false,
  };

  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await web3auth.initModal();
      this.isInitialized = true;

      // Check if user is already connected
      if (web3auth.connected) {
        await this.setUserInfo();
      }
    } catch (error) {
      console.error("Web3Auth initialization failed:", error);
      throw error;
    }
  }

  async loginWithSocial(provider: 'google' | 'facebook' | 'twitter' | 'discord' | 'github'): Promise<AuthUser> {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      this.authState.loading = true;
      
      const web3authProvider = await web3auth.connect({
        verifier: provider,
      });

      if (!web3authProvider) {
        throw new Error("Failed to connect with Web3Auth");
      }

      this.authState.provider = web3authProvider;
      await this.setUserInfo();

      // Save session
      await this.saveSession();

      return this.authState.user!;
    } catch (error) {
      console.error(`${provider} login failed:`, error);
      throw error;
    } finally {
      this.authState.loading = false;
    }
  }

  async loginWithEmail(email: string, password: string): Promise<AuthUser> {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      this.authState.loading = true;

      const web3authProvider = await web3auth.connect({
        verifier: "email_passwordless",
        verifierParams: {
          login_hint: email,
        },
      });

      if (!web3authProvider) {
        throw new Error("Failed to connect with email");
      }

      this.authState.provider = web3authProvider;
      await this.setUserInfo();

      // Save session
      await this.saveSession();

      return this.authState.user!;
    } catch (error) {
      console.error("Email login failed:", error);
      throw error;
    } finally {
      this.authState.loading = false;
    }
  }

  async loginWithMetaMask(): Promise<AuthUser> {
    try {
      this.authState.loading = true;

      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask not installed');
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      // Create user object for MetaMask
      const user: AuthUser = {
        id: address,
        walletAddress: address,
        provider: 'metamask',
        name: `MetaMask User`,
      };

      this.authState.isAuthenticated = true;
      this.authState.user = user;
      this.authState.provider = window.ethereum;

      // Save session
      await this.saveSession();

      return user;
    } catch (error) {
      console.error("MetaMask login failed:", error);
      throw error;
    } finally {
      this.authState.loading = false;
    }
  }

  async logout(): Promise<void> {
    try {
      if (web3auth.connected) {
        await web3auth.logout();
      }

      this.authState = {
        isAuthenticated: false,
        user: null,
        provider: null,
        loading: false,
      };

      // Clear session
      this.clearSession();
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  }

  async getUserInfo(): Promise<any> {
    if (!web3auth.connected) {
      return null;
    }

    try {
      return await web3auth.getUserInfo();
    } catch (error) {
      console.error("Failed to get user info:", error);
      return null;
    }
  }

  async getWalletAddress(): Promise<string | null> {
    if (!this.authState.provider) {
      return null;
    }

    try {
      if (this.authState.user?.provider === 'metamask') {
        return this.authState.user.walletAddress;
      }

      const ethersProvider = new ethers.BrowserProvider(this.authState.provider);
      const signer = await ethersProvider.getSigner();
      return await signer.getAddress();
    } catch (error) {
      console.error("Failed to get wallet address:", error);
      return null;
    }
  }

  async signMessage(message: string): Promise<string> {
    if (!this.authState.provider) {
      throw new Error("No provider available");
    }

    try {
      if (this.authState.user?.provider === 'metamask') {
        return await window.ethereum.request({
          method: 'personal_sign',
          params: [message, this.authState.user.walletAddress],
        });
      }

      const ethersProvider = new ethers.BrowserProvider(this.authState.provider);
      const signer = await ethersProvider.getSigner();
      return await signer.signMessage(message);
    } catch (error) {
      console.error("Failed to sign message:", error);
      throw error;
    }
  }

  getAuthState(): AuthState {
    return { ...this.authState };
  }

  isConnected(): boolean {
    return this.authState.isAuthenticated;
  }

  private async setUserInfo(): Promise<void> {
    try {
      const userInfo = await this.getUserInfo();
      const walletAddress = await this.getWalletAddress();

      if (!walletAddress) {
        throw new Error("Failed to get wallet address");
      }

      this.authState.user = {
        id: userInfo?.sub || walletAddress,
        email: userInfo?.email,
        name: userInfo?.name,
        profileImage: userInfo?.profileImage,
        walletAddress,
        provider: userInfo?.aggregateVerifier || 'web3auth',
        idToken: userInfo?.idToken,
      };

      this.authState.isAuthenticated = true;
    } catch (error) {
      console.error("Failed to set user info:", error);
      throw error;
    }
  }

  private async saveSession(): Promise<void> {
    try {
      if (this.authState.user) {
        localStorage.setItem('solanapay_auth_user', JSON.stringify(this.authState.user));
        localStorage.setItem('solanapay_auth_connected', 'true');
      }
    } catch (error) {
      console.error("Failed to save session:", error);
    }
  }

  private clearSession(): void {
    try {
      localStorage.removeItem('solanapay_auth_user');
      localStorage.removeItem('solanapay_auth_connected');
    } catch (error) {
      console.error("Failed to clear session:", error);
    }
  }

  async restoreSession(): Promise<boolean> {
    try {
      const savedUser = localStorage.getItem('solanapay_auth_user');
      const isConnected = localStorage.getItem('solanapay_auth_connected');

      if (!savedUser || !isConnected) {
        return false;
      }

      const user: AuthUser = JSON.parse(savedUser);

      // Verify the session is still valid
      if (user.provider === 'metamask') {
        // Check MetaMask connection
        if (typeof window.ethereum !== 'undefined') {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0 && accounts[0] === user.walletAddress) {
            this.authState.isAuthenticated = true;
            this.authState.user = user;
            this.authState.provider = window.ethereum;
            return true;
          }
        }
      } else {
        // Check Web3Auth connection
        if (!this.isInitialized) {
          await this.init();
        }

        if (web3auth.connected) {
          await this.setUserInfo();
          return true;
        }
      }

      // Session is invalid, clear it
      this.clearSession();
      return false;
    } catch (error) {
      console.error("Failed to restore session:", error);
      this.clearSession();
      return false;
    }
  }
}

export const web3AuthService = new Web3AuthService();
export default web3AuthService;
