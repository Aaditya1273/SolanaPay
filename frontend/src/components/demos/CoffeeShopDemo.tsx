import React, { useState, useEffect } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Coffee, CreditCard, CheckCircle, Clock, DollarSign, Zap } from 'lucide-react'
import DisplayName from '@/components/common/DisplayName'
import { snsService } from '@/services/snsService'
import { soulboundNFTService } from '@/services/soulboundNFTService'
import toast from 'react-hot-toast'

interface Product {
  id: string
  name: string
  price: number
  description: string
  image: string
}

interface Order {
  id: string
  items: { product: Product; quantity: number }[]
  total: number
  tip: number
  status: 'pending' | 'processing' | 'completed'
  timestamp: Date
}

const DEMO_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Espresso',
    price: 3.50,
    description: 'Rich, bold espresso shot',
    image: '☕'
  },
  {
    id: '2',
    name: 'Cappuccino',
    price: 4.75,
    description: 'Espresso with steamed milk foam',
    image: '☕'
  },
  {
    id: '3',
    name: 'Latte',
    price: 5.25,
    description: 'Smooth espresso with steamed milk',
    image: '🥛'
  },
  {
    id: '4',
    name: 'Croissant',
    price: 3.25,
    description: 'Buttery, flaky pastry',
    image: '🥐'
  },
  {
    id: '5',
    name: 'Muffin',
    price: 2.75,
    description: 'Fresh blueberry muffin',
    image: '🧁'
  }
]

export default function CoffeeShopDemo() {
  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()
  
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([])
  const [tip, setTip] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [merchantStats, setMerchantStats] = useState({
    totalSales: 0,
    totalTransactions: 0,
    averageOrder: 0
  })
  const [merchantDomain, setMerchantDomain] = useState<string>('cafe.sol')
  const [customerDomain, setCustomerDomain] = useState<string>('')

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId))
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity === 0) {
      removeFromCart(productId)
      return
    }
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      )
    )
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
  const total = subtotal + tip
  const fee = total * 0.005 // 0.5% platform fee

  const processPayment = async () => {
    if (!publicKey) {
      toast.error('Please connect your wallet')
      return
    }

    if (cart.length === 0) {
      toast.error('Your cart is empty')
      return
    }

    setIsProcessing(true)

    try {
      // Get or register customer domain
      let domain = await snsService.reverseLookup(publicKey)
      if (!domain) {
        // Auto-register a domain for demo
        const username = `customer${Math.floor(Math.random() * 1000)}`
        domain = `${username}.sol`
        await snsService.registerDomain(domain, publicKey)
        setCustomerDomain(domain)
        toast.success(`Registered ${domain} for you!`)
      } else {
        setCustomerDomain(domain)
      }

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000))

      const newOrder: Order = {
        id: Date.now().toString(),
        items: [...cart],
        total: subtotal,
        tip,
        status: 'processing',
        timestamp: new Date()
      }

      setOrders(prev => [newOrder, ...prev])
      
      // Simulate instant merchant payout and loyalty NFT minting
      setTimeout(async () => {
        setOrders(prev => 
          prev.map(order => 
            order.id === newOrder.id 
              ? { ...order, status: 'completed' }
              : order
          )
        )
        
        const newStats = {
          totalSales: merchantStats.totalSales + total,
          totalTransactions: merchantStats.totalTransactions + 1,
          averageOrder: (merchantStats.totalSales + total) / (merchantStats.totalTransactions + 1)
        }
        setMerchantStats(newStats)

        // Mint soulbound loyalty NFT for customer
        try {
          if (domain && newStats.totalTransactions >= 1) {
            const tier = newStats.totalTransactions >= 10 ? 'Gold' : 
                        newStats.totalTransactions >= 5 ? 'Silver' : 'Bronze'
            
            await soulboundNFTService.mintLoyaltyNFT(
              { publicKey, signTransaction: sendTransaction },
              domain,
              tier,
              {
                totalTransactions: newStats.totalTransactions,
                totalVolume: newStats.totalSales,
                merchantRating: 4.8,
                customerRating: 4.9,
                communityContributions: 2,
                loyaltyStreak: 3,
                achievementCount: 1
              }
            )
            
            toast.success(`${tier} loyalty NFT minted to ${domain}!`)
          }
        } catch (error) {
          console.error('NFT minting failed:', error)
        }

        toast.success('Payment completed! Merchant received instant USDC payout')
      }, 1500)

      setCart([])
      setTip(0)
      toast.success('Payment processing...')

    } catch (error) {
      console.error('Payment failed:', error)
      toast.error('Payment failed. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Coffee className="h-8 w-8 text-amber-600" />
          Coffee.sol Demo
        </h1>
        <p className="text-muted-foreground">
          Experience instant USDC payments with zero-fee merchant payouts
        </p>
        <div className="flex items-center justify-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span>Merchant:</span>
            <DisplayName address={merchantDomain} showAvatar showReputation />
          </div>
          {customerDomain && (
            <div className="flex items-center gap-2">
              <span>Customer:</span>
              <DisplayName address={customerDomain} showAvatar showReputation />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coffee className="h-5 w-5" />
                Menu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DEMO_PRODUCTS.map(product => (
                  <div
                    key={product.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{product.image}</span>
                          <h3 className="font-semibold">{product.name}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {product.description}
                        </p>
                        <p className="font-bold text-lg">
                          ${product.price.toFixed(2)}
                        </p>
                      </div>
                      <Button
                        onClick={() => addToCart(product)}
                        size="sm"
                        className="ml-2"
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cart & Checkout */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Your Order
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Your cart is empty
                </p>
              ) : (
                <>
                  {cart.map(item => (
                    <div key={item.product.id} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          ${item.product.price.toFixed(2)} each
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="border-t pt-4 space-y-3">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>

                    {/* Tip Selection */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tip</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[0, 0.50, 1.00, 2.00].map(amount => (
                          <Button
                            key={amount}
                            variant={tip === amount ? "default" : "outline"}
                            size="sm"
                            onClick={() => setTip(amount)}
                          >
                            ${amount.toFixed(2)}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <span>Platform Fee (0.5%)</span>
                      <span>${fee.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>

                    <Button
                      onClick={processPayment}
                      disabled={isProcessing || !publicKey}
                      className="w-full"
                      size="lg"
                    >
                      {isProcessing ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Pay with USDC
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Merchant Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Merchant Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Sales</span>
                <span className="font-semibold">${merchantStats.totalSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Transactions</span>
                <span className="font-semibold">{merchantStats.totalTransactions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Average Order</span>
                <span className="font-semibold">${merchantStats.averageOrder.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t space-y-2">
                <Badge variant="secondary" className="w-full justify-center">
                  <Zap className="h-3 w-3 mr-1" />
                  Instant USDC Payouts
                </Badge>
                <div className="text-center">
                  <DisplayName 
                    address={merchantDomain} 
                    showAvatar 
                    showReputation 
                    className="text-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Orders */}
      {orders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {orders.slice(0, 5).map(order => (
                <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">
                      Order #{order.id.slice(-6)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {order.items.map(item => `${item.quantity}x ${item.product.name}`).join(', ')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${(order.total + order.tip).toFixed(2)}</p>
                    <Badge
                      variant={
                        order.status === 'completed' ? 'default' :
                        order.status === 'processing' ? 'secondary' : 'outline'
                      }
                    >
                      {order.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {order.status === 'processing' && <Clock className="h-3 w-3 mr-1" />}
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
