import React, { useState, useEffect } from 'react';
import { useMultiChainWallet } from '../../contexts/MultiChainWalletContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Loader2, Wifi, WifiOff } from 'lucide-react';

interface NetworkStatus {
  isOnline: boolean;
  latency: number;
  blockNumber?: number;
  gasPrice?: string;
}

const ChainSwitcher: React.FC = () => {
  const { 
    chainId, 
    currentChain, 
    supportedChains, 
    switchToChain, 
    isChainSupported,
    isConnected 
  } = useMultiChainWallet();

  const [switching, setSwitching] = useState<number | null>(null);
  const [networkStatus, setNetworkStatus] = useState<Record<number, NetworkStatus>>({});
  const [error, setError] = useState<string | null>(null);

  // Monitor network status for all supported chains
  useEffect(() => {
    const checkNetworkStatus = async () => {
      const statusUpdates: Record<number, NetworkStatus> = {};

      for (const chain of supportedChains) {
        try {
          const startTime = Date.now();
          
          // Simulate network check (in production, use actual RPC calls)
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
          
          const latency = Date.now() - startTime;
          
          statusUpdates[chain.id] = {
            isOnline: true,
            latency,
            blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
            gasPrice: (Math.random() * 50 + 10).toFixed(2)
          };
        } catch (err) {
          statusUpdates[chain.id] = {
            isOnline: false,
            latency: 0
          };
        }
      }

      setNetworkStatus(statusUpdates);
    };

    checkNetworkStatus();
    const interval = setInterval(checkNetworkStatus, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [supportedChains]);

  const handleChainSwitch = async (targetChainId: number) => {
    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    if (targetChainId === chainId) return;

    setSwitching(targetChainId);
    setError(null);

    try {
      await switchToChain(targetChainId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch network');
    } finally {
      setSwitching(null);
    }
  };

  const getChainStatus = (chain: any) => {
    const status = networkStatus[chain.id];
    if (!status) return { color: 'gray', text: 'Checking...', icon: Loader2 };
    
    if (!status.isOnline) return { color: 'red', text: 'Offline', icon: WifiOff };
    if (status.latency > 1000) return { color: 'yellow', text: 'Slow', icon: AlertTriangle };
    return { color: 'green', text: 'Online', icon: Wifi };
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 200) return 'text-green-600';
    if (latency < 500) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!isConnected) {
    return (
      <Card>
        <CardContent className="p-4 text-center">
          <WifiOff className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">Connect wallet to switch networks</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Network Status */}
      <Card className={`border-l-4 ${isChainSupported ? 'border-l-green-500' : 'border-l-red-500'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{currentChain?.icon || '❓'}</span>
              <div>
                <h3 className="font-semibold">
                  {currentChain?.name || 'Unknown Network'}
                </h3>
                <p className="text-sm text-gray-600">
                  Chain ID: {chainId}
                </p>
              </div>
            </div>
            <div className="text-right">
              {isChainSupported ? (
                <div className="flex items-center space-x-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Supported</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">Unsupported</span>
                </div>
              )}
            </div>
          </div>

          {currentChain && networkStatus[currentChain.id] && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Status:</span>
                  <div className="flex items-center space-x-1 mt-1">
                    {React.createElement(getChainStatus(currentChain).icon, { 
                      className: `h-3 w-3 text-${getChainStatus(currentChain).color}-600` 
                    })}
                    <span className={`text-${getChainStatus(currentChain).color}-600`}>
                      {getChainStatus(currentChain).text}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Latency:</span>
                  <div className={`mt-1 ${getLatencyColor(networkStatus[currentChain.id].latency)}`}>
                    {networkStatus[currentChain.id].latency}ms
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Gas Price:</span>
                  <div className="mt-1">
                    {networkStatus[currentChain.id].gasPrice} gwei
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* Available Networks */}
      <div className="space-y-2">
        <h4 className="font-medium text-gray-800">Available Networks</h4>
        
        {supportedChains.map((chain) => {
          const status = getChainStatus(chain);
          const isCurrentChain = chain.id === chainId;
          const isSwitching = switching === chain.id;
          const networkInfo = networkStatus[chain.id];

          return (
            <Card 
              key={chain.id} 
              className={`cursor-pointer transition-colors ${
                isCurrentChain 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'hover:border-gray-400'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{chain.icon}</span>
                    <div>
                      <div className="font-medium">{chain.name}</div>
                      <div className="text-sm text-gray-600">
                        Chain ID: {chain.id}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {/* Network Status */}
                    <div className="text-right text-sm">
                      <div className="flex items-center space-x-1">
                        {React.createElement(status.icon, { 
                          className: `h-3 w-3 text-${status.color}-600 ${
                            status.icon === Loader2 ? 'animate-spin' : ''
                          }` 
                        })}
                        <span className={`text-${status.color}-600`}>
                          {status.text}
                        </span>
                      </div>
                      {networkInfo && (
                        <div className={`${getLatencyColor(networkInfo.latency)} mt-1`}>
                          {networkInfo.latency}ms
                        </div>
                      )}
                    </div>

                    {/* Switch Button */}
                    <Button
                      onClick={() => handleChainSwitch(chain.id)}
                      disabled={isCurrentChain || isSwitching || !networkInfo?.isOnline}
                      variant={isCurrentChain ? "default" : "outline"}
                      size="sm"
                      className="min-w-[80px]"
                    >
                      {isSwitching ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Switching
                        </>
                      ) : isCurrentChain ? (
                        'Current'
                      ) : !networkInfo?.isOnline ? (
                        'Offline'
                      ) : (
                        'Switch'
                      )}
                    </Button>
                  </div>
                </div>

                {/* Additional Network Info */}
                {networkInfo && !isCurrentChain && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                      <div>
                        <span>Block: </span>
                        <span className="font-mono">
                          {networkInfo.blockNumber?.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span>Gas: </span>
                        <span>{networkInfo.gasPrice} gwei</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-medium text-gray-800 mb-3">Quick Actions</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Button
              onClick={() => handleChainSwitch(137)} // Polygon
              disabled={chainId === 137 || switching !== null}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <span>⬟</span>
              <span>Switch to Polygon</span>
            </Button>
            <Button
              onClick={() => handleChainSwitch(1)} // Ethereum
              disabled={chainId === 1 || switching !== null}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <span>⟠</span>
              <span>Switch to Ethereum</span>
            </Button>
            <Button
              onClick={() => handleChainSwitch(56)} // BSC
              disabled={chainId === 56 || switching !== null}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <span>⬢</span>
              <span>Switch to BSC</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Network Tips */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h4 className="font-medium text-blue-800 mb-2">💡 Network Tips</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Polygon offers the lowest transaction fees</li>
            <li>• Ethereum has the highest security and liquidity</li>
            <li>• BSC provides fast transaction confirmation</li>
            <li>• Always check network status before making transactions</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChainSwitcher;
