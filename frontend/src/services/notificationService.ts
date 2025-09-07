import { toast } from 'react-hot-toast'
import { Connection, PublicKey } from '@solana/web3.js'

export interface PaymentNotification {
  id: string
  type: 'payment_received' | 'payment_sent' | 'escrow_created' | 'escrow_released' | 'nft_minted'
  title: string
  message: string
  amount?: number
  currency?: 'SOL' | 'USDC'
  signature?: string
  timestamp: number
  read: boolean
}

class NotificationService {
  private connection: Connection
  private subscriptions: Map<string, number> = new Map()
  private notifications: PaymentNotification[] = []
  private listeners: ((notification: PaymentNotification) => void)[] = []

  constructor() {
    const rpcUrl = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
    this.connection = new Connection(rpcUrl, 'confirmed')
  }

  /**
   * Subscribe to payment notifications for a wallet
   */
  subscribeToWallet(publicKey: PublicKey): () => void {
    const address = publicKey.toString()
    
    // Remove existing subscription if any
    this.unsubscribeFromWallet(address)
    
    // Subscribe to account changes
    const subscriptionId = this.connection.onAccountChange(
      publicKey,
      (accountInfo, context) => {
        this.handleAccountChange(publicKey, accountInfo, context)
      },
      'confirmed'
    )
    
    this.subscriptions.set(address, subscriptionId)
    
    // Subscribe to transaction signatures
    this.subscribeToTransactions(publicKey)
    
    // Return unsubscribe function
    return () => this.unsubscribeFromWallet(address)
  }

  /**
   * Unsubscribe from wallet notifications
   */
  private unsubscribeFromWallet(address: string): void {
    const subscriptionId = this.subscriptions.get(address)
    if (subscriptionId !== undefined) {
      this.connection.removeAccountChangeListener(subscriptionId)
      this.subscriptions.delete(address)
    }
  }

  /**
   * Subscribe to transaction notifications
   */
  private async subscribeToTransactions(publicKey: PublicKey): Promise<void> {
    try {
      // Get recent signatures to establish baseline
      const signatures = await this.connection.getSignaturesForAddress(publicKey, { limit: 1 })
      
      if (signatures.length > 0) {
        const latestSignature = signatures[0].signature
        
        // Poll for new transactions every 5 seconds
        const pollInterval = setInterval(async () => {
          try {
            const newSignatures = await this.connection.getSignaturesForAddress(
              publicKey, 
              { limit: 10, before: latestSignature }
            )
            
            for (const sig of newSignatures) {
              await this.processTransaction(publicKey, sig.signature)
            }
          } catch (error) {
            console.error('Error polling transactions:', error)
          }
        }, 5000)
        
        // Store interval for cleanup
        setTimeout(() => clearInterval(pollInterval), 300000) // Stop after 5 minutes
      }
    } catch (error) {
      console.error('Error setting up transaction subscription:', error)
    }
  }

  /**
   * Handle account balance changes
   */
  private handleAccountChange(publicKey: PublicKey, accountInfo: any, context: any): void {
    // This would be triggered on balance changes
    // We can use this to detect incoming payments
    const notification: PaymentNotification = {
      id: `balance_${Date.now()}`,
      type: 'payment_received',
      title: 'Balance Updated',
      message: 'Your wallet balance has changed',
      timestamp: Date.now(),
      read: false
    }
    
    this.addNotification(notification)
  }

  /**
   * Process individual transactions
   */
  private async processTransaction(publicKey: PublicKey, signature: string): Promise<void> {
    try {
      const transaction = await this.connection.getTransaction(signature, {
        commitment: 'confirmed'
      })
      
      if (!transaction) return
      
      // Analyze transaction to determine type and create notification
      const notification = this.analyzeTransaction(publicKey, transaction, signature)
      if (notification) {
        this.addNotification(notification)
      }
    } catch (error) {
      console.error('Error processing transaction:', error)
    }
  }

  /**
   * Analyze transaction to create appropriate notification
   */
  private analyzeTransaction(publicKey: PublicKey, transaction: any, signature: string): PaymentNotification | null {
    try {
      const { meta, transaction: tx } = transaction
      
      if (!meta || meta.err) return null
      
      const preBalances = meta.preBalances
      const postBalances = meta.postBalances
      const accountKeys = tx.message.accountKeys
      
      // Find user's account index
      const userAccountIndex = accountKeys.findIndex((key: any) => 
        key.toString() === publicKey.toString()
      )
      
      if (userAccountIndex === -1) return null
      
      const balanceChange = postBalances[userAccountIndex] - preBalances[userAccountIndex]
      const amount = Math.abs(balanceChange) / 1000000000 // Convert lamports to SOL
      
      if (balanceChange > 0) {
        // Received payment
        return {
          id: `received_${signature}`,
          type: 'payment_received',
          title: 'Payment Received',
          message: `You received ${amount.toFixed(4)} SOL`,
          amount,
          currency: 'SOL',
          signature,
          timestamp: Date.now(),
          read: false
        }
      } else if (balanceChange < 0) {
        // Sent payment
        return {
          id: `sent_${signature}`,
          type: 'payment_sent',
          title: 'Payment Sent',
          message: `You sent ${amount.toFixed(4)} SOL`,
          amount,
          currency: 'SOL',
          signature,
          timestamp: Date.now(),
          read: false
        }
      }
      
      return null
    } catch (error) {
      console.error('Error analyzing transaction:', error)
      return null
    }
  }

  /**
   * Add notification and trigger listeners
   */
  private addNotification(notification: PaymentNotification): void {
    this.notifications.unshift(notification)
    
    // Keep only last 50 notifications
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50)
    }
    
    // Show toast notification
    this.showToastNotification(notification)
    
    // Trigger listeners
    this.listeners.forEach(listener => listener(notification))
  }

  /**
   * Show toast notification
   */
  private showToastNotification(notification: PaymentNotification): void {
    const toastOptions = {
      duration: 5000,
      position: 'top-right' as const,
    }
    
    switch (notification.type) {
      case 'payment_received':
        toast.success(notification.message, toastOptions)
        break
      case 'payment_sent':
        toast.success(notification.message, toastOptions)
        break
      case 'escrow_created':
        toast.loading(notification.message, toastOptions)
        break
      case 'escrow_released':
        toast.success(notification.message, toastOptions)
        break
      case 'nft_minted':
        toast.success(notification.message, { ...toastOptions, duration: 8000 })
        break
      default:
        toast(notification.message, toastOptions)
    }
  }

  /**
   * Get all notifications
   */
  getNotifications(): PaymentNotification[] {
    return [...this.notifications]
  }

  /**
   * Get unread notifications
   */
  getUnreadNotifications(): PaymentNotification[] {
    return this.notifications.filter(n => !n.read)
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId)
    if (notification) {
      notification.read = true
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true)
  }

  /**
   * Add notification listener
   */
  addListener(listener: (notification: PaymentNotification) => void): () => void {
    this.listeners.push(listener)
    
    // Return remove function
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * Create manual notification (for escrow, NFT minting, etc.)
   */
  createNotification(notification: Omit<PaymentNotification, 'id' | 'timestamp' | 'read'>): void {
    const fullNotification: PaymentNotification = {
      ...notification,
      id: `manual_${Date.now()}`,
      timestamp: Date.now(),
      read: false
    }
    
    this.addNotification(fullNotification)
  }

  /**
   * Clear all notifications
   */
  clearNotifications(): void {
    this.notifications = []
  }

  /**
   * Cleanup all subscriptions
   */
  cleanup(): void {
    this.subscriptions.forEach((subscriptionId, address) => {
      this.connection.removeAccountChangeListener(subscriptionId)
    })
    this.subscriptions.clear()
    this.listeners = []
  }
}

export const notificationService = new NotificationService()
export default notificationService
