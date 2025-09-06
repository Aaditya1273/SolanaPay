import React, { useState, useEffect } from 'react';
import { useAccountAbstraction } from '../../contexts/AccountAbstractionContext';
import { useMultiChainWallet } from '../../contexts/MultiChainWalletContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Fuel, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Settings,
  Plus,
  Minus,
  Info
} from 'lucide-react';

interface GasSponsorshipSettings {
  enabled: boolean;
  gasLimit: number;
  dailyLimit: number;
  allowedTokens: string[];
  autoTopUp: boolean;
  minimumBalance: number;
  notificationThreshold: number;
}

interface GasUsageStats {
  todaySpent: number;
  weeklySpent: number;
  monthlySpent: number;
  totalTransactions: number;
  averageGasPerTx: number;
  savingsGenerated: number;
}

const GasSponsorshipConfig: React.FC = () => {
  const { 
    paymasterConfig, 
    isAccountAbstractionSupported,
    checkGasSponsorship 
  } = useAccountAbstraction();
  const { address, currentChain } = useMultiChainWallet();

  const [settings, setSettings] = useState<GasSponsorshipSettings>({
    enabled: false,
    gasLimit: 500000,
    dailyLimit: 10000000,
    allowedTokens: ['USDC', 'USDT', 'DAI'],
    autoTopUp: true,
    minimumBalance: 0.1,
    notificationThreshold: 0.05
  });

  const [gasStats, setGasStats] = useState<GasUsageStats>({
    todaySpent: 0.025,
    weeklySpent: 0.18,
    monthlySpent: 0.72,
    totalTransactions: 156,
    averageGasPerTx: 0.0046,
    savingsGenerated: 2.34
  });

  const [depositAmount, setDepositAmount] = useState<string>('1.0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock merchant deposit balance
  const [merchantBalance, setMerchantBalance] = useState(2.5);

  const updateSetting = <K extends keyof GasSponsorshipSettings>(
    key: K, 
    value: GasSponsorshipSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const toggleToken = (token: string) => {
    const allowedTokens = settings.allowedTokens.includes(token)
      ? settings.allowedTokens.filter(t => t !== token)
      : [...settings.allowedTokens, token];
    updateSetting('allowedTokens', allowedTokens);
  };

  const addDeposit = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate deposit transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const amount = parseFloat(depositAmount);
      setMerchantBalance(prev => prev + amount);
      setDepositAmount('1.0');
    } catch (err) {
      setError('Failed to add deposit');
    } finally {
      setLoading(false);
    }
  };

  const withdrawDeposit = async (amount: number) => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate withdrawal transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (merchantBalance - amount >= settings.minimumBalance) {
        setMerchantBalance(prev => prev - amount);
      } else {
        throw new Error('Insufficient balance for withdrawal');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to withdraw');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call to save settings
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In production, this would call the paymaster contract
      console.log('Saving gas sponsorship settings:', settings);
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const getBalanceStatus = () => {
    if (merchantBalance < settings.notificationThreshold) {
      return { color: 'red', text: 'Critical', icon: AlertTriangle };
    }
    if (merchantBalance < settings.minimumBalance) {
      return { color: 'yellow', text: 'Low', icon: AlertTriangle };
    }
    return { color: 'green', text: 'Good', icon: CheckCircle };
  };

  const getDailyUsagePercentage = () => {
    if (!paymasterConfig) return 0;
    return (paymasterConfig.dailySpent / paymasterConfig.dailyLimit) * 100;
  };

  const formatEther = (value: number) => {
    return value.toFixed(4);
  };

  const formatGwei = (value: number) => {
    return (value * 1e9).toFixed(0);
  };

  if (!isAccountAbstractionSupported) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Account Abstraction Not Supported</h3>
          <p className="text-gray-600">
            Gas sponsorship is only available on supported networks. 
            Please switch to Ethereum, Polygon, or BSC.
          </p>
        </CardContent>
      </Card>
    );
  }

  const balanceStatus = getBalanceStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gas Sponsorship Configuration</h2>
          <p className="text-gray-600">Manage gasless transactions for your customers</p>
        </div>
        <Button onClick={saveSettings} disabled={loading}>
          <Settings className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Fuel className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatEther(merchantBalance)} ETH
                </div>
                <div className="text-sm text-gray-600">Available Balance</div>
                <div className="flex items-center space-x-1 mt-1">
                  {React.createElement(balanceStatus.icon, { 
                    className: `h-3 w-3 text-${balanceStatus.color}-600` 
                  })}
                  <span className={`text-xs text-${balanceStatus.color}-600`}>
                    {balanceStatus.text}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {gasStats.totalTransactions}
                </div>
                <div className="text-sm text-gray-600">Sponsored Transactions</div>
                <div className="text-xs text-gray-500 mt-1">
                  Avg: {formatEther(gasStats.averageGasPerTx)} ETH
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  ${gasStats.savingsGenerated.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Customer Savings</div>
                <div className="text-xs text-gray-500 mt-1">This month</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <Fuel className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {getDailyUsagePercentage().toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Daily Limit Used</div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatGwei(gasStats.todaySpent)} gwei spent
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Gas Sponsorship Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Enable Gas Sponsorship</div>
              <div className="text-sm text-gray-600">
                Allow customers to make gasless transactions
              </div>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(enabled) => updateSetting('enabled', enabled)}
            />
          </div>

          {settings.enabled && (
            <>
              {/* Gas Limits */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Gas Limit per Transaction
                  </label>
                  <input
                    type="number"
                    value={settings.gasLimit}
                    onChange={(e) => updateSetting('gasLimit', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="500000"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum gas units to sponsor per transaction
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Daily Gas Limit
                  </label>
                  <input
                    type="number"
                    value={settings.dailyLimit}
                    onChange={(e) => updateSetting('dailyLimit', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="10000000"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum gas units to sponsor per day
                  </p>
                </div>
              </div>

              {/* Allowed Tokens */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Allowed Payment Tokens
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['USDC', 'USDT', 'DAI', 'BUSD'].map(token => (
                    <button
                      key={token}
                      onClick={() => toggleToken(token)}
                      className={`p-2 rounded-lg border text-sm font-medium transition-colors ${
                        settings.allowedTokens.includes(token)
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {token}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Customers can use gasless payments when paying with these tokens
                </p>
              </div>

              {/* Auto Top-up */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Auto Top-up</div>
                  <div className="text-sm text-gray-600">
                    Automatically add funds when balance is low
                  </div>
                </div>
                <Switch
                  checked={settings.autoTopUp}
                  onCheckedChange={(autoTopUp) => updateSetting('autoTopUp', autoTopUp)}
                />
              </div>

              {/* Balance Thresholds */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Minimum Balance (ETH)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={settings.minimumBalance}
                    onChange={(e) => updateSetting('minimumBalance', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Notification Threshold (ETH)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={settings.notificationThreshold}
                    onChange={(e) => updateSetting('notificationThreshold', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.05"
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Deposit Management */}
      <Card>
        <CardHeader>
          <CardTitle>Deposit Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium">Current Balance</div>
              <div className="text-2xl font-bold text-blue-600">
                {formatEther(merchantBalance)} ETH
              </div>
              <div className="text-sm text-gray-600">
                ≈ ${(merchantBalance * 2000).toFixed(2)} USD
              </div>
            </div>
            <div className="flex items-center space-x-1">
              {React.createElement(balanceStatus.icon, { 
                className: `h-5 w-5 text-${balanceStatus.color}-600` 
              })}
              <Badge variant={balanceStatus.color === 'green' ? 'default' : 'destructive'}>
                {balanceStatus.text}
              </Badge>
            </div>
          </div>

          {/* Add Deposit */}
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Deposit Amount (ETH)
              </label>
              <input
                type="number"
                step="0.1"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="1.0"
              />
            </div>
            <Button 
              onClick={addDeposit} 
              disabled={loading || !depositAmount}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Deposit</span>
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="flex space-x-2">
            <Button
              onClick={() => withdrawDeposit(0.5)}
              disabled={loading || merchantBalance < 0.5}
              variant="outline"
              size="sm"
            >
              <Minus className="h-4 w-4 mr-1" />
              Withdraw 0.5 ETH
            </Button>
            <Button
              onClick={() => withdrawDeposit(1.0)}
              disabled={loading || merchantBalance < 1.0}
              variant="outline"
              size="sm"
            >
              <Minus className="h-4 w-4 mr-1" />
              Withdraw 1.0 ETH
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-gray-600 mb-1">Today</div>
              <div className="text-lg font-semibold">{formatEther(gasStats.todaySpent)} ETH</div>
              <div className="text-xs text-gray-500">Gas sponsored</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">This Week</div>
              <div className="text-lg font-semibold">{formatEther(gasStats.weeklySpent)} ETH</div>
              <div className="text-xs text-gray-500">Gas sponsored</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">This Month</div>
              <div className="text-lg font-semibold">{formatEther(gasStats.monthlySpent)} ETH</div>
              <div className="text-xs text-gray-500">Gas sponsored</div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center space-x-2 text-blue-600">
              <Info className="h-4 w-4" />
              <span className="text-sm font-medium">Gas Sponsorship Benefits</span>
            </div>
            <ul className="text-sm text-gray-600 mt-2 space-y-1">
              <li>• Improved customer experience with gasless transactions</li>
              <li>• Increased conversion rates and customer retention</li>
              <li>• Competitive advantage over traditional payment methods</li>
              <li>• Simplified onboarding for Web3 newcomers</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GasSponsorshipConfig;
