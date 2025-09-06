"use client";

import { useEffect } from "react";
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
  Badge,
  Confetti,
} from "@chakra-ui/react";
import {
  FaCheckCircle,
  FaRocket,
  FaChartLine,
  FaUsers,
  FaShieldAlt,
  FaGift,
  FaArrowRight,
} from "react-icons/fa";
import { localizationService } from "../../../services/localizationService";

interface CompletionStepProps {
  data: any;
  onComplete: (data: any) => void;
}

export default function CompletionStep({ data, onComplete }: CompletionStepProps) {
  const cardBg = useColorModeValue("white", "gray.800");
  const t = localizationService.t;

  useEffect(() => {
    // Auto-complete after showing success
    const timer = setTimeout(() => {
      onComplete({ onboardingCompleted: true });
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const completedFeatures = [
    {
      icon: FaCheckCircle,
      title: "Account Verified",
      description: `${data.region} compliance completed`,
      color: "green"
    },
    {
      icon: FaShieldAlt,
      title: "Wallet Connected",
      description: `${data.walletType || 'Wallet'} successfully linked`,
      color: "blue"
    },
    {
      icon: FaRocket,
      title: "Payment Ready",
      description: `${data.paymentProvider || 'Payment'} method configured`,
      color: "purple"
    }
  ];

  const nextSteps = [
    {
      icon: FaChartLine,
      title: "Explore RWA Assets",
      description: "Browse our curated selection of real-world assets",
      action: "Browse Assets",
      color: "blue"
    },
    {
      icon: FaUsers,
      title: "Join Governance",
      description: "Participate in asset management decisions",
      action: "View Proposals",
      color: "purple"
    },
    {
      icon: FaGift,
      title: "Claim Welcome Bonus",
      description: "Get $10 USDC to start your RWA journey",
      action: "Claim Bonus",
      color: "green"
    }
  ];

  return (
    <VStack spacing={8} align="stretch" textAlign="center">
      {/* Success Header */}
      <VStack spacing={6}>
        <Box position="relative">
          <Icon as={FaCheckCircle} boxSize={20} color="green.500" />
          {/* Confetti effect would go here */}
        </Box>
        
        <VStack spacing={2}>
          <Heading
            size="2xl"
            bgGradient="linear(to-r, green.400, blue.400)"
            bgClip="text"
            fontWeight="extrabold"
          >
            Welcome to OmniFlow!
          </Heading>
          <Text fontSize="xl" color="gray.600">
            Your account is ready for RWA investments
          </Text>
        </VStack>

        <Badge colorScheme="green" variant="solid" fontSize="md" px={4} py={2} rounded="full">
          ✨ Onboarding Complete ✨
        </Badge>
      </VStack>

      {/* Completion Summary */}
      <Box
        bg="gradient-to-r from-green-500 to-blue-500"
        p={8}
        rounded="xl"
        color="white"
      >
        <VStack spacing={6}>
          <Heading size="lg">Setup Summary</Heading>
          
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} w="full">
            {completedFeatures.map((feature, index) => (
              <VStack key={index} spacing={3}>
                <Box
                  p={3}
                  rounded="full"
                  bg="whiteAlpha.200"
                  backdropFilter="blur(10px)"
                >
                  <Icon as={feature.icon} boxSize={8} />
                </Box>
                <VStack spacing={1}>
                  <Text fontWeight="bold" fontSize="lg">
                    {feature.title}
                  </Text>
                  <Text fontSize="sm" opacity={0.9}>
                    {feature.description}
                  </Text>
                </VStack>
              </VStack>
            ))}
          </SimpleGrid>
        </VStack>
      </Box>

      {/* Account Details */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
        <Box bg={cardBg} p={6} rounded="xl" border="1px solid" borderColor="gray.200">
          <VStack spacing={4}>
            <Heading size="md" color="gray.800">Account Details</Heading>
            <VStack spacing={2} align="start" w="full">
              <HStack justify="space-between" w="full">
                <Text fontSize="sm" color="gray.600">Region:</Text>
                <Badge colorScheme="blue">{data.region}</Badge>
              </HStack>
              <HStack justify="space-between" w="full">
                <Text fontSize="sm" color="gray.600">KYC Level:</Text>
                <Badge colorScheme="orange">Level {data.kycLevel || 1}</Badge>
              </HStack>
              <HStack justify="space-between" w="full">
                <Text fontSize="sm" color="gray.600">Wallet:</Text>
                <Text fontSize="sm" fontWeight="semibold">
                  {data.walletAddress ? 
                    `${data.walletAddress.slice(0, 6)}...${data.walletAddress.slice(-4)}` : 
                    'Connected'
                  }
                </Text>
              </HStack>
              <HStack justify="space-between" w="full">
                <Text fontSize="sm" color="gray.600">Payment:</Text>
                <Badge colorScheme="green">Ready</Badge>
              </HStack>
            </VStack>
          </VStack>
        </Box>

        <Box bg={cardBg} p={6} rounded="xl" border="1px solid" borderColor="gray.200">
          <VStack spacing={4}>
            <Heading size="md" color="gray.800">Investment Limits</Heading>
            <VStack spacing={2} align="start" w="full">
              <HStack justify="space-between" w="full">
                <Text fontSize="sm" color="gray.600">Daily Limit:</Text>
                <Text fontSize="sm" fontWeight="semibold" color="green.600">
                  ${data.kycLevel === 3 ? '100,000' : data.kycLevel === 2 ? '10,000' : '1,000'}
                </Text>
              </HStack>
              <HStack justify="space-between" w="full">
                <Text fontSize="sm" color="gray.600">Monthly Limit:</Text>
                <Text fontSize="sm" fontWeight="semibold" color="green.600">
                  ${data.kycLevel === 3 ? '1,000,000' : data.kycLevel === 2 ? '100,000' : '10,000'}
                </Text>
              </HStack>
              <HStack justify="space-between" w="full">
                <Text fontSize="sm" color="gray.600">Min Investment:</Text>
                <Text fontSize="sm" fontWeight="semibold">$10</Text>
              </HStack>
              <HStack justify="space-between" w="full">
                <Text fontSize="sm" color="gray.600">Available Assets:</Text>
                <Text fontSize="sm" fontWeight="semibold">150+</Text>
              </HStack>
            </VStack>
          </VStack>
        </Box>
      </SimpleGrid>

      {/* Next Steps */}
      <VStack spacing={6}>
        <Heading size="lg" color="gray.800">What's Next?</Heading>
        
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
          {nextSteps.map((step, index) => (
            <Box
              key={index}
              bg={cardBg}
              p={6}
              rounded="xl"
              border="1px solid"
              borderColor="gray.200"
              _hover={{ shadow: "lg", transform: "translateY(-2px)" }}
              transition="all 0.2s"
            >
              <VStack spacing={4}>
                <Box
                  p={3}
                  rounded="full"
                  bg={`${step.color}.100`}
                  color={`${step.color}.600`}
                >
                  <Icon as={step.icon} boxSize={6} />
                </Box>
                
                <VStack spacing={2}>
                  <Heading size="md" color="gray.800">
                    {step.title}
                  </Heading>
                  <Text fontSize="sm" color="gray.600" textAlign="center">
                    {step.description}
                  </Text>
                </VStack>

                <Button
                  colorScheme={step.color}
                  size="sm"
                  rightIcon={<Icon as={FaArrowRight} />}
                >
                  {step.action}
                </Button>
              </VStack>
            </Box>
          ))}
        </SimpleGrid>
      </VStack>

      {/* Welcome Bonus */}
      <Box
        bg="gradient-to-r from-yellow-400 to-orange-500"
        p={8}
        rounded="xl"
        color="white"
        textAlign="center"
      >
        <VStack spacing={4}>
          <Icon as={FaGift} boxSize={12} />
          <Heading size="lg">Welcome Bonus Available!</Heading>
          <Text fontSize="lg">
            Claim your $10 USDC welcome bonus to start investing in RWAs
          </Text>
          <Button
            size="lg"
            bg="white"
            color="orange.500"
            _hover={{ bg: "gray.100" }}
            rightIcon={<Icon as={FaArrowRight} />}
          >
            Claim $10 USDC
          </Button>
        </VStack>
      </Box>

      {/* Support */}
      <Box textAlign="center">
        <Text fontSize="sm" color="gray.500" mb={2}>
          Need help getting started?
        </Text>
        <HStack justify="center" spacing={4}>
          <Button variant="link" size="sm" colorScheme="purple">
            View Tutorial
          </Button>
          <Button variant="link" size="sm" colorScheme="purple">
            Contact Support
          </Button>
          <Button variant="link" size="sm" colorScheme="purple">
            Join Community
          </Button>
        </HStack>
      </Box>
    </VStack>
  );
}
