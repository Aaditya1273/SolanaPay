import React, { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wallet, 
  RefreshCw, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownLeft,
  Zap,
  Globe,
  Route,
  DollarSign,
  Clock,
  Shield
} from 'lucide-react';
import { multiChainBalanceService, MultiChainPortfolio, TransactionRoute } from '@/services/multiChainBalanceService';
import { snsService } from '@/services/snsService';
import DisplayName from '@/components/common/DisplayName';
import toast from 'react-hot-toast';

interface RouteComparison {
  cheapest: TransactionRoute | null;
  fastest: TransactionRoute | null;
  mostReliable: TransactionRoute | null;
}

const UnifiedWalletDashboard: React.FC = () => {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  
  const [portfolio, setPortfolio] = useState<MultiChainPortfolio | null>(null);
  const [loading, setLoading] = useState(false);
  const [evmAddress, setEvmAddress] = useState<string>('');
  const [snsDomain, setSnsDomain] = useState<string>('');
  const [routeComparison, setRouteComparison] = useState<RouteComparison | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<TransactionRoute | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);

  // Load portfolio data
  const loadPortfolio = async () => {
    if (!connected || !publicKey) return;

    setLoading(true);
    try {
      // Get SNS domain
      const domain = await snsService.reverseLookup(publicKey);
      setSnsDomain(domain || '');

      // Get EVM address (from cross-chain linking or user input)
      const linkedEvmAddress = evmAddress || await getLinkedEvmAddress();
      
      // Load multi-chain portfolio
      const portfolioData = await multiChainBalanceService.getMultiChainPortfolio(
        publicKey,
        linkedEvmAddress
      );
      
      setPortfolio(portfolioData);

      // Sync Solana assets in real-time
      if (autoSyncEnabled) {
        await multiChainBalanceService.syncSolanaAssets({ publicKey, connected });
      }

      toast.success('Portfolio updated successfully');
    } catch (error) {
      console.error('Failed to load portfolio:', error);
      toast.error('Failed to load portfolio data');
    } finally {
      setLoading(false);
    }
  };

  // Get optimal routes for a sample transaction
  const loadRouteComparison = async () => {
    if (!portfolio) return;

    try {
      const routes = await multiChainBalanceService.getOptimalRoutes(
        1, // Ethereum
        900, // Solana
        'USDC',
        'USDC',
        100
      );

      const cheapest = routes.sort((a, b) => a.totalCost - b.totalCost)[0] || null;
      const fastest = routes.sort((a, b) => a.estimatedTime - b.estimatedTime)[0] || null;
      const mostReliable = routes.sort((a, b) => b.confidence - a.confidence)[0] || null;

      setRouteComparison({ cheapest, fastest, mostReliable });
    } catch (error) {
      console.error('Failed to load route comparison:', error);
    }
  };

  // Auto-refresh portfolio
  useEffect(() => {
    if (connected && publicKey) {
      loadPortfolio();
      loadRouteComparison();

      // Set up auto-refresh every 30 seconds
      const interval = setInterval(() => {
        if (autoSyncEnabled) {
          loadPortfolio();
        }
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [connected, publicKey, evmAddress, autoSyncEnabled]);

  const getLinkedEvmAddress = async (): Promise<string> => {
    // This would fetch linked EVM address from cross-chain identity system
    // For now, returning empty string
    return '';
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number, decimals: number = 4): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  const getChainIcon = (chainId: number): string => {
    const icons: Record<number, string> = {
      1: '⟠', // Ethereum
      137: '⬟', // Polygon
      900: '◎', // Solana
    };
    return icons[chainId] || '?';
  };

  const getRouteTypeColor = (type: 'cheapest' | 'fastest' | 'reliable'): string => {
    const colors = {
      cheapest: 'bg-green-100 text-green-800',
      fastest: 'bg-blue-100 text-blue-800',
      reliable: 'bg-purple-100 text-purple-800',
    };
    return colors[type];
  };

  if (!connected) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Wallet className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Your Wallet</h3>
            <p className="text-gray-600">Connect your Solana wallet to view your multi-chain portfolio</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Multi-Chain Portfolio</h1>
          <div className="flex items-center gap-2 mt-1">
            {snsDomain && <DisplayName address={snsDomain} showAvatar showReputation />}
            <Badge variant="outline" className="text-xs">
              Real-time sync {autoSyncEnabled ? 'ON' : 'OFF'}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
          >
            <Shield className="h-4 w-4 mr-1" />
            Auto-sync
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadPortfolio}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Portfolio Overview */}
      {portfolio && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="md:col-span-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Total Portfolio Value</h3>
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(portfolio.totalUsdValue)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Last updated: {new Date(portfolio.lastUpdated).toLocaleTimeString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Solana</span>
                <span className="text-2xl">◎</span>
              </div>
              <p className="text-xl font-bold">{formatCurrency(portfolio.solana.totalUsdValue)}</p>
              <p className="text-xs text-gray-500">
                {formatNumber(portfolio.solana.nativeToken.balance)} SOL
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Ethereum</span>
                <span className="text-2xl">⟠</span>
              </div>
              <p className="text-xl font-bold">{formatCurrency(portfolio.ethereum.totalUsdValue)}</p>
              <p className="text-xs text-gray-500">
                {formatNumber(portfolio.ethereum.nativeToken.balance)} ETH
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="balances" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="balances">Chain Balances</TabsTrigger>
          <TabsTrigger value="routing">Smart Routing</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="balances" className="space-y-4">
          {portfolio && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Solana Chain */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">◎</span>
                    Solana
                    <Badge variant="secondary">Live</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
                    <p className="text-sm opacity-90">SOL Balance</p>
                    <p className="text-2xl font-bold">
                      {formatNumber(portfolio.solana.nativeToken.balance)}
                    </p>
                    <p className="text-sm opacity-90">
                      {formatCurrency(portfolio.solana.nativeToken.usdValue || 0)}
                    </p>
                  </div>
                  
                  {portfolio.solana.tokens.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-gray-700">SPL Tokens</h4>
                      {portfolio.solana.tokens.map((token) => (
                        <div key={token.mint} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium text-sm">{token.symbol}</p>
                            <p className="text-xs text-gray-500">{token.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-sm">{formatNumber(token.balance)}</p>
                            <p className="text-xs text-gray-500">
                              {formatCurrency(token.usdValue || 0)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Ethereum Chain */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">⟠</span>
                    Ethereum
                    {evmAddress ? <Badge variant="secondary">Connected</Badge> : <Badge variant="outline">Not Connected</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!evmAddress ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500 mb-2">Connect EVM wallet to view balances</p>
                      <input
                        type="text"
                        placeholder="Enter Ethereum address"
                        value={evmAddress}
                        onChange={(e) => setEvmAddress(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md text-sm"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
                        <p className="text-sm opacity-90">ETH Balance</p>
                        <p className="text-2xl font-bold">
                          {formatNumber(portfolio.ethereum.nativeToken.balance)}
                        </p>
                        <p className="text-sm opacity-90">
                          {formatCurrency(portfolio.ethereum.nativeToken.usdValue || 0)}
                        </p>
                      </div>
                      
                      {portfolio.ethereum.tokens.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm text-gray-700">ERC-20 Tokens</h4>
                          {portfolio.ethereum.tokens.map((token) => (
                            <div key={token.mint} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                              <div>
                                <p className="font-medium text-sm">{token.symbol}</p>
                                <p className="text-xs text-gray-500">{token.name}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-sm">{formatNumber(token.balance)}</p>
                                <p className="text-xs text-gray-500">
                                  {formatCurrency(token.usdValue || 0)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Polygon Chain */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">⬟</span>
                    Polygon
                    {evmAddress ? <Badge variant="secondary">Connected</Badge> : <Badge variant="outline">Not Connected</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {evmAddress ? (
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-4 text-white">
                      <p className="text-sm opacity-90">MATIC Balance</p>
                      <p className="text-2xl font-bold">
                        {formatNumber(portfolio.polygon.nativeToken.balance)}
                      </p>
                      <p className="text-sm opacity-90">
                        {formatCurrency(portfolio.polygon.nativeToken.usdValue || 0)}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Connect EVM wallet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="routing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5" />
                Smart Transaction Routing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Automatically find the cheapest and fastest routes for cross-chain transactions
              </p>
              
              {routeComparison && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Cheapest Route */}
                  {routeComparison.cheapest && (
                    <Card className="border-green-200">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <Badge className={getRouteTypeColor('cheapest')}>
                            Cheapest
                          </Badge>
                          <DollarSign className="h-4 w-4 text-green-600" />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="font-medium">{routeComparison.cheapest.steps[0]?.protocol}</p>
                        <div className="text-sm text-gray-600">
                          <p>Cost: {formatCurrency(routeComparison.cheapest.totalCost)}</p>
                          <p>Time: {Math.round(routeComparison.cheapest.estimatedTime / 60)}m</p>
                          <p>Confidence: {Math.round(routeComparison.cheapest.confidence * 100)}%</p>
                        </div>
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={() => setSelectedRoute(routeComparison.cheapest)}
                        >
                          Select Route
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Fastest Route */}
                  {routeComparison.fastest && (
                    <Card className="border-blue-200">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <Badge className={getRouteTypeColor('fastest')}>
                            Fastest
                          </Badge>
                          <Zap className="h-4 w-4 text-blue-600" />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="font-medium">{routeComparison.fastest.steps[0]?.protocol}</p>
                        <div className="text-sm text-gray-600">
                          <p>Cost: {formatCurrency(routeComparison.fastest.totalCost)}</p>
                          <p>Time: {Math.round(routeComparison.fastest.estimatedTime / 60)}m</p>
                          <p>Confidence: {Math.round(routeComparison.fastest.confidence * 100)}%</p>
                        </div>
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={() => setSelectedRoute(routeComparison.fastest)}
                        >
                          Select Route
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Most Reliable Route */}
                  {routeComparison.mostReliable && (
                    <Card className="border-purple-200">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <Badge className={getRouteTypeColor('reliable')}>
                            Most Reliable
                          </Badge>
                          <Shield className="h-4 w-4 text-purple-600" />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="font-medium">{routeComparison.mostReliable.steps[0]?.protocol}</p>
                        <div className="text-sm text-gray-600">
                          <p>Cost: {formatCurrency(routeComparison.mostReliable.totalCost)}</p>
                          <p>Time: {Math.round(routeComparison.mostReliable.estimatedTime / 60)}m</p>
                          <p>Confidence: {Math.round(routeComparison.mostReliable.confidence * 100)}%</p>
                        </div>
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={() => setSelectedRoute(routeComparison.mostReliable)}
                        >
                          Select Route
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {selectedRoute && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium mb-2">Selected Route: {selectedRoute.steps[0]?.protocol}</h4>
                  <div className="space-y-2">
                    {selectedRoute.steps.map((step, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">
                          {index + 1}
                        </div>
                        <span>{step.description}</span>
                        <Badge variant="outline" className="ml-auto">
                          {Math.round(step.estimatedTime / 60)}m
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Chain Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {portfolio && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <span>◎</span> Solana
                      </span>
                      <span className="font-medium">
                        {((portfolio.solana.totalUsdValue / portfolio.totalUsdValue) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <span>⟠</span> Ethereum
                      </span>
                      <span className="font-medium">
                        {((portfolio.ethereum.totalUsdValue / portfolio.totalUsdValue) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <span>⬟</span> Polygon
                      </span>
                      <span className="font-medium">
                        {((portfolio.polygon.totalUsdValue / portfolio.totalUsdValue) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Real-time Sync Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Solana Assets</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Synced
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>EVM Assets</span>
                    <Badge variant="outline">
                      {evmAddress ? 'Connected' : 'Not Connected'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Auto-sync</span>
                    <Badge variant={autoSyncEnabled ? 'secondary' : 'outline'}>
                      {autoSyncEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UnifiedWalletDashboard;
