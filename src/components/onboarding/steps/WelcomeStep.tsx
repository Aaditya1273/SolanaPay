"use client";

import { useEffect } from "react";
import {
  VStack,
  HStack,
  Heading,
  Text,
  Box,
  Icon,
  SimpleGrid,
  useColorModeValue,
  Image,
  Badge,
} from "@chakra-ui/react";
import {
  FaGlobe,
  FaShieldAlt,
  FaChartLine,
  FaUsers,
  FaCoins,
  FaRocket,
} from "react-icons/fa";
import { localizationService } from "../../../services/localizationService";

interface WelcomeStepProps {
  data: any;
  onComplete: (data: any) => void;
}

export default function WelcomeStep({ data, onComplete }: WelcomeStepProps) {
  const cardBg = useColorModeValue("white", "gray.800");
  const t = localizationService.t;

  useEffect(() => {
    // Auto-complete welcome step after a short delay
    const timer = setTimeout(() => {
      onComplete({ welcomeCompleted: true });
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const features = [
    {
      icon: FaGlobe,
      title: t('features.globalAccess') || "Global Access",
      description: t('features.globalAccessDesc') || "Invest in RWAs from anywhere in the world",
      color: "blue"
    },
    {
      icon: FaShieldAlt,
      title: t('features.secureCompliant') || "Secure & Compliant",
      description: t('features.secureCompliantDesc') || "Bank-grade security with full regulatory compliance",
      color: "green"
    },
    {
      icon: FaChartLine,
      title: t('features.realTimeData') || "Real-Time Data",
      description: t('features.realTimeDataDesc') || "Live pricing and performance tracking via Chainlink oracles",
      color: "purple"
    },
    {
      icon: FaUsers,
      title: t('features.daoGovernance') || "DAO Governance",
      description: t('features.daoGovernanceDesc') || "Participate in decentralized asset management decisions",
      color: "orange"
    },
    {
      icon: FaCoins,
      title: t('features.fractionalOwnership') || "Fractional Ownership",
      description: t('features.fractionalOwnershipDesc') || "Own fractions of high-value real-world assets",
      color: "teal"
    },
    {
      icon: FaRocket,
      title: t('features.crossChain') || "Cross-Chain",
      description: t('features.crossChainDesc') || "Trade assets across multiple blockchain networks",
      color: "pink"
    }
  ];

  return (
    <VStack spacing={8} align="stretch" textAlign="center">
      {/* Hero Section */}
      <VStack spacing={6}>
        <Box position="relative">
          <Heading
            size="2xl"
            bgGradient="linear(to-r, purple.400, blue.400, teal.400)"
            bgClip="text"
            fontWeight="extrabold"
          >
            {t('onboarding.title')}
          </Heading>
          <Badge
            position="absolute"
            top="-10px"
            right="-20px"
            colorScheme="purple"
            variant="solid"
            fontSize="xs"
            transform="rotate(15deg)"
          >
            v2.0
          </Badge>
        </Box>
        
        <Text fontSize="xl" color="gray.600" maxW="2xl">
          {t('onboarding.subtitle')}
        </Text>

        <HStack spacing={4} justify="center" flexWrap="wrap">
          <Badge colorScheme="blue" variant="outline" px={3} py={1}>
            🏢 Real Estate
          </Badge>
          <Badge colorScheme="green" variant="outline" px={3} py={1}>
            🌱 Carbon Credits
          </Badge>
          <Badge colorScheme="yellow" variant="outline" px={3} py={1}>
            🥇 Precious Metals
          </Badge>
          <Badge colorScheme="purple" variant="outline" px={3} py={1}>
            ⚡ Renewable Energy
          </Badge>
        </HStack>
      </VStack>

      {/* Features Grid */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
        {features.map((feature, index) => (
          <Box
            key={index}
            bg={cardBg}
            p={6}
            rounded="xl"
            border="1px solid"
            borderColor="gray.200"
            shadow="md"
            _hover={{ shadow: "lg", transform: "translateY(-2px)" }}
            transition="all 0.2s"
          >
            <VStack spacing={4}>
              <Box
                p={3}
                rounded="full"
                bg={`${feature.color}.100`}
                color={`${feature.color}.600`}
              >
                <Icon as={feature.icon} boxSize={6} />
              </Box>
              
              <VStack spacing={2}>
                <Heading size="md" color="gray.800">
                  {feature.title}
                </Heading>
                <Text fontSize="sm" color="gray.600" textAlign="center">
                  {feature.description}
                </Text>
              </VStack>
            </VStack>
          </Box>
        ))}
      </SimpleGrid>

      {/* Stats Section */}
      <Box
        bg="gradient-to-r from-purple-500 to-blue-500"
        p={8}
        rounded="xl"
        color="white"
        textAlign="center"
      >
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={8}>
          <VStack>
            <Text fontSize="3xl" fontWeight="bold">$50M+</Text>
            <Text fontSize="sm" opacity={0.9}>Assets Under Management</Text>
          </VStack>
          <VStack>
            <Text fontSize="3xl" fontWeight="bold">25K+</Text>
            <Text fontSize="sm" opacity={0.9}>Active Investors</Text>
          </VStack>
          <VStack>
            <Text fontSize="3xl" fontWeight="bold">150+</Text>
            <Text fontSize="sm" opacity={0.9}>RWA Assets</Text>
          </VStack>
          <VStack>
            <Text fontSize="3xl" fontWeight="bold">12%</Text>
            <Text fontSize="sm" opacity={0.9}>Average Annual Return</Text>
          </VStack>
        </SimpleGrid>
      </Box>

      {/* Getting Started Message */}
      <Box
        bg="blue.50"
        p={6}
        rounded="lg"
        border="1px solid"
        borderColor="blue.200"
      >
        <VStack spacing={3}>
          <Icon as={FaRocket} boxSize={8} color="blue.500" />
          <Heading size="md" color="blue.800">
            {t('onboarding.readyToStart') || "Ready to Start Your RWA Journey?"}
          </Heading>
          <Text color="blue.700" textAlign="center">
            {t('onboarding.setupProcess') || "We'll guide you through a quick setup process to get you started with fractional real-world asset investments."}
          </Text>
        </VStack>
      </Box>
    </VStack>
  );
}
