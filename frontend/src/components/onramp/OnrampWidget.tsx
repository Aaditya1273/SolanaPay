import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useWallet } from '../../contexts/WalletContext'
import { 
  CreditCard, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle,
  Loader2,
  ExternalLink,
  Shield,
  Clock
} from 'lucide-react'
import axios from 'axios'

interface OnrampWidgetProps {
  isOpen: boolean
  onClose: () => void
  requiredAmount?: number
  requiredCurrency?: string
  onSuccess?: (transaction: any) => void
}

interface OnrampTransaction {
  id: string
  status: string
  fiatCurrency: string
  cryptoCurrency: string
  fiatValue: number
  cryptoValue?: number
  rampUrl: string
  externalId: string
}

const SUPPORTED_FIAT = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' }
]

const SUPPORTED_CRYPTO = [
  { code: 'ETH', name: 'Ethereum', icon: '⟠' },
  { code: 'USDC', name: 'USD Coin', icon: '💰' },
  { code: 'USDT', name: 'Tether', icon: '₮' },
  { code: 'DAI', name: 'Dai Stablecoin', icon: '◈' }
]

export default function OnrampWidget({ 
  isOpen, 
  onClose, 
  requiredAmount = 50, 
  requiredCurrency = 'USD',
  onSuccess 
}: OnrampWidgetProps) {
  const { user } = useAuth()
  const { account } = useWallet()
  const [step, setStep] = useState<'form' | 'processing' | 'redirect' | 'success'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transaction, setTransaction] = useState<OnrampTransaction | null>(null)

  // Form state
  const [fiatCurrency, setFiatCurrency] = useState(requiredCurrency)
  const [cryptoCurrency, setCryptoCurrency] = useState('USDC')
  const [fiatAmount, setFiatAmount] = useState(requiredAmount)
  const [userAddress, setUserAddress] = useState(account || '')

  // KYC status
  const [kycStatus, setKycStatus] = useState<string>('UNKNOWN')

  useEffect(() => {
    if (isOpen && user) {
      checkKycStatus()
    }
  }, [isOpen, user])

  useEffect(() => {
    if (account) {
      setUserAddress(account)
    }
  }, [account])

  const checkKycStatus = async () => {
    try {
      const response = await axios.get('/api/users/kyc-status', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      setKycStatus(response.data.kycStatus)
    } catch (error) {
      console.error('KYC status check failed:', error)
      setKycStatus('UNKNOWN')
    }
  }

  const initiateOnramp = async () => {
    if (!userAddress) {
      setError('Please connect your wallet first')
      return
    }

    if (kycStatus !== 'APPROVED') {
      setError('KYC verification required. Please complete verification first.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await axios.post('/api/onramp/initiate', {
        fiatCurrency,
        cryptoCurrency,
        fiatValue: fiatAmount,
        userAddress,
        returnUrl: `${window.location.origin}/dashboard?onramp=success`,
        webhookUrl: `${import.meta.env.VITE_API_URL}/onramp/webhook`
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })

      if (response.data.success) {
        setTransaction(response.data.transaction)
        setStep('redirect')
        
        // Open Ramp widget in new window
        const rampWindow = window.open(
          response.data.transaction.rampUrl,
          'ramp-widget',
          'width=500,height=700,scrollbars=yes,resizable=yes'
        )

        // Monitor the window
        const checkClosed = setInterval(() => {
          if (rampWindow?.closed) {
            clearInterval(checkClosed)
            checkTransactionStatus(response.data.transaction.id)
          }
        }, 1000)

      } else {
        setError(response.data.message || 'Failed to initiate on-ramp')
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to initiate on-ramp transaction')
    } finally {
      setLoading(false)
    }
  }

  const checkTransactionStatus = async (transactionId: string) => {
    try {
      const response = await axios.get(`/api/onramp/status/${transactionId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })

      const updatedTransaction = response.data.transaction
      setTransaction(updatedTransaction)

      if (updatedTransaction.status === 'COMPLETED') {
        setStep('success')
        onSuccess?.(updatedTransaction)
      } else if (['FAILED', 'CANCELLED', 'EXPIRED'].includes(updatedTransaction.status)) {
        setError(`Transaction ${updatedTransaction.status.toLowerCase()}`)
        setStep('form')
      } else {
        setStep('processing')
        // Continue polling for status updates
        setTimeout(() => checkTransactionStatus(transactionId), 5000)
      }
    } catch (error) {
      console.error('Status check failed:', error)
      setStep('form')
    }
  }

  const resetWidget = () => {
    setStep('form')
    setTransaction(null)
    setError(null)
    setLoading(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Buy Crypto
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Purchase crypto with fiat currency
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* KYC Warning */}
          {kycStatus !== 'APPROVED' && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    KYC Verification Required
                  </h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Complete identity verification to purchase crypto. This ensures compliance with financial regulations.
                  </p>
                  <button className="text-sm text-amber-600 dark:text-amber-400 underline mt-2">
                    Start KYC Verification
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div>
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Form Step */}
          {step === 'form' && (
            <div className="space-y-6">
              {/* Amount Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount to Purchase
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={fiatAmount}
                    onChange={(e) => setFiatAmount(parseFloat(e.target.value) || 0)}
                    min="10"
                    max="10000"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="50"
                  />
                  <div className="absolute right-3 top-3">
                    <select
                      value={fiatCurrency}
                      onChange={(e) => setFiatCurrency(e.target.value)}
                      className="bg-transparent border-none focus:ring-0 text-gray-600 dark:text-gray-300"
                    >
                      {SUPPORTED_FIAT.map(currency => (
                        <option key={currency.code} value={currency.code}>
                          {currency.code}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Minimum: $10, Maximum: $10,000
                </p>
              </div>

              {/* Crypto Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Receive Cryptocurrency
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {SUPPORTED_CRYPTO.map(crypto => (
                    <button
                      key={crypto.code}
                      onClick={() => setCryptoCurrency(crypto.code)}
                      className={`p-3 border rounded-lg text-left transition-colors ${
                        cryptoCurrency === crypto.code
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{crypto.icon}</span>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {crypto.code}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {crypto.name}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Wallet Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Destination Wallet
                </label>
                <input
                  type="text"
                  value={userAddress}
                  onChange={(e) => setUserAddress(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white font-mono text-sm"
                  placeholder="0x..."
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Crypto will be sent to this address
                </p>
              </div>

              {/* Security Notice */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Secure Transaction
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Powered by Ramp Network. Your payment information is encrypted and secure.
                    </p>
                  </div>
                </div>
              </div>

              {/* Purchase Button */}
              <button
                onClick={initiateOnramp}
                disabled={loading || kycStatus !== 'APPROVED' || !userAddress || fiatAmount < 10}
                className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <span>Purchase {cryptoCurrency}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Processing Step */}
          {step === 'processing' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto">
                <Clock className="h-8 w-8 text-purple-600 dark:text-purple-400 animate-pulse" />
              </div>
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                  Processing Transaction
                </h4>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  Your crypto purchase is being processed. This may take a few minutes.
                </p>
              </div>
              {transaction && (
                <div className="text-left bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Transaction ID:</span>
                    <span className="font-mono">{transaction.id}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Status:</span>
                    <span className="capitalize">{transaction.status}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Redirect Step */}
          {step === 'redirect' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto">
                <ExternalLink className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                  Complete Purchase
                </h4>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  A new window has opened to complete your purchase. Please follow the instructions there.
                </p>
              </div>
              <button
                onClick={() => transaction && window.open(transaction.rampUrl)}
                className="text-purple-600 dark:text-purple-400 underline"
              >
                Reopen Purchase Window
              </button>
            </div>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                  Purchase Successful!
                </h4>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  Your crypto has been successfully purchased and sent to your wallet.
                </p>
              </div>
              {transaction && (
                <div className="text-left bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Purchased:</span>
                    <span className="font-medium">
                      {transaction.cryptoValue} {transaction.cryptoCurrency}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Cost:</span>
                    <span>{transaction.fiatValue} {transaction.fiatCurrency}</span>
                  </div>
                </div>
              )}
              <button
                onClick={() => {
                  resetWidget()
                  onClose()
                }}
                className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
