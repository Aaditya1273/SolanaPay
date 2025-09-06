"use client";

import { useState, useEffect } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Select,
  FormControl,
  FormLabel,
  useColorModeValue,
  Grid,
  GridItem,
  Badge,
  Progress,
  Icon,
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  List,
  ListItem,
  ListIcon,
  useToast,
  Spinner,
} from "@chakra-ui/react";
import {
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaInfoCircle,
  FaGavel,
  FaShieldAlt,
  FaFileAlt,
  FaChartLine,
} from "react-icons/fa";
import { 
  AssetType, 
  Region, 
  RiskAssessment, 
  ComplianceRule,
  legalBotService 
} from "../../services/legalBotService";

interface ComplianceAnalyzerProps {
  onAnalysisComplete?: (assessment: RiskAssessment) => void;
}

export default function ComplianceAnalyzer({ onAnalysisComplete }: ComplianceAnalyzerProps) {
  const [selectedAssetType, setSelectedAssetType] = useState<AssetType>('real_estate');
  const [selectedRegion, setSelectedRegion] = useState<Region>('US');
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [regulations, setRegulations] = useState<ComplianceRule[]>([]);

  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const toast = useToast();

  const assetTypes: { value: AssetType; label: string }[] = [
    { value: 'real_estate', label: 'Real Estate' },
    { value: 'securities', label: 'Securities' },
    { value: 'commodities', label: 'Commodities' },
    { value: 'carbon_credits', label: 'Carbon Credits' },
    { value: 'precious_metals', label: 'Precious Metals' },
    { value: 'intellectual_property', label: 'Intellectual Property' },
    { value: 'renewable_energy', label: 'Renewable Energy' },
    { value: 'bonds', label: 'Bonds' },
    { value: 'equity', label: 'Equity' },
  ];

  const regions: { value: Region; label: string }[] = [
    { value: 'US', label: 'United States' },
    { value: 'EU', label: 'European Union' },
    { value: 'UK', label: 'United Kingdom' },
    { value: 'APAC', label: 'Asia Pacific' },
    { value: 'MENA', label: 'Middle East & North Africa' },
    { value: 'LATAM', label: 'Latin America' },
    { value: 'GLOBAL', label: 'Global/Multi-jurisdiction' },
  ];

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const result = await legalBotService.assessCompliance(selectedAssetType, selectedRegion);
      setAssessment(result);
      
      if (onAnalysisComplete) {
        onAnalysisComplete(result);
      }

      toast({
        title: "Compliance Analysis Complete",
        description: `Risk level: ${result.riskLevel.toUpperCase()}`,
        status: result.riskLevel === 'low' ? "success" : result.riskLevel === 'critical' ? "error" : "warning",
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Compliance analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: "Unable to complete compliance analysis. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsAnalyzing(false);
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
      case 'medium': return FaInfoCircle;
      case 'high': return FaExclamationTriangle;
      case 'critical': return FaTimesCircle;
      default: return FaInfoCircle;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'low': return FaCheckCircle;
      case 'medium': return FaInfoCircle;
      case 'high': return FaExclamationTriangle;
      case 'critical': return FaTimesCircle;
      default: return FaInfoCircle;
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Analysis Controls */}
      <Box
        bg={cardBg}
        p={6}
        rounded="xl"
        border="1px solid"
        borderColor={borderColor}
      >
        <VStack spacing={4} align="stretch">
          <HStack>
            <Icon as={FaGavel} color="purple.500" boxSize={5} />
            <Text fontSize="lg" fontWeight="bold">
              Compliance Risk Assessment
            </Text>
          </HStack>

          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
            <GridItem>
              <FormControl>
                <FormLabel>Asset Type</FormLabel>
                <Select
                  value={selectedAssetType}
                  onChange={(e) => setSelectedAssetType(e.target.value as AssetType)}
                >
                  {assetTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
              </FormControl>
            </GridItem>

            <GridItem>
              <FormControl>
                <FormLabel>Jurisdiction</FormLabel>
                <Select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value as Region)}
                >
                  {regions.map((region) => (
                    <option key={region.value} value={region.value}>
                      {region.label}
                    </option>
                  ))}
                </Select>
              </FormControl>
            </GridItem>
          </Grid>

          <Button
            colorScheme="purple"
            onClick={handleAnalyze}
            isLoading={isAnalyzing}
            loadingText="Analyzing..."
            leftIcon={<Icon as={FaChartLine} />}
          >
            Analyze Compliance Risk
          </Button>
        </VStack>
      </Box>

      {/* Assessment Results */}
      {assessment && (
        <VStack spacing={6} align="stretch">
          {/* Risk Overview */}
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
                  Risk Assessment Summary
                </Text>
                <Badge
                  size="lg"
                  colorScheme={getRiskColor(assessment.riskLevel)}
                  variant="solid"
                  px={3}
                  py={1}
                  rounded="full"
                >
                  <HStack spacing={1}>
                    <Icon as={getRiskIcon(assessment.riskLevel)} />
                    <Text>{assessment.riskLevel.toUpperCase()} RISK</Text>
                  </HStack>
                </Badge>
              </HStack>

              <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4}>
                <GridItem>
                  <VStack spacing={2}>
                    <Icon as={FaShieldAlt} color="blue.500" boxSize={6} />
                    <Text fontSize="sm" color="gray.600">Risk Factors</Text>
                    <Text fontSize="2xl" fontWeight="bold">
                      {assessment.riskFactors.length}
                    </Text>
                  </VStack>
                </GridItem>

                <GridItem>
                  <VStack spacing={2}>
                    <Icon as={FaFileAlt} color="orange.500" boxSize={6} />
                    <Text fontSize="sm" color="gray.600">Compliance Gaps</Text>
                    <Text fontSize="2xl" fontWeight="bold">
                      {assessment.complianceGaps.length}
                    </Text>
                  </VStack>
                </GridItem>

                <GridItem>
                  <VStack spacing={2}>
                    <Icon as={FaCheckCircle} color="green.500" boxSize={6} />
                    <Text fontSize="sm" color="gray.600">Recommendations</Text>
                    <Text fontSize="2xl" fontWeight="bold">
                      {assessment.recommendations.length}
                    </Text>
                  </VStack>
                </GridItem>
              </Grid>

              <Alert status={assessment.riskLevel === 'low' ? "success" : assessment.riskLevel === 'critical' ? "error" : "warning"}>
                <AlertIcon />
                <Box>
                  <AlertTitle>
                    {assessment.riskLevel === 'low' ? 'Low Risk Assessment' :
                     assessment.riskLevel === 'critical' ? 'Critical Risk Identified' :
                     'Compliance Attention Required'}
                  </AlertTitle>
                  <AlertDescription>
                    {assessment.riskLevel === 'low' 
                      ? 'Your asset type and jurisdiction combination shows relatively low compliance risk.'
                      : assessment.riskLevel === 'critical'
                      ? 'Critical compliance issues identified. Immediate legal consultation recommended.'
                      : 'Several compliance considerations require attention before proceeding.'
                    }
                  </AlertDescription>
                </Box>
              </Alert>
            </VStack>
          </Box>

          {/* Detailed Analysis */}
          <Box
            bg={cardBg}
            p={6}
            rounded="xl"
            border="1px solid"
            borderColor={borderColor}
          >
            <Accordion allowMultiple defaultIndex={[0]}>
              {/* Risk Factors */}
              <AccordionItem>
                <AccordionButton>
                  <Box flex="1" textAlign="left">
                    <HStack>
                      <Icon as={FaExclamationTriangle} color="orange.500" />
                      <Text fontWeight="semibold">Risk Factors ({assessment.riskFactors.length})</Text>
                    </HStack>
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <VStack spacing={3} align="stretch">
                    {assessment.riskFactors.map((factor, index) => (
                      <Box key={index} p={4} bg="gray.50" rounded="md">
                        <VStack spacing={2} align="stretch">
                          <HStack justify="space-between">
                            <Text fontWeight="semibold">{factor.category}</Text>
                            <Badge colorScheme={factor.impact > 7 ? "red" : factor.impact > 5 ? "orange" : "yellow"}>
                              Impact: {factor.impact}/10
                            </Badge>
                          </HStack>
                          <Text fontSize="sm" color="gray.600">
                            {factor.description}
                          </Text>
                          <HStack spacing={4}>
                            <Text fontSize="sm">
                              <strong>Likelihood:</strong> {factor.likelihood}/10
                            </Text>
                            <Text fontSize="sm">
                              <strong>Risk Score:</strong> {(factor.impact * factor.likelihood).toFixed(1)}
                            </Text>
                          </HStack>
                          <Box>
                            <Text fontSize="sm" fontWeight="semibold" color="blue.600">
                              Mitigation:
                            </Text>
                            <Text fontSize="sm">{factor.mitigation}</Text>
                          </Box>
                        </VStack>
                      </Box>
                    ))}
                  </VStack>
                </AccordionPanel>
              </AccordionItem>

              {/* Compliance Gaps */}
              <AccordionItem>
                <AccordionButton>
                  <Box flex="1" textAlign="left">
                    <HStack>
                      <Icon as={FaFileAlt} color="red.500" />
                      <Text fontWeight="semibold">Compliance Gaps ({assessment.complianceGaps.length})</Text>
                    </HStack>
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <VStack spacing={3} align="stretch">
                    {assessment.complianceGaps.map((gap, index) => (
                      <Box key={index} p={4} bg="red.50" rounded="md" border="1px solid" borderColor="red.200">
                        <VStack spacing={2} align="stretch">
                          <HStack justify="space-between">
                            <Text fontWeight="semibold">{gap.requirement}</Text>
                            <Badge colorScheme={getRiskColor(gap.priority)}>
                              {gap.priority.toUpperCase()}
                            </Badge>
                          </HStack>
                          <HStack spacing={4}>
                            <Text fontSize="sm">
                              <strong>Current Status:</strong> {gap.currentStatus}
                            </Text>
                          </HStack>
                          <Box>
                            <Text fontSize="sm" fontWeight="semibold" color="red.600">
                              Required Action:
                            </Text>
                            <Text fontSize="sm">{gap.requiredAction}</Text>
                          </Box>
                          {gap.deadline && (
                            <Text fontSize="sm" color="red.600">
                              <strong>Deadline:</strong> {gap.deadline.toLocaleDateString()}
                            </Text>
                          )}
                        </VStack>
                      </Box>
                    ))}
                  </VStack>
                </AccordionPanel>
              </AccordionItem>

              {/* Recommendations */}
              <AccordionItem>
                <AccordionButton>
                  <Box flex="1" textAlign="left">
                    <HStack>
                      <Icon as={FaCheckCircle} color="green.500" />
                      <Text fontWeight="semibold">Recommendations ({assessment.recommendations.length})</Text>
                    </HStack>
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <List spacing={2}>
                    {assessment.recommendations.map((recommendation, index) => (
                      <ListItem key={index}>
                        <ListIcon as={FaCheckCircle} color="green.500" />
                        <Text fontSize="sm">{recommendation}</Text>
                      </ListItem>
                    ))}
                  </List>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          </Box>

          {/* Assessment Metadata */}
          <Box
            bg={cardBg}
            p={4}
            rounded="lg"
            border="1px solid"
            borderColor={borderColor}
          >
            <HStack justify="space-between" fontSize="sm" color="gray.600">
              <Text>Assessment ID: {assessment.id}</Text>
              <Text>Last Updated: {assessment.lastAssessed.toLocaleString()}</Text>
              <Text>Jurisdiction: {assessment.jurisdiction}</Text>
            </HStack>
          </Box>
        </VStack>
      )}

      {/* Loading State */}
      {isAnalyzing && (
        <Box
          bg={cardBg}
          p={8}
          rounded="xl"
          border="1px solid"
          borderColor={borderColor}
          textAlign="center"
        >
          <VStack spacing={4}>
            <Spinner size="xl" color="purple.500" />
            <Text fontSize="lg" fontWeight="semibold">
              Analyzing Compliance Requirements
            </Text>
            <Text color="gray.600">
              Reviewing regulations for {assetTypes.find(t => t.value === selectedAssetType)?.label} in {regions.find(r => r.value === selectedRegion)?.label}...
            </Text>
          </VStack>
        </Box>
      )}
    </VStack>
  );
}
