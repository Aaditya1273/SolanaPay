import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { 
  CreditCard, 
  Wallet, 
  Clock, 
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Activity
} from 'lucide-react'
import axios from 'axios'

interface OnrampTransaction {
  id: string
  status: string
  fiatCurrency: string
  cryptoCurrency: string
  fiatValue: number
  cryptoValue?: number
  createdAt: string
  updatedAt: string
}

interface Settlement {
  id: string
  settlementType: 'FIAT' | 'STABLECOIN'
  currency: string
  amount: number
  netAmount: number
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  createdAt: string
}

interface DashboardStats {
  totalOnrampValue: number
  totalSettlementValue: number
  pendingOnramps: number
  pendingSettlements: number
  completedOnramps: number
  completedSettlements: number
}

export default function OnrampSettlementDashboard() {
  const { } = useAuth()
  const [onrampTransactions, setOnrampTransactions] = useState<OnrampTransaction[]>([])
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalOnrampValue: 0,
    totalSettlementValue: 0,
    pendingOnramps: 0,
    pendingSettlements: 0,
    completedOnramps: 0,
    completedSettlements: 0
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'onramp' | 'settlements'>('overview')

  useEffect(() => {
    fetchData()
    
    // Set up polling for real-time updates
    const interval = setInterval(fetchData, 30000) // Poll every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const [onrampResponse, settlementsResponse] = await Promise.all([
        axios.get('/api/onramp/history', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get('/api/settlements/history', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      ])

      const onrampData = onrampResponse.data.transactions || []
      const settlementData = settlementsResponse.data.settlements || []

      setOnrampTransactions(onrampData)
      setSettlements(settlementData)

      // Calculate stats
      const newStats: DashboardStats = {
        totalOnrampValue: onrampData
          .filter((t: OnrampTransaction) => t.status === 'COMPLETED')
          .reduce((sum: number, t: OnrampTransaction) => sum + t.fiatValue, 0),
        totalSettlementValue: settlementData
          .filter((s: Settlement) => s.status === 'COMPLETED')
          .reduce((sum: number, s: Settlement) => sum + s.netAmount, 0),
        pendingOnramps: onrampData.filter((t: OnrampTransaction) => 
          ['PENDING', 'PROCESSING'].includes(t.status)).length,
        pendingSettlements: settlementData.filter((s: Settlement) => 
          ['PENDING', 'PROCESSING'].includes(s.status)).length,
        completedOnramps: onrampData.filter((t: OnrampTransaction) => 
          t.status === 'COMPLETED').length,
        completedSettlements: settlementData.filter((s: Settlement) => 
          s.status === 'COMPLETED').length
      }

      setStats(newStats)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'processing':
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'failed':
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'processing':
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'failed':
      case 'cancelled':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const recentTransactions = [
    ...onrampTransactions.slice(0, 3).map(t => ({
      ...t,
      type: 'onramp' as const,
      amount: t.fiatValue,
      currency: t.fiatCurrency
    })),
    ...settlements.slice(0, 3).map(s => ({
      ...s,
      type: 'settlement' as const,
      amount: s.netAmount
    }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            On-ramp & Settlements
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Track your crypto purchases and withdrawals
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: Activity },
            { id: 'onramp', name: 'On-ramp', icon: ArrowDownLeft },
            { id: 'settlements', name: 'Settlements', icon: ArrowUpRight }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Purchased
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${stats.totalOnrampValue.toFixed(2)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <ArrowDownLeft className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Withdrawn
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${stats.totalSettlementValue.toFixed(2)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <ArrowUpRight className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Pending Actions
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.pendingOnramps + stats.pendingSettlements}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Completed
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.completedOnramps + stats.completedSettlements}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Activity
              </h3>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((transaction) => (
                  <div key={`${transaction.type}-${transaction.id}`} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          transaction.type === 'onramp' 
                            ? 'bg-green-100 dark:bg-green-900/20' 
                            : 'bg-blue-100 dark:bg-blue-900/20'
                        }`}>
                          {transaction.type === 'onramp' ? (
                            <ArrowDownLeft className={`h-5 w-5 ${
                              transaction.type === 'onramp' 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-blue-600 dark:text-blue-400'
                            }`} />
                          ) : (
                            <ArrowUpRight className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {transaction.type === 'onramp' ? 'Crypto Purchase' : 'Settlement'}
                            </p>
                            <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(transaction.status)}`}>
                              {getStatusIcon(transaction.status)}
                              <span>{transaction.status}</span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {transaction.currency} • {new Date(transaction.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {transaction.type === 'onramp' ? '+' : '-'}${transaction.amount.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {transaction.currency}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No activity yet
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Your on-ramp purchases and settlements will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* On-ramp Tab */}
      {activeTab === 'onramp' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              On-ramp Transactions
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Transaction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {onrampTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                          <CreditCard className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {transaction.id.slice(0, 8)}...
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {transaction.fiatCurrency} → {transaction.cryptoCurrency}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        ${transaction.fiatValue.toFixed(2)}
                      </div>
                      {transaction.cryptoValue && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {transaction.cryptoValue.toFixed(6)} {transaction.cryptoCurrency}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(transaction.status)}`}>
                        {getStatusIcon(transaction.status)}
                        <span>{transaction.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {onrampTransactions.length === 0 && (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No on-ramp transactions
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Your crypto purchases will appear here.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Settlements Tab */}
      {activeTab === 'settlements' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Settlement Transactions
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Settlement
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {settlements.map((settlement) => (
                  <tr key={settlement.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                          {settlement.settlementType === 'FIAT' ? (
                            <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {settlement.id.slice(0, 8)}...
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {settlement.currency}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {settlement.settlementType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        ${settlement.netAmount.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(settlement.status)}`}>
                        {getStatusIcon(settlement.status)}
                        <span>{settlement.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(settlement.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {settlements.length === 0 && (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No settlements
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Your withdrawal transactions will appear here.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
