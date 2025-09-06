"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  PieChart,
  Activity,
  Wallet,
  Clock,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Eye,
  Send,
  Download,
  Filter,
  Calendar,
  Building,
  Leaf,
  Gem,
  Factory,
  Globe,
  Shield,
  Zap,
  Bell,
  Settings,
  BarChart3,
  Users,
  RefreshCw
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { cn, formatCurrency, formatNumber, formatPercentage } from "@/lib/utils";
import Link from "next/link";

interface DashboardStats {
  portfolioValue: number;
  portfolioChange24h: number;
  totalYield: number;
  activeAssets: number;
  pendingTransactions: number;
  notifications: number;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  href: string;
}

interface Notification {
  id: string;
  type: 'yield' | 'price' | 'transaction' | 'news';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

const mockDashboardStats: DashboardStats = {
  portfolioValue: 3550000,
  portfolioChange24h: 2.8,
  totalYield: 28750,
  activeAssets: 8,
  pendingTransactions: 2,
  notifications: 5,
};

const quickActions: QuickAction[] = [
  {
    id: 'buy',
    title: 'Buy Assets',
    description: 'Explore marketplace',
    icon: Plus,
    color: 'from-green-500 to-emerald-500',
    href: '/marketplace',
  },
  {
    id: 'portfolio',
    title: 'View Portfolio',
    description: 'Manage holdings',
    icon: Wallet,
    color: 'from-blue-500 to-cyan-500',
    href: '/portfolio',
  },
  {
    id: 'analytics',
    title: 'Market Analytics',
    description: 'Track performance',
    icon: BarChart3,
    color: 'from-purple-500 to-pink-500',
    href: '/analytics',
  },
  {
    id: 'yield',
    title: 'Claim Yield',
    description: 'Collect rewards',
    icon: Star,
    color: 'from-gold-500 to-yellow-500',
    href: '/yield',
  },
];

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'yield',
    title: 'Yield Payment Received',
    message: 'You received $1,625 from Swiss Gold Reserves',
    timestamp: '2024-01-15T10:30:00Z',
    read: false,
  },
  {
    id: '2',
    type: 'price',
    title: 'Price Alert',
    message: 'Manhattan Office Complex increased by 2.5%',
    timestamp: '2024-01-15T09:15:00Z',
    read: false,
  },
  {
    id: '3',
    type: 'transaction',
    title: 'Transaction Completed',
    message: 'Successfully purchased 50 fractions of Texas Oil Wells',
    timestamp: '2024-01-15T08:45:00Z',
    read: true,
  },
  {
    id: '4',
    type: 'news',
    title: 'Market Update',
    message: 'RWA market cap reaches $4.6B milestone',
    timestamp: '2024-01-14T16:20:00Z',
    read: true,
  },
];

const topAssets = [
  {
    name: 'Swiss Gold Reserves',
    type: 'precious-metals',
    value: 3125000,
    change: 4.8,
    yield: 5.2,
    icon: Gem,
    color: 'from-yellow-500 to-orange-500',
  },
  {
    name: 'Manhattan Office Complex',
    type: 'real-estate',
    value: 312500,
    change: 2.5,
    yield: 8.5,
    icon: Building,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    name: 'Amazon Carbon Credits',
    type: 'carbon-credits',
    value: 112500,
    change: -1.2,
    yield: 12.3,
    icon: Leaf,
    color: 'from-green-500 to-emerald-500',
  },
];

export default function DashboardPage() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const refreshData = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const WelcomeSection = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <GlassCard className="p-8 bg-gradient-to-br from-gold-500/10 to-purple-500/10 border-gold-500/20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-royal font-bold bg-gradient-to-r from-gold-400 to-gold-600 bg-clip-text text-transparent mb-2">
              Welcome back!
            </h1>
            <p className="text-xl text-white/80">
              Your portfolio is performing well today
            </p>
            <div className="flex items-center space-x-4 mt-4">
              <div className="flex items-center space-x-2 text-green-400">
                <TrendingUp className="w-5 h-5" />
                <span className="font-medium">
                  +{formatPercentage(mockDashboardStats.portfolioChange24h)} today
                </span>
              </div>
              <div className="flex items-center space-x-2 text-gold-400">
                <Star className="w-5 h-5" />
                <span className="font-medium">
                  {formatCurrency(mockDashboardStats.totalYield)} yield earned
                </span>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-3xl font-bold text-white mb-1">
              {formatCurrency(mockDashboardStats.portfolioValue)}
            </div>
            <div className="text-white/60">Total Portfolio Value</div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );

  const QuickStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-gold-500 to-gold-600 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div className="text-sm text-gold-400 font-medium">
              {mockDashboardStats.activeAssets} Assets
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {formatCurrency(mockDashboardStats.portfolioValue)}
          </div>
          <div className="text-sm text-white/60">Portfolio Value</div>
        </GlassCard>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div className={cn(
              "text-sm font-medium flex items-center space-x-1",
              mockDashboardStats.portfolioChange24h >= 0 ? "text-green-400" : "text-red-400"
            )}>
              {mockDashboardStats.portfolioChange24h >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{formatPercentage(mockDashboardStats.portfolioChange24h)}</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {formatCurrency(mockDashboardStats.portfolioValue * mockDashboardStats.portfolioChange24h / 100)}
          </div>
          <div className="text-sm text-white/60">24h Change</div>
        </GlassCard>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Star className="w-6 h-6 text-white" />
            </div>
            <div className="text-sm text-purple-400 font-medium">
              Annual
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {formatCurrency(mockDashboardStats.totalYield)}
          </div>
          <div className="text-sm text-white/60">Total Yield</div>
        </GlassCard>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div className="text-sm text-blue-400 font-medium">
              {mockDashboardStats.pendingTransactions} Pending
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {mockDashboardStats.activeAssets}
          </div>
          <div className="text-sm text-white/60">Active Assets</div>
        </GlassCard>
      </motion.div>
    </div>
  );

  const QuickActions = () => (
    <GlassCard className="p-6 mb-8">
      <h3 className="text-xl font-bold text-white mb-6">Quick Actions</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action, index) => (
          <motion.div
            key={action.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link href={action.href}>
              <div className="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all cursor-pointer group">
                <div className={cn(
                  "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4 group-hover:scale-110 transition-transform",
                  action.color
                )}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-bold text-white mb-1">{action.title}</h4>
                <p className="text-sm text-white/60">{action.description}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </GlassCard>
  );

  const TopAssets = () => (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">Top Holdings</h3>
        <Link href="/portfolio">
          <button className="text-gold-400 hover:text-gold-300 text-sm font-medium flex items-center space-x-1">
            <span>View All</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </Link>
      </div>
      
      <div className="space-y-4">
        {topAssets.map((asset, index) => (
          <motion.div
            key={asset.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center space-x-4">
              <div className={cn(
                "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center",
                asset.color
              )}>
                <asset.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-medium text-white">{asset.name}</div>
                <div className="text-sm text-white/60 capitalize">
                  {asset.type.replace('-', ' ')}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="font-bold text-white">{formatCurrency(asset.value)}</div>
              <div className="flex items-center space-x-2">
                <span className={cn(
                  "text-sm font-medium",
                  asset.change >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  {formatPercentage(asset.change)}
                </span>
                <span className="text-sm text-white/60">
                  {asset.yield}% yield
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </GlassCard>
  );

  const NotificationsPanel = () => (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">Recent Activity</h3>
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
              {unreadCount}
            </div>
          )}
          <button className="text-gold-400 hover:text-gold-300">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <div className="space-y-3">
        {notifications.slice(0, 4).map((notification, index) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => markNotificationAsRead(notification.id)}
            className={cn(
              "p-4 rounded-xl cursor-pointer transition-colors",
              notification.read ? "bg-white/5" : "bg-gold-500/10 border border-gold-500/20"
            )}
          >
            <div className="flex items-start space-x-3">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                notification.type === 'yield' ? 'bg-gold-500/20 text-gold-400' :
                notification.type === 'price' ? 'bg-green-500/20 text-green-400' :
                notification.type === 'transaction' ? 'bg-blue-500/20 text-blue-400' :
                'bg-purple-500/20 text-purple-400'
              )}>
                {notification.type === 'yield' && <Star className="w-4 h-4" />}
                {notification.type === 'price' && <TrendingUp className="w-4 h-4" />}
                {notification.type === 'transaction' && <Activity className="w-4 h-4" />}
                {notification.type === 'news' && <Bell className="w-4 h-4" />}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white text-sm">{notification.title}</div>
                <div className="text-sm text-white/60 mt-1">{notification.message}</div>
                <div className="text-xs text-white/40 mt-2">
                  {new Date(notification.timestamp).toLocaleString()}
                </div>
              </div>
              
              {!notification.read && (
                <div className="w-2 h-2 bg-gold-400 rounded-full flex-shrink-0 mt-2" />
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </GlassCard>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-royal-950 via-royal-900 to-royal-800 text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-royal-950/80 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-gold-400 to-gold-600 rounded-xl flex items-center justify-center">
                    <Gem className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xl font-royal font-bold bg-gradient-to-r from-gold-400 to-gold-600 bg-clip-text text-transparent">
                    OmniFlow
                  </span>
                </div>
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={refreshData}
                disabled={isLoading}
                className="p-2 border border-white/20 rounded-xl text-white hover:border-white/40 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={cn("w-5 h-5", isLoading && "animate-spin")} />
              </button>
              
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 border border-white/20 rounded-xl text-white hover:border-white/40 transition-colors relative"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                      {unreadCount}
                    </div>
                  )}
                </button>
              </div>
              
              <Link href="/marketplace">
                <button className="px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-600 rounded-xl font-medium hover:from-gold-600 hover:to-gold-700 transition-all">
                  Marketplace
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <WelcomeSection />
        <QuickStats />
        <QuickActions />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <TopAssets />
          <NotificationsPanel />
        </div>
      </div>
    </div>
  );
}