import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Wallet, Send, ArrowUpRight, ArrowDownLeft, Copy, ExternalLink, RefreshCw, Briefcase, Gift, TrendingUp, Users, Award, Zap } from 'lucide-react';
import '../types/ethereum';
// import WalletSelector from '../components/WalletSelector'; // Removed - causing wallet connection conflicts
import { walletService, WalletConnection } from '../services/walletService';

interface Transaction {
  id: string;
  type: 'send' | 'receive';
  amount: string;
  to?: string;
  from?: string;
  timestamp: string;
  status: 'completed' | 'pending';
  hash?: string;
}

interface SendForm {
  recipient: string;
  amount: string;
  message: string;
}

const WalletDashboardPage = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [balance, setBalance] = useState('0');
  const [ethBalance, setEthBalance] = useState('0');
  const [isConnected, setIsConnected] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [sendForm, setSendForm] = useState<SendForm>({
    recipient: '',
    amount: '',
    message: ''
  });
  const [sendLoading, setSendLoading] = useState(false);
  const [showSendForm, setShowSendForm] = useState(false);

  // Contract configuration
  const VPAY_PAYMENTS_ADDRESS = import.meta.env.REACT_APP_VPAY_PAYMENTS_ADDRESS || '';
  const PAYMENT_ABI = [
    "function deposit() external payable",
    "function transfer(address to, uint256 amount) external",
    "function withdraw(uint256 amount) external",
    "function balances(address user) external view returns (uint256)",
    "event Transfer(address indexed from, address indexed to, uint256 amount, uint256 fee)"
  ];

  // Connect wallet
  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        });
        
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setIsConnected(true);
          await fetchBalances(accounts[0]);
          await fetchTransactions(accounts[0]);
        }
      } else {
        alert('Please install MetaMask to use this feature');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  // Fetch balances
  const fetchBalances = async (address: string) => {
    try {
      setLoading(true);
      if (!window.ethereum) {
        throw new Error('Ethereum provider not found');
      }
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Get ETH balance
      const ethBal = await provider.getBalance(address);
      setEthBalance(ethers.formatEther(ethBal));
      
      // Get VPay token balance from contract
      if (VPAY_PAYMENTS_ADDRESS) {
        const contract = new ethers.Contract(VPAY_PAYMENTS_ADDRESS, PAYMENT_ABI, provider);
        const tokenBal = await contract.balances(address);
        setBalance(ethers.formatEther(tokenBal));
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch transactions from backend
  const fetchTransactions = async (address: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/transactions/${address}`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    }
  };

  // Send tokens
  const handleSendTokens = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sendForm.recipient || !sendForm.amount) {
      alert('Please fill in recipient and amount');
      return;
    }

    try {
      setSendLoading(true);
      if (!window.ethereum) {
        throw new Error('Ethereum provider not found');
      }
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      if (VPAY_PAYMENTS_ADDRESS) {
        const contract = new ethers.Contract(VPAY_PAYMENTS_ADDRESS, PAYMENT_ABI, signer);
        const amount = ethers.parseEther(sendForm.amount);
        
        const tx = await contract.transfer(sendForm.recipient, amount);
        await tx.wait();
        
        // Refresh balances and transactions
        await fetchBalances(walletAddress);
        await fetchTransactions(walletAddress);
        
        // Reset form
        setSendForm({ recipient: '', amount: '', message: '' });
        
        alert('Transaction sent successfully!');
      } else {
        alert('VPay Payments contract not configured');
      }
    } catch (error) {
      console.error('Error sending tokens:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      alert('Transaction failed: ' + errorMessage);
    } finally {
      setSendLoading(false);
    }
  };

  // Copy address to clipboard
  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    alert('Address copied to clipboard!');
  };

  // Format address for display
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    // Check if wallet is already connected
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
            setIsConnected(true);
            fetchBalances(accounts[0]);
            fetchTransactions(accounts[0]);
          }
        });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-purple-50/30 to-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Welcome to VPay, Aaditya123! 👋
              </h1>
              <p className="text-purple-100">Ready to earn, spend, and grow in the VPay ecosystem?</p>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-3">
                <div className="flex items-center space-x-2">
                  <Wallet className="w-5 h-5 text-white" />
                  <div>
                    <p className="text-xs text-purple-200">Total Balance</p>
                    <p className="text-lg font-bold text-white">{parseFloat(balance).toFixed(2)} VRC</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-4">

        {!isConnected ? (
          /* Connect Your Wallet Section */
          <div className="bg-white rounded-3xl shadow-xl border border-purple-100 p-8 mb-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-purple-700 rounded-full flex items-center justify-center mx-auto mb-6">
                <Wallet className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Connect Your Wallet</h2>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">Connect your wallet to start sending payments and earning rewards in the VPay ecosystem.</p>
              <button
                onClick={connectWallet}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/25 hover:-translate-y-1"
              >
                Connect Wallet
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats Overview - PhonePe Style */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Wallet Balance */}
              <div className="bg-white rounded-3xl shadow-lg border border-purple-100 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-white" />
                  </div>
                  <button
                    onClick={() => fetchBalances(walletAddress)}
                    disabled={loading}
                    className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Wallet Balance</h3>
                <p className="text-2xl font-bold text-gray-900">{parseFloat(balance).toFixed(2)} VRC</p>
                <p className="text-xs text-green-600 font-medium">Connected</p>
              </div>

              {/* Active Tasks */}
              <div className="bg-white rounded-3xl shadow-lg border border-purple-100 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Active Tasks</h3>
                <p className="text-2xl font-bold text-gray-900">3</p>
                <p className="text-xs text-blue-600 font-medium">2 in progress, 1 pending</p>
              </div>

              {/* Reward Points */}
              <div className="bg-white rounded-3xl shadow-lg border border-purple-100 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mb-4">
                  <Gift className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Reward Points</h3>
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-xs text-amber-600 font-medium">Bronze tier</p>
              </div>

              {/* Total Earned */}
              <div className="bg-white rounded-3xl shadow-lg border border-purple-100 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Total Earned</h3>
                <p className="text-2xl font-bold text-gray-900">0.00 VRC</p>
                <p className="text-xs text-green-600 font-medium">All-time earnings</p>
              </div>
            </div>

            {/* Quick Actions - PhonePe Style */}
            <div className="bg-white rounded-3xl shadow-lg border border-purple-100 p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <button 
                  onClick={() => setShowSendForm(true)}
                  className="group bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white p-8 rounded-3xl transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/25 hover:-translate-y-2"
                >
                  <Send className="w-10 h-10 mx-auto mb-4" />
                  <span className="block text-sm font-semibold">Send Payment</span>
                </button>
                <button className="group bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white p-8 rounded-3xl transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/25 hover:-translate-y-2">
                  <Briefcase className="w-10 h-10 mx-auto mb-4" />
                  <span className="block text-sm font-semibold">Browse Tasks</span>
                </button>
                <button className="group bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white p-8 rounded-3xl transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/25 hover:-translate-y-2">
                  <Gift className="w-10 h-10 mx-auto mb-4" />
                  <span className="block text-sm font-semibold">View Rewards</span>
                </button>
                <button className="group bg-gradient-to-br from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white p-8 rounded-3xl transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/25 hover:-translate-y-2">
                  <TrendingUp className="w-10 h-10 mx-auto mb-4" />
                  <span className="block text-sm font-semibold">Analytics</span>
                </button>
              </div>
            </div>

            {/* Send Payment Modal */}
            {showSendForm && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl border border-purple-100 p-8 w-full max-w-md">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Send Payment</h2>
                    <button
                      onClick={() => setShowSendForm(false)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <form onSubmit={handleSendTokens} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Recipient Address
                      </label>
                      <input
                        type="text"
                        value={sendForm.recipient}
                        onChange={(e) => setSendForm({...sendForm, recipient: e.target.value})}
                        placeholder="0x..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount (VPAY)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={sendForm.amount}
                        onChange={(e) => setSendForm({...sendForm, amount: e.target.value})}
                        placeholder="0.00"
                        className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Message (Optional)
                      </label>
                      <textarea
                        value={sendForm.message}
                        onChange={(e) => setSendForm({...sendForm, message: e.target.value})}
                        placeholder="Add a note..."
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                      />
                    </div>
                    
                    <div className="flex space-x-4">
                      <button
                        type="button"
                        onClick={() => setShowSendForm(false)}
                        className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-2xl font-semibold hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={sendLoading}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-3 rounded-2xl font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sendLoading ? 'Sending...' : 'Send Payment'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Wallet Details & Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Wallet Info */}
              <div className="bg-white rounded-3xl shadow-lg border border-purple-100 p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Wallet Details</h2>
                
                {/* Wallet Address */}
                <div className="bg-purple-50 rounded-2xl p-6 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Wallet Address</p>
                      <p className="text-lg font-mono text-gray-900">{formatAddress(walletAddress)}</p>
                    </div>
                    <button
                      onClick={copyAddress}
                      className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl transition-colors"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Detailed Balances */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-200 text-sm">VPay Tokens</p>
                        <p className="text-3xl font-bold">{parseFloat(balance).toFixed(2)}</p>
                        <p className="text-purple-300 text-sm">VPAY</p>
                      </div>
                      <Wallet className="w-12 h-12 text-purple-200" />
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-200 text-sm">ETH Balance</p>
                        <p className="text-3xl font-bold">{parseFloat(ethBalance).toFixed(4)}</p>
                        <p className="text-blue-300 text-sm">ETH</p>
                      </div>
                      <Zap className="w-12 h-12 text-blue-200" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="bg-white rounded-3xl shadow-lg border border-purple-100 p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Transactions</h2>
                
                {transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ArrowUpRight className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium">No transactions yet</p>
                    <p className="text-gray-400 text-sm">Your transaction history will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="bg-gray-50 rounded-2xl p-6 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                              tx.type === 'send' 
                                ? 'bg-red-100 text-red-600' 
                                : 'bg-green-100 text-green-600'
                            }`}>
                              {tx.type === 'send' ? (
                                <ArrowUpRight className="w-6 h-6" />
                              ) : (
                                <ArrowDownLeft className="w-6 h-6" />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">
                                {tx.type === 'send' ? 'Sent' : 'Received'} {tx.amount} VPAY
                              </p>
                              <p className="text-gray-500 text-sm">
                                {tx.type === 'send' ? 'To' : 'From'}: {formatAddress(tx.to || tx.from || '')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-gray-500 text-sm">{formatTime(tx.timestamp)}</p>
                            <div className="flex items-center justify-end space-x-2 mt-1">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                tx.status === 'completed' 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {tx.status}
                              </span>
                              {tx.hash && (
                                <button className="p-1 text-gray-400 hover:text-purple-600 transition-colors">
                                  <ExternalLink className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletDashboardPage;
