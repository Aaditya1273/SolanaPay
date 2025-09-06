"use client";

import React from "react";
import { useState, useEffect } from "react";
import {
  Box,
  Container,
  VStack,
  HStack,
  Progress,
  Text,
  Button,
  Icon,
  useColorModeValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  useDisclosure,
  Fade,
  ScaleFade,
  Spinner,
} from "@chakra-ui/react";
import { FaArrowLeft, FaArrowRight, FaCheck, FaTimes } from "react-icons/fa";
import { paymentService } from "../../services/paymentService";
import { localizationService } from "../../services/localizationService";
import { kycService } from "../../services/kycService";

// Import step components
import WelcomeStep from "./steps/WelcomeStep";
import RegionSelectionStep from "./steps/RegionSelectionStep";
import WalletSetupStep from "./steps/WalletSetupStep";
import EmailVerificationStep from "./steps/EmailVerificationStep";
import PhoneVerificationStep from "./steps/PhoneVerificationStep";
import IdentityVerificationStep from "./steps/IdentityVerificationStep";
import PaymentSetupStep from "./steps/PaymentSetupStep";
import CompletionStep from "./steps/CompletionStep";

interface OnboardingData {
  region?: string;
  locale?: string;
  walletAddress?: string;
  email?: string;
  phone?: string;
  kycLevel?: number;
  paymentMethod?: string;
  completedSteps: string[];
}

interface OnboardingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: OnboardingData) => void;
}

export default function OnboardingFlow({ isOpen, onClose, onComplete }: OnboardingFlowProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    completedSteps: []
  });
  const [steps, setSteps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [canProceed, setCanProceed] = useState(false);
  const [initLoading, setInitLoading] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const bgGradient = useColorModeValue(
    "linear(to-br, blue.50, purple.50)",
    "linear(to-br, gray.900, purple.900)"
  );

  // Initialize onboarding steps based on detected region
  useEffect(() => {
    const initializeSteps = async () => {
      setInitLoading(true);
      setInitError(null);
      try {
        // Timeout wrapper to avoid hanging on external IP API
        const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> => {
          return new Promise<T>((resolve, reject) => {
            const id = setTimeout(() => reject(new Error("region_detect_timeout")), ms);
            p.then(
              (res) => {
                clearTimeout(id);
                resolve(res);
              },
              (err) => {
                clearTimeout(id);
                reject(err);
              }
            );
          });
        };

        // Detect user's region (fallback to US on error/timeout)
        let detectedRegion = 'US';
        try {
          detectedRegion = await withTimeout(paymentService.detectUserRegion(), 3500);
        } catch (e) {
          console.warn('[Onboarding] Region detection failed, defaulting to US:', e);
          detectedRegion = 'US';
        }

        const browserLocale = localizationService.detectBrowserLocale();
        // Set initial locale
        localizationService.setLocale(browserLocale);

        // Get region-specific onboarding steps
        const regionSteps = paymentService.getOnboardingSteps(detectedRegion);

        setSteps(regionSteps);
        setOnboardingData(prev => ({
          ...prev,
          region: detectedRegion,
          locale: browserLocale
        }));
        setCurrentStepIndex(0);
        console.debug('[Onboarding] Initialized', { detectedRegion, browserLocale, steps: regionSteps.map(s => s.id) });
      } catch (err: any) {
        console.error('[Onboarding] Initialization error:', err);
        setInitError('Failed to initialize onboarding. Using default settings.');
        // Safe defaults
        const fallbackRegion = 'US';
        const browserLocale = 'en';
        localizationService.setLocale(browserLocale);
        setSteps(paymentService.getOnboardingSteps(fallbackRegion));
        setOnboardingData(prev => ({ ...prev, region: fallbackRegion, locale: browserLocale }));
        setCurrentStepIndex(0);
        console.debug('[Onboarding] Fallback initialization with defaults');
      } finally {
        setInitLoading(false);
      }
    };

    if (isOpen) {
      initializeSteps();
    } else {
      // Reset when modal closes
      setSteps([]);
      setCurrentStepIndex(0);
      setCanProceed(false);
      setInitError(null);
      console.debug('[Onboarding] Modal closed, state reset');
    }
  }, [isOpen]);

  const stepComponents = {
    WelcomeStep,
    RegionSelectionStep,
    WalletSetupStep,
    EmailVerificationStep,
    PhoneVerificationStep,
    IdentityVerificationStep,
    PaymentSetupStep,
    CompletionStep,
  };

  const currentStep = steps[currentStepIndex];
  const CurrentStepComponent = currentStep ? stepComponents[currentStep.component as keyof typeof stepComponents] : null;

  const handleStepComplete = (stepData: any) => {
    const newCompleted = Array.from(new Set([...(onboardingData.completedSteps || []), currentStep.id]));
    const updatedData = {
      ...onboardingData,
      ...stepData,
      completedSteps: newCompleted
    };
    
    setOnboardingData(updatedData);
    setCanProceed(true);
    console.debug('[Onboarding] Step completed', { stepId: currentStep.id, stepData, newCompleted });

    // Auto-advance for certain steps
    if (currentStep.id === 'welcome' || currentStep.id === 'completion') {
      setTimeout(() => handleNext(), 1500);
    }
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
      setCanProceed(false);
      console.debug('[Onboarding] Next step', { from: currentStep?.id, to: steps[currentStepIndex + 1]?.id });
    } else {
      // Onboarding complete
      console.debug('[Onboarding] Completed', { data: onboardingData });
      onComplete(onboardingData);
      onClose();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
      setCanProceed(true); // Allow going back
       console.debug('[Onboarding] Back', { to: steps[currentStepIndex - 1]?.id });
    }
  };

  const handleSkip = () => {
    if (!currentStep.required) {
      handleNext();
    }
  };

  const handleRegionChange = async (newRegion: string) => {
    // Update steps based on new region
    const regionSteps = paymentService.getOnboardingSteps(newRegion);
    setSteps(regionSteps);
    
    // Update locale based on region
    const regionConfig = paymentService.getRegionConfig(newRegion);
    if (regionConfig) {
      localizationService.setLocale(regionConfig.language);
    }
    
    setOnboardingData(prev => ({
      ...prev,
      region: newRegion,
      locale: regionConfig?.language || 'en'
    }));
    // After region change, move to the next logical step if currently on region selection
    if (currentStep?.id === 'region_selection') {
      setCanProceed(true);
    }
    console.debug('[Onboarding] Region changed', { newRegion, language: regionConfig?.language, steps: regionSteps.map(s => s.id) });
  };

  const progressPercentage = steps.length > 0 ? ((currentStepIndex + 1) / steps.length) * 100 : 0;
  const t = localizationService.t;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size="4xl" 
      closeOnOverlayClick={false}
      closeOnEsc={false}
    >
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(10px)" />
      <ModalContent maxW="900px" maxH="90vh" bg="transparent" shadow="none">
        <ModalBody p={0}>
          <Box
            bg={bgGradient}
            rounded="2xl"
            shadow="2xl"
            border="1px solid"
            borderColor="whiteAlpha.200"
            overflow="hidden"
          >
            {/* Header with Progress */}
            <Box bg="white" p={6} borderBottom="1px solid" borderColor="gray.200">
              <VStack spacing={4}>
                <HStack justify="space-between" w="full">
                  <VStack align="start" spacing={1}>
                    <Text fontSize="2xl" fontWeight="bold" color="gray.800">
                      {currentStep ? (t(currentStep.title) || currentStep.title) : t('onboarding.title')}
                    </Text>
                    <Text color="gray.600">
                      {steps.length > 0 ? t('onboarding.step', { current: currentStepIndex + 1, total: steps.length }) : ''}
                    </Text>
                  </VStack>
                  
                  <VStack align="end" spacing={1}>
                    <Text fontSize="sm" color="gray.500">
                      {currentStep ? t('onboarding.estimatedTime', { time: currentStep.estimatedTime }) : ''}
                    </Text>
                    {currentStep?.required ? (
                      <Text fontSize="xs" color="red.500" fontWeight="bold">
                        {t('onboarding.required')}
                      </Text>
                    ) : (
                      <Text fontSize="xs" color="gray.500">
                        {t('onboarding.optional')}
                      </Text>
                    )}
                  </VStack>
                </HStack>

                {/* Progress Bar */}
                <Box w="full">
                  <Progress
                    value={progressPercentage}
                    colorScheme="purple"
                    size="lg"
                    rounded="full"
                    bg="gray.100"
                  />
                  <HStack justify="space-between" mt={2}>
                    <Text fontSize="xs" color="gray.500">
                      {Math.round(progressPercentage)}% {t('common.completed')}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {steps.length - currentStepIndex - 1} {t('common.remaining')}
                    </Text>
                  </HStack>
                </Box>
              </VStack>
            </Box>

            {/* Step Content */}
            <Box p={8} minH="400px">
              {initLoading || !currentStep || !CurrentStepComponent ? (
                <VStack spacing={4} align="center" justify="center" minH="300px">
                  <Spinner size="xl" color="purple.500" thickness="4px" speed="0.7s" />
                  <Text color="gray.600">{initError ? initError : t('common.loading')}</Text>
                  <Text fontSize="sm" color="gray.500">Preparing your localized onboarding...</Text>
                </VStack>
              ) : (
                <ScaleFade in={true} initialScale={0.9}>
                  <CurrentStepComponent
                    data={onboardingData}
                    onComplete={handleStepComplete}
                    onRegionChange={handleRegionChange}
                    isLoading={isLoading}
                    setIsLoading={setIsLoading}
                  />
                </ScaleFade>
              )}
            </Box>

            {/* Footer with Navigation */}
            <Box bg="white" p={6} borderTop="1px solid" borderColor="gray.200">
              <HStack justify="space-between">
                <Button
                  leftIcon={<Icon as={FaArrowLeft} />}
                  variant="outline"
                  onClick={handleBack}
                  isDisabled={currentStepIndex === 0 || initLoading || !currentStep}
                >
                  {t('common.back')}
                </Button>

                <HStack spacing={3}>
                  {currentStep && !currentStep.required && (
                    <Button
                      variant="ghost"
                      onClick={handleSkip}
                      color="gray.600"
                    >
                      {t('onboarding.skipForNow')}
                    </Button>
                  )}
                  
                  <Button
                    rightIcon={<Icon as={currentStepIndex === steps.length - 1 ? FaCheck : FaArrowRight} />}
                    colorScheme="purple"
                    onClick={handleNext}
                    isDisabled={(currentStep?.required && !canProceed) || initLoading || !currentStep}
                    isLoading={isLoading}
                    loadingText={t('common.processing')}
                  >
                    {currentStepIndex === steps.length - 1 
                      ? t('common.complete') 
                      : t('common.continue')
                    }
                  </Button>
                </HStack>
              </HStack>
            </Box>
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

