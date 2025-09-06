import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Wallet, Send, ArrowUpRight, ArrowDownLeft, Copy, ExternalLink, RefreshCw } from 'lucide-react';

const WalletDashboard = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [balance, setBalance] = useState('0');
  const [ethBalance, setEthBalance] = useState('0');
  const [isConnected, setIsConnected] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sendForm, setSendForm] = useState({
    recipient: '',
    amount: '',
    message: ''
  });
  const [sendLoading, setSendLoading] = useState(false);

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
  const fetchBalances = async (address) => {
    try {
      setLoading(true);
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
  const fetchTransactions = async (address) => {
    try {
      const response = await fetch(`http://localhost:3001/api/transactions/${address}`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      // Mock data for demo
      setTransactions([
        {
          id: '1',
          type: 'send',
          amount: '50.0',
          to: '0x742d35Cc6634C0532925a3b8D0f3c4c8c3c5c8c8',
          timestamp: '2024-01-15T10:30:00Z',
          status: 'completed',
          hash: '0x123...abc'
        },
        {
          id: '2',
          type: 'receive',
          amount: '25.5',
          from: '0x123d35Cc6634C0532925a3b8D0f3c4c8c3c5c123',
          timestamp: '2024-01-14T15:45:00Z',
          status: 'completed',
          hash: '0x456...def'
        },
        {
          id: '3',
          type: 'send',
          amount: '10.0',
          to: '0x789d35Cc6634C0532925a3b8D0f3c4c8c3c5c789',
          timestamp: '2024-01-13T09:15:00Z',
          status: 'completed',
          hash: '0x789...ghi'
        }
      ]);
    }
  };

  // Send tokens
  const handleSendTokens = async (e) => {
    e.preventDefault();
    
    if (!sendForm.recipient || !sendForm.amount) {
      alert('Please fill in recipient and amount');
      return;
    }

    try {
      setSendLoading(true);
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
      alert('Transaction failed: ' + error.message);
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
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Format timestamp
  const formatTime = (timestamp) => {
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
        .then(accounts => {
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Wallet Dashboard</h1>
          <p className="text-purple-200">Manage your VPay tokens and transactions</p>
        </div>

        {!isConnected ? (
          /* Connect Wallet Card */
          <div className="bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-8 text-center">
            <Wallet className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
            <p className="text-purple-200 mb-6">Connect your wallet to view balance and send transactions</p>
            <button
              onClick={connectWallet}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105"
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Wallet Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Balance Card */}
              <div className="bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Wallet Balance</h2>
                  <button
                    onClick={() => fetchBalances(walletAddress)}
                    disabled={loading}
                    className="p-2 text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  {/* Wallet Address */}
                  <div className="flex items-center justify-between bg-purple-900/30 rounded-xl p-4">
                    <div>
                      <p className="text-purple-200 text-sm">Wallet Address</p>
                      <p className="text-white font-mono">{formatAddress(walletAddress)}</p>
                    </div>
                    <button
                      onClick={copyAddress}
                      className="p-2 text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Balances */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-purple-900/30 rounded-xl p-4">
                      <p className="text-purple-200 text-sm">VPay Tokens</p>
                      <p className="text-2xl font-bold text-white">{parseFloat(balance).toFixed(2)}</p>
                      <p className="text-purple-300 text-sm">VPAY</p>
                    </div>
                    <div className="bg-purple-900/30 rounded-xl p-4">
                      <p className="text-purple-200 text-sm">ETH Balance</p>
                      <p className="text-2xl font-bold text-white">{parseFloat(ethBalance).toFixed(4)}</p>
                      <p className="text-purple-300 text-sm">ETH</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Recent Transactions</h2>
                
                {transactions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-purple-200">No transactions yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="bg-purple-900/20 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-full ${
                            tx.type === 'send' 
                              ? 'bg-red-500/20 text-red-400' 
                              : 'bg-green-500/20 text-green-400'
                          }`}>
                            {tx.type === 'send' ? (
                              <ArrowUpRight className="w-4 h-4" />
                            ) : (
                              <ArrowDownLeft className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <p className="text-white font-semibold">
                              {tx.type === 'send' ? 'Sent' : 'Received'} {tx.amount} VPAY
                            </p>
                            <p className="text-purple-200 text-sm">
                              {tx.type === 'send' ? 'To' : 'From'}: {formatAddress(tx.to || tx.from)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-purple-200 text-sm">{formatTime(tx.timestamp)}</p>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              tx.status === 'completed' 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {tx.status}
                            </span>
                            {tx.hash && (
                              <button className="text-purple-400 hover:text-purple-300">
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Send Tokens Form */}
            <div className="space-y-6">
              <div className="bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                  <Send className="w-5 h-5 mr-2" />
                  Send Tokens
                </h2>
                
                <form onSubmit={handleSendTokens} className="space-y-4">
                  <div>
                    <label className="block text-purple-200 text-sm font-medium mb-2">
                      Recipient Address
                    </label>
                    <input
                      type="text"
                      value={sendForm.recipient}
                      onChange={(e) => setSendForm({...sendForm, recipient: e.target.value})}
                      placeholder="0x..."
                      className="w-full bg-purple-900/30 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:border-purple-400 transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-purple-200 text-sm font-medium mb-2">
                      Amount (VPAY)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={sendForm.amount}
                      onChange={(e) => setSendForm({...sendForm, amount: e.target.value})}
                      placeholder="0.00"
                      className="w-full bg-purple-900/30 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:border-purple-400 transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-purple-200 text-sm font-medium mb-2">
                      Message (Optional)
                    </label>
                    <textarea
                      value={sendForm.message}
                      onChange={(e) => setSendForm({...sendForm, message: e.target.value})}
                      placeholder="Add a note..."
                      rows="3"
                      className="w-full bg-purple-900/30 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:border-purple-400 transition-colors resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sendLoading || !sendForm.recipient || !sendForm.amount}
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-600 disabled:to-gray-700 text-white py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
                  >
                    {sendLoading ? 'Sending...' : 'Send Tokens'}
                  </button>
                </form>

                {/* Quick Actions */}
                <div className="mt-6 pt-6 border-t border-purple-500/20">
                  <h3 className="text-white font-semibold mb-3">Quick Actions</h3>
                  <div className="space-y-2">
                    <button className="w-full bg-purple-800/30 hover:bg-purple-800/50 text-purple-200 py-2 rounded-lg transition-colors">
                      Deposit ETH
                    </button>
                    <button className="w-full bg-purple-800/30 hover:bg-purple-800/50 text-purple-200 py-2 rounded-lg transition-colors">
                      Withdraw Tokens
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletDashboard;
