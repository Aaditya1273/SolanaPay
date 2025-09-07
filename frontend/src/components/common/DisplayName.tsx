import React, { useState, useEffect } from 'react'
import { PublicKey } from '@solana/web3.js'
import { snsService } from '@/services/snsService'
import { formatAddressSync } from '@/lib/utils'

interface DisplayNameProps {
  address: string | PublicKey
  showAvatar?: boolean
  showReputation?: boolean
  className?: string
  fallbackToAddress?: boolean
}

export const DisplayName: React.FC<DisplayNameProps> = ({
  address,
  showAvatar = false,
  showReputation = false,
  className = '',
  fallbackToAddress = true
}) => {
  const [displayName, setDisplayName] = useState<string>('')
  const [avatar, setAvatar] = useState<string>('')
  const [reputation, setReputation] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadDisplayName = async () => {
      try {
        setIsLoading(true)
        const addressStr = typeof address === 'string' ? address : address.toString()
        
        // Try SNS resolution
        const domain = await snsService.reverseLookup(addressStr)
        
        if (domain) {
          setDisplayName(domain)
          
          if (showAvatar || showReputation) {
            const profile = await snsService.getProfile(domain)
            if (profile) {
              setAvatar(profile.avatar || '')
              setReputation(profile.reputation)
            }
          }
        } else if (fallbackToAddress) {
          setDisplayName(formatAddressSync(addressStr))
        } else {
          setDisplayName('')
        }
      } catch (error) {
        console.error('Error loading display name:', error)
        if (fallbackToAddress) {
          const addressStr = typeof address === 'string' ? address : address.toString()
          setDisplayName(formatAddressSync(addressStr))
        }
      } finally {
        setIsLoading(false)
      }
    }

    if (address) {
      loadDisplayName()
    }
  }, [address, showAvatar, showReputation, fallbackToAddress])

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-20"></div>
      </div>
    )
  }

  if (!displayName) {
    return null
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showAvatar && avatar && (
        <span className="text-lg">{avatar}</span>
      )}
      
      <div className="flex flex-col">
        <span className="font-medium">{displayName}</span>
        
        {showReputation && reputation && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="text-yellow-500">⭐</span>
            <span>{reputation.score}</span>
            <span>•</span>
            <span>{reputation.level}</span>
            {reputation.badges.length > 0 && (
              <>
                <span>•</span>
                <span>{reputation.badges[0]}</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default DisplayName
