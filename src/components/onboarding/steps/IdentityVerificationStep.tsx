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
  useColorModeValue,
  SimpleGrid,
  Image,
  Progress,
  Badge,
  Select,
  Textarea,
} from "@chakra-ui/react";
import { 
  FaIdCard, 
  FaUpload, 
  FaCheck, 
  FaCamera, 
  FaFileImage,
  FaExclamationTriangle,
  FaShieldAlt
} from "react-icons/fa";
import { localizationService } from "../../../services/localizationService";
import { kycService } from "../../../services/kycService";

interface IdentityVerificationStepProps {
  data: any;
  onComplete: (data: any) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export default function IdentityVerificationStep({ 
  data, 
  onComplete, 
  isLoading, 
  setIsLoading 
}: IdentityVerificationStepProps) {
  const [currentStep, setCurrentStep] = useState<'level' | 'documents' | 'processing'>('level');
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [personalInfo, setPersonalInfo] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    address: '',
    city: '',
    postalCode: '',
    country: data.region || ''
  });
  const [errors, setErrors] = useState<any>({});

  const cardBg = useColorModeValue("white", "gray.800");
  const t = localizationService.t;

  // Get KYC levels for user's region
  const regionConfig = kycService.getRegionConfig(data.region);
  const kycLevels = regionConfig?.kycLevels || [];

  const handleLevelSelect = (level: number) => {
    setSelectedLevel(level);
    setCurrentStep('documents');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      // Simulate file upload and processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newDoc = {
        type: docType,
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        status: 'uploaded'
      };

      setUploadedDocuments(prev => [...prev, newDoc]);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const validatePersonalInfo = () => {
    const newErrors: any = {};
    
    if (!personalInfo.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!personalInfo.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!personalInfo.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    if (!personalInfo.address.trim()) newErrors.address = 'Address is required';
    if (!personalInfo.city.trim()) newErrors.city = 'City is required';
    if (!personalInfo.postalCode.trim()) newErrors.postalCode = 'Postal code is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submitKYC = async () => {
    if (!validatePersonalInfo()) return;

    setIsLoading(true);
    setCurrentStep('processing');

    try {
      // Simulate KYC processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      const kycData = {
        kycLevel: selectedLevel,
        personalInfo,
        documents: uploadedDocuments,
        region: data.region,
        status: 'pending',
        submittedAt: new Date().toISOString()
      };

      // Complete the step
      onComplete({
        ...kycData,
        kycCompleted: true,
        identityVerified: true
      });

    } catch (error) {
      console.error('KYC submission error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedLevelConfig = kycLevels.find(level => level.level === selectedLevel);
  const requiredDocs = selectedLevelConfig?.documents || [];

  return (
    <VStack spacing={8} align="stretch">
      {/* Header */}
      <VStack spacing={4} textAlign="center">
        <Icon as={FaIdCard} boxSize={12} color="orange.500" />
        <Heading size="lg" color="gray.800">
          {t('onboarding.identityVerification')}
        </Heading>
        <Text color="gray.600" maxW="2xl">
          {t('onboarding.kycDescription')}
        </Text>
      </VStack>

      {/* Progress Indicator */}
      <Box>
        <Progress 
          value={currentStep === 'level' ? 33 : currentStep === 'documents' ? 66 : 100} 
          colorScheme="orange" 
          rounded="full"
        />
        <HStack justify="space-between" mt={2}>
          <Text fontSize="xs" color="gray.500">Select Level</Text>
          <Text fontSize="xs" color="gray.500">Upload Documents</Text>
          <Text fontSize="xs" color="gray.500">Processing</Text>
        </HStack>
      </Box>

      {currentStep === 'level' && (
        /* KYC Level Selection */
        <VStack spacing={6}>
          <Text textAlign="center" color="gray.600">
            Choose your verification level based on your investment needs:
          </Text>
          
          <SimpleGrid columns={{ base: 1, md: kycLevels.length > 2 ? 3 : 2 }} spacing={6}>
            {kycLevels.map((level) => (
              <Box
                key={level.level}
                bg={cardBg}
                p={6}
                rounded="xl"
                border="2px solid"
                borderColor={selectedLevel === level.level ? "orange.500" : "gray.200"}
                cursor="pointer"
                onClick={() => setSelectedLevel(level.level)}
                _hover={{ borderColor: "orange.300", shadow: "lg" }}
                transition="all 0.2s"
                position="relative"
              >
                {selectedLevel === level.level && (
                  <Badge
                    position="absolute"
                    top={3}
                    right={3}
                    colorScheme="orange"
                    variant="solid"
                  >
                    Selected
                  </Badge>
                )}

                <VStack spacing={4} align="start">
                  <HStack>
                    <Text fontSize="2xl">
                      {level.level === 1 ? '🥉' : level.level === 2 ? '🥈' : '🥇'}
                    </Text>
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="bold" fontSize="lg">
                        Level {level.level}
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        {level.name}
                      </Text>
                    </VStack>
                  </HStack>

                  <Text fontSize="sm" color="gray.600">
                    {level.description}
                  </Text>

                  <Box>
                    <Text fontSize="sm" fontWeight="semibold" mb={2}>
                      Investment Limits:
                    </Text>
                    <Text fontSize="sm" color="green.600" fontWeight="bold">
                      Up to ${level.limits.daily.toLocaleString()}/day
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      ${level.limits.monthly.toLocaleString()}/month
                    </Text>
                  </Box>

                  <Box>
                    <Text fontSize="sm" fontWeight="semibold" mb={2}>
                      Required Documents:
                    </Text>
                    <VStack align="start" spacing={1}>
                      {level.documents.slice(0, 3).map((doc) => (
                        <HStack key={doc} spacing={2}>
                          <Icon as={FaCheck} color="green.500" boxSize={3} />
                          <Text fontSize="xs" color="gray.600">{doc}</Text>
                        </HStack>
                      ))}
                      {level.documents.length > 3 && (
                        <Text fontSize="xs" color="gray.500">
                          +{level.documents.length - 3} more
                        </Text>
                      )}
                    </VStack>
                  </Box>

                  <Button
                    colorScheme="orange"
                    size="sm"
                    w="full"
                    onClick={() => handleLevelSelect(level.level)}
                  >
                    Select Level {level.level}
                  </Button>
                </VStack>
              </Box>
            ))}
          </SimpleGrid>
        </VStack>
      )}

      {currentStep === 'documents' && (
        /* Document Upload */
        <VStack spacing={6}>
          <Alert status="info" rounded="lg">
            <AlertIcon />
            <VStack align="start" spacing={1}>
              <Text fontWeight="bold" fontSize="sm">
                Level {selectedLevel} Verification
              </Text>
              <Text fontSize="sm">
                Please provide the following documents for verification:
              </Text>
            </VStack>
          </Alert>

          {/* Personal Information Form */}
          <Box bg={cardBg} p={6} rounded="xl" border="1px solid" borderColor="gray.200">
            <Heading size="md" mb={4}>Personal Information</Heading>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <FormControl isInvalid={!!errors.firstName}>
                <FormLabel>First Name</FormLabel>
                <Input
                  value={personalInfo.firstName}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, firstName: e.target.value }))}
                  bg="white"
                />
                <FormErrorMessage>{errors.firstName}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.lastName}>
                <FormLabel>Last Name</FormLabel>
                <Input
                  value={personalInfo.lastName}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, lastName: e.target.value }))}
                  bg="white"
                />
                <FormErrorMessage>{errors.lastName}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.dateOfBirth}>
                <FormLabel>Date of Birth</FormLabel>
                <Input
                  type="date"
                  value={personalInfo.dateOfBirth}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                  bg="white"
                />
                <FormErrorMessage>{errors.dateOfBirth}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.country}>
                <FormLabel>Country</FormLabel>
                <Select
                  value={personalInfo.country}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, country: e.target.value }))}
                  bg="white"
                >
                  <option value="US">United States</option>
                  <option value="IN">India</option>
                  <option value="KE">Kenya</option>
                  <option value="BR">Brazil</option>
                  <option value="EU">European Union</option>
                  <option value="UK">United Kingdom</option>
                </Select>
                <FormErrorMessage>{errors.country}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.address} gridColumn={{ md: "span 2" }}>
                <FormLabel>Address</FormLabel>
                <Textarea
                  value={personalInfo.address}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, address: e.target.value }))}
                  bg="white"
                />
                <FormErrorMessage>{errors.address}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.city}>
                <FormLabel>City</FormLabel>
                <Input
                  value={personalInfo.city}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, city: e.target.value }))}
                  bg="white"
                />
                <FormErrorMessage>{errors.city}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.postalCode}>
                <FormLabel>Postal Code</FormLabel>
                <Input
                  value={personalInfo.postalCode}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, postalCode: e.target.value }))}
                  bg="white"
                />
                <FormErrorMessage>{errors.postalCode}</FormErrorMessage>
              </FormControl>
            </SimpleGrid>
          </Box>

          {/* Document Upload */}
          <Box bg={cardBg} p={6} rounded="xl" border="1px solid" borderColor="gray.200">
            <Heading size="md" mb={4}>Required Documents</Heading>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              {requiredDocs.map((docType) => (
                <Box key={docType} p={4} border="1px dashed" borderColor="gray.300" rounded="lg">
                  <VStack spacing={3}>
                    <Icon as={FaFileImage} color="gray.400" boxSize={8} />
                    <Text fontWeight="semibold" textAlign="center">{docType}</Text>
                    
                    {uploadedDocuments.find(doc => doc.type === docType) ? (
                      <VStack spacing={2}>
                        <Icon as={FaCheck} color="green.500" boxSize={6} />
                        <Text fontSize="sm" color="green.600" textAlign="center">
                          Uploaded successfully
                        </Text>
                      </VStack>
                    ) : (
                      <Button
                        as="label"
                        size="sm"
                        leftIcon={<Icon as={FaUpload} />}
                        cursor="pointer"
                      >
                        Upload {docType}
                        <Input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileUpload(e, docType)}
                          display="none"
                        />
                      </Button>
                    )}
                  </VStack>
                </Box>
              ))}
            </SimpleGrid>
          </Box>

          <Button
            colorScheme="orange"
            size="lg"
            w="full"
            onClick={submitKYC}
            isLoading={isLoading}
            loadingText="Submitting..."
            leftIcon={<Icon as={FaCheck} />}
            isDisabled={uploadedDocuments.length !== requiredDocs.length}
          >
            Submit for Verification
          </Button>
        </VStack>
      )}

      {currentStep === 'processing' && (
        /* Processing Status */
        <VStack spacing={6}>
          <Box bg={cardBg} p={8} rounded="xl" border="1px solid" borderColor="gray.200" textAlign="center">
            <VStack spacing={6}>
              <Icon as={FaShieldAlt} color="orange.500" boxSize={16} />
              <Heading size="lg" color="gray.800">
                Verification in Progress
              </Heading>
              <Text color="gray.600" maxW="md">
                Your documents are being reviewed by our compliance team. 
                This process typically takes 1-3 business days.
              </Text>
              
              <Box w="full" maxW="md">
                <Progress size="lg" colorScheme="orange" isIndeterminate rounded="full" />
                <Text fontSize="sm" color="gray.500" mt={2}>
                  Processing your Level {selectedLevel} verification...
                </Text>
              </Box>

              <Alert status="success" rounded="lg">
                <AlertIcon />
                <VStack align="start" spacing={1}>
                  <Text fontWeight="bold" fontSize="sm">Submission Successful</Text>
                  <Text fontSize="sm">
                    You'll receive an email notification once verification is complete.
                  </Text>
                </VStack>
              </Alert>
            </VStack>
          </Box>
        </VStack>
      )}

      {/* Security Notice */}
      <Alert status="warning" rounded="lg">
        <AlertIcon />
        <VStack align="start" spacing={1}>
          <Text fontWeight="bold" fontSize="sm">Data Security</Text>
          <Text fontSize="sm">
            All personal information and documents are encrypted and stored securely. 
            We comply with {data.region} data protection regulations.
          </Text>
        </VStack>
      </Alert>
    </VStack>
  );
}
