"use client";

import { useState } from "react";
import {
  VStack,
  HStack,
  Heading,
  Text,
  Box,
  Button,
  Icon,
  Input,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Alert,
  AlertIcon,
  PinInput,
  PinInputField,
  useColorModeValue,
  Divider,
} from "@chakra-ui/react";
import { FaEnvelope, FaCheck, FaRedo } from "react-icons/fa";
import { localizationService } from "../../../services/localizationService";

interface EmailVerificationStepProps {
  data: any;
  onComplete: (data: any) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export default function EmailVerificationStep({ 
  data, 
  onComplete, 
  isLoading, 
  setIsLoading 
}: EmailVerificationStepProps) {
  const [email, setEmail] = useState(data.email || '');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'email' | 'verification'>('email');
  const [emailError, setEmailError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const cardBg = useColorModeValue("white", "gray.800");
  const t = localizationService.t;

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const sendVerificationCode = async () => {
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setEmailError('');
    setIsLoading(true);

    try {
      // Simulate sending verification code
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setStep('verification');
      setResendCooldown(60);
      
      // Start cooldown timer
      const timer = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (error) {
      setEmailError('Failed to send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCode = async () => {
    if (verificationCode.length !== 6) {
      setCodeError('Please enter the complete 6-digit code');
      return;
    }

    setCodeError('');
    setIsLoading(true);

    try {
      // Simulate code verification
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock verification - accept any 6-digit code for demo
      if (verificationCode === '000000') {
        setCodeError('Invalid verification code. Please try again.');
        return;
      }

      // Complete the step
      onComplete({ 
        email: email,
        emailVerified: true,
        verificationMethod: 'email'
      });

    } catch (error) {
      setCodeError('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resendCode = async () => {
    if (resendCooldown > 0) return;
    
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setResendCooldown(60);
      
      const timer = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <VStack spacing={8} align="stretch">
      {/* Header */}
      <VStack spacing={4} textAlign="center">
        <Icon as={FaEnvelope} boxSize={12} color="blue.500" />
        <Heading size="lg" color="gray.800">
          {step === 'email' 
            ? t('onboarding.verifyEmail') 
            : t('onboarding.enterVerificationCode')
          }
        </Heading>
        <Text color="gray.600" maxW="2xl">
          {step === 'email'
            ? t('onboarding.emailDescription')
            : t('onboarding.codeDescription', { email })
          }
        </Text>
      </VStack>

      {step === 'email' ? (
        /* Email Input Step */
        <Box bg={cardBg} p={8} rounded="xl" border="1px solid" borderColor="gray.200">
          <VStack spacing={6}>
            <FormControl isInvalid={!!emailError}>
              <FormLabel>Email Address</FormLabel>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                size="lg"
                bg="white"
              />
              <FormErrorMessage>{emailError}</FormErrorMessage>
            </FormControl>

            <Button
              colorScheme="blue"
              size="lg"
              w="full"
              onClick={sendVerificationCode}
              isLoading={isLoading}
              loadingText="Sending Code..."
              leftIcon={<Icon as={FaEnvelope} />}
            >
              Send Verification Code
            </Button>
          </VStack>
        </Box>
      ) : (
        /* Verification Code Step */
        <VStack spacing={6}>
          <Box bg={cardBg} p={8} rounded="xl" border="1px solid" borderColor="gray.200">
            <VStack spacing={6}>
              <FormControl isInvalid={!!codeError}>
                <FormLabel textAlign="center">Enter 6-Digit Code</FormLabel>
                <HStack justify="center">
                  <PinInput
                    value={verificationCode}
                    onChange={setVerificationCode}
                    size="lg"
                    placeholder=""
                  >
                    <PinInputField />
                    <PinInputField />
                    <PinInputField />
                    <PinInputField />
                    <PinInputField />
                    <PinInputField />
                  </PinInput>
                </HStack>
                <FormErrorMessage textAlign="center">{codeError}</FormErrorMessage>
              </FormControl>

              <Button
                colorScheme="green"
                size="lg"
                w="full"
                onClick={verifyCode}
                isLoading={isLoading}
                loadingText="Verifying..."
                leftIcon={<Icon as={FaCheck} />}
              >
                Verify Email
              </Button>

              <Divider />

              <VStack spacing={3}>
                <Text fontSize="sm" color="gray.600" textAlign="center">
                  Didn't receive the code?
                </Text>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resendCode}
                  isDisabled={resendCooldown > 0}
                  leftIcon={<Icon as={FaRedo} />}
                >
                  {resendCooldown > 0 
                    ? `Resend in ${resendCooldown}s`
                    : 'Resend Code'
                  }
                </Button>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setStep('email')}
                  color="purple.500"
                >
                  Change Email Address
                </Button>
              </VStack>
            </VStack>
          </Box>
        </VStack>
      )}

      {/* Security Notice */}
      <Alert status="info" rounded="lg">
        <AlertIcon />
        <VStack align="start" spacing={1}>
          <Text fontWeight="bold" fontSize="sm">Security Notice</Text>
          <Text fontSize="sm">
            We'll use this email for account security, transaction notifications, 
            and important updates about your RWA investments.
          </Text>
        </VStack>
      </Alert>

      {/* Benefits */}
      <Box
        bg="green.50"
        p={6}
        rounded="lg"
        border="1px solid"
        borderColor="green.200"
      >
        <VStack spacing={3}>
          <Icon as={FaCheck} color="green.500" boxSize={6} />
          <Heading size="md" color="green.800">
            Email Verification Benefits
          </Heading>
          <VStack spacing={2} align="start" w="full">
            <HStack>
              <Icon as={FaCheck} color="green.500" boxSize={4} />
              <Text fontSize="sm" color="green.700">
                Enhanced account security and recovery options
              </Text>
            </HStack>
            <HStack>
              <Icon as={FaCheck} color="green.500" boxSize={4} />
              <Text fontSize="sm" color="green.700">
                Real-time notifications for transactions and opportunities
              </Text>
            </HStack>
            <HStack>
              <Icon as={FaCheck} color="green.500" boxSize={4} />
              <Text fontSize="sm" color="green.700">
                Access to exclusive investment updates and market insights
              </Text>
            </HStack>
            <HStack>
              <Icon as={FaCheck} color="green.500" boxSize={4} />
              <Text fontSize="sm" color="green.700">
                Compliance with regulatory requirements
              </Text>
            </HStack>
          </VStack>
        </VStack>
      </Box>
    </VStack>
  );
}
