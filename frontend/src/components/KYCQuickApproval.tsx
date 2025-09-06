import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, AlertCircle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'

export default function KYCQuickApproval() {
  const { user, updateUser } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const handleKYCApproval = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3002/api'}/users/kyc`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('SolanaPay-token')}`
        },
        body: JSON.stringify({ status: 'approved' })
      })

      if (!response.ok) {
        throw new Error('Failed to update KYC status')
      }

      await response.json()
      
      // Update user context
      updateUser({ kycStatus: 'approved' })
      
      toast.success('KYC status approved! You can now post tasks.')
    } catch (error) {
      console.error('Error updating KYC:', error)
      toast.error('Failed to update KYC status')
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) return null

  const getStatusIcon = () => {
    switch (user.kycStatus) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'rejected':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusText = () => {
    switch (user.kycStatus) {
      case 'approved':
        return 'KYC Approved'
      case 'pending':
        return 'KYC Pending'
      case 'rejected':
        return 'KYC Rejected'
      default:
        return 'KYC Not Started'
    }
  }

  const getStatusColor = () => {
    switch (user.kycStatus) {
      case 'approved':
        return 'text-green-600 dark:text-green-400'
      case 'pending':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'rejected':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  return (
    <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {getStatusIcon()}
          <span className={getStatusColor()}>{getStatusText()}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {user.kycStatus !== 'approved' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {user.kycStatus === 'pending' 
                ? 'Your KYC verification is pending approval. For demo purposes, you can instantly approve it below.'
                : 'KYC verification is required to post tasks. For demo purposes, you can instantly approve your KYC below.'
              }
            </p>
            <Button 
              onClick={handleKYCApproval}
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {isLoading ? 'Approving...' : 'Instantly Approve KYC (Demo)'}
            </Button>
          </div>
        )}
        {user.kycStatus === 'approved' && (
          <p className="text-sm text-green-600 dark:text-green-400">
            ✅ Your KYC is approved! You can now post tasks and access all platform features.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
