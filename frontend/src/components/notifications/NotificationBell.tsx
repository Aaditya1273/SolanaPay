import React, { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { notificationService } from '../../services/notificationService'
import NotificationCenter from './NotificationCenter'

const NotificationBell: React.FC = () => {
  const { publicKey } = useWallet()
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (publicKey) {
      // Subscribe to notifications
      const unsubscribe = notificationService.subscribeToWallet(publicKey)
      
      // Listen for new notifications
      const removeListener = notificationService.addListener(() => {
        setUnreadCount(notificationService.getUnreadNotifications().length)
      })
      
      // Load initial unread count
      setUnreadCount(notificationService.getUnreadNotifications().length)
      
      return () => {
        unsubscribe()
        removeListener()
      }
    }
  }, [publicKey])

  if (!publicKey) return null

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 rounded-lg"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 00-15 0v5h5l-5 5-5-5h5V7a9.5 9.5 0 0119 0v10z"
          />
        </svg>
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <NotificationCenter
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}

export default NotificationBell
