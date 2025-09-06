"use client";

import { useState, useEffect } from "react";
import {
  VStack,
  HStack,
  Heading,
  Text,
  Box,
  Button,
  Icon,
  SimpleGrid,
  useColorModeValue,
  Alert,
  AlertIcon,
  Badge,
  Input,
  FormControl,
  FormLabel,
  Select,
  Divider,
  Spinner,
} from "@chakra-ui/react";
import {
  FaCreditCard,
  FaUniversity,
  FaMobile,
  FaCheck,
  FaExternalLinkAlt,
  FaDollarSign,
  FaShieldAlt,
} from "react-icons/fa";
import { paymentService } from "../../../services/paymentService";
import { localizationService } from "../../../services/localizationService";

interface PaymentSetupStepProps {
  data: any;
  onComplete: (data: any) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export default function PaymentSetupStep({ 
  data, 
  onComplete, 
  isLoading, 
  setIsLoading 
}: PaymentSetupStepProps) {
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [quote, setQuote] = useState<any>(null);
  const [purchaseAmount, setPurchaseAmount] = useState('100');

  const cardBg = useColorModeValue("white", "gray.800");
  const t = localizationService.t;

  useEffect(() => {
    // Load payment methods for user's region
    const loadPaymentMethods = async () => {
      const methods = await paymentService.getPaymentMethods(data.region);
      setPaymentMethods(methods);
    };

    if (data.region) {
      loadPaymentMethods();
    }
  }, [data.region]);

  const handleProviderSelect = async (providerId: string, methodId: string) => {
    setSelectedProvider(providerId);
    setSelectedMethod(methodId);
    
    // Get quote for demo amount
    setIsLoading(true);
    try {
      const quoteData = await paymentService.getQuote({
        provider: providerId,
        paymentMethod: methodId,
        fiatAmount: parseFloat(purchaseAmount),
        fiatCurrency: paymentService.getRegionConfig(data.region)?.currency || 'USD',
        cryptoCurrency: 'USDC',
        region: data.region
      });
      setQuote(quoteData);
    } catch (error) {
      console.error('Quote error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupPayment = async () => {
    if (!selectedProvider || !selectedMethod) return;

    setIsLoading(true);
    try {
      // Simulate payment setup
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Complete the step
      onComplete({
        paymentProvider: selectedProvider,
        paymentMethod: selectedMethod,
        paymentSetup: true,
        quote: quote
      });

    } catch (error) {
      console.error('Payment setup error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'card':
      case 'credit card':
      case 'debit card':
        return FaCreditCard;
      case 'bank transfer':
      case 'ach':
      case 'sepa':
      case 'pix':
        return FaUniversity;
      case 'upi':
      case 'm-pesa':
      case 'mobile money':
        return FaMobile;
      default:
        return FaDollarSign;
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'ramp':
        return 'blue';
      case 'moonpay':
        return 'purple';
      case 'razorpay':
        return 'green';
      case 'transak':
        return 'orange';
      default:
        return 'gray';
    }
  };

  return (
    <VStack spacing={8} align="stretch">
      {/* Header */}
      <VStack spacing={4} textAlign="center">
        <Icon as={FaCreditCard} boxSize={12} color="green.500" />
        <Heading size="lg" color="gray.800">
          {t('onboarding.setupPayment')}
        </Heading>
        <Text color="gray.600" maxW="2xl">
          {t('onboarding.paymentDescription')}
        </Text>
      </VStack>

      {/* Region Info */}
      <Alert status="info" rounded="lg">
        <AlertIcon />
        <VStack align="start" spacing={1}>
          <Text fontWeight="bold" fontSize="sm">
            Payment Methods for {data.region}
          </Text>
          <Text fontSize="sm">
            Showing payment options optimized for your region with local currency support.
          </Text>
        </VStack>
      </Alert>

      {/* Test Purchase Amount */}
      <Box bg={cardBg} p={6} rounded="xl" border="1px solid" borderColor="gray.200">
        <VStack spacing={4}>
          <Heading size="md">Test Purchase Amount</Heading>
          <HStack w="full" maxW="md">
            <FormControl>
              <FormLabel>Amount</FormLabel>
              <Input
                type="number"
                value={purchaseAmount}
                onChange={(e) => setPurchaseAmount(e.target.value)}
                placeholder="100"
                bg="white"
              />
            </FormControl>
            <FormControl>
              <FormLabel>Currency</FormLabel>
              <Select bg="white" isDisabled>
                <option value={paymentService.getRegionConfig(data.region)?.currency || 'USD'}>
                  {paymentService.getRegionConfig(data.region)?.currency || 'USD'}
                </option>
              </Select>
            </FormControl>
          </HStack>
          <Text fontSize="sm" color="gray.600" textAlign="center">
            This is just for testing the payment setup. No actual purchase will be made.
          </Text>
        </VStack>
      </Box>

      {/* Payment Methods Grid */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
        {paymentMethods.map((method) => (
          <Box
            key={`${method.provider}-${method.id}`}
            bg={cardBg}
            p={6}
            rounded="xl"
            border="2px solid"
            borderColor={
              selectedProvider === method.provider && selectedMethod === method.id
                ? "green.500"
                : "gray.200"
            }
            cursor="pointer"
            onClick={() => handleProviderSelect(method.provider, method.id)}
            _hover={{ borderColor: "green.300", shadow: "lg" }}
            transition="all 0.2s"
            position="relative"
          >
            {selectedProvider === method.provider && selectedMethod === method.id && (
              <Badge
                position="absolute"
                top={3}
                right={3}
                colorScheme="green"
                variant="solid"
              >
                <Icon as={FaCheck} mr={1} />
                Selected
              </Badge>
            )}

            <VStack spacing={4} align="start">
              {/* Method Header */}
              <HStack>
                <Icon 
                  as={getMethodIcon(method.name)} 
                  color={`${getProviderColor(method.provider)}.500`}
                  boxSize={8}
                />
                <VStack align="start" spacing={0}>
                  <Text fontWeight="bold" fontSize="lg">
                    {method.name}
                  </Text>
                  <Badge colorScheme={getProviderColor(method.provider)} variant="outline">
                    {method.provider}
                  </Badge>
                </VStack>
              </HStack>

              {/* Method Details */}
              <VStack align="start" spacing={2} w="full">
                <HStack justify="space-between" w="full">
                  <Text fontSize="sm" color="gray.600">Processing Time:</Text>
                  <Text fontSize="sm" fontWeight="semibold">{method.processingTime}</Text>
                </HStack>
                <HStack justify="space-between" w="full">
                  <Text fontSize="sm" color="gray.600">Fee:</Text>
                  <Text fontSize="sm" fontWeight="semibold" color="green.600">
                    {method.fee}
                  </Text>
                </HStack>
                <HStack justify="space-between" w="full">
                  <Text fontSize="sm" color="gray.600">Limits:</Text>
                  <Text fontSize="sm" fontWeight="semibold">
                    ${method.limits.min}-${method.limits.max}
                  </Text>
                </HStack>
              </VStack>

              {/* Features */}
              <VStack align="start" spacing={1} w="full">
                {method.features.slice(0, 2).map((feature: string) => (
                  <HStack key={feature} spacing={2}>
                    <Icon as={FaCheck} color="green.500" boxSize={3} />
                    <Text fontSize="xs" color="gray.600">{feature}</Text>
                  </HStack>
                ))}
              </VStack>
            </VStack>
          </Box>
        ))}
      </SimpleGrid>

      {/* Quote Display */}
      {quote && (
        <Box bg="green.50" p={6} rounded="xl" border="1px solid" borderColor="green.200">
          <VStack spacing={4}>
            <Heading size="md" color="green.800">Payment Quote</Heading>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} w="full">
              <VStack>
                <Text fontSize="sm" color="green.600">You Pay</Text>
                <Text fontSize="xl" fontWeight="bold" color="green.800">
                  {quote.fiatAmount} {quote.fiatCurrency}
                </Text>
              </VStack>
              <VStack>
                <Text fontSize="sm" color="green.600">You Receive</Text>
                <Text fontSize="xl" fontWeight="bold" color="green.800">
                  {quote.cryptoAmount} {quote.cryptoCurrency}
                </Text>
              </VStack>
              <VStack>
                <Text fontSize="sm" color="green.600">Exchange Rate</Text>
                <Text fontSize="lg" fontWeight="bold" color="green.800">
                  1 {quote.cryptoCurrency} = {quote.exchangeRate} {quote.fiatCurrency}
                </Text>
              </VStack>
            </SimpleGrid>
            
            <Divider />
            
            <HStack justify="space-between" w="full">
              <Text fontSize="sm" color="green.600">Processing Fee:</Text>
              <Text fontSize="sm" fontWeight="semibold">{quote.fee} {quote.fiatCurrency}</Text>
            </HStack>
            <HStack justify="space-between" w="full">
              <Text fontSize="sm" color="green.600">Network Fee:</Text>
              <Text fontSize="sm" fontWeight="semibold">{quote.networkFee} {quote.cryptoCurrency}</Text>
            </HStack>
          </VStack>
        </Box>
      )}

      {/* Setup Button */}
      <Button
        colorScheme="green"
        size="lg"
        onClick={handleSetupPayment}
        isLoading={isLoading}
        loadingText="Setting up..."
        isDisabled={!selectedProvider || !selectedMethod}
        leftIcon={<Icon as={FaCheck} />}
      >
        Complete Payment Setup
      </Button>

      {/* Security Notice */}
      <Box
        bg="blue.50"
        p={6}
        rounded="lg"
        border="1px solid"
        borderColor="blue.200"
      >
        <VStack spacing={3}>
          <Icon as={FaShieldAlt} color="blue.500" boxSize={6} />
          <Heading size="md" color="blue.800">
            Secure Payment Processing
          </Heading>
          <VStack spacing={2} align="start" w="full">
            <HStack>
              <Icon as={FaCheck} color="green.500" boxSize={4} />
              <Text fontSize="sm" color="blue.700">
                All payments are processed through regulated providers
              </Text>
            </HStack>
            <HStack>
              <Icon as={FaCheck} color="green.500" boxSize={4} />
              <Text fontSize="sm" color="blue.700">
                Bank-grade encryption for all financial data
              </Text>
            </HStack>
            <HStack>
              <Icon as={FaCheck} color="green.500" boxSize={4} />
              <Text fontSize="sm" color="blue.700">
                Compliance with local financial regulations
              </Text>
            </HStack>
            <HStack>
              <Icon as={FaCheck} color="green.500" boxSize={4} />
              <Text fontSize="sm" color="blue.700">
                24/7 fraud monitoring and protection
              </Text>
            </HStack>
          </VStack>
        </VStack>
      </Box>

      {/* Help Section */}
      <Box textAlign="center">
        <Text fontSize="sm" color="gray.500" mb={2}>
          Need help with payment setup?
        </Text>
        <Button variant="link" size="sm" colorScheme="purple" rightIcon={<Icon as={FaExternalLinkAlt} />}>
          View Payment Guide
        </Button>
      </Box>
    </VStack>
  );
}
