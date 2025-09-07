import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection } from '@solana/web3.js';
import { toast } from 'react-hot-toast';
import { 
  CommunityLeaderboardService, 
  UserProfile, 
  LeaderboardEntry, 
  UserRankInfo,
  UserTier,
  BadgeType,
  TransactionType,
  TaskType,
  TaskDifficulty
} from '../services/communityLeaderboardService';

const CommunityLeaderboard: React.FC = () => {
  const wallet = useWallet();
  const [leaderboardService] = useState(() => 
    new CommunityLeaderboardService(new Connection(process.env.REACT_APP_SOLANA_RPC_URL || 'https://api.devnet.solana.com'))
  );

  // State
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'profile' | 'register' | 'record'>('leaderboard');
  const [loading, setLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userRank, setUserRank] = useState<UserRankInfo | null>(null);

  // Form states
  const [username, setUsername] = useState('');
  const [solDomain, setSolDomain] = useState('');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionType, setTransactionType] = useState<TransactionType>(TransactionType.Payment);
  const [transactionHash, setTransactionHash] = useState('');
  const [taskType, setTaskType] = useState<TaskType>(TaskType.Survey);
  const [taskDifficulty, setTaskDifficulty] = useState<TaskDifficulty>(TaskDifficulty.Easy);
  const [rewardAmount, setRewardAmount] = useState('');
  const [taskId, setTaskId] = useState('');

  // Load data on wallet connection
  useEffect(() => {
    if (wallet.connected && wallet.publicKey) {
      loadUserData();
      loadLeaderboard();
    }
  }, [wallet.connected, wallet.publicKey]);

  const loadUserData = async () => {
    if (!wallet.publicKey) return;

    try {
      setLoading(true);
      const [profile, rank] = await Promise.all([
        leaderboardService.getUserProfile(wallet.publicKey),
        leaderboardService.getUserRank(wallet.publicKey)
      ]);
      
      setUserProfile(profile);
      setUserRank(rank);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const entries = await leaderboardService.getTopContributors(50);
      setLeaderboard(entries);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      toast.error('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet.connected) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      setLoading(true);
      const signature = await leaderboardService.registerUser(
        wallet,
        username,
        solDomain || undefined
      );
      
      toast.success(`User registered! Transaction: ${signature.slice(0, 8)}...`);
      await loadUserData();
      setActiveTab('profile');
    } catch (error) {
      console.error('Error registering user:', error);
      toast.error('Failed to register user');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet.connected) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      setLoading(true);
      const amount = parseFloat(transactionAmount) * 1000000000; // Convert to lamports
      const signature = await leaderboardService.recordTransaction(
        wallet,
        amount,
        transactionType,
        transactionHash
      );
      
      toast.success(`Transaction recorded! Signature: ${signature.slice(0, 8)}...`);
      await loadUserData();
      setTransactionAmount('');
      setTransactionHash('');
    } catch (error) {
      console.error('Error recording transaction:', error);
      toast.error('Failed to record transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet.connected) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      setLoading(true);
      const reward = parseFloat(rewardAmount) * 1000000000; // Convert to lamports
      const signature = await leaderboardService.recordTaskCompletion(
        wallet,
        taskType,
        taskDifficulty,
        reward,
        taskId
      );
      
      toast.success(`Task recorded! Signature: ${signature.slice(0, 8)}...`);
      await loadUserData();
      setRewardAmount('');
      setTaskId('');
    } catch (error) {
      console.error('Error recording task:', error);
      toast.error('Failed to record task');
    } finally {
      setLoading(false);
    }
  };

  const renderLeaderboard = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">🏆 Community Leaderboard</h2>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Badges
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stats
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaderboard.map((entry) => (
                  <tr key={entry.userProfile.owner.toString()} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`text-lg font-bold ${
                          entry.rank === 1 ? 'text-yellow-500' :
                          entry.rank === 2 ? 'text-gray-400' :
                          entry.rank === 3 ? 'text-yellow-600' :
                          'text-gray-600'
                        }`}>
                          #{entry.rank}
                        </span>
                        {entry.rank <= 3 && (
                          <span className="ml-2 text-xl">
                            {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold">
                            {entry.userProfile.username.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {entry.userProfile.username}
                          </div>
                          {entry.userProfile.solDomain && (
                            <div className="text-sm text-gray-500">
                              {entry.userProfile.solDomain}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {leaderboardService.formatScore(entry.score)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span 
                        className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white"
                        style={{ backgroundColor: leaderboardService.getTierColor(entry.tier) }}
                      >
                        {entry.tier}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-1">
                        {entry.badges.slice(0, 3).map((badge, index) => (
                          <span key={index} className="text-lg" title={badge}>
                            {leaderboardService.getBadgeIcon(badge)}
                          </span>
                        ))}
                        {entry.badges.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{entry.badges.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        {entry.userProfile.totalTransactions} txns
                      </div>
                      <div>
                        {entry.userProfile.tasksCompleted} tasks
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderProfile = () => {
    if (!userProfile) {
      return (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">👤 User Profile</h2>
          <p className="text-gray-600 mb-4">No profile found. Please register first.</p>
          <button
            onClick={() => setActiveTab('register')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Register Now
          </button>
        </div>
      );
    }

    const scoreBreakdown = leaderboardService.calculateScoreBreakdown(userProfile);

    return (
      <div className="space-y-6">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-xl">
              {userProfile.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{userProfile.username}</h2>
              {userProfile.solDomain && (
                <p className="text-gray-600">{userProfile.solDomain}</p>
              )}
              <div className="flex items-center space-x-2 mt-2">
                <span 
                  className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white"
                  style={{ backgroundColor: leaderboardService.getTierColor(userProfile.tier) }}
                >
                  {userProfile.tier}
                </span>
                {userRank && (
                  <span className="text-sm text-gray-600">
                    Rank #{userRank.estimatedRank}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-2xl font-bold text-blue-600">
              {leaderboardService.formatScore(userProfile.contributionScore)}
            </div>
            <div className="text-sm text-gray-600">Contribution Score</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-2xl font-bold text-green-600">
              {userProfile.totalTransactions}
            </div>
            <div className="text-sm text-gray-600">Total Transactions</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-2xl font-bold text-purple-600">
              {userProfile.tasksCompleted}
            </div>
            <div className="text-sm text-gray-600">Tasks Completed</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-2xl font-bold text-yellow-600">
              {leaderboardService.formatSOL(userProfile.rewardsEarned)}
            </div>
            <div className="text-sm text-gray-600">Rewards Earned</div>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Score Breakdown</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Transaction Points:</span>
              <span className="font-medium">{scoreBreakdown.transactionPoints}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Task Points:</span>
              <span className="font-medium">{scoreBreakdown.taskPoints}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Badge Bonus:</span>
              <span className="font-medium">{scoreBreakdown.badgeBonus}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tier Multiplier:</span>
              <span className="font-medium">{scoreBreakdown.tierMultiplier}x</span>
            </div>
            <hr />
            <div className="flex justify-between font-bold">
              <span>Total Score:</span>
              <span>{scoreBreakdown.total}</span>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🏅 Badges</h3>
          {userProfile.badges.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {userProfile.badges.map((badge, index) => (
                <div key={index} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                  <span className="text-2xl">{leaderboardService.getBadgeIcon(badge)}</span>
                  <div>
                    <div className="font-medium text-sm">{badge}</div>
                    <div className="text-xs text-gray-500">
                      {leaderboardService.getBadgeRequirements()[badge]}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No badges earned yet. Keep contributing!</p>
          )}
        </div>
      </div>
    );
  };

  const renderRegister = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">📝 Register for Leaderboard</h2>
      
      <form onSubmit={handleRegisterUser} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Username *
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your username"
            required
            maxLength={50}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            .sol Domain (Optional)
          </label>
          <input
            type="text"
            value={solDomain}
            onChange={(e) => setSolDomain(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="yourname.sol"
            maxLength={100}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !wallet.connected}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
    </div>
  );

  const renderRecord = () => (
    <div className="space-y-6">
      {/* Record Transaction */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">💰 Record Transaction</h3>
        
        <form onSubmit={handleRecordTransaction} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (SOL) *
              </label>
              <input
                type="number"
                step="0.001"
                value={transactionAmount}
                onChange={(e) => setTransactionAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.000"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction Type *
              </label>
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value as TransactionType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.values(TransactionType).map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction Hash *
            </label>
            <input
              type="text"
              value={transactionHash}
              onChange={(e) => setTransactionHash(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Transaction signature"
              required
              maxLength={100}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !wallet.connected}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Recording...' : 'Record Transaction'}
          </button>
        </form>
      </div>

      {/* Record Task */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">✅ Record Task Completion</h3>
        
        <form onSubmit={handleRecordTask} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task Type *
              </label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as TaskType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.values(TaskType).map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty *
              </label>
              <select
                value={taskDifficulty}
                onChange={(e) => setTaskDifficulty(e.target.value as TaskDifficulty)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.values(TaskDifficulty).map((difficulty) => (
                  <option key={difficulty} value={difficulty}>{difficulty}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reward Amount (SOL) *
              </label>
              <input
                type="number"
                step="0.001"
                value={rewardAmount}
                onChange={(e) => setRewardAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.000"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task ID *
              </label>
              <input
                type="text"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Task identifier"
                required
                maxLength={100}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !wallet.connected}
            className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Recording...' : 'Record Task'}
          </button>
        </form>
      </div>
    </div>
  );

  if (!wallet.connected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🏆 Community Leaderboard</h2>
          <p className="text-gray-600 mb-6">Connect your wallet to view the community leaderboard</p>
          <div className="text-4xl mb-4">🔗</div>
          <p className="text-sm text-gray-500">Please connect your Solana wallet to continue</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🏆 Community Leaderboard</h1>
          <p className="text-lg text-gray-600">
            Track contributions, earn rewards, and compete with the SolanaPay community
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-8">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {[
              { id: 'leaderboard', name: 'Leaderboard', icon: '🏆' },
              { id: 'profile', name: 'My Profile', icon: '👤' },
              { id: 'register', name: 'Register', icon: '📝' },
              { id: 'record', name: 'Record Activity', icon: '📊' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'leaderboard' && renderLeaderboard()}
        {activeTab === 'profile' && renderProfile()}
        {activeTab === 'register' && renderRegister()}
        {activeTab === 'record' && renderRecord()}
      </div>
    </div>
  );
};

export default CommunityLeaderboard;
