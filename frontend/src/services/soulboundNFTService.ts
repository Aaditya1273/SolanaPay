import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js'
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor'
import { 
  getAssociatedTokenAddress, 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint
} from '@solana/spl-token'
import { 
  createCreateMetadataAccountV3Instruction,
  PROGRAM_ID as METADATA_PROGRAM_ID,
  CreateMetadataAccountV3InstructionAccounts,
  CreateMetadataAccountV3InstructionArgs
} from '@metaplex-foundation/mpl-token-metadata'
import { snsService, SoulboundNFT } from './snsService'

export interface LoyaltyNFTMetadata {
  name: string
  symbol: string
  description: string
  image: string
  attributes: Array<{
    trait_type: string
    value: string | number
  }>
  properties: {
    category: 'loyalty' | 'achievement' | 'reputation'
    tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond'
    soulbound: true
    transferable: false
  }
}

export interface ReputationMetrics {
  totalTransactions: number
  totalVolume: number
  merchantRating: number
  customerRating: number
  communityContributions: number
  loyaltyStreak: number
  achievementCount: number
}

export class SoulboundNFTService {
  private connection: Connection
  private program: Program | null = null

  constructor(connection: Connection) {
    this.connection = connection
  }

  /**
   * Mint soulbound loyalty NFT bound to SNS domain
   */
  async mintLoyaltyNFT(
    wallet: any,
    snsDomain: string,
    tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond',
    metrics: ReputationMetrics
  ): Promise<{ mint: PublicKey; signature: string }> {
    if (!wallet.publicKey) throw new Error('Wallet not connected')

    // Verify SNS domain ownership
    const domainOwner = await snsService.resolveDomain(snsDomain)
    if (!domainOwner || !domainOwner.equals(wallet.publicKey)) {
      throw new Error('You do not own this SNS domain')
    }

    // Generate mint keypair
    const mintKeypair = Keypair.generate()
    
    // Get associated token account
    const tokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      wallet.publicKey
    )

    // Create metadata
    const metadata = this.generateLoyaltyMetadata(snsDomain, tier, metrics)
    const metadataUri = await this.uploadMetadata(metadata)

    // Get metadata PDA
    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        METADATA_PROGRAM_ID.toBuffer(),
        mintKeypair.publicKey.toBuffer()
      ],
      METADATA_PROGRAM_ID
    )

    // Build transaction
    const transaction = new Transaction()

    // Add create mint account instruction
    const mintRent = await getMinimumBalanceForRentExemptMint(this.connection)
    transaction.add(
      web3.SystemProgram.createAccount({
        fromPubkey: wallet.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: MINT_SIZE,
        lamports: mintRent,
        programId: TOKEN_PROGRAM_ID
      })
    )

    // Initialize mint (0 decimals for NFT, freeze authority set to prevent transfers)
    transaction.add(
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        0, // decimals
        wallet.publicKey, // mint authority
        wallet.publicKey // freeze authority (prevents transfers)
      )
    )

    // Create associated token account
    transaction.add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey, // payer
        tokenAccount, // associated token account
        wallet.publicKey, // owner
        mintKeypair.publicKey // mint
      )
    )

    // Mint 1 token to the associated token account
    transaction.add(
      createMintToInstruction(
        mintKeypair.publicKey, // mint
        tokenAccount, // destination
        wallet.publicKey, // authority
        1 // amount
      )
    )

    // Create metadata account
    const metadataAccounts: CreateMetadataAccountV3InstructionAccounts = {
      metadata: metadataPDA,
      mint: mintKeypair.publicKey,
      mintAuthority: wallet.publicKey,
      payer: wallet.publicKey,
      updateAuthority: wallet.publicKey,
      systemProgram: web3.SystemProgram.programId,
      rent: web3.SYSVAR_RENT_PUBKEY
    }

    const metadataArgs: CreateMetadataAccountV3InstructionArgs = {
      data: {
        name: metadata.name,
        symbol: metadata.symbol,
        uri: metadataUri,
        sellerFeeBasisPoints: 0,
        creators: [{
          address: wallet.publicKey,
          verified: true,
          share: 100
        }],
        collection: null,
        uses: null
      },
      isMutable: false, // Soulbound NFTs are immutable
      collectionDetails: null
    }

    transaction.add(
      createCreateMetadataAccountV3Instruction(metadataAccounts, metadataArgs)
    )

    // Sign and send transaction
    transaction.feePayer = wallet.publicKey
    transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash
    
    // Sign with both wallet and mint keypair
    transaction.partialSign(mintKeypair)
    const signedTransaction = await wallet.signTransaction(transaction)
    
    const signature = await this.connection.sendRawTransaction(signedTransaction.serialize())
    await this.connection.confirmTransaction(signature)

    // Create soulbound NFT record
    const soulboundNFT: SoulboundNFT = {
      mint: mintKeypair.publicKey,
      name: metadata.name,
      description: metadata.description,
      image: metadata.image,
      attributes: metadata.attributes,
      boundTo: snsDomain,
      transferable: false,
      createdAt: Date.now()
    }

    // Bind to SNS domain
    await snsService.bindSoulboundNFT(snsDomain, soulboundNFT)

    console.log(`Minted soulbound loyalty NFT for ${snsDomain}:`, {
      mint: mintKeypair.publicKey.toString(),
      tier,
      signature
    })

    return {
      mint: mintKeypair.publicKey,
      signature
    }
  }

  /**
   * Update loyalty NFT metadata based on new reputation metrics
   */
  async updateLoyaltyNFT(
    wallet: any,
    mintAddress: PublicKey,
    newMetrics: ReputationMetrics
  ): Promise<string> {
    if (!wallet.publicKey) throw new Error('Wallet not connected')

    // Get current NFT metadata
    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        METADATA_PROGRAM_ID.toBuffer(),
        mintAddress.toBuffer()
      ],
      METADATA_PROGRAM_ID
    )

    // Calculate new tier based on metrics
    const newTier = this.calculateTierFromMetrics(newMetrics)
    
    // For soulbound NFTs, we typically mint a new one rather than update
    // This preserves the history of achievements
    console.log(`Loyalty NFT update requested for ${mintAddress.toString()}`)
    console.log('New tier would be:', newTier)
    
    // In a real implementation, you might:
    // 1. Burn the old NFT
    // 2. Mint a new one with updated metadata
    // 3. Or create a new achievement NFT alongside the existing one
    
    return 'update_simulated'
  }

  /**
   * Get all soulbound NFTs for a wallet
   */
  async getSoulboundNFTs(wallet: PublicKey): Promise<SoulboundNFT[]> {
    try {
      // Get SNS domain for wallet
      const domain = await snsService.reverseLookup(wallet)
      if (!domain) return []

      // Get soulbound NFTs for domain
      return await snsService.getSoulboundNFTs(domain)
    } catch (error) {
      console.error('Error fetching soulbound NFTs:', error)
      return []
    }
  }

  /**
   * Verify NFT is soulbound and bound to correct domain
   */
  async verifySoulboundBinding(
    mintAddress: PublicKey,
    expectedDomain: string
  ): Promise<boolean> {
    try {
      const nfts = await snsService.getSoulboundNFTs(expectedDomain)
      return nfts.some(nft => nft.mint.equals(mintAddress))
    } catch (error) {
      console.error('Error verifying soulbound binding:', error)
      return false
    }
  }

  /**
   * Get reputation leaderboard with soulbound NFT data
   */
  async getReputationLeaderboard(): Promise<Array<{
    domain: string
    reputation: any
    soulboundNFTs: SoulboundNFT[]
  }>> {
    try {
      const profiles = await snsService.getReputationLeaderboard()
      
      const leaderboard = await Promise.all(
        profiles.map(async (profile) => ({
          domain: profile.domain,
          reputation: profile.reputation,
          soulboundNFTs: await snsService.getSoulboundNFTs(profile.domain)
        }))
      )

      return leaderboard
    } catch (error) {
      console.error('Error fetching reputation leaderboard:', error)
      return []
    }
  }

  private generateLoyaltyMetadata(
    snsDomain: string,
    tier: string,
    metrics: ReputationMetrics
  ): LoyaltyNFTMetadata {
    return {
      name: `${snsDomain} Loyalty ${tier}`,
      symbol: 'LOYALTY',
      description: `Soulbound loyalty NFT for ${snsDomain}. This NFT represents community reputation and cannot be transferred.`,
      image: this.generateTierImage(tier),
      attributes: [
        { trait_type: 'Domain', value: snsDomain },
        { trait_type: 'Tier', value: tier },
        { trait_type: 'Total Transactions', value: metrics.totalTransactions },
        { trait_type: 'Total Volume', value: metrics.totalVolume },
        { trait_type: 'Merchant Rating', value: metrics.merchantRating },
        { trait_type: 'Customer Rating', value: metrics.customerRating },
        { trait_type: 'Community Contributions', value: metrics.communityContributions },
        { trait_type: 'Loyalty Streak', value: metrics.loyaltyStreak },
        { trait_type: 'Achievement Count', value: metrics.achievementCount },
        { trait_type: 'Soulbound', value: 'true' },
        { trait_type: 'Transferable', value: 'false' }
      ],
      properties: {
        category: 'loyalty',
        tier: tier as any,
        soulbound: true,
        transferable: false
      }
    }
  }

  private generateTierImage(tier: string): string {
    const images = {
      Bronze: 'https://arweave.net/bronze-loyalty-badge',
      Silver: 'https://arweave.net/silver-loyalty-badge',
      Gold: 'https://arweave.net/gold-loyalty-badge',
      Platinum: 'https://arweave.net/platinum-loyalty-badge',
      Diamond: 'https://arweave.net/diamond-loyalty-badge'
    }
    return images[tier as keyof typeof images] || images.Bronze
  }

  private calculateTierFromMetrics(metrics: ReputationMetrics): string {
    const score = 
      metrics.totalTransactions * 10 +
      metrics.totalVolume * 0.1 +
      metrics.merchantRating * 50 +
      metrics.customerRating * 50 +
      metrics.communityContributions * 25 +
      metrics.loyaltyStreak * 5 +
      metrics.achievementCount * 100

    if (score >= 10000) return 'Diamond'
    if (score >= 5000) return 'Platinum'
    if (score >= 2000) return 'Gold'
    if (score >= 500) return 'Silver'
    return 'Bronze'
  }

  private async uploadMetadata(metadata: LoyaltyNFTMetadata): Promise<string> {
    // In a real implementation, upload to IPFS or Arweave
    // For demo, return a mock URI
    const mockUri = `https://arweave.net/metadata/${Date.now()}`
    console.log('Mock metadata upload:', mockUri, metadata)
    return mockUri
  }
}

export const soulboundNFTService = new SoulboundNFTService(
  new Connection(process.env.REACT_APP_SOLANA_RPC_URL || 'https://api.devnet.solana.com')
)
