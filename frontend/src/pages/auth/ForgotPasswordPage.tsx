import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, Lock, ArrowLeft } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'email' | 'verify' | 'reset'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/email/send-reset-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Password reset code sent to your email!')
        setStep('verify')
      } else {
        toast.error(data.message || 'Failed to send reset code')
      }
    } catch (error) {
      console.error('Send OTP error:', error)
      toast.error('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (otp.length !== 6) {
      toast.error('Please enter a valid 6-digit code')
      return
    }

    setStep('reset')
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/email/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          otp,
          newPassword
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Password reset successfully!')
        navigate('/login')
      } else {
        toast.error(data.message || 'Password reset failed')
      }
    } catch (error) {
      console.error('Password reset error:', error)
      toast.error('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const resendOTP = async () => {
    try {
      const response = await fetch('/api/email/send-reset-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      if (response.ok) {
        toast.success('Reset code resent!')
      }
    } catch (error) {
      toast.error('Failed to resend code')
    }
  }

  if (step === 'email') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <Card className="w-full max-w-md shadow-2xl border-0">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-[#5f259f] rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-semibold text-gray-900">Forgot Password?</CardTitle>
            <CardDescription className="text-gray-600">
              Enter your email address and we'll send you a reset code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendOTP} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#5f259f] focus:border-transparent transition-all"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#5f259f] hover:bg-[#4a1d7a] text-white py-3 px-4 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Reset Code'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="inline-flex items-center text-sm text-gray-600 hover:text-[#5f259f] transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === 'verify') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <Card className="w-full max-w-md shadow-2xl border-0">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-[#5f259f] rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-semibold text-gray-900">Check Your Email</CardTitle>
            <CardDescription className="text-gray-600">
              We've sent a 6-digit reset code to<br />
              <span className="font-semibold text-[#5f259f]">{email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="otp" className="text-sm font-medium text-gray-700">
                  Reset Code
                </label>
                <input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 text-center text-2xl font-mono tracking-widest placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5f259f] focus:border-transparent transition-all"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#5f259f] hover:bg-[#4a1d7a] text-white py-3 px-4 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={otp.length !== 6}
              >
                Verify Code
              </button>
            </form>

            <div className="mt-6 text-center space-y-3">
              <p className="text-sm text-gray-600">
                Didn't receive the code?{' '}
                <button
                  onClick={resendOTP}
                  className="text-[#5f259f] hover:text-[#4a1d7a] font-semibold transition-colors"
                >
                  Resend
                </button>
              </p>
              <Link
                to="/login"
                className="inline-flex items-center text-sm text-gray-600 hover:text-[#5f259f] transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-[#5f259f] rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-semibold text-gray-900">Reset Password</CardTitle>
          <CardDescription className="text-gray-600">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#5f259f] focus:border-transparent transition-all"
                placeholder="Enter new password"
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#5f259f] focus:border-transparent transition-all"
                placeholder="Confirm new password"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#5f259f] hover:bg-[#4a1d7a] text-white py-3 px-4 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
