'use client';

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Progress,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Collapse,
  useDisclosure,
  Icon,
  SimpleGrid,
  Tooltip,
  Alert,
  AlertIcon,
  List,
  ListItem,
  ListIcon,
} from '@chakra-ui/react';
import { 
  FiTrendingUp, 
  FiShield, 
  FiMapPin, 
  FiDollarSign, 
  FiChevronDown, 
  FiChevronUp,
  FiCheckCircle,
  FiAlertTriangle,
  FiTarget,
  FiGlobe,
} from 'react-icons/fi';
import { MatchingRecommendation } from '../../services/aiMatchingService';

interface RecommendationCardProps {
  recommendation: MatchingRecommendation;
  onInvest?: (assetId: string) => void;
  onLearnMore?: (assetId: string) => void;
  onFeedback?: (assetId: string, rating: number) => void;
}

export default function RecommendationCard({ 
  recommendation, 
  onInvest, 
  onLearnMore, 
  onFeedback 
}: RecommendationCardProps) {
  const { isOpen, onToggle } = useDisclosure();
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  
  const { asset, matchScore, confidence, reasoning, riskAlignment, preferenceAlignment, 
          financialFit, geographicFit, warnings, opportunities } = recommendation;

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'blue';
    if (score >= 40) return 'orange';
    return 'red';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'green';
    if (confidence >= 0.6) return 'blue';
    return 'orange';
  };

  const getRiskBadgeColor = (riskScore: number) => {
    if (riskScore <= 30) return 'green';
    if (riskScore <= 70) return 'yellow';
    return 'red';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const handleFeedback = (rating: number) => {
    setFeedbackRating(rating);
    onFeedback?.(asset.id, rating);
  };

  return (
    <Card 
      shadow="md" 
      borderRadius="lg" 
      overflow="hidden"
      transition="all 0.2s"
      _hover={{ shadow: 'lg', transform: 'translateY(-2px)' }}
    >
      <CardHeader pb={2}>
        <HStack justify="space-between" align="start">
          <VStack align="start" spacing={1} flex={1}>
            <HStack>
              <Text fontSize="lg" fontWeight="bold" noOfLines={1}>
                {asset.name}
              </Text>
              <Badge colorScheme={getMatchScoreColor(matchScore)} variant="solid">
                {matchScore}% Match
              </Badge>
            </HStack>
            
            <HStack spacing={3} fontSize="sm" color="gray.600">
              <HStack>
                <Icon as={FiMapPin} />
                <Text>{asset.location.city}, {asset.location.country}</Text>
              </HStack>
              <Badge colorScheme="gray" variant="outline">
                {asset.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
            </HStack>
          </VStack>

          <VStack align="end" spacing={1}>
            <Tooltip label={`${(confidence * 100).toFixed(0)}% confidence in this recommendation`}>
              <Badge colorScheme={getConfidenceColor(confidence)} variant="outline">
                {(confidence * 100).toFixed(0)}% Confidence
              </Badge>
            </Tooltip>
            <Badge colorScheme={getRiskBadgeColor(asset.financialMetrics.riskScore)}>
              Risk: {asset.financialMetrics.riskScore}/100
            </Badge>
          </VStack>
        </HStack>
      </CardHeader>

      <CardBody pt={0}>
        <VStack spacing={4} align="stretch">
          {/* Key Metrics */}
          <SimpleGrid columns={2} spacing={4}>
            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>Expected Return</Text>
              <Text fontSize="lg" fontWeight="semibold" color="green.600">
                {formatPercentage(asset.financialMetrics.expectedReturn)}
              </Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>Min Investment</Text>
              <Text fontSize="lg" fontWeight="semibold">
                {formatCurrency(asset.financialMetrics.minimumInvestment)}
              </Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>Liquidity Score</Text>
              <HStack>
                <Progress 
                  value={asset.financialMetrics.liquidityScore} 
                  size="sm" 
                  colorScheme="blue" 
                  flex={1}
                />
                <Text fontSize="sm">{asset.financialMetrics.liquidityScore}/100</Text>
              </HStack>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>ESG Score</Text>
              <HStack>
                <Progress 
                  value={asset.characteristics.sustainability.esgScore} 
                  size="sm" 
                  colorScheme="green" 
                  flex={1}
                />
                <Text fontSize="sm">{asset.characteristics.sustainability.esgScore}/100</Text>
              </HStack>
            </Box>
          </SimpleGrid>

          {/* Match Breakdown */}
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={2}>Match Analysis</Text>
            <VStack spacing={2}>
              <HStack w="full">
                <Icon as={FiShield} color="blue.500" />
                <Text fontSize="sm" flex={1}>Risk Alignment</Text>
                <Progress value={riskAlignment} size="sm" colorScheme="blue" w="100px" />
                <Text fontSize="sm" w="40px">{Math.round(riskAlignment)}%</Text>
              </HStack>
              <HStack w="full">
                <Icon as={FiTarget} color="purple.500" />
                <Text fontSize="sm" flex={1}>Preference Match</Text>
                <Progress value={preferenceAlignment} size="sm" colorScheme="purple" w="100px" />
                <Text fontSize="sm" w="40px">{Math.round(preferenceAlignment)}%</Text>
              </HStack>
              <HStack w="full">
                <Icon as={FiDollarSign} color="green.500" />
                <Text fontSize="sm" flex={1}>Financial Fit</Text>
                <Progress value={financialFit} size="sm" colorScheme="green" w="100px" />
                <Text fontSize="sm" w="40px">{Math.round(financialFit)}%</Text>
              </HStack>
              <HStack w="full">
                <Icon as={FiGlobe} color="orange.500" />
                <Text fontSize="sm" flex={1}>Geographic Match</Text>
                <Progress value={geographicFit} size="sm" colorScheme="orange" w="100px" />
                <Text fontSize="sm" w="40px">{Math.round(geographicFit)}%</Text>
              </HStack>
            </VStack>
          </Box>

          {/* Key Reasoning */}
          {reasoning && reasoning.length > 0 && (
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>Why This Matches You</Text>
              <List spacing={1}>
                {reasoning.slice(0, 3).map((reason, index) => (
                  <ListItem key={index} fontSize="sm" color="gray.700">
                    <ListIcon as={FiCheckCircle} color="green.500" />
                    {reason}
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Warnings */}
          {warnings && warnings.length > 0 && (
            <Alert status="warning" size="sm" borderRadius="md">
              <AlertIcon />
              <Box>
                <Text fontSize="sm" fontWeight="medium">Consider These Risks:</Text>
                <Text fontSize="xs" mt={1}>
                  {warnings[0]}
                  {warnings.length > 1 && ` +${warnings.length - 1} more`}
                </Text>
              </Box>
            </Alert>
          )}

          {/* Opportunities */}
          {opportunities && opportunities.length > 0 && (
            <Alert status="info" size="sm" borderRadius="md">
              <AlertIcon />
              <Box>
                <Text fontSize="sm" fontWeight="medium">Key Opportunities:</Text>
                <Text fontSize="xs" mt={1}>
                  {opportunities[0]}
                  {opportunities.length > 1 && ` +${opportunities.length - 1} more`}
                </Text>
              </Box>
            </Alert>
          )}

          {/* Action Buttons */}
          <HStack spacing={3}>
            <Button
              colorScheme="blue"
              size="sm"
              flex={1}
              onClick={() => onInvest?.(asset.id)}
            >
              Invest Now
            </Button>
            <Button
              variant="outline"
              size="sm"
              flex={1}
              onClick={() => onLearnMore?.(asset.id)}
            >
              Learn More
            </Button>
          </HStack>

          {/* Expandable Details */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            rightIcon={<Icon as={isOpen ? FiChevronUp : FiChevronDown} />}
          >
            {isOpen ? 'Less Details' : 'More Details'}
          </Button>

          <Collapse in={isOpen}>
            <VStack spacing={4} align="stretch" pt={2}>
              <Divider />
              
              {/* Asset Description */}
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2}>About This Asset</Text>
                <Text fontSize="sm" color="gray.700">
                  {asset.description}
                </Text>
              </Box>

              {/* Performance Metrics */}
              <SimpleGrid columns={2} spacing={4}>
                <Box>
                  <Text fontSize="sm" color="gray.600" mb={1}>Sharpe Ratio</Text>
                  <Text fontSize="md" fontWeight="semibold">
                    {asset.performance.sharpeRatio.toFixed(2)}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.600" mb={1}>Max Drawdown</Text>
                  <Text fontSize="md" fontWeight="semibold" color="red.600">
                    -{formatPercentage(asset.performance.maxDrawdown)}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.600" mb={1}>Current Value</Text>
                  <Text fontSize="md" fontWeight="semibold">
                    {formatCurrency(asset.financialMetrics.currentValue)}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.600" mb={1}>Volatility</Text>
                  <Text fontSize="md" fontWeight="semibold">
                    {formatPercentage(asset.financialMetrics.volatility)}
                  </Text>
                </Box>
              </SimpleGrid>

              {/* Complete Analysis */}
              {reasoning && reasoning.length > 3 && (
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>Complete Analysis</Text>
                  <List spacing={1}>
                    {reasoning.slice(3).map((reason, index) => (
                      <ListItem key={index + 3} fontSize="sm" color="gray.700">
                        <ListIcon as={FiCheckCircle} color="green.500" />
                        {reason}
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {/* All Warnings */}
              {warnings && warnings.length > 1 && (
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={2} color="orange.600">
                    All Risk Considerations
                  </Text>
                  <List spacing={1}>
                    {warnings.slice(1).map((warning, index) => (
                      <ListItem key={index + 1} fontSize="sm" color="gray.700">
                        <ListIcon as={FiAlertTriangle} color="orange.500" />
                        {warning}
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {/* All Opportunities */}
              {opportunities && opportunities.length > 1 && (
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={2} color="blue.600">
                    All Opportunities
                  </Text>
                  <List spacing={1}>
                    {opportunities.slice(1).map((opportunity, index) => (
                      <ListItem key={index + 1} fontSize="sm" color="gray.700">
                        <ListIcon as={FiTrendingUp} color="blue.500" />
                        {opportunity}
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {/* Feedback Section */}
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2}>Rate This Recommendation</Text>
                <HStack spacing={2}>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <Button
                      key={rating}
                      size="sm"
                      variant={feedbackRating === rating ? "solid" : "outline"}
                      colorScheme={feedbackRating === rating ? "blue" : "gray"}
                      onClick={() => handleFeedback(rating)}
                    >
                      {rating}★
                    </Button>
                  ))}
                </HStack>
                {feedbackRating && (
                  <Text fontSize="xs" color="gray.600" mt={1}>
                    Thank you for your feedback!
                  </Text>
                )}
              </Box>
            </VStack>
          </Collapse>
        </VStack>
      </CardBody>
    </Card>
  );
}
