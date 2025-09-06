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
  FaExclamationTriangle,
  FaChartLine,
  FaNetworkWired,
  FaBell,
  FaRobot,
  FaLock,
  FaEye,
  FaClock,
  FaGlobe,
} from "react-icons/fa";
import SecurityDashboard from "../../components/security/SecurityDashboard";
import ThreatVisualization from "../../components/security/ThreatVisualization";
import RealTimeAlerts from "../../components/security/RealTimeAlerts";

export default function SecurityPage() {
  const [activeTab, setActiveTab] = useState(0);

  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const gradientBg = useColorModeValue(
    "linear(to-r, red.500, orange.500)",
    "linear(to-r, red.600, orange.600)"
  );

  const features = [
    {
      icon: FaRobot,
      title: "AI-Powered Detection",
      description: "Machine learning algorithms detect fraud patterns in real-time",
      color: "purple",
    },
    {
      icon: FaNetworkWired,
      title: "Cross-Chain Monitoring",
      description: "Monitor transactions across all supported blockchain networks",
      color: "blue",
    },
    {
      icon: FaBell,
      title: "Real-Time Alerts",
      description: "Instant notifications for suspicious activities and threats",
      color: "orange",
    },
    {
      icon: FaLock,
      title: "Automated Response",
      description: "Automatic threat mitigation and security protocol activation",
      color: "green",
    },
  ];

  const stats = [
    {
      label: "Threats Detected",
      value: "1,247",
      helpText: "Last 30 days",
      color: "red",
    },
    {
      label: "False Positive Rate",
      value: "2.3%",
      helpText: "Industry leading accuracy",
      color: "green",
    },
    {
      label: "Response Time",
      value: "< 30s",
      helpText: "Average detection time",
      color: "blue",
    },
    {
      label: "Networks Monitored",
      value: "5+",
      helpText: "Major blockchain networks",
      color: "purple",
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
                  Cross-Chain Security Layer
                </Text>
                <Text fontSize="xl" opacity={0.9} maxW="2xl">
                  Advanced fraud detection and threat monitoring system that protects your 
                  cross-chain assets with AI-powered real-time analysis and automated response mechanisms.
                </Text>
              </VStack>
              
              <HStack spacing={4}>
                <Button
                  size="lg"
                  bg="white"
                  color="red.600"
                  leftIcon={<Icon as={FaEye} />}
                  _hover={{ bg: "gray.100" }}
                  onClick={() => setActiveTab(0)}
                >
                  View Dashboard
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  borderColor="white"
                  color="white"
                  leftIcon={<Icon as={FaChartLine} />}
                  _hover={{ bg: "whiteAlpha.200" }}
                  onClick={() => setActiveTab(1)}
                >
                  View Analytics
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
                Advanced Threat Detection & Prevention
              </Text>
              <Text color="gray.600" maxW="2xl">
                Our Cross-Chain Security Layer provides comprehensive protection against fraud, 
                exploits, and malicious activities across all supported blockchain networks.
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

        {/* Security Status Alert */}
        <Alert status="success" rounded="lg">
          <AlertIcon />
          <Box>
            <AlertTitle>Security Systems Online</AlertTitle>
            <AlertDescription>
              All security monitoring systems are operational. Real-time threat detection is active 
              across all supported networks with automated response protocols enabled.
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
                  <Icon as={FaShieldAlt} />
                  <Text>Security Dashboard</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <Icon as={FaChartLine} />
                  <Text>Threat Analytics</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <Icon as={FaBell} />
                  <Text>Live Monitoring</Text>
                </HStack>
              </Tab>
            </TabList>

            <TabPanels>
              <TabPanel p={0}>
                <Box p={6}>
                  <SecurityDashboard />
                </Box>
              </TabPanel>
              
              <TabPanel p={0}>
                <Box p={6}>
                  <VStack spacing={6} align="stretch">
                    <VStack spacing={2} textAlign="center">
                      <Text fontSize="2xl" fontWeight="bold">
                        Threat Analytics & Visualization
                      </Text>
                      <Text color="gray.600">
                        Comprehensive analysis of security threats and attack patterns
                      </Text>
                    </VStack>
                    <ThreatVisualization />
                  </VStack>
                </Box>
              </TabPanel>
              
              <TabPanel p={0}>
                <Box p={6}>
                  <VStack spacing={6} align="stretch">
                    <VStack spacing={2} textAlign="center">
                      <Text fontSize="2xl" fontWeight="bold">
                        Live Security Monitoring
                      </Text>
                      <Text color="gray.600">
                        Real-time threat detection and alert management system
                      </Text>
                    </VStack>
                    
                    <Alert status="info">
                      <AlertIcon />
                      <AlertDescription>
                        Real-time alerts will appear in the top-right corner of your screen when threats are detected.
                        You can configure alert settings and notification preferences in the dashboard.
                      </AlertDescription>
                    </Alert>

                    <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap={6}>
                      <GridItem>
                        <Card>
                          <CardHeader>
                            <HStack>
                              <Icon as={FaClock} color="blue.500" />
                              <Text fontSize="lg" fontWeight="bold">Monitoring Status</Text>
                            </HStack>
                          </CardHeader>
                          <CardBody>
                            <VStack spacing={4} align="stretch">
                              <HStack justify="space-between">
                                <Text>Real-time Detection</Text>
                                <Badge colorScheme="green">Active</Badge>
                              </HStack>
                              <HStack justify="space-between">
                                <Text>Cross-chain Analysis</Text>
                                <Badge colorScheme="green">Online</Badge>
                              </HStack>
                              <HStack justify="space-between">
                                <Text>Alert System</Text>
                                <Badge colorScheme="green">Enabled</Badge>
                              </HStack>
                              <HStack justify="space-between">
                                <Text>Auto-response</Text>
                                <Badge colorScheme="green">Armed</Badge>
                              </HStack>
                            </VStack>
                          </CardBody>
                        </Card>
                      </GridItem>

                      <GridItem>
                        <Card>
                          <CardHeader>
                            <HStack>
                              <Icon as={FaGlobe} color="purple.500" />
                              <Text fontSize="lg" fontWeight="bold">Network Coverage</Text>
                            </HStack>
                          </CardHeader>
                          <CardBody>
                            <VStack spacing={4} align="stretch">
                              <HStack justify="space-between">
                                <Text>Ethereum Mainnet</Text>
                                <Badge colorScheme="green">Monitored</Badge>
                              </HStack>
                              <HStack justify="space-between">
                                <Text>Polygon Network</Text>
                                <Badge colorScheme="green">Monitored</Badge>
                              </HStack>
                              <HStack justify="space-between">
                                <Text>BSC Network</Text>
                                <Badge colorScheme="green">Monitored</Badge>
                              </HStack>
                              <HStack justify="space-between">
                                <Text>OneChain Network</Text>
                                <Badge colorScheme="green">Monitored</Badge>
                              </HStack>
                              <HStack justify="space-between">
                                <Text>Avalanche C-Chain</Text>
                                <Badge colorScheme="green">Monitored</Badge>
                              </HStack>
                            </VStack>
                          </CardBody>
                        </Card>
                      </GridItem>
                    </Grid>
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
                  <Icon as={FaRobot} color="purple.500" />
                  <Text fontSize="lg" fontWeight="bold">Detection Capabilities</Text>
                </HStack>
              </CardHeader>
              <CardBody>
                <VStack spacing={3} align="stretch">
                  <HStack justify="space-between">
                    <Text>Bridge Exploit Detection</Text>
                    <Badge colorScheme="purple">Advanced</Badge>
                  </HStack>
                  <HStack justify="space-between">
                    <Text>Flash Loan Attack Prevention</Text>
                    <Badge colorScheme="purple">Active</Badge>
                  </HStack>
                  <HStack justify="space-between">
                    <Text>Wash Trading Detection</Text>
                    <Badge colorScheme="purple">ML-Powered</Badge>
                  </HStack>
                  <HStack justify="space-between">
                    <Text>Anomaly Pattern Recognition</Text>
                    <Badge colorScheme="purple">AI-Enhanced</Badge>
                  </HStack>
                  <HStack justify="space-between">
                    <Text>Wallet Risk Profiling</Text>
                    <Badge colorScheme="purple">Real-time</Badge>
                  </HStack>
                </VStack>
              </CardBody>
            </Card>
          </GridItem>

          <GridItem>
            <Card>
              <CardHeader>
                <HStack>
                  <Icon as={FaLock} color="green.500" />
                  <Text fontSize="lg" fontWeight="bold">Response Mechanisms</Text>
                </HStack>
              </CardHeader>
              <CardBody>
                <VStack spacing={3} align="stretch">
                  <HStack justify="space-between">
                    <Text>Automatic Blacklisting</Text>
                    <Badge colorScheme="green">Enabled</Badge>
                  </HStack>
                  <HStack justify="space-between">
                    <Text>Transaction Flagging</Text>
                    <Badge colorScheme="green">Active</Badge>
                  </HStack>
                  <HStack justify="space-between">
                    <Text>Alert Notifications</Text>
                    <Badge colorScheme="green">Multi-channel</Badge>
                  </HStack>
                  <HStack justify="space-between">
                    <Text>Emergency Protocols</Text>
                    <Badge colorScheme="green">Armed</Badge>
                  </HStack>
                  <HStack justify="space-between">
                    <Text>Incident Reporting</Text>
                    <Badge colorScheme="green">Automated</Badge>
                  </HStack>
                </VStack>
              </CardBody>
            </Card>
          </GridItem>
        </Grid>

        {/* Footer */}
        <Box textAlign="center" py={6}>
          <Text color="gray.600" fontSize="sm">
            Powered by OmniFlow • Protected by Advanced AI • 
            Securing Cross-Chain Assets 24/7
          </Text>
        </Box>
      </VStack>

      {/* Real-time Alerts Component (Fixed Position) */}
      <RealTimeAlerts />
    </Container>
  );
}
