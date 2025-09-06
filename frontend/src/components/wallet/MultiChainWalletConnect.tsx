import React, { useState } from 'react';
import { useMultiChainWallet } from '../../contexts/MultiChainWalletContext';
import { Wallet, ChevronDown, Check, AlertTriangle, Loader2 } from 'lucide-react';

const ChainSelector: React.FC = () => {
  const { currentChain, supportedChains, switchToChain, isSwitching, isChainSupported } = useMultiChainWallet();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
          isChainSupported 
            ? 'border-gray-300 hover:border-gray-400' 
            : 'border-red-300 bg-red-50 text-red-700'
        }`}
        disabled={isSwitching}
      >
        {isSwitching ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : !isChainSupported ? (
          <AlertTriangle className="h-4 w-4" />
        ) : (
          <span className="text-lg">{currentChain?.icon || '⚡'}</span>
        )}
        <span className="text-sm font-medium">
          {currentChain?.name || 'Unknown Chain'}
        </span>
        <ChevronDown className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {supportedChains.map((chain) => (
            <button
              key={chain.id}
              onClick={() => {
                switchToChain(chain.id);
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg transition-colors"
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg">{chain.icon}</span>
                <div className="text-left">
                  <div className="text-sm font-medium">{chain.name}</div>
                  <div className="text-xs text-gray-500">{chain.shortName}</div>
                </div>
              </div>
              {currentChain?.id === chain.id && (
                <Check className="h-4 w-4 text-green-600" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const WalletConnector: React.FC = () => {
  const { connect, isConnecting } = useMultiChainWallet();
  const [selectedConnector, setSelectedConnector] = useState<string>('');

  const connectors = [
    { id: 'injected', name: 'MetaMask', icon: '🦊' },
    { id: 'walletConnect', name: 'WalletConnect', icon: '🔗' },
    { id: 'coinbaseWallet', name: 'Coinbase Wallet', icon: '🔵' },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-800">Connect Wallet</h3>
      <div className="grid gap-2">
        {connectors.map((connector) => (
          <button
            key={connector.id}
            onClick={() => {
              setSelectedConnector(connector.id);
              connect(connector.id);
            }}
            disabled={isConnecting}
            className="flex items-center space-x-3 w-full p-3 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50"
          >
            {isConnecting && selectedConnector === connector.id ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <span className="text-xl">{connector.icon}</span>
            )}
            <span className="font-medium">{connector.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const MultiChainWalletConnect: React.FC = () => {
  const { 
    isConnected, 
    address, 
    disconnect, 
    balances, 
    currentChain, 
    error,
    isChainSupported 
  } = useMultiChainWallet();

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <span className="text-red-800 font-medium">Wallet Error</span>
        </div>
        <p className="text-red-700 text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <WalletConnector />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      {/* Chain Status */}
      {!isChainSupported && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-yellow-800 text-sm font-medium">
              Unsupported Network
            </span>
          </div>
          <p className="text-yellow-700 text-xs mt-1">
            Please switch to a supported network to continue
          </p>
        </div>
      )}

      {/* Wallet Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-800">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </div>
            <div className="text-xs text-gray-500">Connected Wallet</div>
          </div>
        </div>
        <button
          onClick={disconnect}
          className="text-sm text-red-600 hover:text-red-800 font-medium"
        >
          Disconnect
        </button>
      </div>

      {/* Chain Selector */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">
          Active Network
        </label>
        <ChainSelector />
      </div>

      {/* Multi-Chain Balances */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">
          Balances
        </label>
        <div className="space-y-2">
          {Object.entries(balances).map(([chainId, balance]) => {
            const chain = [
              { id: 1, name: 'Ethereum', symbol: 'ETH', icon: '⟠' },
              { id: 137, name: 'Polygon', symbol: 'MATIC', icon: '⬟' },
              { id: 56, name: 'BSC', symbol: 'BNB', icon: '⬢' },
            ].find(c => c.id === parseInt(chainId));

            return (
              <div key={chainId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{chain?.icon}</span>
                  <span className="text-sm font-medium">{chain?.name}</span>
                </div>
                <span className="text-sm text-gray-600">
                  {parseFloat(balance).toFixed(4)} {chain?.symbol}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MultiChainWalletConnect;
