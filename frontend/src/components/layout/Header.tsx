import { Bell, Menu, Search, User, LogOut, Settings, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useWallet } from '@/contexts/WalletContext'
import { formatAddress } from '@/lib/utils'
import { useState } from 'react'

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { account, isConnected } = useWallet()
  const [showUserMenu, setShowUserMenu] = useState(false)

  return (
    <header className="bg-background border-b border-border px-4 py-3 flex items-center justify-between">
      {/* Left Section */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="hidden lg:block">
          <h1 className="text-xl font-bold bg-gradient-to-r from-vpay-purple-500 to-vpay-purple-600 bg-clip-text text-transparent">
            VPay
          </h1>
        </div>
      </div>

      {/* Center Section - Search (Desktop only) */}
      <div className="hidden md:flex flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tasks, users, transactions..."
            className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-2">
        {/* Wallet Status */}
        {isConnected && account && (
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              {formatAddress(account)}
            </span>
          </div>
        )}

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="hidden sm:flex"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">
            3
          </span>
        </Button>

        {/* User Menu */}
        <div className="relative">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2"
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.username}
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <User className="h-4 w-4" />
            )}
            <span className="hidden sm:block text-sm">{user?.username || 'User'}</span>
            <ChevronDown className="h-3 w-3" />
          </Button>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-background border border-border rounded-lg shadow-lg z-50">
              <div className="py-1">
                <button
                  onClick={() => {
                    setShowUserMenu(false)
                    // Navigate to profile/settings
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <Settings className="h-4 w-4 mr-3" />
                  Settings
                </button>
                <hr className="my-1 border-border" />
                <button
                  onClick={() => {
                    setShowUserMenu(false)
                    logout()
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="h-4 w-4 mr-3" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
