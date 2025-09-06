import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Plus,
  Download,
  Filter,
  Search,
  CreditCard,
  Wallet,
  ArrowRight,
  Calendar
} from 'lucide-react'
import axios from 'axios'

interface Settlement {
  id: string
  settlementType: 'FIAT' | 'STABLECOIN'
  currency: string
  amount: number
  fees: number
  netAmount: number
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  provider?: string
  createdAt: string
  processedAt?: string
}

interface SettlementOptions {
  availableBalance: number
  minimumAmount: number
  fiatOptions: Array<{ currency: string; name: string; fee: string }>
  stablecoinOptions: Array<{ currency: string; name: string; fee: string }>
  kycRequired: boolean
}

export default function MerchantSettlementDashboard() {
  const { user } = useAuth()
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [options, setOptions] = useState<SettlementOptions | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create settlement form state
  const [settlementType, setSettlementType] = useState<'FIAT' | 'STABLECOIN'>('FIAT')
  const [currency, setCurrency] = useState('USD')
  const [amount, setAmount] = useState(100)
  const [bankAccount, setBankAccount] = useState({
    accountNumber: '',
    routingNumber: '',
    accountHolderName: '',
    bankName: ''
  })
  const [walletAddress, setWalletAddress] = useState('')

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchSettlements()
    fetchOptions()
  }, [])

  const fetchSettlements = async () => {
    try {
      const response = await axios.get('/api/settlements/history', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      setSettlements(response.data.settlements)
    } catch (error) {
      console.error('Failed to fetch settlements:', error)
      setError('Failed to load settlement history')
    } finally {
      setLoading(false)
    }
  }

  const fetchOptions = async () => {
    try {
      const response = await axios.get('/api/settlements/options', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      setOptions(response.data.options)
    } catch (error) {
      console.error('Failed to fetch options:', error)
    }
  }

  const createSettlement = async () => {
    if (!options || amount < options.minimumAmount) {
      setError(`Minimum settlement amount is $${options?.minimumAmount}`)
      return
    }

    if (amount > options.availableBalance) {
      setError('Insufficient balance for settlement')
      return
    }

    setCreating(true)
    setError(null)

    try {
      const payload: any = {
        settlementType,
        currency,
        amount
      }

      if (settlementType === 'FIAT') {
        payload.bankAccount = bankAccount
      } else {
        payload.walletAddress = walletAddress
      }

      const response = await axios.post('/api/settlements/create', payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })

      if (response.data.success) {
        setShowCreateModal(false)
        fetchSettlements()
        fetchOptions()
        resetForm()
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to create settlement')
    } finally {
      setCreating(false)
    }
  }

  const resetForm = () => {
    setAmount(100)
    setBankAccount({
      accountNumber: '',
      routingNumber: '',
      accountHolderName: '',
      bankName: ''
    })
    setWalletAddress('')
    setError(null)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'PROCESSING':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'FAILED':
      case 'CANCELLED':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'PROCESSING':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'FAILED':
      case 'CANCELLED':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const filteredSettlements = settlements.filter(settlement => {
    const matchesStatus = statusFilter === 'ALL' || settlement.status === statusFilter
    const matchesType = typeFilter === 'ALL' || settlement.settlementType === typeFilter
    const matchesSearch = settlement.currency.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         settlement.id.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesType && matchesSearch
  })

  const totalSettlements = settlements.reduce((sum, s) => sum + s.netAmount, 0)
  const pendingSettlements = settlements.filter(s => s.status === 'PENDING').length
  const completedSettlements = settlements.filter(s => s.status === 'COMPLETED').length

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
            Settlement Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your fiat and crypto withdrawals
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={options?.kycRequired}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>New Settlement</span>
        </button>
      </div>

      {/* KYC Warning */}
      {options?.kycRequired && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                KYC Verification Required
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Complete identity verification to create settlements and withdraw funds.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Available Balance
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${options?.availableBalance.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
              <Wallet className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Settled
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${totalSettlements.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Pending
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {pendingSettlements}
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
                {completedSettlements}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search settlements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="ALL">All Types</option>
            <option value="FIAT">Fiat</option>
            <option value="STABLECOIN">Stablecoin</option>
          </select>

          <button className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Settlements List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
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
              {filteredSettlements.map((settlement) => (
                <tr key={settlement.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {settlement.id.slice(0, 8)}...
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {settlement.currency}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {settlement.settlementType === 'FIAT' ? (
                        <CreditCard className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Wallet className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="text-sm text-gray-900 dark:text-white">
                        {settlement.settlementType}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        ${settlement.netAmount.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Fee: ${settlement.fees.toFixed(2)}
                      </div>
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

        {filteredSettlements.length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No settlements found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Create your first settlement to withdraw funds.
            </p>
          </div>
        )}
      </div>

      {/* Create Settlement Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Create Settlement
                </h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    resetForm()
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              {/* Settlement Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Settlement Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSettlementType('FIAT')}
                    className={`p-3 border rounded-lg text-left transition-colors ${
                      settlementType === 'FIAT'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <CreditCard className="h-4 w-4" />
                      <div>
                        <div className="font-medium">Fiat</div>
                        <div className="text-xs text-gray-500">Bank transfer</div>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => setSettlementType('STABLECOIN')}
                    className={`p-3 border rounded-lg text-left transition-colors ${
                      settlementType === 'STABLECOIN'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Wallet className="h-4 w-4" />
                      <div>
                        <div className="font-medium">Stablecoin</div>
                        <div className="text-xs text-gray-500">Crypto wallet</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Currency & Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    {settlementType === 'FIAT' 
                      ? options?.fiatOptions.map(opt => (
                          <option key={opt.currency} value={opt.currency}>
                            {opt.currency}
                          </option>
                        ))
                      : options?.stablecoinOptions.map(opt => (
                          <option key={opt.currency} value={opt.currency}>
                            {opt.currency}
                          </option>
                        ))
                    }
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Amount
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    min={options?.minimumAmount || 10}
                    max={options?.availableBalance || 0}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Bank Account Details (Fiat) */}
              {settlementType === 'FIAT' && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">Bank Account Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Account Number"
                      value={bankAccount.accountNumber}
                      onChange={(e) => setBankAccount({...bankAccount, accountNumber: e.target.value})}
                      className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                    <input
                      type="text"
                      placeholder="Routing Number"
                      value={bankAccount.routingNumber}
                      onChange={(e) => setBankAccount({...bankAccount, routingNumber: e.target.value})}
                      className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Account Holder Name"
                    value={bankAccount.accountHolderName}
                    onChange={(e) => setBankAccount({...bankAccount, accountHolderName: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Bank Name"
                    value={bankAccount.bankName}
                    onChange={(e) => setBankAccount({...bankAccount, bankName: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              )}

              {/* Wallet Address (Stablecoin) */}
              {settlementType === 'STABLECOIN' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Wallet Address
                  </label>
                  <input
                    type="text"
                    placeholder="0x..."
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white font-mono text-sm"
                  />
                </div>
              )}

              {/* Fee Information */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>Settlement Amount:</span>
                  <span>${amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Fee ({settlementType === 'FIAT' ? '2.5%' : '1.0%'}):</span>
                  <span>-${(amount * (settlementType === 'FIAT' ? 0.025 : 0.01)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                  <span>Net Amount:</span>
                  <span>${(amount * (settlementType === 'FIAT' ? 0.975 : 0.99)).toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={createSettlement}
                disabled={creating || amount < (options?.minimumAmount || 10)}
                className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {creating ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <span>Create Settlement</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
