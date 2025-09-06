import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import RainbowKitConnectButton from '@/components/wallet/RainbowKitConnectButton'
import { useAccount } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { Wallet, Briefcase, Gift, TrendingUp, Clock, CheckCircle, Award, Loader2 } from 'lucide-react'
import axios from 'axios'

interface ActivityItem {
  id: string
  type: 'task_completed' | 'payment_received' | 'achievement_unlocked' | 'login_bonus'
  title: string
  description: string
  amount?: number
  timestamp: string
  icon: string
}

export default function HomePage() {
  const { user } = useAuth()
  const { isConnected } = useAccount()
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loadingActivities, setLoadingActivities] = useState(false)

  useEffect(() => {
    if (user) {
      fetchRecentActivity()
    }
  }, [user])

  const fetchRecentActivity = async () => {
    try {
      setLoadingActivities(true)
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/activity/recent`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setActivities(response.data.activities || [])
    } catch (err: any) {
      console.error('Error fetching activity:', err)
      // Don't show error toast for activity feed as it's not critical
    } finally {
      setLoadingActivities(false)
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task_completed': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'payment_received': return <Wallet className="h-4 w-4 text-blue-500" />
      case 'achievement_unlocked': return <Award className="h-4 w-4 text-purple-500" />
      case 'login_bonus': return <Gift className="h-4 w-4 text-orange-500" />
      default: return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours} hours ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays} days ago`
    return time.toLocaleDateString()
  }

  // Real user data only - no demo fallbacks

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-foreground">
          {user ? `Welcome back, ${user.username}!` : 'Welcome to VPay'} 👋
        </h1>
        <p className="text-muted-foreground">
          Ready to earn, spend, and grow in the VPay ecosystem?
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground">
              {isConnected ? 'Connected' : 'Not connected'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              No active tasks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reward Points</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user?.rewardPoints || 0}</div>
            <p className="text-xs text-muted-foreground">
              {user?.tier || 'Bronze'} tier
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(user?.totalEarnings || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              All time earnings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button variant="vpay" className="h-20 flex-col space-y-2" asChild>
            <Link to="/send">
              <Wallet className="h-6 w-6" />
              <span>Send Payment</span>
            </Link>
          </Button>
          <Button variant="outline" className="h-20 flex-col space-y-2" asChild>
            <Link to="/tasks">
              <Briefcase className="h-6 w-6" />
              <span>Browse Tasks</span>
            </Link>
          </Button>
          <Button variant="outline" className="h-20 flex-col space-y-2" asChild>
            <Link to="/rewards">
              <Gift className="h-6 w-6" />
              <span>View Rewards</span>
            </Link>
          </Button>
          <Button variant="outline" className="h-20 flex-col space-y-2" asChild>
            <Link to="/profile">
              <TrendingUp className="h-6 w-6" />
              <span>Analytics</span>
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Wallet Connection */}
      {!isConnected && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
          <CardHeader>
            <CardTitle className="text-yellow-800 dark:text-yellow-200">
              Connect Your Wallet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-yellow-700 dark:text-yellow-300">
              Connect your wallet to start sending payments and earning rewards.
            </p>
            <RainbowKitConnectButton variant="default" size="lg" />
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            {activities.length > 0 && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/profile">View All</Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingActivities ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : activities.length > 0 ? (
            <div className="space-y-4">
              {activities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{activity.title}</p>
                      {activity.amount && (
                        <span className="text-green-600 dark:text-green-400 font-medium text-sm">
                          +{formatCurrency(activity.amount)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatTimeAgo(activity.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No recent activity</p>
              <p className="text-sm text-muted-foreground mt-2">
                Start using VPay to see your activity here
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
