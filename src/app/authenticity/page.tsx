"use client";

import { useState } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  useColorModeValue,
  Icon,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Grid,
  GridItem,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Container,
  Flex,
  Spacer,
} from "@chakra-ui/react";
import {
  FaShieldAlt,
  FaUpload,
  FaSearch,
  FaFileAlt,
  FaLock,
  FaCloud,
  FaChartLine,
  FaGavel,
  FaUsers,
  FaGlobe,
} from "react-icons/fa";
import AuthenticityDashboard from "../../components/authenticity/AuthenticityDashboard";
import DocumentUploader from "../../components/authenticity/DocumentUploader";
import DocumentVerifier from "../../components/authenticity/DocumentVerifier";

export default function AuthenticityPage() {
  const [activeTab, setActiveTab] = useState(0);

  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const gradientBg = useColorModeValue(
    "linear(to-r, purple.500, blue.500)",
    "linear(to-r, purple.600, blue.600)"
  );

  const features = [
    {
      icon: FaShieldAlt,
      title: "Blockchain Verification",
      description: "Immutable proof of document authenticity on the blockchain",
      color: "purple",
    },
    {
      icon: FaLock,
      title: "Zero-Knowledge Proofs",
      description: "Verify authenticity without revealing sensitive information",
      color: "blue",
    },
    {
      icon: FaCloud,
      title: "Decentralized Storage",
      description: "Secure storage on IPFS and Arweave networks",
      color: "green",
    },
    {
      icon: FaGavel,
      title: "Legal Compliance",
      description: "Multi-jurisdiction support with notarization records",
      color: "orange",
    },
  ];

  const stats = [
    {
      label: "Documents Verified",
      value: "10,000+",
      helpText: "Across all networks",
      color: "green",
    },
    {
      label: "Average Confidence",
      value: "94.2%",
      helpText: "Verification accuracy",
      color: "blue",
    },
    {
      label: "Supported Jurisdictions",
      value: "25+",
      helpText: "Global coverage",
      color: "purple",
    },
    {
      label: "Uptime",
      value: "99.9%",
      helpText: "Network availability",
      color: "teal",
    },
  ];

  return (
    <Container maxW="7xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Hero Section */}
        <Box
          bgGradient={gradientBg}
          color="white"
          p={8}
          rounded="2xl"
          position="relative"
          overflow="hidden"
        >
          <Box position="relative" zIndex={1}>
            <VStack spacing={6} align="center" textAlign="center">
              <Icon as={FaShieldAlt} boxSize={16} />
              <VStack spacing={3}>
                <Text fontSize="4xl" fontWeight="bold">
                  Proof of Authenticity Layer
                </Text>
                <Text fontSize="xl" opacity={0.9} maxW="2xl">
                  Decentralized document verification for Real World Assets using blockchain technology, 
                  zero-knowledge proofs, and distributed storage networks.
                </Text>
              </VStack>
              
              <HStack spacing={4}>
                <Button
                  size="lg"
                  bg="white"
                  color="purple.600"
                  leftIcon={<Icon as={FaUpload} />}
                  _hover={{ bg: "gray.100" }}
                  onClick={() => setActiveTab(1)}
                >
                  Upload Document
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  borderColor="white"
                  color="white"
                  leftIcon={<Icon as={FaSearch} />}
                  _hover={{ bg: "whiteAlpha.200" }}
                  onClick={() => setActiveTab(2)}
                >
                  Verify Document
                </Button>
              </HStack>
            </VStack>
          </Box>
          
          {/* Background Pattern */}
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            opacity={0.1}
            backgroundImage="radial-gradient(circle, white 1px, transparent 1px)"
            backgroundSize="30px 30px"
          />
        </Box>

        {/* Key Statistics */}
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }} gap={6}>
          {stats.map((stat, index) => (
            <GridItem key={index}>
              <Card>
                <CardBody>
                  <Stat>
                    <StatLabel>{stat.label}</StatLabel>
                    <StatNumber color={`${stat.color}.500`}>{stat.value}</StatNumber>
                    <StatHelpText>{stat.helpText}</StatHelpText>
                  </Stat>
                </CardBody>
              </Card>
            </GridItem>
          ))}
        </Grid>

        {/* Features Overview */}
        <Box
          bg={cardBg}
          p={8}
          rounded="xl"
          border="1px solid"
          borderColor={borderColor}
        >
          <VStack spacing={6}>
            <VStack spacing={2} textAlign="center">
              <Text fontSize="2xl" fontWeight="bold">
                Enterprise-Grade Document Security
              </Text>
              <Text color="gray.600" maxW="2xl">
                Our Proof of Authenticity Layer provides comprehensive document verification 
                using cutting-edge blockchain and cryptographic technologies.
              </Text>
            </VStack>

            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
              {features.map((feature, index) => (
                <GridItem key={index}>
                  <Card>
                    <CardBody>
                      <HStack spacing={4}>
                        <Box
                          p={3}
                          rounded="lg"
                          bg={`${feature.color}.100`}
                          color={`${feature.color}.600`}
                        >
                          <Icon as={feature.icon} boxSize={6} />
                        </Box>
                        <VStack align="start" spacing={1} flex={1}>
                          <Text fontSize="lg" fontWeight="semibold">
                            {feature.title}
                          </Text>
                          <Text fontSize="sm" color="gray.600">
                            {feature.description}
                          </Text>
                        </VStack>
                      </HStack>
                    </CardBody>
                  </Card>
                </GridItem>
              ))}
            </Grid>
          </VStack>
        </Box>

        {/* Security Notice */}
        <Alert status="info" rounded="lg">
          <AlertIcon />
          <Box>
            <AlertTitle>Security & Privacy First</AlertTitle>
            <AlertDescription>
              All documents are encrypted and stored on decentralized networks. 
              Zero-knowledge proofs ensure authenticity verification without exposing sensitive content.
            </AlertDescription>
          </Box>
        </Alert>

        {/* Main Application Tabs */}
        <Box
          bg={cardBg}
          rounded="xl"
          border="1px solid"
          borderColor={borderColor}
          overflow="hidden"
        >
          <Tabs index={activeTab} onChange={setActiveTab} variant="enclosed">
            <TabList bg="gray.50" borderBottom="1px solid" borderColor={borderColor}>
              <Tab>
                <HStack spacing={2}>
                  <Icon as={FaChartLine} />
                  <Text>Dashboard</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <Icon as={FaUpload} />
                  <Text>Upload</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <Icon as={FaSearch} />
                  <Text>Verify</Text>
                </HStack>
              </Tab>
            </TabList>

            <TabPanels>
              <TabPanel p={0}>
                <Box p={6}>
                  <AuthenticityDashboard />
                </Box>
              </TabPanel>
              
              <TabPanel p={0}>
                <Box p={6}>
                  <VStack spacing={6} align="stretch">
                    <VStack spacing={2} textAlign="center">
                      <Text fontSize="2xl" fontWeight="bold">
                        Upload & Verify Documents
                      </Text>
                      <Text color="gray.600">
                        Securely upload your documents to the decentralized authenticity layer
                      </Text>
                    </VStack>
                    <DocumentUploader />
                  </VStack>
                </Box>
              </TabPanel>
              
              <TabPanel p={0}>
                <Box p={6}>
                  <VStack spacing={6} align="stretch">
                    <VStack spacing={2} textAlign="center">
                      <Text fontSize="2xl" fontWeight="bold">
                        Verify Document Authenticity
                      </Text>
                      <Text color="gray.600">
                        Check the authenticity and integrity of any document in our system
                      </Text>
                    </VStack>
                    <DocumentVerifier />
                  </VStack>
                </Box>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>

        {/* Technical Specifications */}
        <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap={6}>
          <GridItem>
            <Card>
              <CardHeader>
                <HStack>
                  <Icon as={FaGlobe} color="blue.500" />
                  <Text fontSize="lg" fontWeight="bold">Supported Networks</Text>
                </HStack>
              </CardHeader>
              <CardBody>
                <VStack spacing={3} align="stretch">
                  <HStack justify="space-between">
                    <Text>IPFS Storage</Text>
                    <Badge colorScheme="blue">Active</Badge>
                  </HStack>
                  <HStack justify="space-between">
                    <Text>Arweave Permanent Storage</Text>
                    <Badge colorScheme="green">Active</Badge>
                  </HStack>
                  <HStack justify="space-between">
                    <Text>Ethereum Mainnet</Text>
                    <Badge colorScheme="purple">Active</Badge>
                  </HStack>
                  <HStack justify="space-between">
                    <Text>Polygon Network</Text>
                    <Badge colorScheme="purple">Active</Badge>
                  </HStack>
                  <HStack justify="space-between">
                    <Text>OneChain Network</Text>
                    <Badge colorScheme="orange">Active</Badge>
                  </HStack>
                </VStack>
              </CardBody>
            </Card>
          </GridItem>

          <GridItem>
            <Card>
              <CardHeader>
                <HStack>
                  <Icon as={FaUsers} color="green.500" />
                  <Text fontSize="lg" fontWeight="bold">Supported Document Types</Text>
                </HStack>
              </CardHeader>
              <CardBody>
                <VStack spacing={3} align="stretch">
                  <HStack justify="space-between">
                    <Text>Property Deeds</Text>
                    <Badge colorScheme="green">Supported</Badge>
                  </HStack>
                  <HStack justify="space-between">
                    <Text>Appraisal Reports</Text>
                    <Badge colorScheme="green">Supported</Badge>
                  </HStack>
                  <HStack justify="space-between">
                    <Text>Legal Contracts</Text>
                    <Badge colorScheme="green">Supported</Badge>
                  </HStack>
                  <HStack justify="space-between">
                    <Text>Insurance Policies</Text>
                    <Badge colorScheme="green">Supported</Badge>
                  </HStack>
                  <HStack justify="space-between">
                    <Text>Financial Statements</Text>
                    <Badge colorScheme="green">Supported</Badge>
                  </HStack>
                </VStack>
              </CardBody>
            </Card>
          </GridItem>
        </Grid>

        {/* Footer */}
        <Box textAlign="center" py={6}>
          <Text color="gray.600" fontSize="sm">
            Powered by OmniFlow • Secured by Blockchain Technology • 
            Built for Real World Asset Verification
          </Text>
        </Box>
      </VStack>
    </Container>
  );
}
