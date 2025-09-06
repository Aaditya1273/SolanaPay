'use client';

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  Select,
  Checkbox,
  CheckboxGroup,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  FormControl,
  FormLabel,
  FormHelperText,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Textarea,
  SimpleGrid,
  Card,
  CardBody,
  Badge,
  Progress,
  useToast,
  Divider,
  Icon,
} from '@chakra-ui/react';
import { FiUser, FiTarget, FiTrendingUp, FiMapPin, FiDollarSign, FiShield } from 'react-icons/fi';
import { InvestorProfile, InvestorPreferences, RiskProfile, Demographics, BehaviorMetrics, AssetType } from '../../services/aiMatchingService';

interface InvestorProfileFormProps {
  profile?: InvestorProfile;
  onSave: (profile: Partial<InvestorProfile>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const ASSET_TYPES: { value: AssetType; label: string; description: string }[] = [
  { value: 'real_estate', label: 'Real Estate', description: 'Physical properties and REITs' },
  { value: 'carbon_credits', label: 'Carbon Credits', description: 'Environmental sustainability assets' },
  { value: 'precious_metals', label: 'Precious Metals', description: 'Gold, silver, platinum investments' },
  { value: 'commodities', label: 'Commodities', description: 'Oil, gas, agricultural products' },
  { value: 'renewable_energy', label: 'Renewable Energy', description: 'Solar, wind, hydroelectric projects' },
  { value: 'infrastructure', label: 'Infrastructure', description: 'Transportation, utilities, facilities' },
  { value: 'art_collectibles', label: 'Art & Collectibles', description: 'Fine art, rare items, collectibles' },
  { value: 'bonds', label: 'Bonds', description: 'Government and corporate bonds' },
];

const GEOGRAPHIC_REGIONS = [
  'North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East', 'Africa'
];

const COUNTRIES = [
  'United States', 'United Kingdom', 'Germany', 'France', 'Japan', 'Singapore', 
  'Australia', 'Canada', 'Switzerland', 'Netherlands', 'Hong Kong', 'Sweden'
];

export default function InvestorProfileForm({ profile, onSave, onCancel, isLoading }: InvestorProfileFormProps) {
  const toast = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  
  // Form state
  const [formData, setFormData] = useState<Partial<InvestorProfile>>({
    name: profile?.name || '',
    email: profile?.email || '',
    preferences: {
      assetTypes: profile?.preferences?.assetTypes || [],
      geographicPreferences: profile?.preferences?.geographicPreferences || [],
      investmentAmount: {
        min: profile?.preferences?.investmentAmount?.min || 10000,
        max: profile?.preferences?.investmentAmount?.max || 1000000,
        preferred: profile?.preferences?.investmentAmount?.preferred || 100000,
      },
      timeHorizon: profile?.preferences?.timeHorizon || 'medium',
      liquidityPreference: profile?.preferences?.liquidityPreference || 'medium',
      sustainabilityFocus: profile?.preferences?.sustainabilityFocus || false,
      technologyAdoption: profile?.preferences?.technologyAdoption || 'moderate',
      diversificationGoals: profile?.preferences?.diversificationGoals || [],
      excludedSectors: profile?.preferences?.excludedSectors || [],
    },
    riskProfile: {
      riskTolerance: profile?.riskProfile?.riskTolerance || 'moderate',
      riskScore: profile?.riskProfile?.riskScore || 50,
      volatilityTolerance: profile?.riskProfile?.volatilityTolerance || 50,
      maxDrawdown: profile?.riskProfile?.maxDrawdown || 20,
      riskFactors: {
        marketRisk: profile?.riskProfile?.riskFactors?.marketRisk || 50,
        creditRisk: profile?.riskProfile?.riskFactors?.creditRisk || 50,
        liquidityRisk: profile?.riskProfile?.riskFactors?.liquidityRisk || 50,
        operationalRisk: profile?.riskProfile?.riskFactors?.operationalRisk || 50,
        regulatoryRisk: profile?.riskProfile?.riskFactors?.regulatoryRisk || 50,
      },
    },
    demographics: {
      age: profile?.demographics?.age || 35,
      ageRange: profile?.demographics?.ageRange || '30-39',
      location: {
        country: profile?.demographics?.location?.country || 'United States',
        region: profile?.demographics?.location?.region || 'North America',
        city: profile?.demographics?.location?.city || '',
      },
      occupation: profile?.demographics?.occupation || '',
      incomeRange: profile?.demographics?.incomeRange || '$100k-$250k',
      netWorth: profile?.demographics?.netWorth || '$500k-$1M',
      investmentExperience: profile?.demographics?.investmentExperience || 'intermediate',
    },
    behaviorMetrics: {
      activityLevel: profile?.behaviorMetrics?.activityLevel || 50,
      decisionSpeed: profile?.behaviorMetrics?.decisionSpeed || 'moderate',
      researchDepth: profile?.behaviorMetrics?.researchDepth || 'moderate',
      socialInfluence: profile?.behaviorMetrics?.socialInfluence || 50,
      contrarian: profile?.behaviorMetrics?.contrarian || false,
      portfolioTurnover: profile?.behaviorMetrics?.portfolioTurnover || 2,
      averageHoldingPeriod: profile?.behaviorMetrics?.averageHoldingPeriod || 365,
    },
  });

  const steps = [
    { title: 'Personal Info', icon: FiUser, description: 'Basic information and contact details' },
    { title: 'Investment Goals', icon: FiTarget, description: 'Preferences and objectives' },
    { title: 'Risk Profile', icon: FiShield, description: 'Risk tolerance and limits' },
    { title: 'Demographics', icon: FiMapPin, description: 'Location and background' },
    { title: 'Behavior', icon: FiTrendingUp, description: 'Investment behavior patterns' },
  ];

  const handleInputChange = (section: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: value,
      },
    }));
  };

  const handleNestedInputChange = (section: string, subsection: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [subsection]: {
          ...(prev[section as keyof typeof prev] as any)?.[subsection],
          [field]: value,
        },
      },
    }));
  };

  const handleAssetTypeChange = (assetTypes: string[]) => {
    handleInputChange('preferences', 'assetTypes', assetTypes as AssetType[]);
  };

  const handleGeographicChange = (regions: string[]) => {
    handleInputChange('preferences', 'geographicPreferences', regions);
  };

  const handleSubmit = () => {
    // Validate required fields
    if (!formData.name || !formData.email) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    onSave(formData);
  };

  const renderPersonalInfo = () => (
    <VStack spacing={6} align="stretch">
      <Text fontSize="lg" fontWeight="semibold" color="blue.600">
        Personal Information
      </Text>
      
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <FormControl isRequired>
          <FormLabel>Full Name</FormLabel>
          <Input
            value={formData.name || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter your full name"
          />
        </FormControl>

        <FormControl isRequired>
          <FormLabel>Email Address</FormLabel>
          <Input
            type="email"
            value={formData.email || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="Enter your email"
          />
        </FormControl>
      </SimpleGrid>

      <FormControl>
        <FormLabel>Wallet Address</FormLabel>
        <Input
          value={formData.walletAddress || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, walletAddress: e.target.value }))}
          placeholder="0x... (optional)"
          isReadOnly={!!profile}
        />
        <FormHelperText>
          {profile ? 'Wallet address cannot be changed' : 'Connect your wallet or enter manually'}
        </FormHelperText>
      </FormControl>
    </VStack>
  );

  const renderInvestmentGoals = () => (
    <VStack spacing={6} align="stretch">
      <Text fontSize="lg" fontWeight="semibold" color="blue.600">
        Investment Preferences & Goals
      </Text>

      <FormControl>
        <FormLabel>Preferred Asset Types</FormLabel>
        <CheckboxGroup
          value={formData.preferences?.assetTypes || []}
          onChange={handleAssetTypeChange}
        >
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
            {ASSET_TYPES.map((asset) => (
              <Box key={asset.value} p={3} border="1px" borderColor="gray.200" borderRadius="md">
                <Checkbox value={asset.value} mb={1}>
                  <Text fontWeight="medium">{asset.label}</Text>
                </Checkbox>
                <Text fontSize="sm" color="gray.600">{asset.description}</Text>
              </Box>
            ))}
          </SimpleGrid>
        </CheckboxGroup>
      </FormControl>

      <FormControl>
        <FormLabel>Geographic Preferences</FormLabel>
        <CheckboxGroup
          value={formData.preferences?.geographicPreferences || []}
          onChange={handleGeographicChange}
        >
          <SimpleGrid columns={{ base: 2, md: 3 }} spacing={3}>
            {GEOGRAPHIC_REGIONS.map((region) => (
              <Checkbox key={region} value={region}>
                {region}
              </Checkbox>
            ))}
          </SimpleGrid>
        </CheckboxGroup>
      </FormControl>

      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
        <FormControl>
          <FormLabel>Minimum Investment</FormLabel>
          <NumberInput
            value={formData.preferences?.investmentAmount?.min || 10000}
            onChange={(_, value) => handleNestedInputChange('preferences', 'investmentAmount', 'min', value)}
            min={1000}
            max={10000000}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </FormControl>

        <FormControl>
          <FormLabel>Preferred Investment</FormLabel>
          <NumberInput
            value={formData.preferences?.investmentAmount?.preferred || 100000}
            onChange={(_, value) => handleNestedInputChange('preferences', 'investmentAmount', 'preferred', value)}
            min={1000}
            max={10000000}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </FormControl>

        <FormControl>
          <FormLabel>Maximum Investment</FormLabel>
          <NumberInput
            value={formData.preferences?.investmentAmount?.max || 1000000}
            onChange={(_, value) => handleNestedInputChange('preferences', 'investmentAmount', 'max', value)}
            min={1000}
            max={10000000}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </FormControl>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
        <FormControl>
          <FormLabel>Time Horizon</FormLabel>
          <Select
            value={formData.preferences?.timeHorizon || 'medium'}
            onChange={(e) => handleInputChange('preferences', 'timeHorizon', e.target.value)}
          >
            <option value="short">Short Term (&lt; 1 year)</option>
            <option value="medium">Medium Term (1-5 years)</option>
            <option value="long">Long Term (&gt; 5 years)</option>
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel>Liquidity Preference</FormLabel>
          <Select
            value={formData.preferences?.liquidityPreference || 'medium'}
            onChange={(e) => handleInputChange('preferences', 'liquidityPreference', e.target.value)}
          >
            <option value="high">High Liquidity</option>
            <option value="medium">Medium Liquidity</option>
            <option value="low">Low Liquidity</option>
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel>Technology Adoption</FormLabel>
          <Select
            value={formData.preferences?.technologyAdoption || 'moderate'}
            onChange={(e) => handleInputChange('preferences', 'technologyAdoption', e.target.value)}
          >
            <option value="conservative">Conservative</option>
            <option value="moderate">Moderate</option>
            <option value="aggressive">Aggressive</option>
          </Select>
        </FormControl>
      </SimpleGrid>

      <FormControl>
        <Checkbox
          isChecked={formData.preferences?.sustainabilityFocus || false}
          onChange={(e) => handleInputChange('preferences', 'sustainabilityFocus', e.target.checked)}
        >
          <Text>Focus on sustainable and ESG investments</Text>
        </Checkbox>
      </FormControl>
    </VStack>
  );

  const renderRiskProfile = () => (
    <VStack spacing={6} align="stretch">
      <Text fontSize="lg" fontWeight="semibold" color="blue.600">
        Risk Profile & Tolerance
      </Text>

      <FormControl>
        <FormLabel>Risk Tolerance</FormLabel>
        <Select
          value={formData.riskProfile?.riskTolerance || 'moderate'}
          onChange={(e) => handleInputChange('riskProfile', 'riskTolerance', e.target.value)}
        >
          <option value="conservative">Conservative - Capital preservation focus</option>
          <option value="moderate">Moderate - Balanced growth and preservation</option>
          <option value="aggressive">Aggressive - Maximum growth potential</option>
        </Select>
      </FormControl>

      <FormControl>
        <FormLabel>
          Overall Risk Score: {formData.riskProfile?.riskScore || 50}
        </FormLabel>
        <Slider
          value={formData.riskProfile?.riskScore || 50}
          onChange={(value) => handleInputChange('riskProfile', 'riskScore', value)}
          min={0}
          max={100}
          step={5}
        >
          <SliderTrack>
            <SliderFilledTrack bg="blue.400" />
          </SliderTrack>
          <SliderThumb />
        </Slider>
        <HStack justify="space-between" mt={1}>
          <Text fontSize="sm" color="gray.600">Low Risk</Text>
          <Text fontSize="sm" color="gray.600">High Risk</Text>
        </HStack>
      </FormControl>

      <FormControl>
        <FormLabel>
          Volatility Tolerance: {formData.riskProfile?.volatilityTolerance || 50}%
        </FormLabel>
        <Slider
          value={formData.riskProfile?.volatilityTolerance || 50}
          onChange={(value) => handleInputChange('riskProfile', 'volatilityTolerance', value)}
          min={0}
          max={100}
          step={5}
        >
          <SliderTrack>
            <SliderFilledTrack bg="orange.400" />
          </SliderTrack>
          <SliderThumb />
        </Slider>
      </FormControl>

      <FormControl>
        <FormLabel>Maximum Acceptable Drawdown</FormLabel>
        <NumberInput
          value={formData.riskProfile?.maxDrawdown || 20}
          onChange={(_, value) => handleInputChange('riskProfile', 'maxDrawdown', value)}
          min={5}
          max={50}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
        <FormHelperText>Maximum percentage loss you can tolerate</FormHelperText>
      </FormControl>

      <Text fontWeight="medium" mt={4}>Risk Factor Assessment</Text>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {Object.entries(formData.riskProfile?.riskFactors || {}).map(([key, value]) => (
          <FormControl key={key}>
            <FormLabel textTransform="capitalize">
              {key.replace(/([A-Z])/g, ' $1').toLowerCase()}: {value}
            </FormLabel>
            <Slider
              value={value}
              onChange={(newValue) => handleNestedInputChange('riskProfile', 'riskFactors', key, newValue)}
              min={0}
              max={100}
              step={5}
            >
              <SliderTrack>
                <SliderFilledTrack bg="red.400" />
              </SliderTrack>
              <SliderThumb />
            </Slider>
          </FormControl>
        ))}
      </SimpleGrid>
    </VStack>
  );

  const renderDemographics = () => (
    <VStack spacing={6} align="stretch">
      <Text fontSize="lg" fontWeight="semibold" color="blue.600">
        Demographics & Background
      </Text>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <FormControl>
          <FormLabel>Age</FormLabel>
          <NumberInput
            value={formData.demographics?.age || 35}
            onChange={(_, value) => handleInputChange('demographics', 'age', value)}
            min={18}
            max={100}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </FormControl>

        <FormControl>
          <FormLabel>Investment Experience</FormLabel>
          <Select
            value={formData.demographics?.investmentExperience || 'intermediate'}
            onChange={(e) => handleInputChange('demographics', 'investmentExperience', e.target.value)}
          >
            <option value="beginner">Beginner (&lt; 2 years)</option>
            <option value="intermediate">Intermediate (2-5 years)</option>
            <option value="advanced">Advanced (5-10 years)</option>
            <option value="expert">Expert (&gt; 10 years)</option>
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel>Country</FormLabel>
          <Select
            value={formData.demographics?.location?.country || 'United States'}
            onChange={(e) => handleNestedInputChange('demographics', 'location', 'country', e.target.value)}
          >
            {COUNTRIES.map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel>Region</FormLabel>
          <Select
            value={formData.demographics?.location?.region || 'North America'}
            onChange={(e) => handleNestedInputChange('demographics', 'location', 'region', e.target.value)}
          >
            {GEOGRAPHIC_REGIONS.map(region => (
              <option key={region} value={region}>{region}</option>
            ))}
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel>Annual Income Range</FormLabel>
          <Select
            value={formData.demographics?.incomeRange || '$100k-$250k'}
            onChange={(e) => handleInputChange('demographics', 'incomeRange', e.target.value)}
          >
            <option value="$50k-$100k">$50k - $100k</option>
            <option value="$100k-$250k">$100k - $250k</option>
            <option value="$250k-$500k">$250k - $500k</option>
            <option value="$500k+">$500k+</option>
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel>Net Worth Range</FormLabel>
          <Select
            value={formData.demographics?.netWorth || '$500k-$1M'}
            onChange={(e) => handleInputChange('demographics', 'netWorth', e.target.value)}
          >
            <option value="$100k-$500k">$100k - $500k</option>
            <option value="$500k-$1M">$500k - $1M</option>
            <option value="$1M-$5M">$1M - $5M</option>
            <option value="$5M+">$5M+</option>
          </Select>
        </FormControl>
      </SimpleGrid>

      <FormControl>
        <FormLabel>Occupation (Optional)</FormLabel>
        <Input
          value={formData.demographics?.occupation || ''}
          onChange={(e) => handleInputChange('demographics', 'occupation', e.target.value)}
          placeholder="Your profession or occupation"
        />
      </FormControl>

      <FormControl>
        <FormLabel>City (Optional)</FormLabel>
        <Input
          value={formData.demographics?.location?.city || ''}
          onChange={(e) => handleNestedInputChange('demographics', 'location', 'city', e.target.value)}
          placeholder="Your city"
        />
      </FormControl>
    </VStack>
  );

  const renderBehaviorMetrics = () => (
    <VStack spacing={6} align="stretch">
      <Text fontSize="lg" fontWeight="semibold" color="blue.600">
        Investment Behavior Patterns
      </Text>

      <FormControl>
        <FormLabel>
          Activity Level: {formData.behaviorMetrics?.activityLevel || 50}
        </FormLabel>
        <Slider
          value={formData.behaviorMetrics?.activityLevel || 50}
          onChange={(value) => handleInputChange('behaviorMetrics', 'activityLevel', value)}
          min={0}
          max={100}
          step={5}
        >
          <SliderTrack>
            <SliderFilledTrack bg="green.400" />
          </SliderTrack>
          <SliderThumb />
        </Slider>
        <HStack justify="space-between" mt={1}>
          <Text fontSize="sm" color="gray.600">Passive</Text>
          <Text fontSize="sm" color="gray.600">Very Active</Text>
        </HStack>
      </FormControl>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <FormControl>
          <FormLabel>Decision Making Speed</FormLabel>
          <Select
            value={formData.behaviorMetrics?.decisionSpeed || 'moderate'}
            onChange={(e) => handleInputChange('behaviorMetrics', 'decisionSpeed', e.target.value)}
          >
            <option value="fast">Fast - Quick decisions</option>
            <option value="moderate">Moderate - Balanced approach</option>
            <option value="slow">Slow - Thorough analysis</option>
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel>Research Depth</FormLabel>
          <Select
            value={formData.behaviorMetrics?.researchDepth || 'moderate'}
            onChange={(e) => handleInputChange('behaviorMetrics', 'researchDepth', e.target.value)}
          >
            <option value="minimal">Minimal - Basic research</option>
            <option value="moderate">Moderate - Standard analysis</option>
            <option value="extensive">Extensive - Deep research</option>
          </Select>
        </FormControl>
      </SimpleGrid>

      <FormControl>
        <FormLabel>
          Social Influence: {formData.behaviorMetrics?.socialInfluence || 50}
        </FormLabel>
        <Slider
          value={formData.behaviorMetrics?.socialInfluence || 50}
          onChange={(value) => handleInputChange('behaviorMetrics', 'socialInfluence', value)}
          min={0}
          max={100}
          step={5}
        >
          <SliderTrack>
            <SliderFilledTrack bg="purple.400" />
          </SliderTrack>
          <SliderThumb />
        </Slider>
        <FormHelperText>How much community trends influence your decisions</FormHelperText>
      </FormControl>

      <FormControl>
        <FormLabel>Portfolio Turnover Rate</FormLabel>
        <NumberInput
          value={formData.behaviorMetrics?.portfolioTurnover || 2}
          onChange={(_, value) => handleInputChange('behaviorMetrics', 'portfolioTurnover', value)}
          min={0.1}
          max={10}
          step={0.1}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
        <FormHelperText>Times per year you typically adjust your portfolio</FormHelperText>
      </FormControl>

      <FormControl>
        <FormLabel>Average Holding Period (Days)</FormLabel>
        <NumberInput
          value={formData.behaviorMetrics?.averageHoldingPeriod || 365}
          onChange={(_, value) => handleInputChange('behaviorMetrics', 'averageHoldingPeriod', value)}
          min={1}
          max={3650}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </FormControl>

      <FormControl>
        <Checkbox
          isChecked={formData.behaviorMetrics?.contrarian || false}
          onChange={(e) => handleInputChange('behaviorMetrics', 'contrarian', e.target.checked)}
        >
          <Text>I tend to go against popular market trends (contrarian investor)</Text>
        </Checkbox>
      </FormControl>
    </VStack>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: return renderPersonalInfo();
      case 1: return renderInvestmentGoals();
      case 2: return renderRiskProfile();
      case 3: return renderDemographics();
      case 4: return renderBehaviorMetrics();
      default: return renderPersonalInfo();
    }
  };

  return (
    <Box maxW="4xl" mx="auto" p={6}>
      <VStack spacing={8} align="stretch">
        {/* Progress Header */}
        <Box>
          <Text fontSize="2xl" fontWeight="bold" mb={2}>
            {profile ? 'Update' : 'Create'} Investor Profile
          </Text>
          <Progress value={(currentStep + 1) / steps.length * 100} colorScheme="blue" mb={4} />
          
          <HStack spacing={4} overflowX="auto" pb={2}>
            {steps.map((step, index) => (
              <Box
                key={index}
                minW="200px"
                p={3}
                bg={index === currentStep ? 'blue.50' : 'gray.50'}
                border="2px"
                borderColor={index === currentStep ? 'blue.200' : 'gray.200'}
                borderRadius="md"
                cursor="pointer"
                onClick={() => setCurrentStep(index)}
              >
                <HStack>
                  <Icon as={step.icon} color={index === currentStep ? 'blue.500' : 'gray.500'} />
                  <VStack align="start" spacing={0}>
                    <Text fontSize="sm" fontWeight="medium">
                      {step.title}
                    </Text>
                    <Text fontSize="xs" color="gray.600">
                      {step.description}
                    </Text>
                  </VStack>
                </HStack>
              </Box>
            ))}
          </HStack>
        </Box>

        {/* Step Content */}
        <Card>
          <CardBody>
            {renderStepContent()}
          </CardBody>
        </Card>

        {/* Navigation */}
        <HStack justify="space-between">
          <Button
            variant="outline"
            onClick={() => currentStep > 0 ? setCurrentStep(currentStep - 1) : onCancel()}
          >
            {currentStep > 0 ? 'Previous' : 'Cancel'}
          </Button>

          <HStack>
            {currentStep < steps.length - 1 ? (
              <Button
                colorScheme="blue"
                onClick={() => setCurrentStep(currentStep + 1)}
              >
                Next
              </Button>
            ) : (
              <Button
                colorScheme="green"
                onClick={handleSubmit}
                isLoading={isLoading}
                loadingText="Saving..."
              >
                {profile ? 'Update Profile' : 'Create Profile'}
              </Button>
            )}
          </HStack>
        </HStack>
      </VStack>
    </Box>
  );
}
