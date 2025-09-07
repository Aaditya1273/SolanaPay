import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { toast } from 'react-hot-toast';

interface MerchantProfile {
  id: string;
  businessName: string;
  businessType: string;
  website?: string;
  description?: string;
  status: string;
  isActive: boolean;
  apiKey: string;
  totalTransactions: number;
  totalCustomers: number;
  createdAt: string;
}

interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  description?: string;
  customerEmail?: string;
  status: string;
  transactionHash?: string;
  createdAt: string;
  completedAt?: string;
}

interface Analytics {
  period: string;
  totalTransactions: number;
  totalRevenue: number;
  successfulPayments: number;
  failedPayments: number;
  successRate: string;
  topCustomers: Array<{
    email: string;
    totalSpent: number;
    transactionCount: number;
  }>;
  recentTransactions: PaymentIntent[];
}

interface Customer {
  email: string;
  totalSpent: number;
  transactionCount: number;
  lastTransaction: string;
}

interface LoyaltyReward {
  id: string;
  customerEmail: string;
  points: number;
  reason: string;
  status: string;
  createdAt: string;
}

const MerchantDashboard: React.FC = () => {
  const { connected, publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // State
  const [merchantProfile, setMerchantProfile] = useState<MerchantProfile | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loyaltyRewards, setLoyaltyRewards] = useState<LoyaltyReward[]>([]);
  const [paymentIntents, setPaymentIntents] = useState<PaymentIntent[]>([]);
  
  // Form states
  const [registrationForm, setRegistrationForm] = useState({
    businessName: '',
    businessType: 'RETAIL',
    website: '',
    description: '',
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    currency: 'SOL',
    description: '',
    customerEmail: '',
  });

  const [loyaltyForm, setLoyaltyForm] = useState({
    customerEmail: '',
    points: '',
    reason: '',
  });

  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  useEffect(() => {
    if (connected && publicKey) {
      loadMerchantData();
    }
  }, [connected, publicKey, selectedPeriod]);

  const loadMerchantData = async () => {
    try {
      setLoading(true);
      
      // Load merchant profile
      const profileResponse = await fetch('/api/merchant/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setMerchantProfile(profileData.merchant);
        
        // Load analytics if merchant exists
        await loadAnalytics(profileData.merchant.apiKey);
        await loadCustomers(profileData.merchant.apiKey);
        await loadLoyaltyRewards(profileData.merchant.apiKey);
        await loadPaymentIntents(profileData.merchant.apiKey);
      }
    } catch (error) {
      console.error('Error loading merchant data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async (apiKey: string) => {
    try {
      const response = await fetch(`/api/merchant/analytics?period=${selectedPeriod}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-API-Key': apiKey,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const loadCustomers = async (apiKey: string) => {
    try {
      const response = await fetch('/api/merchant/customers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-API-Key': apiKey,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadLoyaltyRewards = async (apiKey: string) => {
    try {
      const response = await fetch('/api/merchant/loyalty', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-API-Key': apiKey,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setLoyaltyRewards(data.rewards);
      }
    } catch (error) {
      console.error('Error loading loyalty rewards:', error);
    }
  };

  const loadPaymentIntents = async (apiKey: string) => {
    try {
      const response = await fetch('/api/merchant/payment/intents', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-API-Key': apiKey,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setPaymentIntents(data.paymentIntents || []);
      }
    } catch (error) {
      console.error('Error loading payment intents:', error);
    }
  };

  const handleMerchantRegistration = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/merchant/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(registrationForm),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Merchant registration successful!');
        setMerchantProfile(data.merchant);
        setRegistrationForm({
          businessName: '',
          businessType: 'RETAIL',
          website: '',
          description: '',
        });
      } else {
        toast.error(data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Error registering merchant:', error);
      toast.error('Failed to register merchant');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayment = async () => {
    if (!merchantProfile) return;

    try {
      setLoading(true);
      const response = await fetch('/api/merchant/payment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': merchantProfile.apiKey,
        },
        body: JSON.stringify({
          amount: parseFloat(paymentForm.amount),
          currency: paymentForm.currency,
          description: paymentForm.description,
          customerEmail: paymentForm.customerEmail,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Payment intent created!');
        setPaymentForm({
          amount: '',
          currency: 'SOL',
          description: '',
          customerEmail: '',
        });
        await loadPaymentIntents(merchantProfile.apiKey);
      } else {
        toast.error(data.message || 'Failed to create payment');
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error('Failed to create payment intent');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLoyaltyReward = async () => {
    if (!merchantProfile) return;

    try {
      setLoading(true);
      const response = await fetch('/api/merchant/loyalty/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          customerEmail: loyaltyForm.customerEmail,
          points: parseInt(loyaltyForm.points),
          reason: loyaltyForm.reason,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Loyalty reward created!');
        setLoyaltyForm({
          customerEmail: '',
          points: '',
          reason: '',
        });
        await loadLoyaltyRewards(merchantProfile.apiKey);
      } else {
        toast.error(data.message || 'Failed to create loyalty reward');
      }
    } catch (error) {
      console.error('Error creating loyalty reward:', error);
      toast.error('Failed to create loyalty reward');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      'PENDING': 'warning',
      'APPROVED': 'success',
      'REJECTED': 'destructive',
      'COMPLETED': 'success',
      'FAILED': 'destructive',
      'ACTIVE': 'success',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const chartColors = ['#9945FF', '#14F195', '#FF6B6B', '#4ECDC4', '#45B7D1'];

  if (!connected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertDescription>
            Please connect your wallet to access the Merchant Dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!merchantProfile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Register as Merchant</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Business Name"
              value={registrationForm.businessName}
              onChange={(e) => setRegistrationForm({ ...registrationForm, businessName: e.target.value })}
            />
            <select
              value={registrationForm.businessType}
              onChange={(e) => setRegistrationForm({ ...registrationForm, businessType: e.target.value })}
              className="w-full p-2 border rounded"
            >
              <option value="RETAIL">Retail</option>
              <option value="RESTAURANT">Restaurant</option>
              <option value="SERVICE">Service</option>
              <option value="ECOMMERCE">E-commerce</option>
              <option value="OTHER">Other</option>
            </select>
            <Input
              placeholder="Website (optional)"
              value={registrationForm.website}
              onChange={(e) => setRegistrationForm({ ...registrationForm, website: e.target.value })}
            />
            <Textarea
              placeholder="Business Description (optional)"
              value={registrationForm.description}
              onChange={(e) => setRegistrationForm({ ...registrationForm, description: e.target.value })}
            />
            <Button onClick={handleMerchantRegistration} disabled={loading}>
              Register Merchant
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Merchant Dashboard</h1>
        <p className="text-gray-600">{merchantProfile.businessName}</p>
        <div className="flex items-center gap-2 mt-2">
          {getStatusBadge(merchantProfile.status)}
          <Badge variant={merchantProfile.isActive ? 'success' : 'secondary'}>
            {merchantProfile.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {analytics && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{analytics.totalRevenue.toFixed(2)}</div>
                    <div className="text-sm text-gray-600">Total Revenue (SOL)</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{analytics.totalTransactions}</div>
                    <div className="text-sm text-gray-600">Total Transactions</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{analytics.successRate}%</div>
                    <div className="text-sm text-gray-600">Success Rate</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{merchantProfile.totalCustomers}</div>
                    <div className="text-sm text-gray-600">Total Customers</div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Transactions */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.recentTransactions.slice(0, 5).map((transaction, index) => (
                      <div key={index} className="flex justify-between items-center border-b pb-2">
                        <div>
                          <div className="font-semibold">{transaction.amount} {transaction.currency}</div>
                          <div className="text-sm text-gray-600">{transaction.description}</div>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(transaction.status)}
                          <div className="text-sm text-gray-600">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Payment Intent</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  placeholder="Amount"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                />
                <select
                  value={paymentForm.currency}
                  onChange={(e) => setPaymentForm({ ...paymentForm, currency: e.target.value })}
                  className="p-2 border rounded"
                >
                  <option value="SOL">SOL</option>
                  <option value="USDC">USDC</option>
                </select>
              </div>
              <Input
                placeholder="Description"
                value={paymentForm.description}
                onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
              />
              <Input
                type="email"
                placeholder="Customer Email (optional)"
                value={paymentForm.customerEmail}
                onChange={(e) => setPaymentForm({ ...paymentForm, customerEmail: e.target.value })}
              />
              <Button onClick={handleCreatePayment} disabled={loading}>
                Create Payment Intent
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Intents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paymentIntents.map((intent) => (
                  <div key={intent.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold">{intent.amount} {intent.currency}</div>
                        <div className="text-sm text-gray-600">{intent.description}</div>
                        {intent.customerEmail && (
                          <div className="text-sm text-gray-600">{intent.customerEmail}</div>
                        )}
                      </div>
                      {getStatusBadge(intent.status)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Created: {new Date(intent.createdAt).toLocaleString()}
                      {intent.completedAt && (
                        <span> | Completed: {new Date(intent.completedAt).toLocaleString()}</span>
                      )}
                    </div>
                    {intent.transactionHash && (
                      <div className="text-xs text-gray-500 mt-1">
                        TX: {intent.transactionHash.slice(0, 20)}...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customers.map((customer, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">{customer.email}</div>
                        <div className="text-sm text-gray-600">
                          {customer.transactionCount} transactions
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{customer.totalSpent.toFixed(2)} SOL</div>
                        <div className="text-sm text-gray-600">
                          Last: {new Date(customer.lastTransaction).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loyalty" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Issue Loyalty Points</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="email"
                placeholder="Customer Email"
                value={loyaltyForm.customerEmail}
                onChange={(e) => setLoyaltyForm({ ...loyaltyForm, customerEmail: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Points"
                value={loyaltyForm.points}
                onChange={(e) => setLoyaltyForm({ ...loyaltyForm, points: e.target.value })}
              />
              <Input
                placeholder="Reason"
                value={loyaltyForm.reason}
                onChange={(e) => setLoyaltyForm({ ...loyaltyForm, reason: e.target.value })}
              />
              <Button onClick={handleCreateLoyaltyReward} disabled={loading}>
                Issue Points
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Loyalty Rewards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loyaltyRewards.map((reward) => (
                  <div key={reward.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">{reward.customerEmail}</div>
                        <div className="text-sm text-gray-600">{reward.reason}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{reward.points} points</div>
                        {getStatusBadge(reward.status)}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {new Date(reward.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Analytics</h2>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>

          {analytics && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={[
                      { name: 'Week 1', revenue: analytics.totalRevenue * 0.2 },
                      { name: 'Week 2', revenue: analytics.totalRevenue * 0.3 },
                      { name: 'Week 3', revenue: analytics.totalRevenue * 0.25 },
                      { name: 'Week 4', revenue: analytics.totalRevenue * 0.25 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="revenue" stroke="#9945FF" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Customers</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.topCustomers.slice(0, 5)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="email" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="totalSpent" fill="#14F195" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">API Key</label>
                <Input
                  value={merchantProfile.apiKey}
                  readOnly
                  className="font-mono"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Use this API key to integrate payments into your applications.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Webhook URL</label>
                <Input
                  value={`${window.location.origin}/api/webhooks/solanapay`}
                  readOnly
                  className="font-mono"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Configure this URL in your SolanaPay merchant settings for payment notifications.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Business Name</label>
                  <Input value={merchantProfile.businessName} readOnly />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Business Type</label>
                  <Input value={merchantProfile.businessType} readOnly />
                </div>
              </div>
              {merchantProfile.website && (
                <div>
                  <label className="block text-sm font-medium mb-2">Website</label>
                  <Input value={merchantProfile.website} readOnly />
                </div>
              )}
              {merchantProfile.description && (
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <Textarea value={merchantProfile.description} readOnly />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MerchantDashboard;
