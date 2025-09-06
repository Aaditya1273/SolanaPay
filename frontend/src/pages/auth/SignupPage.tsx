import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, EyeOff, Mail } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function SignupPage() {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<'signup' | 'verify'>('signup')
  const [otp, setOtp] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const navigate = useNavigate()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('http://localhost:3002/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          username: formData.username,
          password: formData.password
        }),
      })

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        console.error('JSON parsing error:', jsonError)
        toast.error('Server response error. Please try again.')
        return
      }

      if (response.ok && data.success) {
        toast.success('Account created! Please check your email for verification.')
        // Send OTP email
        await sendVerificationOTP()
        setStep('verify')
      } else {
        toast.error(data.message || 'Registration failed')
      }
    } catch (error) {
      console.error('Signup error:', error)
      toast.error('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const sendVerificationOTP = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/email/send-verification-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        toast.error(data.message || 'Failed to send verification email')
      }
    } catch (error) {
      console.error('OTP send error:', error)
      toast.error('Failed to send verification email')
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP')
      return
    }

    setOtpLoading(true)

    try {
      const response = await fetch('/api/email/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          otp: otp
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Email verified successfully!')
        navigate('/login')
      } else {
        toast.error(data.message || 'OTP verification failed')
      }
    } catch (error) {
      console.error('OTP verification error:', error)
      toast.error('Network error. Please try again.')
    } finally {
      setOtpLoading(false)
    }
  }

  const resendOTP = async () => {
    await sendVerificationOTP()
    toast.success('Verification code resent!')
  }

  if (step === 'verify') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md shadow-2xl border-0">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-semibold text-gray-900">Verify Your Email</CardTitle>
            <CardDescription className="text-gray-600">
              We've sent a 6-digit verification code to<br />
              <span className="font-semibold text-purple-600">{formData.email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="otp" className="text-sm font-medium text-gray-700">
                  Verification Code
                </label>
                <input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 text-center text-2xl font-mono tracking-widest placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-3 px-4 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={otpLoading || otp.length !== 6}
              >
                {otpLoading ? 'Verifying...' : 'Verify Email'}
              </button>
            </form>

            <div className="mt-6 text-center space-y-3">
              <p className="text-sm text-gray-600">
                Didn't receive the code?{' '}
                <button
                  onClick={resendOTP}
                  className="text-purple-600 hover:text-purple-700 font-semibold transition-colors"
                >
                  Resend
                </button>
              </p>
              <p className="text-sm text-gray-600">
                Want to use a different email?{' '}
                <button
                  onClick={() => setStep('signup')}
                  className="text-purple-600 hover:text-purple-700 font-semibold transition-colors"
                >
                  Go back
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">V</span>
          </div>
          <CardTitle className="text-2xl font-semibold text-gray-900">Create Account</CardTitle>
          <CardDescription className="text-gray-600">
            Join SolanaPay and start earning in the Web3 economy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="Choose a username"
                required
                minLength={3}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Create a password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Confirm your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-3 px-4 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-purple-600 hover:text-purple-700 font-semibold transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
