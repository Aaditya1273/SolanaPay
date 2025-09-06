'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Select,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  CardHeader,
  Badge,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Icon,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
} from 'recharts';
import { FiTrendingUp, FiTrendingDown, FiActivity, FiDollarSign } from 'react-icons/fi';
import { GlobalAsset, TradingActivity } from '../../services/globalAnalyticsService';

interface RealTimeChartProps {
  assets: GlobalAsset[];
  tradingActivity: TradingActivity[];
}

export default function RealTimeChart({ assets, tradingActivity }: RealTimeChartProps) {
  const [chartType, setChartType] = useState<'price' | 'volume' | 'performance' | 'distribution'>('price');
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [selectedAssetType, setSelectedAssetType] = useState<string>('all');

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Generate time series data for price movements
  const priceData = useMemo(() => {
    const now = Date.now();
    const timePoints = 24; // 24 hours of data
    const interval = 60 * 60 * 1000; // 1 hour intervals

    return Array.from({ length: timePoints }, (_, i) => {
      const timestamp = now - (timePoints - 1 - i) * interval;
      const date = new Date(timestamp);
      
      // Calculate average price movement across all assets
      const avgPrice = assets.reduce((sum, asset) => {
        // Simulate historical price with some randomness
        const basePrice = asset.value.current;
        const volatility = asset.performance.volatility / 100;
        const randomFactor = (Math.random() - 0.5) * volatility * 0.1;
        const historicalPrice = basePrice * (1 + randomFactor * (timePoints - i) / timePoints);
        return sum + historicalPrice;
      }, 0) / assets.length;

      const avgVolume = tradingActivity
        .filter(activity => new Date(activity.timestamp).getTime() > timestamp - interval)
        .reduce((sum, activity) => sum + activity.volume, 0);

      return {
        time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        timestamp,
        price: Math.round(avgPrice),
        volume: avgVolume,
        trades: Math.floor(Math.random() * 20) + 5,
      };
    });
  }, [assets, tradingActivity]);

  // Asset type distribution data
  const distributionData = useMemo(() => {
    const typeMap = new Map<string, { count: number; value: number; color: string }>();
    const colors = {
      'real-estate': '#3182CE',
      'carbon-credits': '#38A169',
      'precious-metals': '#D69E2E',
      'commodities': '#E53E3E',
      'renewable-energy': '#00B5D8',
      'infrastructure': '#805AD5',
      'art': '#D53F8C',
      'bonds': '#718096'
    };

    assets.forEach(asset => {
      if (!typeMap.has(asset.type)) {
        typeMap.set(asset.type, {
          count: 0,
          value: 0,
          color: colors[asset.type as keyof typeof colors] || '#718096'
        });
      }
      const data = typeMap.get(asset.type)!;
      data.count += 1;
      data.value += asset.value.current;
    });

    return Array.from(typeMap.entries()).map(([type, data]) => ({
      name: type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      count: data.count,
      value: data.value,
      color: data.color,
    }));
  }, [assets]);

  // Performance scatter data
  const performanceData = useMemo(() => {
    return assets.map(asset => ({
      name: asset.name,
      roi: asset.performance.roi1d,
      volatility: asset.performance.volatility,
      volume: asset.trading.volume24h,
      type: asset.type,
    }));
  }, [assets]);

  // Filter assets by type
  const filteredAssets = useMemo(() => {
    if (selectedAssetType === 'all') return assets;
    return assets.filter(asset => asset.type === selectedAssetType);
  }, [assets, selectedAssetType]);

  // Calculate key metrics
  const totalValue = filteredAssets.reduce((sum, asset) => sum + asset.value.current, 0);
  const totalVolume = filteredAssets.reduce((sum, asset) => sum + asset.trading.volume24h, 0);
  const avgRoi = filteredAssets.reduce((sum, asset) => sum + asset.performance.roi1d, 0) / filteredAssets.length;
  const totalTrades = tradingActivity.length;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const renderChart = () => {
    switch (chartType) {
      case 'price':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={priceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <RechartsTooltip
                formatter={(value: number) => [formatCurrency(value), 'Average Price']}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#3182CE"
                fill="#3182CE"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'volume':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={priceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <RechartsTooltip
                formatter={(value: number) => [formatCurrency(value), 'Volume']}
              />
              <Bar dataKey="volume" fill="#38A169" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'performance':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="volatility" name="Volatility %" />
              <YAxis dataKey="roi" name="ROI %" />
              <RechartsTooltip
                formatter={(value: number, name: string) => [
                  `${value.toFixed(2)}${name === 'roi' ? '%' : name === 'volatility' ? '%' : ''}`,
                  name === 'roi' ? 'ROI (24h)' : name === 'volatility' ? 'Volatility' : 'Volume'
                ]}
              />
              <Scatter dataKey="roi" fill="#805AD5" />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'distribution':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={distributionData}
                cx="50%"
                cy="50%"
                outerRadius={120}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {distributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip
                formatter={(value: number) => [formatCurrency(value), 'Total Value']}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Key Metrics */}
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Total Value</StatLabel>
              <StatNumber color="blue.600">{formatCurrency(totalValue)}</StatNumber>
              <StatHelpText>
                <StatArrow type={avgRoi >= 0 ? 'increase' : 'decrease'} />
                {avgRoi.toFixed(1)}% avg ROI
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>24h Volume</StatLabel>
              <StatNumber color="green.600">{formatCurrency(totalVolume)}</StatNumber>
              <StatHelpText>
                <Icon as={FiActivity} />
                {totalTrades} trades
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Active Assets</StatLabel>
              <StatNumber color="purple.600">{filteredAssets.length}</StatNumber>
              <StatHelpText>
                Across {new Set(filteredAssets.map(a => a.location.country)).size} countries
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Market Sentiment</StatLabel>
              <StatNumber color={avgRoi >= 0 ? 'green.600' : 'red.600'}>
                {avgRoi >= 1 ? 'Bullish' : avgRoi <= -1 ? 'Bearish' : 'Neutral'}
              </StatNumber>
              <StatHelpText>
                <Icon as={avgRoi >= 0 ? FiTrendingUp : FiTrendingDown} />
                Based on 24h performance
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Chart Controls */}
      <Card>
        <CardHeader>
          <HStack justify="space-between" wrap="wrap" spacing={4}>
            <Text fontSize="lg" fontWeight="semibold">
              Real-Time Analytics
            </Text>
            <HStack spacing={4} wrap="wrap">
              <Select
                value={selectedAssetType}
                onChange={(e) => setSelectedAssetType(e.target.value)}
                maxW="200px"
              >
                <option value="all">All Asset Types</option>
                <option value="real-estate">Real Estate</option>
                <option value="carbon-credits">Carbon Credits</option>
                <option value="precious-metals">Precious Metals</option>
                <option value="renewable-energy">Renewable Energy</option>
                <option value="commodities">Commodities</option>
                <option value="infrastructure">Infrastructure</option>
                <option value="art">Art & Collectibles</option>
                <option value="bonds">Bonds</option>
              </Select>

              <ButtonGroup size="sm" isAttached variant="outline">
                <Button
                  onClick={() => setChartType('price')}
                  colorScheme={chartType === 'price' ? 'blue' : 'gray'}
                >
                  Price
                </Button>
                <Button
                  onClick={() => setChartType('volume')}
                  colorScheme={chartType === 'volume' ? 'blue' : 'gray'}
                >
                  Volume
                </Button>
                <Button
                  onClick={() => setChartType('performance')}
                  colorScheme={chartType === 'performance' ? 'blue' : 'gray'}
                >
                  Performance
                </Button>
                <Button
                  onClick={() => setChartType('distribution')}
                  colorScheme={chartType === 'distribution' ? 'blue' : 'gray'}
                >
                  Distribution
                </Button>
              </ButtonGroup>

              <ButtonGroup size="sm" isAttached variant="outline">
                <Button
                  onClick={() => setTimeRange('1h')}
                  colorScheme={timeRange === '1h' ? 'blue' : 'gray'}
                >
                  1H
                </Button>
                <Button
                  onClick={() => setTimeRange('24h')}
                  colorScheme={timeRange === '24h' ? 'blue' : 'gray'}
                >
                  24H
                </Button>
                <Button
                  onClick={() => setTimeRange('7d')}
                  colorScheme={timeRange === '7d' ? 'blue' : 'gray'}
                >
                  7D
                </Button>
                <Button
                  onClick={() => setTimeRange('30d')}
                  colorScheme={timeRange === '30d' ? 'blue' : 'gray'}
                >
                  30D
                </Button>
              </ButtonGroup>
            </HStack>
          </HStack>
        </CardHeader>
        <CardBody>
          {renderChart()}
        </CardBody>
      </Card>

      {/* Top Performers */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        <Card>
          <CardHeader>
            <Text fontSize="lg" fontWeight="semibold">Top Performers (24h)</Text>
          </CardHeader>
          <CardBody>
            <VStack spacing={3}>
              {filteredAssets
                .sort((a, b) => b.performance.roi1d - a.performance.roi1d)
                .slice(0, 5)
                .map((asset, index) => (
                  <HStack key={asset.id} justify="space-between" w="full">
                    <HStack>
                      <Badge colorScheme="blue">{index + 1}</Badge>
                      <VStack align="start" spacing={0}>
                        <Text fontSize="sm" fontWeight="medium">
                          {asset.name}
                        </Text>
                        <Text fontSize="xs" color="gray.600">
                          {asset.location.city}, {asset.location.country}
                        </Text>
                      </VStack>
                    </HStack>
                    <VStack align="end" spacing={0}>
                      <Badge colorScheme="green">
                        +{asset.performance.roi1d.toFixed(1)}%
                      </Badge>
                      <Text fontSize="xs" color="gray.600">
                        {formatCurrency(asset.value.current)}
                      </Text>
                    </VStack>
                  </HStack>
                ))}
            </VStack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <Text fontSize="lg" fontWeight="semibold">Most Active (24h)</Text>
          </CardHeader>
          <CardBody>
            <VStack spacing={3}>
              {filteredAssets
                .sort((a, b) => b.trading.volume24h - a.trading.volume24h)
                .slice(0, 5)
                .map((asset, index) => (
                  <HStack key={asset.id} justify="space-between" w="full">
                    <HStack>
                      <Badge colorScheme="purple">{index + 1}</Badge>
                      <VStack align="start" spacing={0}>
                        <Text fontSize="sm" fontWeight="medium">
                          {asset.name}
                        </Text>
                        <Text fontSize="xs" color="gray.600">
                          {asset.trading.trades24h} trades
                        </Text>
                      </VStack>
                    </HStack>
                    <VStack align="end" spacing={0}>
                      <Text fontSize="sm" fontWeight="semibold" color="purple.600">
                        {formatCurrency(asset.trading.volume24h)}
                      </Text>
                      <Text fontSize="xs" color="gray.600">
                        Volume
                      </Text>
                    </VStack>
                  </HStack>
                ))}
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>
    </VStack>
  );
}
