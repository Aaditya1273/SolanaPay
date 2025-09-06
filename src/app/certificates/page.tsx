"use client";

import { useState } from "react";
import {
  Box,
  Container,
  Heading,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  VStack,
  HStack,
  Icon,
  useColorModeValue,
  Button,
  Badge,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
} from "@chakra-ui/react";
import { FaCertificate, FaGallery, FaChartLine, FaPlus } from "react-icons/fa";
import CertificateGallery from "../../components/certificates/CertificateGallery";

export default function CertificatesPage() {
  const bgGradient = useColorModeValue(
    "linear(to-br, blue.50, purple.50)",
    "linear(to-br, gray.900, purple.900)"
  );

  // Mock portfolio stats
  const portfolioStats = {
    totalCertificates: 6,
    totalValue: 5695000,
    totalOwnership: 95, // Total ownership percentage across all assets
    averageRisk: 295,
    activeAssets: 5,
    monthlyGrowth: 8.5,
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

  const getRiskColor = (riskScore: number) => {
    if (riskScore <= 100) return "green";
    if (riskScore <= 250) return "blue";
    if (riskScore <= 500) return "yellow";
    if (riskScore <= 750) return "orange";
    return "red";
  };

  return (
    <Box minH="100vh" bg={bgGradient}>
      <Container maxW="7xl" py={8}>
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <VStack spacing={4} textAlign="center">
            <HStack justify="center" spacing={3}>
              <Icon as={FaCertificate} boxSize={8} color="purple.500" />
              <Heading size="xl" bgGradient="linear(to-r, purple.400, blue.400)" bgClip="text">
                Dynamic NFT Certificates
              </Heading>
            </HStack>
            <Text fontSize="lg" color="gray.600" maxW="2xl">
              Your fractional ownership certificates with real-time updates from Chainlink oracles
            </Text>
          </VStack>

          {/* Portfolio Overview */}
          <SimpleGrid columns={{ base: 2, md: 3, lg: 6 }} spacing={4}>
            <Stat
              textAlign="center"
              bg="white"
              p={4}
              rounded="lg"
              border="1px solid"
              borderColor="gray.200"
              shadow="sm"
            >
              <StatLabel>Total Certificates</StatLabel>
              <StatNumber color="purple.500">{portfolioStats.totalCertificates}</StatNumber>
              <StatHelpText>Active assets</StatHelpText>
            </Stat>

            <Stat
              textAlign="center"
              bg="white"
              p={4}
              rounded="lg"
              border="1px solid"
              borderColor="gray.200"
              shadow="sm"
            >
              <StatLabel>Portfolio Value</StatLabel>
              <StatNumber color="green.500">{formatPrice(portfolioStats.totalValue)}</StatNumber>
              <StatHelpText>+{portfolioStats.monthlyGrowth}% this month</StatHelpText>
            </Stat>

            <Stat
              textAlign="center"
              bg="white"
              p={4}
              rounded="lg"
              border="1px solid"
              borderColor="gray.200"
              shadow="sm"
            >
              <StatLabel>Total Ownership</StatLabel>
              <StatNumber color="blue.500">{portfolioStats.totalOwnership}%</StatNumber>
              <StatHelpText>Across all assets</StatHelpText>
            </Stat>

            <Stat
              textAlign="center"
              bg="white"
              p={4}
              rounded="lg"
              border="1px solid"
              borderColor="gray.200"
              shadow="sm"
            >
              <StatLabel>Average Risk</StatLabel>
              <StatNumber color={`${getRiskColor(portfolioStats.averageRisk)}.500`}>
                {portfolioStats.averageRisk}
              </StatNumber>
              <StatHelpText>Risk score</StatHelpText>
            </Stat>

            <Stat
              textAlign="center"
              bg="white"
              p={4}
              rounded="lg"
              border="1px solid"
              borderColor="gray.200"
              shadow="sm"
            >
              <StatLabel>Active Assets</StatLabel>
              <StatNumber color="green.500">{portfolioStats.activeAssets}</StatNumber>
              <StatHelpText>Live tracking</StatHelpText>
            </Stat>

            <Stat
              textAlign="center"
              bg="white"
              p={4}
              rounded="lg"
              border="1px solid"
              borderColor="gray.200"
              shadow="sm"
            >
              <StatLabel>Growth</StatLabel>
              <StatNumber color="green.500">+{portfolioStats.monthlyGrowth}%</StatNumber>
              <StatHelpText>30-day change</StatHelpText>
            </Stat>
          </SimpleGrid>

          {/* Certificate Management Tabs */}
          <Tabs variant="enclosed" colorScheme="purple">
            <TabList>
              <Tab>
                <HStack>
                  <Icon as={FaGallery} />
                  <Text>Certificate Gallery</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack>
                  <Icon as={FaChartLine} />
                  <Text>Performance Analytics</Text>
                </HStack>
              </Tab>
            </TabList>

            <TabPanels>
              <TabPanel p={0} pt={6}>
                <CertificateGallery />
              </TabPanel>
              
              <TabPanel p={0} pt={6}>
                <VStack spacing={6}>
                  <Text fontSize="lg" color="gray.600" textAlign="center">
                    Performance analytics and detailed portfolio insights coming soon...
                  </Text>
                  <Button
                    size="lg"
                    colorScheme="purple"
                    leftIcon={<Icon as={FaChartLine} />}
                    isDisabled
                  >
                    View Analytics Dashboard
                  </Button>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>

          {/* Key Features */}
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
            <Box
              bg="white"
              p={6}
              rounded="lg"
              border="1px solid"
              borderColor="gray.200"
              shadow="sm"
            >
              <VStack spacing={3} align="start">
                <Icon as={FaCertificate} boxSize={8} color="purple.500" />
                <Heading size="md">Dynamic Metadata</Heading>
                <Text color="gray.600">
                  Certificate metadata updates automatically with real-time asset values, 
                  market prices, and risk assessments using Chainlink oracles.
                </Text>
              </VStack>
            </Box>

            <Box
              bg="white"
              p={6}
              rounded="lg"
              border="1px solid"
              borderColor="gray.200"
              shadow="sm"
            >
              <VStack spacing={3} align="start">
                <Icon as={FaChartLine} boxSize={8} color="green.500" />
                <Heading size="md">Live Price Feeds</Heading>
                <Text color="gray.600">
                  Integrated with Chainlink Price Feeds for accurate, tamper-proof 
                  pricing data that updates your certificate values in real-time.
                </Text>
              </VStack>
            </Box>

            <Box
              bg="white"
              p={6}
              rounded="lg"
              border="1px solid"
              borderColor="gray.200"
              shadow="sm"
            >
              <VStack spacing={3} align="start">
                <Icon as={FaGallery} boxSize={8} color="blue.500" />
                <Heading size="md">Visual Certificates</Heading>
                <Text color="gray.600">
                  Beautiful, interactive NFT certificates that showcase your ownership 
                  with dynamic visual elements and comprehensive asset information.
                </Text>
              </VStack>
            </Box>
          </SimpleGrid>
        </VStack>
      </Container>
    </Box>
  );
}
