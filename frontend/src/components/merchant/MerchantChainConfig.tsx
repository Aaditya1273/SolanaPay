import React, { useState, useEffect } from 'react';
import { useMultiChainWallet } from '../../contexts/MultiChainWalletContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Settings, Check, AlertCircle, DollarSign, Percent } from 'lucide-react';

interface ChainConfig {
  chainId: number;
  enabled: boolean;
  acceptedTokens: string[];
  customFeePercent?: number;
  minAmount?: number;
  maxAmount?: number;
  autoConvert?: boolean;
  preferredStablecoin?: string;
}

interface MerchantSettings {
  merchantId: string;
  businessName: string;
  chainConfigs: Record<number, ChainConfig>;
  globalSettings: {
    defaultFeePercent: number;
    autoSettlement: boolean;
    settlementCurrency: string;
    webhookUrl?: string;
  };
}

const MerchantChainConfig: React.FC = () => {
  const { supportedChains } = useMultiChainWallet();
  const [settings, setSettings] = useState<MerchantSettings>({
    merchantId: 'merchant_123',
    businessName: 'Demo Merchant',
    chainConfigs: {
      1: { // Ethereum
        chainId: 1,
        enabled: true,
        acceptedTokens: ['ETH', 'USDC', 'USDT', 'DAI'],
        customFeePercent: 2.5,
        minAmount: 10,
        maxAmount: 10000,
        autoConvert: true,
        preferredStablecoin: 'USDC'
      },
      137: { // Polygon
        chainId: 137,
        enabled: true,
        acceptedTokens: ['MATIC', 'USDC', 'USDT', 'DAI'],
        customFeePercent: 2.0,
        minAmount: 1,
        maxAmount: 50000,
        autoConvert: true,
        preferredStablecoin: 'USDC'
      },
      56: { // BSC
        chainId: 56,
        enabled: false,
        acceptedTokens: ['BNB', 'USDC', 'USDT', 'BUSD'],
        customFeePercent: 2.2,
        minAmount: 5,
        maxAmount: 25000,
        autoConvert: false,
        preferredStablecoin: 'USDT'
      }
    },
    globalSettings: {
      defaultFeePercent: 2.5,
      autoSettlement: true,
      settlementCurrency: 'USD',
      webhookUrl: 'https://api.merchant.com/webhooks/SolanaPay'
    }
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const chainMetadata = {
    1: { name: 'Ethereum', icon: '⟠', color: '#627EEA', tokens: ['ETH', 'USDC', 'USDT', 'DAI'] },
    137: { name: 'Polygon', icon: '⬟', color: '#8247E5', tokens: ['MATIC', 'USDC', 'USDT', 'DAI'] },
    56: { name: 'BSC', icon: '⬢', color: '#F3BA2F', tokens: ['BNB', 'USDC', 'USDT', 'BUSD'] }
  };

  const updateChainConfig = (chainId: number, updates: Partial<ChainConfig>) => {
    setSettings(prev => ({
      ...prev,
      chainConfigs: {
        ...prev.chainConfigs,
        [chainId]: {
          ...prev.chainConfigs[chainId],
          ...updates
        }
      }
    }));
  };

  const updateGlobalSettings = (updates: Partial<MerchantSettings['globalSettings']>) => {
    setSettings(prev => ({
      ...prev,
      globalSettings: {
        ...prev.globalSettings,
        ...updates
      }
    }));
  };

  const toggleToken = (chainId: number, token: string) => {
    const config = settings.chainConfigs[chainId];
    const acceptedTokens = config.acceptedTokens.includes(token)
      ? config.acceptedTokens.filter(t => t !== token)
      : [...config.acceptedTokens, token];
    
    updateChainConfig(chainId, { acceptedTokens });
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const getEnabledChainsCount = () => {
    return Object.values(settings.chainConfigs).filter(config => config.enabled).length;
  };

  const getTotalTokensCount = () => {
    return Object.values(settings.chainConfigs)
      .filter(config => config.enabled)
      .reduce((total, config) => total + config.acceptedTokens.length, 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Multi-Chain Configuration</h2>
          <p className="text-gray-600">Configure supported chains and payment methods for your business</p>
        </div>
        <Button 
          onClick={saveSettings} 
          disabled={saving}
          className="flex items-center space-x-2"
        >
          {saved ? <Check className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
          <span>{saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}</span>
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Settings className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{getEnabledChainsCount()}</div>
                <div className="text-sm text-gray-600">Active Chains</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{getTotalTokensCount()}</div>
                <div className="text-sm text-gray-600">Accepted Tokens</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Percent className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{settings.globalSettings.defaultFeePercent}%</div>
                <div className="text-sm text-gray-600">Default Fee</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chain Configurations */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Chain Settings</h3>
        
        {Object.entries(settings.chainConfigs).map(([chainIdStr, config]) => {
          const chainId = parseInt(chainIdStr);
          const metadata = chainMetadata[chainId as keyof typeof chainMetadata];
          
          return (
            <Card key={chainId} className={`border-l-4 ${config.enabled ? 'border-l-green-500' : 'border-l-gray-300'}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{metadata.icon}</span>
                    <div>
                      <CardTitle className="text-lg">{metadata.name}</CardTitle>
                      <p className="text-sm text-gray-600">Chain ID: {chainId}</p>
                    </div>
                  </div>
                  <Switch
                    checked={config.enabled}
                    onCheckedChange={(enabled) => updateChainConfig(chainId, { enabled })}
                  />
                </div>
              </CardHeader>

              {config.enabled && (
                <CardContent className="space-y-6">
                  {/* Accepted Tokens */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      Accepted Tokens
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {metadata.tokens.map(token => (
                        <button
                          key={token}
                          onClick={() => toggleToken(chainId, token)}
                          className={`p-2 rounded-lg border text-sm font-medium transition-colors ${
                            config.acceptedTokens.includes(token)
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {token}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Fee and Limits */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">
                        Custom Fee (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        value={config.customFeePercent}
                        onChange={(e) => updateChainConfig(chainId, { 
                          customFeePercent: parseFloat(e.target.value) 
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">
                        Min Amount ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={config.minAmount}
                        onChange={(e) => updateChainConfig(chainId, { 
                          minAmount: parseFloat(e.target.value) 
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">
                        Max Amount ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={config.maxAmount}
                        onChange={(e) => updateChainConfig(chainId, { 
                          maxAmount: parseFloat(e.target.value) 
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Advanced Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-700">Auto-convert to stablecoin</div>
                        <div className="text-xs text-gray-500">Automatically convert volatile tokens to stablecoins</div>
                      </div>
                      <Switch
                        checked={config.autoConvert}
                        onCheckedChange={(autoConvert) => updateChainConfig(chainId, { autoConvert })}
                      />
                    </div>

                    {config.autoConvert && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">
                          Preferred Stablecoin
                        </label>
                        <select
                          value={config.preferredStablecoin}
                          onChange={(e) => updateChainConfig(chainId, { 
                            preferredStablecoin: e.target.value 
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {metadata.tokens.filter(token => 
                            ['USDC', 'USDT', 'DAI', 'BUSD'].includes(token)
                          ).map(token => (
                            <option key={token} value={token}>{token}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Global Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Global Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Default Fee Percentage
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={settings.globalSettings.defaultFeePercent}
                onChange={(e) => updateGlobalSettings({ 
                  defaultFeePercent: parseFloat(e.target.value) 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Settlement Currency
              </label>
              <select
                value={settings.globalSettings.settlementCurrency}
                onChange={(e) => updateGlobalSettings({ 
                  settlementCurrency: e.target.value 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="JPY">JPY</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-700">Auto Settlement</div>
              <div className="text-xs text-gray-500">Automatically settle payments to your bank account</div>
            </div>
            <Switch
              checked={settings.globalSettings.autoSettlement}
              onCheckedChange={(autoSettlement) => updateGlobalSettings({ autoSettlement })}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Webhook URL (Optional)
            </label>
            <input
              type="url"
              value={settings.globalSettings.webhookUrl}
              onChange={(e) => updateGlobalSettings({ 
                webhookUrl: e.target.value 
              })}
              placeholder="https://your-api.com/webhooks/SolanaPay"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Receive real-time payment notifications at this endpoint
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Summary */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-800">Configuration Summary</h4>
              <p className="text-sm text-blue-700 mt-1">
                You have {getEnabledChainsCount()} chains enabled with {getTotalTokensCount()} total accepted tokens. 
                {settings.globalSettings.autoSettlement && ' Auto-settlement is enabled.'} 
                Remember to test your configuration before going live.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MerchantChainConfig;
