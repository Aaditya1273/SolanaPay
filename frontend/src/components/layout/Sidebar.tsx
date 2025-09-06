import { NavLink } from 'react-router-dom'
import { X, Wallet, Briefcase, Gift, User, Home, Settings, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

interface SidebarProps {
  onClose?: () => void
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Wallet', href: '/wallet', icon: Wallet },
  { name: 'Tasks', href: '/tasks', icon: Briefcase },
  { name: 'Rewards', href: '/rewards', icon: Gift },
  { name: 'Profile', href: '/profile', icon: User },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function Sidebar({ onClose }: SidebarProps) {
  const { user, logout } = useAuth()

  return (
    <div className="flex flex-col h-full bg-background border-r border-border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-SolanaPay-purple-500 to-SolanaPay-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">V</span>
          </div>
          <span className="text-lg font-bold">SolanaPay</span>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-SolanaPay-purple-100 dark:bg-SolanaPay-purple-900 rounded-full flex items-center justify-center">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.username}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <User className="h-5 w-5 text-SolanaPay-purple-600 dark:text-SolanaPay-purple-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.username}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.tier || 'Bronze'} Member
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-SolanaPay-purple-100 dark:bg-SolanaPay-purple-900 text-SolanaPay-purple-700 dark:text-SolanaPay-purple-300'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
          onClick={logout}
        >
          <LogOut className="h-5 w-5 mr-3" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}
