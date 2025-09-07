import React, { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { toast } from 'react-hot-toast'
import wormholeBridgeService from '../../services/wormholeBridgeService'
import layerZeroBridgeService from '../../services/layerZeroBridgeService'
import assetConverterService from '../../services/assetConverterService'

interface BridgeStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'active' | 'completed' | 'failed'
  estimatedTime?: string
}

const CrossChainBridge: React.FC = () => {
  const { publicKey, connected } = useWallet()
  const [selectedSourceChain, setSelectedSourceChain] = useState<'ethereum' | 'polygon'>('ethereum')
  const [selectedToken, setSelectedToken] = useState('WETH')
  const [amount, setAmount] = useState('')
  const [bridgeProvider, setBridgeProvider] = useState<'wormhole' | 'layerzero'>('wormhole')
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [bridgeSteps, setBridgeSteps] = useState<BridgeStep[]>([])
  const [wrappedBalances, setWrappedBalances] = useState<Record<string, number>>({})
  const [conversionQuote, setConversionQuote] = useState<any>(null)

  // Initialize bridge steps
  useEffect(() => {
    setBridgeSteps([
      {
        id: 'approve',
        title: 'Approve Tokens',
        description: 'Approve tokens for bridge contract',
        status: 'pending',
        estimatedTime: '30s'
      },
      {
        id: 'bridge',
        title: 'Bridge Transfer',
        description: `Transfer tokens via ${bridgeProvider}`,
        status: 'pending',
        estimatedTime: '5-10 min'
      },
      {
        id: 'convert',
        title: 'Auto-Convert',
        description: 'Convert wrapped tokens to native Solana tokens',
        status: 'pending',
        estimatedTime: '10s'
      },
      {
        id: 'complete',
        title: 'Complete',
        description: 'Tokens ready in your Solana wallet',
        status: 'pending'
      }
    ])
  }, [bridgeProvider])

  // Load wrapped token balances
  useEffect(() => {
    if (connected && publicKey) {
      loadWrappedBalances()
    }
  }, [connected, publicKey])

  // Get conversion quote when amount changes
  useEffect(() => {
    if (amount && parseFloat(amount) > 0) {
      getConversionQuote()
    }
  }, [amount, selectedToken])

  const loadWrappedBalances = async () => {
    try {
      const balances = await assetConverterService.getWrappedTokenBalances({ publicKey })
      setWrappedBalances(balances)
    } catch (error) {
      console.error('Failed to load wrapped balances:', error)
    }
  }

  const getConversionQuote = async () => {
    try {
      const quote = await assetConverterService.getConversionQuote({
        sourceToken: selectedToken as any,
        amount: parseFloat(amount)
      })
      setConversionQuote(quote)
    } catch (error) {
      console.error('Failed to get conversion quote:', error)
      setConversionQuote(null)
    }
  }

  const getSupportedTokens = () => {
    if (bridgeProvider === 'wormhole') {
      return wormholeBridgeService.getSupportedTokens()[selectedSourceChain] || []
    } else {
      return [
        { symbol: 'USDC', address: '0x...', decimals: 6 },
        { symbol: 'USDT', address: '0x...', decimals: 6 }
      ]
    }
  }

  const updateStepStatus = (stepId: string, status: BridgeStep['status']) => {
    setBridgeSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status } : step
    ))
  }

  const executeOneClickBridge = async () => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet')
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    setIsProcessing(true)
    setCurrentStep(0)

    try {
      // Step 1: Approve tokens (simulated for demo)
      updateStepStatus('approve', 'active')
      toast.loading('Approving tokens...', { id: 'bridge-progress' })
      await new Promise(resolve => setTimeout(resolve, 2000))
      updateStepStatus('approve', 'completed')
      setCurrentStep(1)

      // Step 2: Bridge transfer
      updateStepStatus('bridge', 'active')
      toast.loading('Initiating bridge transfer...', { id: 'bridge-progress' })
      
      let bridgeResult
      if (bridgeProvider === 'wormhole') {
        bridgeResult = await wormholeBridgeService.completeBridgeTransfer({
          sourceChain: selectedSourceChain,
          targetChain: 'solana',
          tokenAddress: getSupportedTokens().find(t => t.symbol === selectedToken)?.address || '',
          amount,
          recipientAddress: publicKey.toString(),
          senderAddress: '0x...' // User's EVM address
        }, { publicKey })
      } else {
        // LayerZero bridge (simplified)
        bridgeResult = await layerZeroBridgeService.initiateTransfer({
          sourceChain: selectedSourceChain,
          targetChain: 'solana',
          tokenSymbol: selectedToken as any,
          amount,
          recipientAddress: publicKey.toString(),
          senderAddress: '0x...'
        }, null as any) // Signer would be provided
      }

      updateStepStatus('bridge', 'completed')
      setCurrentStep(2)
      toast.success('Bridge transfer completed!', { id: 'bridge-progress' })

      // Step 3: Auto-convert wrapped tokens
      updateStepStatus('convert', 'active')
      toast.loading('Converting to native tokens...', { id: 'bridge-progress' })
      
      const conversionResult = await assetConverterService.convertAsset({
        sourceToken: selectedToken as any,
        amount: parseFloat(amount)
      }, { publicKey })

      updateStepStatus('convert', 'completed')
      setCurrentStep(3)

      // Step 4: Complete
      updateStepStatus('complete', 'completed')
      toast.success(`Successfully bridged and converted ${amount} ${selectedToken}!`, { id: 'bridge-progress' })

      // Refresh balances
      await loadWrappedBalances()

    } catch (error) {
      console.error('Bridge failed:', error)
      const failedStep = bridgeSteps[currentStep]
      if (failedStep) {
        updateStepStatus(failedStep.id, 'failed')
      }
      toast.error(`Bridge failed: ${error.message}`, { id: 'bridge-progress' })
    } finally {
      setIsProcessing(false)
    }
  }

  const getStepIcon = (status: BridgeStep['status']) => {
    switch (status) {
      case 'completed':
        return <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">✓</div>
      case 'active':
        return <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white animate-spin">⟳</div>
      case 'failed':
        return <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white">✗</div>
      default:
        return <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600">{bridgeSteps.findIndex(s => s.id === status) + 1}</div>
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">One-Click Cross-Chain Bridge</h2>
        <p className="text-gray-600">Bridge assets from Ethereum/Polygon to Solana with automatic conversion</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Bridge Configuration */}
        <div className="space-y-6">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-4">Bridge Settings</h3>
            
            {/* Source Chain */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">From Chain</label>
              <select
                value={selectedSourceChain}
                onChange={(e) => setSelectedSourceChain(e.target.value as any)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ethereum">Ethereum</option>
                <option value="polygon">Polygon</option>
              </select>
            </div>

            {/* Bridge Provider */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Bridge Provider</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setBridgeProvider('wormhole')}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    bridgeProvider === 'wormhole'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-semibold">Wormhole</div>
                  <div className="text-xs text-gray-500">Most reliable</div>
                </button>
                <button
                  onClick={() => setBridgeProvider('layerzero')}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    bridgeProvider === 'layerzero'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-semibold">LayerZero</div>
                  <div className="text-xs text-gray-500">Lower fees</div>
                </button>
              </div>
            </div>

            {/* Token Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Token</label>
              <select
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {getSupportedTokens().map(token => (
                  <option key={token.symbol} value={token.symbol}>
                    {token.symbol}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-16"
                />
                <div className="absolute right-3 top-3 text-gray-500 font-medium">
                  {selectedToken}
                </div>
              </div>
            </div>

            {/* Conversion Quote */}
            {conversionQuote && (
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <h4 className="font-semibold text-blue-900 mb-2">Conversion Preview</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>You send:</span>
                    <span>{amount} {selectedToken}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>You receive:</span>
                    <span>{conversionQuote.targetAmount.toFixed(6)} {conversionQuote.targetToken}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Bridge + conversion fee:</span>
                    <span>{conversionQuote.feeAmount.toFixed(6)} {conversionQuote.targetToken}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Estimated time:</span>
                    <span>5-10 minutes</span>
                  </div>
                </div>
              </div>
            )}

            {/* Bridge Button */}
            <button
              onClick={executeOneClickBridge}
              disabled={!connected || isProcessing || !amount}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isProcessing ? 'Processing...' : 'Bridge & Convert'}
            </button>
          </div>

          {/* Wrapped Token Balances */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-4">Wrapped Token Balances</h3>
            <div className="space-y-2">
              {Object.entries(wrappedBalances).map(([token, balance]) => (
                <div key={token} className="flex justify-between items-center">
                  <span className="font-medium">{token}</span>
                  <span>{balance.toFixed(6)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bridge Progress */}
        <div className="space-y-6">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-6">Bridge Progress</h3>
            
            <div className="space-y-4">
              {bridgeSteps.map((step, index) => (
                <div key={step.id} className="flex items-start space-x-4">
                  {getStepIcon(step.status)}
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900">{step.title}</h4>
                      {step.estimatedTime && step.status === 'active' && (
                        <span className="text-xs text-gray-500">{step.estimatedTime}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{step.description}</p>
                    
                    {step.status === 'active' && (
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bridge Statistics */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-4">Bridge Statistics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">1,250</div>
                <div className="text-sm text-gray-600">Total Bridges</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">$2.5M</div>
                <div className="text-sm text-gray-600">Volume Bridged</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">5 min</div>
                <div className="text-sm text-gray-600">Avg. Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">99.8%</div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </div>
            </div>
          </div>

          {/* Supported Assets */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-4">Supported Assets</h3>
            <div className="grid grid-cols-3 gap-2">
              {['WETH', 'USDT', 'USDC', 'WBTC', 'DAI', 'LINK'].map(token => (
                <div key={token} className="bg-white p-3 rounded-lg text-center">
                  <div className="font-semibold">{token}</div>
                  <div className="text-xs text-gray-500">→ SOL/USDC</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CrossChainBridge
