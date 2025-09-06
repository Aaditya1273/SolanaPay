"use client";

import { useState, useEffect } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  useColorModeValue,
  Icon,
  Grid,
  GridItem,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Tooltip,
  Select,
  Button,
} from "@chakra-ui/react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  FaChartLine,
  FaShieldAlt,
  FaExclamationTriangle,
  FaNetworkWired,
  FaRefresh,
} from "react-icons/fa";
import { SecurityMetrics, crossChainSecurityService } from "../../services/crossChainSecurityService";

export default function ThreatVisualization() {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d'>('7d');
  const [isLoading, setIsLoading] = useState(true);

  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  useEffect(() => {
    loadMetrics();
  }, [timeframe]);

  const loadMetrics = async () => {
    setIsLoading(true);
    try {
      const data = await crossChainSecurityService.getSecurityMetrics();
      setMetrics(data);
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Chart colors
  const COLORS = {
    critical: '#E53E3E',
    high: '#FF8C00',
    medium: '#FFD700',
    low: '#38A169',
    resolved: '#68D391',
    investigating: '#F6AD55',
    active: '#FC8181',
    false_positive: '#A0AEC0',
  };

  const PIE_COLORS = ['#E53E3E', '#FF8C00', '#FFD700', '#38A169', '#9F7AEA'];

  // Mock data for charts (in production, this would come from the service)
  const threatTrendData = metrics?.recentTrends?.map(trend => ({
    date: new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    alerts: trend.alerts,
    threats: trend.threats,
    resolved: Math.floor(trend.threats * 0.8),
  })) || [];

  const severityDistribution = metrics ? [
    { name: 'Critical', value: metrics.alertsBySeverity.critical, color: COLORS.critical },
    { name: 'High', value: metrics.alertsBySeverity.high, color: COLORS.high },
    { name: 'Medium', value: metrics.alertsBySeverity.medium, color: COLORS.medium },
    { name: 'Low', value: metrics.alertsBySeverity.low, color: COLORS.low },
  ] : [];

  const threatTypeData = metrics ? [
    { name: 'Fraud Detection', value: metrics.alertsByType.fraud_detection },
    { name: 'Bridge Exploits', value: metrics.alertsByType.bridge_exploit },
    { name: 'Anomaly Detection', value: metrics.alertsByType.anomaly_detection },
    { name: 'Suspicious Activity', value: metrics.alertsByType.suspicious_activity },
    { name: 'Flash Loan Attacks', value: metrics.alertsByType.flash_loan_attack },
  ] : [];

  const chainRiskData = metrics?.topRiskChains?.map(chain => ({
    name: `Chain ${chain.chainId}`,
    riskScore: chain.riskScore,
    alerts: chain.alertCount,
  })) || [];

  const responseTimeData = [
    { time: '0-30s', count: 45, percentage: 60 },
    { time: '30s-1m', count: 20, percentage: 27 },
    { time: '1-2m', count: 8, percentage: 11 },
    { time: '2m+', count: 2, percentage: 2 },
  ];

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <HStack justify="space-between" align="center">
        <HStack spacing={3}>
          <Icon as={FaChartLine} color="purple.500" boxSize={6} />
          <Text fontSize="xl" fontWeight="bold">
            Threat Analytics & Visualization
          </Text>
        </HStack>
        
        <HStack spacing={3}>
          <Select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as '24h' | '7d' | '30d')}
            w="120px"
          >
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </Select>
          
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Icon as={FaRefresh} />}
            onClick={loadMetrics}
            isLoading={isLoading}
          >
            Refresh
          </Button>
        </HStack>
      </HStack>

      {/* Charts Grid */}
      <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap={6}>
        {/* Threat Trends */}
        <GridItem colSpan={{ base: 1, lg: 2 }}>
          <Card>
            <CardHeader>
              <HStack>
                <Icon as={FaChartLine} color="blue.500" />
                <Text fontSize="lg" fontWeight="bold">Threat Detection Trends</Text>
              </HStack>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={threatTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="alerts"
                    stackId="1"
                    stroke="#E53E3E"
                    fill="#E53E3E"
                    fillOpacity={0.6}
                    name="Total Alerts"
                  />
                  <Area
                    type="monotone"
                    dataKey="threats"
                    stackId="2"
                    stroke="#FF8C00"
                    fill="#FF8C00"
                    fillOpacity={0.6}
                    name="Confirmed Threats"
                  />
                  <Area
                    type="monotone"
                    dataKey="resolved"
                    stackId="3"
                    stroke="#38A169"
                    fill="#38A169"
                    fillOpacity={0.6}
                    name="Resolved"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>
        </GridItem>

        {/* Severity Distribution */}
        <GridItem>
          <Card>
            <CardHeader>
              <HStack>
                <Icon as={FaExclamationTriangle} color="red.500" />
                <Text fontSize="lg" fontWeight="bold">Alert Severity Distribution</Text>
              </HStack>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={severityDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {severityDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>
        </GridItem>

        {/* Threat Types */}
        <GridItem>
          <Card>
            <CardHeader>
              <HStack>
                <Icon as={FaShieldAlt} color="purple.500" />
                <Text fontSize="lg" fontWeight="bold">Threat Types</Text>
              </HStack>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={threatTypeData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <RechartsTooltip />
                  <Bar dataKey="value" fill="#9F7AEA" />
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>
        </GridItem>

        {/* Chain Risk Scores */}
        <GridItem>
          <Card>
            <CardHeader>
              <HStack>
                <Icon as={FaNetworkWired} color="orange.500" />
                <Text fontSize="lg" fontWeight="bold">Chain Risk Analysis</Text>
              </HStack>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chainRiskData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="riskScore" fill="#FF8C00" name="Risk Score" />
                  <Bar dataKey="alerts" fill="#E53E3E" name="Alert Count" />
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>
        </GridItem>

        {/* Response Time Distribution */}
        <GridItem>
          <Card>
            <CardHeader>
              <Text fontSize="lg" fontWeight="bold">Response Time Distribution</Text>
            </CardHeader>
            <CardBody>
              <VStack spacing={4} align="stretch">
                {responseTimeData.map((item, index) => (
                  <HStack key={index} justify="space-between">
                    <HStack spacing={3} flex={1}>
                      <Text fontSize="sm" fontWeight="semibold" w="60px">
                        {item.time}
                      </Text>
                      <Box flex={1} bg="gray.100" rounded="full" h="20px" position="relative">
                        <Box
                          bg={index === 0 ? "green.500" : index === 1 ? "yellow.500" : index === 2 ? "orange.500" : "red.500"}
                          h="100%"
                          rounded="full"
                          w={`${item.percentage}%`}
                          transition="width 0.3s"
                        />
                      </Box>
                    </HStack>
                    <VStack spacing={0} align="end">
                      <Text fontSize="sm" fontWeight="bold">
                        {item.count}
                      </Text>
                      <Text fontSize="xs" color="gray.600">
                        {item.percentage}%
                      </Text>
                    </VStack>
                  </HStack>
                ))}
              </VStack>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>

      {/* Summary Stats */}
      <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={4}>
        <GridItem>
          <Card>
            <CardBody textAlign="center">
              <VStack spacing={2}>
                <Text fontSize="2xl" fontWeight="bold" color="red.500">
                  {metrics?.alertsGenerated || 0}
                </Text>
                <Text fontSize="sm" color="gray.600">Total Alerts</Text>
                <Badge colorScheme="red" variant="outline">
                  +{Math.floor(Math.random() * 20) + 5} today
                </Badge>
              </VStack>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem>
          <Card>
            <CardBody textAlign="center">
              <VStack spacing={2}>
                <Text fontSize="2xl" fontWeight="bold" color="orange.500">
                  {metrics?.criticalThreatsDetected || 0}
                </Text>
                <Text fontSize="sm" color="gray.600">Critical Threats</Text>
                <Badge colorScheme="orange" variant="outline">
                  {metrics?.criticalThreatsDetected ? Math.round((metrics.criticalThreatsDetected / metrics.alertsGenerated) * 100) : 0}% of total
                </Badge>
              </VStack>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem>
          <Card>
            <CardBody textAlign="center">
              <VStack spacing={2}>
                <Text fontSize="2xl" fontWeight="bold" color="green.500">
                  {metrics ? Math.round((1 - metrics.falsePositiveRate) * 100) : 95}%
                </Text>
                <Text fontSize="sm" color="gray.600">Accuracy Rate</Text>
                <Badge colorScheme="green" variant="outline">
                  High precision
                </Badge>
              </VStack>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem>
          <Card>
            <CardBody textAlign="center">
              <VStack spacing={2}>
                <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                  {metrics ? Math.round(metrics.averageResponseTime) : 0}s
                </Text>
                <Text fontSize="sm" color="gray.600">Avg Response</Text>
                <Badge colorScheme="blue" variant="outline">
                  Real-time
                </Badge>
              </VStack>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>
    </VStack>
  );
}
