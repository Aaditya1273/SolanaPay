import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  Metaplex,
  keypairIdentity,
  bundlrStorage,
  toMetaplexFile,
  NftWithToken,
  Sft,
  SftWithToken,
} from "@metaplex-foundation/js";
import {
  createCreateMetadataAccountV3Instruction,
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
} from "@metaplex-foundation/mpl-token-metadata";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { clusterApiUrl } from "@solana/web3.js";

export interface RWAMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  external_url?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  properties: {
    category: "image" | "video" | "audio" | "vr" | "html";
    files: Array<{
      uri: string;
      type: string;
    }>;
  };
  // RWA-specific metadata
  rwa_type: "real_estate" | "carbon_credits" | "precious_metals" | "commodities" | "certificates";
  asset_value: number;
  currency: string;
  location?: string;
  verification_documents: string[];
  compliance_level: "basic" | "enhanced" | "institutional";
  fractional_ownership: boolean;
  total_supply?: number;
}

export interface SolanaRWAConfig {
  network: WalletAdapterNetwork;
  rpcEndpoint: string;
  commitment?: "processed" | "confirmed" | "finalized";
}

class SolanaRWAService {
  private connection: Connection;
  private metaplex: Metaplex;
  private network: WalletAdapterNetwork;

  constructor(config: SolanaRWAConfig) {
    this.network = config.network;
    this.connection = new Connection(
      config.rpcEndpoint || clusterApiUrl(config.network),
      config.commitment || "confirmed"
    );
    
    // Initialize Metaplex (will be configured with wallet later)
    this.metaplex = Metaplex.make(this.connection);
  }

  /**
   * Configure Metaplex with user's wallet
   */
  configureWallet(keypair: Keypair) {
    this.metaplex = Metaplex.make(this.connection)
      .use(keypairIdentity(keypair))
      .use(bundlrStorage({
        address: this.network === WalletAdapterNetwork.Mainnet 
          ? 'https://node1.bundlr.network' 
          : 'https://devnet.bundlr.network',
        providerUrl: this.connection.rpcEndpoint,
        timeout: 60000,
      }));
  }

  /**
   * Upload metadata to Arweave via Bundlr
   */
  async uploadMetadata(metadata: RWAMetadata, imageFile?: File): Promise<string> {
    try {
      let imageUri = metadata.image;

      // Upload image if provided
      if (imageFile) {
        const imageMetaplexFile = toMetaplexFile(imageFile, imageFile.name);
        const imageUploadResponse = await this.metaplex.storage().upload(imageMetaplexFile);
        imageUri = imageUploadResponse;
      }

      // Create complete metadata object
      const completeMetadata = {
        ...metadata,
        image: imageUri,
        seller_fee_basis_points: 500, // 5% royalty
        collection: {
          name: "OmniFlow RWA Collection",
          family: "OmniFlow",
        },
      };

      // Upload metadata
      const metadataUri = await this.metaplex.nfts().uploadMetadata(completeMetadata);
      return metadataUri;
    } catch (error) {
      console.error("Error uploading metadata:", error);
      throw error;
    }
  }

  /**
   * Mint RWA NFT
   */
  async mintRWANFT(
    metadata: RWAMetadata,
    imageFile?: File,
    recipientAddress?: PublicKey
  ): Promise<NftWithToken> {
    try {
      // Upload metadata first
      const metadataUri = await this.uploadMetadata(metadata, imageFile);

      // Mint NFT
      const { nft } = await this.metaplex.nfts().create({
        uri: metadataUri,
        name: metadata.name,
        symbol: metadata.symbol,
        sellerFeeBasisPoints: 500, // 5% royalty
        tokenOwner: recipientAddress,
        collection: null, // Can be set to a collection NFT
        uses: null,
        isMutable: true,
        maxSupply: metadata.fractional_ownership ? metadata.total_supply : 1,
      });

      return nft;
    } catch (error) {
      console.error("Error minting RWA NFT:", error);
      throw error;
    }
  }

  /**
   * Create fractional RWA tokens (SFT)
   */
  async createFractionalRWA(
    metadata: RWAMetadata,
    totalSupply: number,
    imageFile?: File
  ): Promise<SftWithToken> {
    try {
      // Upload metadata
      const metadataUri = await this.uploadMetadata({
        ...metadata,
        fractional_ownership: true,
        total_supply: totalSupply,
      }, imageFile);

      // Create SFT (Semi-Fungible Token)
      const { sft } = await this.metaplex.nfts().createSft({
        uri: metadataUri,
        name: metadata.name,
        symbol: metadata.symbol,
        sellerFeeBasisPoints: 500,
        tokenAmount: {
          basisPoints: totalSupply * 100, // Convert to basis points
          currency: {
            symbol: metadata.symbol,
            decimals: 2,
          },
        },
      });

      return sft;
    } catch (error) {
      console.error("Error creating fractional RWA:", error);
      throw error;
    }
  }

  /**
   * Transfer RWA NFT
   */
  async transferRWA(
    nftMintAddress: PublicKey,
    fromAddress: PublicKey,
    toAddress: PublicKey,
    amount: number = 1
  ): Promise<string> {
    try {
      const { response } = await this.metaplex.nfts().transfer({
        nftOrSft: { address: nftMintAddress, tokenStandard: 0 },
        fromOwner: fromAddress,
        toOwner: toAddress,
        amount: {
          basisPoints: amount * 100,
          currency: { symbol: "TOKEN", decimals: 2 },
        },
      });

      return response.signature;
    } catch (error) {
      console.error("Error transferring RWA:", error);
      throw error;
    }
  }

  /**
   * Get RWA NFT details
   */
  async getRWADetails(mintAddress: PublicKey): Promise<Nft | Sft | null> {
    try {
      const nft = await this.metaplex.nfts().findByMint({
        mintAddress,
      });

      return nft;
    } catch (error) {
      console.error("Error getting RWA details:", error);
      return null;
    }
  }

  /**
   * List user's RWA NFTs
   */
  async getUserRWAs(ownerAddress: PublicKey): Promise<(Nft | Sft)[]> {
    try {
      const nfts = await this.metaplex.nfts().findAllByOwner({
        owner: ownerAddress,
      });

      // Filter for RWA NFTs (based on metadata)
      const rwaTokens = [];
      for (const nft of nfts) {
        try {
          const metadata = await this.metaplex.nfts().load({ metadata: nft });
          if (metadata.json?.rwa_type) {
            rwaTokens.push(metadata);
          }
        } catch (error) {
          console.warn("Could not load metadata for NFT:", nft.address.toString());
        }
      }

      return rwaTokens;
    } catch (error) {
      console.error("Error getting user RWAs:", error);
      throw error;
    }
  }

  /**
   * Create RWA marketplace listing
   */
  async createMarketplaceListing(
    nftMintAddress: PublicKey,
    price: number,
    currency: "SOL" | "USDC" = "SOL"
  ): Promise<string> {
    try {
      // This would integrate with a marketplace program
      // For now, we'll create a basic listing transaction
      const listing = await this.metaplex.auctionHouse().list({
        auctionHouse: await this.getOrCreateAuctionHouse(),
        mintAccount: nftMintAddress,
        price: {
          basisPoints: price * LAMPORTS_PER_SOL,
          currency: {
            symbol: currency,
            decimals: currency === "SOL" ? 9 : 6,
          },
        },
      });

      return listing.response.signature;
    } catch (error) {
      console.error("Error creating marketplace listing:", error);
      throw error;
    }
  }

  /**
   * Get or create auction house for marketplace
   */
  private async getOrCreateAuctionHouse() {
    try {
      // Try to find existing auction house
      const auctionHouses = await this.metaplex.auctionHouse().findAll();
      
      if (auctionHouses.length > 0) {
        return auctionHouses[0];
      }

      // Create new auction house
      const { auctionHouse } = await this.metaplex.auctionHouse().create({
        sellerFeeBasisPoints: 500, // 5% fee
        requiresSignOff: false,
        canChangeSalePrice: true,
      });

      return auctionHouse;
    } catch (error) {
      console.error("Error with auction house:", error);
      throw error;
    }
  }

  /**
   * Verify RWA authenticity (placeholder for oracle integration)
   */
  async verifyRWAAuthenticity(
    mintAddress: PublicKey,
    verificationData: {
      documentHashes: string[];
      oracleSignature: string;
      timestamp: number;
    }
  ): Promise<boolean> {
    try {
      // This would integrate with Chainlink oracles or other verification services
      // For now, we'll simulate verification
      console.log("Verifying RWA authenticity for:", mintAddress.toString());
      console.log("Verification data:", verificationData);

      // In production, this would:
      // 1. Submit verification data to oracle
      // 2. Wait for oracle response
      // 3. Update NFT metadata with verification status
      // 4. Emit verification event

      return true; // Simulated success
    } catch (error) {
      console.error("Error verifying RWA authenticity:", error);
      return false;
    }
  }

  /**
   * Get connection and network info
   */
  getConnection(): Connection {
    return this.connection;
  }

  getNetwork(): WalletAdapterNetwork {
    return this.network;
  }

  /**
   * Get SOL balance
   */
  async getBalance(publicKey: PublicKey): Promise<number> {
    const balance = await this.connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  }

  /**
   * Airdrop SOL (devnet/testnet only)
   */
  async airdropSol(publicKey: PublicKey, amount: number = 1): Promise<string> {
    if (this.network === WalletAdapterNetwork.Mainnet) {
      throw new Error("Airdrop not available on mainnet");
    }

    const signature = await this.connection.requestAirdrop(
      publicKey,
      amount * LAMPORTS_PER_SOL
    );

    await this.connection.confirmTransaction(signature);
    return signature;
  }
}

// Export default configuration
export const createSolanaRWAService = (network: WalletAdapterNetwork = WalletAdapterNetwork.Devnet) => {
  const config: SolanaRWAConfig = {
    network,
    rpcEndpoint: process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || clusterApiUrl(network),
    commitment: "confirmed",
  };

  return new SolanaRWAService(config);
};

export { SolanaRWAService };
export type { Nft, Sft, NftWithToken, SftWithToken } from "@metaplex-foundation/js";
