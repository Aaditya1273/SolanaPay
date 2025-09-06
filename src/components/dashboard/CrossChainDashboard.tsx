"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDate, formatRelativeTime, formatChartDate } from "@/lib/date-utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Globe,
  Shield,
  Zap,
  Eye,
  RefreshCw,
  Bell,
  Settings,
  ExternalLink,
  Copy,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  Activity,
} from "lucide-react";
import { web3AuthService } from "@/lib/web3auth";
import { createSolanaRWAService } from "@/lib/solana";
import { createCrossChainBridge, BridgeTransfer } from "@/lib/crosschain-bridge";
import { didIdentityService, IdentityProfile } from "@/lib/did-identity";
import { TokenizedAsset } from "@/lib/rwa-tokenization";

interface DashboardData {
  totalPortfolioValue: number;
  totalAssets: number;
  activeTransactions: number;
  verifiedCredentials: number;
  portfolioChange24h: number;
  chainDistribution: Array<{
    chain: string;
    value: number;
    percentage: number;
    color: string;
  }>;
  assetDistribution: Array<{
    category: string;
    value: number;
    percentage: number;
    color: string;
  }>;
  recentTransactions: Array<{
    id: string;
    type: "mint" | "transfer" | "bridge" | "trade";
    asset: string;
    amount: number;
    from: string;
    to: string;
    chain: string;
    status: "pending" | "confirmed" | "failed" | "redeemed";
    timestamp: string;
    txHash: string;
  }>;
  priceHistory: Array<{
    timestamp: string;
    value: number;
  }>;
}

interface NotificationItem {
  id: string;
  type: "success" | "warning" | "info" | "error";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

const CrossChainDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [identityProfile, setIdentityProfile] = useState<IdentityProfile | null>(null);
  const [bridgeTransfers, setBridgeTransfers] = useState<BridgeTransfer[]>([]);
  const [tokenizedAssets, setTokenizedAssets] = useState<TokenizedAsset[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState("24h");
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Initialize services
  const solanaService = useMemo(() => createSolanaRWAService(), []);
  const bridgeService = useMemo(() => createCrossChainBridge("testnet"), []);

  useEffect(() => {
    loadDashboardData();
    
    if (autoRefresh) {
      const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // Load identity profile
      const profile = didIdentityService.getProfile();
      setIdentityProfile(profile);

      // Load tokenized assets (from localStorage for demo)
      const assets = getStoredTokenizedAssets();
      setTokenizedAssets(assets);

      // Load bridge transfers
      const transfers = getStoredBridgeTransfers();
      setBridgeTransfers(transfers);

      // Generate dashboard data
      const data = generateDashboardData(assets, transfers, profile);
      setDashboardData(data);

      // Load notifications
      const notifs = getStoredNotifications();
      setNotifications(notifs);

    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateDashboardData = (
    assets: TokenizedAsset[],
    transfers: BridgeTransfer[],
    profile: IdentityProfile | null
  ): DashboardData => {
    const totalValue = assets.reduce((sum, asset) => sum + asset.assetData.totalValue, 0);
    const activeTransactions = transfers.filter(t => t.status === "pending").length;
    
    // Chain distribution
    const chainCounts = assets.reduce((acc, asset) => {
      acc[asset.chain] = (acc[asset.chain] || 0) + asset.assetData.totalValue;
      return acc;
    }, {} as Record<string, number>);

    const chainColors = {
      ethereum: "#627EEA",
      solana: "#00D18C",
      polygon: "#8247E5",
      bsc: "#F3BA2F",
    };

    const chainDistribution = Object.entries(chainCounts).map(([chain, value]) => ({
      chain,
      value,
      percentage: (value / totalValue) * 100,
      color: chainColors[chain as keyof typeof chainColors] || "#6B7280",
    }));

    // Asset distribution
    const assetCounts = assets.reduce((acc, asset) => {
      acc[asset.assetData.category] = (acc[asset.assetData.category] || 0) + asset.assetData.totalValue;
      return acc;
    }, {} as Record<string, number>);

    const assetColors = {
      real_estate: "#10B981",
      carbon_credits: "#059669",
      precious_metals: "#F59E0B",
      commodities: "#EF4444",
      certificates: "#8B5CF6",
    };

    const assetDistribution = Object.entries(assetCounts).map(([category, value]) => ({
      category,
      value,
      percentage: (value / totalValue) * 100,
      color: assetColors[category as keyof typeof assetColors] || "#6B7280",
    }));

    // Generate mock price history
    const priceHistory = Array.from({ length: 24 }, (_, i) => ({
      timestamp: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
      value: totalValue * (0.95 + Math.random() * 0.1),
    }));

    // Recent transactions (mock data)
    const recentTransactions = transfers.slice(0, 10).map(transfer => ({
      id: transfer.id,
      type: "bridge" as const,
      asset: transfer.tokenAddress.slice(0, 8) + "...",
      amount: parseFloat(transfer.amount),
      from: transfer.sender.slice(0, 8) + "...",
      to: transfer.recipient.slice(0, 8) + "...",
      chain: transfer.sourceChain,
      status: transfer.status,
      timestamp: new Date(transfer.timestamp).toISOString(),
      txHash: transfer.txHash || "",
    }));

    return {
      totalPortfolioValue: totalValue,
      totalAssets: assets.length,
      activeTransactions,
      verifiedCredentials: profile?.credentials.length || 0,
      portfolioChange24h: Math.random() * 10 - 5, // Mock change
      chainDistribution,
      assetDistribution,
      recentTransactions,
      priceHistory,
    };
  };

  const getStoredTokenizedAssets = (): TokenizedAsset[] => {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem("omniflow_tokenized_assets");
    return stored ? JSON.parse(stored) : [];
  };

  const getStoredBridgeTransfers = (): BridgeTransfer[] => {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem("omniflow_bridge_transfers");
    return stored ? JSON.parse(stored) : [];
  };

  const getStoredNotifications = (): NotificationItem[] => {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem("omniflow_notifications");
    return stored ? JSON.parse(stored) : [
      {
        id: "1",
        type: "success",
        title: "Asset Verified",
        message: "Your real estate NFT has been successfully verified",
        timestamp: new Date().toISOString(),
        read: false,
      },
      {
        id: "2",
        type: "info",
        title: "Bridge Complete",
        message: "Cross-chain transfer from Ethereum to Solana completed",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        read: false,
      },
    ];
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getChainIcon = (chain: string) => {
    const icons = {
      ethereum: "⟠",
      solana: "◎",
      polygon: "⬟",
      bsc: "🔶",
    };
    return icons[chain as keyof typeof icons] || "🔗";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <RefreshCw className="w-8 h-8 text-purple-500" />
        </motion.div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Failed to Load Dashboard</h2>
          <p className="text-gray-600 mb-4">Please try refreshing the page</p>
          <Button onClick={loadDashboardData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Cross-Chain RWA Dashboard
            </h1>
            <p className="text-gray-300">
              Manage your tokenized assets across multiple blockchains
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? "bg-green-500/20 border-green-500" : ""}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`} />
              Auto Refresh
            </Button>
            
            <Button variant="outline" size="sm">
              <Bell className="w-4 h-4 mr-2" />
              {notifications.filter(n => !n.read).length}
            </Button>
            
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>

        {/* Key Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-300">Total Portfolio Value</p>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(dashboardData.totalPortfolioValue)}
                  </p>
                  <div className="flex items-center mt-2">
                    {dashboardData.portfolioChange24h >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                    )}
                    <span
                      className={`text-sm ${
                        dashboardData.portfolioChange24h >= 0
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {dashboardData.portfolioChange24h.toFixed(2)}%
                    </span>
                  </div>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-300">Total Assets</p>
                  <p className="text-2xl font-bold text-white">
                    {dashboardData.totalAssets}
                  </p>
                  <p className="text-sm text-gray-400 mt-2">Across all chains</p>
                </div>
                <Globe className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-300">Active Transactions</p>
                  <p className="text-2xl font-bold text-white">
                    {dashboardData.activeTransactions}
                  </p>
                  <p className="text-sm text-gray-400 mt-2">Pending confirmation</p>
                </div>
                <Activity className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-300">Verified Credentials</p>
                  <p className="text-2xl font-bold text-white">
                    {dashboardData.verifiedCredentials}
                  </p>
                  <p className="text-sm text-gray-400 mt-2">DID credentials</p>
                </div>
                <Shield className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs defaultValue="portfolio" className="space-y-6">
            <TabsList className="bg-white/10 backdrop-blur-lg border-white/20">
              <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="bridge">Cross-Chain Bridge</TabsTrigger>
              <TabsTrigger value="identity">Identity & Credentials</TabsTrigger>
            </TabsList>

            <TabsContent value="portfolio" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Portfolio Chart */}
                <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white">Portfolio Performance</CardTitle>
                    <CardDescription className="text-gray-300">
                      Value over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={dashboardData.priceHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis
                          dataKey="timestamp"
                          tickFormatter={(value) => formatDate(value, { includeTime: true, format: 'short' })}
                          stroke="#9CA3AF"
                        />
                        <YAxis
                          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                          stroke="#9CA3AF"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(0, 0, 0, 0.8)",
                            border: "1px solid #374151",
                            borderRadius: "8px",
                          }}
                          labelFormatter={(value) => formatDate(value, { includeTime: true, format: 'medium' })}
                          formatter={(value: number) => [formatCurrency(value), "Value"]}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#8B5CF6"
                          fill="url(#colorGradient)"
                        />
                        <defs>
                          <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Chain Distribution */}
                <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white">Chain Distribution</CardTitle>
                    <CardDescription className="text-gray-300">
                      Assets by blockchain
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={dashboardData.chainDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={120}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {dashboardData.chainDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(0, 0, 0, 0.8)",
                            border: "1px solid #374151",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number) => [formatCurrency(value), "Value"]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 space-y-2">
                      {dashboardData.chainDistribution.map((item) => (
                        <div key={item.chain} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-white capitalize">
                              {getChainIcon(item.chain)} {item.chain}
                            </span>
                          </div>
                          <span className="text-gray-300">
                            {item.percentage.toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Asset Distribution */}
              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Asset Categories</CardTitle>
                  <CardDescription className="text-gray-300">
                    Distribution by RWA type
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dashboardData.assetDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="category"
                        stroke="#9CA3AF"
                        tickFormatter={(value) => value.replace("_", " ")}
                      />
                      <YAxis
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                        stroke="#9CA3AF"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(0, 0, 0, 0.8)",
                          border: "1px solid #374151",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number) => [formatCurrency(value), "Value"]}
                      />
                      <Bar dataKey="value" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transactions" className="space-y-6">
              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Recent Transactions</CardTitle>
                  <CardDescription className="text-gray-300">
                    Latest activity across all chains
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboardData.recentTransactions.map((tx) => (
                      <motion.div
                        key={tx.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10"
                      >
                        <div className="flex items-center space-x-4">
                          {getStatusIcon(tx.status)}
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-white font-medium capitalize">
                                {tx.type}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {getChainIcon(tx.chain)} {tx.chain}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-400">
                              {formatAddress(tx.from)} → {formatAddress(tx.to)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-white font-medium">
                            {tx.amount} {tx.asset}
                          </p>
                          <p className="text-sm text-gray-400">
                            {formatDate(tx.timestamp, { includeTime: true, format: 'short' })}
                          </p>
                        </div>
                        
                        {tx.txHash && (
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bridge" className="space-y-6">
              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Cross-Chain Bridge</CardTitle>
                  <CardDescription className="text-gray-300">
                    Transfer assets between blockchains
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Bridge Status */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-white/5 rounded-lg">
                        <Zap className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                        <p className="text-white font-medium">Active Bridges</p>
                        <p className="text-2xl font-bold text-yellow-500">
                          {bridgeTransfers.filter(t => t.status === "pending").length}
                        </p>
                      </div>
                      
                      <div className="text-center p-4 bg-white/5 rounded-lg">
                        <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <p className="text-white font-medium">Completed</p>
                        <p className="text-2xl font-bold text-green-500">
                          {bridgeTransfers.filter(t => t.status === "redeemed").length}
                        </p>
                      </div>
                      
                      <div className="text-center p-4 bg-white/5 rounded-lg">
                        <Globe className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                        <p className="text-white font-medium">Total Volume</p>
                        <p className="text-2xl font-bold text-blue-500">
                          {formatCurrency(
                            bridgeTransfers.reduce((sum, t) => sum + parseFloat(t.amount), 0)
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Bridge Transfers */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white">Recent Bridge Transfers</h3>
                      {bridgeTransfers.slice(0, 5).map((transfer) => (
                        <div
                          key={transfer.id}
                          className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10"
                        >
                          <div className="flex items-center space-x-4">
                            {getStatusIcon(transfer.status)}
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-white font-medium">
                                  {getChainIcon(transfer.sourceChain)} {transfer.sourceChain}
                                </span>
                                <ArrowUpRight className="w-4 h-4 text-gray-400" />
                                <span className="text-white font-medium">
                                  {getChainIcon(transfer.targetChain)} {transfer.targetChain}
                                </span>
                              </div>
                              <p className="text-sm text-gray-400">
                                {formatAddress(transfer.sender)} → {formatAddress(transfer.recipient)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-white font-medium">
                              {transfer.amount} tokens
                            </p>
                            <p className="text-sm text-gray-400">
                              {formatDate(transfer.timestamp, { includeTime: true, format: 'medium' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="identity" className="space-y-6">
              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Decentralized Identity</CardTitle>
                  <CardDescription className="text-gray-300">
                    Your DID profile and verifiable credentials
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {identityProfile ? (
                    <div className="space-y-6">
                      {/* DID Info */}
                      <div className="p-4 bg-white/5 rounded-lg">
                        <h3 className="text-lg font-semibold text-white mb-4">DID Profile</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-400">DID</p>
                            <div className="flex items-center space-x-2">
                              <p className="text-white font-mono text-sm">
                                {formatAddress(identityProfile.did)}
                              </p>
                              <Button variant="ghost" size="sm">
                                <Copy className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-sm text-gray-400">Reputation Score</p>
                            <div className="flex items-center space-x-2">
                              <Progress
                                value={identityProfile.reputation.score}
                                className="flex-1"
                              />
                              <span className="text-white font-medium">
                                {identityProfile.reputation.score}/100
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Credentials */}
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-4">
                          Verifiable Credentials ({identityProfile.credentials.length})
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {identityProfile.credentials.map((credential, index) => (
                            <div
                              key={credential.id}
                              className="p-4 bg-white/5 rounded-lg border border-white/10"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {credential.type[1] || credential.type[0]}
                                </Badge>
                                <Shield className="w-4 h-4 text-green-500" />
                              </div>
                              
                              <h4 className="text-white font-medium mb-1">
                                {credential.credentialSubject.rwaType?.replace("_", " ") || "Credential"}
                              </h4>
                              
                              <p className="text-sm text-gray-400 mb-2">
                                Issued: {formatDate(credential.issuanceDate, { format: 'medium' })}
                              </p>
                              
                              {credential.credentialSubject.assetValue && (
                                <p className="text-sm text-green-400">
                                  Value: {formatCurrency(credential.credentialSubject.assetValue)}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Wallet Addresses */}
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-4">Linked Wallets</h3>
                        <div className="space-y-2">
                          {Object.entries(identityProfile.walletAddresses).map(([chain, address]) => (
                            <div
                              key={chain}
                              className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                            >
                              <div className="flex items-center space-x-3">
                                <span className="text-lg">{getChainIcon(chain)}</span>
                                <span className="text-white capitalize">{chain}</span>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <span className="text-gray-300 font-mono text-sm">
                                  {formatAddress(address)}
                                </span>
                                <Button variant="ghost" size="sm">
                                  <Copy className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Shield className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-white mb-2">
                        No Identity Profile Found
                      </h3>
                      <p className="text-gray-400 mb-4">
                        Create your decentralized identity to get started
                      </p>
                      <Button>
                        <Shield className="w-4 h-4 mr-2" />
                        Create DID Profile
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default CrossChainDashboard;
