"use client";

import { useState, useEffect } from "react";
import {
  VStack,
  HStack,
  Heading,
  Text,
  Box,
  SimpleGrid,
  Button,
  Icon,
  Badge,
  useColorModeValue,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
} from "@chakra-ui/react";
import { FaSearch, FaGlobe, FaCheck, FaMapMarkerAlt } from "react-icons/fa";
import { paymentService } from "../../../services/paymentService";
import { localizationService } from "../../../services/localizationService";

interface RegionSelectionStepProps {
  data: any;
  onComplete: (data: any) => void;
  onRegionChange: (region: string) => void;
}

export default function RegionSelectionStep({ 
  data, 
  onComplete, 
  onRegionChange 
}: RegionSelectionStepProps) {
  const [selectedRegion, setSelectedRegion] = useState(data.region || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [detectedRegion, setDetectedRegion] = useState('');
  
  const cardBg = useColorModeValue("white", "gray.800");
  const t = localizationService.t;

  const regions = [
    {
      code: 'US',
      name: 'United States',
      flag: '🇺🇸',
      currency: 'USD',
      paymentMethods: ['Card', 'Bank Transfer', 'ACH'],
      providers: ['Ramp', 'MoonPay', 'Transak'],
      features: ['Full KYC', 'High Limits', 'Institutional Support']
    },
    {
      code: 'IN',
      name: 'India',
      flag: '🇮🇳',
      currency: 'INR',
      paymentMethods: ['UPI', 'Card', 'Net Banking'],
      providers: ['Razorpay', 'Ramp', 'Transak'],
      features: ['UPI Integration', 'Aadhaar KYC', 'Local Support']
    },
    {
      code: 'KE',
      name: 'Kenya',
      flag: '🇰🇪',
      currency: 'KES',
      paymentMethods: ['M-Pesa', 'Card', 'Bank Transfer'],
      providers: ['M-Pesa Gateway'],
      features: ['Mobile Money', 'Fast KYC', 'Low Fees']
    },
    {
      code: 'BR',
      name: 'Brazil',
      flag: '🇧🇷',
      currency: 'BRL',
      paymentMethods: ['PIX', 'Card', 'Bank Transfer'],
      providers: ['MoonPay', 'Transak'],
      features: ['PIX Integration', 'CPF KYC', 'Portuguese Support']
    },
    {
      code: 'EU',
      name: 'European Union',
      flag: '🇪🇺',
      currency: 'EUR',
      paymentMethods: ['SEPA', 'Card', 'Bank Transfer'],
      providers: ['Ramp', 'MoonPay', 'Transak'],
      features: ['SEPA Integration', 'GDPR Compliant', 'Multi-language']
    },
    {
      code: 'UK',
      name: 'United Kingdom',
      flag: '🇬🇧',
      currency: 'GBP',
      paymentMethods: ['Card', 'Bank Transfer', 'Faster Payments'],
      providers: ['Ramp', 'MoonPay'],
      features: ['FCA Regulated', 'Faster Payments', 'Local Support']
    }
  ];

  useEffect(() => {
    // Detect user's region on component mount
    const detectRegion = async () => {
      const detected = await paymentService.detectUserRegion();
      setDetectedRegion(detected);
      
      if (!selectedRegion) {
        setSelectedRegion(detected);
      }
    };
    
    detectRegion();
  }, [selectedRegion]);

  const handleRegionSelect = (regionCode: string) => {
    setSelectedRegion(regionCode);
    onRegionChange(regionCode);
    
    // Update locale based on region
    const regionConfig = paymentService.getRegionConfig(regionCode);
    if (regionConfig) {
      localizationService.setLocale(regionConfig.language);
    }
    
    // Complete step with selected region
    onComplete({ region: regionCode });
  };

  const filteredRegions = regions.filter(region =>
    region.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    region.currency.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <VStack spacing={8} align="stretch">
      {/* Header */}
      <VStack spacing={4} textAlign="center">
        <Icon as={FaGlobe} boxSize={12} color="blue.500" />
        <Heading size="lg" color="gray.800">
          {t('onboarding.selectRegion')}
        </Heading>
        <Text color="gray.600" maxW="2xl">
          {t('onboarding.regionDescription')}
        </Text>
      </VStack>

      {/* Detected Region Notice */}
      {detectedRegion && (
        <Box
          bg="blue.50"
          p={4}
          rounded="lg"
          border="1px solid"
          borderColor="blue.200"
        >
          <HStack>
            <Icon as={FaMapMarkerAlt} color="blue.500" />
            <Text color="blue.700">
              <Text as="span" fontWeight="bold">Detected location:</Text>{" "}
              {regions.find(r => r.code === detectedRegion)?.name || detectedRegion}
            </Text>
          </HStack>
        </Box>
      )}

      {/* Search */}
      <InputGroup>
        <InputLeftElement>
          <Icon as={FaSearch} color="gray.400" />
        </InputLeftElement>
        <Input
          placeholder="Search regions or currencies..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          bg="white"
        />
      </InputGroup>

      {/* Region Grid */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
        {filteredRegions.map((region) => (
          <Box
            key={region.code}
            bg={cardBg}
            p={6}
            rounded="xl"
            border="2px solid"
            borderColor={selectedRegion === region.code ? "purple.500" : "gray.200"}
            shadow={selectedRegion === region.code ? "lg" : "md"}
            cursor="pointer"
            onClick={() => handleRegionSelect(region.code)}
            _hover={{ 
              shadow: "lg", 
              transform: "translateY(-2px)",
              borderColor: selectedRegion === region.code ? "purple.500" : "purple.300"
            }}
            transition="all 0.2s"
            position="relative"
          >
            {selectedRegion === region.code && (
              <Box
                position="absolute"
                top={3}
                right={3}
                bg="purple.500"
                color="white"
                rounded="full"
                p={1}
              >
                <Icon as={FaCheck} boxSize={3} />
              </Box>
            )}

            <VStack spacing={4} align="start">
              {/* Region Header */}
              <HStack>
                <Text fontSize="2xl">{region.flag}</Text>
                <VStack align="start" spacing={0}>
                  <Text fontWeight="bold" fontSize="lg">
                    {region.name}
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    Currency: {region.currency}
                  </Text>
                </VStack>
              </HStack>

              {/* Payment Methods */}
              <Box>
                <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={2}>
                  Payment Methods:
                </Text>
                <HStack spacing={2} flexWrap="wrap">
                  {region.paymentMethods.map((method) => (
                    <Badge key={method} colorScheme="blue" variant="outline" fontSize="xs">
                      {method}
                    </Badge>
                  ))}
                </HStack>
              </Box>

              {/* Providers */}
              <Box>
                <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={2}>
                  Supported Providers:
                </Text>
                <HStack spacing={2} flexWrap="wrap">
                  {region.providers.map((provider) => (
                    <Badge key={provider} colorScheme="green" variant="outline" fontSize="xs">
                      {provider}
                    </Badge>
                  ))}
                </HStack>
              </Box>

              {/* Features */}
              <Box>
                <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={2}>
                  Features:
                </Text>
                <VStack align="start" spacing={1}>
                  {region.features.map((feature) => (
                    <HStack key={feature} spacing={2}>
                      <Icon as={FaCheck} color="green.500" boxSize={3} />
                      <Text fontSize="xs" color="gray.600">
                        {feature}
                      </Text>
                    </HStack>
                  ))}
                </VStack>
              </Box>
            </VStack>
          </Box>
        ))}
      </SimpleGrid>

      {/* Additional Info */}
      <Box
        bg="gray.50"
        p={6}
        rounded="lg"
        border="1px solid"
        borderColor="gray.200"
      >
        <VStack spacing={3} textAlign="center">
          <Icon as={FaGlobe} color="gray.500" boxSize={6} />
          <Text fontSize="sm" color="gray.600">
            Don't see your region? We're constantly expanding our global coverage.
            Contact support for information about upcoming regions.
          </Text>
          <Button variant="link" size="sm" colorScheme="purple">
            Request New Region
          </Button>
        </VStack>
      </Box>
    </VStack>
  );
}
