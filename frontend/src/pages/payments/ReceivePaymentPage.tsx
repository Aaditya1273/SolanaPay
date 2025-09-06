import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@/contexts/WalletContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatAddress } from '@/lib/utils'
import { ArrowLeft, Copy, QrCode, Share, Download } from 'lucide-react'
import toast from 'react-hot-toast'

interface RecentPayment {
  from: string;
  amount: number;
  message: string;
  time: string;
}

export default function ReceivePaymentPage() {
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [showQR, setShowQR] = useState(false)
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([])
  
  const navigate = useNavigate()
  const { account } = useWallet()

  useEffect(() => {
    fetchRecentPayments()
  }, [account])

  const fetchRecentPayments = async () => {
    try {
      const token = localStorage.getItem('vpay-token')
      if (!token || !account) {
        setRecentPayments([])
        return
      }

      const response = await fetch('/api/payments/recent/incoming', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setRecentPayments(data.payments || [])
      } else {
        throw new Error('Failed to fetch recent payments')
      }
    } catch (error) {
      console.error('Error fetching recent payments:', error)
      setRecentPayments([])
    }
  }

  const copyAddress = () => {
    if (account) {
      navigator.clipboard.writeText(account)
      toast.success('Address copied to clipboard')
    }
  }

  const generatePaymentLink = () => {
    const baseUrl = window.location.origin
    const params = new URLSearchParams()
    if (amount) params.append('amount', amount)
    if (message) params.append('message', message)
    params.append('to', account!)
    
    const link = `${baseUrl}/pay?${params.toString()}`
    navigator.clipboard.writeText(link)
    toast.success('Payment link copied to clipboard')
  }

  const sharePaymentRequest = () => {
    const text = `Send me ${amount ? `${amount} VRC` : 'VRC tokens'} on VPay${message ? ` for: ${message}` : ''}`
    
    if (navigator.share) {
      navigator.share({
        title: 'VPay Payment Request',
        text,
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(text)
      toast.success('Payment request copied to clipboard')
    }
  }

  // Generate QR code data (for future QR implementation)
  const generateQRData = () => JSON.stringify({
    to: account,
    amount: amount || undefined,
    message: message || undefined
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/wallet')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Receive Payment</h1>
          <p className="text-muted-foreground">Share your address or create a payment request</p>
        </div>
      </div>

      {/* Wallet Address */}
      <Card>
        <CardHeader>
          <CardTitle>Your Wallet Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <code className="flex-1 text-sm font-mono break-all">
              {account}
            </code>
            <Button
              variant="outline"
              size="icon"
              onClick={copyAddress}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Share this address to receive VRC tokens from anyone
          </p>
        </CardContent>
      </Card>

      {/* Payment Request */}
      <Card>
        <CardHeader>
          <CardTitle>Create Payment Request</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (optional)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                step="0.01"
                min="0"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Message (optional)</label>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What's this for?"
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={generatePaymentLink}
              className="flex items-center space-x-2"
            >
              <Copy className="h-4 w-4" />
              <span>Copy Link</span>
            </Button>
            <Button
              variant="outline"
              onClick={sharePaymentRequest}
              className="flex items-center space-x-2"
            >
              <Share className="h-4 w-4" />
              <span>Share</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* QR Code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>QR Code</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQR(!showQR)}
            >
              {showQR ? 'Hide' : 'Show'} QR
            </Button>
          </CardTitle>
        </CardHeader>
        {showQR && (
          <CardContent className="text-center space-y-4">
            <div className="w-48 h-48 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mx-auto">
              <div className="text-center">
                <QrCode className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">QR Code</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatAddress(account!)}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Scan to send payment</p>
              {amount && (
                <p className="text-sm text-muted-foreground">
                  Requesting: {amount} VRC
                </p>
              )}
              {message && (
                <p className="text-sm text-muted-foreground">
                  Message: "{message}"
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Save QR Code</span>
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Incoming Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentPayments.map((payment: RecentPayment, index: number) => (
              <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-400 text-lg">+</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium">From @{payment.from}</p>
                  <p className="text-sm text-muted-foreground">{payment.message}</p>
                  <p className="text-xs text-muted-foreground">{payment.time}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">+{payment.amount} VRC</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
