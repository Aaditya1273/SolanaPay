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
  Select,
} from "@chakra-ui/react";
import { FaPhone, FaCheck, FaRedo, FaSms } from "react-icons/fa";
import { localizationService } from "../../../services/localizationService";

interface PhoneVerificationStepProps {
  data: any;
  onComplete: (data: any) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export default function PhoneVerificationStep({ 
  data, 
  onComplete, 
  isLoading, 
  setIsLoading 
}: PhoneVerificationStepProps) {
  const [countryCode, setCountryCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState(data.phone || '');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'phone' | 'verification'>('phone');
  const [phoneError, setPhoneError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const cardBg = useColorModeValue("white", "gray.800");
  const t = localizationService.t;

  const countryCodes = [
    { code: '+1', country: 'US/CA', flag: '🇺🇸' },
    { code: '+91', country: 'India', flag: '🇮🇳' },
    { code: '+254', country: 'Kenya', flag: '🇰🇪' },
    { code: '+55', country: 'Brazil', flag: '🇧🇷' },
    { code: '+44', country: 'UK', flag: '🇬🇧' },
    { code: '+49', country: 'Germany', flag: '🇩🇪' },
    { code: '+33', country: 'France', flag: '🇫🇷' },
    { code: '+86', country: 'China', flag: '🇨🇳' },
    { code: '+81', country: 'Japan', flag: '🇯🇵' },
    { code: '+82', country: 'S. Korea', flag: '🇰🇷' },
  ];

  const validatePhoneNumber = (phone: string) => {
    const phoneRegex = /^\d{7,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const sendVerificationCode = async () => {
    if (!validatePhoneNumber(phoneNumber)) {
      setPhoneError('Please enter a valid phone number');
      return;
    }

    setPhoneError('');
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
      setPhoneError('Failed to send verification code. Please try again.');
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
        phone: `${countryCode}${phoneNumber}`,
        phoneVerified: true,
        verificationMethod: 'sms'
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

  const formatPhoneDisplay = () => {
    return `${countryCode} ${phoneNumber}`;
  };

  return (
    <VStack spacing={8} align="stretch">
      {/* Header */}
      <VStack spacing={4} textAlign="center">
        <Icon as={FaPhone} boxSize={12} color="green.500" />
        <Heading size="lg" color="gray.800">
          {step === 'phone' 
            ? t('onboarding.verifyPhone') 
            : t('onboarding.enterSMSCode')
          }
        </Heading>
        <Text color="gray.600" maxW="2xl">
          {step === 'phone'
            ? t('onboarding.phoneDescription')
            : t('onboarding.smsCodeDescription', { phone: formatPhoneDisplay() })
          }
        </Text>
      </VStack>

      {step === 'phone' ? (
        /* Phone Input Step */
        <Box bg={cardBg} p={8} rounded="xl" border="1px solid" borderColor="gray.200">
          <VStack spacing={6}>
            <FormControl isInvalid={!!phoneError}>
              <FormLabel>Phone Number</FormLabel>
              <HStack>
                <Select 
                  value={countryCode} 
                  onChange={(e) => setCountryCode(e.target.value)}
                  w="140px"
                  bg="white"
                >
                  {countryCodes.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.flag} {country.code}
                    </option>
                  ))}
                </Select>
                <Input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter phone number"
                  size="lg"
                  bg="white"
                />
              </HStack>
              <FormErrorMessage>{phoneError}</FormErrorMessage>
            </FormControl>

            <Button
              colorScheme="green"
              size="lg"
              w="full"
              onClick={sendVerificationCode}
              isLoading={isLoading}
              loadingText="Sending Code..."
              leftIcon={<Icon as={FaSms} />}
            >
              Send SMS Code
            </Button>
          </VStack>
        </Box>
      ) : (
        /* Verification Code Step */
        <VStack spacing={6}>
          <Box bg={cardBg} p={8} rounded="xl" border="1px solid" borderColor="gray.200">
            <VStack spacing={6}>
              <FormControl isInvalid={!!codeError}>
                <FormLabel textAlign="center">Enter 6-Digit SMS Code</FormLabel>
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
                Verify Phone
              </Button>

              <Divider />

              <VStack spacing={3}>
                <Text fontSize="sm" color="gray.600" textAlign="center">
                  Didn't receive the SMS?
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
                    : 'Resend SMS'
                  }
                </Button>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setStep('phone')}
                  color="purple.500"
                >
                  Change Phone Number
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
          <Text fontWeight="bold" fontSize="sm">SMS Security</Text>
          <Text fontSize="sm">
            Your phone number will be used for two-factor authentication and 
            critical security alerts for your RWA investments.
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
            Phone Verification Benefits
          </Heading>
          <VStack spacing={2} align="start" w="full">
            <HStack>
              <Icon as={FaCheck} color="green.500" boxSize={4} />
              <Text fontSize="sm" color="green.700">
                Two-factor authentication for enhanced security
              </Text>
            </HStack>
            <HStack>
              <Icon as={FaCheck} color="green.500" boxSize={4} />
              <Text fontSize="sm" color="green.700">
                Instant alerts for suspicious account activity
              </Text>
            </HStack>
            <HStack>
              <Icon as={FaCheck} color="green.500" boxSize={4} />
              <Text fontSize="sm" color="green.700">
                SMS notifications for time-sensitive opportunities
              </Text>
            </HStack>
            <HStack>
              <Icon as={FaCheck} color="green.500" boxSize={4} />
              <Text fontSize="sm" color="green.700">
                Account recovery via SMS verification
              </Text>
            </HStack>
          </VStack>
        </VStack>
      </Box>

      {/* Regional Notice */}
      {data.region && (
        <Alert status="warning" rounded="lg">
          <AlertIcon />
          <VStack align="start" spacing={1}>
            <Text fontWeight="bold" fontSize="sm">Regional Compliance</Text>
            <Text fontSize="sm">
              Phone verification is required for compliance with {data.region} regulations 
              and to access region-specific payment methods.
            </Text>
          </VStack>
        </Alert>
      )}
    </VStack>
  );
}
