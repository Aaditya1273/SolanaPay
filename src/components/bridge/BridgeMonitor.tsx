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
  Spinner,
} from "@chakra-ui/react";
import {
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaNetworkWired,
  FaGasPump,
  FaCoins,
} from "react-icons/fa";

interface NetworkStatus {
  chainId: number;
  name: string;
  status: "online" | "congested" | "offline";
  gasPrice: string;
  congestion: number;
  lastBlock: number;
  validators: number;
  bridgeBalance: string;
}

interface BridgeMetrics {
  totalVolume24h: string;
  totalTransactions24h: number;
  averageTime: string;
  successRate: number;
  totalValueLocked: string;
}

const mockNetworkStatus: NetworkStatus[] = [
  {
    chainId: 1,
    name: "Ethereum",
    status: "online",
    gasPrice: "25 gwei",
    congestion: 75,
    lastBlock: 18500000,
    validators: 500000,
    bridgeBalance: "1,250 ETH",
  },
  {
    chainId: 137,
    name: "Polygon",
    status: "online",
    gasPrice: "35 gwei",
    congestion: 45,
    lastBlock: 48500000,
    validators: 100,
    bridgeBalance: "50,000 MATIC",
  },
  {
    chainId: 56,
    name: "BSC",
    status: "congested",
    gasPrice: "8 gwei",
    congestion: 85,
    lastBlock: 32500000,
    validators: 21,
    bridgeBalance: "2,500 BNB",
  },
  {
    chainId: 1001,
    name: "OneChain Testnet",
    status: "online",
    gasPrice: "1 gwei",
    congestion: 25,
    lastBlock: 1500000,
    validators: 50,
    bridgeBalance: "10,000 OCT",
  },
];

const mockMetrics: BridgeMetrics = {
  totalVolume24h: "$2.4M",
  totalTransactions24h: 1247,
  averageTime: "8.5 min",
  successRate: 99.2,
  totalValueLocked: "$45.8M",
};

export default function BridgeMonitor() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus[]>(mockNetworkStatus);
  const [metrics, setMetrics] = useState<BridgeMetrics>(mockMetrics);
  const [isLoading, setIsLoading] = useState(false);
  
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "green";
      case "congested": return "yellow";
      case "offline": return "red";
      default: return "gray";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "online": return FaCheckCircle;
      case "congested": return FaExclamationTriangle;
      case "offline": return FaExclamationTriangle;
      default: return FaClock;
    }
  };

  const getCongestionColor = (congestion: number) => {
    if (congestion < 30) return "green";
    if (congestion < 70) return "yellow";
    return "red";
  };

  const refreshData = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  useEffect(() => {
    const interval = setInterval(refreshData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <VStack spacing={6} w="full">
      {/* Header */}
      <HStack justify="space-between" w="full">
        <Heading size="lg">Bridge Network Monitor</Heading>
        <Button
          size="sm"
          onClick={refreshData}
          isLoading={isLoading}
          leftIcon={<Icon as={FaNetworkWired} />}
        >
          Refresh
        </Button>
      </HStack>

      {/* Bridge Metrics */}
      <SimpleGrid columns={{ base: 2, md: 5 }} spacing={4} w="full">
        <Stat textAlign="center" bg={cardBg} p={4} rounded="lg" border="1px solid" borderColor={borderColor}>
          <StatLabel>24h Volume</StatLabel>
          <StatNumber color="blue.500">{metrics.totalVolume24h}</StatNumber>
          <StatHelpText>+12.5%</StatHelpText>
        </Stat>
        
        <Stat textAlign="center" bg={cardBg} p={4} rounded="lg" border="1px solid" borderColor={borderColor}>
          <StatLabel>24h Transactions</StatLabel>
          <StatNumber color="green.500">{metrics.totalTransactions24h}</StatNumber>
          <StatHelpText>+8.2%</StatHelpText>
        </Stat>
        
        <Stat textAlign="center" bg={cardBg} p={4} rounded="lg" border="1px solid" borderColor={borderColor}>
          <StatLabel>Avg Time</StatLabel>
          <StatNumber color="purple.500">{metrics.averageTime}</StatNumber>
          <StatHelpText>-15%</StatHelpText>
        </Stat>
        
        <Stat textAlign="center" bg={cardBg} p={4} rounded="lg" border="1px solid" borderColor={borderColor}>
          <StatLabel>Success Rate</StatLabel>
          <StatNumber color="green.500">{metrics.successRate}%</StatNumber>
          <StatHelpText>+0.3%</StatHelpText>
        </Stat>
        
        <Stat textAlign="center" bg={cardBg} p={4} rounded="lg" border="1px solid" borderColor={borderColor}>
          <StatLabel>Total TVL</StatLabel>
          <StatNumber color="orange.500">{metrics.totalValueLocked}</StatNumber>
          <StatHelpText>+5.7%</StatHelpText>
        </Stat>
      </SimpleGrid>

      {/* Network Status Cards */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} w="full">
        {networkStatus.map((network) => (
          <Card key={network.chainId} bg={cardBg} border="1px solid" borderColor={borderColor}>
            <CardHeader pb={2}>
              <HStack justify="space-between">
                <Heading size="md">{network.name}</Heading>
                <HStack>
                  <Icon as={getStatusIcon(network.status)} color={`${getStatusColor(network.status)}.500`} />
                  <Badge colorScheme={getStatusColor(network.status)}>
                    {network.status}
                  </Badge>
                </HStack>
              </HStack>
            </CardHeader>
            
            <CardBody pt={0}>
              <VStack spacing={3} align="start">
                <HStack justify="space-between" w="full">
                  <HStack>
                    <Icon as={FaGasPump} color="gray.500" />
                    <Text fontSize="sm">Gas Price:</Text>
                  </HStack>
                  <Text fontSize="sm" fontWeight="semibold">{network.gasPrice}</Text>
                </HStack>
                
                <VStack align="start" w="full" spacing={1}>
                  <HStack justify="space-between" w="full">
                    <Text fontSize="sm">Congestion:</Text>
                    <Text fontSize="sm" fontWeight="semibold">{network.congestion}%</Text>
                  </HStack>
                  <Progress
                    value={network.congestion}
                    colorScheme={getCongestionColor(network.congestion)}
                    size="sm"
                    w="full"
                  />
                </VStack>
                
                <HStack justify="space-between" w="full">
                  <Text fontSize="sm">Last Block:</Text>
                  <Text fontSize="sm" fontWeight="semibold">#{network.lastBlock.toLocaleString()}</Text>
                </HStack>
                
                <HStack justify="space-between" w="full">
                  <Text fontSize="sm">Validators:</Text>
                  <Text fontSize="sm" fontWeight="semibold">{network.validators.toLocaleString()}</Text>
                </HStack>
                
                <HStack justify="space-between" w="full">
                  <HStack>
                    <Icon as={FaCoins} color="gray.500" />
                    <Text fontSize="sm">Bridge Balance:</Text>
                  </HStack>
                  <Text fontSize="sm" fontWeight="semibold">{network.bridgeBalance}</Text>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      {/* System Alerts */}
      <Card bg={cardBg} w="full">
        <CardHeader>
          <Heading size="md">System Alerts</Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={3}>
            <Alert status="warning">
              <AlertIcon />
              <VStack align="start" spacing={0}>
                <Text fontWeight="semibold">High congestion on BSC</Text>
                <Text fontSize="sm">Bridge transfers may take longer than usual</Text>
              </VStack>
            </Alert>
            
            <Alert status="info">
              <AlertIcon />
              <VStack align="start" spacing={0}>
                <Text fontWeight="semibold">OneChain integration active</Text>
                <Text fontSize="sm">All OneChain bridge routes are operational</Text>
              </VStack>
            </Alert>
          </VStack>
        </CardBody>
      </Card>

      {/* Recent Bridge Activity */}
      <Card bg={cardBg} w="full">
        <CardHeader>
          <Heading size="md">Recent Bridge Activity</Heading>
        </CardHeader>
        <CardBody>
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>Route</Th>
                <Th>Asset</Th>
                <Th>Amount</Th>
                <Th>Status</Th>
                <Th>Time</Th>
              </Tr>
            </Thead>
            <Tbody>
              <Tr>
                <Td>
                  <HStack spacing={1}>
                    <Badge colorScheme="blue" size="sm">ETH</Badge>
                    <Text fontSize="xs">→</Text>
                    <Badge colorScheme="green" size="sm">ONE</Badge>
                  </HStack>
                </Td>
                <Td>Property NFT</Td>
                <Td>1</Td>
                <Td>
                  <Badge colorScheme="green" size="sm">Completed</Badge>
                </Td>
                <Td>2m ago</Td>
              </Tr>
              <Tr>
                <Td>
                  <HStack spacing={1}>
                    <Badge colorScheme="purple" size="sm">POLY</Badge>
                    <Text fontSize="xs">→</Text>
                    <Badge colorScheme="yellow" size="sm">BSC</Badge>
                  </HStack>
                </Td>
                <Td>Carbon Credits</Td>
                <Td>500</Td>
                <Td>
                  <Badge colorScheme="blue" size="sm">Confirming</Badge>
                </Td>
                <Td>5m ago</Td>
              </Tr>
              <Tr>
                <Td>
                  <HStack spacing={1}>
                    <Badge colorScheme="green" size="sm">ONE</Badge>
                    <Text fontSize="xs">→</Text>
                    <Badge colorScheme="blue" size="sm">ETH</Badge>
                  </HStack>
                </Td>
                <Td>Gold Fractions</Td>
                <Td>1,000</Td>
                <Td>
                  <Badge colorScheme="yellow" size="sm">Pending</Badge>
                </Td>
                <Td>8m ago</Td>
              </Tr>
            </Tbody>
          </Table>
        </CardBody>
      </Card>
    </VStack>
  );
}
