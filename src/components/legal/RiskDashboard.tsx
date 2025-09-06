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
  Badge,
  Progress,
  Icon,
  useColorModeValue,
  CircularProgress,
  CircularProgressLabel,
  Alert,
  AlertIcon,
  Divider,
  Button,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
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
  LineChart,
  Line,
} from "recharts";
import {
  FaExclamationTriangle,
  FaShieldAlt,
  FaGavel,
  FaChartLine,
  FaEye,
  FaFileAlt,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import { RiskAssessment, ComplianceRule } from "../../services/legalBotService";

interface RiskDashboardProps {
  assessments: RiskAssessment[];
  onViewDetails?: (assessment: RiskAssessment) => void;
}

interface RiskMetrics {
  totalAssessments: number;
  criticalRisks: number;
  highRisks: number;
  mediumRisks: number;
  lowRisks: number;
  averageRiskScore: number;
  complianceGaps: number;
  recommendations: number;
}

export default function RiskDashboard({ assessments, onViewDetails }: RiskDashboardProps) {
  const [metrics, setMetrics] = useState<RiskMetrics | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<RiskAssessment | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e']; // red, orange, yellow, green

  useEffect(() => {
    calculateMetrics();
  }, [assessments]);

  const calculateMetrics = () => {
    if (assessments.length === 0) {
      setMetrics(null);
      return;
    }

    const criticalRisks = assessments.filter(a => a.riskLevel === 'critical').length;
    const highRisks = assessments.filter(a => a.riskLevel === 'high').length;
    const mediumRisks = assessments.filter(a => a.riskLevel === 'medium').length;
    const lowRisks = assessments.filter(a => a.riskLevel === 'low').length;

    const totalComplianceGaps = assessments.reduce((sum, a) => sum + a.complianceGaps.length, 0);
    const totalRecommendations = assessments.reduce((sum, a) => sum + a.recommendations.length, 0);

    // Calculate average risk score based on risk factors
    const totalRiskScore = assessments.reduce((sum, assessment) => {
      const assessmentScore = assessment.riskFactors.reduce((factorSum, factor) => 
        factorSum + (factor.impact * factor.likelihood), 0) / assessment.riskFactors.length;
      return sum + (assessmentScore || 0);
    }, 0);
    const averageRiskScore = assessments.length > 0 ? totalRiskScore / assessments.length : 0;

    setMetrics({
      totalAssessments: assessments.length,
      criticalRisks,
      highRisks,
      mediumRisks,
      lowRisks,
      averageRiskScore,
      complianceGaps: totalComplianceGaps,
      recommendations: totalRecommendations
    });
  };

  const getRiskDistributionData = () => {
    if (!metrics) return [];
    
    return [
      { name: 'Critical', value: metrics.criticalRisks, color: COLORS[0] },
      { name: 'High', value: metrics.highRisks, color: COLORS[1] },
      { name: 'Medium', value: metrics.mediumRisks, color: COLORS[2] },
      { name: 'Low', value: metrics.lowRisks, color: COLORS[3] },
    ].filter(item => item.value > 0);
  };

  const getJurisdictionData = () => {
    const jurisdictionCounts = assessments.reduce((acc, assessment) => {
      acc[assessment.jurisdiction] = (acc[assessment.jurisdiction] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(jurisdictionCounts).map(([jurisdiction, count]) => ({
      jurisdiction,
      count,
      criticalCount: assessments.filter(a => a.jurisdiction === jurisdiction && a.riskLevel === 'critical').length,
      highCount: assessments.filter(a => a.jurisdiction === jurisdiction && a.riskLevel === 'high').length,
    }));
  };

  const getRiskTrendData = () => {
    // Mock trend data - in production, this would be based on historical assessments
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        riskScore: Math.random() * 40 + 20, // Random score between 20-60
        assessments: Math.floor(Math.random() * 5) + 1,
      };
    });
    return last7Days;
  };

  const handleViewAssessment = (assessment: RiskAssessment) => {
    setSelectedAssessment(assessment);
    onOpen();
    if (onViewDetails) {
      onViewDetails(assessment);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'green';
      case 'medium': return 'yellow';
      case 'high': return 'orange';
      case 'critical': return 'red';
      default: return 'gray';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return FaCheckCircle;
      case 'medium': return FaExclamationTriangle;
      case 'high': return FaExclamationTriangle;
      case 'critical': return FaTimesCircle;
      default: return FaShieldAlt;
    }
  };

  if (!metrics) {
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
          <Icon as={FaChartLine} boxSize={12} color="gray.400" />
          <Text fontSize="lg" fontWeight="bold" color="gray.600">
            No Risk Assessments Available
          </Text>
          <Text color="gray.500">
            Run compliance analyses to see risk metrics and trends here.
          </Text>
        </VStack>
      </Box>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Key Metrics */}
      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }} gap={4}>
        <GridItem>
          <Box
            bg={cardBg}
            p={6}
            rounded="xl"
            border="1px solid"
            borderColor={borderColor}
          >
            <Stat>
              <StatLabel>Total Assessments</StatLabel>
              <StatNumber>{metrics.totalAssessments}</StatNumber>
              <StatHelpText>Compliance evaluations</StatHelpText>
            </Stat>
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
            <VStack spacing={3}>
              <HStack w="full" justify="space-between">
                <Text fontSize="sm" color="gray.600">Average Risk Score</Text>
                <Icon as={FaShieldAlt} color="blue.500" />
              </HStack>
              <CircularProgress
                value={(metrics.averageRiskScore / 100) * 100}
                color={metrics.averageRiskScore > 60 ? "red" : metrics.averageRiskScore > 40 ? "orange" : "green"}
                size="60px"
                thickness="8px"
              >
                <CircularProgressLabel fontSize="sm">
                  {metrics.averageRiskScore.toFixed(0)}
                </CircularProgressLabel>
              </CircularProgress>
              <Text fontSize="xs" color="gray.500" textAlign="center">
                Risk assessment score
              </Text>
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
            <Stat>
              <StatLabel>Compliance Gaps</StatLabel>
              <StatNumber color={metrics.complianceGaps > 0 ? "red.500" : "green.500"}>
                {metrics.complianceGaps}
              </StatNumber>
              <StatHelpText>
                {metrics.complianceGaps > 0 ? "Require attention" : "All compliant"}
              </StatHelpText>
            </Stat>
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
            <Stat>
              <StatLabel>Recommendations</StatLabel>
              <StatNumber color="blue.500">{metrics.recommendations}</StatNumber>
              <StatHelpText>Action items</StatHelpText>
            </Stat>
          </Box>
        </GridItem>
      </Grid>

      {/* Risk Distribution and Jurisdiction Analysis */}
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
              <Text fontSize="lg" fontWeight="bold">
                Risk Level Distribution
              </Text>
              
              <Box h="250px">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getRiskDistributionData()}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {getRiskDistributionData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>

              <VStack spacing={2} align="stretch">
                {getRiskDistributionData().map((item, index) => (
                  <HStack key={item.name} justify="space-between">
                    <HStack>
                      <Box w={3} h={3} bg={item.color} rounded="sm" />
                      <Text fontSize="sm">{item.name} Risk</Text>
                    </HStack>
                    <Badge colorScheme={getRiskColor(item.name.toLowerCase())}>
                      {item.value}
                    </Badge>
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
              <Text fontSize="lg" fontWeight="bold">
                Risk by Jurisdiction
              </Text>
              
              <Box h="250px">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getJurisdictionData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="jurisdiction" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </VStack>
          </Box>
        </GridItem>
      </Grid>

      {/* Critical Risks Alert */}
      {metrics.criticalRisks > 0 && (
        <Alert status="error">
          <AlertIcon />
          <Box>
            <Text fontWeight="bold">
              {metrics.criticalRisks} Critical Risk{metrics.criticalRisks > 1 ? 's' : ''} Identified
            </Text>
            <Text fontSize="sm">
              Immediate legal consultation and remediation required for critical compliance issues.
            </Text>
          </Box>
        </Alert>
      )}

      {/* Recent Assessments */}
      <Box
        bg={cardBg}
        p={6}
        rounded="xl"
        border="1px solid"
        borderColor={borderColor}
      >
        <VStack spacing={4} align="stretch">
          <HStack justify="space-between">
            <Text fontSize="lg" fontWeight="bold">
              Recent Risk Assessments
            </Text>
            <Badge colorScheme="purple" variant="outline">
              {assessments.length} Total
            </Badge>
          </HStack>

          <Divider />

          <VStack spacing={3} align="stretch">
            {assessments.slice(0, 5).map((assessment) => (
              <HStack
                key={assessment.id}
                justify="space-between"
                p={4}
                bg="gray.50"
                rounded="md"
                cursor="pointer"
                _hover={{ bg: "gray.100" }}
                onClick={() => handleViewAssessment(assessment)}
              >
                <VStack align="start" spacing={1}>
                  <HStack spacing={2}>
                    <Icon as={getRiskIcon(assessment.riskLevel)} color={`${getRiskColor(assessment.riskLevel)}.500`} />
                    <Text fontWeight="semibold">
                      {assessment.jurisdiction} Assessment
                    </Text>
                    <Badge colorScheme={getRiskColor(assessment.riskLevel)} size="sm">
                      {assessment.riskLevel.toUpperCase()}
                    </Badge>
                  </HStack>
                  <Text fontSize="sm" color="gray.600">
                    {assessment.riskFactors.length} risk factors, {assessment.complianceGaps.length} gaps
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {assessment.lastAssessed.toLocaleDateString()}
                  </Text>
                </VStack>

                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Icon as={FaEye} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewAssessment(assessment);
                  }}
                >
                  View
                </Button>
              </HStack>
            ))}

            {assessments.length > 5 && (
              <Text fontSize="sm" color="gray.600" textAlign="center" pt={2}>
                And {assessments.length - 5} more assessments...
              </Text>
            )}
          </VStack>
        </VStack>
      </Box>

      {/* Assessment Detail Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Risk Assessment Details
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {selectedAssessment && (
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <Text fontWeight="bold">Assessment ID:</Text>
                  <Text>{selectedAssessment.id}</Text>
                </HStack>
                
                <HStack justify="space-between">
                  <Text fontWeight="bold">Jurisdiction:</Text>
                  <Badge>{selectedAssessment.jurisdiction}</Badge>
                </HStack>
                
                <HStack justify="space-between">
                  <Text fontWeight="bold">Risk Level:</Text>
                  <Badge colorScheme={getRiskColor(selectedAssessment.riskLevel)}>
                    {selectedAssessment.riskLevel.toUpperCase()}
                  </Badge>
                </HStack>
                
                <HStack justify="space-between">
                  <Text fontWeight="bold">Last Assessed:</Text>
                  <Text>{selectedAssessment.lastAssessed.toLocaleString()}</Text>
                </HStack>

                <Divider />

                <VStack spacing={2} align="stretch">
                  <Text fontWeight="bold">Risk Factors:</Text>
                  {selectedAssessment.riskFactors.map((factor, index) => (
                    <Box key={index} p={3} bg="gray.50" rounded="md">
                      <Text fontSize="sm" fontWeight="semibold">{factor.category}</Text>
                      <Text fontSize="xs" color="gray.600">{factor.description}</Text>
                    </Box>
                  ))}
                </VStack>

                <VStack spacing={2} align="stretch">
                  <Text fontWeight="bold">Recommendations:</Text>
                  {selectedAssessment.recommendations.map((rec, index) => (
                    <HStack key={index} align="start">
                      <Icon as={FaCheckCircle} color="green.500" mt={0.5} />
                      <Text fontSize="sm">{rec}</Text>
                    </HStack>
                  ))}
                </VStack>
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
