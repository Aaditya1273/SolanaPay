import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import WalletConnect from '../components/WalletConnect'
import { WalletContext } from '../contexts/WalletContext'

// Mock ethers
vi.mock('ethers', () => ({
  BrowserProvider: vi.fn(),
  formatEther: vi.fn((value) => '1.0'),
}))

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockWalletContext = {
  isConnected: false,
  account: null,
  balance: '0',
  chainId: null,
  connectWallet: vi.fn(),
  disconnectWallet: vi.fn(),
  switchNetwork: vi.fn(),
}

const ConnectedWalletContext = {
  ...mockWalletContext,
  isConnected: true,
  account: '0x1234567890123456789012345678901234567890',
  balance: '1.5',
  chainId: 1,
}

describe('WalletConnect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders connect button when wallet is not connected', () => {
    render(
      <WalletContext.Provider value={mockWalletContext}>
        <WalletConnect />
      </WalletContext.Provider>
    )

    expect(screen.getByText('Connect Wallet')).toBeInTheDocument()
    expect(screen.getByText('Connect your Web3 wallet to get started')).toBeInTheDocument()
  })

  it('calls connectWallet when connect button is clicked', async () => {
    render(
      <WalletContext.Provider value={mockWalletContext}>
        <WalletConnect />
      </WalletContext.Provider>
    )

    const connectButton = screen.getByText('Connect Wallet')
    fireEvent.click(connectButton)

    await waitFor(() => {
      expect(mockWalletContext.connectWallet).toHaveBeenCalled()
    })
  })

  it('renders wallet info when connected', () => {
    render(
      <WalletContext.Provider value={ConnectedWalletContext}>
        <WalletConnect />
      </WalletContext.Provider>
    )

    expect(screen.getByText('0x1234...7890')).toBeInTheDocument()
    expect(screen.getByText('1.5 ETH')).toBeInTheDocument()
    expect(screen.getByText('Connected')).toBeInTheDocument()
  })

  it('shows copy address button when connected', () => {
    render(
      <WalletContext.Provider value={ConnectedWalletContext}>
        <WalletConnect />
      </WalletContext.Provider>
    )

    expect(screen.getByLabelText('Copy address')).toBeInTheDocument()
  })

  it('shows view on explorer button when connected', () => {
    render(
      <WalletContext.Provider value={ConnectedWalletContext}>
        <WalletConnect />
      </WalletContext.Provider>
    )

    expect(screen.getByLabelText('View on block explorer')).toBeInTheDocument()
  })

  it('calls disconnectWallet when disconnect button is clicked', async () => {
    render(
      <WalletContext.Provider value={ConnectedWalletContext}>
        <WalletConnect />
      </WalletContext.Provider>
    )

    const disconnectButton = screen.getByText('Disconnect')
    fireEvent.click(disconnectButton)

    await waitFor(() => {
      expect(ConnectedWalletContext.disconnectWallet).toHaveBeenCalled()
    })
  })

  it('copies address to clipboard when copy button is clicked', async () => {
    // Mock clipboard API
    const mockWriteText = vi.fn()
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    })

    render(
      <WalletContext.Provider value={ConnectedWalletContext}>
        <WalletConnect />
      </WalletContext.Provider>
    )

    const copyButton = screen.getByLabelText('Copy address')
    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(ConnectedWalletContext.account)
    })
  })

  it('opens block explorer when explorer button is clicked', () => {
    // Mock window.open
    const mockOpen = vi.fn()
    Object.assign(window, { open: mockOpen })

    render(
      <WalletContext.Provider value={ConnectedWalletContext}>
        <WalletConnect />
      </WalletContext.Provider>
    )

    const explorerButton = screen.getByLabelText('View on block explorer')
    fireEvent.click(explorerButton)

    expect(mockOpen).toHaveBeenCalledWith(
      `https://etherscan.io/address/${ConnectedWalletContext.account}`,
      '_blank'
    )
  })
})
