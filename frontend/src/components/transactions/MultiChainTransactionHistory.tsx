import React, { useState, useEffect } from 'react';
import { useMultiChainWallet } from '../../contexts/MultiChainWalletContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  ExternalLink, 
  Filter, 
  Download,
  Search,
  Calendar,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

interface Transaction {
  id: string;
  hash: string;
  chainId: number;
  type: 'payment' | 'refund' | 'withdrawal' | 'deposit';
  status: 'pending' | 'confirmed' | 'failed';
  from: string;
  to: string;
  amount: string;
  token: string;
  usdValue: number;
  gasUsed?: string;
  gasPrice?: string;
  blockNumber?: number;
  timestamp: number;
  orderId?: string;
  merchantName?: string;
  description?: string;
}

interface FilterOptions {
  chainId?: number;
  type?: string;
  status?: string;
  dateRange?: 'all' | '24h' | '7d' | '30d' | '90d';
  minAmount?: number;
  maxAmount?: number;
}

const MultiChainTransactionHistory: React.FC = () => {
  const { address, supportedChains } = useMultiChainWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({ dateRange: '30d' });
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Mock transaction data
  const mockTransactions: Transaction[] = [
    {
      id: '1',
      hash: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 137,
      type: 'payment',
      status: 'confirmed',
      from: address || '0x0000000000000000000000000000000000000000',
      to: '0xabcdef1234567890abcdef1234567890abcdef12',
      amount: '100.50',
      token: 'USDC',
      usdValue: 100.50,
      gasUsed: '21000',
      gasPrice: '30',
      blockNumber: 45123456,
      timestamp: Date.now() - 3600000, // 1 hour ago
      orderId: 'ORD-001',
      merchantName: 'Coffee Shop',
      description: 'Coffee and pastry'
    },
    {
      id: '2',
      hash: '0xabcdef1234567890abcdef1234567890abcdef12',
      chainId: 1,
      type: 'payment',
      status: 'confirmed',
      from: address || '0x0000000000000000000000000000000000000000',
      to: '0x1234567890abcdef1234567890abcdef12345678',
      amount: '0.05',
      token: 'ETH',
      usdValue: 100.00,
      gasUsed: '21000',
      gasPrice: '50',
      blockNumber: 18123456,
      timestamp: Date.now() - 86400000, // 1 day ago
      orderId: 'ORD-002',
      merchantName: 'Online Store',
      description: 'Digital product purchase'
    },
    {
      id: '3',
      hash: '0x9876543210fedcba9876543210fedcba98765432',
      chainId: 56,
      type: 'refund',
      status: 'confirmed',
      from: '0x1234567890abcdef1234567890abcdef12345678',
      to: address || '0x0000000000000000000000000000000000000000',
      amount: '25.00',
      token: 'USDT',
      usdValue: 25.00,
      gasUsed: '21000',
      gasPrice: '5',
      blockNumber: 32123456,
      timestamp: Date.now() - 172800000, // 2 days ago
      orderId: 'ORD-003',
      merchantName: 'Electronics Store',
      description: 'Product return refund'
    },
    {
      id: '4',
      hash: '0xfedcba9876543210fedcba9876543210fedcba98',
      chainId: 137,
      type: 'payment',
      status: 'pending',
      from: address || '0x0000000000000000000000000000000000000000',
      to: '0xabcdef1234567890abcdef1234567890abcdef12',
      amount: '50.00',
      token: 'USDC',
      usdValue: 50.00,
      timestamp: Date.now() - 300000, // 5 minutes ago
      orderId: 'ORD-004',
      merchantName: 'Restaurant',
      description: 'Dinner payment'
    }
  ];

  // Load transactions
  useEffect(() => {
    const loadTransactions = async () => {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setTransactions(mockTransactions);
      } catch (error) {
        console.error('Failed to load transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    if (address) {
      loadTransactions();
    }
  }, [address]);

  // Apply filters
  useEffect(() => {
    let filtered = [...transactions];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(tx => 
        tx.hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.merchantName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Chain filter
    if (filters.chainId) {
      filtered = filtered.filter(tx => tx.chainId === filters.chainId);
    }

    // Type filter
    if (filters.type) {
      filtered = filtered.filter(tx => tx.type === filters.type);
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(tx => tx.status === filters.status);
    }

    // Date range filter
    if (filters.dateRange && filters.dateRange !== 'all') {
      const now = Date.now();
      const ranges = {
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
        '90d': 90 * 24 * 60 * 60 * 1000
      };
      const cutoff = now - ranges[filters.dateRange as keyof typeof ranges];
      filtered = filtered.filter(tx => tx.timestamp >= cutoff);
    }

    // Amount filters
    if (filters.minAmount) {
      filtered = filtered.filter(tx => tx.usdValue >= filters.minAmount!);
    }
    if (filters.maxAmount) {
      filtered = filtered.filter(tx => tx.usdValue <= filters.maxAmount!);
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    setFilteredTransactions(filtered);
  }, [transactions, filters, searchTerm]);

  const getChainInfo = (chainId: number) => {
    const chainMap = {
      1: { name: 'Ethereum', icon: '⟠', color: '#627EEA', explorer: 'https://etherscan.io' },
      137: { name: 'Polygon', icon: '⬟', color: '#8247E5', explorer: 'https://polygonscan.com' },
      56: { name: 'BSC', icon: '⬢', color: '#F3BA2F', explorer: 'https://bscscan.com' }
    };
    return chainMap[chainId as keyof typeof chainMap] || { name: 'Unknown', icon: '❓', color: '#666', explorer: '#' };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'payment': return <ArrowUpRight className="h-4 w-4 text-red-600" />;
      case 'refund': return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
      case 'withdrawal': return <ArrowUpRight className="h-4 w-4 text-blue-600" />;
      case 'deposit': return <ArrowDownLeft className="h-4 w-4 text-blue-600" />;
      default: return <ArrowUpRight className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const exportTransactions = () => {
    const csvContent = [
      ['Date', 'Chain', 'Type', 'Status', 'Amount', 'Token', 'USD Value', 'Hash', 'Order ID', 'Merchant'].join(','),
      ...filteredTransactions.map(tx => [
        new Date(tx.timestamp).toISOString(),
        getChainInfo(tx.chainId).name,
        tx.type,
        tx.status,
        tx.amount,
        tx.token,
        tx.usdValue.toFixed(2),
        tx.hash,
        tx.orderId || '',
        tx.merchantName || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vpay-transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const refreshTransactions = async () => {
    setLoading(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
  };

  if (!address) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Wallet Not Connected</h3>
          <p className="text-gray-600">Please connect your wallet to view transaction history</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Transaction History</h2>
          <p className="text-gray-600">Multi-chain payment transactions across all networks</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={refreshTransactions} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={exportTransactions} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {filteredTransactions.length}
            </div>
            <div className="text-sm text-gray-600">Total Transactions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              ${filteredTransactions.reduce((sum, tx) => sum + (tx.type === 'refund' ? tx.usdValue : 0), 0).toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">Total Received</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              ${filteredTransactions.reduce((sum, tx) => sum + (tx.type === 'payment' ? tx.usdValue : 0), 0).toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">Total Spent</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {filteredTransactions.filter(tx => tx.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-600">Pending</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by hash, order ID, merchant..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </Button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Chain</label>
                  <select
                    value={filters.chainId || ''}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      chainId: e.target.value ? parseInt(e.target.value) : undefined 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Chains</option>
                    {supportedChains.map(chain => (
                      <option key={chain.id} value={chain.id}>{chain.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Type</label>
                  <select
                    value={filters.type || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value || undefined }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Types</option>
                    <option value="payment">Payment</option>
                    <option value="refund">Refund</option>
                    <option value="withdrawal">Withdrawal</option>
                    <option value="deposit">Deposit</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Status</label>
                  <select
                    value={filters.status || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value || undefined }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Status</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Date Range</label>
                  <select
                    value={filters.dateRange || 'all'}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Time</option>
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="90d">Last 90 Days</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Actions</label>
                  <Button
                    onClick={() => setFilters({ dateRange: '30d' })}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction List */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions ({filteredTransactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Loading transactions...</span>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No transactions found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((tx) => {
                const chainInfo = getChainInfo(tx.chainId);
                
                return (
                  <div key={tx.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {/* Chain and Type Icons */}
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{chainInfo.icon}</span>
                          {getTypeIcon(tx.type)}
                        </div>

                        {/* Transaction Details */}
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium capitalize">{tx.type}</span>
                            {tx.merchantName && (
                              <>
                                <span className="text-gray-400">•</span>
                                <span className="text-gray-600">{tx.merchantName}</span>
                              </>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {tx.amount} {tx.token} on {chainInfo.name}
                          </div>
                          {tx.description && (
                            <div className="text-xs text-gray-500">{tx.description}</div>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold">${tx.usdValue.toFixed(2)}</span>
                          {getStatusIcon(tx.status)}
                        </div>
                        <div className="text-sm text-gray-600">{formatTimestamp(tx.timestamp)}</div>
                        {tx.orderId && (
                          <div className="text-xs text-gray-500">Order: {tx.orderId}</div>
                        )}
                      </div>
                    </div>

                    {/* Transaction Hash and Actions */}
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">Hash:</span>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                        </code>
                        {tx.blockNumber && (
                          <>
                            <span className="text-xs text-gray-500">Block:</span>
                            <span className="text-xs">{tx.blockNumber.toLocaleString()}</span>
                          </>
                        )}
                      </div>
                      
                      <Button
                        onClick={() => window.open(`${chainInfo.explorer}/tx/${tx.hash}`, '_blank')}
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View on Explorer
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MultiChainTransactionHistory;
