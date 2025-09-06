import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Plus, Search, Clock, DollarSign, User, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Task interface
interface Task {
  id: string;
  title: string;
  description: string;
  amount: number;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  creator: string;
  worker: string | null;
  category: string;
  createdAt: string;
  escrowId: number;
}

const TaskMarketplace = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    amount: '',
    deadline: '',
    category: 'development'
  });

  // Contract configuration
  const ESCROW_ADDRESS = import.meta.env.REACT_APP_SolanaPay_ESCROW_ADDRESS || '';
  const ESCROW_ABI = [
    "function createEscrow(address buyer, address seller, uint256 amount, string memory description) external returns (uint256)",
    "function completeEscrow(uint256 escrowId) external",
    "function cancelEscrow(uint256 escrowId) external",
    "function getEscrow(uint256 escrowId) external view returns (tuple(address buyer, address seller, uint256 amount, string description, uint8 status))",
    "event EscrowCreated(uint256 indexed escrowId, address indexed buyer, address indexed seller, uint256 amount)"
  ];

  // Connect wallet
  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setIsConnected(true);
        }
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  // Fetch tasks from backend
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/tasks');
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // Create new task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      setLoading(true);
      
      // Create task in backend
      const response = await fetch('http://localhost:3001/api/tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTask.title,
          description: newTask.description,
          reward: newTask.amount,
          creator: walletAddress
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Create escrow on blockchain
        if (ESCROW_ADDRESS && window.ethereum) {
          try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer);
            
            const amount = ethers.parseEther(newTask.amount);
            const tx = await contract.createEscrow(
              ethers.ZeroAddress, // buyer (will be set when assigned)
              walletAddress, // seller (task creator)
              amount,
              newTask.description
            );
            await tx.wait();
          } catch (error) {
            console.error('Failed to create blockchain escrow:', error);
            toast.error('Task created but blockchain escrow failed');
          }
        }

        // Reset form and refresh tasks
        setNewTask({ title: '', description: '', amount: '', deadline: '', category: 'development' });
        setShowCreateForm(false);
        await fetchTasks();
        alert('Task created successfully!');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      alert('Failed to create task: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Assign task to worker
  const handleAssignTask = async (taskId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/tasks/${taskId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignee: walletAddress })
      });

      if (response.ok) {
        await fetchTasks();
        alert('Task assigned successfully!');
      }
    } catch (error) {
      console.error('Error assigning task:', error);
    }
  };

  // Complete task
  const handleCompleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        await fetchTasks();
        alert('Task completed successfully!');
      }
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  // Release escrow funds
  const handleReleaseFunds = async (task: Task) => {
    try {
      if (!window.ethereum) {
        toast.error('Please install MetaMask to release funds');
        return;
      }
      
      if (ESCROW_ADDRESS && task.escrowId) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer);
        
        const tx = await contract.completeEscrow(task.escrowId);
        await tx.wait();
        
        await fetchTasks();
        toast.success('Funds released successfully!');
      }
    } catch (error) {
      console.error('Error releasing funds:', error);
    }
  };

  // Cancel task
  const handleCancelTask = async (task: Task) => {
    try {
      if (ESCROW_ADDRESS && task.escrowId && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer);
        
        const tx = await contract.cancelEscrow(task.escrowId);
        await tx.wait();
        
        await fetchTasks();
        toast.success('Task cancelled successfully!');
      } else if (!window.ethereum) {
        toast.error('Please install MetaMask to cancel tasks');
      }
    } catch (error) {
      console.error('Error cancelling task:', error);
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesFilter = filter === 'all' || task.status === filter;
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-500/20 text-green-400';
      case 'in_progress': return 'bg-yellow-500/20 text-yellow-400';
      case 'completed': return 'bg-blue-500/20 text-blue-400';
      case 'cancelled': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  useEffect(() => {
    // Check wallet connection
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.request({ method: 'eth_accounts' })
        .then(accounts => {
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
            setIsConnected(true);
          }
        });
    }
    fetchTasks();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Task Marketplace</h1>
            <p className="text-purple-200">Find work or hire talent in the SolanaPay ecosystem</p>
          </div>
          <div className="flex items-center space-x-4">
            {!isConnected ? (
              <button
                onClick={connectWallet}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-2 rounded-xl font-semibold transition-all"
              >
                Connect Wallet
              </button>
            ) : (
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-2 rounded-xl font-semibold transition-all flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Post Task
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-purple-900/30 border border-purple-500/30 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {['all', 'open', 'in_progress', 'completed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all ${
                    filter === status
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-900/30 text-purple-200 hover:bg-purple-800/50'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tasks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-purple-200">Loading tasks...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-purple-200">No tasks found</p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div key={task.id} className="bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">{task.title}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                </div>
                
                <p className="text-purple-200 mb-4 line-clamp-3">{task.description}</p>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-purple-200">
                    <DollarSign className="w-4 h-4 mr-2" />
                    <span className="font-semibold text-white">{task.amount} SolanaPay</span>
                  </div>
                  <div className="flex items-center text-purple-200">
                    <User className="w-4 h-4 mr-2" />
                    <span>Creator: {formatAddress(task.creator)}</span>
                  </div>
                  {task.worker && (
                    <div className="flex items-center text-purple-200">
                      <User className="w-4 h-4 mr-2" />
                      <span>Worker: {formatAddress(task.worker)}</span>
                    </div>
                  )}
                  <div className="flex items-center text-purple-200">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  {task.status === 'open' && isConnected && task.creator !== walletAddress && (
                    <button
                      onClick={() => handleAssignTask(task.id)}
                      className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-2 rounded-xl font-semibold transition-all"
                    >
                      Apply for Task
                    </button>
                  )}
                  
                  {task.status === 'in_progress' && task.worker === walletAddress && (
                    <button
                      onClick={() => handleCompleteTask(task.id)}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-2 rounded-xl font-semibold transition-all flex items-center justify-center"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark Complete
                    </button>
                  )}
                  
                  {task.status === 'completed' && task.creator === walletAddress && (
                    <div className="space-y-2">
                      <button
                        onClick={() => handleReleaseFunds(task)}
                        className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-2 rounded-xl font-semibold transition-all flex items-center justify-center"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Release Funds
                      </button>
                    </div>
                  )}
                  
                  {(task.status === 'open' || task.status === 'in_progress') && task.creator === walletAddress && (
                    <button
                      onClick={() => handleCancelTask(task)}
                      className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-2 rounded-xl font-semibold transition-all flex items-center justify-center"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancel Task
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create Task Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-black/80 border border-purple-500/30 rounded-2xl p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold text-white mb-6">Create New Task</h2>
              
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="block text-purple-200 text-sm font-medium mb-2">Title</label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                    className="w-full bg-purple-900/30 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:border-purple-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-purple-200 text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                    rows={4}
                    className="w-full bg-purple-900/30 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:border-purple-400 resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-purple-200 text-sm font-medium mb-2">Reward (SolanaPay)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newTask.amount}
                    onChange={(e) => setNewTask({...newTask, amount: e.target.value})}
                    className="w-full bg-purple-900/30 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:border-purple-400"
                    required
                  />
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-xl font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-600 disabled:to-gray-700 text-white py-3 rounded-xl font-semibold transition-all"
                  >
                    {loading ? 'Creating...' : 'Create Task'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskMarketplace;
