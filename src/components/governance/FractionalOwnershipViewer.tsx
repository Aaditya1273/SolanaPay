"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  VStack,
  HStack,
  SimpleGrid,
  Progress,
  Button,
  Icon,
  Badge,
  Divider,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useColorModeValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  NumberInput,
  NumberInputField,
  FormControl,
  FormLabel,
  useToast,
  Tooltip,
  CircularProgress,
  CircularProgressLabel,
} from "@chakra-ui/react";
import {
  FaCoins,
  FaUsers,
  FaChartPie,
  FaMoneyBillWave,
  FaPlus,
  FaMinus,
  FaExchangeAlt,
  FaGift,
  FaHistory,
} from "react-icons/fa";

interface FractionalAsset {
  id: string;
  name: string;
  description: string;
  assetType: string;
  location: string;
  totalSupply: number;
  circulatingSupply: number;
  totalValue: number;
  pricePerShare: number;
  userBalance: number;
  ownershipPercentage: number;
  lastValuationUpdate: Date;
  createdAt: Date;
  isActive: boolean;
  governanceContract: string;
  unclaimedDividends: number;
  totalDividendsEarned: number;
  lastDividendClaim: Date;
  imageUrl: string;
}

interface DividendHistory {
  id: string;
  assetId: string;
  amount: number;
  perShareAmount: number;
  distributedAt: Date;
  claimed: boolean;
  claimedAt?: Date;
}

interface FractionalOwnershipViewerProps {
  assetId?: string;
}

export default function FractionalOwnershipViewer({ assetId }: FractionalOwnershipViewerProps) {
  const [assets, setAssets] = useState<FractionalAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<FractionalAsset | null>(null);
  const [dividendHistory, setDividendHistory] = useState<DividendHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [purchaseAmount, setPurchaseAmount] = useState<number>(0);
  
  const { isOpen: isBuyOpen, onOpen: onBuyOpen, onClose: onBuyClose } = useDisclosure();
  const { isOpen: isSellOpen, onOpen: onSellOpen, onClose: onSellClose } = useDisclosure();
  const toast = useToast();
  
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  // Mock data initialization
  useEffect(() => {
    const mockAssets: FractionalAsset[] = [
      {
        id: "1",
        name: "Manhattan Office Complex",
        description: "Premium commercial real estate in the heart of Manhattan's financial district",
        assetType: "Real Estate",
        location: "New York, NY",
        totalSupply: 10000,
        circulatingSupply: 8500,
        totalValue: 5800000,
        pricePerShare: 580,
        userBalance: 250,
        ownershipPercentage: 2.94,
        lastValuationUpdate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        isActive: true,
        governanceContract: "0x1234567890123456789012345678901234567890",
        unclaimedDividends: 1250,
        totalDividendsEarned: 8750,
        lastDividendClaim: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400",
      },
      {
        id: "2",
        name: "Carbon Credit Portfolio A",
        description: "Diversified portfolio of verified carbon credits from renewable energy projects",
        assetType: "Carbon Credits",
        location: "Global",
        totalSupply: 5000,
        circulatingSupply: 4600,
        totalValue: 750000,
        pricePerShare: 163,
        userBalance: 500,
        ownershipPercentage: 10.87,
        lastValuationUpdate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        isActive: true,
        governanceContract: "0x2345678901234567890123456789012345678901",
        unclaimedDividends: 2100,
        totalDividendsEarned: 5600,
        lastDividendClaim: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        imageUrl: "https://images.unsplash.com/photo-1569163139394-de4e4f43e4e3?w=400",
      },
      {
        id: "3",
        name: "Gold Reserve Fund",
        description: "Physical gold reserves stored in secure vaults with full insurance coverage",
        assetType: "Precious Metals",
        location: "London, UK",
        totalSupply: 8000,
        circulatingSupply: 7200,
        totalValue: 2000000,
        pricePerShare: 278,
        userBalance: 100,
        ownershipPercentage: 1.39,
        lastValuationUpdate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
        isActive: true,
        governanceContract: "0x3456789012345678901234567890123456789012",
        unclaimedDividends: 0,
        totalDividendsEarned: 1200,
        lastDividendClaim: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        imageUrl: "https://images.unsplash.com/photo-1610375461246-83df859d849d?w=400",
      },
    ];

    const mockDividends: DividendHistory[] = [
      {
        id: "1",
        assetId: "1",
        amount: 25000,
        perShareAmount: 2.94,
        distributedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        claimed: true,
        claimedAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
      },
      {
        id: "2",
        assetId: "2",
        amount: 15000,
        perShareAmount: 3.26,
        distributedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        claimed: false,
      },
      {
        id: "3",
        assetId: "1",
        amount: 30000,
        per ShareAmount: 3.53,
        distributedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        claimed: false,
      },
    ];

    setAssets(mockAssets);
    setDividendHistory(mockDividends);
    
    if (assetId) {
      const asset = mockAssets.find(a => a.id === assetId);
      if (asset) setSelectedAsset(asset);
    }
  }, [assetId]);

  const handleBuyShares = async () => {
    if (!selectedAsset || purchaseAmount <= 0) return;
    
    setIsLoading(true);
    
    // Simulate transaction
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const totalCost = purchaseAmount * selectedAsset.pricePerShare;
    
    // Update asset data
    setAssets(prev => prev.map(asset => {
      if (asset.id === selectedAsset.id) {
        const newBalance = asset.userBalance + purchaseAmount;
        return {
          ...asset,
          userBalance: newBalance,
          ownershipPercentage: (newBalance / asset.totalSupply) * 100,
          circulatingSupply: asset.circulatingSupply + purchaseAmount,
        };
      }
      return asset;
    }));
    
    toast({
      title: "Shares Purchased",
      description: `Successfully purchased ${purchaseAmount} shares for $${totalCost.toLocaleString()}`,
      status: "success",
      duration: 5000,
      isClosable: true,
    });
    
    setIsLoading(false);
    onBuyClose();
    setPurchaseAmount(0);
  };

  const handleSellShares = async () => {
    if (!selectedAsset || purchaseAmount <= 0 || purchaseAmount > selectedAsset.userBalance) return;
    
    setIsLoading(true);
    
    // Simulate transaction
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const totalValue = purchaseAmount * selectedAsset.pricePerShare;
    
    // Update asset data
    setAssets(prev => prev.map(asset => {
      if (asset.id === selectedAsset.id) {
        const newBalance = asset.userBalance - purchaseAmount;
        return {
          ...asset,
          userBalance: newBalance,
          ownershipPercentage: (newBalance / asset.totalSupply) * 100,
          circulatingSupply: asset.circulatingSupply - purchaseAmount,
        };
      }
      return asset;
    }));
    
    toast({
      title: "Shares Sold",
      description: `Successfully sold ${purchaseAmount} shares for $${totalValue.toLocaleString()}`,
      status: "success",
      duration: 5000,
      isClosable: true,
    });
    
    setIsLoading(false);
    onSellClose();
    setPurchaseAmount(0);
  };

  const handleClaimDividends = async (assetId: string) => {
    setIsLoading(true);
    
    // Simulate claiming dividends
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;
    
    const claimedAmount = asset.unclaimedDividends;
    
    // Update asset data
    setAssets(prev => prev.map(a => {
      if (a.id === assetId) {
        return {
          ...a,
          unclaimedDividends: 0,
          totalDividendsEarned: a.totalDividendsEarned + claimedAmount,
          lastDividendClaim: new Date(),
        };
      }
      return a;
    }));
    
    toast({
      title: "Dividends Claimed",
      description: `Successfully claimed $${claimedAmount.toLocaleString()} in dividends`,
      status: "success",
      duration: 5000,
      isClosable: true,
    });
    
    setIsLoading(false);
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(2)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount.toLocaleString()}`;
  };

  const getAssetTypeColor = (assetType: string) => {
    switch (assetType.toLowerCase()) {
      case "real estate":
        return "blue";
      case "carbon credits":
        return "green";
      case "precious metals":
        return "yellow";
      default:
        return "purple";
    }
  };

  const totalPortfolioValue = assets.reduce((sum, asset) => 
    sum + (asset.userBalance * asset.pricePerShare), 0
  );
  
  const totalUnclaimedDividends = assets.reduce((sum, asset) => 
    sum + asset.unclaimedDividends, 0
  );

  return (
    <VStack spacing={6} align="stretch">
      {/* Portfolio Overview */}
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
        <Stat
          textAlign="center"
          bg={cardBg}
          p={4}
          rounded="lg"
          border="1px solid"
          borderColor={borderColor}
          shadow="sm"
        >
          <StatLabel>Portfolio Value</StatLabel>
          <StatNumber color="green.500">{formatCurrency(totalPortfolioValue)}</StatNumber>
          <StatHelpText>Total holdings</StatHelpText>
        </Stat>

        <Stat
          textAlign="center"
          bg={cardBg}
          p={4}
          rounded="lg"
          border="1px solid"
          borderColor={borderColor}
          shadow="sm"
        >
          <StatLabel>Assets Owned</StatLabel>
          <StatNumber color="blue.500">{assets.length}</StatNumber>
          <StatHelpText>Fractional positions</StatHelpText>
        </Stat>

        <Stat
          textAlign="center"
          bg={cardBg}
          p={4}
          rounded="lg"
          border="1px solid"
          borderColor={borderColor}
          shadow="sm"
        >
          <StatLabel>Unclaimed Dividends</StatLabel>
          <StatNumber color="purple.500">{formatCurrency(totalUnclaimedDividends)}</StatNumber>
          <StatHelpText>Ready to claim</StatHelpText>
        </Stat>

        <Stat
          textAlign="center"
          bg={cardBg}
          p={4}
          rounded="lg"
          border="1px solid"
          borderColor={borderColor}
          shadow="sm"
        >
          <StatLabel>Total Dividends</StatLabel>
          <StatNumber color="green.500">
            {formatCurrency(assets.reduce((sum, asset) => sum + asset.totalDividendsEarned, 0))}
          </StatNumber>
          <StatHelpText>All time</StatHelpText>
        </Stat>
      </SimpleGrid>

      {/* Assets Grid */}
      <SimpleGrid columns={{ base: 1, lg: 2, xl: 3 }} spacing={6}>
        {assets.map((asset) => (
          <Card
            key={asset.id}
            bg={cardBg}
            border="1px solid"
            borderColor={borderColor}
            shadow="md"
            _hover={{ shadow: "lg", transform: "translateY(-2px)" }}
            transition="all 0.2s"
            cursor="pointer"
            onClick={() => setSelectedAsset(asset)}
          >
            <CardHeader pb={2}>
              <VStack align="stretch" spacing={3}>
                <HStack justify="space-between" align="start">
                  <VStack align="start" spacing={1}>
                    <Badge
                      colorScheme={getAssetTypeColor(asset.assetType)}
                      variant="solid"
                    >
                      {asset.assetType}
                    </Badge>
                    <Heading size="md" noOfLines={2}>
                      {asset.name}
                    </Heading>
                    <Text fontSize="sm" color="gray.600">
                      {asset.location}
                    </Text>
                  </VStack>
                  
                  <CircularProgress
                    value={asset.ownershipPercentage}
                    size="60px"
                    color={getAssetTypeColor(asset.assetType)}
                  >
                    <CircularProgressLabel fontSize="xs">
                      {asset.ownershipPercentage.toFixed(1)}%
                    </CircularProgressLabel>
                  </CircularProgress>
                </HStack>
              </VStack>
            </CardHeader>

            <CardBody pt={0}>
              <VStack align="stretch" spacing={4}>
                <Text fontSize="sm" color="gray.600" noOfLines={2}>
                  {asset.description}
                </Text>

                <Divider />

                {/* Holdings Info */}
                <SimpleGrid columns={2} spacing={4}>
                  <VStack align="start" spacing={1}>
                    <Text fontSize="xs" color="gray.500">Your Shares</Text>
                    <Text fontWeight="bold">{asset.userBalance.toLocaleString()}</Text>
                  </VStack>
                  <VStack align="start" spacing={1}>
                    <Text fontSize="xs" color="gray.500">Share Price</Text>
                    <Text fontWeight="bold">${asset.pricePerShare}</Text>
                  </VStack>
                  <VStack align="start" spacing={1}>
                    <Text fontSize="xs" color="gray.500">Your Value</Text>
                    <Text fontWeight="bold" color="green.500">
                      {formatCurrency(asset.userBalance * asset.pricePerShare)}
                    </Text>
                  </VStack>
                  <VStack align="start" spacing={1}>
                    <Text fontSize="xs" color="gray.500">Total Supply</Text>
                    <Text fontWeight="bold">{asset.totalSupply.toLocaleString()}</Text>
                  </VStack>
                </SimpleGrid>

                {/* Dividends */}
                {asset.unclaimedDividends > 0 && (
                  <Box bg="green.50" p={3} rounded="md" border="1px solid" borderColor="green.200">
                    <HStack justify="space-between" align="center">
                      <VStack align="start" spacing={0}>
                        <Text fontSize="sm" fontWeight="bold" color="green.700">
                          Unclaimed Dividends
                        </Text>
                        <Text fontSize="lg" fontWeight="bold" color="green.600">
                          ${asset.unclaimedDividends.toLocaleString()}
                        </Text>
                      </VStack>
                      <Button
                        size="sm"
                        colorScheme="green"
                        leftIcon={<Icon as={FaGift} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClaimDividends(asset.id);
                        }}
                        isLoading={isLoading}
                      >
                        Claim
                      </Button>
                    </HStack>
                  </Box>
                )}

                {/* Action Buttons */}
                <HStack spacing={2}>
                  <Button
                    size="sm"
                    colorScheme="blue"
                    variant="outline"
                    flex={1}
                    leftIcon={<Icon as={FaPlus} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAsset(asset);
                      onBuyOpen();
                    }}
                  >
                    Buy
                  </Button>
                  <Button
                    size="sm"
                    colorScheme="red"
                    variant="outline"
                    flex={1}
                    leftIcon={<Icon as={FaMinus} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAsset(asset);
                      onSellOpen();
                    }}
                    isDisabled={asset.userBalance === 0}
                  >
                    Sell
                  </Button>
                </HStack>

                {/* Supply Progress */}
                <VStack align="stretch" spacing={1}>
                  <HStack justify="space-between" fontSize="xs">
                    <Text color="gray.500">Circulating Supply</Text>
                    <Text color="gray.500">
                      {asset.circulatingSupply.toLocaleString()} / {asset.totalSupply.toLocaleString()}
                    </Text>
                  </HStack>
                  <Progress
                    value={(asset.circulatingSupply / asset.totalSupply) * 100}
                    colorScheme={getAssetTypeColor(asset.assetType)}
                    size="sm"
                    rounded="full"
                  />
                </VStack>
              </VStack>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      {/* Buy Shares Modal */}
      <Modal isOpen={isBuyOpen} onClose={onBuyClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Buy Shares - {selectedAsset?.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Number of Shares</FormLabel>
                <NumberInput
                  value={purchaseAmount}
                  onChange={(_, value) => setPurchaseAmount(value || 0)}
                  min={1}
                >
                  <NumberInputField placeholder="Enter number of shares" />
                </NumberInput>
              </FormControl>

              {selectedAsset && purchaseAmount > 0 && (
                <Box bg="blue.50" p={3} rounded="md">
                  <VStack align="stretch" spacing={2}>
                    <HStack justify="space-between">
                      <Text fontSize="sm">Share Price:</Text>
                      <Text fontSize="sm" fontWeight="bold">
                        ${selectedAsset.pricePerShare}
                      </Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="sm">Total Cost:</Text>
                      <Text fontSize="lg" fontWeight="bold" color="blue.600">
                        ${(purchaseAmount * selectedAsset.pricePerShare).toLocaleString()}
                      </Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="sm">New Ownership:</Text>
                      <Text fontSize="sm" fontWeight="bold">
                        {(((selectedAsset.userBalance + purchaseAmount) / selectedAsset.totalSupply) * 100).toFixed(2)}%
                      </Text>
                    </HStack>
                  </VStack>
                </Box>
              )}

              <HStack spacing={3}>
                <Button variant="outline" onClick={onBuyClose} flex={1}>
                  Cancel
                </Button>
                <Button
                  colorScheme="blue"
                  flex={1}
                  onClick={handleBuyShares}
                  isLoading={isLoading}
                  isDisabled={purchaseAmount <= 0}
                >
                  Buy Shares
                </Button>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Sell Shares Modal */}
      <Modal isOpen={isSellOpen} onClose={onSellClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Sell Shares - {selectedAsset?.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Number of Shares</FormLabel>
                <NumberInput
                  value={purchaseAmount}
                  onChange={(_, value) => setPurchaseAmount(value || 0)}
                  min={1}
                  max={selectedAsset?.userBalance || 0}
                >
                  <NumberInputField placeholder="Enter number of shares" />
                </NumberInput>
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Available: {selectedAsset?.userBalance.toLocaleString()} shares
                </Text>
              </FormControl>

              {selectedAsset && purchaseAmount > 0 && (
                <Box bg="red.50" p={3} rounded="md">
                  <VStack align="stretch" spacing={2}>
                    <HStack justify="space-between">
                      <Text fontSize="sm">Share Price:</Text>
                      <Text fontSize="sm" fontWeight="bold">
                        ${selectedAsset.pricePerShare}
                      </Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="sm">Total Value:</Text>
                      <Text fontSize="lg" fontWeight="bold" color="red.600">
                        ${(purchaseAmount * selectedAsset.pricePerShare).toLocaleString()}
                      </Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="sm">Remaining Ownership:</Text>
                      <Text fontSize="sm" fontWeight="bold">
                        {(((selectedAsset.userBalance - purchaseAmount) / selectedAsset.totalSupply) * 100).toFixed(2)}%
                      </Text>
                    </HStack>
                  </VStack>
                </Box>
              )}

              <HStack spacing={3}>
                <Button variant="outline" onClick={onSellClose} flex={1}>
                  Cancel
                </Button>
                <Button
                  colorScheme="red"
                  flex={1}
                  onClick={handleSellShares}
                  isLoading={isLoading}
                  isDisabled={purchaseAmount <= 0 || purchaseAmount > (selectedAsset?.userBalance || 0)}
                >
                  Sell Shares
                </Button>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
