import {
  Connection,
  PublicKey,
  Transaction,
  Keypair,
  SystemProgram,
} from "@solana/web3.js";
import { ethers } from "ethers";
import {
  getEmitterAddressEth,
  getEmitterAddressSolana,
  getSignedVAAWithRetry,
  parseSequenceFromLogEth,
  parseSequenceFromLogSolana,
  redeemOnEth,
  redeemOnSolana,
  transferFromEth,
  transferFromSolana,
  attestFromEth,
  attestFromSolana,
  createWrappedOnEth,
  createWrappedOnSolana,
  getForeignAssetEth,
  getForeignAssetSolana,
  hexToUint8Array,
  uint8ArrayToHex,
} from "@certusone/wormhole-sdk";

export interface BridgeConfig {
  // Wormhole contract addresses
  wormholeEthAddress: string;
  wormholeSolanaAddress: string;
  tokenBridgeEthAddress: string;
  tokenBridgeSolanaAddress: string;
  
  // RPC endpoints
  ethRpcUrl: string;
  solanaRpcUrl: string;
  
  // Guardian RPC
  guardianRpcUrl: string;
}

export interface BridgeTransfer {
  id: string;
  sourceChain: "ethereum" | "solana" | "polygon" | "bsc";
  targetChain: "ethereum" | "solana" | "polygon" | "bsc";
  tokenAddress: string;
  amount: string;
  recipient: string;
  sender: string;
  status: "pending" | "confirmed" | "redeemed" | "failed";
  txHash?: string;
  vaaBytes?: Uint8Array;
  sequence?: string;
  timestamp: number;
}

export interface RWABridgeMetadata {
  name: string;
  symbol: string;
  decimals: number;
  rwaType: string;
  assetValue: number;
  verificationHash: string;
  complianceLevel: string;
}

class CrossChainBridge {
  private config: BridgeConfig;
  private ethProvider: ethers.providers.JsonRpcProvider;
  private solanaConnection: Connection;

  constructor(config: BridgeConfig) {
    this.config = config;
    this.ethProvider = new ethers.providers.JsonRpcProvider(config.ethRpcUrl);
    this.solanaConnection = new Connection(config.solanaRpcUrl, "confirmed");
  }

  /**
   * Bridge RWA NFT from Ethereum to Solana
   */
  async bridgeNFTEthToSol(
    ethSigner: ethers.Signer,
    tokenAddress: string,
    tokenId: string,
    recipientSolanaAddress: string,
    metadata: RWABridgeMetadata
  ): Promise<BridgeTransfer> {
    try {
      const transferId = `eth-sol-${Date.now()}`;
      
      // Step 1: Attest the token if not already attested
      const foreignAsset = await getForeignAssetSolana(
        this.solanaConnection,
        this.config.tokenBridgeSolanaAddress,
        2, // Ethereum chain ID in Wormhole
        hexToUint8Array(tokenAddress)
      );

      if (!foreignAsset) {
        // Attest the token first
        const attestTx = await attestFromEth(
          this.config.tokenBridgeEthAddress,
          ethSigner,
          tokenAddress
        );
        
        await attestTx.wait();
        
        // Get VAA and create wrapped token on Solana
        const sequence = parseSequenceFromLogEth(attestTx, this.config.wormholeEthAddress);
        const emitterAddress = getEmitterAddressEth(this.config.tokenBridgeEthAddress);
        
        const { vaaBytes } = await getSignedVAAWithRetry(
          [this.config.guardianRpcUrl],
          2, // Ethereum chain ID
          emitterAddress,
          sequence
        );

        // Create wrapped token on Solana
        await createWrappedOnSolana(
          this.solanaConnection,
          this.config.tokenBridgeSolanaAddress,
          Keypair.generate(), // Fee payer (should be user's keypair)
          vaaBytes
        );
      }

      // Step 2: Transfer the NFT
      const transferTx = await transferFromEth(
        this.config.tokenBridgeEthAddress,
        ethSigner,
        tokenAddress,
        tokenId,
        1, // Solana chain ID in Wormhole
        hexToUint8Array(recipientSolanaAddress)
      );

      const receipt = await transferTx.wait();
      const sequence = parseSequenceFromLogEth(receipt, this.config.wormholeEthAddress);
      
      const bridgeTransfer: BridgeTransfer = {
        id: transferId,
        sourceChain: "ethereum",
        targetChain: "solana",
        tokenAddress,
        amount: "1", // NFT
        recipient: recipientSolanaAddress,
        sender: await ethSigner.getAddress(),
        status: "pending",
        txHash: receipt.transactionHash,
        sequence,
        timestamp: Date.now(),
      };

      // Store transfer info (in production, use database)
      this.storeBridgeTransfer(bridgeTransfer);

      return bridgeTransfer;
    } catch (error) {
      console.error("Error bridging NFT from Ethereum to Solana:", error);
      throw error;
    }
  }

  /**
   * Bridge RWA NFT from Solana to Ethereum
   */
  async bridgeNFTSolToEth(
    solanaKeypair: Keypair,
    mintAddress: string,
    recipientEthAddress: string,
    metadata: RWABridgeMetadata
  ): Promise<BridgeTransfer> {
    try {
      const transferId = `sol-eth-${Date.now()}`;

      // Step 1: Check if token is attested on Ethereum
      const foreignAsset = await getForeignAssetEth(
        this.ethProvider,
        this.config.tokenBridgeEthAddress,
        1, // Solana chain ID in Wormhole
        hexToUint8Array(mintAddress)
      );

      if (foreignAsset === null) {
        // Attest the token first
        const attestTx = await attestFromSolana(
          this.solanaConnection,
          this.config.tokenBridgeSolanaAddress,
          solanaKeypair.publicKey,
          mintAddress
        );

        // Get VAA and create wrapped token on Ethereum
        const sequence = parseSequenceFromLogSolana(attestTx);
        const emitterAddress = getEmitterAddressSolana(this.config.tokenBridgeSolanaAddress);

        const { vaaBytes } = await getSignedVAAWithRetry(
          [this.config.guardianRpcUrl],
          1, // Solana chain ID
          emitterAddress,
          sequence
        );

        // Create wrapped token on Ethereum
        const ethSigner = new ethers.Wallet(
          process.env.BRIDGE_OPERATOR_PRIVATE_KEY!,
          this.ethProvider
        );

        await createWrappedOnEth(
          this.config.tokenBridgeEthAddress,
          ethSigner,
          vaaBytes
        );
      }

      // Step 2: Transfer the NFT
      const transferTx = await transferFromSolana(
        this.solanaConnection,
        this.config.tokenBridgeSolanaAddress,
        solanaKeypair.publicKey,
        mintAddress,
        "1", // Amount for NFT
        2, // Ethereum chain ID in Wormhole
        hexToUint8Array(recipientEthAddress),
        undefined, // Use default fee
        solanaKeypair
      );

      const sequence = parseSequenceFromLogSolana(transferTx);

      const bridgeTransfer: BridgeTransfer = {
        id: transferId,
        sourceChain: "solana",
        targetChain: "ethereum",
        tokenAddress: mintAddress,
        amount: "1",
        recipient: recipientEthAddress,
        sender: solanaKeypair.publicKey.toString(),
        status: "pending",
        txHash: transferTx,
        sequence,
        timestamp: Date.now(),
      };

      this.storeBridgeTransfer(bridgeTransfer);

      return bridgeTransfer;
    } catch (error) {
      console.error("Error bridging NFT from Solana to Ethereum:", error);
      throw error;
    }
  }

  /**
   * Complete bridge transfer by redeeming VAA
   */
  async completeBridgeTransfer(transferId: string): Promise<string> {
    try {
      const transfer = this.getBridgeTransfer(transferId);
      if (!transfer) {
        throw new Error("Transfer not found");
      }

      if (transfer.status !== "pending") {
        throw new Error("Transfer is not in pending status");
      }

      // Get VAA
      const emitterAddress = transfer.sourceChain === "ethereum" 
        ? getEmitterAddressEth(this.config.tokenBridgeEthAddress)
        : getEmitterAddressSolana(this.config.tokenBridgeSolanaAddress);

      const sourceChainId = this.getWormholeChainId(transfer.sourceChain);

      const { vaaBytes } = await getSignedVAAWithRetry(
        [this.config.guardianRpcUrl],
        sourceChainId,
        emitterAddress,
        transfer.sequence!
      );

      let redeemTxHash: string;

      if (transfer.targetChain === "ethereum") {
        // Redeem on Ethereum
        const ethSigner = new ethers.Wallet(
          process.env.BRIDGE_OPERATOR_PRIVATE_KEY!,
          this.ethProvider
        );

        const redeemTx = await redeemOnEth(
          this.config.tokenBridgeEthAddress,
          ethSigner,
          vaaBytes
        );

        const receipt = await redeemTx.wait();
        redeemTxHash = receipt.transactionHash;
      } else {
        // Redeem on Solana
        const solanaKeypair = Keypair.generate(); // Should be user's keypair
        
        const redeemTx = await redeemOnSolana(
          this.solanaConnection,
          this.config.tokenBridgeSolanaAddress,
          solanaKeypair.publicKey,
          vaaBytes,
          solanaKeypair
        );

        redeemTxHash = redeemTx;
      }

      // Update transfer status
      transfer.status = "redeemed";
      transfer.vaaBytes = vaaBytes;
      this.storeBridgeTransfer(transfer);

      return redeemTxHash;
    } catch (error) {
      console.error("Error completing bridge transfer:", error);
      throw error;
    }
  }

  /**
   * Get bridge transfer status
   */
  async getBridgeTransferStatus(transferId: string): Promise<BridgeTransfer | null> {
    return this.getBridgeTransfer(transferId);
  }

  /**
   * List all bridge transfers for a user
   */
  async getUserBridgeTransfers(userAddress: string): Promise<BridgeTransfer[]> {
    // In production, query from database
    const allTransfers = this.getAllBridgeTransfers();
    return allTransfers.filter(
      transfer => 
        transfer.sender.toLowerCase() === userAddress.toLowerCase() ||
        transfer.recipient.toLowerCase() === userAddress.toLowerCase()
    );
  }

  /**
   * Estimate bridge fees
   */
  async estimateBridgeFee(
    sourceChain: string,
    targetChain: string,
    tokenAddress: string
  ): Promise<{
    bridgeFee: string;
    gasFee: string;
    totalFee: string;
  }> {
    try {
      // This would calculate actual fees based on current gas prices
      // For now, return estimated values
      const bridgeFee = "0.001"; // Base bridge fee
      const gasFee = sourceChain === "ethereum" ? "0.01" : "0.0001";
      const totalFee = (parseFloat(bridgeFee) + parseFloat(gasFee)).toString();

      return {
        bridgeFee,
        gasFee,
        totalFee,
      };
    } catch (error) {
      console.error("Error estimating bridge fee:", error);
      throw error;
    }
  }

  /**
   * Check if token is supported for bridging
   */
  async isTokenSupported(
    chainId: string,
    tokenAddress: string
  ): Promise<boolean> {
    try {
      // Check if token is attested on Wormhole
      // This would involve checking the token bridge contracts
      return true; // Simplified for demo
    } catch (error) {
      console.error("Error checking token support:", error);
      return false;
    }
  }

  /**
   * Get supported chains
   */
  getSupportedChains(): string[] {
    return ["ethereum", "solana", "polygon", "bsc"];
  }

  /**
   * Private helper methods
   */
  private getWormholeChainId(chain: string): number {
    const chainIds: { [key: string]: number } = {
      ethereum: 2,
      solana: 1,
      polygon: 5,
      bsc: 4,
    };
    return chainIds[chain] || 0;
  }

  private storeBridgeTransfer(transfer: BridgeTransfer): void {
    // In production, store in database
    const transfers = this.getAllBridgeTransfers();
    const existingIndex = transfers.findIndex(t => t.id === transfer.id);
    
    if (existingIndex >= 0) {
      transfers[existingIndex] = transfer;
    } else {
      transfers.push(transfer);
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("omniflow_bridge_transfers", JSON.stringify(transfers));
    }
  }

  private getBridgeTransfer(transferId: string): BridgeTransfer | null {
    const transfers = this.getAllBridgeTransfers();
    return transfers.find(t => t.id === transferId) || null;
  }

  private getAllBridgeTransfers(): BridgeTransfer[] {
    if (typeof window === "undefined") return [];
    
    const stored = localStorage.getItem("omniflow_bridge_transfers");
    return stored ? JSON.parse(stored) : [];
  }
}

// Default configuration for different networks
export const getBridgeConfig = (network: "mainnet" | "testnet" = "testnet"): BridgeConfig => {
  if (network === "mainnet") {
    return {
      wormholeEthAddress: "0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B",
      wormholeSolanaAddress: "worm2ZoG2kUd4vFXhvjh93UUH596ayRfgQ2MgjNMTth",
      tokenBridgeEthAddress: "0x3ee18B2214AFF97000D974cf647E7C347E8fa585",
      tokenBridgeSolanaAddress: "wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb",
      ethRpcUrl: "https://rpc.ankr.com/eth",
      solanaRpcUrl: "https://api.mainnet-beta.solana.com",
      guardianRpcUrl: "https://wormhole-v2-mainnet-api.certus.one",
    };
  } else {
    return {
      wormholeEthAddress: "0x706abc4E45D419950511e474C7B9Ed348A4a716c",
      wormholeSolanaAddress: "3u8hJUVTA4jH1wYAyUur7FFZVQ8H635K3tSHHF4ssjQ5",
      tokenBridgeEthAddress: "0xF890982f9310df57d00f659cf4fd87e65adEd8d7",
      tokenBridgeSolanaAddress: "DZnkkTmCiFWfYTfT41X3Rd1kDgozqzxWaHqsw6W4x2oe",
      ethRpcUrl: "https://rpc.ankr.com/eth_goerli",
      solanaRpcUrl: "https://api.devnet.solana.com",
      guardianRpcUrl: "https://wormhole-v2-testnet-api.certus.one",
    };
  }
};

// Export singleton instance
export const createCrossChainBridge = (network: "mainnet" | "testnet" = "testnet") => {
  const config = getBridgeConfig(network);
  return new CrossChainBridge(config);
};

export { CrossChainBridge };
