import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  CreditCard,
  Banknote,
  RefreshCw,
  Download
} from 'lucide-react'
import { toast } from 'react-hot-toast'
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
  fiatProviders: string[]
  stablecoinProviders: string[]
  currencies: string[]
  limits: {
    daily: number
    monthly: number
  }
}

const MerchantSettlementPage: React.FC = () => {
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [options, setOptions] = useState<SettlementOptions | null>(null)
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  
  // Form state
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [settlementType, setSettlementType] = useState<'FIAT' | 'STABLECOIN'>('FIAT')
  const [provider, setProvider] = useState('')
  const [destination, setDestination] = useState('')

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

  useEffect(() => {
    fetchSettlements()
    fetchOptions()
    fetchBalance()
  }, [])

  const fetchSettlements = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('SolanaPay-token')
      const response = await axios.get(`${API_BASE_URL}/settlements/history`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data.success) {
        setSettlements(response.data.settlements)
      }
    } catch (error) {
      console.error('Error fetching settlements:', error)
      toast.error('Failed to load settlement history')
    } finally {
      setLoading(false)
    }
  }

  const fetchOptions = async () => {
    try {
      const token = localStorage.getItem('SolanaPay-token')
      const response = await axios.get(`${API_BASE_URL}/settlements/options`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data.success) {
        setOptions(response.data.options)
      }
    } catch (error) {
      console.error('Error fetching settlement options:', error)
    }
  }

  const fetchBalance = async () => {
    try {
      const token = localStorage.getItem('SolanaPay-token')
      const response = await axios.get(`${API_BASE_URL}/wallet/balance`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data.success) {
        const userBalance = (response.data.totalEarnings || 0) - (response.data.totalSpent || 0)
        setBalance(userBalance)
      }
    } catch (error) {
      console.error('Error fetching balance:', error)
    }
  }

  const handleCreateSettlement = async () => {
    if (!amount || !destination) {
      toast.error('Please fill in all required fields')
      return
    }

    const numAmount = parseFloat(amount)
    if (numAmount <= 0 || numAmount > balance) {
      toast.error('Invalid amount or insufficient balance')
      return
    }

    try {
      setCreating(true)
      const token = localStorage.getItem('SolanaPay-token')
      
      const response = await axios.post(`${API_BASE_URL}/settlements/create`, {
        amount: numAmount,
        currency,
        type: settlementType,
        provider: provider || undefined,
        destination
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        toast.success('Settlement request created successfully')
        setAmount('')
        setDestination('')
        setProvider('')
        fetchSettlements()
        fetchBalance()
      }
    } catch (error: any) {
      console.error('Error creating settlement:', error)
      const message = error.response?.data?.message || 'Failed to create settlement'
      toast.error(message)
    } finally {
      setCreating(false)
    }
  }

  const handleCancelSettlement = async (settlementId: string) => {
    try {
      const token = localStorage.getItem('SolanaPay-token')
      const response = await axios.post(`${API_BASE_URL}/settlements/cancel/${settlementId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        toast.success('Settlement cancelled successfully')
        fetchSettlements()
        fetchBalance()
      }
    } catch (error: any) {
      console.error('Error cancelling settlement:', error)
      const message = error.response?.data?.message || 'Failed to cancel settlement'
      toast.error(message)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'PROCESSING':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'CANCELLED':
        return <AlertCircle className="h-4 w-4 text-gray-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800'
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'FAILED':
        return 'bg-red-100 text-red-800'
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const calculateFees = (amount: number, type: 'FIAT' | 'STABLECOIN') => {
    const feeRate = type === 'FIAT' ? 0.025 : 0.01 // 2.5% for fiat, 1% for crypto
    return amount * feeRate
  }

  const currentAmount = parseFloat(amount) || 0
  const estimatedFees = calculateFees(currentAmount, settlementType)
  const netAmount = currentAmount - estimatedFees

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Merchant Settlements</h1>
          <p className="text-gray-600">Withdraw your earnings to bank accounts or crypto wallets</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Available Balance</p>
          <p className="text-2xl font-bold text-purple-600">{formatCurrency(balance)}</p>
        </div>
      </div>

      <Tabs defaultValue="create" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">Create Settlement</TabsTrigger>
          <TabsTrigger value="history">Settlement History</TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Create New Settlement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      max={balance}
                      step="0.01"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Maximum: {formatCurrency(balance)}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {options?.currencies.map((curr) => (
                          <SelectItem key={curr} value={curr}>
                            {curr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="type">Settlement Type</Label>
                    <Select value={settlementType} onValueChange={(value: 'FIAT' | 'STABLECOIN') => setSettlementType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FIAT">
                          <div className="flex items-center gap-2">
                            <Banknote className="h-4 w-4" />
                            Fiat (Bank Transfer)
                          </div>
                        </SelectItem>
                        <SelectItem value="STABLECOIN">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Stablecoin (Crypto)
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="provider">Provider (Optional)</Label>
                    <Select value={provider} onValueChange={setProvider}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {settlementType === 'FIAT' 
                          ? options?.fiatProviders.map((prov) => (
                              <SelectItem key={prov} value={prov}>
                                {prov}
                              </SelectItem>
                            ))
                          : options?.stablecoinProviders.map((prov) => (
                              <SelectItem key={prov} value={prov}>
                                {prov}
                              </SelectItem>
                            ))
                        }
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="destination">
                      {settlementType === 'FIAT' ? 'Bank Account / IBAN' : 'Wallet Address'}
                    </Label>
                    <Input
                      id="destination"
                      placeholder={settlementType === 'FIAT' ? 'Enter bank account details' : 'Enter wallet address'}
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <Card className="bg-gray-50">
                    <CardHeader>
                      <CardTitle className="text-lg">Settlement Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span>Settlement Amount</span>
                        <span className="font-medium">{formatCurrency(currentAmount, currency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Processing Fee ({settlementType === 'FIAT' ? '2.5%' : '1%'})</span>
                        <span className="font-medium text-red-600">-{formatCurrency(estimatedFees, currency)}</span>
                      </div>
                      <div className="flex justify-between font-semibold pt-2 border-t">
                        <span>Net Amount</span>
                        <span className="text-green-600">{formatCurrency(netAmount, currency)}</span>
                      </div>
                      <div className="text-sm text-gray-600 pt-2 border-t">
                        <p>• Processing time: {settlementType === 'FIAT' ? '1-3 business days' : '10-30 minutes'}</p>
                        <p>• Daily limit: {formatCurrency(options?.limits.daily || 10000)}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Button
                    onClick={handleCreateSettlement}
                    disabled={creating || !amount || !destination || currentAmount <= 0 || currentAmount > balance}
                    className="w-full"
                    variant="SolanaPay"
                  >
                    {creating ? 'Creating...' : 'Create Settlement Request'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Settlement History
                </div>
                <Button
                  onClick={fetchSettlements}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : settlements.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No settlements found</p>
                  <p className="text-sm">Create your first settlement to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {settlements.map((settlement) => (
                    <div key={settlement.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(settlement.status)}
                          <div>
                            <p className="font-medium">
                              {formatCurrency(settlement.amount, settlement.currency)} → {formatCurrency(settlement.netAmount, settlement.currency)}
                            </p>
                            <p className="text-sm text-gray-600">
                              {settlement.settlementType} via {settlement.provider || 'Default'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={getStatusColor(settlement.status)}>
                            {settlement.status}
                          </Badge>
                          {settlement.status === 'PENDING' && (
                            <Button
                              onClick={() => handleCancelSettlement(settlement.id)}
                              variant="outline"
                              size="sm"
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 text-sm text-gray-600 grid grid-cols-2 gap-4">
                        <div>
                          <span className="font-medium">Created:</span> {new Date(settlement.createdAt).toLocaleDateString()}
                        </div>
                        {settlement.processedAt && (
                          <div>
                            <span className="font-medium">Processed:</span> {new Date(settlement.processedAt).toLocaleDateString()}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Fees:</span> {formatCurrency(settlement.fees, settlement.currency)}
                        </div>
                        <div>
                          <span className="font-medium">ID:</span> {settlement.id.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default MerchantSettlementPage
