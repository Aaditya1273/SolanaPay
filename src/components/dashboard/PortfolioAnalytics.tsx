"use client";

import { useState, useEffect } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Grid,
  GridItem,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Progress,
  Badge,
  Icon,
  Tooltip,
  useColorModeValue,
  Divider,
  CircularProgress,
  CircularProgressLabel,
} from "@chakra-ui/react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  FaTrendingUp,
  FaTrendingDown,
  FaShieldAlt,
  FaGlobe,
  FaChartPie,
  FaInfoCircle,
} from "react-icons/fa";
import { PortfolioAnalytics as Analytics, portfolioService } from "../../services/portfolioService";

interface PortfolioAnalyticsProps {
  analytics: Analytics;
}

export default function PortfolioAnalytics({ analytics }: PortfolioAnalyticsProps) {
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const getRiskColor = (risk: number) => {
    if (risk < 0.15) return "green";
    if (risk < 0.25) return "yellow";
    return "red";
  };

  const getRiskLabel = (risk: number) => {
    if (risk < 0.15) return "Low Risk";
    if (risk < 0.25) return "Medium Risk";
    return "High Risk";
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Box
          bg={cardBg}
          p={3}
          border="1px solid"
          borderColor={borderColor}
          rounded="md"
          shadow="lg"
        >
          <Text fontWeight="bold">{data.name}</Text>
          <Text>{formatCurrency(data.value)}</Text>
          <Text fontSize="sm" color="gray.600">
            {formatPercentage(data.percentage)}
          </Text>
        </Box>
      );
    }
    return null;
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Key Metrics */}
      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }} gap={4}>
        <GridItem>
          <Box
            bg={cardBg}
            p={4}
            rounded="lg"
            border="1px solid"
            borderColor={borderColor}
          >
            <Stat>
              <StatLabel>Total Return</StatLabel>
              <StatNumber color={analytics.totalReturn >= 0 ? "green.500" : "red.500"}>
                {formatPercentage(analytics.totalReturn)}
              </StatNumber>
              <StatHelpText>
                <StatArrow type={analytics.totalReturn >= 0 ? "increase" : "decrease"} />
                Since inception
              </StatHelpText>
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
            <Stat>
              <StatLabel>Sharpe Ratio</StatLabel>
              <StatNumber>
                {analytics.sharpeRatio.toFixed(2)}
              </StatNumber>
              <StatHelpText>
                Risk-adjusted return
              </StatHelpText>
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
            <VStack spacing={2}>
              <HStack w="full" justify="space-between">
                <Text fontSize="sm" color="gray.600">Portfolio Risk</Text>
                <Tooltip label="Volatility measure based on price movements">
                  <Icon as={FaInfoCircle} color="gray.400" boxSize={3} />
                </Tooltip>
              </HStack>
              <CircularProgress
                value={analytics.volatility * 100}
                color={getRiskColor(analytics.volatility)}
                size="60px"
                thickness="8px"
              >
                <CircularProgressLabel fontSize="xs">
                  {formatPercentage(analytics.volatility * 100)}
                </CircularProgressLabel>
              </CircularProgress>
              <Badge colorScheme={getRiskColor(analytics.volatility)} variant="subtle">
                {getRiskLabel(analytics.volatility)}
              </Badge>
            </VStack>
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
            <Stat>
              <StatLabel>Beta</StatLabel>
              <StatNumber color={analytics.beta > 1 ? "orange.500" : "blue.500"}>
                {analytics.beta.toFixed(2)}
              </StatNumber>
              <StatHelpText>
                vs. Market correlation
              </StatHelpText>
            </Stat>
          </Box>
        </GridItem>
      </Grid>

      {/* Asset Allocation */}
      <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={6}>
        <GridItem>
          <Box
            bg={cardBg}
            p={6}
            rounded="xl"
            border="1px solid"
            borderColor={borderColor}
          >
            <VStack spacing={4} align="stretch">
              <HStack>
                <Icon as={FaChartPie} color="purple.500" />
                <Text fontWeight="bold" fontSize="lg">
                  Asset Allocation
                </Text>
              </HStack>

              <Box h="300px">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.assetAllocation}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                    >
                      {analytics.assetAllocation.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>

              <VStack spacing={2} align="stretch">
                {analytics.assetAllocation.map((item, index) => (
                  <HStack key={item.name} justify="space-between">
                    <HStack>
                      <Box
                        w={3}
                        h={3}
                        bg={COLORS[index % COLORS.length]}
                        rounded="sm"
                      />
                      <Text fontSize="sm">{item.name}</Text>
                    </HStack>
                    <VStack align="end" spacing={0}>
                      <Text fontSize="sm" fontWeight="semibold">
                        {formatCurrency(item.value)}
                      </Text>
                      <Text fontSize="xs" color="gray.600">
                        {formatPercentage(item.percentage)}
                      </Text>
                    </VStack>
                  </HStack>
                ))}
              </VStack>
            </VStack>
          </Box>
        </GridItem>

        <GridItem>
          <Box
            bg={cardBg}
            p={6}
            rounded="xl"
            border="1px solid"
            borderColor={borderColor}
          >
            <VStack spacing={4} align="stretch">
              <HStack>
                <Icon as={FaGlobe} color="blue.500" />
                <Text fontWeight="bold" fontSize="lg">
                  Geographic Distribution
                </Text>
              </HStack>

              <Box h="300px">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.geographicAllocation} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={formatCurrency} />
                    <YAxis dataKey="name" type="category" width={80} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>

              <VStack spacing={2} align="stretch">
                {analytics.geographicAllocation.map((item, index) => (
                  <HStack key={item.name} justify="space-between">
                    <Text fontSize="sm">{item.name}</Text>
                    <VStack align="end" spacing={0}>
                      <Text fontSize="sm" fontWeight="semibold">
                        {formatCurrency(item.value)}
                      </Text>
                      <Text fontSize="xs" color="gray.600">
                        {formatPercentage(item.percentage)}
                      </Text>
                    </VStack>
                  </HStack>
                ))}
              </VStack>
            </VStack>
          </Box>
        </GridItem>
      </Grid>

      {/* Performance Metrics */}
      <Box
        bg={cardBg}
        p={6}
        rounded="xl"
        border="1px solid"
        borderColor={borderColor}
      >
        <VStack spacing={4} align="stretch">
          <Text fontWeight="bold" fontSize="lg">
            Performance Analysis
          </Text>

          <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={6}>
            <GridItem>
              <VStack spacing={3} align="stretch">
                <Text fontSize="sm" fontWeight="semibold" color="gray.600">
                  Returns by Period
                </Text>
                
                <VStack spacing={2} align="stretch">
                  <HStack justify="space-between">
                    <Text fontSize="sm">1 Month</Text>
                    <Text fontSize="sm" fontWeight="semibold" color={analytics.returns.oneMonth >= 0 ? "green.500" : "red.500"}>
                      {formatPercentage(analytics.returns.oneMonth)}
                    </Text>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text fontSize="sm">3 Months</Text>
                    <Text fontSize="sm" fontWeight="semibold" color={analytics.returns.threeMonths >= 0 ? "green.500" : "red.500"}>
                      {formatPercentage(analytics.returns.threeMonths)}
                    </Text>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text fontSize="sm">1 Year</Text>
                    <Text fontSize="sm" fontWeight="semibold" color={analytics.returns.oneYear >= 0 ? "green.500" : "red.500"}>
                      {formatPercentage(analytics.returns.oneYear)}
                    </Text>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text fontSize="sm">Since Inception</Text>
                    <Text fontSize="sm" fontWeight="semibold" color={analytics.returns.sinceInception >= 0 ? "green.500" : "red.500"}>
                      {formatPercentage(analytics.returns.sinceInception)}
                    </Text>
                  </HStack>
                </VStack>
              </VStack>
            </GridItem>

            <GridItem>
              <VStack spacing={3} align="stretch">
                <Text fontSize="sm" fontWeight="semibold" color="gray.600">
                  Risk Metrics
                </Text>
                
                <VStack spacing={2} align="stretch">
                  <HStack justify="space-between">
                    <Text fontSize="sm">Volatility</Text>
                    <Badge colorScheme={getRiskColor(analytics.volatility)} variant="outline">
                      {formatPercentage(analytics.volatility * 100)}
                    </Badge>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text fontSize="sm">Sharpe Ratio</Text>
                    <Text fontSize="sm" fontWeight="semibold">
                      {analytics.sharpeRatio.toFixed(2)}
                    </Text>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text fontSize="sm">Beta</Text>
                    <Text fontSize="sm" fontWeight="semibold">
                      {analytics.beta.toFixed(2)}
                    </Text>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text fontSize="sm">Max Drawdown</Text>
                    <Text fontSize="sm" fontWeight="semibold" color="red.500">
                      {formatPercentage(analytics.maxDrawdown)}
                    </Text>
                  </HStack>
                </VStack>
              </VStack>
            </GridItem>

            <GridItem>
              <VStack spacing={3} align="stretch">
                <Text fontSize="sm" fontWeight="semibold" color="gray.600">
                  Dividend Metrics
                </Text>
                
                <VStack spacing={2} align="stretch">
                  <HStack justify="space-between">
                    <Text fontSize="sm">Current Yield</Text>
                    <Text fontSize="sm" fontWeight="semibold" color="green.500">
                      {formatPercentage(analytics.dividendYield)}
                    </Text>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text fontSize="sm">Annual Dividends</Text>
                    <Text fontSize="sm" fontWeight="semibold">
                      {formatCurrency(analytics.annualDividends)}
                    </Text>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text fontSize="sm">Payout Ratio</Text>
                    <Text fontSize="sm" fontWeight="semibold">
                      {formatPercentage(analytics.payoutRatio)}
                    </Text>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text fontSize="sm">Growth Rate</Text>
                    <Text fontSize="sm" fontWeight="semibold" color={analytics.dividendGrowthRate >= 0 ? "green.500" : "red.500"}>
                      {formatPercentage(analytics.dividendGrowthRate)}
                    </Text>
                  </HStack>
                </VStack>
              </VStack>
            </GridItem>
          </Grid>
        </VStack>
      </Box>
    </VStack>
  );
}
