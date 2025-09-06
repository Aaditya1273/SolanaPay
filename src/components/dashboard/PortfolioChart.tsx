"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { formatChartDate } from "@/lib/date-utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  ButtonGroup,
  Icon,
  Tooltip as ChakraTooltip,
  Spinner,
  Legend,
  useColorModeValue,
} from "@chakra-ui/react";
import { FaInfoCircle } from "react-icons/fa";
import { HistoricalData } from "../../services/portfolioService";

interface PortfolioChartProps {
  data: HistoricalData[];
  isLoading?: boolean;
}

export default function PortfolioChart({ data, isLoading = false }: PortfolioChartProps) {
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('3M');
  const [chartType, setChartType] = useState<'value' | 'performance' | 'dividends'>('value');
  const [filteredData, setFilteredData] = useState<HistoricalData[]>([]);

  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  useEffect(() => {
    if (data.length === 0) return;

    const now = new Date();
    let startDate = new Date();

    switch (timeRange) {
      case '1M':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3M':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6M':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case '1Y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'ALL':
        startDate = new Date(data[0].date);
        break;
    }

    const filtered = data.filter(item => new Date(item.date) >= startDate);
    setFilteredData(filtered);
  }, [data, timeRange]);

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

  const formatDateForChart = (dateString: string) => {
    return formatChartDate(dateString, timeRange);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box
          bg={cardBg}
          p={3}
          border="1px solid"
          borderColor={borderColor}
          rounded="md"
          shadow="lg"
        >
          <Text fontSize="sm" fontWeight="bold" mb={2}>
            {formatDate(label)}
          </Text>
          {payload.map((entry: any, index: number) => (
            <HStack key={index} spacing={2}>
              <Box w={3} h={3} bg={entry.color} rounded="sm" />
              <Text fontSize="sm">
                {entry.name}: {
                  chartType === 'performance' 
                    ? formatPercentage(entry.value)
                    : formatCurrency(entry.value)
                }
              </Text>
            </HStack>
          ))}
        </Box>
      );
    }
    return null;
  };

  const getChartData = () => {
    switch (chartType) {
      case 'value':
        return {
          dataKey: 'portfolioValue',
          name: 'Portfolio Value',
          color: '#8884d8',
          secondaryKey: 'totalInvested',
          secondaryName: 'Total Invested',
          secondaryColor: '#82ca9d'
        };
      case 'performance':
        return {
          dataKey: 'gainLossPercentage',
          name: 'Performance (%)',
          color: '#8884d8'
        };
      case 'dividends':
        return {
          dataKey: 'cumulativeDividends',
          name: 'Cumulative Dividends',
          color: '#ffc658',
          secondaryKey: 'dividendPayments',
          secondaryName: 'Daily Dividends',
          secondaryColor: '#ff7300'
        };
      default:
        return {
          dataKey: 'portfolioValue',
          name: 'Portfolio Value',
          color: '#8884d8'
        };
    }
  };

  const chartConfig = getChartData();

  if (isLoading) {
    return (
      <Box
        bg={cardBg}
        p={6}
        rounded="xl"
        border="1px solid"
        borderColor={borderColor}
        h="400px"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <VStack spacing={4}>
          <Spinner size="lg" color="purple.500" />
          <Text color="gray.500">Loading chart data...</Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box
      bg={cardBg}
      p={6}
      rounded="xl"
      border="1px solid"
      borderColor={borderColor}
    >
      <VStack spacing={6} align="stretch">
        {/* Chart Controls */}
        <HStack justify="space-between" align="center" wrap="wrap" spacing={4}>
          <HStack spacing={2}>
            <Text fontWeight="bold" fontSize="lg">
              Portfolio Performance
            </Text>
            <Tooltip label="Interactive chart showing your portfolio performance over time">
              <Icon as={FaInfoCircle} color="gray.400" boxSize={4} />
            </Tooltip>
          </HStack>

          <HStack spacing={4} wrap="wrap">
            {/* Chart Type Selector */}
            <ButtonGroup size="sm" isAttached variant="outline">
              <Button
                colorScheme={chartType === 'value' ? 'purple' : 'gray'}
                onClick={() => setChartType('value')}
              >
                Value
              </Button>
              <Button
                colorScheme={chartType === 'performance' ? 'purple' : 'gray'}
                onClick={() => setChartType('performance')}
              >
                Performance
              </Button>
              <Button
                colorScheme={chartType === 'dividends' ? 'purple' : 'gray'}
                onClick={() => setChartType('dividends')}
              >
                Dividends
              </Button>
            </ButtonGroup>

            {/* Time Range Selector */}
            <ButtonGroup size="sm" isAttached variant="outline">
              {(['1M', '3M', '6M', '1Y', 'ALL'] as const).map((range) => (
                <Button
                  key={range}
                  colorScheme={timeRange === range ? 'purple' : 'gray'}
                  onClick={() => setTimeRange(range)}
                >
                  {range}
                </Button>
              ))}
            </ButtonGroup>
          </HStack>
        </HStack>

        {/* Chart */}
        <Box h="400px">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'performance' ? (
              <LineChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  stroke="#666"
                  fontSize={12}
                />
                <YAxis 
                  tickFormatter={formatPercentage}
                  stroke="#666"
                  fontSize={12}
                />
                <RechartsTooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey={chartConfig.dataKey}
                  stroke={chartConfig.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, stroke: chartConfig.color, strokeWidth: 2 }}
                />
                {/* Zero line for performance chart */}
                <Line
                  type="monotone"
                  dataKey={() => 0}
                  stroke="#ccc"
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            ) : (
              <AreaChart data={filteredData}>
                <defs>
                  <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartConfig.color} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={chartConfig.color} stopOpacity={0.1}/>
                  </linearGradient>
                  {chartConfig.secondaryColor && (
                    <linearGradient id="colorSecondary" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartConfig.secondaryColor} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={chartConfig.secondaryColor} stopOpacity={0.1}/>
                    </linearGradient>
                  )}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  stroke="#666"
                  fontSize={12}
                />
                <YAxis 
                  tickFormatter={formatCurrency}
                  stroke="#666"
                  fontSize={12}
                />
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend />
                
                {chartConfig.secondaryKey && (
                  <Area
                    type="monotone"
                    dataKey={chartConfig.secondaryKey}
                    stackId="1"
                    stroke={chartConfig.secondaryColor}
                    fill="url(#colorSecondary)"
                    name={chartConfig.secondaryName}
                  />
                )}
                
                <Area
                  type="monotone"
                  dataKey={chartConfig.dataKey}
                  stackId={chartType === 'dividends' ? "1" : "2"}
                  stroke={chartConfig.color}
                  fill="url(#colorPrimary)"
                  name={chartConfig.name}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </Box>

        {/* Chart Summary */}
        <HStack justify="space-between" align="center" wrap="wrap">
          <VStack align="start" spacing={1}>
            <Text fontSize="sm" color="gray.600">
              {timeRange} Range
            </Text>
            <Text fontSize="lg" fontWeight="bold">
              {filteredData.length > 0 && (
                chartType === 'performance' 
                  ? formatPercentage(filteredData[filteredData.length - 1]?.gainLossPercentage || 0)
                  : formatCurrency(filteredData[filteredData.length - 1]?.[chartConfig.dataKey as keyof HistoricalData] as number || 0)
              )}
            </Text>
          </VStack>

          <VStack align="end" spacing={1}>
            <Text fontSize="sm" color="gray.600">
              Data Points
            </Text>
            <Text fontSize="lg" fontWeight="bold">
              {filteredData.length}
            </Text>
          </VStack>
        </HStack>
      </VStack>
    </Box>
  );
}
