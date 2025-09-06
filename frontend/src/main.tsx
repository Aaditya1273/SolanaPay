import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit'

// Import styles
import './index.css'
import '@rainbow-me/rainbowkit/styles.css'

// Import configurations and providers
import { config } from './config/wagmi'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import { WalletProvider } from './contexts/WalletContext'
import App from './App.tsx'


// Enhanced QueryClient with optimized configuration
const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      // Retry configuration
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false
        }
        // Retry up to 3 times for other errors
        return failureCount < 3
      },
      
      // Performance optimizations
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      
      // Network mode handling
      networkMode: 'online',
      
      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
      networkMode: 'online',
    },
  },
  // Enable query deduplication and background refetch
})

// RainbowKit Theme Provider Component
const RainbowKitThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useTheme()
  
  const rainbowKitTheme = theme === 'dark' 
    ? darkTheme({
        accentColor: 'hsl(var(--primary))',
        accentColorForeground: 'hsl(var(--primary-foreground))',
        borderRadius: 'medium',
        fontStack: 'system',
        overlayBlur: 'small',
      })
    : lightTheme({
        accentColor: 'hsl(var(--primary))',
        accentColorForeground: 'hsl(var(--primary-foreground))',
        borderRadius: 'medium',
        fontStack: 'system',
        overlayBlur: 'small',
      })

  return (
    <RainbowKitProvider theme={rainbowKitTheme} showRecentTransactions={true}>
      {children}
    </RainbowKitProvider>
  )
}

// Enhanced Toaster Configuration
const toasterConfig = {
  position: 'top-right' as const,
  reverseOrder: false,
  gutter: 8,
  containerClassName: '',
  containerStyle: {},
  toastOptions: {
    duration: 4000,
    style: {
      background: 'hsl(var(--card))',
      color: 'hsl(var(--card-foreground))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      fontSize: '14px',
      maxWidth: '400px',
    },
    success: {
      iconTheme: {
        primary: '#10b981',
        secondary: '#ffffff',
      },
      style: {
        border: '1px solid #10b981',
      },
    },
    error: {
      iconTheme: {
        primary: '#ef4444',
        secondary: '#ffffff',
      },
      style: {
        border: '1px solid #ef4444',
      },
    },
    loading: {
      iconTheme: {
        primary: 'hsl(var(--primary))',
        secondary: '#ffffff',
      },
    },
  },
}

// Main App Component with all providers
const AppWithProviders: React.FC = () => {
  const queryClient = React.useMemo(() => createQueryClient(), [])

  return (
    <React.StrictMode>
        <BrowserRouter 
          future={{ 
            v7_startTransition: true, 
            v7_relativeSplatPath: true 
          }}
        >
          <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
              <ThemeProvider>
                <RainbowKitThemeProvider>
                  <WalletProvider>
                    <AuthProvider>
                      <App />
                      <Toaster {...toasterConfig} />
                    </AuthProvider>
                  </WalletProvider>
                </RainbowKitThemeProvider>
              </ThemeProvider>
            </QueryClientProvider>
          </WagmiProvider>
        </BrowserRouter>
    </React.StrictMode>
  )
}

// Performance monitoring (optional)
const enablePerformanceMonitoring = () => {
  if (process.env.NODE_ENV === 'development' && 'performance' in window) {
    // Log performance metrics
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        console.log('Performance Metrics:', {
          'DOM Content Loaded': perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
          'Load Complete': perfData.loadEventEnd - perfData.loadEventStart,
          'First Paint': performance.getEntriesByType('paint')[0]?.startTime,
          'Largest Contentful Paint': performance.getEntriesByType('largest-contentful-paint')[0]?.startTime,
        })
      }, 0)
    })
  }
}

// Singleton root instance to prevent multiple createRoot calls
let rootInstance: ReactDOM.Root | null = null

// Initialize the application
const initializeApp = () => {
  const rootElement = document.getElementById('root')
  
  if (!rootElement) {
    throw new Error('Root element not found. Make sure you have a div with id="root" in your HTML.')
  }

  // Only create root if it doesn't exist
  if (!rootInstance) {
    // Enable performance monitoring in development
    enablePerformanceMonitoring()

    // Create root and render app
    rootInstance = ReactDOM.createRoot(rootElement)
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason)
      // Prevent the default browser behavior
      event.preventDefault()
    })

    // Handle global errors
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error)
    })
  }
  
  rootInstance.render(<AppWithProviders />)
}

// Start the application
initializeApp()

export default AppWithProviders