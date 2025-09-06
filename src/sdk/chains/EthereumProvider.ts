import { ChainProvider, TransactionRequest, Transaction, TransactionReceipt, SDKConfig } from '../core/types';
import { ethers } from 'ethers';

/**
 * Ethereum Provider for cross-chain RWA operations
 */
export class EthereumProvider implements ChainProvider {
  public readonly chainId = 'ethereum' as const;
  private provider: ethers.JsonRpcProvider;
  private signer?: ethers.Signer;
  private config: SDKConfig;

  private readonly CHAIN_CONFIG = {
    testnet: {
      chainId: 11155111, // Sepolia
      name: 'Ethereum Sepolia',
      rpcUrl: 'https://sepolia.infura.io/v3/',
      explorerUrl: 'https://sepolia.etherscan.io',
      nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
    },
    mainnet: {
      chainId: 1,
      name: 'Ethereum Mainnet',
      rpcUrl: 'https://mainnet.infura.io/v3/',
      explorerUrl: 'https://etherscan.io',
      nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
    },
  };

  constructor(config: SDKConfig) {
    this.config = config;
    const chainConfig = this.CHAIN_CONFIG[config.environment];
    const rpcUrl = config.rpcEndpoints?.ethereum || `${chainConfig.rpcUrl}${config.apiKeys?.infura || ''}`;
    
    this.provider = new ethers.JsonRpcProvider(rpcUrl, {
      chainId: chainConfig.chainId,
      name: chainConfig.name,
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.provider.getNetwork();
      
      if (this.config.privateKey) {
        this.signer = new ethers.Wallet(this.config.privateKey, this.provider);
      }

      console.log(`Ethereum Provider initialized for ${this.config.environment}`);
    } catch (error) {
      throw new Error(`Failed to initialize Ethereum provider: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    this.signer = undefined;
  }

  async isHealthy(): Promise<boolean> {
    try {
      const blockNumber = await this.provider.getBlockNumber();
      return blockNumber > 0;
    } catch {
      return false;
    }
  }

  async getBalance(address: string): Promise<string> {
    const balance = await this.provider.getBalance(address);
    return ethers.formatEther(balance);
  }

  async sendTransaction(tx: TransactionRequest): Promise<Transaction> {
    if (!this.signer) {
      throw new Error('Signer not initialized');
    }

    const txRequest = {
      to: tx.to,
      value: tx.value ? ethers.parseEther(tx.value) : undefined,
      data: tx.data,
      gasPrice: tx.gasPrice ? ethers.parseUnits(tx.gasPrice, 'gwei') : undefined,
      gasLimit: tx.gasLimit ? BigInt(tx.gasLimit) : undefined,
    };

    const txResponse = await this.signer.sendTransaction(txRequest);

    return {
      hash: txResponse.hash,
      chainId: 'ethereum',
      from: txResponse.from,
      to: txResponse.to || '',
      value: ethers.formatEther(txResponse.value || 0),
      gasPrice: ethers.formatUnits(txResponse.gasPrice || 0, 'gwei'),
      gasLimit: (txResponse.gasLimit || BigInt(0)).toString(),
      data: txResponse.data || '0x',
      nonce: txResponse.nonce,
      status: 'pending',
    };
  }

  async call(to: string, data: string): Promise<string> {
    return await this.provider.call({ to, data });
  }

  async estimateGas(tx: TransactionRequest): Promise<string> {
    const gasEstimate = await this.provider.estimateGas({
      to: tx.to,
      value: tx.value ? ethers.parseEther(tx.value) : undefined,
      data: tx.data,
    });
    return gasEstimate.toString();
  }

  async getBlockNumber(): Promise<number> {
    return await this.provider.getBlockNumber();
  }

  async waitForTransaction(hash: string): Promise<TransactionReceipt> {
    const receipt = await this.provider.waitForTransaction(hash);
    if (!receipt) {
      throw new Error('Transaction receipt not found');
    }

    return {
      hash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      status: receipt.status === 1,
      logs: receipt.logs.map(log => ({
        address: log.address,
        topics: log.topics,
        data: log.data,
      })),
    };
  }

  getContract(address: string, abi: any[]): ethers.Contract {
    const signerOrProvider = this.signer || this.provider;
    return new ethers.Contract(address, abi, signerOrProvider);
  }

  async getFeeData() {
    const feeData = await this.provider.getFeeData();
    return {
      gasPrice: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') : null,
      maxFeePerGas: feeData.maxFeePerGas ? ethers.formatUnits(feeData.maxFeePerGas, 'gwei') : null,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei') : null,
    };
  }
}
