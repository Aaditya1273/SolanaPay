import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

interface WalletInfo {
  evmAddress?: string
  solanaAddress?: string
  isLinked: boolean
}

const CrossChainWallet: React.FC = () => {
  const { user, generateSolanaWallet } = useAuth()
  const [walletInfo, setWalletInfo] = useState<WalletInfo>({
    isLinked: false
  })
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    if (user) {
      setWalletInfo({
        evmAddress: user.walletAddress,
        solanaAddress: user.solanaWalletAddress,
        isLinked: !!(user.walletAddress && user.solanaWalletAddress)
      })
    }
  }, [user])

  const handleGenerateSolanaWallet = async () => {
    if (!user?.walletAddress) {
      toast.error('Please connect your EVM wallet first')
      return
    }

    try {
      setIsGenerating(true)
      const solanaAddress = await generateSolanaWallet()
      
      setWalletInfo(prev => ({
        ...prev,
        solanaAddress,
        isLinked: true
      }))
    } catch (error) {
      console.error('Failed to generate Solana wallet:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Cross-Chain Wallet</h2>
        {walletInfo.isLinked && (
          <div className="flex items-center text-green-600">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">Linked</span>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* EVM Wallet */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Ethereum Wallet</h3>
                <p className="text-sm text-gray-500">EVM Compatible</p>
              </div>
            </div>
            {walletInfo.evmAddress && (
              <button
                onClick={() => copyToClipboard(walletInfo.evmAddress!, 'EVM address')}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            )}
          </div>
          {walletInfo.evmAddress ? (
            <div className="bg-gray-50 rounded-md p-3">
              <p className="text-sm font-mono text-gray-700 break-all">
                {walletInfo.evmAddress}
              </p>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm">No EVM wallet connected</p>
            </div>
          )}
        </div>

        {/* Solana Wallet */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.5 2L2 12.5l10.5 10.5L23 12.5 12.5 2zM12.5 4.5L20.5 12.5 12.5 20.5 4.5 12.5 12.5 4.5z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Solana Wallet</h3>
                <p className="text-sm text-gray-500">Generated from EVM</p>
              </div>
            </div>
            {walletInfo.solanaAddress && (
              <button
                onClick={() => copyToClipboard(walletInfo.solanaAddress!, 'Solana address')}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            )}
          </div>
          {walletInfo.solanaAddress ? (
            <div className="bg-gray-50 rounded-md p-3">
              <p className="text-sm font-mono text-gray-700 break-all">
                {walletInfo.solanaAddress}
              </p>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm mb-3">
                Generate a Solana wallet linked to your EVM address
              </p>
              <button
                onClick={handleGenerateSolanaWallet}
                disabled={!walletInfo.evmAddress || isGenerating}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Generate Solana Wallet
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Cross-Chain Features */}
        {walletInfo.isLinked && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Cross-Chain Features</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center p-3 bg-white rounded-md">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Unified Identity</p>
                  <p className="text-xs text-gray-500">Single login across chains</p>
                </div>
              </div>
              
              <div className="flex items-center p-3 bg-white rounded-md">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Cross-Chain Sync</p>
                  <p className="text-xs text-gray-500">Synchronized balances</p>
                </div>
              </div>
              
              <div className="flex items-center p-3 bg-white rounded-md">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Secure Linking</p>
                  <p className="text-xs text-gray-500">Cryptographically verified</p>
                </div>
              </div>
              
              <div className="flex items-center p-3 bg-white rounded-md">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Multi-Chain Rewards</p>
                  <p className="text-xs text-gray-500">Earn across ecosystems</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CrossChainWallet
