import React, { useState, useEffect } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { QRCodeSVG } from 'qrcode.react'
import { solanaPayService, PaymentRequest } from '../../services/solanaPayService'
import toast from 'react-hot-toast'

interface SolanaPaymentInterfaceProps {
  defaultRecipient?: string
  defaultAmount?: number
  defaultCurrency?: 'SOL' | 'USDC'
  onPaymentComplete?: (result: any) => void
}

const SolanaPaymentInterface: React.FC<SolanaPaymentInterfaceProps> = ({
  defaultRecipient = '',
  defaultAmount = 0,
  defaultCurrency = 'SOL',
  onPaymentComplete
}) => {
  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()
  
  const [paymentMode, setPaymentMode] = useState<'send' | 'receive' | 'qr'>('send')
  const [recipient, setRecipient] = useState(defaultRecipient)
  const [amount, setAmount] = useState(defaultAmount.toString())
  const [currency, setCurrency] = useState<'SOL' | 'USDC'>(defaultCurrency)
  const [description, setDescription] = useState('')
  const [useEscrow, setUseEscrow] = useState(false)
  const [autoRelease, setAutoRelease] = useState(false)
  const [autoReleaseHours, setAutoReleaseHours] = useState('24')
  
  const [balances, setBalances] = useState({ sol: 0, usdc: 0 })
  const [fees, setFees] = useState({ networkFee: 0, platformFee: 0 })
  const [isLoading, setIsLoading] = useState(false)
  const [qrCode, setQrCode] = useState('')
  const [paymentUrl, setPaymentUrl] = useState('')

  useEffect(() => {
    if (publicKey) {
      loadBalances()
    }
  }, [publicKey])

  useEffect(() => {
    if (amount && parseFloat(amount) > 0) {
      estimateFees()
    }
  }, [amount, currency])

  const loadBalances = async () => {
    if (!publicKey) return
    
    try {
      const balanceData = await solanaPayService.getBalances(publicKey)
      setBalances(balanceData)
    } catch (error) {
      console.error('Failed to load balances:', error)
    }
  }

  const estimateFees = async () => {
    if (!amount || parseFloat(amount) <= 0) return
    
    try {
      const request: PaymentRequest = {
        recipient: recipient || publicKey?.toString() || '',
        amount: parseFloat(amount),
        currency,
        description
      }
      
      const feeData = await solanaPayService.estimateFees(request)
      setFees(feeData)
    } catch (error) {
      console.error('Failed to estimate fees:', error)
    }
  }

  const generateQRCode = async () => {
    if (!recipient || !amount || parseFloat(amount) <= 0) {
      toast.error('Please enter recipient and amount')
      return
    }

    try {
      setIsLoading(true)
      
      const request: PaymentRequest = {
        recipient,
        amount: parseFloat(amount),
        currency,
        description
      }
      
      const paymentUrl = await solanaPayService.createPaymentQR(request)
      const qrDataUrl = await solanaPayService.generateQRCode(paymentUrl)
      
      setPaymentUrl(paymentUrl)
      setQrCode(qrDataUrl)
      setPaymentMode('qr')
      
      toast.success('QR code generated successfully!')
    } catch (error) {
      console.error('Failed to generate QR code:', error)
      toast.error('Failed to generate QR code')
    } finally {
      setIsLoading(false)
    }
  }

  const sendPayment = async () => {
    if (!publicKey || !recipient || !amount || parseFloat(amount) <= 0) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setIsLoading(true)
      
      const request: PaymentRequest = {
        recipient,
        amount: parseFloat(amount),
        currency,
        description,
        autoRelease: autoRelease,
        autoReleaseTime: autoRelease ? parseInt(autoReleaseHours) * 3600 : undefined
      }

      let result
      if (useEscrow) {
        result = await solanaPayService.createEscrowPayment({ publicKey, sendTransaction }, request)
        toast.success('Escrow payment created! Funds will be held until released.')
      } else {
        result = await solanaPayService.createInstantPayment({ publicKey, sendTransaction }, request)
        toast.success('Payment sent successfully!')
      }

      onPaymentComplete?.(result)
      
      // Reset form
      setRecipient('')
      setAmount('')
      setDescription('')
      
    } catch (error: any) {
      console.error('Payment failed:', error)
      toast.error(error.message || 'Payment failed')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  const maxAmount = currency === 'SOL' ? balances.sol : balances.usdc
  const totalCost = parseFloat(amount || '0') + fees.networkFee + fees.platformFee

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">SolanaPay</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setPaymentMode('send')}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              paymentMode === 'send'
                ? 'bg-purple-100 text-purple-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Send
          </button>
          <button
            onClick={() => setPaymentMode('receive')}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              paymentMode === 'receive'
                ? 'bg-purple-100 text-purple-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Receive
          </button>
        </div>
      </div>

      {/* Balance Display */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Your Balance</h3>
        <div className="flex justify-between">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">{balances.sol.toFixed(4)}</div>
            <div className="text-sm text-gray-500">SOL</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">{balances.usdc.toFixed(2)}</div>
            <div className="text-sm text-gray-500">USDC</div>
          </div>
        </div>
      </div>

      {paymentMode === 'qr' ? (
        /* QR Code Display */
        <div className="text-center space-y-4">
          <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
            {qrCode ? (
              <img src={qrCode} alt="Payment QR Code" className="w-48 h-48" />
            ) : (
              <QRCodeSVG value={paymentUrl || 'https://solanapay.com'} size={192} />
            )}
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Scan this QR code to pay {amount} {currency}
            </p>
            {description && (
              <p className="text-xs text-gray-500">"{description}"</p>
            )}
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => copyToClipboard(paymentUrl)}
              className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Copy Link
            </button>
            <button
              onClick={() => setPaymentMode('receive')}
              className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-purple-700 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      ) : (
        /* Payment Form */
        <div className="space-y-4">
          {/* Currency Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency
            </label>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrency('SOL')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium border ${
                  currency === 'SOL'
                    ? 'bg-purple-50 border-purple-200 text-purple-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                SOL
              </button>
              <button
                onClick={() => setCurrency('USDC')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium border ${
                  currency === 'USDC'
                    ? 'bg-purple-50 border-purple-200 text-purple-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                USDC
              </button>
            </div>
          </div>

          {/* Recipient (for send mode) */}
          {paymentMode === 'send' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Address
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Enter Solana wallet address"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount ({currency})
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.000001"
                min="0"
                max={maxAmount}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <button
                onClick={() => setAmount(maxAmount.toString())}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-purple-600 hover:text-purple-800"
              >
                MAX
              </button>
            </div>
            {maxAmount > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Available: {maxAmount.toFixed(currency === 'SOL' ? 4 : 2)} {currency}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this payment for?"
              maxLength={200}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Escrow Options (for send mode) */}
          {paymentMode === 'send' && (
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="useEscrow"
                  checked={useEscrow}
                  onChange={(e) => setUseEscrow(e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label htmlFor="useEscrow" className="ml-2 text-sm text-gray-700">
                  Use escrow (secure payment)
                </label>
              </div>

              {useEscrow && (
                <div className="ml-6 space-y-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="autoRelease"
                      checked={autoRelease}
                      onChange={(e) => setAutoRelease(e.target.checked)}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <label htmlFor="autoRelease" className="ml-2 text-sm text-gray-700">
                      Auto-release after
                    </label>
                    <select
                      value={autoReleaseHours}
                      onChange={(e) => setAutoReleaseHours(e.target.value)}
                      disabled={!autoRelease}
                      className="ml-2 text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="1">1 hour</option>
                      <option value="24">24 hours</option>
                      <option value="72">3 days</option>
                      <option value="168">1 week</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Fee Summary */}
          {amount && parseFloat(amount) > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Amount</span>
                <span className="font-medium">{amount} {currency}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Network Fee</span>
                <span className="font-medium">{fees.networkFee.toFixed(6)} SOL</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Platform Fee</span>
                <span className="font-medium">{fees.platformFee.toFixed(4)} {currency}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t pt-1">
                <span>Total Cost</span>
                <span>{totalCost.toFixed(4)} {currency}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            {paymentMode === 'send' ? (
              <button
                onClick={sendPayment}
                disabled={isLoading || !recipient || !amount || parseFloat(amount) <= 0 || totalCost > maxAmount}
                className="flex-1 bg-purple-600 text-white py-3 px-4 rounded-md font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Sending...' : `Send ${currency}`}
              </button>
            ) : (
              <button
                onClick={generateQRCode}
                disabled={isLoading || !amount || parseFloat(amount) <= 0}
                className="flex-1 bg-purple-600 text-white py-3 px-4 rounded-md font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Generating...' : 'Generate QR Code'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SolanaPaymentInterface
