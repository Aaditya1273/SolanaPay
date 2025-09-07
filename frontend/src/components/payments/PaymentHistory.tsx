import React, { useState, useEffect } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { solanaPayService } from '../../services/solanaPayService'
import toast from 'react-hot-toast'

interface Transaction {
  signature: string
  timestamp: number
  status: string
  type: 'send' | 'receive' | 'escrow_create' | 'escrow_release'
  amount: number
  currency: 'SOL' | 'USDC'
  counterparty?: string
  description?: string
  fees?: {
    network: number
    platform: number
  }
}

interface PaymentHistoryProps {
  limit?: number
  showFilters?: boolean
}

const PaymentHistory: React.FC<PaymentHistoryProps> = ({ 
  limit = 20, 
  showFilters = true 
}) => {
  const { connection } = useConnection()
  const { publicKey } = useWallet()
  
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'send' | 'receive' | 'escrow'>('all')
  const [currencyFilter, setCurrencyFilter] = useState<'all' | 'SOL' | 'USDC'>('all')

  useEffect(() => {
    if (publicKey) {
      loadTransactionHistory()
    }
  }, [publicKey, limit])

  const loadTransactionHistory = async () => {
    if (!publicKey) return

    try {
      setIsLoading(true)
      const history = await solanaPayService.getTransactionHistory(publicKey, limit)
      
      // Transform raw transaction data into our format
      const formattedTransactions: Transaction[] = history.map(tx => {
        // This is a simplified transformation - in reality, you'd need to
        // parse the transaction instructions to determine type, amount, etc.
        return {
          signature: tx.signature,
          timestamp: tx.timestamp ? tx.timestamp * 1000 : Date.now(),
          status: tx.status || 'confirmed',
          type: 'send', // Would be determined by parsing instructions
          amount: 0, // Would be extracted from instructions
          currency: 'SOL', // Would be determined by token mint
          counterparty: '', // Would be extracted from instructions
          description: '',
          fees: {
            network: 0.000005,
            platform: 0
          }
        }
      })

      setTransactions(formattedTransactions)
    } catch (error) {
      console.error('Failed to load transaction history:', error)
      toast.error('Failed to load transaction history')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredTransactions = transactions.filter(tx => {
    if (filter !== 'all' && !tx.type.includes(filter)) return false
    if (currencyFilter !== 'all' && tx.currency !== currencyFilter) return false
    return true
  })

  const getTransactionIcon = (type: string, status: string) => {
    if (status === 'failed') {
      return (
        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      )
    }

    switch (type) {
      case 'send':
        return (
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
          </div>
        )
      case 'receive':
        return (
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
            </svg>
          </div>
        )
      case 'escrow_create':
        return (
          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        )
      case 'escrow_release':
        return (
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          </div>
        )
      default:
        return (
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </div>
        )
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Confirmed
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Pending
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Failed
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        )
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    }
  }

  const truncateAddress = (address: string) => {
    if (!address) return ''
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  if (!publicKey) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <p className="text-gray-500">Connect your wallet to view transaction history</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Payment History</h2>
        <button
          onClick={loadTransactionHistory}
          className="text-purple-600 hover:text-purple-800 text-sm font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Type:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="all">All</option>
              <option value="send">Sent</option>
              <option value="receive">Received</option>
              <option value="escrow">Escrow</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Currency:</label>
            <select
              value={currencyFilter}
              onChange={(e) => setCurrencyFilter(e.target.value as any)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="all">All</option>
              <option value="SOL">SOL</option>
              <option value="USDC">USDC</option>
            </select>
          </div>
        </div>
      )}

      {/* Transaction List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading transactions...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Transactions Found</h3>
            <p className="text-gray-500">Make your first payment to see transaction history</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredTransactions.map((tx) => (
              <div key={tx.signature} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getTransactionIcon(tx.type, tx.status)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 capitalize">
                          {tx.type.replace('_', ' ')}
                        </p>
                        {getStatusBadge(tx.status)}
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-1">
                        <p className="text-sm text-gray-500">
                          {formatDate(tx.timestamp)}
                        </p>
                        
                        {tx.counterparty && (
                          <button
                            onClick={() => copyToClipboard(tx.counterparty!)}
                            className="text-sm text-gray-500 hover:text-gray-700"
                          >
                            {truncateAddress(tx.counterparty)}
                          </button>
                        )}
                        
                        <button
                          onClick={() => copyToClipboard(tx.signature)}
                          className="text-sm text-gray-500 hover:text-gray-700"
                        >
                          {truncateAddress(tx.signature)}
                        </button>
                      </div>
                      
                      {tx.description && (
                        <p className="text-sm text-gray-600 mt-1">{tx.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-sm font-medium ${
                      tx.type === 'receive' ? 'text-green-600' : 'text-gray-900'
                    }`}>
                      {tx.type === 'receive' ? '+' : '-'}{tx.amount.toFixed(4)} {tx.currency}
                    </div>
                    
                    {tx.fees && (tx.fees.network > 0 || tx.fees.platform > 0) && (
                      <div className="text-xs text-gray-500 mt-1">
                        Fee: {(tx.fees.network + tx.fees.platform).toFixed(6)} SOL
                      </div>
                    )}
                  </div>
                </div>

                {/* Expandable Details */}
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => window.open(`https://explorer.solana.com/tx/${tx.signature}`, '_blank')}
                    className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                  >
                    View on Explorer →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Load More */}
      {filteredTransactions.length >= limit && (
        <div className="text-center">
          <button
            onClick={() => loadTransactionHistory()}
            className="text-purple-600 hover:text-purple-800 text-sm font-medium"
          >
            Load More Transactions
          </button>
        </div>
      )}
    </div>
  )
}

export default PaymentHistory
