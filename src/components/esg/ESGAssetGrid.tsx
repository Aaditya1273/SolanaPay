"use client";

import { useState, useEffect } from "react";
import {
  Box,
  SimpleGrid,
  VStack,
  HStack,
  Text,
  Image,
  Badge,
  Button,
  Icon,
  useColorModeValue,
  Skeleton,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Flex,
  Spacer,
} from "@chakra-ui/react";
import {
  FaSearch,
  FaMapMarkerAlt,
  FaDollarSign,
  FaChartLine,
  FaEye,
  FaHeart,
  FaShare,
} from "react-icons/fa";
import { AssetESGProfile, ESGFilter, esgService } from "../../services/esgService";
import ESGScoreCard from "./ESGScoreCard";

interface ESGAssetGridProps {
  filters: ESGFilter;
  searchTerm?: string;
  sortBy?: string;
  onAssetSelect?: (asset: AssetESGProfile) => void;
}

export default function ESGAssetGrid({ 
  filters, 
  searchTerm = "", 
  sortBy = "overall",
  onAssetSelect 
}: ESGAssetGridProps) {
  const [assets, setAssets] = useState<AssetESGProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const [localSortBy, setLocalSortBy] = useState(sortBy);

  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  useEffect(() => {
    loadAssets();
  }, [filters, localSearchTerm, localSortBy]);

  const loadAssets = async () => {
    setIsLoading(true);
    try {
      // Get filtered assets
      let filteredAssets = await esgService.searchAssetsByESG(filters);
      
      // Apply search term filter
      if (localSearchTerm) {
        filteredAssets = filteredAssets.filter(asset =>
          asset.assetId.toLowerCase().includes(localSearchTerm.toLowerCase()) ||
          asset.assetType.toLowerCase().includes(localSearchTerm.toLowerCase())
        );
      }

      // Apply sorting
      filteredAssets.sort((a, b) => {
        switch (localSortBy) {
          case 'overall':
            return b.esgScore.overall - a.esgScore.overall;
          case 'environmental':
            return b.esgScore.environmental - a.esgScore.environmental;
          case 'social':
            return b.esgScore.social - a.esgScore.social;
          case 'governance':
            return b.esgScore.governance - a.esgScore.governance;
          case 'name':
            return a.assetId.localeCompare(b.assetId);
          default:
            return b.esgScore.overall - a.esgScore.overall;
        }
      });

      setAssets(filteredAssets);
    } catch (error) {
      console.error('Error loading assets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAssetImage = (assetType: string) => {
    const images: { [key: string]: string } = {
      'real-estate': '/images/real-estate-placeholder.jpg',
      'renewable-energy': '/images/renewable-energy-placeholder.jpg',
      'carbon-credits': '/images/carbon-credits-placeholder.jpg',
      'agriculture': '/images/agriculture-placeholder.jpg',
      'transportation': '/images/transportation-placeholder.jpg',
      'manufacturing': '/images/manufacturing-placeholder.jpg',
      'infrastructure': '/images/infrastructure-placeholder.jpg',
      'forestry': '/images/forestry-placeholder.jpg'
    };
    return images[assetType] || '/images/default-asset-placeholder.jpg';
  };

  const getAssetTypeColor = (assetType: string) => {
    const colors: { [key: string]: string } = {
      'real-estate': 'blue',
      'renewable-energy': 'green',
      'carbon-credits': 'teal',
      'agriculture': 'orange',
      'transportation': 'purple',
      'manufacturing': 'gray',
      'infrastructure': 'cyan',
      'forestry': 'green'
    };
    return colors[assetType] || 'gray';
  };

  const formatAssetType = (assetType: string) => {
    return assetType.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getTopCertification = (certifications: any[]) => {
    if (certifications.length === 0) return null;
    return certifications.find(cert => cert.verified) || certifications[0];
  };

  if (isLoading) {
    return (
      <VStack spacing={6} align="stretch">
        {/* Search and Sort Controls Skeleton */}
        <HStack spacing={4}>
          <Skeleton height="40px" flex={1} />
          <Skeleton height="40px" width="200px" />
        </HStack>
        
        {/* Asset Grid Skeleton */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Box key={index} bg={cardBg} p={6} rounded="xl" border="1px solid" borderColor={borderColor}>
              <VStack spacing={4}>
                <Skeleton height="200px" width="100%" />
                <Skeleton height="20px" width="80%" />
                <Skeleton height="60px" width="100%" />
                <Skeleton height="40px" width="100%" />
              </VStack>
            </Box>
          ))}
        </SimpleGrid>
      </VStack>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Search and Sort Controls */}
      <Flex gap={4} align="center" wrap="wrap">
        <InputGroup flex={1} minW="300px">
          <InputLeftElement>
            <Icon as={FaSearch} color="gray.400" />
          </InputLeftElement>
          <Input
            placeholder="Search assets by name or type..."
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            bg="white"
          />
        </InputGroup>
        
        <Select
          value={localSortBy}
          onChange={(e) => setLocalSortBy(e.target.value)}
          width="200px"
          bg="white"
        >
          <option value="overall">Overall ESG Score</option>
          <option value="environmental">Environmental Score</option>
          <option value="social">Social Score</option>
          <option value="governance">Governance Score</option>
          <option value="name">Asset Name</option>
        </Select>
      </Flex>

      {/* Results Summary */}
      <HStack justify="space-between" align="center">
        <Text color="gray.600">
          {assets.length} assets found
        </Text>
        <Text fontSize="sm" color="gray.500">
          Sorted by {localSortBy.replace(/([A-Z])/g, ' $1').toLowerCase()}
        </Text>
      </HStack>

      {/* Asset Grid */}
      {assets.length === 0 ? (
        <Box
          bg={cardBg}
          p={12}
          rounded="xl"
          border="1px solid"
          borderColor={borderColor}
          textAlign="center"
        >
          <VStack spacing={4}>
            <Icon as={FaSearch} boxSize={12} color="gray.400" />
            <Text fontSize="lg" fontWeight="bold" color="gray.600">
              No assets found
            </Text>
            <Text color="gray.500">
              Try adjusting your filters or search terms
            </Text>
          </VStack>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {assets.map((asset) => {
            const topCert = getTopCertification(asset.certifications);
            
            return (
              <Box
                key={asset.assetId}
                bg={cardBg}
                rounded="xl"
                border="1px solid"
                borderColor={borderColor}
                overflow="hidden"
                shadow="md"
                _hover={{ shadow: "lg", transform: "translateY(-2px)" }}
                transition="all 0.2s"
                cursor="pointer"
                onClick={() => onAssetSelect?.(asset)}
              >
                <VStack spacing={0} align="stretch">
                  {/* Asset Image */}
                  <Box position="relative" height="200px">
                    <Image
                      src={getAssetImage(asset.assetType)}
                      alt={asset.assetId}
                      width="100%"
                      height="100%"
                      objectFit="cover"
                      fallback={
                        <Box
                          width="100%"
                          height="100%"
                          bg="gray.200"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Text color="gray.500">Asset Image</Text>
                        </Box>
                      }
                    />
                    
                    {/* Asset Type Badge */}
                    <Badge
                      position="absolute"
                      top={3}
                      left={3}
                      colorScheme={getAssetTypeColor(asset.assetType)}
                      variant="solid"
                    >
                      {formatAssetType(asset.assetType)}
                    </Badge>

                    {/* Top Certification Badge */}
                    {topCert && (
                      <Badge
                        position="absolute"
                        top={3}
                        right={3}
                        colorScheme="green"
                        variant="solid"
                        fontSize="xs"
                      >
                        {topCert.name}
                      </Badge>
                    )}

                    {/* Action Buttons */}
                    <HStack
                      position="absolute"
                      bottom={3}
                      right={3}
                      spacing={2}
                    >
                      <Button
                        size="sm"
                        colorScheme="whiteAlpha"
                        variant="solid"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle favorite
                        }}
                      >
                        <Icon as={FaHeart} />
                      </Button>
                      <Button
                        size="sm"
                        colorScheme="whiteAlpha"
                        variant="solid"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle share
                        }}
                      >
                        <Icon as={FaShare} />
                      </Button>
                    </HStack>
                  </Box>

                  {/* Asset Details */}
                  <VStack spacing={4} p={6} align="stretch">
                    {/* Asset Header */}
                    <VStack spacing={2} align="start">
                      <Text fontWeight="bold" fontSize="lg" noOfLines={1}>
                        {asset.assetId}
                      </Text>
                      <HStack spacing={4}>
                        <HStack spacing={1}>
                          <Icon as={FaMapMarkerAlt} color="gray.500" boxSize={3} />
                          <Text fontSize="sm" color="gray.600">
                            Global
                          </Text>
                        </HStack>
                        <HStack spacing={1}>
                          <Icon as={FaDollarSign} color="gray.500" boxSize={3} />
                          <Text fontSize="sm" color="gray.600">
                            ${(Math.random() * 1000000).toFixed(0)}
                          </Text>
                        </HStack>
                      </HStack>
                    </VStack>

                    {/* ESG Score Card */}
                    <ESGScoreCard 
                      esgScore={asset.esgScore} 
                      size="sm" 
                      showDetails={false}
                    />

                    {/* Key Metrics */}
                    <SimpleGrid columns={2} spacing={3}>
                      <VStack align="start" spacing={1}>
                        <Text fontSize="xs" color="gray.500">Carbon Impact</Text>
                        <Text fontSize="sm" fontWeight="bold" color="green.600">
                          -{asset.esgScore.impactMetrics.carbonFootprint.toFixed(1)} kg CO₂
                        </Text>
                      </VStack>
                      <VStack align="start" spacing={1}>
                        <Text fontSize="xs" color="gray.500">Jobs Created</Text>
                        <Text fontSize="sm" fontWeight="bold" color="blue.600">
                          {asset.esgScore.impactMetrics.jobsCreated}
                        </Text>
                      </VStack>
                    </SimpleGrid>

                    {/* Sustainability Goals Progress */}
                    {asset.sustainabilityGoals.length > 0 && (
                      <VStack align="start" spacing={2}>
                        <Text fontSize="xs" color="gray.500">Sustainability Goals</Text>
                        <HStack spacing={2} flexWrap="wrap">
                          {asset.sustainabilityGoals.slice(0, 2).map((goal) => (
                            <Badge
                              key={goal.id}
                              colorScheme={goal.progress >= 75 ? "green" : "yellow"}
                              variant="outline"
                              fontSize="xs"
                            >
                              {goal.progress}% {goal.title.split(' ')[0]}
                            </Badge>
                          ))}
                        </HStack>
                      </VStack>
                    )}

                    {/* Action Button */}
                    <Button
                      colorScheme="purple"
                      size="sm"
                      rightIcon={<Icon as={FaEye} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAssetSelect?.(asset);
                      }}
                    >
                      View Details
                    </Button>
                  </VStack>
                </VStack>
              </Box>
            );
          })}
        </SimpleGrid>
      )}
    </VStack>
  );
}
