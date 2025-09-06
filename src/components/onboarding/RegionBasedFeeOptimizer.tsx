"use client";

import { useState, useEffect } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  SimpleGrid,
  useColorModeValue,
  Progress,
  Tooltip,
  Button,
} from "@chakra-ui/react";
import {
  FaDollarSign,
  FaClock,
  FaChartLine,
  FaInfoCircle,
  FaOptimize,
} from "react-icons/fa";
import { paymentService } from "../../services/paymentService";

interface FeeOptimizerProps {
  region: string;
  amount: number;
  currency: string;
  onOptimizedMethodSelect: (method: any) => void;
}

interface OptimizedMethod {
  provider: string;
  method: string;
  totalFee: number;
  processingTime: string;
  savings: number;
  score: number;
  reasons: string[];
}

export default function RegionBasedFeeOptimizer({
  region,
  amount,
  currency,
  onOptimizedMethodSelect
}: FeeOptimizerProps) {
  const [optimizedMethods, setOptimizedMethods] = useState<OptimizedMethod[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<OptimizedMethod | null>(null);

  const cardBg = useColorModeValue("white", "gray.800");

  useEffect(() => {
    if (region && amount > 0) {
      optimizePaymentMethods();
    }
  }, [region, amount, currency]);

  const optimizePaymentMethods = async () => {
    setIsAnalyzing(true);
    try {
      // Get all available payment methods for the region
      const methods = await paymentService.getPaymentMethods(region);
      
      // Calculate optimization scores for each method
      const optimized = await Promise.all(
        methods.map(async (method) => {
          const quote = await paymentService.getQuote({
            provider: method.provider,
            paymentMethod: method.id,
            fiatAmount: amount,
            fiatCurrency: currency,
            cryptoCurrency: 'USDC',
            region
          });

          // Calculate total fees
          const processingFee = parseFloat(quote.fee);
          const networkFee = parseFloat(quote.networkFee) * parseFloat(quote.exchangeRate);
          const totalFee = processingFee + networkFee;

          // Calculate optimization score based on multiple factors
          const feeScore = Math.max(0, 100 - (totalFee / amount) * 100);
          const speedScore = getSpeedScore(method.processingTime);
          const reliabilityScore = getReliabilityScore(method.provider);
          const regionScore = getRegionScore(method, region);
          
          const score = (feeScore * 0.4 + speedScore * 0.3 + reliabilityScore * 0.2 + regionScore * 0.1);

          // Calculate savings compared to highest fee method
          const highestFee = Math.max(...methods.map(m => 
            parseFloat(m.fee.replace(/[^0-9.]/g, '')) + 2 // Estimate network fee
          ));
          const savings = Math.max(0, highestFee - totalFee);

          return {
            provider: method.provider,
            method: method.name,
            totalFee,
            processingTime: method.processingTime,
            savings,
            score,
            reasons: getOptimizationReasons(method, totalFee, amount, region)
          };
        })
      );

      // Sort by optimization score
      const sortedMethods = optimized.sort((a, b) => b.score - a.score);
      setOptimizedMethods(sortedMethods);
      
      // Auto-select the best method
      if (sortedMethods.length > 0) {
        setSelectedMethod(sortedMethods[0]);
      }

    } catch (error) {
      console.error('Fee optimization error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSpeedScore = (processingTime: string): number => {
    const time = processingTime.toLowerCase();
    if (time.includes('instant') || time.includes('immediate')) return 100;
    if (time.includes('minute')) return 90;
    if (time.includes('hour')) return 70;
    if (time.includes('1-2 days')) return 50;
    if (time.includes('3-5 days')) return 30;
    return 20;
  };

  const getReliabilityScore = (provider: string): number => {
    const scores: { [key: string]: number } = {
      'ramp': 95,
      'moonpay': 90,
      'transak': 85,
      'razorpay': 88,
      'mpesa': 92
    };
    return scores[provider.toLowerCase()] || 70;
  };

  const getRegionScore = (method: any, region: string): number => {
    // Higher scores for region-optimized payment methods
    const regionOptimizations: { [key: string]: string[] } = {
      'US': ['card', 'ach', 'bank transfer'],
      'IN': ['upi', 'net banking'],
      'KE': ['m-pesa', 'mobile money'],
      'BR': ['pix', 'bank transfer'],
      'EU': ['sepa', 'bank transfer'],
      'UK': ['faster payments', 'bank transfer']
    };

    const optimizedMethods = regionOptimizations[region] || [];
    const methodName = method.name.toLowerCase();
    
    return optimizedMethods.some(opt => methodName.includes(opt)) ? 100 : 70;
  };

  const getOptimizationReasons = (method: any, totalFee: number, amount: number, region: string): string[] => {
    const reasons = [];
    const feePercentage = (totalFee / amount) * 100;

    if (feePercentage < 1) reasons.push('Ultra-low fees');
    else if (feePercentage < 2) reasons.push('Low fees');
    
    if (method.processingTime.includes('instant')) reasons.push('Instant processing');
    else if (method.processingTime.includes('minute')) reasons.push('Fast processing');
    
    if (method.provider === 'razorpay' && region === 'IN') reasons.push('India-optimized');
    if (method.name.toLowerCase().includes('m-pesa') && region === 'KE') reasons.push('Kenya-optimized');
    if (method.name.toLowerCase().includes('pix') && region === 'BR') reasons.push('Brazil-optimized');
    if (method.name.toLowerCase().includes('sepa') && region === 'EU') reasons.push('EU-optimized');
    
    if (method.features?.includes('No KYC required')) reasons.push('Simplified verification');
    if (method.limits?.max >= 10000) reasons.push('High limits');

    return reasons.slice(0, 3); // Limit to top 3 reasons
  };

  const handleMethodSelect = (method: OptimizedMethod) => {
    setSelectedMethod(method);
    onOptimizedMethodSelect(method);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'green';
    if (score >= 75) return 'blue';
    if (score >= 60) return 'yellow';
    return 'red';
  };

  if (isAnalyzing) {
    return (
      <Box bg={cardBg} p={6} rounded="xl" border="1px solid" borderColor="gray.200">
        <VStack spacing={4}>
          <Icon as={FaOptimize} boxSize={8} color="blue.500" />
          <Text fontWeight="bold">Optimizing Payment Methods...</Text>
          <Progress size="lg" colorScheme="blue" isIndeterminate w="full" rounded="full" />
          <Text fontSize="sm" color="gray.600" textAlign="center">
            Analyzing fees, processing times, and regional optimizations
          </Text>
        </VStack>
      </Box>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <Box bg={cardBg} p={6} rounded="xl" border="1px solid" borderColor="gray.200">
        <VStack spacing={4}>
          <HStack>
            <Icon as={FaOptimize} color="blue.500" boxSize={6} />
            <Text fontWeight="bold" fontSize="lg">Fee Optimization Results</Text>
          </HStack>
          <Text fontSize="sm" color="gray.600" textAlign="center">
            We've analyzed all available payment methods for {region} and optimized for your {amount} {currency} transaction
          </Text>
        </VStack>
      </Box>

      {/* Optimized Methods */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
        {optimizedMethods.slice(0, 6).map((method, index) => (
          <Box
            key={`${method.provider}-${method.method}`}
            bg={cardBg}
            p={5}
            rounded="xl"
            border="2px solid"
            borderColor={selectedMethod === method ? "blue.500" : "gray.200"}
            cursor="pointer"
            onClick={() => handleMethodSelect(method)}
            _hover={{ borderColor: "blue.300", shadow: "md" }}
            transition="all 0.2s"
            position="relative"
          >
            {/* Rank Badge */}
            <Badge
              position="absolute"
              top={2}
              left={2}
              colorScheme={index === 0 ? "gold" : index === 1 ? "gray" : "orange"}
              variant="solid"
              fontSize="xs"
            >
              #{index + 1}
            </Badge>

            {/* Optimization Score */}
            <Badge
              position="absolute"
              top={2}
              right={2}
              colorScheme={getScoreColor(method.score)}
              variant="solid"
              fontSize="xs"
            >
              {Math.round(method.score)}% optimal
            </Badge>

            <VStack spacing={4} align="start" mt={6}>
              {/* Method Info */}
              <VStack align="start" spacing={1}>
                <Text fontWeight="bold" fontSize="md">
                  {method.method}
                </Text>
                <Badge colorScheme="blue" variant="outline">
                  {method.provider}
                </Badge>
              </VStack>

              {/* Key Metrics */}
              <SimpleGrid columns={2} spacing={3} w="full">
                <VStack align="start" spacing={1}>
                  <HStack>
                    <Icon as={FaDollarSign} color="green.500" boxSize={3} />
                    <Text fontSize="xs" color="gray.600">Total Fee</Text>
                  </HStack>
                  <Text fontSize="sm" fontWeight="bold" color="green.600">
                    ${method.totalFee.toFixed(2)}
                  </Text>
                </VStack>

                <VStack align="start" spacing={1}>
                  <HStack>
                    <Icon as={FaClock} color="blue.500" boxSize={3} />
                    <Text fontSize="xs" color="gray.600">Speed</Text>
                  </HStack>
                  <Text fontSize="sm" fontWeight="bold">
                    {method.processingTime}
                  </Text>
                </VStack>
              </SimpleGrid>

              {/* Savings */}
              {method.savings > 0 && (
                <HStack>
                  <Icon as={FaChartLine} color="green.500" boxSize={3} />
                  <Text fontSize="sm" color="green.600" fontWeight="semibold">
                    Save ${method.savings.toFixed(2)}
                  </Text>
                </HStack>
              )}

              {/* Optimization Reasons */}
              <VStack align="start" spacing={1} w="full">
                {method.reasons.map((reason, idx) => (
                  <HStack key={idx} spacing={2}>
                    <Box w={2} h={2} bg="blue.500" rounded="full" />
                    <Text fontSize="xs" color="gray.600">{reason}</Text>
                  </HStack>
                ))}
              </VStack>
            </VStack>
          </Box>
        ))}
      </SimpleGrid>

      {/* Selected Method Summary */}
      {selectedMethod && (
        <Box bg="blue.50" p={6} rounded="xl" border="1px solid" borderColor="blue.200">
          <VStack spacing={4}>
            <HStack>
              <Icon as={FaInfoCircle} color="blue.500" />
              <Text fontWeight="bold" color="blue.800">
                Recommended: {selectedMethod.method} via {selectedMethod.provider}
              </Text>
            </HStack>
            
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} w="full">
              <VStack>
                <Text fontSize="xs" color="blue.600">Optimization Score</Text>
                <Text fontSize="lg" fontWeight="bold" color="blue.800">
                  {Math.round(selectedMethod.score)}%
                </Text>
              </VStack>
              <VStack>
                <Text fontSize="xs" color="blue.600">Total Fee</Text>
                <Text fontSize="lg" fontWeight="bold" color="blue.800">
                  ${selectedMethod.totalFee.toFixed(2)}
                </Text>
              </VStack>
              <VStack>
                <Text fontSize="xs" color="blue.600">Processing Time</Text>
                <Text fontSize="lg" fontWeight="bold" color="blue.800">
                  {selectedMethod.processingTime}
                </Text>
              </VStack>
              <VStack>
                <Text fontSize="xs" color="blue.600">You Save</Text>
                <Text fontSize="lg" fontWeight="bold" color="green.600">
                  ${selectedMethod.savings.toFixed(2)}
                </Text>
              </VStack>
            </SimpleGrid>

            <Button colorScheme="blue" size="sm" w="full">
              Use This Method
            </Button>
          </VStack>
        </Box>
      )}

      {/* Optimization Tips */}
      <Box bg="gray.50" p={4} rounded="lg" border="1px solid" borderColor="gray.200">
        <VStack spacing={2} align="start">
          <Text fontWeight="semibold" fontSize="sm" color="gray.700">
            💡 Optimization Tips:
          </Text>
          <Text fontSize="xs" color="gray.600">
            • Larger amounts typically have better fee percentages
          </Text>
          <Text fontSize="xs" color="gray.600">
            • Regional payment methods often offer the best rates
          </Text>
          <Text fontSize="xs" color="gray.600">
            • Consider processing time vs. fee trade-offs based on urgency
          </Text>
        </VStack>
      </Box>
    </VStack>
  );
}
