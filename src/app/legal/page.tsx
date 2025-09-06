"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useColorModeValue,
  Icon,
  Badge,
  Grid,
  GridItem,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Button,
  Alert,
  AlertIcon,
  AlertDescription,
} from "@chakra-ui/react";
import {
  FaRobot,
  FaShieldAlt,
  FaChartLine,
  FaBookOpen,
  FaGavel,
  FaExclamationTriangle,
} from "react-icons/fa";
import ChatInterface from "../../components/legal/ChatInterface";
import ComplianceAnalyzer from "../../components/legal/ComplianceAnalyzer";
import RiskDashboard from "../../components/legal/RiskDashboard";
import LegalResourceLibrary from "../../components/legal/LegalResourceLibrary";
import { LegalQuery, RiskAssessment, legalBotService } from "../../services/legalBotService";

export default function LegalPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [userRegion, setUserRegion] = useState("US");
  const [riskAssessments, setRiskAssessments] = useState<RiskAssessment[]>([]);
  const [totalQueries, setTotalQueries] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const bgColor = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  useEffect(() => {
    initializeLegalBot();
  }, []);

  const initializeLegalBot = async () => {
    setIsLoading(true);
    try {
      // Detect user region (mock implementation)
      const detectedRegion = await detectUserRegion();
      setUserRegion(detectedRegion);

      // Load sample data
      await loadSampleData();
    } catch (error) {
      console.error('Error initializing legal bot:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const detectUserRegion = async (): Promise<string> => {
    // Mock region detection - in production, this would use geolocation or user preferences
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve("US"); // Default to US
      }, 500);
    });
  };

  const loadSampleData = async () => {
    // Generate sample risk assessments
    const sampleAssessments = await Promise.all([
      legalBotService.assessCompliance('real_estate', 'US'),
      legalBotService.assessCompliance('securities', 'EU'),
      legalBotService.assessCompliance('carbon_credits', 'US'),
    ]);
    
    setRiskAssessments(sampleAssessments);
    setTotalQueries(12); // Mock query count
  };

  const handleQuerySubmit = (query: LegalQuery) => {
    setTotalQueries(prev => prev + 1);
  };

  const handleAnalysisComplete = (assessment: RiskAssessment) => {
    setRiskAssessments(prev => [assessment, ...prev]);
  };

  const tabs = [
    {
      label: "AI Assistant",
      icon: FaRobot,
      component: (
        <ChatInterface 
          userRegion={userRegion} 
          onQuerySubmit={handleQuerySubmit}
        />
      ),
      description: "Chat with our AI legal assistant"
    },
    {
      label: "Compliance Analyzer",
      icon: FaShieldAlt,
      component: (
        <ComplianceAnalyzer 
          onAnalysisComplete={handleAnalysisComplete}
        />
      ),
      description: "Analyze compliance requirements"
    },
    {
      label: "Risk Dashboard",
      icon: FaChartLine,
      component: (
        <RiskDashboard 
          assessments={riskAssessments}
        />
      ),
      description: "View risk metrics and trends"
    },
    {
      label: "Resource Library",
      icon: FaBookOpen,
      component: <LegalResourceLibrary />,
      description: "Browse legal resources and documentation"
    },
  ];

  const getCriticalRiskCount = () => {
    return riskAssessments.filter(a => a.riskLevel === 'critical').length;
  };

  const getHighRiskCount = () => {
    return riskAssessments.filter(a => a.riskLevel === 'high').length;
  };

  const getTotalComplianceGaps = () => {
    return riskAssessments.reduce((sum, a) => sum + a.complianceGaps.length, 0);
  };

  return (
    <Box bg={bgColor} minH="100vh">
      <Container maxW="7xl" py={8}>
        <VStack spacing={8} align="stretch">
          {/* Page Header */}
          <Box>
            <VStack align="start" spacing={4}>
              <HStack spacing={3}>
                <Icon as={FaGavel} color="purple.500" boxSize={8} />
                <VStack align="start" spacing={1}>
                  <Text fontSize="3xl" fontWeight="bold">
                    AI Legal & Compliance Bot
                  </Text>
                  <Text fontSize="lg" color="gray.600">
                    Get instant answers to RWA legal questions and compliance requirements
                  </Text>
                </VStack>
              </HStack>

              {/* Key Metrics */}
              <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={4} w="full">
                <GridItem>
                  <Box
                    bg={cardBg}
                    p={4}
                    rounded="lg"
                    border="1px solid"
                    borderColor={borderColor}
                  >
                    <Stat size="sm">
                      <StatLabel>Total Queries</StatLabel>
                      <StatNumber>{totalQueries}</StatNumber>
                      <StatHelpText>Legal questions answered</StatHelpText>
                    </Stat>
                  </Box>
                </GridItem>

                <GridItem>
                  <Box
                    bg={cardBg}
                    p={4}
                    rounded="lg"
                    border="1px solid"
                    borderColor={borderColor}
                  >
                    <Stat size="sm">
                      <StatLabel>Risk Assessments</StatLabel>
                      <StatNumber>{riskAssessments.length}</StatNumber>
                      <StatHelpText>Compliance analyses</StatHelpText>
                    </Stat>
                  </Box>
                </GridItem>

                <GridItem>
                  <Box
                    bg={cardBg}
                    p={4}
                    rounded="lg"
                    border="1px solid"
                    borderColor={borderColor}
                  >
                    <Stat size="sm">
                      <StatLabel>Critical Risks</StatLabel>
                      <StatNumber color={getCriticalRiskCount() > 0 ? "red.500" : "green.500"}>
                        {getCriticalRiskCount()}
                      </StatNumber>
                      <StatHelpText>Require immediate attention</StatHelpText>
                    </Stat>
                  </Box>
                </GridItem>

                <GridItem>
                  <Box
                    bg={cardBg}
                    p={4}
                    rounded="lg"
                    border="1px solid"
                    borderColor={borderColor}
                  >
                    <Stat size="sm">
                      <StatLabel>Your Region</StatLabel>
                      <StatNumber fontSize="lg">
                        <Badge colorScheme="purple" variant="solid" px={2} py={1}>
                          {userRegion}
                        </Badge>
                      </StatNumber>
                      <StatHelpText>Detected jurisdiction</StatHelpText>
                    </Stat>
                  </Box>
                </GridItem>
              </Grid>

              {/* Critical Risk Alert */}
              {getCriticalRiskCount() > 0 && (
                <Alert status="error" rounded="lg">
                  <AlertIcon />
                  <AlertDescription>
                    <strong>{getCriticalRiskCount()} critical risk{getCriticalRiskCount() > 1 ? 's' : ''}</strong> and{' '}
                    <strong>{getTotalComplianceGaps()} compliance gap{getTotalComplianceGaps() > 1 ? 's' : ''}</strong>{' '}
                    identified. Review the Risk Dashboard for immediate action items.
                  </AlertDescription>
                </Alert>
              )}
            </VStack>
          </Box>

          {/* Main Content Tabs */}
          <Box
            bg={cardBg}
            rounded="xl"
            shadow="sm"
            border="1px solid"
            borderColor={borderColor}
          >
            <Tabs
              index={activeTab}
              onChange={setActiveTab}
              variant="enclosed"
              colorScheme="purple"
            >
              <TabList borderBottom="1px solid" borderColor={borderColor}>
                {tabs.map((tab, index) => (
                  <Tab key={index} py={4} px={6}>
                    <VStack spacing={1}>
                      <HStack spacing={2}>
                        <Icon as={tab.icon} />
                        <Text>{tab.label}</Text>
                      </HStack>
                      <Text fontSize="xs" color="gray.500" display={{ base: "none", md: "block" }}>
                        {tab.description}
                      </Text>
                    </VStack>
                  </Tab>
                ))}
              </TabList>

              <TabPanels>
                {tabs.map((tab, index) => (
                  <TabPanel key={index} p={6}>
                    {tab.component}
                  </TabPanel>
                ))}
              </TabPanels>
            </Tabs>
          </Box>

          {/* Legal Disclaimer */}
          <Box
            bg="orange.50"
            border="1px solid"
            borderColor="orange.200"
            p={4}
            rounded="lg"
          >
            <HStack spacing={3} align="start">
              <Icon as={FaExclamationTriangle} color="orange.500" mt={1} />
              <VStack align="start" spacing={1}>
                <Text fontSize="sm" fontWeight="bold" color="orange.800">
                  Important Legal Disclaimer
                </Text>
                <Text fontSize="sm" color="orange.700">
                  This AI assistant provides educational information only and does not constitute legal advice. 
                  Laws and regulations vary by jurisdiction and change frequently. Always consult with qualified 
                  legal counsel for specific legal matters and compliance requirements.
                </Text>
              </VStack>
            </HStack>
          </Box>

          {/* Quick Actions */}
          <Box
            bg={cardBg}
            p={6}
            rounded="xl"
            border="1px solid"
            borderColor={borderColor}
          >
            <VStack spacing={4} align="stretch">
              <Text fontSize="lg" fontWeight="bold">
                Quick Actions
              </Text>
              
              <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4}>
                <GridItem>
                  <Button
                    w="full"
                    h="auto"
                    p={4}
                    variant="outline"
                    colorScheme="purple"
                    onClick={() => setActiveTab(0)}
                  >
                    <VStack spacing={2}>
                      <Icon as={FaRobot} boxSize={6} />
                      <Text fontSize="sm">Ask Legal Question</Text>
                    </VStack>
                  </Button>
                </GridItem>

                <GridItem>
                  <Button
                    w="full"
                    h="auto"
                    p={4}
                    variant="outline"
                    colorScheme="blue"
                    onClick={() => setActiveTab(1)}
                  >
                    <VStack spacing={2}>
                      <Icon as={FaShieldAlt} boxSize={6} />
                      <Text fontSize="sm">Run Compliance Check</Text>
                    </VStack>
                  </Button>
                </GridItem>

                <GridItem>
                  <Button
                    w="full"
                    h="auto"
                    p={4}
                    variant="outline"
                    colorScheme="green"
                    onClick={() => setActiveTab(3)}
                  >
                    <VStack spacing={2}>
                      <Icon as={FaBookOpen} boxSize={6} />
                      <Text fontSize="sm">Browse Resources</Text>
                    </VStack>
                  </Button>
                </GridItem>
              </Grid>
            </VStack>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}
