import { Web3Auth } from "@web3auth/modal";
import { CHAIN_NAMESPACES, IProvider, WEB3AUTH_NETWORK } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { SolanaPrivateKeyProvider } from "@web3auth/solana-provider";
import { MetamaskAdapter } from "@web3auth/metamask-adapter";
import { OpenloginAdapter } from "@web3auth/openlogin-adapter";
import { WalletConnectV2Adapter } from "@web3auth/wallet-connect-v2-adapter";

// Chain configurations
const ethereumChainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0x1", // Ethereum Mainnet
  rpcTarget: "https://rpc.ankr.com/eth",
  displayName: "Ethereum Mainnet",
  blockExplorer: "https://etherscan.io",
  ticker: "ETH",
  tickerName: "Ethereum",
};

const polygonChainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0x89", // Polygon Mainnet
  rpcTarget: "https://rpc.ankr.com/polygon",
  displayName: "Polygon Mainnet",
  blockExplorer: "https://polygonscan.com",
  ticker: "MATIC",
  tickerName: "Polygon",
};

const solanaChainConfig = {
  chainNamespace: CHAIN_NAMESPACES.SOLANA,
  chainId: "0x1", // Solana Mainnet
  rpcTarget: "https://api.mainnet-beta.solana.com",
  displayName: "Solana Mainnet",
  blockExplorer: "https://explorer.solana.com",
  ticker: "SOL",
  tickerName: "Solana",
};

class Web3AuthService {
  private web3auth: Web3Auth | null = null;
  private provider: IProvider | null = null;

  async init() {
    try {
      const clientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID;
      if (!clientId) {
        throw new Error("Web3Auth Client ID not found in environment variables");
      }

      // Initialize the private key providers
      const ethereumProvider = new EthereumPrivateKeyProvider({
        config: { chainConfig: ethereumChainConfig },
      });

      const solanaProvider = new SolanaPrivateKeyProvider({
        config: { chainConfig: solanaChainConfig },
      });

      this.web3auth = new Web3Auth({
        clientId,
        web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
        chainConfig: ethereumChainConfig,
        privateKeyProvider: ethereumProvider,
        uiConfig: {
          appName: "SolanaFlow",
          appUrl: "https://omniflow.io",
          logoLight: "https://omniflow.io/logo-light.svg",
          logoDark: "https://omniflow.io/logo-dark.svg",
          defaultLanguage: "en",
          mode: "dark",
          theme: {
            primary: "#8B5CF6",
          },
        },
      });

      // Configure MetaMask Adapter
      const metamaskAdapter = new MetamaskAdapter({
        clientId,
        sessionTime: 3600 * 24 * 7, // 7 days
        web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
        chainConfig: ethereumChainConfig,
      });

      // Configure OpenLogin Adapter for social logins
      const openloginAdapter = new OpenloginAdapter({
        loginSettings: {
          mfaLevel: "optional",
        },
        adapterSettings: {
          uxMode: "popup",
          whiteLabel: {
            appName: "SolanaFlow RWA Marketplace",
            appUrl: "https://omniflow.io",
            logoLight: "https://omniflow.io/logo-light.svg",
            logoDark: "https://omniflow.io/logo-dark.svg",
            defaultLanguage: "en",
            mode: "dark",
            theme: {
              primary: "#8B5CF6",
            },
          },
        },
      });

      // Configure WalletConnect V2 Adapter
      const walletConnectV2Adapter = new WalletConnectV2Adapter({
        adapterSettings: {
          qrcodeModal: null,
          walletConnectInitOptions: {
            projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "",
            metadata: {
              name: "SolanaFlow",
              description: "Cross-Chain RWA Marketplace with Identity",
              url: "https://omniflow.io",
              icons: ["https://omniflow.io/logo.svg"],
            },
          },
        },
        loginSettings: {
          mfaLevel: "optional",
        },
        chainConfig: ethereumChainConfig,
      });

      // Configure adapters
      this.web3auth.configureAdapter(metamaskAdapter);
      this.web3auth.configureAdapter(openloginAdapter);
      this.web3auth.configureAdapter(walletConnectV2Adapter);

      await this.web3auth.initModal();
      
      if (this.web3auth.connected) {
        this.provider = this.web3auth.provider;
      }

      return this.web3auth;
    } catch (error) {
      console.error("Error initializing Web3Auth:", error);
      throw error;
    }
  }

  async login(loginProvider?: string) {
    if (!this.web3auth) {
      throw new Error("Web3Auth not initialized");
    }

    try {
      const web3authProvider = await this.web3auth.connect();
      this.provider = web3authProvider;
      return web3authProvider;
    } catch (error) {
      console.error("Error logging in:", error);
      throw error;
    }
  }

  async logout() {
    if (!this.web3auth) {
      throw new Error("Web3Auth not initialized");
    }

    try {
      await this.web3auth.logout();
      this.provider = null;
    } catch (error) {
      console.error("Error logging out:", error);
      throw error;
    }
  }

  async getUserInfo() {
    if (!this.web3auth) {
      throw new Error("Web3Auth not initialized");
    }

    try {
      const user = await this.web3auth.getUserInfo();
      return user;
    } catch (error) {
      console.error("Error getting user info:", error);
      throw error;
    }
  }

  async getAccounts() {
    if (!this.provider) {
      throw new Error("Provider not available");
    }

    try {
      const accounts = await this.provider.request({
        method: "eth_accounts",
      });
      return accounts;
    } catch (error) {
      console.error("Error getting accounts:", error);
      throw error;
    }
  }

  async getBalance() {
    if (!this.provider) {
      throw new Error("Provider not available");
    }

    try {
      const accounts = await this.getAccounts();
      const balance = await this.provider.request({
        method: "eth_getBalance",
        params: [accounts[0], "latest"],
      });
      return balance;
    } catch (error) {
      console.error("Error getting balance:", error);
      throw error;
    }
  }

  async switchChain(chainId: string) {
    if (!this.provider) {
      throw new Error("Provider not available");
    }

    try {
      await this.provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId }],
      });
    } catch (error) {
      console.error("Error switching chain:", error);
      throw error;
    }
  }

  async addChain(chainConfig: any) {
    if (!this.provider) {
      throw new Error("Provider not available");
    }

    try {
      await this.provider.request({
        method: "wallet_addEthereumChain",
        params: [chainConfig],
      });
    } catch (error) {
      console.error("Error adding chain:", error);
      throw error;
    }
  }

  getProvider() {
    return this.provider;
  }

  isConnected() {
    return this.web3auth?.connected || false;
  }
}

// Export singleton instance
export const web3AuthService = new Web3AuthService();

// Export types and configurations
export { ethereumChainConfig, polygonChainConfig, solanaChainConfig };
export type { IProvider };
