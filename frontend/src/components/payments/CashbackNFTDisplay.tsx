import React, { useState, useEffect } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { Metaplex } from '@metaplex-foundation/js'
import toast from 'react-hot-toast'

interface CashbackNFT {
  mint: string
  name: string
  description: string
  image: string
  attributes: Array<{
    trait_type: string
    value: string | number
  }>
  cashbackAmount: number
  paymentAmount: number
  tier: string
  mintedAt: number
}

interface CashbackNFTDisplayProps {
  onNFTClaim?: (nft: CashbackNFT) => void
}

const CashbackNFTDisplay: React.FC<CashbackNFTDisplayProps> = ({ onNFTClaim }) => {
  const { connection } = useConnection()
  const { publicKey } = useWallet()
  const [nfts, setNfts] = useState<CashbackNFT[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedNFT, setSelectedNFT] = useState<CashbackNFT | null>(null)

  useEffect(() => {
    if (publicKey) {
      loadCashbackNFTs()
    }
  }, [publicKey])

  const loadCashbackNFTs = async () => {
    if (!publicKey) return

    try {
      setIsLoading(true)
      const metaplex = Metaplex.make(connection)
      
      // Find all NFTs owned by the user
      const nfts = await metaplex.nfts().findAllByOwner({ owner: publicKey })
      
      // Filter for SolanaPay cashback NFTs
      const cashbackNFTs: CashbackNFT[] = []
      
      for (const nft of nfts) {
        if (nft.symbol === 'SPCB' && nft.name.includes('SolanaPay Cashback')) {
          try {
            // Load full metadata
            const fullNft = await metaplex.nfts().load({ metadata: nft })
            
            if (fullNft.json) {
              const attributes = fullNft.json.attributes || []
              const cashbackAmount = attributes.find(attr => attr.trait_type === 'Cashback Amount')?.value as number || 0
              const paymentAmount = attributes.find(attr => attr.trait_type === 'Payment Amount')?.value as number || 0
              const tier = attributes.find(attr => attr.trait_type === 'Tier')?.value as string || 'Bronze'
              const mintedAt = attributes.find(attr => attr.trait_type === 'Minted At')?.value as number || Date.now()

              cashbackNFTs.push({
                mint: nft.mintAddress.toString(),
                name: fullNft.json.name || nft.name,
                description: fullNft.json.description || '',
                image: fullNft.json.image || '',
                attributes: fullNft.json.attributes || [],
                cashbackAmount,
                paymentAmount,
                tier,
                mintedAt
              })
            }
          } catch (error) {
            console.error('Failed to load NFT metadata:', error)
          }
        }
      }
      
      // Sort by minted date (newest first)
      cashbackNFTs.sort((a, b) => b.mintedAt - a.mintedAt)
      setNfts(cashbackNFTs)
      
    } catch (error) {
      console.error('Failed to load cashback NFTs:', error)
      toast.error('Failed to load cashback NFTs')
    } finally {
      setIsLoading(false)
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'gold':
        return 'from-yellow-400 to-yellow-600'
      case 'silver':
        return 'from-gray-300 to-gray-500'
      case 'platinum':
        return 'from-purple-400 to-purple-600'
      default:
        return 'from-orange-400 to-orange-600' // Bronze
    }
  }

  const getTierIcon = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'gold':
        return '🥇'
      case 'silver':
        return '🥈'
      case 'platinum':
        return '💎'
      default:
        return '🥉' // Bronze
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleClaimRewards = (nft: CashbackNFT) => {
    onNFTClaim?.(nft)
    toast.success(`Claimed ${nft.cashbackAmount} SOL cashback!`)
  }

  if (!publicKey) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <p className="text-gray-500">Connect your wallet to view cashback NFTs</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-gray-500">Loading your cashback NFTs...</p>
      </div>
    )
  }

  if (nfts.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Cashback NFTs Yet</h3>
        <p className="text-gray-500 mb-4">Make payments of 10+ SOL to earn cashback NFTs</p>
        <div className="text-sm text-gray-400">
          <p>• Bronze: 1% cashback (10+ SOL)</p>
          <p>• Silver: 2% cashback (50+ SOL)</p>
          <p>• Gold: 3% cashback (100+ SOL)</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Cashback NFTs</h2>
        <button
          onClick={loadCashbackNFTs}
          className="text-purple-600 hover:text-purple-800 text-sm font-medium"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {nfts.map((nft) => (
          <div
            key={nft.mint}
            className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
            onClick={() => setSelectedNFT(nft)}
          >
            {/* NFT Image */}
            <div className={`h-48 bg-gradient-to-br ${getTierColor(nft.tier)} relative`}>
              {nft.image ? (
                <img
                  src={nft.image}
                  alt={nft.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-6xl">{getTierIcon(nft.tier)}</div>
                </div>
              )}
              
              {/* Tier Badge */}
              <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-xs font-medium">
                {nft.tier}
              </div>
            </div>

            {/* NFT Details */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-2 truncate">{nft.name}</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Cashback</span>
                  <span className="font-medium text-green-600">
                    {nft.cashbackAmount.toFixed(4)} SOL
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment</span>
                  <span className="font-medium">
                    {nft.paymentAmount.toFixed(2)} SOL
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Minted</span>
                  <span className="font-medium">
                    {formatDate(nft.mintedAt)}
                  </span>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleClaimRewards(nft)
                }}
                className="w-full mt-4 bg-purple-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-purple-700 transition-colors"
              >
                Claim Rewards
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* NFT Detail Modal */}
      {selectedNFT && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">{selectedNFT.name}</h3>
                <button
                  onClick={() => setSelectedNFT(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* NFT Image */}
              <div className={`h-64 bg-gradient-to-br ${getTierColor(selectedNFT.tier)} rounded-lg mb-4 relative`}>
                {selectedNFT.image ? (
                  <img
                    src={selectedNFT.image}
                    alt={selectedNFT.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center rounded-lg">
                    <div className="text-8xl">{getTierIcon(selectedNFT.tier)}</div>
                  </div>
                )}
              </div>

              {/* Description */}
              {selectedNFT.description && (
                <p className="text-gray-600 mb-4">{selectedNFT.description}</p>
              )}

              {/* Attributes */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Attributes</h4>
                {selectedNFT.attributes.map((attr, index) => (
                  <div key={index} className="flex justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <span className="text-gray-600">{attr.trait_type}</span>
                    <span className="font-medium">{attr.value}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => handleClaimRewards(selectedNFT)}
                  className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md font-medium hover:bg-purple-700 transition-colors"
                >
                  Claim {selectedNFT.cashbackAmount.toFixed(4)} SOL
                </button>
                <button
                  onClick={() => window.open(`https://explorer.solana.com/address/${selectedNFT.mint}`, '_blank')}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-md font-medium hover:bg-gray-200 transition-colors"
                >
                  View on Explorer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CashbackNFTDisplay
