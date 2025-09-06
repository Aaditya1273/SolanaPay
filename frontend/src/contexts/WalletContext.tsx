import React, { createContext, useContext, useEffect, useState } from 'react'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'
import axios from 'axios'

interface WalletContextType {
  provider: ethers.BrowserProvider | null
  signer: ethers.JsonRpcSigner | null
  account: string | null
  balance: string
  isConnected: boolean
  isConnecting: boolean
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  switchNetwork: (chainId: string) => Promise<void>
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null)
  const [account, setAccount] = useState<string | null>(null)
  const [balance, setBalance] = useState<string>('0')
  const [isConnecting, setIsConnecting] = useState(false)

  const isConnected = !!account

  useEffect(() => {
    checkConnection()
    setupEventListeners()
  }, [])

  useEffect(() => {
    if (account && provider) {
      updateBalance()
    }
  }, [account, provider])

  const checkConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        // Check if MetaMask has connected accounts (non-intrusive)
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        
        if (accounts && accounts.length > 0) {
          const provider = new ethers.BrowserProvider(window.ethereum)
          const signer = await provider.getSigner()
          
          setProvider(provider)
          setSigner(signer)
          setAccount(accounts[0])
        }
      } catch (error) {
        // Silently handle connection check errors
        console.log('Wallet connection check skipped')
      }
    }
  }

  const setupEventListeners = () => {
    if (typeof window.ethereum !== 'undefined') {
      // Remove existing listeners to prevent duplicates
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
      window.ethereum.removeListener('chainChanged', handleChainChanged)
      window.ethereum.removeListener('disconnect', handleDisconnect)
      
      // Add new listeners
      window.ethereum.on('accountsChanged', handleAccountsChanged)
      window.ethereum.on('chainChanged', handleChainChanged)
      window.ethereum.on('disconnect', handleDisconnect)
    }
  }

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnectWallet()
    } else {
      setAccount(accounts[0])
    }
  }

  const handleChainChanged = () => {
    window.location.reload()
  }

  const handleDisconnect = () => {
    disconnectWallet()
  }

  const connectWallet = async () => {
    console.log('connectWallet called')
    console.log('window.ethereum:', typeof window.ethereum)
    
    if (typeof window.ethereum === 'undefined') {
      console.log('MetaMask not detected')
      toast.error('Please install MetaMask to use SolanaPay')
      window.open('https://metamask.io/download/', '_blank')
      return
    }

    try {
      setIsConnecting(true)
      console.log('Requesting accounts...')
      
      // Force MetaMask popup by checking if it's locked first
      try {
        // Try to get current accounts first
        const currentAccounts = await window.ethereum.request({ method: 'eth_accounts' })
        console.log('Current accounts before request:', currentAccounts)
      } catch (err) {
        console.log('Error checking current accounts:', err)
      }
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), 15000) // 15 seconds
      })
      
      // Request account access with timeout
      const accounts = await Promise.race([
        window.ethereum.request({ method: 'eth_requestAccounts' }),
        timeoutPromise
      ])
      
      console.log('Accounts received:', accounts)
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned')
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      
      console.log('Connected address:', address)
      
      setProvider(provider)
      setSigner(signer)
      setAccount(address)
      
      // Save wallet address to user profile
      await saveWalletToProfile(address)
      
      toast.success('Wallet connected successfully!')
    } catch (error: any) {
      console.error('Failed to connect wallet:', error)
      console.log('Error code:', error.code)
      console.log('Error message:', error.message)
      
      if (error.code === 4001) {
        toast.error('Connection rejected. Please approve the connection in MetaMask.')
      } else if (error.code === -32002) {
        toast.error('Connection request pending. Please open MetaMask and approve the connection.')
      } else if (error.message === 'Connection timeout') {
        toast.error('MetaMask not responding. Please unlock MetaMask and try again.')
      } else {
        toast.error(error.message || 'Failed to connect wallet')
      }
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = () => {
    setProvider(null)
    setSigner(null)
    setAccount(null)
    setBalance('0')
    toast.success('Wallet disconnected')
  }

  const switchNetwork = async (chainId: string) => {
    if (typeof window.ethereum === 'undefined') return

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      })
    } catch (error: any) {
      if (error.code === 4902) {
        toast.error('Please add this network to your wallet')
      } else {
        toast.error('Failed to switch network')
      }
    }
  }

  const saveWalletToProfile = async (walletAddress: string) => {
    try {
      const token = localStorage.getItem('SolanaPay-token')
      if (!token) return

      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/user/wallet`, {
        walletAddress
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch (error) {
      console.error('Failed to save wallet to profile:', error)
    }
  }


  const updateBalance = async () => {
    if (!provider || !account) return

    try {
      const balance = await provider.getBalance(account)
      setBalance(ethers.formatEther(balance))
    } catch (error) {
      console.error('Failed to update balance:', error)
      setBalance('0')
    }
  }

  return (
    <WalletContext.Provider
      value={{
        provider,
        signer,
        account,
        balance,
        isConnected,
        isConnecting,
        connectWallet,
        disconnectWallet,
        switchNetwork,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}
