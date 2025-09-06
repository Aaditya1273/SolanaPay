import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useWallet } from '../../contexts/WalletContext'
import { useTheme } from '../../contexts/ThemeContext'
import { formatAddress } from '../../lib/utils'
import { ChatWindowEnhanced } from '../chat/ChatWindowEnhanced'
import { ChatToggle } from '../chat/ChatToggle'
import PaymentChatNotifications from '../chat/PaymentChatNotifications'
import RealTimeChatWindow from '../chat/RealTimeChatWindow'
import { 
  Home, 
  Wallet, 
  Briefcase, 
  Gift, 
  User, 
  Menu, 
  X, 
  Sun, 
  Moon, 
  ChevronDown, 
  LogOut, 
  CreditCard, 
  DollarSign, 
  Shield, 
  MessageSquare, 
  HelpCircle,
  Users
} from 'lucide-react'

// Simple Button component
interface ButtonProps {
  children: React.ReactNode
  variant?: 'default' | 'ghost'
  size?: 'default' | 'icon'
  className?: string
  onClick?: () => void
  [key: string]: any
}

const Button = ({ 
  children, 
  variant = 'default', 
  size = 'default', 
  className = '', 
  onClick,
  ...props 
}: ButtonProps) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background'
  
  const variants = {
    default: 'bg-purple-600 text-white hover:bg-purple-700',
    ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800',
  }
  
  const sizes = {
    default: 'h-10 py-2 px-4',
    icon: 'h-10 w-10',
  }
  
  return (
    <button 
      className={`${baseClasses} ${variants[variant] || variants.default} ${sizes[size] || sizes.default} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  )
}

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const { user, logout } = useAuth()
  const { isConnected, account: address } = useWallet()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const isDarkMode = theme === 'dark'



  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const navigationItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Wallet', href: '/wallet', icon: Wallet },
    { name: 'Tasks', href: '/tasks', icon: Briefcase },
    { name: 'Rewards', href: '/rewards', icon: Gift },
    { name: 'Messages', href: '/messages', icon: MessageSquare },
    // { name: 'Gamification', href: '/gamification', icon: Trophy }, // Temporarily disabled
    { name: 'On-ramp', href: '/onramp-settlements', icon: CreditCard },
    { name: 'Settlements', href: '/settlements', icon: DollarSign },
    { name: 'Compliance', href: '/compliance', icon: Shield },
    { name: 'Profile', href: '/profile', icon: User },
  ]

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard'
    }
    return location.pathname.startsWith(href)
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
        {/* Navigation */}
        <nav className="bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
              {/* Logo */}
              <div className="flex items-center">
                <Link to="/" className="flex items-center space-x-3 group">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                      <span className="text-white font-black text-xl tracking-tight">V</span>
                    </div>
                    <div className="absolute -inset-0.5 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 rounded-xl opacity-20 group-hover:opacity-40 transition-opacity duration-300 blur-sm"></div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">SolanaPay</span>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 -mt-1 tracking-widest uppercase">Professional</span>
                  </div>
                </Link>
              </div>

              {/* Desktop Navigation - Icon Only Design */}
              <div className="hidden lg:flex items-center space-x-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon
                  
                  return (
                    <div key={item.name} className="relative group">
                      <Link
                        to={item.href}
                        className={`flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 group ${
                          isActiveRoute(item.href)
                            ? 'text-white bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg shadow-purple-500/30 scale-105'
                            : 'text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 hover:scale-105'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </Link>
                      
                      {/* Professional Tooltip */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 whitespace-nowrap shadow-lg">
                        {item.name}
                        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45"></div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Right side items */}
              <div className="flex items-center space-x-3">
                {/* Balance (if wallet connected) */}
                {isConnected && (
                  <div className="hidden sm:flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl border border-emerald-200/50 dark:border-emerald-700/50">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                      Connected
                    </span>
                  </div>
                )}

                {/* Payment Chat Notifications */}
                <PaymentChatNotifications />

                {/* Support Chat */}
                <div className="relative group">
                  <Link to="/support">
                    <Button variant="ghost" size="icon" className="relative">
                      <Users className="h-5 w-5" />
                    </Button>
                  </Link>
                  
                  {/* Tooltip */}
                  <div className="absolute right-0 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 whitespace-nowrap">
                    Customer Support
                  </div>
                </div>

                {/* Help & FAQ */}
                <div className="relative group">
                  <Link to="/help">
                    <Button variant="ghost" size="icon" className="relative">
                      <HelpCircle className="h-5 w-5" />
                    </Button>
                  </Link>
                  
                  {/* Tooltip */}
                  <div className="absolute right-0 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 whitespace-nowrap">
                    Help & FAQ
                  </div>
                </div>

                {/* Theme Toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400"
                >
                  {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>

                {/* User Menu */}
                <div className="relative group">
                  <button className="flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-all duration-200 group-hover:scale-105">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-950 flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {user?.username || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Professional
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-200" />
                  </button>

                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="py-1">
                      {address && (
                        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Wallet</p>
                          <p className="text-sm font-mono text-gray-900 dark:text-white">
                            {formatAddress(address)}
                          </p>
                        </div>
                      )}
                      <Link
                        to="/profile"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <User className="h-4 w-4 mr-2" />
                        Profile Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mobile menu button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                  {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <div className="px-2 pt-2 pb-3 space-y-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                        isActiveRoute(item.href)
                          ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20'
                          : 'text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}

                {/* Mobile wallet balance */}
                {isConnected && (
                  <div className="flex items-center space-x-3 px-3 py-2 mt-4 bg-purple-50 dark:bg-purple-900/20 rounded-md">
                    <Wallet className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <div>
                      <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                        Wallet Connected
                      </p>
                      {address && (
                        <p className="text-xs text-purple-600 dark:text-purple-400 font-mono">
                          {formatAddress(address)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* VeryChat Integration */}
        <ChatToggle 
          isOpen={isChatOpen} 
          onClick={() => setIsChatOpen(!isChatOpen)}
        />
        <ChatWindowEnhanced 
          isOpen={isChatOpen} 
          onClose={() => setIsChatOpen(false)}
        />
        
        {/* Real-time Chat Window (floating) */}
        <RealTimeChatWindow isOpen={false} onClose={() => {}} />

      </div>
    </div>
  )
}
