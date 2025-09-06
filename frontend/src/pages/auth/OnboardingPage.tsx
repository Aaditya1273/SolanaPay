import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useWallet } from '@/contexts/WalletContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Wallet, Shield, Gift, CheckCircle } from 'lucide-react'

const steps = [
  {
    id: 1,
    title: 'Welcome to VPay',
    description: 'Your Web3 micro-economy platform',
    icon: Gift,
    content: (
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-gradient-to-r from-vpay-purple-500 to-vpay-purple-600 rounded-full flex items-center justify-center mx-auto">
          <Gift className="h-10 w-10 text-white" />
        </div>
        <h3 className="text-xl font-semibold">Welcome to VPay!</h3>
        <p className="text-muted-foreground">
          VPay is your gateway to the Web3 economy. Earn tokens by completing tasks, 
          send instant payments, and unlock rewards as you engage with our community.
        </p>
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl">💰</span>
            </div>
            <p className="text-sm font-medium">Earn Tokens</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl">⚡</span>
            </div>
            <p className="text-sm font-medium">Instant Payments</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl">🎁</span>
            </div>
            <p className="text-sm font-medium">Unlock Rewards</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 2,
    title: 'Connect Your Wallet',
    description: 'Secure your digital assets',
    icon: Wallet,
    content: (
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto">
          <Wallet className="h-10 w-10 text-white" />
        </div>
        <h3 className="text-xl font-semibold">Connect Your Wallet</h3>
        <p className="text-muted-foreground">
          Connect your Web3 wallet to start sending and receiving payments. 
          Your wallet is your key to the decentralized economy.
        </p>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <Shield className="h-4 w-4 inline mr-2" />
            Your wallet remains under your control. VPay never stores your private keys.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 3,
    title: 'Get Your Welcome Bonus',
    description: 'Start with free tokens',
    icon: Gift,
    content: (
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto">
          <Gift className="h-10 w-10 text-white" />
        </div>
        <h3 className="text-xl font-semibold">Welcome Bonus!</h3>
        <p className="text-muted-foreground">
          Congratulations! You've earned your first 50 VRC tokens as a welcome bonus. 
          Use them to explore the platform and start your VPay journey.
        </p>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">+50 VRC</p>
            <p className="text-sm text-green-700 dark:text-green-300">Welcome Bonus</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 4,
    title: 'You\'re All Set!',
    description: 'Start exploring VPay',
    icon: CheckCircle,
    content: (
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-gradient-to-r from-vpay-purple-500 to-vpay-purple-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="h-10 w-10 text-white" />
        </div>
        <h3 className="text-xl font-semibold">You're All Set!</h3>
        <p className="text-muted-foreground">
          Your VPay account is ready. Start by exploring available tasks, 
          sending your first payment, or checking out the rewards store.
        </p>
        <div className="grid grid-cols-1 gap-3 mt-6">
          <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <span className="text-xl">💼</span>
            <div className="text-left">
              <p className="font-medium">Browse Tasks</p>
              <p className="text-sm text-muted-foreground">Find work that matches your skills</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <span className="text-xl">💸</span>
            <div className="text-left">
              <p className="font-medium">Send Payment</p>
              <p className="text-sm text-muted-foreground">Try instant crypto payments</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <span className="text-xl">🏆</span>
            <div className="text-left">
              <p className="font-medium">Earn Rewards</p>
              <p className="text-sm text-muted-foreground">Complete daily challenges</p>
            </div>
          </div>
        </div>
      </div>
    )
  }
]

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const navigate = useNavigate()
  const { updateUser } = useAuth()
  const { connectWallet, isConnected, isConnecting } = useWallet()

  const currentStepData = steps.find(step => step.id === currentStep)
  const progress = (currentStep / steps.length) * 100

  const handleNext = async () => {
    if (currentStep === 2 && !isConnected) {
      // Connect wallet step
      await connectWallet()
      return
    }

    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    } else {
      // Complete onboarding
      navigate('/')
    }
  }

  const handleSkip = () => {
    navigate('/')
  }

  const canProceed = currentStep !== 2 || isConnected

  return (
    <div className="min-h-screen bg-gradient-to-br from-vpay-purple-50 to-vpay-purple-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Step {currentStep} of {steps.length}</span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Content */}
        <Card className="mb-8">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2">
              {currentStepData && <currentStepData.icon className="h-6 w-6" />}
              <span>{currentStepData?.title}</span>
            </CardTitle>
            <CardDescription>{currentStepData?.description}</CardDescription>
          </CardHeader>
          <CardContent>
            {currentStepData?.content}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-muted-foreground"
          >
            Skip for now
          </Button>
          
          <div className="flex space-x-2">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
              >
                Back
              </Button>
            )}
            <Button
              variant="vpay"
              onClick={handleNext}
              disabled={!canProceed || isConnecting}
            >
              {currentStep === 2 && !isConnected
                ? isConnecting
                  ? 'Connecting...'
                  : 'Connect Wallet'
                : currentStep === steps.length
                ? 'Get Started'
                : 'Continue'
              }
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
