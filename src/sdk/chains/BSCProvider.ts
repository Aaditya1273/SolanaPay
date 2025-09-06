import { ChainProvider, TransactionRequest, Transaction, TransactionReceipt, SDKConfig } from '../core/types';
import { ethers } from 'ethers';

/**
 * BSC (Binance Smart Chain) Provider for cross-chain RWA operations
 */
export class BSCProvider implements ChainProvider {
  public readonly chainId = 'bsc' as const;
  private provider: ethers.JsonRpcProvider;
  private signer?: ethers.Signer;
  private config: SDKConfig;

  private readonly CHAIN_CONFIG = {
    testnet: {
      chainId: 97, // BSC Testnet
      name: 'BSC Testnet',
      rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
      explorerUrl: 'https://testnet.bscscan.com',
      nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    },
    mainnet: {
      chainId: 56,
      name: 'BSC Mainnet',
      rpcUrl: 'https://bsc-dataseed1.binance.org/',
      explorerUrl: 'https://bscscan.com',
      nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    },
  };

  constructor(config: SDKConfig) {
    this.config = config;
    const chainConfig = this.CHAIN_CONFIG[config.environment];
    const rpcUrl = config.rpcEndpoints?.bsc || chainConfig.rpcUrl;
    
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

      console.log(`BSC Provider initialized for ${this.config.environment}`);
    } catch (error) {
      throw new Error(`Failed to initialize BSC provider: ${error}`);
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
      chainId: 'bsc',
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
