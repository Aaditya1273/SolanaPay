import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { createSmartAccountClient, ENTRYPOINT_ADDRESS_V06 } from 'permissionless';
import { signerToSimpleSmartAccount } from 'permissionless/accounts';
import { createPimlicoPaymasterClient, createPimlicoBundlerClient } from 'permissionless/clients/pimlico';
import { createPublicClient, http, Address, Chain } from 'viem';

interface SmartAccount {
  address: Address;
  isDeployed: boolean;
  balance: bigint;
  nonce: number;
}

interface PaymasterConfig {
  isEnabled: boolean;
  sponsorshipAvailable: boolean;
  gasLimit: number;
  dailyLimit: number;
  dailySpent: number;
  merchantDeposit: number;
}

interface AccountAbstractionContextType {
  // Smart Account
  smartAccount: SmartAccount | null;
  isSmartAccountLoading: boolean;
  createSmartAccount: () => Promise<void>;
  
  // Gasless Transactions
  isGaslessEnabled: boolean;
  setGaslessEnabled: (enabled: boolean) => void;
  paymasterConfig: PaymasterConfig | null;
  
  // Transaction Methods
  sendUserOperation: (to: Address, data: `0x${string}`, value?: bigint) => Promise<string>;
  estimateUserOperationGas: (to: Address, data: `0x${string}`, value?: bigint) => Promise<bigint>;
  
  // Paymaster
  checkGasSponsorship: (merchant: Address, gasAmount: bigint) => Promise<boolean>;
  createPaymentSession: (customer: Address, amount: bigint, token: Address) => Promise<string>;
  
  // Utils
  isAccountAbstractionSupported: boolean;
  error: string | null;
}

const AccountAbstractionContext = createContext<AccountAbstractionContextType | undefined>(undefined);

interface AccountAbstractionProviderProps {
  children: ReactNode;
}

export const AccountAbstractionProvider: React.FC<AccountAbstractionProviderProps> = ({ children }) => {
  const { address, isConnected, chain } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [smartAccount, setSmartAccount] = useState<SmartAccount | null>(null);
  const [isSmartAccountLoading, setIsSmartAccountLoading] = useState(false);
  const [isGaslessEnabled, setGaslessEnabled] = useState(false);
  const [paymasterConfig, setPaymasterConfig] = useState<PaymasterConfig | null>(null);
  const [smartAccountClient, setSmartAccountClient] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if current chain supports account abstraction
  const isAccountAbstractionSupported = chain?.id === 137 || chain?.id === 1 || chain?.id === 56; // Polygon, Ethereum, BSC

  // Pimlico API configuration (mock endpoints for demo)
  const getPimlicoEndpoints = (chainId: number) => {
    const endpoints = {
      1: {
        bundler: `https://api.pimlico.io/v1/ethereum/rpc?apikey=mock-api-key`,
        paymaster: `https://api.pimlico.io/v2/ethereum/rpc?apikey=mock-api-key`
      },
      137: {
        bundler: `https://api.pimlico.io/v1/polygon/rpc?apikey=mock-api-key`,
        paymaster: `https://api.pimlico.io/v2/polygon/rpc?apikey=mock-api-key`
      },
      56: {
        bundler: `https://api.pimlico.io/v1/bsc/rpc?apikey=mock-api-key`,
        paymaster: `https://api.pimlico.io/v2/bsc/rpc?apikey=mock-api-key`
      }
    };
    return endpoints[chainId as keyof typeof endpoints];
  };

  // Create smart account
  const createSmartAccount = async () => {
    if (!walletClient || !chain || !isAccountAbstractionSupported) {
      setError('Wallet not connected or chain not supported');
      return;
    }

    setIsSmartAccountLoading(true);
    setError(null);

    try {
      // Create simple smart account
      const simpleSmartAccount = await signerToSimpleSmartAccount(publicClient!, {
        signer: walletClient,
        entryPoint: ENTRYPOINT_ADDRESS_V06,
      });

      const endpoints = getPimlicoEndpoints(chain.id);
      if (!endpoints) {
        throw new Error('Chain not supported for account abstraction');
      }

      // Create bundler client
      const bundlerClient = createPimlicoBundlerClient({
        transport: http(endpoints.bundler),
        entryPoint: ENTRYPOINT_ADDRESS_V06,
      });

      // Create paymaster client
      const paymasterClient = createPimlicoPaymasterClient({
        transport: http(endpoints.paymaster),
        entryPoint: ENTRYPOINT_ADDRESS_V06,
      });

      // Create smart account client
      const smartClient = createSmartAccountClient({
        account: simpleSmartAccount,
        entryPoint: ENTRYPOINT_ADDRESS_V06,
        chain: chain as Chain,
        bundlerTransport: http(endpoints.bundler),
        middleware: {
          gasPrice: async () => (await bundlerClient.getUserOperationGasPrice()).fast,
          sponsorUserOperation: paymasterClient.sponsorUserOperation,
        },
      });

      setSmartAccountClient(smartClient);

      // Get smart account info
      const accountAddress = simpleSmartAccount.address;
      const balance = await publicClient!.getBalance({ address: accountAddress });
      const nonce = await simpleSmartAccount.getNonce();

      // Check if account is deployed
      const code = await publicClient!.getBytecode({ address: accountAddress });
      const isDeployed = code !== undefined && code !== '0x';

      setSmartAccount({
        address: accountAddress,
        isDeployed,
        balance,
        nonce
      });

      // Load paymaster configuration
      await loadPaymasterConfig();

    } catch (err) {
      console.error('Failed to create smart account:', err);
      setError(err instanceof Error ? err.message : 'Failed to create smart account');
    } finally {
      setIsSmartAccountLoading(false);
    }
  };

  // Load paymaster configuration
  const loadPaymasterConfig = async () => {
    try {
      // Mock paymaster config (in production, fetch from your paymaster contract)
      const mockConfig: PaymasterConfig = {
        isEnabled: true,
        sponsorshipAvailable: true,
        gasLimit: 500000,
        dailyLimit: 10000000,
        dailySpent: 1500000,
        merchantDeposit: 1000000000000000000n // 1 ETH in wei
      };

      setPaymasterConfig(mockConfig);
    } catch (err) {
      console.error('Failed to load paymaster config:', err);
    }
  };

  // Send user operation
  const sendUserOperation = async (to: Address, data: `0x${string}`, value: bigint = 0n): Promise<string> => {
    if (!smartAccountClient) {
      throw new Error('Smart account not initialized');
    }

    try {
      const txHash = await smartAccountClient.sendTransaction({
        to,
        data,
        value,
      });

      return txHash;
    } catch (err) {
      console.error('Failed to send user operation:', err);
      throw err;
    }
  };

  // Estimate user operation gas
  const estimateUserOperationGas = async (to: Address, data: `0x${string}`, value: bigint = 0n): Promise<bigint> => {
    if (!smartAccountClient) {
      throw new Error('Smart account not initialized');
    }

    try {
      // Mock gas estimation (in production, use actual estimation)
      return BigInt(300000); // 300k gas
    } catch (err) {
      console.error('Failed to estimate gas:', err);
      throw err;
    }
  };

  // Check if merchant can sponsor gas
  const checkGasSponsorship = async (merchant: Address, gasAmount: bigint): Promise<boolean> => {
    try {
      // Mock check (in production, call paymaster contract)
      if (!paymasterConfig) return false;
      
      const gasAmountNumber = Number(gasAmount);
      return (
        paymasterConfig.isEnabled &&
        paymasterConfig.sponsorshipAvailable &&
        gasAmountNumber <= paymasterConfig.gasLimit &&
        paymasterConfig.dailySpent + gasAmountNumber <= paymasterConfig.dailyLimit
      );
    } catch (err) {
      console.error('Failed to check gas sponsorship:', err);
      return false;
    }
  };

  // Create payment session for gas sponsorship
  const createPaymentSession = async (customer: Address, amount: bigint, token: Address): Promise<string> => {
    try {
      // Mock session creation (in production, call paymaster contract)
      const sessionId = `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;
      return sessionId;
    } catch (err) {
      console.error('Failed to create payment session:', err);
      throw err;
    }
  };

  // Initialize smart account when wallet connects
  useEffect(() => {
    if (isConnected && address && isAccountAbstractionSupported && !smartAccount) {
      createSmartAccount();
    }
  }, [isConnected, address, isAccountAbstractionSupported]);

  // Reset state when wallet disconnects or chain changes
  useEffect(() => {
    if (!isConnected || !isAccountAbstractionSupported) {
      setSmartAccount(null);
      setSmartAccountClient(null);
      setPaymasterConfig(null);
      setGaslessEnabled(false);
      setError(null);
    }
  }, [isConnected, chain?.id, isAccountAbstractionSupported]);

  const value: AccountAbstractionContextType = {
    // Smart Account
    smartAccount,
    isSmartAccountLoading,
    createSmartAccount,
    
    // Gasless Transactions
    isGaslessEnabled,
    setGaslessEnabled,
    paymasterConfig,
    
    // Transaction Methods
    sendUserOperation,
    estimateUserOperationGas,
    
    // Paymaster
    checkGasSponsorship,
    createPaymentSession,
    
    // Utils
    isAccountAbstractionSupported,
    error
  };

  return (
    <AccountAbstractionContext.Provider value={value}>
      {children}
    </AccountAbstractionContext.Provider>
  );
};

export const useAccountAbstraction = (): AccountAbstractionContextType => {
  const context = useContext(AccountAbstractionContext);
  if (context === undefined) {
    throw new Error('useAccountAbstraction must be used within an AccountAbstractionProvider');
  }
  return context;
};
