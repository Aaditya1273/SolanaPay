import { DID } from "dids";
import { Ed25519Provider } from "key-did-provider-ed25519";
import { getResolver as getKeyResolver } from "key-did-resolver";
import { getResolver as getPkhResolver } from "pkh-did-resolver";
import { EthereumAuthProvider, SolanaAuthProvider } from "@didtools/pkh-ethereum";
import { CeramicClient } from "@ceramicnetwork/http-client";
import { TileDocument } from "@ceramicnetwork/stream-tile";
import { randomBytes } from "crypto";
import { ethers } from "ethers";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

export interface VerifiableCredential {
  "@context": string[];
  id: string;
  type: string[];
  issuer: {
    id: string;
    name?: string;
  };
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: {
    id: string;
    [key: string]: any;
  };
  proof?: {
    type: string;
    created: string;
    verificationMethod: string;
    proofPurpose: string;
    jws: string;
  };
}

export interface RWACredential extends VerifiableCredential {
  credentialSubject: {
    id: string;
    rwaType: "real_estate" | "carbon_credits" | "precious_metals" | "commodities" | "certificate";
    assetValue: number;
    currency: string;
    location?: string;
    verificationDocuments: string[];
    complianceLevel: "basic" | "enhanced" | "institutional";
    kycStatus: "pending" | "verified" | "rejected";
    accreditedInvestor?: boolean;
  };
}

export interface IdentityProfile {
  did: string;
  name?: string;
  email?: string;
  avatar?: string;
  walletAddresses: {
    ethereum?: string;
    solana?: string;
    polygon?: string;
    bsc?: string;
  };
  credentials: VerifiableCredential[];
  reputation: {
    score: number;
    transactionCount: number;
    verifiedAssets: number;
    lastActivity: string;
  };
  preferences: {
    defaultChain: string;
    notifications: boolean;
    privacy: "public" | "private" | "selective";
  };
}

class DIDIdentityService {
  private ceramic: CeramicClient;
  private did: DID | null = null;
  private profile: IdentityProfile | null = null;

  constructor(ceramicUrl: string = "https://ceramic-clay.3boxlabs.com") {
    this.ceramic = new CeramicClient(ceramicUrl);
  }

  /**
   * Initialize DID with Ethereum wallet
   */
  async initWithEthereum(provider: ethers.providers.Provider, address: string): Promise<string> {
    try {
      const authProvider = new EthereumAuthProvider(provider, address);
      const did = new DID({
        provider: authProvider,
        resolver: {
          ...getKeyResolver(),
          ...getPkhResolver(),
        },
      });

      await did.authenticate();
      this.did = did;
      this.ceramic.did = did;

      await this.loadOrCreateProfile();
      return did.id;
    } catch (error) {
      console.error("Error initializing DID with Ethereum:", error);
      throw error;
    }
  }

  /**
   * Initialize DID with Solana wallet
   */
  async initWithSolana(keypair: Keypair): Promise<string> {
    try {
      const authProvider = new SolanaAuthProvider(keypair, keypair.publicKey.toString());
      const did = new DID({
        provider: authProvider,
        resolver: {
          ...getKeyResolver(),
          ...getPkhResolver(),
        },
      });

      await did.authenticate();
      this.did = did;
      this.ceramic.did = did;

      await this.loadOrCreateProfile();
      return did.id;
    } catch (error) {
      console.error("Error initializing DID with Solana:", error);
      throw error;
    }
  }

  /**
   * Initialize DID with seed (for testing/demo)
   */
  async initWithSeed(seed?: Uint8Array): Promise<string> {
    try {
      const seedBytes = seed || randomBytes(32);
      const provider = new Ed25519Provider(seedBytes);
      const did = new DID({
        provider,
        resolver: getKeyResolver(),
      });

      await did.authenticate();
      this.did = did;
      this.ceramic.did = did;

      await this.loadOrCreateProfile();
      return did.id;
    } catch (error) {
      console.error("Error initializing DID with seed:", error);
      throw error;
    }
  }

  /**
   * Load or create user profile
   */
  private async loadOrCreateProfile(): Promise<void> {
    if (!this.did) {
      throw new Error("DID not initialized");
    }

    try {
      // Try to load existing profile
      const profileQuery = await TileDocument.deterministic(this.ceramic, {
        controllers: [this.did.id],
        family: "omniflow_profile",
      });

      if (profileQuery.content) {
        this.profile = profileQuery.content as IdentityProfile;
      } else {
        // Create new profile
        this.profile = {
          did: this.did.id,
          walletAddresses: {},
          credentials: [],
          reputation: {
            score: 0,
            transactionCount: 0,
            verifiedAssets: 0,
            lastActivity: new Date().toISOString(),
          },
          preferences: {
            defaultChain: "ethereum",
            notifications: true,
            privacy: "selective",
          },
        };

        await profileQuery.update(this.profile);
      }
    } catch (error) {
      console.error("Error loading/creating profile:", error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<IdentityProfile>): Promise<void> {
    if (!this.profile || !this.did) {
      throw new Error("Profile not loaded");
    }

    try {
      this.profile = { ...this.profile, ...updates };
      
      const profileDoc = await TileDocument.deterministic(this.ceramic, {
        controllers: [this.did.id],
        family: "omniflow_profile",
      });

      await profileDoc.update(this.profile);
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  }

  /**
   * Issue RWA credential
   */
  async issueRWACredential(
    recipientDID: string,
    credentialData: Omit<RWACredential["credentialSubject"], "id">
  ): Promise<RWACredential> {
    if (!this.did) {
      throw new Error("DID not initialized");
    }

    try {
      const credential: RWACredential = {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://omniflow.io/credentials/rwa/v1",
        ],
        id: `https://omniflow.io/credentials/${Date.now()}`,
        type: ["VerifiableCredential", "RWACredential"],
        issuer: {
          id: this.did.id,
          name: "OmniFlow RWA Platform",
        },
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: recipientDID,
          ...credentialData,
        },
      };

      // Sign the credential
      const jws = await this.did.createJWS(credential);
      credential.proof = {
        type: "JsonWebSignature2020",
        created: new Date().toISOString(),
        verificationMethod: `${this.did.id}#${this.did.id.split(":")[2]}`,
        proofPurpose: "assertionMethod",
        jws: jws.signatures[0].signature,
      };

      // Store credential on Ceramic
      const credentialDoc = await TileDocument.create(this.ceramic, credential, {
        controllers: [this.did.id],
        family: "omniflow_credentials",
      });

      return credential;
    } catch (error) {
      console.error("Error issuing RWA credential:", error);
      throw error;
    }
  }

  /**
   * Verify credential
   */
  async verifyCredential(credential: VerifiableCredential): Promise<boolean> {
    try {
      if (!credential.proof) {
        return false;
      }

      // Verify the signature
      const issuerDID = new DID({
        resolver: {
          ...getKeyResolver(),
          ...getPkhResolver(),
        },
      });

      const verification = await issuerDID.verifyJWS({
        payload: JSON.stringify(credential),
        signatures: [
          {
            signature: credential.proof.jws,
            protected: "", // Would contain the header in a real implementation
          },
        ],
      });

      return verification.payload !== null;
    } catch (error) {
      console.error("Error verifying credential:", error);
      return false;
    }
  }

  /**
   * Add credential to profile
   */
  async addCredential(credential: VerifiableCredential): Promise<void> {
    if (!this.profile) {
      throw new Error("Profile not loaded");
    }

    try {
      // Verify credential first
      const isValid = await this.verifyCredential(credential);
      if (!isValid) {
        throw new Error("Invalid credential");
      }

      this.profile.credentials.push(credential);
      await this.updateProfile({ credentials: this.profile.credentials });
    } catch (error) {
      console.error("Error adding credential:", error);
      throw error;
    }
  }

  /**
   * Get credentials by type
   */
  getCredentialsByType(type: string): VerifiableCredential[] {
    if (!this.profile) {
      return [];
    }

    return this.profile.credentials.filter(cred => 
      cred.type.includes(type)
    );
  }

  /**
   * Check if user has specific credential
   */
  hasCredential(type: string, requirements?: any): boolean {
    const credentials = this.getCredentialsByType(type);
    
    if (credentials.length === 0) {
      return false;
    }

    if (!requirements) {
      return true;
    }

    // Check if any credential meets requirements
    return credentials.some(cred => {
      for (const [key, value] of Object.entries(requirements)) {
        if (cred.credentialSubject[key] !== value) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Create presentation for credential sharing
   */
  async createPresentation(
    credentialIds: string[],
    audience: string,
    challenge?: string
  ): Promise<any> {
    if (!this.did || !this.profile) {
      throw new Error("DID or profile not initialized");
    }

    try {
      const credentials = this.profile.credentials.filter(cred =>
        credentialIds.includes(cred.id)
      );

      const presentation = {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://www.w3.org/2018/credentials/examples/v1",
        ],
        type: ["VerifiablePresentation"],
        verifiableCredential: credentials,
        holder: this.did.id,
        proof: {
          type: "JsonWebSignature2020",
          created: new Date().toISOString(),
          verificationMethod: `${this.did.id}#${this.did.id.split(":")[2]}`,
          proofPurpose: "authentication",
          challenge: challenge || `challenge-${Date.now()}`,
          domain: audience,
        },
      };

      // Sign the presentation
      const jws = await this.did.createJWS(presentation);
      presentation.proof.jws = jws.signatures[0].signature;

      return presentation;
    } catch (error) {
      console.error("Error creating presentation:", error);
      throw error;
    }
  }

  /**
   * Update reputation score
   */
  async updateReputation(updates: Partial<IdentityProfile["reputation"]>): Promise<void> {
    if (!this.profile) {
      throw new Error("Profile not loaded");
    }

    const newReputation = {
      ...this.profile.reputation,
      ...updates,
      lastActivity: new Date().toISOString(),
    };

    await this.updateProfile({ reputation: newReputation });
  }

  /**
   * Link wallet address
   */
  async linkWalletAddress(chain: string, address: string): Promise<void> {
    if (!this.profile) {
      throw new Error("Profile not loaded");
    }

    const walletAddresses = {
      ...this.profile.walletAddresses,
      [chain]: address,
    };

    await this.updateProfile({ walletAddresses });
  }

  /**
   * Get user profile
   */
  getProfile(): IdentityProfile | null {
    return this.profile;
  }

  /**
   * Get DID
   */
  getDID(): string | null {
    return this.did?.id || null;
  }

  /**
   * Resolve DID to profile
   */
  async resolveProfile(didId: string): Promise<IdentityProfile | null> {
    try {
      const profileQuery = await TileDocument.deterministic(this.ceramic, {
        controllers: [didId],
        family: "omniflow_profile",
      });

      return profileQuery.content as IdentityProfile || null;
    } catch (error) {
      console.error("Error resolving profile:", error);
      return null;
    }
  }

  /**
   * Search profiles by criteria
   */
  async searchProfiles(criteria: {
    hasCredential?: string;
    minReputation?: number;
    chain?: string;
  }): Promise<IdentityProfile[]> {
    try {
      // This would use Ceramic's indexing capabilities in production
      // For now, return empty array as this requires advanced Ceramic setup
      return [];
    } catch (error) {
      console.error("Error searching profiles:", error);
      return [];
    }
  }
}

// Export singleton instance
export const didIdentityService = new DIDIdentityService();

// Export utility functions
export const generateDIDSeed = (): Uint8Array => randomBytes(32);

export const createRWACredentialTemplate = (
  type: "real_estate" | "carbon_credits" | "precious_metals" | "commodities" | "certificate"
): Partial<RWACredential["credentialSubject"]> => {
  const templates = {
    real_estate: {
      rwaType: "real_estate" as const,
      currency: "USD",
      complianceLevel: "enhanced" as const,
      kycStatus: "pending" as const,
    },
    carbon_credits: {
      rwaType: "carbon_credits" as const,
      currency: "USD",
      complianceLevel: "institutional" as const,
      kycStatus: "verified" as const,
    },
    precious_metals: {
      rwaType: "precious_metals" as const,
      currency: "USD",
      complianceLevel: "enhanced" as const,
      kycStatus: "pending" as const,
    },
    commodities: {
      rwaType: "commodities" as const,
      currency: "USD",
      complianceLevel: "basic" as const,
      kycStatus: "pending" as const,
    },
    certificate: {
      rwaType: "certificate" as const,
      currency: "USD",
      complianceLevel: "basic" as const,
      kycStatus: "verified" as const,
    },
  };

  return templates[type];
};

export { DIDIdentityService };
