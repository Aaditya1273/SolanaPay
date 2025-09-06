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
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Alert,
  AlertIcon,
  Tooltip,
  CircularProgress,
  CircularProgressLabel,
  Flex,
  Divider,
  List,
  ListItem,
  ListIcon,
} from "@chakra-ui/react";
import {
  FaShieldAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaEye,
  FaHistory,
  FaRobot,
  FaChartLine,
  FaUsers,
  FaCoins,
} from "react-icons/fa";

interface RiskProfile {
  address: string;
  riskLevel: "VERY_LOW" | "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH" | "BLACKLISTED";
  riskScore: number;
  lastUpdated: string;
  isVerified: boolean;
  riskFactors: string[];
  transactionCount: number;
  accountAge: string;
}

interface AssetRisk {
  tokenId: string;
  tokenContract: string;
  name: string;
  riskLevel: "VERY_LOW" | "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH" | "BLACKLISTED";
  riskScore: number;
  isVerified: boolean;
  riskFactors: string[];
  liquidityScore: number;
  complianceScore: number;
}

interface FraudAlert {
  id: string;
  type: "WALLET" | "ASSET" | "TRANSACTION";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  description: string;
  timestamp: string;
  address: string;
}

const mockWalletRisks: RiskProfile[] = [
  {
    address: "0x1234...5678",
    riskLevel: "LOW",
    riskScore: 180,
    lastUpdated: "2 hours ago",
    isVerified: true,
    riskFactors: ["Limited transaction history", "New account"],
    transactionCount: 45,
    accountAge: "3 months",
  },
  {
    address: "0x9876...4321",
    riskLevel: "HIGH",
    riskScore: 780,
    lastUpdated: "1 hour ago",
    isVerified: false,
    riskFactors: ["Rapid transactions", "Wash trading patterns", "High volume"],
    transactionCount: 2500,
    accountAge: "2 weeks",
  },
  {
    address: "0xabcd...efgh",
    riskLevel: "VERY_LOW",
    riskScore: 85,
    lastUpdated: "30 minutes ago",
    isVerified: true,
    riskFactors: [],
    transactionCount: 150,
    accountAge: "2 years",
  },
];

const mockAssetRisks: AssetRisk[] = [
  {
    tokenId: "1",
    tokenContract: "0x1111...2222",
    name: "Manhattan Property #1",
    riskLevel: "VERY_LOW",
    riskScore: 95,
    isVerified: true,
    riskFactors: [],
    liquidityScore: 850,
    complianceScore: 950,
  },
  {
    tokenId: "2",
    tokenContract: "0x3333...4444",
    name: "Carbon Credits Batch #42",
    riskLevel: "MEDIUM",
    riskScore: 420,
    isVerified: false,
    riskFactors: ["Unverified issuer", "Limited market data"],
    liquidityScore: 600,
    complianceScore: 700,
  },
];

const mockFraudAlerts: FraudAlert[] = [
  {
    id: "1",
    type: "WALLET",
    severity: "HIGH",
    title: "Suspicious Trading Pattern Detected",
    description: "Wallet showing signs of wash trading with circular transactions",
    timestamp: "5 minutes ago",
    address: "0x9876...4321",
  },
  {
    id: "2",
    type: "ASSET",
    severity: "MEDIUM",
    title: "Unverified Asset Compliance",
    description: "Asset lacks proper regulatory documentation",
    timestamp: "1 hour ago",
    address: "0x3333...4444",
  },
];

export default function RiskDashboard() {
  const [walletRisks, setWalletRisks] = useState<RiskProfile[]>(mockWalletRisks);
  const [assetRisks, setAssetRisks] = useState<AssetRisk[]>(mockAssetRisks);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>(mockFraudAlerts);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "VERY_LOW": return "green";
      case "LOW": return "blue";
      case "MEDIUM": return "yellow";
      case "HIGH": return "orange";
      case "VERY_HIGH": return "red";
      case "BLACKLISTED": return "black";
      default: return "gray";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "LOW": return "blue";
      case "MEDIUM": return "yellow";
      case "HIGH": return "orange";
      case "CRITICAL": return "red";
      default: return "gray";
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case "VERY_LOW": return FaCheckCircle;
      case "LOW": return FaShieldAlt;
      case "MEDIUM": return FaExclamationTriangle;
      case "HIGH": return FaExclamationTriangle;
      case "VERY_HIGH": return FaTimesCircle;
      case "BLACKLISTED": return FaTimesCircle;
      default: return FaShieldAlt;
    }
  };

  const runAIAnalysis = async () => {
    setIsAnalyzing(true);
    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsAnalyzing(false);
  };

  const overallRiskScore = Math.round(
    walletRisks.reduce((sum, wallet) => sum + wallet.riskScore, 0) / walletRisks.length
  );

  return (
    <VStack spacing={6} w="full">
      {/* Header */}
      <HStack justify="space-between" w="full">
        <HStack>
          <Icon as={FaRobot} color="purple.500" boxSize={6} />
          <Heading size="lg">AI Risk Dashboard</Heading>
        </HStack>
        <Button
          colorScheme="purple"
          onClick={runAIAnalysis}
          isLoading={isAnalyzing}
          loadingText="Analyzing..."
          leftIcon={<Icon as={FaRobot} />}
        >
          Run AI Analysis
        </Button>
      </HStack>

      {/* Overall Risk Metrics */}
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} w="full">
        <Card bg={cardBg} border="1px solid" borderColor={borderColor}>
          <CardBody textAlign="center">
            <CircularProgress
              value={100 - (overallRiskScore / 10)}
              color={getRiskColor(overallRiskScore < 250 ? "LOW" : overallRiskScore < 500 ? "MEDIUM" : "HIGH")}
              size="80px"
              thickness="8px"
            >
              <CircularProgressLabel fontSize="sm" fontWeight="bold">
                {Math.round(100 - (overallRiskScore / 10))}%
              </CircularProgressLabel>
            </CircularProgress>
            <Text mt={2} fontSize="sm" fontWeight="semibold">Overall Safety</Text>
          </CardBody>
        </Card>

        <Stat textAlign="center" bg={cardBg} p={4} rounded="lg" border="1px solid" borderColor={borderColor}>
          <StatLabel>Analyzed Wallets</StatLabel>
          <StatNumber color="blue.500">{walletRisks.length}</StatNumber>
          <StatHelpText>Active monitoring</StatHelpText>
        </Stat>

        <Stat textAlign="center" bg={cardBg} p={4} rounded="lg" border="1px solid" borderColor={borderColor}>
          <StatLabel>Analyzed Assets</StatLabel>
          <StatNumber color="green.500">{assetRisks.length}</StatNumber>
          <StatHelpText>Risk assessed</StatHelpText>
        </Stat>

        <Stat textAlign="center" bg={cardBg} p={4} rounded="lg" border="1px solid" borderColor={borderColor}>
          <StatLabel>Active Alerts</StatLabel>
          <StatNumber color="red.500">{fraudAlerts.length}</StatNumber>
          <StatHelpText>Requires attention</StatHelpText>
        </Stat>
      </SimpleGrid>

      {/* Fraud Alerts */}
      {fraudAlerts.length > 0 && (
        <Card bg={cardBg} w="full">
          <CardHeader>
            <HStack>
              <Icon as={FaExclamationTriangle} color="red.500" />
              <Heading size="md">Active Fraud Alerts</Heading>
            </HStack>
          </CardHeader>
          <CardBody>
            <VStack spacing={3}>
              {fraudAlerts.map((alert) => (
                <Alert key={alert.id} status={getSeverityColor(alert.severity) as any} rounded="md">
                  <AlertIcon />
                  <Box flex="1">
                    <HStack justify="space-between" mb={1}>
                      <Text fontWeight="semibold">{alert.title}</Text>
                      <HStack>
                        <Badge colorScheme={getSeverityColor(alert.severity)} size="sm">
                          {alert.severity}
                        </Badge>
                        <Badge variant="outline" size="sm">
                          {alert.type}
                        </Badge>
                      </HStack>
                    </HStack>
                    <Text fontSize="sm">{alert.description}</Text>
                    <HStack mt={2} fontSize="xs" color="gray.600">
                      <Text>{alert.address}</Text>
                      <Text>•</Text>
                      <Text>{alert.timestamp}</Text>
                    </HStack>
                  </Box>
                </Alert>
              ))}
            </VStack>
          </CardBody>
        </Card>
      )}

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} w="full">
        {/* Wallet Risk Analysis */}
        <Card bg={cardBg} border="1px solid" borderColor={borderColor}>
          <CardHeader>
            <HStack>
              <Icon as={FaUsers} color="blue.500" />
              <Heading size="md">Wallet Risk Analysis</Heading>
            </HStack>
          </CardHeader>
          <CardBody>
            <VStack spacing={4}>
              {walletRisks.map((wallet, index) => (
                <Box key={index} w="full" p={4} border="1px solid" borderColor={borderColor} rounded="md">
                  <HStack justify="space-between" mb={3}>
                    <HStack>
                      <Icon as={getRiskIcon(wallet.riskLevel)} color={`${getRiskColor(wallet.riskLevel)}.500`} />
                      <Text fontWeight="semibold" fontSize="sm">{wallet.address}</Text>
                      {wallet.isVerified && (
                        <Badge colorScheme="green" size="sm">Verified</Badge>
                      )}
                    </HStack>
                    <Badge colorScheme={getRiskColor(wallet.riskLevel)} size="sm">
                      {wallet.riskLevel.replace('_', ' ')}
                    </Badge>
                  </HStack>

                  <VStack align="start" spacing={2}>
                    <HStack justify="space-between" w="full">
                      <Text fontSize="sm">Risk Score:</Text>
                      <HStack>
                        <Progress
                          value={(wallet.riskScore / 1000) * 100}
                          colorScheme={getRiskColor(wallet.riskLevel)}
                          size="sm"
                          w="100px"
                        />
                        <Text fontSize="sm" fontWeight="semibold">{wallet.riskScore}/1000</Text>
                      </HStack>
                    </HStack>

                    <HStack justify="space-between" w="full">
                      <Text fontSize="sm">Transactions:</Text>
                      <Text fontSize="sm" fontWeight="semibold">{wallet.transactionCount}</Text>
                    </HStack>

                    <HStack justify="space-between" w="full">
                      <Text fontSize="sm">Account Age:</Text>
                      <Text fontSize="sm" fontWeight="semibold">{wallet.accountAge}</Text>
                    </HStack>

                    {wallet.riskFactors.length > 0 && (
                      <Box w="full">
                        <Text fontSize="sm" fontWeight="semibold" mb={1}>Risk Factors:</Text>
                        <List spacing={1}>
                          {wallet.riskFactors.map((factor, i) => (
                            <ListItem key={i} fontSize="xs">
                              <ListIcon as={FaExclamationTriangle} color="orange.500" />
                              {factor}
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )}

                    <Text fontSize="xs" color="gray.500">Last updated: {wallet.lastUpdated}</Text>
                  </VStack>
                </Box>
              ))}
            </VStack>
          </CardBody>
        </Card>

        {/* Asset Risk Analysis */}
        <Card bg={cardBg} border="1px solid" borderColor={borderColor}>
          <CardHeader>
            <HStack>
              <Icon as={FaCoins} color="green.500" />
              <Heading size="md">Asset Risk Analysis</Heading>
            </HStack>
          </CardHeader>
          <CardBody>
            <VStack spacing={4}>
              {assetRisks.map((asset, index) => (
                <Box key={index} w="full" p={4} border="1px solid" borderColor={borderColor} rounded="md">
                  <HStack justify="space-between" mb={3}>
                    <HStack>
                      <Icon as={getRiskIcon(asset.riskLevel)} color={`${getRiskColor(asset.riskLevel)}.500`} />
                      <VStack align="start" spacing={0}>
                        <Text fontWeight="semibold" fontSize="sm">{asset.name}</Text>
                        <Text fontSize="xs" color="gray.500">#{asset.tokenId}</Text>
                      </VStack>
                      {asset.isVerified && (
                        <Badge colorScheme="green" size="sm">Verified</Badge>
                      )}
                    </HStack>
                    <Badge colorScheme={getRiskColor(asset.riskLevel)} size="sm">
                      {asset.riskLevel.replace('_', ' ')}
                    </Badge>
                  </HStack>

                  <VStack align="start" spacing={2}>
                    <HStack justify="space-between" w="full">
                      <Text fontSize="sm">Risk Score:</Text>
                      <HStack>
                        <Progress
                          value={(asset.riskScore / 1000) * 100}
                          colorScheme={getRiskColor(asset.riskLevel)}
                          size="sm"
                          w="100px"
                        />
                        <Text fontSize="sm" fontWeight="semibold">{asset.riskScore}/1000</Text>
                      </HStack>
                    </HStack>

                    <HStack justify="space-between" w="full">
                      <Text fontSize="sm">Liquidity Score:</Text>
                      <Text fontSize="sm" fontWeight="semibold">{asset.liquidityScore}/1000</Text>
                    </HStack>

                    <HStack justify="space-between" w="full">
                      <Text fontSize="sm">Compliance Score:</Text>
                      <Text fontSize="sm" fontWeight="semibold">{asset.complianceScore}/1000</Text>
                    </HStack>

                    {asset.riskFactors.length > 0 && (
                      <Box w="full">
                        <Text fontSize="sm" fontWeight="semibold" mb={1}>Risk Factors:</Text>
                        <List spacing={1}>
                          {asset.riskFactors.map((factor, i) => (
                            <ListItem key={i} fontSize="xs">
                              <ListIcon as={FaExclamationTriangle} color="orange.500" />
                              {factor}
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )}
                  </VStack>
                </Box>
              ))}
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* AI Analysis History */}
      <Card bg={cardBg} w="full">
        <CardHeader>
          <HStack>
            <Icon as={FaHistory} color="purple.500" />
            <Heading size="md">Recent AI Analysis</Heading>
          </HStack>
        </CardHeader>
        <CardBody>
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>Target</Th>
                <Th>Type</Th>
                <Th>Risk Level</Th>
                <Th>Score</Th>
                <Th>Timestamp</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              <Tr>
                <Td>0x1234...5678</Td>
                <Td>
                  <Badge colorScheme="blue" size="sm">Wallet</Badge>
                </Td>
                <Td>
                  <Badge colorScheme="blue" size="sm">LOW</Badge>
                </Td>
                <Td>180</Td>
                <Td>2 hours ago</Td>
                <Td>
                  <Button size="xs" leftIcon={<Icon as={FaEye} />}>
                    View
                  </Button>
                </Td>
              </Tr>
              <Tr>
                <Td>Property #1</Td>
                <Td>
                  <Badge colorScheme="green" size="sm">Asset</Badge>
                </Td>
                <Td>
                  <Badge colorScheme="green" size="sm">VERY LOW</Badge>
                </Td>
                <Td>95</Td>
                <Td>3 hours ago</Td>
                <Td>
                  <Button size="xs" leftIcon={<Icon as={FaEye} />}>
                    View
                  </Button>
                </Td>
              </Tr>
            </Tbody>
          </Table>
        </CardBody>
      </Card>
    </VStack>
  );
}
