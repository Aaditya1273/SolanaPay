"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardBody,
  Heading,
  Text,
  Badge,
  HStack,
  VStack,
  SimpleGrid,
  Button,
  Image,
  Icon,
  useColorModeValue,
  Input,
  Select,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Flex,
  Spinner,
  InputGroup,
  InputLeftElement,
} from "@chakra-ui/react";
import {
  FaCertificate,
  FaHome,
  FaLeaf,
  FaGem,
  FaSearch,
  FaEye,
  FaSync,
  FaFilter,
} from "react-icons/fa";
import CertificateViewer from "./CertificateViewer";

interface CertificatePreview {
  tokenId: string;
  name: string;
  assetType: string;
  location: string;
  ownershipPercentage: number;
  currentPrice: number;
  riskScore: number;
  riskLevel: string;
  image: string;
  isActive: boolean;
  lastUpdated: Date;
}

const mockCertificates: CertificatePreview[] = [
  {
    tokenId: "1",
    name: "Manhattan Office Building",
    assetType: "Real Estate",
    location: "Manhattan, NY",
    ownershipPercentage: 25,
    currentPrice: 2500000,
    riskScore: 180,
    riskLevel: "Low",
    image: "https://certificates.omniflow.io/images/real-estate/1.png",
    isActive: true,
    lastUpdated: new Date(Date.now() - 300000),
  },
  {
    tokenId: "2",
    name: "Carbon Credits Batch #42",
    assetType: "Carbon Credits",
    location: "Amazon Rainforest",
    ownershipPercentage: 15,
    currentPrice: 150000,
    riskScore: 420,
    riskLevel: "Medium",
    image: "https://certificates.omniflow.io/images/carbon/2.png",
    isActive: true,
    lastUpdated: new Date(Date.now() - 600000),
  },
  {
    tokenId: "3",
    name: "Gold Reserve Vault #7",
    assetType: "Precious Metals",
    location: "Swiss Vault",
    ownershipPercentage: 8,
    currentPrice: 850000,
    riskScore: 95,
    riskLevel: "Very Low",
    image: "https://certificates.omniflow.io/images/metals/3.png",
    isActive: true,
    lastUpdated: new Date(Date.now() - 900000),
  },
  {
    tokenId: "4",
    name: "Solar Farm Project",
    assetType: "Renewable Energy",
    location: "California, USA",
    ownershipPercentage: 12,
    currentPrice: 320000,
    riskScore: 280,
    riskLevel: "Low",
    image: "https://certificates.omniflow.io/images/energy/4.png",
    isActive: true,
    lastUpdated: new Date(Date.now() - 1200000),
  },
  {
    tokenId: "5",
    name: "Luxury Apartment Complex",
    assetType: "Real Estate",
    location: "Miami, FL",
    ownershipPercentage: 30,
    currentPrice: 1800000,
    riskScore: 650,
    riskLevel: "High",
    image: "https://certificates.omniflow.io/images/real-estate/5.png",
    isActive: false,
    lastUpdated: new Date(Date.now() - 1800000),
  },
  {
    tokenId: "6",
    name: "Commodity Futures Bundle",
    assetType: "Commodities",
    location: "Global Markets",
    ownershipPercentage: 5,
    currentPrice: 75000,
    riskScore: 520,
    riskLevel: "Medium",
    image: "https://certificates.omniflow.io/images/commodities/6.png",
    isActive: true,
    lastUpdated: new Date(Date.now() - 450000),
  },
];

export default function CertificateGallery() {
  const [certificates, setCertificates] = useState<CertificatePreview[]>(mockCertificates);
  const [filteredCertificates, setFilteredCertificates] = useState<CertificatePreview[]>(mockCertificates);
  const [searchTerm, setSearchTerm] = useState("");
  const [assetTypeFilter, setAssetTypeFilter] = useState("all");
  const [riskLevelFilter, setRiskLevelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCertificate, setSelectedCertificate] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  const getAssetIcon = (assetType: string) => {
    switch (assetType.toLowerCase()) {
      case "real estate": return FaHome;
      case "carbon credits": return FaLeaf;
      case "precious metals": return FaGem;
      default: return FaCertificate;
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case "very low": return "green";
      case "low": return "blue";
      case "medium": return "yellow";
      case "high": return "orange";
      case "very high": return "red";
      default: return "gray";
    }
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

  const getTimeSinceUpdate = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  // Filter certificates based on search and filters
  useEffect(() => {
    let filtered = certificates;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(cert =>
        cert.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.assetType.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Asset type filter
    if (assetTypeFilter !== "all") {
      filtered = filtered.filter(cert => cert.assetType === assetTypeFilter);
    }

    // Risk level filter
    if (riskLevelFilter !== "all") {
      filtered = filtered.filter(cert => cert.riskLevel === riskLevelFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(cert => 
        statusFilter === "active" ? cert.isActive : !cert.isActive
      );
    }

    setFilteredCertificates(filtered);
  }, [certificates, searchTerm, assetTypeFilter, riskLevelFilter, statusFilter]);

  const refreshAllCertificates = async () => {
    setIsRefreshing(true);
    
    // Simulate API call to refresh all certificate data
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update certificates with new mock data
    setCertificates(prev => prev.map(cert => ({
      ...cert,
      currentPrice: cert.currentPrice + (Math.random() - 0.5) * (cert.currentPrice * 0.1),
      riskScore: Math.max(50, Math.min(900, cert.riskScore + (Math.random() - 0.5) * 50)),
      lastUpdated: new Date(),
    })));
    
    setIsRefreshing(false);
  };

  const viewCertificate = (tokenId: string) => {
    setSelectedCertificate(tokenId);
    onOpen();
  };

  const uniqueAssetTypes = [...new Set(certificates.map(cert => cert.assetType))];
  const uniqueRiskLevels = [...new Set(certificates.map(cert => cert.riskLevel))];

  return (
    <Box>
      <VStack spacing={6} w="full">
        {/* Header */}
        <HStack justify="space-between" w="full">
          <VStack align="start" spacing={1}>
            <Heading size="lg">My Certificate Portfolio</Heading>
            <Text color="gray.600">
              {filteredCertificates.length} of {certificates.length} certificates
            </Text>
          </VStack>
          <Button
            onClick={refreshAllCertificates}
            isLoading={isRefreshing}
            loadingText="Refreshing..."
            leftIcon={<Icon as={FaSync} />}
            colorScheme="purple"
          >
            Refresh All
          </Button>
        </HStack>

        {/* Filters */}
        <Card bg={cardBg} w="full" border="1px solid" borderColor={borderColor}>
          <CardBody>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
              <InputGroup>
                <InputLeftElement>
                  <Icon as={FaSearch} color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Search certificates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>

              <Select
                value={assetTypeFilter}
                onChange={(e) => setAssetTypeFilter(e.target.value)}
              >
                <option value="all">All Asset Types</option>
                {uniqueAssetTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </Select>

              <Select
                value={riskLevelFilter}
                onChange={(e) => setRiskLevelFilter(e.target.value)}
              >
                <option value="all">All Risk Levels</option>
                {uniqueRiskLevels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </Select>

              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </SimpleGrid>
          </CardBody>
        </Card>

        {/* Certificate Grid */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6} w="full">
          {filteredCertificates.map((certificate) => (
            <Card
              key={certificate.tokenId}
              bg={cardBg}
              border="1px solid"
              borderColor={borderColor}
              cursor="pointer"
              transition="all 0.2s"
              _hover={{ transform: "translateY(-2px)", shadow: "lg" }}
              opacity={certificate.isActive ? 1 : 0.7}
            >
              <CardBody>
                <VStack spacing={4} align="start">
                  {/* Certificate Image */}
                  <Box position="relative" w="full">
                    <Image
                      src={certificate.image}
                      alt={certificate.name}
                      w="full"
                      h="200px"
                      objectFit="cover"
                      rounded="md"
                      fallback={
                        <Flex
                          w="full"
                          h="200px"
                          bg="gray.100"
                          rounded="md"
                          align="center"
                          justify="center"
                          direction="column"
                        >
                          <Icon as={getAssetIcon(certificate.assetType)} boxSize={12} color="gray.400" />
                          <Text mt={2} color="gray.500" fontSize="sm">Certificate #{certificate.tokenId}</Text>
                        </Flex>
                      }
                    />
                    <HStack position="absolute" top={2} left={2} spacing={1}>
                      <Badge colorScheme="purple" size="sm">
                        #{certificate.tokenId}
                      </Badge>
                      <Badge colorScheme={certificate.isActive ? "green" : "red"} size="sm">
                        {certificate.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </HStack>
                    <Badge
                      position="absolute"
                      top={2}
                      right={2}
                      colorScheme={getRiskColor(certificate.riskLevel)}
                      size="sm"
                    >
                      {certificate.riskLevel} Risk
                    </Badge>
                  </Box>

                  {/* Certificate Info */}
                  <VStack spacing={2} align="start" w="full">
                    <HStack>
                      <Icon as={getAssetIcon(certificate.assetType)} color="purple.500" />
                      <Text fontWeight="semibold" fontSize="lg" noOfLines={1}>
                        {certificate.name}
                      </Text>
                    </HStack>

                    <HStack justify="space-between" w="full">
                      <Text fontSize="sm" color="gray.600">Asset Type:</Text>
                      <Badge colorScheme="blue" size="sm">{certificate.assetType}</Badge>
                    </HStack>

                    <HStack justify="space-between" w="full">
                      <Text fontSize="sm" color="gray.600">Location:</Text>
                      <Text fontSize="sm" noOfLines={1}>{certificate.location}</Text>
                    </HStack>

                    <HStack justify="space-between" w="full">
                      <Text fontSize="sm" color="gray.600">Ownership:</Text>
                      <Text fontSize="sm" fontWeight="semibold">{certificate.ownershipPercentage}%</Text>
                    </HStack>

                    <HStack justify="space-between" w="full">
                      <Text fontSize="sm" color="gray.600">Value:</Text>
                      <Text fontSize="sm" fontWeight="semibold" color="green.500">
                        {formatPrice((certificate.currentPrice * certificate.ownershipPercentage) / 100)}
                      </Text>
                    </HStack>

                    <HStack justify="space-between" w="full">
                      <Text fontSize="sm" color="gray.600">Last Updated:</Text>
                      <Text fontSize="sm">{getTimeSinceUpdate(certificate.lastUpdated)}</Text>
                    </HStack>
                  </VStack>

                  {/* Action Button */}
                  <Button
                    w="full"
                    size="sm"
                    leftIcon={<Icon as={FaEye} />}
                    onClick={() => viewCertificate(certificate.tokenId)}
                  >
                    View Certificate
                  </Button>
                </VStack>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>

        {/* Empty State */}
        {filteredCertificates.length === 0 && (
          <Card bg={cardBg} w="full" border="1px solid" borderColor={borderColor}>
            <CardBody>
              <VStack spacing={4} py={8}>
                <Icon as={FaCertificate} boxSize={16} color="gray.400" />
                <Heading size="md" color="gray.500">No Certificates Found</Heading>
                <Text color="gray.600" textAlign="center">
                  {certificates.length === 0 
                    ? "You don't have any certificates yet. Start by purchasing fractional ownership in RWA assets."
                    : "No certificates match your current filters. Try adjusting your search criteria."
                  }
                </Text>
                {certificates.length > 0 && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setSearchTerm("");
                      setAssetTypeFilter("all");
                      setRiskLevelFilter("all");
                      setStatusFilter("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </VStack>
            </CardBody>
          </Card>
        )}
      </VStack>

      {/* Certificate Detail Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="full">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Certificate Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody p={0}>
            {selectedCertificate && (
              <CertificateViewer tokenId={selectedCertificate} />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
