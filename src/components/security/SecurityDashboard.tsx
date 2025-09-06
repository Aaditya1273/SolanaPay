"use client";

import { useState, useEffect } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  useColorModeValue,
  Icon,
  Grid,
  GridItem,
  Card,
  CardBody,
  CardHeader,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Badge,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Progress,
  CircularProgress,
  CircularProgressLabel,
  Tooltip,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Flex,
  Spacer,
  Switch,
  FormControl,
  FormLabel,
  Spinner,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
} from "@chakra-ui/react";
import {
  FaShieldAlt,
  FaExclamationTriangle,
  FaSearch,
  FaFilter,
  FaPlay,
  FaStop,
  FaRefresh,
  FaChartLine,
  FaEye,
  FaClock,
  FaNetworkWired,
  FaRobot,
  FaUsers,
  FaBan,
  FaCheckCircle,
} from "react-icons/fa";
import { 
  SecurityAlert, 
  SecurityMetrics,
  BridgeTransfer,
  WalletProfile,
  crossChainSecurityService 
} from "../../services/crossChainSecurityService";
import SecurityAlertCard from "./SecurityAlertCard";

export default function SecurityDashboard() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [bridgeTransfers, setBridgeTransfers] = useState<BridgeTransfer[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [chainFilter, setChainFilter] = useState("all");
  const [activeTab, setActiveTab] = useState(0);

  const { isOpen: isAlertOpen, onOpen: onAlertOpen, onClose: onAlertClose } = useDisclosure();
  const { isOpen: isSettingsOpen, onOpen: onSettingsOpen, onClose: onSettingsClose } = useDisclosure();

  const toast = useToast();

  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const statBg = useColorModeValue("gray.50", "gray.700");

  useEffect(() => {
    loadDashboardData();
    setupEventListeners();
    
    return () => {
      crossChainSecurityService.removeAllListeners();
    };
  }, []);

  const setupEventListeners = () => {
    crossChainSecurityService.on('new_alert', (alert: SecurityAlert) => {
      setAlerts(prev => [alert, ...prev]);
      
      toast({
        title: `New ${alert.severity.toUpperCase()} Alert`,
        description: alert.title,
        status: alert.severity === 'critical' ? 'error' : 'warning',
        duration: 5000,
        isClosable: true,
      });
    });

    crossChainSecurityService.on('monitoring_started', () => {
      setIsMonitoring(true);
      toast({
        title: "Monitoring Started",
        description: "Cross-chain security monitoring is now active",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    });

    crossChainSecurityService.on('monitoring_stopped', () => {
      setIsMonitoring(false);
      toast({
        title: "Monitoring Stopped",
        description: "Cross-chain security monitoring has been stopped",
        status: "info",
        duration: 3000,
        isClosable: true,
      });
    });
  };

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [alertsData, bridgeData, metricsData] = await Promise.all([
        crossChainSecurityService.getSecurityAlerts({ limit: 50 }),
        crossChainSecurityService.getBridgeTransfers({ limit: 20 }),
        crossChainSecurityService.getSecurityMetrics(),
      ]);

      setAlerts(alertsData);
      setBridgeTransfers(bridgeData);
      setMetrics(metricsData);
      
      // Check monitoring status
      const status = crossChainSecurityService.getMonitoringStatus();
      setIsMonitoring(status.isActive);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error Loading Data",
        description: "Failed to load security dashboard data",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartMonitoring = async () => {
    try {
      await crossChainSecurityService.startMonitoring();
    } catch (error) {
      toast({
        title: "Failed to Start Monitoring",
        description: "Could not start security monitoring",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleStopMonitoring = async () => {
    try {
      await crossChainSecurityService.stopMonitoring();
    } catch (error) {
      toast({
        title: "Failed to Stop Monitoring",
        description: "Could not stop security monitoring",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleAlertStatusChange = (alertId: string, status: SecurityAlert['status']) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, status } : alert
    ));
  };

  const handleViewAlertDetails = (alert: SecurityAlert) => {
    setSelectedAlert(alert);
    onAlertOpen();
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === "all" || alert.severity === severityFilter;
    const matchesStatus = statusFilter === "all" || alert.status === statusFilter;
    const matchesChain = chainFilter === "all" || alert.chainId.toString() === chainFilter;
    
    return matchesSearch && matchesSeverity && matchesStatus && matchesChain;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      case 'low': return 'blue';
      default: return 'gray';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'red';
      case 'investigating': return 'yellow';
      case 'resolved': return 'green';
      case 'false_positive': return 'gray';
      default: return 'gray';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <VStack spacing={6} align="center" justify="center" minH="400px">
        <Spinner size="xl" color="purple.500" />
        <Text>Loading security dashboard...</Text>
      </VStack>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <Box
        bg={cardBg}
        p={6}
        rounded="xl"
        border="1px solid"
        borderColor={borderColor}
      >
        <Flex align="center">
          <HStack spacing={4}>
            <Icon as={FaShieldAlt} color="red.500" boxSize={8} />
            <VStack align="start" spacing={1}>
              <Text fontSize="2xl" fontWeight="bold">
                Cross-Chain Security Dashboard
              </Text>
              <Text color="gray.600">
                Real-time fraud detection and threat monitoring across all supported chains
              </Text>
            </VStack>
          </HStack>
          
          <Spacer />
          
          <HStack spacing={3}>
            <FormControl display="flex" alignItems="center">
              <FormLabel htmlFor="monitoring-switch" mb="0" fontSize="sm">
                Live Monitoring
              </FormLabel>
              <Switch
                id="monitoring-switch"
                colorScheme="red"
                isChecked={isMonitoring}
                onChange={isMonitoring ? handleStopMonitoring : handleStartMonitoring}
              />
            </FormControl>
            
            <Button
              variant="outline"
              leftIcon={<Icon as={FaRefresh} />}
              onClick={loadDashboardData}
            >
              Refresh
            </Button>
            
            <Button
              variant="ghost"
              leftIcon={<Icon as={FaFilter} />}
              onClick={onSettingsOpen}
            >
              Settings
            </Button>
          </HStack>
        </Flex>
      </Box>

      {/* Monitoring Status Alert */}
      {!isMonitoring && (
        <Alert status="warning">
          <AlertIcon />
          <Box>
            <AlertTitle>Monitoring Disabled</AlertTitle>
            <AlertDescription>
              Real-time security monitoring is currently disabled. Enable it to receive live threat alerts.
            </AlertDescription>
          </Box>
          <Spacer />
          <Button
            colorScheme="orange"
            size="sm"
            leftIcon={<Icon as={FaPlay} />}
            onClick={handleStartMonitoring}
          >
            Start Monitoring
          </Button>
        </Alert>
      )}

      {/* Stats Grid */}
      {metrics && (
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }} gap={6}>
          <GridItem>
            <Card>
              <CardBody>
                <Stat>
                  <StatLabel>Total Alerts</StatLabel>
                  <StatNumber color="red.500">{metrics.alertsGenerated}</StatNumber>
                  <StatHelpText>
                    <StatArrow type="increase" />
                    {Math.floor(Math.random() * 20) + 5} this week
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </GridItem>

          <GridItem>
            <Card>
              <CardBody>
                <Stat>
                  <StatLabel>Critical Threats</StatLabel>
                  <StatNumber color="red.600">{metrics.criticalThreatsDetected}</StatNumber>
                  <StatHelpText>
                    {metrics.alertsGenerated > 0 
                      ? `${Math.round((metrics.criticalThreatsDetected / metrics.alertsGenerated) * 100)}% of total`
                      : "0% of total"
                    }
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </GridItem>

          <GridItem>
            <Card>
              <CardBody>
                <Stat>
                  <StatLabel>Bridge Transfers</StatLabel>
                  <StatNumber>{metrics.bridgeTransfersMonitored.toLocaleString()}</StatNumber>
                  <StatHelpText>
                    <CircularProgress 
                      value={85} 
                      color="blue.500"
                      size="40px"
                      thickness="8px"
                    />
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </GridItem>

          <GridItem>
            <Card>
              <CardBody>
                <VStack spacing={2}>
                  <HStack w="full" justify="space-between">
                    <Text fontSize="sm" color="gray.600">Response Time</Text>
                    <Text fontSize="sm" fontWeight="bold" color="green.500">
                      {Math.round(metrics.averageResponseTime)}s
                    </Text>
                  </HStack>
                  <HStack w="full" justify="space-between">
                    <Text fontSize="sm" color="gray.600">False Positives</Text>
                    <Text fontSize="sm" fontWeight="bold" color="yellow.500">
                      {Math.round(metrics.falsePositiveRate * 100)}%
                    </Text>
                  </HStack>
                  <Progress 
                    value={100 - (metrics.falsePositiveRate * 100)}
                    colorScheme="green"
                    size="sm"
                    w="full"
                  />
                </VStack>
              </CardBody>
            </Card>
          </GridItem>
        </Grid>
      )}

      {/* Main Content Tabs */}
      <Card>
        <CardBody>
          <Tabs index={activeTab} onChange={setActiveTab}>
            <TabList>
              <Tab>
                <HStack spacing={2}>
                  <Icon as={FaExclamationTriangle} />
                  <Text>Security Alerts</Text>
                  {alerts.filter(a => a.status === 'active').length > 0 && (
                    <Badge colorScheme="red" variant="solid">
                      {alerts.filter(a => a.status === 'active').length}
                    </Badge>
                  )}
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <Icon as={FaNetworkWired} />
                  <Text>Bridge Monitoring</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <Icon as={FaChartLine} />
                  <Text>Analytics</Text>
                </HStack>
              </Tab>
            </TabList>

            <TabPanels>
              {/* Security Alerts Tab */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  {/* Filters */}
                  <HStack spacing={4} flexWrap="wrap">
                    <InputGroup maxW="300px">
                      <InputLeftElement>
                        <Icon as={FaSearch} color="gray.400" />
                      </InputLeftElement>
                      <Input
                        placeholder="Search alerts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </InputGroup>
                    
                    <Select
                      maxW="150px"
                      value={severityFilter}
                      onChange={(e) => setSeverityFilter(e.target.value)}
                    >
                      <option value="all">All Severities</option>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </Select>
                    
                    <Select
                      maxW="150px"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="investigating">Investigating</option>
                      <option value="resolved">Resolved</option>
                      <option value="false_positive">False Positive</option>
                    </Select>
                    
                    <Select
                      maxW="150px"
                      value={chainFilter}
                      onChange={(e) => setChainFilter(e.target.value)}
                    >
                      <option value="all">All Chains</option>
                      <option value="1">Ethereum</option>
                      <option value="137">Polygon</option>
                      <option value="56">BSC</option>
                      <option value="1000">OneChain</option>
                      <option value="43114">Avalanche</option>
                    </Select>
                  </HStack>

                  {/* Alerts List */}
                  <VStack spacing={4} align="stretch">
                    {filteredAlerts.map((alert) => (
                      <SecurityAlertCard
                        key={alert.id}
                        alert={alert}
                        onStatusChange={handleAlertStatusChange}
                        onViewDetails={handleViewAlertDetails}
                      />
                    ))}
                  </VStack>

                  {filteredAlerts.length === 0 && (
                    <Box textAlign="center" py={10}>
                      <Icon as={FaCheckCircle} boxSize={12} color="green.400" mb={4} />
                      <Text fontSize="lg" color="gray.600">
                        {searchTerm || severityFilter !== "all" || statusFilter !== "all" || chainFilter !== "all"
                          ? "No alerts match your filters"
                          : "No security alerts detected"
                        }
                      </Text>
                      <Text fontSize="sm" color="gray.500" mt={2}>
                        {!searchTerm && severityFilter === "all" && statusFilter === "all" && chainFilter === "all" && 
                         "Your cross-chain assets are secure"}
                      </Text>
                    </Box>
                  )}
                </VStack>
              </TabPanel>

              {/* Bridge Monitoring Tab */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  <Text fontSize="lg" fontWeight="bold">Recent Bridge Transfers</Text>
                  
                  <TableContainer>
                    <Table variant="simple">
                      <Thead>
                        <Tr>
                          <Th>Transfer ID</Th>
                          <Th>Route</Th>
                          <Th>Amount</Th>
                          <Th>Risk Score</Th>
                          <Th>Status</Th>
                          <Th>Time</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {bridgeTransfers.slice(0, 10).map((transfer) => (
                          <Tr key={transfer.id}>
                            <Td fontFamily="mono" fontSize="sm">
                              {transfer.id.substring(0, 8)}...
                            </Td>
                            <Td>
                              <Text fontSize="sm">
                                Chain {transfer.sourceChain} → Chain {transfer.targetChain}
                              </Text>
                            </Td>
                            <Td>${parseFloat(transfer.amount).toLocaleString()}</Td>
                            <Td>
                              <HStack spacing={2}>
                                <Progress 
                                  value={transfer.riskScore} 
                                  colorScheme={transfer.riskScore > 70 ? "red" : transfer.riskScore > 40 ? "yellow" : "green"}
                                  size="sm"
                                  w="60px"
                                />
                                <Text fontSize="sm">{transfer.riskScore}</Text>
                              </HStack>
                            </Td>
                            <Td>
                              <Badge 
                                colorScheme={
                                  transfer.status === 'completed' ? 'green' :
                                  transfer.status === 'suspicious' ? 'red' :
                                  transfer.status === 'pending' ? 'yellow' : 'gray'
                                }
                              >
                                {transfer.status.toUpperCase()}
                              </Badge>
                            </Td>
                            <Td fontSize="sm">{formatTimestamp(transfer.timestamp)}</Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </TableContainer>

                  {bridgeTransfers.length === 0 && (
                    <Box textAlign="center" py={10}>
                      <Icon as={FaNetworkWired} boxSize={12} color="gray.400" mb={4} />
                      <Text fontSize="lg" color="gray.600">No bridge transfers detected</Text>
                    </Box>
                  )}
                </VStack>
              </TabPanel>

              {/* Analytics Tab */}
              <TabPanel>
                <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap={6}>
                  <GridItem>
                    <Card>
                      <CardHeader>
                        <Text fontSize="lg" fontWeight="bold">Threat Distribution</Text>
                      </CardHeader>
                      <CardBody>
                        {metrics && (
                          <VStack spacing={3} align="stretch">
                            <HStack justify="space-between">
                              <Text fontSize="sm">Fraud Detection</Text>
                              <Badge colorScheme="red">{metrics.alertsByType?.fraud_detection || 0}</Badge>
                            </HStack>
                            <HStack justify="space-between">
                              <Text fontSize="sm">Bridge Exploits</Text>
                              <Badge colorScheme="orange">{metrics.alertsByType?.bridge_exploit || 0}</Badge>
                            </HStack>
                            <HStack justify="space-between">
                              <Text fontSize="sm">Anomaly Detection</Text>
                              <Badge colorScheme="yellow">{metrics.alertsByType?.anomaly_detection || 0}</Badge>
                            </HStack>
                            <HStack justify="space-between">
                              <Text fontSize="sm">Suspicious Activity</Text>
                              <Badge colorScheme="purple">{metrics.alertsByType?.suspicious_activity || 0}</Badge>
                            </HStack>
                            <HStack justify="space-between">
                              <Text fontSize="sm">Flash Loan Attacks</Text>
                              <Badge colorScheme="pink">{metrics.alertsByType?.flash_loan_attack || 0}</Badge>
                            </HStack>
                          </VStack>
                        )}
                      </CardBody>
                    </Card>
                  </GridItem>

                  <GridItem>
                    <Card>
                      <CardHeader>
                        <Text fontSize="lg" fontWeight="bold">Top Risk Chains</Text>
                      </CardHeader>
                      <CardBody>
                        {metrics?.topRiskChains && (
                          <VStack spacing={3} align="stretch">
                            {metrics.topRiskChains.slice(0, 5).map((chain, index) => (
                              <HStack key={chain.chainId} justify="space-between">
                                <Text fontSize="sm">
                                  Chain {chain.chainId}
                                </Text>
                                <HStack spacing={2}>
                                  <Progress 
                                    value={chain.riskScore} 
                                    colorScheme={chain.riskScore > 70 ? "red" : chain.riskScore > 40 ? "yellow" : "green"}
                                    size="sm"
                                    w="80px"
                                  />
                                  <Text fontSize="sm" w="40px">{chain.riskScore}</Text>
                                </HStack>
                              </HStack>
                            ))}
                          </VStack>
                        )}
                      </CardBody>
                    </Card>
                  </GridItem>
                </Grid>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </CardBody>
      </Card>

      {/* Alert Details Modal */}
      <Modal isOpen={isAlertOpen} onClose={onAlertClose} size="4xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Security Alert Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedAlert && (
              <SecurityAlertCard
                alert={selectedAlert}
                onStatusChange={handleAlertStatusChange}
              />
            )}
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="purple" onClick={onAlertClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Settings Modal */}
      <Modal isOpen={isSettingsOpen} onClose={onSettingsClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Security Settings</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl display="flex" alignItems="center">
                <FormLabel flex="1">Real-time Monitoring</FormLabel>
                <Switch
                  colorScheme="red"
                  isChecked={isMonitoring}
                  onChange={isMonitoring ? handleStopMonitoring : handleStartMonitoring}
                />
              </FormControl>
              
              <FormControl display="flex" alignItems="center">
                <FormLabel flex="1">Auto-response to Critical Threats</FormLabel>
                <Switch colorScheme="red" defaultChecked />
              </FormControl>
              
              <FormControl display="flex" alignItems="center">
                <FormLabel flex="1">Email Notifications</FormLabel>
                <Switch colorScheme="blue" defaultChecked />
              </FormControl>
              
              <FormControl display="flex" alignItems="center">
                <FormLabel flex="1">Slack Integration</FormLabel>
                <Switch colorScheme="green" />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="purple" onClick={onSettingsClose}>
              Save Settings
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
