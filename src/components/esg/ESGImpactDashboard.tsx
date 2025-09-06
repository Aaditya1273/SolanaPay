"use client";

import { useState, useEffect } from "react";
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  SimpleGrid,
  Icon,
  Progress,
  Badge,
  useColorModeValue,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Divider,
  Button,
  Tooltip,
} from "@chakra-ui/react";
import {
  FaLeaf,
  FaUsers,
  FaShieldAlt,
  FaChartLine,
  FaWater,
  FaRecycle,
  FaBolt,
  FaTree,
  FaHandsHelping,
  FaBuilding,
} from "react-icons/fa";
import { ImpactMetrics, SustainabilityGoal } from "../../services/esgService";

interface ESGImpactDashboardProps {
  impactMetrics: ImpactMetrics;
  sustainabilityGoals: SustainabilityGoal[];
  assetType: string;
}

export default function ESGImpactDashboard({
  impactMetrics,
  sustainabilityGoals,
  assetType
}: ESGImpactDashboardProps) {
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  const [selectedCategory, setSelectedCategory] = useState<'environmental' | 'social' | 'all'>('all');

  const environmentalMetrics = [
    {
      icon: FaLeaf,
      label: "Carbon Footprint",
      value: impactMetrics.carbonFootprint,
      unit: "kg CO₂",
      color: "green",
      trend: -12.5,
      benchmark: 50,
      description: "Annual carbon emissions per unit"
    },
    {
      icon: FaBolt,
      label: "Energy Efficiency",
      value: impactMetrics.energyEfficiency,
      unit: "kWh",
      color: "yellow",
      trend: -8.3,
      benchmark: 100,
      description: "Energy consumption per unit"
    },
    {
      icon: FaWater,
      label: "Water Usage",
      value: impactMetrics.waterUsage,
      unit: "liters",
      color: "blue",
      trend: -15.2,
      benchmark: 1000,
      description: "Water consumption per unit"
    },
    {
      icon: FaRecycle,
      label: "Waste Reduction",
      value: impactMetrics.wasteReduction,
      unit: "%",
      color: "purple",
      trend: 22.1,
      benchmark: 30,
      description: "Waste reduction percentage"
    }
  ];

  const socialMetrics = [
    {
      icon: FaUsers,
      label: "Jobs Created",
      value: impactMetrics.jobsCreated,
      unit: "jobs",
      color: "blue",
      trend: 18.7,
      benchmark: 20,
      description: "Direct and indirect employment"
    },
    {
      icon: FaHandsHelping,
      label: "Community Benefit",
      value: impactMetrics.communityBenefit,
      unit: "/100",
      color: "green",
      trend: 5.4,
      benchmark: 70,
      description: "Community impact score"
    },
    {
      icon: FaBuilding,
      label: "Economic Impact",
      value: impactMetrics.localEconomicImpact,
      unit: "USD",
      color: "purple",
      trend: 12.3,
      benchmark: 100000,
      description: "Local economic contribution"
    },
    {
      icon: FaTree,
      label: "Social Programs",
      value: impactMetrics.socialPrograms,
      unit: "programs",
      color: "orange",
      trend: 33.3,
      benchmark: 5,
      description: "Active social initiatives"
    }
  ];

  const getMetricsToShow = () => {
    if (selectedCategory === 'environmental') return environmentalMetrics;
    if (selectedCategory === 'social') return socialMetrics;
    return [...environmentalMetrics, ...socialMetrics];
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === "USD") {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toFixed(1);
  };

  const getBenchmarkStatus = (value: number, benchmark: number, isReverse: boolean = false) => {
    const ratio = value / benchmark;
    if (isReverse) {
      // For metrics where lower is better (carbon, energy, water)
      if (ratio <= 0.5) return { status: "excellent", color: "green" };
      if (ratio <= 0.75) return { status: "good", color: "blue" };
      if (ratio <= 1.0) return { status: "average", color: "yellow" };
      return { status: "poor", color: "red" };
    } else {
      // For metrics where higher is better (jobs, programs, etc.)
      if (ratio >= 1.5) return { status: "excellent", color: "green" };
      if (ratio >= 1.0) return { status: "good", color: "blue" };
      if (ratio >= 0.75) return { status: "average", color: "yellow" };
      return { status: "poor", color: "red" };
    }
  };

  const isReverseMetric = (label: string) => {
    return ["Carbon Footprint", "Energy Efficiency", "Water Usage"].includes(label);
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <HStack justify="space-between" align="center">
        <VStack align="start" spacing={1}>
          <Heading size="lg">Impact Dashboard</Heading>
          <Text color="gray.600">Environmental and social impact metrics</Text>
        </VStack>

        <HStack spacing={2}>
          <Button
            size="sm"
            variant={selectedCategory === 'all' ? 'solid' : 'outline'}
            colorScheme="purple"
            onClick={() => setSelectedCategory('all')}
          >
            All
          </Button>
          <Button
            size="sm"
            variant={selectedCategory === 'environmental' ? 'solid' : 'outline'}
            colorScheme="green"
            leftIcon={<Icon as={FaLeaf} />}
            onClick={() => setSelectedCategory('environmental')}
          >
            Environmental
          </Button>
          <Button
            size="sm"
            variant={selectedCategory === 'social' ? 'solid' : 'outline'}
            colorScheme="blue"
            leftIcon={<Icon as={FaUsers} />}
            onClick={() => setSelectedCategory('social')}
          >
            Social
          </Button>
        </HStack>
      </HStack>

      {/* Impact Metrics Grid */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
        {getMetricsToShow().map((metric, index) => {
          const isReverse = isReverseMetric(metric.label);
          const benchmarkStatus = getBenchmarkStatus(metric.value, metric.benchmark, isReverse);
          
          return (
            <Box
              key={index}
              bg={cardBg}
              p={6}
              rounded="xl"
              border="1px solid"
              borderColor={borderColor}
              shadow="md"
              _hover={{ shadow: "lg", transform: "translateY(-2px)" }}
              transition="all 0.2s"
            >
              <VStack spacing={4} align="stretch">
                {/* Metric Header */}
                <HStack justify="space-between">
                  <Icon as={metric.icon} color={`${metric.color}.500`} boxSize={6} />
                  <Badge
                    colorScheme={benchmarkStatus.color}
                    variant="subtle"
                    fontSize="xs"
                  >
                    {benchmarkStatus.status}
                  </Badge>
                </HStack>

                {/* Metric Value */}
                <Stat>
                  <StatLabel fontSize="sm" color="gray.600">
                    {metric.label}
                  </StatLabel>
                  <StatNumber fontSize="2xl" color={`${metric.color}.600`}>
                    {formatValue(metric.value, metric.unit)} {metric.unit}
                  </StatNumber>
                  <StatHelpText>
                    <StatArrow type={metric.trend > 0 ? "increase" : "decrease"} />
                    {Math.abs(metric.trend)}% vs last period
                  </StatHelpText>
                </Stat>

                {/* Benchmark Comparison */}
                <VStack align="stretch" spacing={2}>
                  <HStack justify="space-between">
                    <Text fontSize="xs" color="gray.500">vs Industry</Text>
                    <Text fontSize="xs" color="gray.500">
                      {formatValue(metric.benchmark, metric.unit)} {metric.unit}
                    </Text>
                  </HStack>
                  <Progress
                    value={Math.min(100, (metric.value / metric.benchmark) * 100)}
                    colorScheme={benchmarkStatus.color}
                    size="sm"
                    rounded="full"
                  />
                </VStack>

                {/* Description */}
                <Tooltip label={metric.description}>
                  <Text fontSize="xs" color="gray.500" noOfLines={2}>
                    {metric.description}
                  </Text>
                </Tooltip>
              </VStack>
            </Box>
          );
        })}
      </SimpleGrid>

      {/* Sustainability Goals */}
      {sustainabilityGoals.length > 0 && (
        <Box
          bg={cardBg}
          p={6}
          rounded="xl"
          border="1px solid"
          borderColor={borderColor}
        >
          <VStack spacing={4} align="stretch">
            <Heading size="md">Sustainability Goals</Heading>
            
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              {sustainabilityGoals.map((goal) => (
                <Box
                  key={goal.id}
                  p={4}
                  bg="gray.50"
                  rounded="lg"
                  border="1px solid"
                  borderColor="gray.200"
                >
                  <VStack spacing={3} align="stretch">
                    <HStack justify="space-between">
                      <Badge
                        colorScheme={
                          goal.category === 'environmental' ? 'green' :
                          goal.category === 'social' ? 'blue' : 'purple'
                        }
                        variant="subtle"
                      >
                        {goal.category}
                      </Badge>
                      <Text fontSize="sm" color="gray.500">
                        {new Date(goal.deadline).getFullYear()}
                      </Text>
                    </HStack>

                    <VStack align="start" spacing={1}>
                      <Text fontWeight="bold" fontSize="md">
                        {goal.title}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {goal.description}
                      </Text>
                    </VStack>

                    <VStack spacing={2}>
                      <HStack justify="space-between" w="full">
                        <Text fontSize="sm" color="gray.600">Progress</Text>
                        <Text fontSize="sm" fontWeight="bold">
                          {goal.currentValue} / {goal.targetValue} {goal.unit}
                        </Text>
                      </HStack>
                      <Progress
                        value={goal.progress}
                        colorScheme={
                          goal.progress >= 80 ? 'green' :
                          goal.progress >= 60 ? 'blue' :
                          goal.progress >= 40 ? 'yellow' : 'red'
                        }
                        size="md"
                        rounded="full"
                        w="full"
                      />
                      <Text fontSize="xs" color="gray.500" alignSelf="end">
                        {goal.progress}% complete
                      </Text>
                    </VStack>
                  </VStack>
                </Box>
              ))}
            </SimpleGrid>
          </VStack>
        </Box>
      )}

      {/* Impact Summary */}
      <Box
        bg="gradient-to-r from-green-500 to-blue-500"
        p={6}
        rounded="xl"
        color="white"
      >
        <VStack spacing={4}>
          <Heading size="md" textAlign="center">
            Total Impact Summary
          </Heading>
          
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={6} w="full">
            <VStack>
              <Icon as={FaLeaf} boxSize={8} />
              <Text fontSize="2xl" fontWeight="bold">
                {(impactMetrics.carbonFootprint * -1).toFixed(1)}
              </Text>
              <Text fontSize="sm" opacity={0.9} textAlign="center">
                kg CO₂ Saved
              </Text>
            </VStack>
            
            <VStack>
              <Icon as={FaUsers} boxSize={8} />
              <Text fontSize="2xl" fontWeight="bold">
                {impactMetrics.jobsCreated}
              </Text>
              <Text fontSize="sm" opacity={0.9} textAlign="center">
                Jobs Created
              </Text>
            </VStack>
            
            <VStack>
              <Icon as={FaBuilding} boxSize={8} />
              <Text fontSize="2xl" fontWeight="bold">
                ${(impactMetrics.localEconomicImpact / 1000).toFixed(0)}K
              </Text>
              <Text fontSize="sm" opacity={0.9} textAlign="center">
                Economic Impact
              </Text>
            </VStack>
            
            <VStack>
              <Icon as={FaHandsHelping} boxSize={8} />
              <Text fontSize="2xl" fontWeight="bold">
                {impactMetrics.socialPrograms}
              </Text>
              <Text fontSize="sm" opacity={0.9} textAlign="center">
                Social Programs
              </Text>
            </VStack>
          </SimpleGrid>
        </VStack>
      </Box>
    </VStack>
  );
}
