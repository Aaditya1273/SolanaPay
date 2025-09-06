import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { 
  Trophy, 
  Star, 
  Crown, 
  Gem, 
  Sparkles, 
  ExternalLink, 
  Eye,
  Award,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

interface NFTBadge {
  id: string;
  name: string;
  description: string;
  image: string;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';
  category: 'ACHIEVEMENT' | 'STREAK' | 'QUEST' | 'MILESTONE' | 'SPECIAL';
  metadata: any;
  mintCondition: any;
  isActive: boolean;
  createdAt: string;
}

interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  tokenId?: string;
  contractAddress?: string;
  txHash?: string;
  metadata: any;
  mintedAt: string;
  isVisible: boolean;
  badge: NFTBadge;
}

interface BadgeStats {
  total: number;
  minted: number;
  byRarity: Record<string, number>;
  byCategory: Record<string, number>;
  rarityScore: number;
}

const NFTBadgeCollection: React.FC = () => {
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [stats, setStats] = useState<BadgeStats | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<UserBadge | null>(null);
  const [loading, setLoading] = useState(true);
  const [minting, setMinting] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterRarity, setFilterRarity] = useState<string>('ALL');

  useEffect(() => {
    fetchUserBadges();
    fetchBadgeStats();
  }, []);

  const fetchUserBadges = async () => {
    try {
      const userId = 'current-user'; // This would come from auth context
      const params = new URLSearchParams();
      if (filterCategory !== 'ALL') params.append('category', filterCategory);
      if (filterRarity !== 'ALL') params.append('rarity', filterRarity);

      const response = await fetch(`/api/nft-badges/user/${userId}?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('SolanaPay-token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setUserBadges(data.data);
      }
    } catch (error) {
      console.error('Error fetching user badges:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBadgeStats = async () => {
    try {
      const userId = 'current-user'; // This would come from auth context
      const response = await fetch(`/api/nft-badges/user/${userId}/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('SolanaPay-token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching badge stats:', error);
    }
  };

  const mintBadgeAsNFT = async (badgeId: string) => {
    try {
      setMinting(badgeId);
      const response = await fetch(`/api/nft-badges/${badgeId}/mint`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('SolanaPay-token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success('Badge minted as NFT successfully!');
        fetchUserBadges();
        fetchBadgeStats();
      } else {
        toast.error(data.message || 'Failed to mint badge');
      }
    } catch (error) {
      console.error('Error minting badge:', error);
      toast.error('Failed to mint badge as NFT');
    } finally {
      setMinting(null);
    }
  };

  const getRarityColor = (rarity: string) => {
    const colors = {
      'COMMON': 'bg-gray-100 text-gray-800 border-gray-300',
      'RARE': 'bg-blue-100 text-blue-800 border-blue-300',
      'EPIC': 'bg-purple-100 text-purple-800 border-purple-300',
      'LEGENDARY': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'MYTHIC': 'bg-pink-100 text-pink-800 border-pink-300'
    };
    return colors[rarity as keyof typeof colors] || colors.COMMON;
  };

  const getRarityIcon = (rarity: string) => {
    const icons = {
      'COMMON': <Star className="h-4 w-4" />,
      'RARE': <Gem className="h-4 w-4" />,
      'EPIC': <Crown className="h-4 w-4" />,
      'LEGENDARY': <Trophy className="h-4 w-4" />,
      'MYTHIC': <Sparkles className="h-4 w-4" />
    };
    return icons[rarity as keyof typeof icons] || icons.COMMON;
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      'ACHIEVEMENT': <Award className="h-4 w-4" />,
      'STREAK': <TrendingUp className="h-4 w-4" />,
      'QUEST': <Trophy className="h-4 w-4" />,
      'MILESTONE': <Star className="h-4 w-4" />,
      'SPECIAL': <Sparkles className="h-4 w-4" />
    };
    return icons[category as keyof typeof icons] || icons.ACHIEVEMENT;
  };

  const BadgeCard: React.FC<{ userBadge: UserBadge }> = ({ userBadge }) => {
    const { badge } = userBadge;
    
    return (
      <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer">
        <CardContent className="p-4">
          <div className="relative">
            {/* Badge Image */}
            <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
              {badge.image ? (
                <img 
                  src={badge.image} 
                  alt={badge.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-6xl">
                  {getRarityIcon(badge.rarity)}
                </div>
              )}
            </div>

            {/* NFT Indicator */}
            {userBadge.tokenId && (
              <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                <Gem className="h-3 w-3" />
              </div>
            )}

            {/* Rarity Badge */}
            <Badge className={`absolute top-2 left-2 text-xs ${getRarityColor(badge.rarity)}`}>
              {getRarityIcon(badge.rarity)}
              {badge.rarity}
            </Badge>
          </div>

          {/* Badge Info */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm line-clamp-1">{badge.name}</h3>
            <p className="text-xs text-gray-600 line-clamp-2">{badge.description}</p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                {getCategoryIcon(badge.category)}
                {badge.category}
              </div>
              <div className="text-xs text-gray-500">
                {new Date(userBadge.mintedAt).toLocaleDateString()}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setSelectedBadge(userBadge)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                </DialogTrigger>
              </Dialog>

              {!userBadge.tokenId ? (
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => mintBadgeAsNFT(badge.id)}
                  disabled={minting === badge.id}
                >
                  {minting === badge.id ? 'Minting...' : 'Mint NFT'}
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => window.open(`https://opensea.io/assets/${userBadge.contractAddress}/${userBadge.tokenId}`, '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  OpenSea
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const BadgeDetailModal: React.FC = () => {
    if (!selectedBadge) return null;

    const { badge } = selectedBadge;

    return (
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getRarityIcon(badge.rarity)}
            {badge.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Badge Image */}
          <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
            {badge.image ? (
              <img 
                src={badge.image} 
                alt={badge.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-8xl">
                {getRarityIcon(badge.rarity)}
              </div>
            )}
          </div>

          {/* Badge Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className={getRarityColor(badge.rarity)}>
                {badge.rarity}
              </Badge>
              <Badge variant="outline">
                {getCategoryIcon(badge.category)}
                {badge.category}
              </Badge>
            </div>

            <p className="text-sm text-gray-600">{badge.description}</p>

            {/* Metadata */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Earned:</span>
                <span>{new Date(selectedBadge.mintedAt).toLocaleDateString()}</span>
              </div>
              
              {selectedBadge.tokenId && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Token ID:</span>
                    <span className="font-mono text-xs">{selectedBadge.tokenId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Contract:</span>
                    <span className="font-mono text-xs">
                      {selectedBadge.contractAddress?.slice(0, 6)}...{selectedBadge.contractAddress?.slice(-4)}
                    </span>
                  </div>
                </>
              )}

              {/* Dynamic Metadata */}
              {selectedBadge.metadata && Object.keys(selectedBadge.metadata).length > 0 && (
                <div className="border-t pt-2">
                  <h4 className="font-medium mb-2">Badge Attributes</h4>
                  {Object.entries(selectedBadge.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                      <span>{String(value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {!selectedBadge.tokenId ? (
                <Button 
                  className="flex-1"
                  onClick={() => mintBadgeAsNFT(badge.id)}
                  disabled={minting === badge.id}
                >
                  {minting === badge.id ? 'Minting...' : 'Mint as NFT'}
                </Button>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => window.open(`https://opensea.io/assets/${selectedBadge.contractAddress}/${selectedBadge.tokenId}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View on OpenSea
                  </Button>
                  {selectedBadge.txHash && (
                    <Button 
                      variant="outline"
                      onClick={() => window.open(`https://etherscan.io/tx/${selectedBadge.txHash}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    );
  };

  const StatsCards = () => {
    if (!stats) return null;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Badges</p>
                <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
              </div>
              <Trophy className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Minted NFTs</p>
                <p className="text-2xl font-bold text-green-600">{stats.minted}</p>
              </div>
              <Gem className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rarity Score</p>
                <p className="text-2xl font-bold text-purple-600">{stats.rarityScore}</p>
              </div>
              <Star className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Legendary+</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {(stats.byRarity.LEGENDARY || 0) + (stats.byRarity.MYTHIC || 0)}
                </p>
              </div>
              <Crown className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg aspect-square"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">NFT Badge Collection</h1>
        <p className="text-gray-600">Your earned badges and achievements as unique NFTs</p>
      </div>

      {/* Stats */}
      <StatsCards />

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex gap-2">
          <span className="text-sm font-medium text-gray-700">Category:</span>
          {['ALL', 'ACHIEVEMENT', 'STREAK', 'QUEST', 'MILESTONE', 'SPECIAL'].map((category) => (
            <button
              key={category}
              onClick={() => setFilterCategory(category)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                filterCategory === category
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        
        <div className="flex gap-2">
          <span className="text-sm font-medium text-gray-700">Rarity:</span>
          {['ALL', 'COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'].map((rarity) => (
            <button
              key={rarity}
              onClick={() => setFilterRarity(rarity)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                filterRarity === rarity
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {rarity}
            </button>
          ))}
        </div>
      </div>

      {/* Badge Grid */}
      {userBadges.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {userBadges.map((userBadge) => (
            <BadgeCard key={userBadge.id} userBadge={userBadge} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Badges Yet</h3>
            <p className="text-gray-600">Complete quests and achievements to earn your first badge!</p>
          </CardContent>
        </Card>
      )}

      {/* Badge Detail Modal */}
      <Dialog open={!!selectedBadge} onOpenChange={() => setSelectedBadge(null)}>
        <BadgeDetailModal />
      </Dialog>
    </div>
  );
};

export default NFTBadgeCollection;
