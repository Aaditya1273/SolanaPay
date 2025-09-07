import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { createTransferInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { Program, AnchorProvider, web3, BN, Idl } from '@coral-xyz/anchor'
import { encodeURL, createQR } from '@solana/pay'
import BigNumber from 'bignumber.js'

// SolanaPay Program IDL (simplified)
const SOLANAPAY_PROGRAM_ID = new PublicKey('SPAYxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') // USDC mainnet

export interface PaymentRequest {
  recipient: string
  amount: number
  currency: 'SOL' | 'USDC'
  description?: string
  autoRelease?: boolean
  autoReleaseTime?: number
}

export interface PaymentResult {
  signature: string
  paymentId: string
  status: 'pending' | 'completed' | 'failed'
}

class SolanaPayService {
  private connection: Connection
  private program: Program | null = null

  constructor() {
    const rpcUrl = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
    this.connection = new Connection(rpcUrl, 'confirmed')
  }

  async initializeProgram(wallet: any) {
    if (!wallet) throw new Error('Wallet not connected')
    
    const provider = new AnchorProvider(this.connection, wallet, {
      commitment: 'confirmed',
    })
    
    // Load program IDL (would need to be imported or fetched)
    // For now, we'll work with basic Solana transactions
    return provider
  }

  /**
   * Create a SolanaPay QR code for payment requests
   */
  async createPaymentQR(request: PaymentRequest): Promise<string> {
    const { recipient, amount, currency, description } = request
    
    const recipientPubkey = new PublicKey(recipient)
    const amountBN = currency === 'SOL' 
      ? new BigNumber(amount * LAMPORTS_PER_SOL)
      : new BigNumber(amount * 1_000_000) // USDC has 6 decimals

    const paymentUrl = encodeURL({
      recipient: recipientPubkey,
      amount: amountBN,
      splToken: currency === 'USDC' ? USDC_MINT : undefined,
      reference: web3.Keypair.generate().publicKey, // Unique reference
      label: 'SolanaPay Payment',
      message: description || 'Payment via SolanaPay',
    })

    return paymentUrl.toString()
  }

  /**
   * Generate QR code image from payment URL
   */
  async generateQRCode(paymentUrl: string): Promise<string> {
    const qr = createQR(paymentUrl, 300, 'white', 'black')
    return qr.toDataURL()
  }

  /**
   * Create escrow payment using our custom program
   */
  async createEscrowPayment(
    wallet: any,
    request: PaymentRequest
  ): Promise<PaymentResult> {
    try {
      const provider = await this.initializeProgram(wallet)
      const recipientPubkey = new PublicKey(request.recipient)
      
      // Create payment account PDA
      const [paymentPDA] = await PublicKey.findProgramAddress(
        [Buffer.from('payment'), wallet.publicKey.toBuffer()],
        SOLANAPAY_PROGRAM_ID
      )

      const transaction = new Transaction()
      
      if (request.currency === 'SOL') {
        // SOL payment through our escrow program
        const amount = request.amount * LAMPORTS_PER_SOL
        
        // This would be replaced with actual program instruction
        const instruction = SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: paymentPDA,
          lamports: amount,
        })
        
        transaction.add(instruction)
      } else {
        // USDC payment through our escrow program
        const amount = request.amount * 1_000_000 // USDC decimals
        
        const senderTokenAccount = await getAssociatedTokenAddress(
          USDC_MINT,
          wallet.publicKey
        )
        
        const escrowTokenAccount = await getAssociatedTokenAddress(
          USDC_MINT,
          paymentPDA,
          true
        )
        
        const transferInstruction = createTransferInstruction(
          senderTokenAccount,
          escrowTokenAccount,
          wallet.publicKey,
          amount
        )
        
        transaction.add(transferInstruction)
      }

      // Sign and send transaction
      const signature = await wallet.sendTransaction(transaction, this.connection)
      await this.connection.confirmTransaction(signature, 'confirmed')

      return {
        signature,
        paymentId: paymentPDA.toString(),
        status: 'pending'
      }
    } catch (error) {
      console.error('Escrow payment failed:', error)
      throw error
    }
  }

  /**
   * Release payment from escrow
   */
  async releasePayment(wallet: any, paymentId: string): Promise<string> {
    try {
      const provider = await this.initializeProgram(wallet)
      const paymentPDA = new PublicKey(paymentId)
      
      // Create release instruction (would use actual program instruction)
      const transaction = new Transaction()
      // Add release instruction here
      
      const signature = await wallet.sendTransaction(transaction, this.connection)
      await this.connection.confirmTransaction(signature, 'confirmed')
      
      return signature
    } catch (error) {
      console.error('Payment release failed:', error)
      throw error
    }
  }

  /**
   * Check payment status
   */
  async getPaymentStatus(paymentId: string): Promise<any> {
    try {
      const paymentPDA = new PublicKey(paymentId)
      const accountInfo = await this.connection.getAccountInfo(paymentPDA)
      
      if (!accountInfo) {
        return { status: 'not_found' }
      }
      
      // Decode payment account data
      // This would use the actual program's account structure
      return {
        status: 'pending', // Would be decoded from account data
        amount: 0,
        recipient: '',
        created_at: Date.now()
      }
    } catch (error) {
      console.error('Failed to get payment status:', error)
      throw error
    }
  }

  /**
   * Get user's SOL and USDC balances
   */
  async getBalances(publicKey: PublicKey): Promise<{ sol: number; usdc: number }> {
    try {
      // Get SOL balance
      const solBalance = await this.connection.getBalance(publicKey)
      
      // Get USDC balance
      let usdcBalance = 0
      try {
        const usdcTokenAccount = await getAssociatedTokenAddress(USDC_MINT, publicKey)
        const tokenAccountInfo = await this.connection.getTokenAccountBalance(usdcTokenAccount)
        usdcBalance = tokenAccountInfo.value.uiAmount || 0
      } catch (error) {
        // USDC account doesn't exist
        usdcBalance = 0
      }
      
      return {
        sol: solBalance / LAMPORTS_PER_SOL,
        usdc: usdcBalance
      }
    } catch (error) {
      console.error('Failed to get balances:', error)
      return { sol: 0, usdc: 0 }
    }
  }

  /**
   * Estimate transaction fees
   */
  async estimateFees(request: PaymentRequest): Promise<{ networkFee: number; platformFee: number }> {
    try {
      // Get recent blockhash for fee estimation
      const { feeCalculator } = await this.connection.getRecentBlockhash()
      const networkFee = feeCalculator.lamportsPerSignature / LAMPORTS_PER_SOL
      
      // Platform fee (2.5% for regular payments, 0.5% for merchants)
      const platformFeeRate = 0.025
      const platformFee = request.amount * platformFeeRate
      
      return {
        networkFee,
        platformFee
      }
    } catch (error) {
      console.error('Failed to estimate fees:', error)
      return { networkFee: 0.000005, platformFee: request.amount * 0.025 }
    }
  }

  /**
   * Create instant payment (non-escrow)
   */
  async createInstantPayment(
    wallet: any,
    request: PaymentRequest
  ): Promise<PaymentResult> {
    try {
      const recipientPubkey = new PublicKey(request.recipient)
      const transaction = new Transaction()
      
      if (request.currency === 'SOL') {
        const amount = request.amount * LAMPORTS_PER_SOL
        const instruction = SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: recipientPubkey,
          lamports: amount,
        })
        transaction.add(instruction)
      } else {
        // USDC transfer
        const amount = request.amount * 1_000_000
        
        const senderTokenAccount = await getAssociatedTokenAddress(
          USDC_MINT,
          wallet.publicKey
        )
        
        const recipientTokenAccount = await getAssociatedTokenAddress(
          USDC_MINT,
          recipientPubkey
        )
        
        const transferInstruction = createTransferInstruction(
          senderTokenAccount,
          recipientTokenAccount,
          wallet.publicKey,
          amount
        )
        
        transaction.add(transferInstruction)
      }
      
      const signature = await wallet.sendTransaction(transaction, this.connection)
      await this.connection.confirmTransaction(signature, 'confirmed')
      
      return {
        signature,
        paymentId: signature,
        status: 'completed'
      }
    } catch (error) {
      console.error('Instant payment failed:', error)
      throw error
    }
  }

  /**
   * Subscribe to payment updates
   */
  subscribeToPayment(paymentId: string, callback: (status: any) => void): () => void {
    const paymentPDA = new PublicKey(paymentId)
    
    const subscriptionId = this.connection.onAccountChange(
      paymentPDA,
      (accountInfo) => {
        // Decode account data and call callback
        callback({
          status: 'updated',
          timestamp: Date.now()
        })
      },
      'confirmed'
    )
    
    // Return unsubscribe function
    return () => {
      this.connection.removeAccountChangeListener(subscriptionId)
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(publicKey: PublicKey, limit = 10): Promise<any[]> {
    try {
      const signatures = await this.connection.getSignaturesForAddress(
        publicKey,
        { limit }
      )
      
      const transactions = await Promise.all(
        signatures.map(async (sig) => {
          const tx = await this.connection.getTransaction(sig.signature)
          return {
            signature: sig.signature,
            timestamp: sig.blockTime,
            status: sig.confirmationStatus,
            transaction: tx
          }
        })
      )
      
      return transactions.filter(tx => tx.transaction !== null)
    } catch (error) {
      console.error('Failed to get transaction history:', error)
      return []
    }
  }
}

export const solanaPayService = new SolanaPayService()
export default solanaPayService
