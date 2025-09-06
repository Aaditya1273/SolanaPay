import { ethers } from "ethers";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { create as createIPFS } from "ipfs-http-client";
import { SolanaRWAService, RWAMetadata } from "./solana";
import { didIdentityService, RWACredential } from "./did-identity";
import axios from "axios";

export interface RWAAssetData {
  // Basic asset information
  name: string;
  description: string;
  symbol: string;
  category: "real_estate" | "carbon_credits" | "precious_metals" | "commodities" | "certificates";
  
  // Financial information
  totalValue: number;
  currency: string;
  pricePerToken?: number;
  
  // Asset details
  location?: string;
  specifications: Record<string, any>;
  
  // Legal and compliance
  legalDocuments: File[];
  complianceLevel: "basic" | "enhanced" | "institutional";
  jurisdiction: string;
  
  // Verification
  verificationDocuments: File[];
  thirdPartyVerification?: {
    provider: string;
    certificateHash: string;
    verificationDate: string;
  };
  
  // Tokenization settings
  fractionalOwnership: boolean;
  totalSupply?: number;
  minimumInvestment?: number;
  lockupPeriod?: number; // in days
  
  // Media
  images: File[];
  videos?: File[];
  documents?: File[];
}

export interface TokenizedAsset {
  id: string;
  contractAddress: string;
  tokenId?: string;
  chain: "ethereum" | "polygon" | "solana" | "bsc";
  standard: "ERC721" | "ERC1155" | "SPL" | "ERC20";
  metadataUri: string;
  assetData: RWAAssetData;
  owner: string;
  createdAt: string;
  status: "pending" | "verified" | "active" | "disputed";
  verificationScore: number;
  marketData?: {
    currentPrice: number;
    priceHistory: Array<{ timestamp: string; price: number }>;
    volume24h: number;
    marketCap: number;
  };
}

export interface VerificationResult {
  isValid: boolean;
  score: number;
  checks: {
    documentAuthenticity: boolean;
    legalCompliance: boolean;
    financialVerification: boolean;
    thirdPartyValidation: boolean;
  };
  issues: string[];
  recommendations: string[];
}

class RWATokenizationService {
  private ipfs: any;
  private solanaService: SolanaRWAService;
  private ethProvider: ethers.providers.Provider;

  constructor(
    ipfsConfig: { host: string; port: number; protocol: string },
    solanaService: SolanaRWAService,
    ethProvider: ethers.providers.Provider
  ) {
    this.ipfs = createIPFS(ipfsConfig);
    this.solanaService = solanaService;
    this.ethProvider = ethProvider;
  }

  /**
   * Upload files to IPFS
   */
  async uploadToIPFS(files: File[]): Promise<string[]> {
    try {
      const uploadPromises = files.map(async (file) => {
        const buffer = await file.arrayBuffer();
        const result = await this.ipfs.add(buffer, {
          pin: true,
          wrapWithDirectory: false,
        });
        return `ipfs://${result.cid.toString()}`;
      });

      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error("Error uploading to IPFS:", error);
      throw error;
    }
  }

  /**
   * Create comprehensive metadata for RWA
   */
  async createRWAMetadata(assetData: RWAAssetData): Promise<RWAMetadata> {
    try {
      // Upload images and documents to IPFS
      const imageUris = await this.uploadToIPFS(assetData.images);
      const documentUris = assetData.legalDocuments.length > 0 
        ? await this.uploadToIPFS(assetData.legalDocuments)
        : [];
      const verificationUris = assetData.verificationDocuments.length > 0
        ? await this.uploadToIPFS(assetData.verificationDocuments)
        : [];

      // Create attributes array
      const attributes = [
        { trait_type: "Category", value: assetData.category },
        { trait_type: "Total Value", value: assetData.totalValue },
        { trait_type: "Currency", value: assetData.currency },
        { trait_type: "Compliance Level", value: assetData.complianceLevel },
        { trait_type: "Jurisdiction", value: assetData.jurisdiction },
        { trait_type: "Fractional Ownership", value: assetData.fractionalOwnership },
      ];

      // Add location if available
      if (assetData.location) {
        attributes.push({ trait_type: "Location", value: assetData.location });
      }

      // Add specifications as attributes
      Object.entries(assetData.specifications).forEach(([key, value]) => {
        attributes.push({ trait_type: key, value: String(value) });
      });

      const metadata: RWAMetadata = {
        name: assetData.name,
        symbol: assetData.symbol,
        description: assetData.description,
        image: imageUris[0] || "",
        external_url: `https://omniflow.io/assets/${assetData.name.toLowerCase().replace(/\s+/g, '-')}`,
        attributes,
        properties: {
          category: "image",
          files: [
            ...imageUris.map(uri => ({ uri, type: "image" })),
            ...documentUris.map(uri => ({ uri, type: "document" })),
          ],
        },
        rwa_type: assetData.category,
        asset_value: assetData.totalValue,
        currency: assetData.currency,
        location: assetData.location,
        verification_documents: verificationUris,
        compliance_level: assetData.complianceLevel,
        fractional_ownership: assetData.fractionalOwnership,
        total_supply: assetData.totalSupply,
      };

      return metadata;
    } catch (error) {
      console.error("Error creating RWA metadata:", error);
      throw error;
    }
  }

  /**
   * Verify RWA asset authenticity and compliance
   */
  async verifyAsset(assetData: RWAAssetData): Promise<VerificationResult> {
    try {
      const result: VerificationResult = {
        isValid: false,
        score: 0,
        checks: {
          documentAuthenticity: false,
          legalCompliance: false,
          financialVerification: false,
          thirdPartyValidation: false,
        },
        issues: [],
        recommendations: [],
      };

      let score = 0;

      // Check document authenticity
      if (assetData.legalDocuments.length > 0) {
        result.checks.documentAuthenticity = true;
        score += 25;
      } else {
        result.issues.push("Missing legal documentation");
        result.recommendations.push("Upload property deeds, certificates, or legal documents");
      }

      // Check legal compliance
      if (assetData.complianceLevel && assetData.jurisdiction) {
        result.checks.legalCompliance = true;
        score += 25;
      } else {
        result.issues.push("Incomplete compliance information");
        result.recommendations.push("Specify compliance level and jurisdiction");
      }

      // Check financial verification
      if (assetData.totalValue > 0 && assetData.currency) {
        result.checks.financialVerification = true;
        score += 25;
      } else {
        result.issues.push("Missing or invalid financial information");
        result.recommendations.push("Provide accurate asset valuation");
      }

      // Check third-party validation
      if (assetData.thirdPartyVerification) {
        result.checks.thirdPartyValidation = true;
        score += 25;
      } else {
        result.recommendations.push("Consider third-party asset verification for higher trust score");
      }

      result.score = score;
      result.isValid = score >= 50; // Minimum 50% score required

      return result;
    } catch (error) {
      console.error("Error verifying asset:", error);
      throw error;
    }
  }

  /**
   * Tokenize RWA on Solana
   */
  async tokenizeOnSolana(
    assetData: RWAAssetData,
    ownerKeypair: Keypair
  ): Promise<TokenizedAsset> {
    try {
      // Verify asset first
      const verification = await this.verifyAsset(assetData);
      if (!verification.isValid) {
        throw new Error(`Asset verification failed: ${verification.issues.join(", ")}`);
      }

      // Create metadata
      const metadata = await this.createRWAMetadata(assetData);

      // Configure Solana service with owner's keypair
      this.solanaService.configureWallet(ownerKeypair);

      let nft;
      if (assetData.fractionalOwnership && assetData.totalSupply) {
        // Create fractional tokens (SFT)
        const sft = await this.solanaService.createFractionalRWA(
          metadata,
          assetData.totalSupply,
          assetData.images[0]
        );
        nft = sft;
      } else {
        // Create single NFT
        nft = await this.solanaService.mintRWANFT(
          metadata,
          assetData.images[0],
          ownerKeypair.publicKey
        );
      }

      // Issue DID credential for the asset
      const ownerDID = didIdentityService.getDID();
      if (ownerDID) {
        await didIdentityService.issueRWACredential(ownerDID, {
          rwaType: assetData.category,
          assetValue: assetData.totalValue,
          currency: assetData.currency,
          location: assetData.location,
          verificationDocuments: metadata.verification_documents,
          complianceLevel: assetData.complianceLevel,
          kycStatus: "verified",
        });
      }

      const tokenizedAsset: TokenizedAsset = {
        id: `sol-${nft.address.toString()}`,
        contractAddress: nft.address.toString(),
        tokenId: nft.address.toString(),
        chain: "solana",
        standard: assetData.fractionalOwnership ? "SPL" : "SPL",
        metadataUri: nft.uri,
        assetData,
        owner: ownerKeypair.publicKey.toString(),
        createdAt: new Date().toISOString(),
        status: verification.score >= 75 ? "verified" : "pending",
        verificationScore: verification.score,
      };

      // Store tokenized asset info (in production, use database)
      this.storeTokenizedAsset(tokenizedAsset);

      return tokenizedAsset;
    } catch (error) {
      console.error("Error tokenizing on Solana:", error);
      throw error;
    }
  }

  /**
   * Tokenize RWA on Ethereum/EVM chains
   */
  async tokenizeOnEthereum(
    assetData: RWAAssetData,
    signer: ethers.Signer,
    contractAddress: string
  ): Promise<TokenizedAsset> {
    try {
      // Verify asset first
      const verification = await this.verifyAsset(assetData);
      if (!verification.isValid) {
        throw new Error(`Asset verification failed: ${verification.issues.join(", ")}`);
      }

      // Create metadata
      const metadata = await this.createRWAMetadata(assetData);

      // Upload metadata to IPFS
      const metadataBuffer = Buffer.from(JSON.stringify(metadata));
      const metadataResult = await this.ipfs.add(metadataBuffer, { pin: true });
      const metadataUri = `ipfs://${metadataResult.cid.toString()}`;

      // Contract ABI for RWA minting (simplified)
      const contractABI = [
        "function mint(address to, string memory tokenURI) public returns (uint256)",
        "function mintFractional(address to, uint256 amount, string memory tokenURI) public returns (uint256)",
      ];

      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      
      let tx;
      if (assetData.fractionalOwnership && assetData.totalSupply) {
        // Mint fractional tokens (ERC1155 or ERC20)
        tx = await contract.mintFractional(
          await signer.getAddress(),
          assetData.totalSupply,
          metadataUri
        );
      } else {
        // Mint single NFT (ERC721)
        tx = await contract.mint(await signer.getAddress(), metadataUri);
      }

      const receipt = await tx.wait();
      const tokenId = receipt.events?.[0]?.args?.tokenId?.toString() || "0";

      const tokenizedAsset: TokenizedAsset = {
        id: `eth-${contractAddress}-${tokenId}`,
        contractAddress,
        tokenId,
        chain: "ethereum",
        standard: assetData.fractionalOwnership ? "ERC1155" : "ERC721",
        metadataUri,
        assetData,
        owner: await signer.getAddress(),
        createdAt: new Date().toISOString(),
        status: verification.score >= 75 ? "verified" : "pending",
        verificationScore: verification.score,
      };

      this.storeTokenizedAsset(tokenizedAsset);

      return tokenizedAsset;
    } catch (error) {
      console.error("Error tokenizing on Ethereum:", error);
      throw error;
    }
  }

  /**
   * Get asset price from oracles
   */
  async getAssetPrice(
    category: string,
    specifications: Record<string, any>
  ): Promise<{ price: number; currency: string; source: string }> {
    try {
      // This would integrate with Chainlink oracles or other price feeds
      // For now, return mock data based on category
      const mockPrices = {
        real_estate: { price: 250000, currency: "USD", source: "Zillow API" },
        carbon_credits: { price: 15, currency: "USD", source: "Carbon Credit Exchange" },
        precious_metals: { price: 2000, currency: "USD", source: "COMEX" },
        commodities: { price: 80, currency: "USD", source: "CME" },
        certificates: { price: 1000, currency: "USD", source: "Manual Valuation" },
      };

      return mockPrices[category as keyof typeof mockPrices] || mockPrices.certificates;
    } catch (error) {
      console.error("Error getting asset price:", error);
      throw error;
    }
  }

  /**
   * Update asset valuation
   */
  async updateAssetValuation(
    tokenizedAssetId: string,
    newValuation: number,
    source: string
  ): Promise<void> {
    try {
      const asset = this.getTokenizedAsset(tokenizedAssetId);
      if (!asset) {
        throw new Error("Tokenized asset not found");
      }

      // Update market data
      const currentTime = new Date().toISOString();
      if (!asset.marketData) {
        asset.marketData = {
          currentPrice: newValuation,
          priceHistory: [{ timestamp: currentTime, price: newValuation }],
          volume24h: 0,
          marketCap: newValuation * (asset.assetData.totalSupply || 1),
        };
      } else {
        asset.marketData.priceHistory.push({
          timestamp: currentTime,
          price: newValuation,
        });
        asset.marketData.currentPrice = newValuation;
        asset.marketData.marketCap = newValuation * (asset.assetData.totalSupply || 1);
      }

      this.storeTokenizedAsset(asset);
    } catch (error) {
      console.error("Error updating asset valuation:", error);
      throw error;
    }
  }

  /**
   * Get tokenized asset details
   */
  getTokenizedAsset(assetId: string): TokenizedAsset | null {
    if (typeof window === "undefined") return null;
    
    const stored = localStorage.getItem("omniflow_tokenized_assets");
    if (!stored) return null;

    const assets: TokenizedAsset[] = JSON.parse(stored);
    return assets.find(asset => asset.id === assetId) || null;
  }

  /**
   * List user's tokenized assets
   */
  getUserTokenizedAssets(userAddress: string): TokenizedAsset[] {
    if (typeof window === "undefined") return [];
    
    const stored = localStorage.getItem("omniflow_tokenized_assets");
    if (!stored) return [];

    const assets: TokenizedAsset[] = JSON.parse(stored);
    return assets.filter(asset => 
      asset.owner.toLowerCase() === userAddress.toLowerCase()
    );
  }

  /**
   * Search tokenized assets
   */
  searchTokenizedAssets(criteria: {
    category?: string;
    minValue?: number;
    maxValue?: number;
    location?: string;
    complianceLevel?: string;
  }): TokenizedAsset[] {
    if (typeof window === "undefined") return [];
    
    const stored = localStorage.getItem("omniflow_tokenized_assets");
    if (!stored) return [];

    const assets: TokenizedAsset[] = JSON.parse(stored);
    
    return assets.filter(asset => {
      if (criteria.category && asset.assetData.category !== criteria.category) {
        return false;
      }
      if (criteria.minValue && asset.assetData.totalValue < criteria.minValue) {
        return false;
      }
      if (criteria.maxValue && asset.assetData.totalValue > criteria.maxValue) {
        return false;
      }
      if (criteria.location && asset.assetData.location !== criteria.location) {
        return false;
      }
      if (criteria.complianceLevel && asset.assetData.complianceLevel !== criteria.complianceLevel) {
        return false;
      }
      return true;
    });
  }

  /**
   * Private helper methods
   */
  private storeTokenizedAsset(asset: TokenizedAsset): void {
    if (typeof window === "undefined") return;
    
    const stored = localStorage.getItem("omniflow_tokenized_assets");
    const assets: TokenizedAsset[] = stored ? JSON.parse(stored) : [];
    
    const existingIndex = assets.findIndex(a => a.id === asset.id);
    if (existingIndex >= 0) {
      assets[existingIndex] = asset;
    } else {
      assets.push(asset);
    }

    localStorage.setItem("omniflow_tokenized_assets", JSON.stringify(assets));
  }
}

// Export factory function
export const createRWATokenizationService = (
  ipfsConfig: { host: string; port: number; protocol: string } = {
    host: "ipfs.infura.io",
    port: 5001,
    protocol: "https",
  },
  solanaService: SolanaRWAService,
  ethProvider: ethers.providers.Provider
) => {
  return new RWATokenizationService(ipfsConfig, solanaService, ethProvider);
};

export { RWATokenizationService };
