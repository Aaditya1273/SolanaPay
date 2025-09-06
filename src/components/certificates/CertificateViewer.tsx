"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  Badge,
  HStack,
  VStack,
  Progress,
  Icon,
  useColorModeValue,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Button,
  Image,
  Divider,
  Tooltip,
  CircularProgress,
  CircularProgressLabel,
  Flex,
  Spinner,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import {
  FaCertificate,
  FaHome,
  FaLeaf,
  FaGem,
  FaChartLine,
  FaShieldAlt,
  FaSync,
  FaExternalLinkAlt,
  FaClock,
  FaMapMarkerAlt,
} from "react-icons/fa";

interface CertificateData {
  tokenId: string;
  name: string;
  description: string;
  image: string;
  animationUrl?: string;
  externalUrl?: string;
  attributes: {
    trait_type: string;
    value: string | number;
    display_type?: string;
    max_value?: number;
  }[];
  properties: {
    underlying_asset: string;
    underlying_token_id: number;
    created_at: number;
    last_price_update: number;
    last_risk_update: number;
    is_active: boolean;
  };
}

interface LiveData {
  currentPrice: number;
  priceChange24h: number;
  riskScore: number;
  lastUpdated: Date;
  isUpdating: boolean;
}

const mockCertificateData: CertificateData = {
  tokenId: "1",
  name: "RWA Certificate #1 - Real Estate",
  description: "Dynamic NFT certificate representing fractional ownership of real-world asset. This certificate updates in real-time with asset value, market prices, and risk assessments.",
  image: "https://certificates.omniflow.io/images/real-estate/1.png",
  animationUrl: "https://certificates.omniflow.io/animations/real-estate/1.html",
  externalUrl: "https://omniflow.io/certificate/1",
  attributes: [
    { trait_type: "Asset Type", value: "Real Estate" },
    { trait_type: "Location", value: "Manhattan, NY" },
    { trait_type: "Ownership Percentage", value: 25, display_type: "number", max_value: 100 },
    { trait_type: "Fraction Amount", value: 250 },
    { trait_type: "Total Fractions", value: 1000 },
    { trait_type: "Current Price", value: 2500000, display_type: "number" },
    { trait_type: "Risk Score", value: 180, display_type: "number", max_value: 1000 },
    { trait_type: "Risk Level", value: "Low" },
    { trait_type: "Last Updated", value: Date.now(), display_type: "date" },
    { trait_type: "Certificate ID", value: "1" },
  ],
  properties: {
    underlying_asset: "0x1234567890123456789012345678901234567890",
    underlying_token_id: 1,
    created_at: Date.now() - 86400000 * 30, // 30 days ago
    last_price_update: Date.now() - 300000, // 5 minutes ago
    last_risk_update: Date.now() - 1800000, // 30 minutes ago
    is_active: true,
  },
};

const mockLiveData: LiveData = {
  currentPrice: 2500000,
  priceChange24h: 2.5,
  riskScore: 180,
  lastUpdated: new Date(),
  isUpdating: false,
};

export default function CertificateViewer({ tokenId }: { tokenId: string }) {
  const [certificateData, setCertificateData] = useState<CertificateData>(mockCertificateData);
  const [liveData, setLiveData] = useState<LiveData>(mockLiveData);
  const [isLoading, setIsLoading] = useState(false);

  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const gradientBg = useColorModeValue(
    "linear(to-br, blue.50, purple.50)",
    "linear(to-br, gray.800, purple.900)"
  );

  const getAssetIcon = (assetType: string) => {
    switch (assetType.toLowerCase()) {
      case "real estate": return FaHome;
      case "carbon credits": return FaLeaf;
      case "precious metals": return FaGem;
      default: return FaCertificate;
    }
  };

  const getRiskColor = (riskScore: number) => {
    if (riskScore <= 100) return "green";
    if (riskScore <= 250) return "blue";
    if (riskScore <= 500) return "yellow";
    if (riskScore <= 750) return "orange";
    return "red";
  };

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(2)}M`;
    }
    if (price >= 1000) {
      return `$${(price / 1000).toFixed(0)}K`;
    }
    return `$${price.toLocaleString()}`;
  };

  const refreshData = async () => {
    setLiveData(prev => ({ ...prev, isUpdating: true }));
    
    // Simulate API call to refresh live data
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update with new mock data
    setLiveData({
      currentPrice: mockLiveData.currentPrice + (Math.random() - 0.5) * 100000,
      priceChange24h: (Math.random() - 0.5) * 10,
      riskScore: Math.max(50, Math.min(900, mockLiveData.riskScore + (Math.random() - 0.5) * 100)),
      lastUpdated: new Date(),
      isUpdating: false,
    });
  };

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(refreshData, 300000);
    return () => clearInterval(interval);
  }, []);

  const assetType = certificateData.attributes.find(attr => attr.trait_type === "Asset Type")?.value as string || "Unknown";
  const location = certificateData.attributes.find(attr => attr.trait_type === "Location")?.value as string || "Unknown";
  const ownershipPercentage = certificateData.attributes.find(attr => attr.trait_type === "Ownership Percentage")?.value as number || 0;
  const fractionAmount = certificateData.attributes.find(attr => attr.trait_type === "Fraction Amount")?.value as number || 0;
  const totalFractions = certificateData.attributes.find(attr => attr.trait_type === "Total Fractions")?.value as number || 0;

  return (
    <Box bg={gradientBg} minH="100vh" p={6}>
      <VStack spacing={6} maxW="6xl" mx="auto">
        {/* Header */}
        <Card bg={cardBg} w="full" border="1px solid" borderColor={borderColor}>
          <CardHeader>
            <HStack justify="space-between">
              <HStack>
                <Icon as={getAssetIcon(assetType)} boxSize={8} color="purple.500" />
                <VStack align="start" spacing={0}>
                  <Heading size="lg">{certificateData.name}</Heading>
                  <HStack>
                    <Badge colorScheme="purple">Certificate #{tokenId}</Badge>
                    <Badge colorScheme={certificateData.properties.is_active ? "green" : "red"}>
                      {certificateData.properties.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </HStack>
                </VStack>
              </HStack>
              <Button
                size="sm"
                onClick={refreshData}
                isLoading={liveData.isUpdating}
                leftIcon={<Icon as={FaSync} />}
              >
                Refresh
              </Button>
            </HStack>
          </CardHeader>
        </Card>

        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} w="full">
          {/* Certificate Visual */}
          <Card bg={cardBg} border="1px solid" borderColor={borderColor}>
            <CardBody>
              <VStack spacing={4}>
                <Box position="relative" w="full" maxW="400px">
                  <Image
                    src={certificateData.image}
                    alt={certificateData.name}
                    w="full"
                    h="300px"
                    objectFit="cover"
                    rounded="lg"
                    fallback={
                      <Flex
                        w="full"
                        h="300px"
                        bg="gray.100"
                        rounded="lg"
                        align="center"
                        justify="center"
                        direction="column"
                      >
                        <Icon as={getAssetIcon(assetType)} boxSize={16} color="gray.400" />
                        <Text mt={2} color="gray.500">Certificate Image</Text>
                      </Flex>
                    }
                  />
                  {liveData.isUpdating && (
                    <Box
                      position="absolute"
                      top={2}
                      right={2}
                      bg="white"
                      rounded="full"
                      p={2}
                      shadow="md"
                    >
                      <Spinner size="sm" color="purple.500" />
                    </Box>
                  )}
                </Box>

                <VStack spacing={2} w="full">
                  <HStack justify="space-between" w="full">
                    <Text fontSize="sm" color="gray.600">Asset Type:</Text>
                    <Badge colorScheme="blue">{assetType}</Badge>
                  </HStack>
                  <HStack justify="space-between" w="full">
                    <Text fontSize="sm" color="gray.600">Location:</Text>
                    <HStack>
                      <Icon as={FaMapMarkerAlt} color="gray.500" />
                      <Text fontSize="sm">{location}</Text>
                    </HStack>
                  </HStack>
                  <HStack justify="space-between" w="full">
                    <Text fontSize="sm" color="gray.600">Ownership:</Text>
                    <Text fontSize="sm" fontWeight="semibold">{ownershipPercentage}%</Text>
                  </HStack>
                </VStack>

                {certificateData.externalUrl && (
                  <Button
                    as="a"
                    href={certificateData.externalUrl}
                    target="_blank"
                    size="sm"
                    variant="outline"
                    leftIcon={<Icon as={FaExternalLinkAlt} />}
                    w="full"
                  >
                    View Full Details
                  </Button>
                )}
              </VStack>
            </CardBody>
          </Card>

          {/* Live Data & Metrics */}
          <VStack spacing={4}>
            {/* Price Information */}
            <Card bg={cardBg} w="full" border="1px solid" borderColor={borderColor}>
              <CardHeader>
                <HStack>
                  <Icon as={FaChartLine} color="green.500" />
                  <Heading size="md">Live Price Data</Heading>
                </HStack>
              </CardHeader>
              <CardBody>
                <VStack spacing={4}>
                  <HStack justify="space-between" w="full">
                    <Text fontSize="2xl" fontWeight="bold">
                      {formatPrice(liveData.currentPrice)}
                    </Text>
                    <Badge
                      colorScheme={liveData.priceChange24h >= 0 ? "green" : "red"}
                      fontSize="sm"
                    >
                      {liveData.priceChange24h >= 0 ? "+" : ""}{liveData.priceChange24h.toFixed(2)}%
                    </Badge>
                  </HStack>
                  
                  <SimpleGrid columns={2} spacing={4} w="full">
                    <Stat textAlign="center">
                      <StatLabel>Your Fraction</StatLabel>
                      <StatNumber fontSize="lg">{fractionAmount}</StatNumber>
                      <StatHelpText>of {totalFractions} total</StatHelpText>
                    </Stat>
                    <Stat textAlign="center">
                      <StatLabel>Your Value</StatLabel>
                      <StatNumber fontSize="lg">
                        {formatPrice((liveData.currentPrice * fractionAmount) / totalFractions)}
                      </StatNumber>
                      <StatHelpText>{ownershipPercentage}% ownership</StatHelpText>
                    </Stat>
                  </SimpleGrid>

                  <HStack justify="space-between" w="full" fontSize="sm" color="gray.600">
                    <HStack>
                      <Icon as={FaClock} />
                      <Text>Last updated:</Text>
                    </HStack>
                    <Text>{liveData.lastUpdated.toLocaleTimeString()}</Text>
                  </HStack>
                </VStack>
              </CardBody>
            </Card>

            {/* Risk Assessment */}
            <Card bg={cardBg} w="full" border="1px solid" borderColor={borderColor}>
              <CardHeader>
                <HStack>
                  <Icon as={FaShieldAlt} color={`${getRiskColor(liveData.riskScore)}.500`} />
                  <Heading size="md">Risk Assessment</Heading>
                </HStack>
              </CardHeader>
              <CardBody>
                <VStack spacing={4}>
                  <HStack justify="space-between" w="full">
                    <CircularProgress
                      value={100 - (liveData.riskScore / 10)}
                      color={getRiskColor(liveData.riskScore)}
                      size="80px"
                      thickness="8px"
                    >
                      <CircularProgressLabel fontSize="sm" fontWeight="bold">
                        {Math.round(100 - (liveData.riskScore / 10))}%
                      </CircularProgressLabel>
                    </CircularProgress>
                    <VStack align="end" spacing={1}>
                      <Text fontSize="lg" fontWeight="semibold">
                        Risk Score: {liveData.riskScore}/1000
                      </Text>
                      <Badge colorScheme={getRiskColor(liveData.riskScore)}>
                        {liveData.riskScore <= 100 ? "Very Low" :
                         liveData.riskScore <= 250 ? "Low" :
                         liveData.riskScore <= 500 ? "Medium" :
                         liveData.riskScore <= 750 ? "High" : "Very High"} Risk
                      </Badge>
                    </VStack>
                  </HStack>

                  <Progress
                    value={(liveData.riskScore / 1000) * 100}
                    colorScheme={getRiskColor(liveData.riskScore)}
                    size="sm"
                    w="full"
                  />

                  <Alert status={liveData.riskScore > 500 ? "warning" : "success"} size="sm">
                    <AlertIcon />
                    <Text fontSize="sm">
                      {liveData.riskScore <= 250 ? "Low risk investment with stable fundamentals" :
                       liveData.riskScore <= 500 ? "Moderate risk with regular monitoring recommended" :
                       "Higher risk investment requiring careful consideration"}
                    </Text>
                  </Alert>
                </VStack>
              </CardBody>
            </Card>
          </VStack>
        </SimpleGrid>

        {/* Certificate Attributes */}
        <Card bg={cardBg} w="full" border="1px solid" borderColor={borderColor}>
          <CardHeader>
            <Heading size="md">Certificate Attributes</Heading>
          </CardHeader>
          <CardBody>
            <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} spacing={4}>
              {certificateData.attributes.map((attr, index) => (
                <Box key={index} p={3} border="1px solid" borderColor={borderColor} rounded="md">
                  <Text fontSize="xs" color="gray.600" mb={1}>
                    {attr.trait_type}
                  </Text>
                  <Text fontSize="sm" fontWeight="semibold">
                    {attr.display_type === "date" 
                      ? new Date(attr.value as number).toLocaleDateString()
                      : attr.display_type === "number" && attr.max_value
                      ? `${attr.value}${attr.trait_type.includes("Percentage") ? "%" : ""}`
                      : attr.value
                    }
                  </Text>
                  {attr.display_type === "number" && attr.max_value && (
                    <Progress
                      value={((attr.value as number) / attr.max_value) * 100}
                      size="xs"
                      mt={1}
                      colorScheme="purple"
                    />
                  )}
                </Box>
              ))}
            </SimpleGrid>
          </CardBody>
        </Card>

        {/* Technical Details */}
        <Card bg={cardBg} w="full" border="1px solid" borderColor={borderColor}>
          <CardHeader>
            <Heading size="md">Technical Details</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={3} align="start">
              <HStack justify="space-between" w="full">
                <Text fontSize="sm" color="gray.600">Underlying Asset:</Text>
                <Text fontSize="sm" fontFamily="mono">
                  {certificateData.properties.underlying_asset.slice(0, 10)}...
                  {certificateData.properties.underlying_asset.slice(-8)}
                </Text>
              </HStack>
              <HStack justify="space-between" w="full">
                <Text fontSize="sm" color="gray.600">Underlying Token ID:</Text>
                <Text fontSize="sm">{certificateData.properties.underlying_token_id}</Text>
              </HStack>
              <HStack justify="space-between" w="full">
                <Text fontSize="sm" color="gray.600">Created:</Text>
                <Text fontSize="sm">
                  {new Date(certificateData.properties.created_at).toLocaleDateString()}
                </Text>
              </HStack>
              <HStack justify="space-between" w="full">
                <Text fontSize="sm" color="gray.600">Last Price Update:</Text>
                <Text fontSize="sm">
                  {new Date(certificateData.properties.last_price_update).toLocaleString()}
                </Text>
              </HStack>
              <HStack justify="space-between" w="full">
                <Text fontSize="sm" color="gray.600">Last Risk Update:</Text>
                <Text fontSize="sm">
                  {new Date(certificateData.properties.last_risk_update).toLocaleString()}
                </Text>
              </HStack>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
