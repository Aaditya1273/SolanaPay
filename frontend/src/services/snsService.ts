import { Connection, PublicKey } from '@solana/web3.js'
import { NameRegistryState, getHashedName, getNameAccountKey, performReverseLookup } from '@bonfida/spl-name-service'

// SNS Program ID and constants
const SNS_PROGRAM_ID = new PublicKey('namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX')
const SOL_TLD_AUTHORITY = new PublicKey('58PwtjSDuFHuUkYjH9BYnnQKHfwo9reZhC2zMJv9JPkx')

export interface SNSProfile {
  domain: string
  owner: PublicKey
  avatar?: string
  bio?: string
  twitter?: string
  discord?: string
  github?: string
  website?: string
  reputation: {
    score: number
    level: 'Newcomer' | 'Active' | 'Trusted' | 'Veteran' | 'Legend'
    badges: string[]
    loyaltyNFTs: string[]
  }
}

export interface SoulboundNFT {
  mint: PublicKey
  name: string
  description: string
  image: string
  attributes: Array<{
    trait_type: string
    value: string | number
  }>
  boundTo: string // SNS domain
  transferable: false
  createdAt: number
}

export class SNSService {
  private connection: Connection
  private cache: Map<string, SNSProfile> = new Map()
  private reverseCache: Map<string, string> = new Map()

  constructor(connection: Connection) {
    this.connection = connection
  }

  /**
   * Resolve .sol domain to wallet address
   */
  async resolveDomain(domain: string): Promise<PublicKey | null> {
    try {
      if (!domain.endsWith('.sol')) {
        domain = `${domain}.sol`
      }

      const domainName = domain.replace('.sol', '')
      const hashedName = await getHashedName(domainName)
      const nameAccountKey = await getNameAccountKey(
        hashedName,
        undefined,
        SOL_TLD_AUTHORITY
      )

      const nameAccount = await this.connection.getAccountInfo(nameAccountKey)
      if (!nameAccount?.data) return null

      const nameRegistryState = NameRegistryState.deserialize(nameAccount.data)
      return new PublicKey(nameRegistryState.owner)
    } catch (error) {
      console.error('Error resolving domain:', error)
      return null
    }
  }

  /**
   * Reverse lookup: wallet address to .sol domain
   */
  async reverseLookup(address: PublicKey | string): Promise<string | null> {
    try {
      const pubkey = typeof address === 'string' ? new PublicKey(address) : address
      const addressStr = pubkey.toString()

      // Check cache first
      if (this.reverseCache.has(addressStr)) {
        return this.reverseCache.get(addressStr)!
      }

      const domainName = await performReverseLookup(this.connection, pubkey)
      if (domainName) {
        const fullDomain = `${domainName}.sol`
        this.reverseCache.set(addressStr, fullDomain)
        return fullDomain
      }

      return null
    } catch (error) {
      console.error('Error in reverse lookup:', error)
      return null
    }
  }

  /**
   * Get SNS profile with reputation data
   */
  async getProfile(domain: string): Promise<SNSProfile | null> {
    try {
      if (!domain.endsWith('.sol')) {
        domain = `${domain}.sol`
      }

      // Check cache first
      if (this.cache.has(domain)) {
        return this.cache.get(domain)!
      }

      const owner = await this.resolveDomain(domain)
      if (!owner) return null

      // In a real implementation, this would fetch from on-chain data
      // For demo, we'll simulate profile data
      const profile: SNSProfile = {
        domain,
        owner,
        avatar: this.generateAvatar(domain),
        bio: `Community member using ${domain}`,
        reputation: {
          score: Math.floor(Math.random() * 1000) + 100,
          level: this.calculateReputationLevel(Math.floor(Math.random() * 1000) + 100),
          badges: this.generateBadges(domain),
          loyaltyNFTs: []
        }
      }

      // Cache the profile
      this.cache.set(domain, profile)
      return profile
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  }

  /**
   * Format display name - prioritize .sol domain over address
   */
  async formatDisplayName(address: PublicKey | string): Promise<string> {
    try {
      const pubkey = typeof address === 'string' ? new PublicKey(address) : address
      
      // Try reverse lookup first
      const domain = await this.reverseLookup(pubkey)
      if (domain) {
        return domain
      }

      // Fallback to formatted address
      const addressStr = pubkey.toString()
      return `${addressStr.slice(0, 6)}...${addressStr.slice(-4)}`
    } catch (error) {
      console.error('Error formatting display name:', error)
      const addressStr = typeof address === 'string' ? address : address.toString()
      return `${addressStr.slice(0, 6)}...${addressStr.slice(-4)}`
    }
  }

  /**
   * Register a new .sol domain (simulation)
   */
  async registerDomain(domain: string, owner: PublicKey): Promise<boolean> {
    try {
      if (!domain.endsWith('.sol')) {
        domain = `${domain}.sol`
      }

      console.log(`Registering domain ${domain} for ${owner.toString()}`)
      
      // In real implementation, this would create the domain registration transaction
      // For demo, we'll just cache it
      const profile: SNSProfile = {
        domain,
        owner,
        avatar: this.generateAvatar(domain),
        bio: `New community member with ${domain}`,
        reputation: {
          score: 100,
          level: 'Newcomer',
          badges: ['New Member'],
          loyaltyNFTs: []
        }
      }

      this.cache.set(domain, profile)
      this.reverseCache.set(owner.toString(), domain)
      
      return true
    } catch (error) {
      console.error('Error registering domain:', error)
      return false
    }
  }

  /**
   * Bind soulbound NFT to .sol identity
   */
  async bindSoulboundNFT(domain: string, nft: SoulboundNFT): Promise<boolean> {
    try {
      if (!domain.endsWith('.sol')) {
        domain = `${domain}.sol`
      }

      const profile = await this.getProfile(domain)
      if (!profile) return false

      // Add NFT to profile
      profile.reputation.loyaltyNFTs.push(nft.mint.toString())
      
      // Update reputation based on NFT
      this.updateReputationFromNFT(profile, nft)
      
      // Cache updated profile
      this.cache.set(domain, profile)
      
      console.log(`Bound soulbound NFT ${nft.name} to ${domain}`)
      return true
    } catch (error) {
      console.error('Error binding soulbound NFT:', error)
      return false
    }
  }

  /**
   * Get soulbound NFTs for a domain
   */
  async getSoulboundNFTs(domain: string): Promise<SoulboundNFT[]> {
    try {
      const profile = await this.getProfile(domain)
      if (!profile) return []

      // In real implementation, fetch actual NFT data
      return profile.reputation.loyaltyNFTs.map(mintStr => ({
        mint: new PublicKey(mintStr),
        name: 'Loyalty Badge',
        description: `Soulbound loyalty NFT for ${domain}`,
        image: this.generateNFTImage(domain),
        attributes: [
          { trait_type: 'Domain', value: domain },
          { trait_type: 'Reputation Level', value: profile.reputation.level },
          { trait_type: 'Score', value: profile.reputation.score }
        ],
        boundTo: domain,
        transferable: false,
        createdAt: Date.now()
      }))
    } catch (error) {
      console.error('Error fetching soulbound NFTs:', error)
      return []
    }
  }

  /**
   * Search domains by partial match
   */
  async searchDomains(query: string): Promise<string[]> {
    try {
      // In real implementation, this would query the name service
      // For demo, return some mock results
      const mockDomains = [
        'alice.sol',
        'bob.sol',
        'cafe.sol',
        'shop.sol',
        'ngo.sol',
        'volunteer.sol',
        'merchant.sol',
        'customer.sol'
      ]

      return mockDomains.filter(domain => 
        domain.toLowerCase().includes(query.toLowerCase())
      )
    } catch (error) {
      console.error('Error searching domains:', error)
      return []
    }
  }

  /**
   * Get community reputation leaderboard
   */
  async getReputationLeaderboard(): Promise<SNSProfile[]> {
    try {
      // In real implementation, fetch from on-chain data
      const mockProfiles: SNSProfile[] = [
        {
          domain: 'alice.sol',
          owner: new PublicKey('11111111111111111111111111111112'),
          reputation: { score: 950, level: 'Legend', badges: ['Pioneer', 'Top Contributor'], loyaltyNFTs: [] }
        },
        {
          domain: 'cafe.sol',
          owner: new PublicKey('11111111111111111111111111111113'),
          reputation: { score: 820, level: 'Veteran', badges: ['Merchant', 'Trusted Seller'], loyaltyNFTs: [] }
        },
        {
          domain: 'volunteer.sol',
          owner: new PublicKey('11111111111111111111111111111114'),
          reputation: { score: 750, level: 'Trusted', badges: ['Community Helper', 'NGO Partner'], loyaltyNFTs: [] }
        }
      ]

      return mockProfiles.sort((a, b) => b.reputation.score - a.reputation.score)
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
      return []
    }
  }

  private generateAvatar(domain: string): string {
    // Generate consistent avatar based on domain
    const avatars = ['👤', '🧑‍💼', '👩‍💻', '🧑‍🎨', '👨‍🔬', '👩‍🚀', '🧑‍🍳', '👨‍🌾']
    const index = domain.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % avatars.length
    return avatars[index]
  }

  private calculateReputationLevel(score: number): SNSProfile['reputation']['level'] {
    if (score >= 800) return 'Legend'
    if (score >= 600) return 'Veteran'
    if (score >= 400) return 'Trusted'
    if (score >= 200) return 'Active'
    return 'Newcomer'
  }

  private generateBadges(domain: string): string[] {
    const badges = ['Early Adopter', 'Community Member', 'Verified']
    if (domain.includes('cafe') || domain.includes('shop')) badges.push('Merchant')
    if (domain.includes('ngo') || domain.includes('volunteer')) badges.push('Community Helper')
    return badges
  }

  private generateNFTImage(domain: string): string {
    // Generate consistent NFT image based on domain
    const images = ['🏆', '🥇', '🎖️', '⭐', '💎', '👑', '🔥', '⚡']
    const index = domain.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % images.length
    return images[index]
  }

  private updateReputationFromNFT(profile: SNSProfile, nft: SoulboundNFT): void {
    // Update reputation based on NFT type
    profile.reputation.score += 50
    
    if (nft.name.includes('Gold')) {
      profile.reputation.score += 100
      profile.reputation.badges.push('Gold Achiever')
    } else if (nft.name.includes('Silver')) {
      profile.reputation.score += 50
      profile.reputation.badges.push('Silver Achiever')
    }

    // Recalculate level
    profile.reputation.level = this.calculateReputationLevel(profile.reputation.score)
  }
}

// Export singleton instance
export const snsService = new SNSService(
  new Connection(process.env.REACT_APP_SOLANA_RPC_URL || 'https://api.devnet.solana.com')
)
