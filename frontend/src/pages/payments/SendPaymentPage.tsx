import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@/contexts/WalletContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { ArrowLeft, Send, QrCode, Users, Clock, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios'

interface Contact {
  id: string
  username: string
  fullName?: string
  avatar?: string
}

interface RecentTransaction {
  id: string
  recipientId: string
  recipientUsername: string
  recipientName?: string
  amount: number
  createdAt: string
}

export default function SendPaymentPage() {
  const [step, setStep] = useState<'recipient' | 'amount' | 'confirm'>('recipient')
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([])
  const [loadingData, setLoadingData] = useState(true)
  
  const navigate = useNavigate()
  const { balance } = useWallet()

  useEffect(() => {
    fetchContactsAndRecent()
  }, [])

  const fetchContactsAndRecent = async () => {
    try {
      setLoadingData(true)
      const token = localStorage.getItem('vpay-token')
      if (!token) return

      // Fetch contacts (other users)
      const contactsResponse = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/users/search/`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 10 }
      })
      
      // Fetch recent transactions
      const transactionsResponse = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/wallet/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 5, type: 'sent' }
      })

      setContacts(contactsResponse.data.users || [])
      setRecentTransactions(transactionsResponse.data.transactions || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact)
    setRecipient(contact.username)
    setStep('amount')
  }

  const handleSelectRecent = (transaction: RecentTransaction) => {
    const contact: Contact = {
      id: transaction.recipientId,
      username: transaction.recipientUsername,
      fullName: transaction.recipientName
    }
    setSelectedContact(contact)
    setRecipient(transaction.recipientUsername)
    setStep('amount')
  }

  const handleContinueToAmount = () => {
    if (recipient.trim()) {
      setStep('amount')
    }
  }

  const handleContinueToConfirm = () => {
    if (amount && parseFloat(amount) > 0) {
      setStep('confirm')
    }
  }

  const handleSend = async () => {
    setIsLoading(true)
    
    try {
      const token = localStorage.getItem('vpay-token')
      if (!token) {
        toast.error('Please log in to send payments')
        return
      }

      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/wallet/send`, {
        to: recipient,
        amount: parseFloat(amount),
        message: message || undefined
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      toast.success('Payment sent successfully!')
      navigate('/wallet')
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to send payment'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const availableBalance = parseFloat(balance) || 0
  const sendAmount = parseFloat(amount) || 0
  const fee = sendAmount * 0.001 // 0.1% fee
  const total = sendAmount + fee

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => step === 'recipient' ? navigate('/wallet') : setStep(step === 'confirm' ? 'amount' : 'recipient')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Send Payment</h1>
          <p className="text-muted-foreground">
            {step === 'recipient' && 'Choose who to send to'}
            {step === 'amount' && 'Enter amount to send'}
            {step === 'confirm' && 'Confirm your payment'}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center space-x-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          step === 'recipient' ? 'bg-vpay-purple-500 text-white' : 'bg-vpay-purple-100 text-vpay-purple-600'
        }`}>
          1
        </div>
        <div className={`flex-1 h-1 ${step !== 'recipient' ? 'bg-vpay-purple-500' : 'bg-gray-200'}`} />
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          step === 'amount' ? 'bg-vpay-purple-500 text-white' : 
          step === 'confirm' ? 'bg-vpay-purple-100 text-vpay-purple-600' : 'bg-gray-200 text-gray-500'
        }`}>
          2
        </div>
        <div className={`flex-1 h-1 ${step === 'confirm' ? 'bg-vpay-purple-500' : 'bg-gray-200'}`} />
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          step === 'confirm' ? 'bg-vpay-purple-500 text-white' : 'bg-gray-200 text-gray-500'
        }`}>
          3
        </div>
      </div>

      {/* Step Content */}
      {step === 'recipient' && (
        <div className="space-y-6">
          {/* Manual Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Send className="h-5 w-5" />
                <span>Send to Username or Address</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Recipient</label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Enter username or wallet address"
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={handleContinueToAmount}
                  disabled={!recipient.trim()}
                  className="flex-1"
                >
                  Continue
                </Button>
                <Button variant="outline" size="icon">
                  <QrCode className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Recipients */}
          {loadingData ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Recent</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading recent transactions...</span>
                </div>
              </CardContent>
            </Card>
          ) : recentTransactions.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Recent</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      onClick={() => handleSelectRecent(transaction)}
                      className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div className="w-10 h-10 rounded-full bg-vpay-purple-100 dark:bg-vpay-purple-900 flex items-center justify-center text-vpay-purple-600 dark:text-vpay-purple-300 font-semibold">
                        {transaction.recipientName?.charAt(0) || transaction.recipientUsername.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{transaction.recipientName || transaction.recipientUsername}</p>
                        <p className="text-sm text-muted-foreground">@{transaction.recipientUsername}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Last sent</p>
                        <p className="font-medium">{formatCurrency(transaction.amount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Contacts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Contacts</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading contacts...</span>
                </div>
              ) : contacts.length > 0 ? (
                <div className="space-y-2">
                  {contacts.map((contact) => (
                    <div
                      key={contact.id}
                      onClick={() => handleSelectContact(contact)}
                      className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div className="w-10 h-10 rounded-full bg-vpay-purple-100 dark:bg-vpay-purple-900 flex items-center justify-center text-vpay-purple-600 dark:text-vpay-purple-300 font-semibold">
                        {contact.avatar ? (
                          <img src={contact.avatar} alt={contact.fullName || contact.username} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          (contact.fullName?.charAt(0) || contact.username.charAt(0)).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{contact.fullName || contact.username}</p>
                        <p className="text-sm text-muted-foreground">@{contact.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No contacts found</p>
                  <p className="text-sm">Users you interact with will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {step === 'amount' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Enter Amount</CardTitle>
              <div className="text-sm text-muted-foreground">
                Sending to: <span className="font-medium">{selectedContact?.fullName || selectedContact?.username || recipient}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">
                  <span className="text-muted-foreground">VRC </span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="bg-transparent border-none outline-none text-center w-32"
                    step="0.01"
                    min="0"
                  />
                </div>
                <div className="text-muted-foreground">
                  ≈ ${(sendAmount * 1.0).toFixed(2)} USD
                </div>
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

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Available Balance</span>
                  <span className="font-medium">{formatCurrency(availableBalance)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Network Fee</span>
                  <span className="font-medium">{formatCurrency(fee)}</span>
                </div>
              </div>

              <Button
                variant="vpay"
                onClick={handleContinueToConfirm}
                disabled={!amount || sendAmount <= 0 || total > availableBalance}
                className="w-full"
              >
                Continue
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 'confirm' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Confirm Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-vpay-purple-100 dark:bg-vpay-purple-900 flex items-center justify-center text-2xl mx-auto mb-4 text-vpay-purple-600 dark:text-vpay-purple-300 font-semibold">
                  {selectedContact?.avatar ? (
                    <img src={selectedContact.avatar} alt={selectedContact.fullName || selectedContact.username} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    (selectedContact?.fullName?.charAt(0) || selectedContact?.username?.charAt(0) || recipient.charAt(0)).toUpperCase()
                  )}
                </div>
                <h3 className="text-xl font-semibold">{selectedContact?.fullName || selectedContact?.username || recipient}</h3>
                <p className="text-muted-foreground">@{selectedContact?.username || recipient}</p>
              </div>

              <div className="text-center py-6 border-y">
                <div className="text-3xl font-bold">{formatCurrency(sendAmount)}</div>
                <div className="text-muted-foreground">≈ ${(sendAmount * 1.0).toFixed(2)} USD</div>
                {message && (
                  <div className="mt-2 text-sm text-muted-foreground">"{message}"</div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Amount</span>
                  <span className="font-medium">{formatCurrency(sendAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Network Fee</span>
                  <span className="font-medium">{formatCurrency(fee)}</span>
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              <Button
                variant="vpay"
                onClick={handleSend}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Sending...' : 'Send Payment'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
