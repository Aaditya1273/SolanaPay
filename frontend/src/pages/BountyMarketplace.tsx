import React, { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { Plus, Search, Clock, DollarSign, User, CheckCircle, XCircle, Award, Filter } from 'lucide-react';
import { toast } from 'react-hot-toast';
import BountyService, { BountyData, SubmissionData } from '../services/bountyService';

const BountyMarketplace = () => {
  const { publicKey, connected } = useWallet();
  const [bounties, setBounties] = useState<BountyData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [bountyService] = useState(new BountyService());

  const [newBounty, setNewBounty] = useState({
    title: '',
    description: '',
    rewardAmount: '',
    deadline: '',
    category: 'Development',
    requiredSkills: '',
    maxParticipants: '5'
  });

  // Initialize bounty service
  useEffect(() => {
    if (connected && publicKey) {
      bountyService.initializeProgram({ publicKey });
    }
  }, [connected, publicKey, bountyService]);

  // Fetch bounties
  const fetchBounties = async () => {
    try {
      setLoading(true);
      const data = await bountyService.getAllBounties();
      setBounties(data);
    } catch (error) {
      console.error('Error fetching bounties:', error);
      toast.error('Failed to load bounties');
    } finally {
      setLoading(false);
    }
  };

  // Create new bounty
  const handleCreateBounty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      setLoading(true);
      
      const rewardMint = new PublicKey('So11111111111111111111111111111111111111112'); // SOL mint
      const deadline = new Date(newBounty.deadline);
      const skills = newBounty.requiredSkills.split(',').map(s => s.trim()).filter(s => s);

      await bountyService.createBounty(
        newBounty.title,
        newBounty.description,
        parseFloat(newBounty.rewardAmount) * 1e9, // Convert to lamports
        deadline,
        newBounty.category,
        skills,
        parseInt(newBounty.maxParticipants),
        rewardMint
      );

      // Reset form and refresh bounties
      setNewBounty({
        title: '',
        description: '',
        rewardAmount: '',
        deadline: '',
        category: 'Development',
        requiredSkills: '',
        maxParticipants: '5'
      });
      setShowCreateForm(false);
      await fetchBounties();
      toast.success('Bounty created successfully!');
    } catch (error) {
      console.error('Error creating bounty:', error);
      toast.error('Failed to create bounty');
    } finally {
      setLoading(false);
    }
  };

  // Submit work for bounty
  const handleSubmitWork = async (bountyPDA: PublicKey) => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    const submissionData = prompt('Enter your submission details:');
    if (!submissionData) return;

    try {
      const submissionHash = `0x${Math.random().toString(16).substr(2, 64)}`;
      await bountyService.submitWork(bountyPDA, submissionData, submissionHash);
      await fetchBounties();
      toast.success('Work submitted successfully!');
    } catch (error) {
      console.error('Error submitting work:', error);
      toast.error('Failed to submit work');
    }
  };

  // Filter bounties
  const filteredBounties = bounties.filter(bounty => {
    const matchesStatus = filter === 'all' || bounty.status.toLowerCase() === filter;
    const matchesCategory = categoryFilter === 'all' || bounty.category.toLowerCase() === categoryFilter.toLowerCase();
    const matchesSearch = bounty.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bounty.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesCategory && matchesSearch;
  });

  const formatAddress = (address: PublicKey) => {
    const str = address.toString();
    return `${str.slice(0, 6)}...${str.slice(-4)}`;
  };

  const formatReward = (amount: number) => {
    return (amount / 1e9).toFixed(2); // Convert from lamports to SOL
  };

  const formatDeadline = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    const colors = {
      open: 'bg-green-500/20 text-green-400',
      completed: 'bg-blue-500/20 text-blue-400',
      cancelled: 'bg-red-500/20 text-red-400',
      expired: 'bg-gray-500/20 text-gray-400'
    };
    return colors[status.toLowerCase() as keyof typeof colors] || colors.open;
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      development: 'bg-blue-500/20 text-blue-400',
      design: 'bg-purple-500/20 text-purple-400',
      marketing: 'bg-green-500/20 text-green-400',
      content: 'bg-yellow-500/20 text-yellow-400',
      research: 'bg-indigo-500/20 text-indigo-400',
      testing: 'bg-red-500/20 text-red-400',
      community: 'bg-pink-500/20 text-pink-400',
      other: 'bg-gray-500/20 text-gray-400'
    };
    return colors[category.toLowerCase() as keyof typeof colors] || colors.other;
  };

  useEffect(() => {
    fetchBounties();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Bounty Marketplace</h1>
            <p className="text-purple-200">Earn tokens by completing micro-tasks with NFT proof of completion</p>
          </div>
          <div className="flex items-center space-x-4">
            {connected ? (
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-2 rounded-xl font-semibold transition-all flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Bounty
              </button>
            ) : (
              <p className="text-purple-300">Connect wallet to create bounties</p>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search bounties..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-purple-900/30 border border-purple-500/30 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Filter */}
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-purple-400" />
                {['all', 'open', 'completed', 'cancelled'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilter(status)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                      filter === status
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-900/30 text-purple-200 hover:bg-purple-800/50'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-purple-900/30 border border-purple-500/30 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-400"
              >
                <option value="all">All Categories</option>
                <option value="development">Development</option>
                <option value="design">Design</option>
                <option value="marketing">Marketing</option>
                <option value="content">Content</option>
                <option value="research">Research</option>
                <option value="testing">Testing</option>
                <option value="community">Community</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bounties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-purple-200">Loading bounties...</p>
            </div>
          ) : filteredBounties.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Award className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <p className="text-purple-200 text-lg">No bounties found</p>
              <p className="text-purple-300 text-sm">Try adjusting your filters or create the first bounty!</p>
            </div>
          ) : (
            filteredBounties.map((bounty, index) => (
              <div key={index} className="bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-6 hover:border-purple-400/50 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-bold text-white line-clamp-2">{bounty.title}</h3>
                  <div className="flex flex-col items-end space-y-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(bounty.status)}`}>
                      {bounty.status}
                    </span>
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getCategoryColor(bounty.category)}`}>
                      {bounty.category}
                    </span>
                  </div>
                </div>
                
                <p className="text-purple-200 mb-4 line-clamp-3">{bounty.description}</p>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-purple-200">
                    <DollarSign className="w-4 h-4 mr-2" />
                    <span className="font-semibold text-white">{formatReward(bounty.reward_amount)} SOL</span>
                  </div>
                  <div className="flex items-center text-purple-200">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>Deadline: {formatDeadline(bounty.deadline)}</span>
                  </div>
                  <div className="flex items-center text-purple-200">
                    <User className="w-4 h-4 mr-2" />
                    <span>Creator: {formatAddress(bounty.creator)}</span>
                  </div>
                  <div className="flex items-center text-purple-200">
                    <User className="w-4 h-4 mr-2" />
                    <span>Participants: {bounty.current_participants}/{bounty.max_participants}</span>
                  </div>
                  {bounty.required_skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {bounty.required_skills.slice(0, 3).map((skill, skillIndex) => (
                        <span key={skillIndex} className="px-2 py-1 bg-purple-800/50 text-purple-200 text-xs rounded-lg">
                          {skill}
                        </span>
                      ))}
                      {bounty.required_skills.length > 3 && (
                        <span className="px-2 py-1 bg-purple-800/50 text-purple-200 text-xs rounded-lg">
                          +{bounty.required_skills.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  {bounty.status === 'Open' && connected && bounty.creator.toString() !== publicKey?.toString() && (
                    <button
                      onClick={() => handleSubmitWork(new PublicKey(bounty.creator))} // This would need the actual bounty PDA
                      className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-2 rounded-xl font-semibold transition-all flex items-center justify-center"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Submit Work
                    </button>
                  )}
                  
                  {bounty.status === 'Completed' && bounty.winner && (
                    <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-3">
                      <div className="flex items-center text-blue-400">
                        <Award className="w-4 h-4 mr-2" />
                        <span className="text-sm">Winner: {formatAddress(bounty.winner)}</span>
                      </div>
                      <p className="text-blue-300 text-xs mt-1">NFT proof of completion minted</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create Bounty Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-black/80 border border-purple-500/30 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-white mb-6">Create New Bounty</h2>
              
              <form onSubmit={handleCreateBounty} className="space-y-4">
                <div>
                  <label className="block text-purple-200 text-sm font-medium mb-2">Title</label>
                  <input
                    type="text"
                    value={newBounty.title}
                    onChange={(e) => setNewBounty({...newBounty, title: e.target.value})}
                    className="w-full bg-purple-900/30 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:border-purple-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-purple-200 text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={newBounty.description}
                    onChange={(e) => setNewBounty({...newBounty, description: e.target.value})}
                    rows={4}
                    className="w-full bg-purple-900/30 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:border-purple-400 resize-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-purple-200 text-sm font-medium mb-2">Reward (SOL)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={newBounty.rewardAmount}
                      onChange={(e) => setNewBounty({...newBounty, rewardAmount: e.target.value})}
                      className="w-full bg-purple-900/30 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:border-purple-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-purple-200 text-sm font-medium mb-2">Deadline</label>
                    <input
                      type="datetime-local"
                      value={newBounty.deadline}
                      onChange={(e) => setNewBounty({...newBounty, deadline: e.target.value})}
                      className="w-full bg-purple-900/30 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:border-purple-400"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-purple-200 text-sm font-medium mb-2">Category</label>
                    <select
                      value={newBounty.category}
                      onChange={(e) => setNewBounty({...newBounty, category: e.target.value})}
                      className="w-full bg-purple-900/30 border border-purple-500/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-400"
                    >
                      <option value="Development">Development</option>
                      <option value="Design">Design</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Content">Content</option>
                      <option value="Research">Research</option>
                      <option value="Testing">Testing</option>
                      <option value="Community">Community</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-purple-200 text-sm font-medium mb-2">Max Participants</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={newBounty.maxParticipants}
                      onChange={(e) => setNewBounty({...newBounty, maxParticipants: e.target.value})}
                      className="w-full bg-purple-900/30 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:border-purple-400"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-purple-200 text-sm font-medium mb-2">Required Skills (comma-separated)</label>
                  <input
                    type="text"
                    value={newBounty.requiredSkills}
                    onChange={(e) => setNewBounty({...newBounty, requiredSkills: e.target.value})}
                    placeholder="e.g., JavaScript, React, Solana"
                    className="w-full bg-purple-900/30 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:border-purple-400"
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
                    {loading ? 'Creating...' : 'Create Bounty'}
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

export default BountyMarketplace;
