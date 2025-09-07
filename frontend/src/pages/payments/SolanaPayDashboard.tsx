import React, { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import SolanaPaymentInterface from '../../components/payments/SolanaPaymentInterface'
import CashbackNFTDisplay from '../../components/payments/CashbackNFTDisplay'
import PaymentHistory from '../../components/payments/PaymentHistory'
import { solanaPayService } from '../../services/solanaPayService'
import toast from 'react-hot-toast'

const SolanaPayDashboard: React.FC = () => {
  const { publicKey, connected } = useWallet()
  const [activeTab, setActiveTab] = useState<'pay' | 'nfts' | 'history'>('pay')
  const [balances, setBalances] = useState({ sol: 0, usdc: 0 })
  const [recentPayments, setRecentPayments] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalPayments: 0,
    totalCashback: 0,
    nftCount: 0
  })

  useEffect(() => {
    if (connected && publicKey) {
      loadDashboardData()
    }
  }, [connected, publicKey])

  const loadDashboardData = async () => {
    if (!publicKey) return

    try {
      // Load balances
      const balanceData = await solanaPayService.getBalances(publicKey)
      setBalances(balanceData)

      // Load recent transactions
      const history = await solanaPayService.getTransactionHistory(publicKey, 5)
      setRecentPayments(history)

      // Calculate stats (mock data for now)
      setStats({
        totalPayments: history.length,
        totalCashback: 0.25, // Would be calculated from NFT data
        nftCount: 3 // Would be loaded from actual NFT count
      })
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    }
  }

  const handlePaymentComplete = (result: any) => {
    toast.success('Payment completed successfully!')
    loadDashboardData() // Refresh data
  }

  const handleNFTClaim = (nft: any) => {
    toast.success(`Claimed ${nft.cashbackAmount} SOL cashback!`)
    loadDashboardData() // Refresh data
  }

  const tabs = [
    { id: 'pay', label: 'Send & Receive', icon: '💸' },
    { id: 'nfts', label: 'Cashback NFTs', icon: '🎁' },
    { id: 'history', label: 'History', icon: '📋' }
  ]

  if (!connected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-purple-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Welcome to SolanaPay
          </h1>
          
          <p className="text-gray-600 mb-8">
            Connect your Solana wallet to start making payments, earning cashback NFTs, and managing your transactions.
          </p>
          
          <div className="space-y-4">
            <WalletMultiButton className="!w-full !bg-purple-600 !rounded-lg" />
            
            <div className="text-sm text-gray-500">
              <p>✨ Instant SOL & USDC payments</p>
              <p>🔒 Secure escrow transactions</p>
              <p>🎁 Automatic cashback NFTs</p>
              <p>📱 QR code payment support</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">SolanaPay</h1>
              <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500">
                <span>•</span>
                <span>{publicKey?.toString().slice(0, 4)}...{publicKey?.toString().slice(-4)}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-6 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-gray-900">{balances.sol.toFixed(4)}</div>
                  <div className="text-gray-500">SOL</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-gray-900">{balances.usdc.toFixed(2)}</div>
                  <div className="text-gray-500">USDC</div>
                </div>
              </div>
              
              <WalletMultiButton className="!bg-purple-600 !rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Payments</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalPayments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Cashback</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalCashback.toFixed(4)} SOL</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">NFT Rewards</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.nftCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'pay' && (
              <div className="max-w-2xl mx-auto">
                <SolanaPaymentInterface
                  onPaymentComplete={handlePaymentComplete}
                />
              </div>
            )}

            {activeTab === 'nfts' && (
              <CashbackNFTDisplay onNFTClaim={handleNFTClaim} />
            )}

            {activeTab === 'history' && (
              <PaymentHistory limit={50} showFilters={true} />
            )}
          </div>
        </div>

        {/* Recent Activity (shown on pay tab) */}
        {activeTab === 'pay' && recentPayments.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {recentPayments.slice(0, 3).map((payment, index) => (
                <div key={index} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Payment Transaction</p>
                      <p className="text-sm text-gray-500">
                        {payment.timestamp ? new Date(payment.timestamp * 1000).toLocaleDateString() : 'Recent'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => window.open(`https://explorer.solana.com/tx/${payment.signature}`, '_blank')}
                    className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                  >
                    View →
                  </button>
                </div>
              ))}
            </div>
            <div className="px-6 py-3 bg-gray-50 text-center">
              <button
                onClick={() => setActiveTab('history')}
                className="text-sm text-purple-600 hover:text-purple-800 font-medium"
              >
                View All Transactions
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SolanaPayDashboard
