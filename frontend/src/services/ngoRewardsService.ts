import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js'
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor'
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token'

// NGO Rewards Program IDL (simplified for demo)
const NGO_REWARDS_PROGRAM_ID = new PublicKey('NGORewards1111111111111111111111111111111')
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') // USDC mainnet

export interface NGO {
  authority: PublicKey
  name: string
  description: string
  website: string
  totalTasks: number
  totalVolunteers: number
  totalRewardsDistributed: number
  isActive: boolean
  createdAt: number
}

export interface Task {
  id: string
  ngo: PublicKey
  creator: PublicKey
  title: string
  description: string
  rewardAmount: number
  maxCompletions: number
  currentCompletions: number
  deadline: number
  requiredProof: 'Photo' | 'Document' | 'Video' | 'Location' | 'Attestation'
  status: 'Active' | 'Completed' | 'Cancelled' | 'Expired'
  createdAt: number
}

export interface TaskCompletion {
  id: string
  task: PublicKey
  volunteer: PublicKey
  proofData: string
  proofHash: string
  status: 'Pending' | 'Approved' | 'Rejected'
  feedback: string
  submittedAt: number
  validatedAt: number
  validator: PublicKey
}

export interface RewardNFT {
  id: string
  mint: PublicKey
  name: string
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum'
  taskTitle: string
  ngoName: string
  mintedAt: number
  metadata: {
    image: string
    description: string
    attributes: Array<{ trait_type: string; value: string }>
  }
}

export class NGORewardsService {
  private connection: Connection
  private program: Program | null = null

  constructor(connection: Connection) {
    this.connection = connection
  }

  async initializeProgram(wallet: any) {
    if (!wallet.publicKey) throw new Error('Wallet not connected')
    
    const provider = new AnchorProvider(
      this.connection,
      wallet,
      { commitment: 'confirmed' }
    )
    
    // In a real implementation, you would load the actual IDL
    // For demo purposes, we'll simulate the program interactions
    this.program = null // Placeholder
  }

  async initializeNGO(
    wallet: any,
    name: string,
    description: string,
    website: string
  ): Promise<string> {
    if (!wallet.publicKey) throw new Error('Wallet not connected')

    const ngoPda = await this.getNGOPDA(wallet.publicKey)
    
    // Simulate NGO initialization
    const mockTxId = `ngo_init_${Date.now()}`
    
    console.log('Initializing NGO:', {
      authority: wallet.publicKey.toString(),
      name,
      description,
      website
    })

    return mockTxId
  }

  async createTask(
    wallet: any,
    title: string,
    description: string,
    rewardAmount: number,
    maxCompletions: number,
    deadline: Date,
    requiredProof: 'Photo' | 'Document' | 'Video' | 'Location' | 'Attestation'
  ): Promise<string> {
    if (!wallet.publicKey) throw new Error('Wallet not connected')

    const ngoPda = await this.getNGOPDA(wallet.publicKey)
    const ngo = await this.getNGO(wallet.publicKey)
    const taskPda = await this.getTaskPDA(ngoPda, ngo?.totalTasks || 0)
    
    // Simulate task creation
    const mockTxId = `task_create_${Date.now()}`
    
    console.log('Creating task:', {
      ngo: ngoPda.toString(),
      title,
      description,
      rewardAmount,
      maxCompletions,
      deadline: deadline.getTime(),
      requiredProof
    })

    return mockTxId
  }

  async submitTaskCompletion(
    wallet: any,
    taskId: string,
    proofData: string
  ): Promise<string> {
    if (!wallet.publicKey) throw new Error('Wallet not connected')

    const taskPda = new PublicKey(taskId)
    const completionPda = await this.getTaskCompletionPDA(taskPda, wallet.publicKey)
    
    // Generate proof hash (simplified)
    const proofHash = this.generateProofHash(proofData)
    
    console.log('Submitting task completion:', {
      task: taskId,
      volunteer: wallet.publicKey.toString(),
      proofData: proofData.substring(0, 100) + '...',
      proofHash
    })

    // Simulate task submission
    const mockTxId = `task_submit_${Date.now()}`
    
    return mockTxId
  }

  async validateTaskCompletion(
    wallet: any,
    completionId: string,
    approved: boolean,
    feedback: string
  ): Promise<string> {
    if (!wallet.publicKey) throw new Error('Wallet not connected')

    console.log('Validating task completion:', {
      completion: completionId,
      validator: wallet.publicKey.toString(),
      approved,
      feedback
    })

    // Simulate validation
    const mockTxId = `task_validate_${Date.now()}`
    
    return mockTxId
  }

  async mintRewardNFT(
    wallet: any,
    completionId: string,
    name: string,
    tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum'
  ): Promise<string> {
    if (!wallet.publicKey) throw new Error('Wallet not connected')

    // Generate new mint keypair
    const mintKeypair = web3.Keypair.generate()
    
    // Get token account
    const tokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      wallet.publicKey
    )

    console.log('Minting reward NFT:', {
      completion: completionId,
      volunteer: wallet.publicKey.toString(),
      mint: mintKeypair.publicKey.toString(),
      name,
      tier
    })

    // Simulate NFT minting
    const mockTxId = `nft_mint_${Date.now()}`
    
    return mockTxId
  }

  async distributeMicroRewards(
    wallet: any,
    recipients: PublicKey[],
    amounts: number[]
  ): Promise<string> {
    if (!wallet.publicKey) throw new Error('Wallet not connected')
    if (recipients.length !== amounts.length) throw new Error('Recipients and amounts arrays must have same length')
    if (recipients.length > 10) throw new Error('Too many recipients (max 10)')

    const totalAmount = amounts.reduce((sum, amount) => sum + amount, 0)

    console.log('Distributing micro rewards:', {
      ngo: wallet.publicKey.toString(),
      totalRecipients: recipients.length,
      totalAmount,
      recipients: recipients.map(r => r.toString()),
      amounts
    })

    // Simulate micro rewards distribution
    const mockTxId = `micro_rewards_${Date.now()}`
    
    return mockTxId
  }

  async getNGO(authority: PublicKey): Promise<NGO | null> {
    try {
      const ngoPda = await this.getNGOPDA(authority)
      
      // Simulate fetching NGO data
      return {
        authority,
        name: 'Demo NGO',
        description: 'A demonstration NGO for volunteer rewards',
        website: 'https://demo-ngo.org',
        totalTasks: 0,
        totalVolunteers: 0,
        totalRewardsDistributed: 0,
        isActive: true,
        createdAt: Date.now()
      }
    } catch (error) {
      console.error('Error fetching NGO:', error)
      return null
    }
  }

  async getTasks(ngoAddress?: PublicKey): Promise<Task[]> {
    try {
      // Simulate fetching tasks
      const mockTasks: Task[] = [
        {
          id: 'task_1',
          ngo: ngoAddress || new PublicKey('11111111111111111111111111111112'),
          creator: new PublicKey('11111111111111111111111111111112'),
          title: 'Beach Cleanup Drive',
          description: 'Help clean up plastic waste from our local beach',
          rewardAmount: 5,
          maxCompletions: 50,
          currentCompletions: 23,
          deadline: Date.now() + 7 * 24 * 60 * 60 * 1000,
          requiredProof: 'Photo',
          status: 'Active',
          createdAt: Date.now()
        }
      ]
      
      return mockTasks
    } catch (error) {
      console.error('Error fetching tasks:', error)
      return []
    }
  }

  async getTaskCompletions(taskId: string): Promise<TaskCompletion[]> {
    try {
      // Simulate fetching task completions
      return []
    } catch (error) {
      console.error('Error fetching task completions:', error)
      return []
    }
  }

  async getVolunteerCompletions(volunteer: PublicKey): Promise<TaskCompletion[]> {
    try {
      // Simulate fetching volunteer completions
      return []
    } catch (error) {
      console.error('Error fetching volunteer completions:', error)
      return []
    }
  }

  async getRewardNFTs(owner: PublicKey): Promise<RewardNFT[]> {
    try {
      // Simulate fetching reward NFTs
      return []
    } catch (error) {
      console.error('Error fetching reward NFTs:', error)
      return []
    }
  }

  async getVolunteerStats(volunteer: PublicKey): Promise<{
    tasksCompleted: number
    totalRewards: number
    nftsEarned: number
    impactScore: number
  }> {
    try {
      // Simulate fetching volunteer stats
      return {
        tasksCompleted: 0,
        totalRewards: 0,
        nftsEarned: 0,
        impactScore: 0
      }
    } catch (error) {
      console.error('Error fetching volunteer stats:', error)
      return {
        tasksCompleted: 0,
        totalRewards: 0,
        nftsEarned: 0,
        impactScore: 0
      }
    }
  }

  private generateProofHash(proofData: string): string {
    // Simple hash generation for demo (in production, use proper cryptographic hash)
    let hash = 0
    for (let i = 0; i < proofData.length; i++) {
      const char = proofData.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16)
  }

  private async getNGOPDA(authority: PublicKey): Promise<PublicKey> {
    const [pda] = await PublicKey.findProgramAddress(
      [Buffer.from('ngo'), authority.toBuffer()],
      NGO_REWARDS_PROGRAM_ID
    )
    return pda
  }

  private async getTaskPDA(ngo: PublicKey, taskIndex: number): Promise<PublicKey> {
    const [pda] = await PublicKey.findProgramAddress(
      [Buffer.from('task'), ngo.toBuffer(), Buffer.from(taskIndex.toString())],
      NGO_REWARDS_PROGRAM_ID
    )
    return pda
  }

  private async getTaskCompletionPDA(task: PublicKey, volunteer: PublicKey): Promise<PublicKey> {
    const [pda] = await PublicKey.findProgramAddress(
      [Buffer.from('completion'), task.toBuffer(), volunteer.toBuffer()],
      NGO_REWARDS_PROGRAM_ID
    )
    return pda
  }
}

export const ngoRewardsService = new NGORewardsService(
  new Connection(process.env.REACT_APP_SOLANA_RPC_URL || 'https://api.devnet.solana.com')
)
