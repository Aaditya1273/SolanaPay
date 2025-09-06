'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Card,
  CardBody,
  CardHeader,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Badge,
  Alert,
  AlertIcon,
  Spinner,
  Icon,
  useToast,
  Switch,
  FormControl,
  FormLabel,
  Select,
  InputGroup,
  InputLeftElement,
  Input,
} from '@chakra-ui/react';
import { 
  FiGlobe, 
  FiTrendingUp, 
  FiActivity, 
  FiRefreshCw,
  FiSearch,
  FiFilter,
  FiMapPin,
  FiBarChart3,
} from 'react-icons/fi';
import { 
  globalAnalyticsService,
  GlobalAsset,
  TradingActivity,
  MarketOverview,
  PriceAlert,
} from '../../services/globalAnalyticsService';
import GlobalMap3D from './GlobalMap3D';
import RealTimeChart from './RealTimeChart';

export default function GlobalAnalyticsDashboard() {
  const toast = useToast();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<GlobalAsset[]>([]);
  const [tradingActivity, setTradingActivity] = useState<TradingActivity[]>([]);
  const [marketOverview, setMarketOverview] = useState<MarketOverview | null>(null);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<GlobalAsset | null>(null);
  
  // Filters and settings
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  // Load initial data
  useEffect(() => {
    loadDashboardData();
    
    if (realTimeEnabled) {
      // Subscribe to real-time updates
      globalAnalyticsService.onDataUpdate(handleDataUpdate);
      globalAnalyticsService.onPriceAlert(handlePriceAlert);
      globalAnalyticsService.connect();
    }

    return () => {
      globalAnalyticsService.disconnect();
    };
  }, [realTimeEnabled]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [assetsData, activityData, overviewData, alertsData] = await Promise.all([
        globalAnalyticsService.getAllAssets(),
        globalAnalyticsService.getTradingActivity(100),
        globalAnalyticsService.getMarketOverview(),
        globalAnalyticsService.getPriceAlerts(20),
      ]);
      
      setAssets(assetsData);
      setTradingActivity(activityData);
      setMarketOverview(overviewData);
      setPriceAlerts(alertsData);
    } catch (error) {
      toast({
        title: 'Error Loading Data',
        description: 'Failed to load analytics data',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDataUpdate = (data: any) => {
    setAssets(data.assets);
    setTradingActivity(data.tradingActivity);
    setPriceAlerts(data.alerts);
  };

  const handlePriceAlert = (alert: PriceAlert) => {
    toast({
      title: 'Price Alert',
      description: alert.message,
      status: alert.severity === 'high' ? 'warning' : 'info',
      duration: 5000,
      isClosable: true,
    });
  };

  const handleAssetSelect = (asset: GlobalAsset) => {
    setSelectedAsset(asset);
  };

  // Filter assets based on search and filters
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.location.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.location.country.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRegion = regionFilter === 'all' || asset.location.country === regionFilter;
    const matchesType = typeFilter === 'all' || asset.type === typeFilter;
    
    return matchesSearch && matchesRegion && matchesType;
  });

  // Get unique regions and types for filters
  const regions = [...new Set(assets.map(asset => asset.location.country))].sort();
  const assetTypes = [...new Set(assets.map(asset => asset.type))].sort();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="400px">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text>Loading Global Analytics...</Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box p={6} maxW="8xl" mx="auto">
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Box>
          <HStack justify="space-between" align="start" mb={4}>
            <VStack align="start" spacing={1}>
              <Text fontSize="3xl" fontWeight="bold">
                Global RWA Analytics
              </Text>
              <Text color="gray.600">
                Real-time visualization of tokenized assets worldwide
              </Text>
            </VStack>
            <HStack>
              <FormControl display="flex" alignItems="center">
                <FormLabel htmlFor="real-time" mb="0" fontSize="sm">
                  Real-time
                </FormLabel>
                <Switch
                  id="real-time"
                  isChecked={realTimeEnabled}
                  onChange={(e) => setRealTimeEnabled(e.target.checked)}
                  colorScheme="blue"
                />
              </FormControl>
              <Button
                leftIcon={<Icon as={FiRefreshCw} />}
                onClick={loadDashboardData}
                variant="outline"
              >
                Refresh
              </Button>
            </HStack>
          </HStack>

          {/* Real-time status indicator */}
          {realTimeEnabled && (
            <Alert status="success" mb={4}>
              <AlertIcon />
              <HStack>
                <Text fontSize="sm">
                  Real-time data streaming active
                </Text>
                <Badge colorScheme="green" variant="solid">
                  LIVE
                </Badge>
              </HStack>
            </Alert>
          )}
        </Box>

        {/* Market Overview Stats */}
        {marketOverview && (
          <SimpleGrid columns={{ base: 2, md: 4, lg: 6 }} spacing={4}>
            <Card>
              <CardBody>
                <Stat>
                  <StatLabel>Total Assets</StatLabel>
                  <StatNumber color="blue.600">{marketOverview.totalAssets}</StatNumber>
                  <StatHelpText>
                    <Icon as={FiMapPin} />
                    Global coverage
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <Stat>
                  <StatLabel>Total Value</StatLabel>
                  <StatNumber color="green.600">
                    {formatCurrency(marketOverview.totalValue)}
                  </StatNumber>
                  <StatHelpText>
                    <StatArrow type={marketOverview.averageRoi24h >= 0 ? 'increase' : 'decrease'} />
                    {marketOverview.averageRoi24h.toFixed(1)}% avg
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <Stat>
                  <StatLabel>24h Volume</StatLabel>
                  <StatNumber color="purple.600">
                    {formatCurrency(marketOverview.totalVolume24h)}
                  </StatNumber>
                  <StatHelpText>
                    <Icon as={FiActivity} />
                    {marketOverview.totalTrades24h} trades
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <Stat>
                  <StatLabel>Market Sentiment</StatLabel>
                  <StatNumber color={
                    marketOverview.marketSentiment === 'bullish' ? 'green.600' :
                    marketOverview.marketSentiment === 'bearish' ? 'red.600' : 'gray.600'
                  }>
                    {marketOverview.marketSentiment.charAt(0).toUpperCase() + marketOverview.marketSentiment.slice(1)}
                  </StatNumber>
                  <StatHelpText>
                    <Icon as={FiTrendingUp} />
                    Market trend
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <Stat>
                  <StatLabel>Volatility Index</StatLabel>
                  <StatNumber color="orange.600">
                    {marketOverview.volatilityIndex.toFixed(1)}%
                  </StatNumber>
                  <StatHelpText>
                    <Icon as={FiBarChart3} />
                    Market stability
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <Stat>
                  <StatLabel>Active Alerts</StatLabel>
                  <StatNumber color="red.600">{priceAlerts.length}</StatNumber>
                  <StatHelpText>
                    Price movements
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </SimpleGrid>
        )}

        {/* Filters */}
        <Card>
          <CardBody>
            <HStack spacing={4} wrap="wrap">
              <InputGroup maxW="300px">
                <InputLeftElement>
                  <Icon as={FiSearch} color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Search assets, locations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
              
              <Select
                maxW="200px"
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
              >
                <option value="all">All Regions</option>
                {regions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </Select>
              
              <Select
                maxW="200px"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">All Asset Types</option>
                {assetTypes.map(type => (
                  <option key={type} value={type}>
                    {type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </Select>

              <Badge colorScheme="blue" p={2}>
                {filteredAssets.length} assets shown
              </Badge>
            </HStack>
          </CardBody>
        </Card>

        {/* Main Content Tabs */}
        <Tabs index={activeTab} onChange={setActiveTab} variant="enclosed" colorScheme="blue">
          <TabList>
            <Tab>
              <Icon as={FiGlobe} mr={2} />
              3D World Map
            </Tab>
            <Tab>
              <Icon as={FiBarChart3} mr={2} />
              Analytics Charts
            </Tab>
            <Tab>
              <Icon as={FiActivity} mr={2} />
              Trading Activity
            </Tab>
            <Tab>
              <Icon as={FiTrendingUp} mr={2} />
              Price Alerts
            </Tab>
          </TabList>

          <TabPanels>
            {/* 3D World Map Tab */}
            <TabPanel px={0}>
              <VStack spacing={6} align="stretch">
                <Card>
                  <CardHeader>
                    <HStack justify="space-between">
                      <Text fontSize="lg" fontWeight="semibold">
                        Interactive 3D Global Asset Map
                      </Text>
                      <Badge colorScheme="green" variant="solid">
                        {realTimeEnabled ? 'LIVE' : 'STATIC'}
                      </Badge>
                    </HStack>
                  </CardHeader>
                  <CardBody>
                    <GlobalMap3D
                      assets={filteredAssets}
                      tradingActivity={tradingActivity}
                      onAssetSelect={handleAssetSelect}
                    />
                  </CardBody>
                </Card>

                {/* Selected Asset Details */}
                {selectedAsset && (
                  <Card>
                    <CardHeader>
                      <Text fontSize="lg" fontWeight="semibold">
                        Selected Asset: {selectedAsset.name}
                      </Text>
                    </CardHeader>
                    <CardBody>
                      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                        <VStack align="start">
                          <Text fontSize="sm" color="gray.600">Location</Text>
                          <Text fontWeight="semibold">
                            {selectedAsset.location.city}, {selectedAsset.location.country}
                          </Text>
                          <Text fontSize="sm" color="gray.600">Type</Text>
                          <Badge colorScheme="blue">
                            {selectedAsset.type.replace('-', ' ')}
                          </Badge>
                        </VStack>
                        <VStack align="start">
                          <Text fontSize="sm" color="gray.600">Current Value</Text>
                          <Text fontSize="xl" fontWeight="bold" color="green.600">
                            {formatCurrency(selectedAsset.value.current)}
                          </Text>
                          <Text fontSize="sm" color="gray.600">24h Change</Text>
                          <Badge colorScheme={selectedAsset.value.changePercent24h >= 0 ? 'green' : 'red'}>
                            {selectedAsset.value.changePercent24h >= 0 ? '+' : ''}
                            {selectedAsset.value.changePercent24h.toFixed(1)}%
                          </Badge>
                        </VStack>
                        <VStack align="start">
                          <Text fontSize="sm" color="gray.600">Trading Volume</Text>
                          <Text fontSize="lg" fontWeight="semibold" color="purple.600">
                            {formatCurrency(selectedAsset.trading.volume24h)}
                          </Text>
                          <Text fontSize="sm" color="gray.600">Trades (24h)</Text>
                          <Text fontWeight="semibold">
                            {selectedAsset.trading.trades24h}
                          </Text>
                        </VStack>
                      </SimpleGrid>
                    </CardBody>
                  </Card>
                )}
              </VStack>
            </TabPanel>

            {/* Analytics Charts Tab */}
            <TabPanel px={0}>
              <RealTimeChart
                assets={filteredAssets}
                tradingActivity={tradingActivity}
              />
            </TabPanel>

            {/* Trading Activity Tab */}
            <TabPanel px={0}>
              <Card>
                <CardHeader>
                  <Text fontSize="lg" fontWeight="semibold">
                    Recent Trading Activity
                  </Text>
                </CardHeader>
                <CardBody>
                  <VStack spacing={3} align="stretch">
                    {tradingActivity.slice(0, 20).map((activity, index) => {
                      const asset = assets.find(a => a.id === activity.assetId);
                      return (
                        <HStack key={`${activity.assetId}-${activity.timestamp}-${index}`} justify="space-between" p={3} bg="gray.50" borderRadius="md">
                          <VStack align="start" spacing={1}>
                            <Text fontSize="sm" fontWeight="medium">
                              {asset?.name || 'Unknown Asset'}
                            </Text>
                            <Text fontSize="xs" color="gray.600">
                              {new Date(activity.timestamp).toLocaleTimeString()}
                            </Text>
                          </VStack>
                          <VStack align="center" spacing={1}>
                            <Badge colorScheme={activity.type === 'buy' ? 'green' : 'red'}>
                              {activity.type.toUpperCase()}
                            </Badge>
                            <Text fontSize="xs" color="gray.600">
                              {activity.amount} shares
                            </Text>
                          </VStack>
                          <VStack align="end" spacing={1}>
                            <Text fontSize="sm" fontWeight="semibold">
                              {formatCurrency(activity.volume)}
                            </Text>
                            <Text fontSize="xs" color="gray.600">
                              @${activity.price.toFixed(2)}
                            </Text>
                          </VStack>
                        </HStack>
                      );
                    })}
                  </VStack>
                </CardBody>
              </Card>
            </TabPanel>

            {/* Price Alerts Tab */}
            <TabPanel px={0}>
              <Card>
                <CardHeader>
                  <Text fontSize="lg" fontWeight="semibold">
                    Price Alerts & Market Events
                  </Text>
                </CardHeader>
                <CardBody>
                  <VStack spacing={3} align="stretch">
                    {priceAlerts.map((alert) => {
                      const asset = assets.find(a => a.id === alert.assetId);
                      return (
                        <Alert
                          key={alert.id}
                          status={alert.severity === 'high' ? 'warning' : alert.severity === 'critical' ? 'error' : 'info'}
                          borderRadius="md"
                        >
                          <AlertIcon />
                          <VStack align="start" spacing={1} flex={1}>
                            <HStack justify="space-between" w="full">
                              <Text fontSize="sm" fontWeight="medium">
                                {asset?.name || 'Unknown Asset'}
                              </Text>
                              <Badge colorScheme={
                                alert.severity === 'critical' ? 'red' :
                                alert.severity === 'high' ? 'orange' :
                                alert.severity === 'medium' ? 'yellow' : 'blue'
                              }>
                                {alert.severity.toUpperCase()}
                              </Badge>
                            </HStack>
                            <Text fontSize="sm">{alert.message}</Text>
                            <Text fontSize="xs" color="gray.600">
                              {new Date(alert.timestamp).toLocaleString()}
                            </Text>
                          </VStack>
                        </Alert>
                      );
                    })}
                  </VStack>
                </CardBody>
              </Card>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Box>
  );
}
