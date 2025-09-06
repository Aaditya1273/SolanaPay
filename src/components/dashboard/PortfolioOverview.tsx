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
  Button,
  useColorModeValue,
  Icon,
  Badge,
  Divider,
  SimpleGrid,
  Spinner,
  useDisclosure,
} from "@chakra-ui/react";
import {
  FaWallet,
  FaChartLine,
  FaCoins,
  FaTrendingUp,
  FaDownload,
  FaRefresh,
} from "react-icons/fa";
import { Portfolio, HistoricalData, portfolioService } from "../../services/portfolioService";
import PortfolioChart from "./PortfolioChart";
import PortfolioAnalytics from "./PortfolioAnalytics";
import ExportModal from "./ExportModal";

export default function PortfolioOverview() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  const { isOpen: isExportOpen, onOpen: onExportOpen, onClose: onExportClose } = useDisclosure();

  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const gradientBg = useColorModeValue(
    "linear(to-r, purple.500, blue.500)",
    "linear(to-r, purple.600, blue.600)"
  );

  useEffect(() => {
    loadPortfolioData();
  }, []);

  const loadPortfolioData = async () => {
    setIsLoading(true);
    try {
      const [portfolioData, historical] = await Promise.all([
        portfolioService.getPortfolio(),
        portfolioService.getHistoricalData()
      ]);
      
      setPortfolio(portfolioData);
      setHistoricalData(historical);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading portfolio data:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  if (isLoading) {
    return (
      <Box
        minH="400px"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <VStack spacing={4}>
          <Spinner size="xl" color="purple.500" />
          <Text color="gray.500">Loading your portfolio...</Text>
        </VStack>
      </Box>
    );
  }

  if (!portfolio) {
    return (
      <Box
        bg={cardBg}
        p={8}
        rounded="xl"
        border="1px solid"
        borderColor={borderColor}
        textAlign="center"
      >
        <VStack spacing={4}>
          <Icon as={FaWallet} boxSize={12} color="gray.400" />
          <Text fontSize="lg" fontWeight="bold">
            No Portfolio Data Available
          </Text>
          <Text color="gray.600">
            Start investing to see your portfolio overview here.
          </Text>
          <Button colorScheme="purple" onClick={loadPortfolioData}>
            Refresh Data
          </Button>
        </VStack>
      </Box>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <Box
        bgGradient={gradientBg}
        p={6}
        rounded="xl"
        color="white"
      >
        <HStack justify="space-between" align="center" wrap="wrap">
          <VStack align="start" spacing={1}>
            <Text fontSize="2xl" fontWeight="bold">
              Portfolio Overview
            </Text>
            <Text opacity={0.9}>
              Last updated: {lastUpdated.toLocaleString()}
            </Text>
          </VStack>
          
          <HStack spacing={3}>
            <Button
              variant="outline"
              colorScheme="whiteAlpha"
              leftIcon={<Icon as={FaRefresh} />}
              onClick={loadPortfolioData}
              isLoading={isLoading}
            >
              Refresh
            </Button>
            <Button
              variant="solid"
              bg="white"
              color="purple.600"
              leftIcon={<Icon as={FaDownload} />}
              onClick={onExportOpen}
            >
              Export
            </Button>
          </HStack>
        </HStack>
      </Box>

      {/* Key Metrics */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
        <Box
          bg={cardBg}
          p={6}
          rounded="xl"
          border="1px solid"
          borderColor={borderColor}
        >
          <Stat>
            <StatLabel>Total Portfolio Value</StatLabel>
            <StatNumber fontSize="2xl">
              {formatCurrency(portfolio.totalValue)}
            </StatNumber>
            <StatHelpText>
              <StatArrow type={portfolio.totalGainLoss >= 0 ? "increase" : "decrease"} />
              {formatCurrency(Math.abs(portfolio.totalGainLoss))} (
              {formatPercentage(portfolio.totalGainLossPercentage)})
            </StatHelpText>
          </Stat>
        </Box>

        <Box
          bg={cardBg}
          p={6}
          rounded="xl"
          border="1px solid"
          borderColor={borderColor}
        >
          <Stat>
            <StatLabel>Total Invested</StatLabel>
            <StatNumber fontSize="2xl">
              {formatCurrency(portfolio.totalInvested)}
            </StatNumber>
            <StatHelpText>
              Principal amount invested
            </StatHelpText>
          </Stat>
        </Box>

        <Box
          bg={cardBg}
          p={6}
          rounded="xl"
          border="1px solid"
          borderColor={borderColor}
        >
          <Stat>
            <StatLabel>Annual Dividend Yield</StatLabel>
            <StatNumber fontSize="2xl" color="green.500">
              {formatPercentage(portfolio.dividendYield)}
            </StatNumber>
            <StatHelpText>
              {formatCurrency(portfolio.annualDividends)} per year
            </StatHelpText>
          </Stat>
        </Box>

        <Box
          bg={cardBg}
          p={6}
          rounded="xl"
          border="1px solid"
          borderColor={borderColor}
        >
          <Stat>
            <StatLabel>Number of Assets</StatLabel>
            <StatNumber fontSize="2xl">
              {portfolio.assets.length}
            </StatNumber>
            <StatHelpText>
              Diversified portfolio
            </StatHelpText>
          </Stat>
        </Box>
      </SimpleGrid>

      {/* Portfolio Chart */}
      <PortfolioChart data={historicalData} isLoading={isLoading} />

      {/* Assets Overview */}
      <Box
        bg={cardBg}
        p={6}
        rounded="xl"
        border="1px solid"
        borderColor={borderColor}
      >
        <VStack spacing={4} align="stretch">
          <HStack justify="space-between" align="center">
            <Text fontWeight="bold" fontSize="lg">
              Asset Holdings
            </Text>
            <Badge colorScheme="purple" variant="outline">
              {portfolio.assets.length} Assets
            </Badge>
          </HStack>

          <Divider />

          <VStack spacing={3} align="stretch">
            {portfolio.assets.slice(0, 5).map((asset) => (
              <HStack key={asset.id} justify="space-between" p={3} bg="gray.50" rounded="md">
                <VStack align="start" spacing={1}>
                  <Text fontWeight="semibold">{asset.name}</Text>
                  <HStack spacing={2}>
                    <Badge size="sm" colorScheme="blue">
                      {asset.type}
                    </Badge>
                    <Text fontSize="sm" color="gray.600">
                      {asset.shares} shares
                    </Text>
                  </HStack>
                </VStack>

                <VStack align="end" spacing={1}>
                  <Text fontWeight="bold">
                    {formatCurrency(asset.currentValue)}
                  </Text>
                  <HStack spacing={1}>
                    <Icon
                      as={asset.gainLoss >= 0 ? FaTrendingUp : FaTrendingUp}
                      color={asset.gainLoss >= 0 ? "green.500" : "red.500"}
                      boxSize={3}
                      transform={asset.gainLoss < 0 ? "rotate(180deg)" : "none"}
                    />
                    <Text
                      fontSize="sm"
                      color={asset.gainLoss >= 0 ? "green.500" : "red.500"}
                      fontWeight="semibold"
                    >
                      {formatPercentage(asset.gainLossPercentage)}
                    </Text>
                  </HStack>
                </VStack>
              </HStack>
            ))}

            {portfolio.assets.length > 5 && (
              <Box textAlign="center" pt={2}>
                <Text fontSize="sm" color="gray.600">
                  And {portfolio.assets.length - 5} more assets...
                </Text>
              </Box>
            )}
          </VStack>
        </VStack>
      </Box>

      {/* Portfolio Analytics */}
      <PortfolioAnalytics analytics={portfolio.analytics} />

      {/* Export Modal */}
      <ExportModal isOpen={isExportOpen} onClose={onExportClose} />
    </VStack>
  );
}
