"use client";

import { useState } from "react";
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  RangeSlider,
  RangeSliderTrack,
  RangeSliderFilledTrack,
  RangeSliderThumb,
  Checkbox,
  CheckboxGroup,
  Badge,
  Button,
  Icon,
  Collapse,
  useDisclosure,
  SimpleGrid,
  Select,
  useColorModeValue,
  Divider,
} from "@chakra-ui/react";
import {
  FaFilter,
  FaChevronDown,
  FaChevronUp,
  FaLeaf,
  FaUsers,
  FaShieldAlt,
  FaAward,
  FaReset,
} from "react-icons/fa";
import { ESGFilter } from "../../services/esgService";

interface ESGFilterPanelProps {
  onFilterChange: (filter: ESGFilter) => void;
  assetCount: number;
  isLoading?: boolean;
}

export default function ESGFilterPanel({ 
  onFilterChange, 
  assetCount, 
  isLoading = false 
}: ESGFilterPanelProps) {
  const [filters, setFilters] = useState<ESGFilter>({
    minOverallScore: 0,
    minEnvironmentalScore: 0,
    minSocialScore: 0,
    minGovernanceScore: 0,
    certifications: [],
    assetTypes: [],
    impactCategories: [],
    sustainabilityGoals: false
  });

  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  const { isOpen: isAdvancedOpen, onToggle: toggleAdvanced } = useDisclosure();

  const certificationOptions = [
    "LEED", "BREEAM", "Energy Star", "B Corp", "ISO 14001", 
    "TCFD", "GRI", "SASB", "MSCI ESG", "Sustainalytics"
  ];

  const assetTypeOptions = [
    "real-estate", "renewable-energy", "carbon-credits", "agriculture",
    "transportation", "manufacturing", "infrastructure", "forestry"
  ];

  const impactCategoryOptions = [
    "Climate Action", "Clean Energy", "Sustainable Cities", "Responsible Consumption",
    "Life Below Water", "Life on Land", "Decent Work", "Reduced Inequalities"
  ];

  const handleScoreRangeChange = (
    type: 'overall' | 'environmental' | 'social' | 'governance',
    value: number[]
  ) => {
    const newFilters = {
      ...filters,
      [`min${type.charAt(0).toUpperCase() + type.slice(1)}Score`]: value[0]
    };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleCheckboxChange = (
    type: 'certifications' | 'assetTypes' | 'impactCategories',
    values: string[]
  ) => {
    const newFilters = { ...filters, [type]: values };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleSustainabilityGoalsChange = (checked: boolean) => {
    const newFilters = { ...filters, sustainabilityGoals: checked };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const resetFilters = () => {
    const resetFilter: ESGFilter = {
      minOverallScore: 0,
      minEnvironmentalScore: 0,
      minSocialScore: 0,
      minGovernanceScore: 0,
      certifications: [],
      assetTypes: [],
      impactCategories: [],
      sustainabilityGoals: false
    };
    setFilters(resetFilter);
    onFilterChange(resetFilter);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.minOverallScore && filters.minOverallScore > 0) count++;
    if (filters.minEnvironmentalScore && filters.minEnvironmentalScore > 0) count++;
    if (filters.minSocialScore && filters.minSocialScore > 0) count++;
    if (filters.minGovernanceScore && filters.minGovernanceScore > 0) count++;
    if (filters.certifications && filters.certifications.length > 0) count++;
    if (filters.assetTypes && filters.assetTypes.length > 0) count++;
    if (filters.impactCategories && filters.impactCategories.length > 0) count++;
    if (filters.sustainabilityGoals) count++;
    return count;
  };

  const ScoreSlider = ({ 
    label, 
    icon, 
    color, 
    value, 
    onChange 
  }: { 
    label: string; 
    icon: any; 
    color: string; 
    value: number; 
    onChange: (value: number[]) => void; 
  }) => (
    <VStack spacing={3} align="stretch">
      <HStack justify="space-between">
        <HStack>
          <Icon as={icon} color={`${color}.500`} />
          <Text fontSize="sm" fontWeight="semibold">
            {label}
          </Text>
        </HStack>
        <Badge colorScheme={color} variant="outline">
          {value}+
        </Badge>
      </HStack>
      <RangeSlider
        value={[value, 100]}
        onChange={onChange}
        min={0}
        max={100}
        step={5}
        colorScheme={color}
      >
        <RangeSliderTrack>
          <RangeSliderFilledTrack />
        </RangeSliderTrack>
        <RangeSliderThumb index={0} />
        <RangeSliderThumb index={1} />
      </RangeSlider>
    </VStack>
  );

  return (
    <Box
      bg={cardBg}
      border="1px solid"
      borderColor={borderColor}
      rounded="xl"
      p={6}
      shadow="md"
      position="sticky"
      top={4}
    >
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between" align="center">
          <HStack>
            <Icon as={FaFilter} color="purple.500" />
            <Heading size="md">ESG Filters</Heading>
            {getActiveFilterCount() > 0 && (
              <Badge colorScheme="purple" rounded="full">
                {getActiveFilterCount()}
              </Badge>
            )}
          </HStack>
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<Icon as={FaReset} />}
            onClick={resetFilters}
            isDisabled={getActiveFilterCount() === 0}
          >
            Reset
          </Button>
        </HStack>

        {/* Results Count */}
        <Box bg="gray.50" p={3} rounded="lg" textAlign="center">
          <Text fontSize="lg" fontWeight="bold" color="purple.600">
            {isLoading ? "..." : assetCount}
          </Text>
          <Text fontSize="sm" color="gray.600">
            Assets match your criteria
          </Text>
        </Box>

        {/* Overall ESG Score */}
        <ScoreSlider
          label="Overall ESG Score"
          icon={FaAward}
          color="purple"
          value={filters.minOverallScore || 0}
          onChange={(value) => handleScoreRangeChange('overall', value)}
        />

        <Divider />

        {/* Individual Scores */}
        <VStack spacing={4} align="stretch">
          <ScoreSlider
            label="Environmental"
            icon={FaLeaf}
            color="green"
            value={filters.minEnvironmentalScore || 0}
            onChange={(value) => handleScoreRangeChange('environmental', value)}
          />

          <ScoreSlider
            label="Social"
            icon={FaUsers}
            color="blue"
            value={filters.minSocialScore || 0}
            onChange={(value) => handleScoreRangeChange('social', value)}
          />

          <ScoreSlider
            label="Governance"
            icon={FaShieldAlt}
            color="orange"
            value={filters.minGovernanceScore || 0}
            onChange={(value) => handleScoreRangeChange('governance', value)}
          />
        </VStack>

        <Divider />

        {/* Asset Types */}
        <VStack spacing={3} align="stretch">
          <Text fontSize="sm" fontWeight="semibold">Asset Types</Text>
          <CheckboxGroup
            value={filters.assetTypes || []}
            onChange={(values) => handleCheckboxChange('assetTypes', values as string[])}
          >
            <SimpleGrid columns={2} spacing={2}>
              {assetTypeOptions.map((type) => (
                <Checkbox key={type} value={type} size="sm">
                  <Text fontSize="xs" textTransform="capitalize">
                    {type.replace('-', ' ')}
                  </Text>
                </Checkbox>
              ))}
            </SimpleGrid>
          </CheckboxGroup>
        </VStack>

        {/* Advanced Filters */}
        <VStack spacing={3} align="stretch">
          <Button
            variant="ghost"
            size="sm"
            rightIcon={<Icon as={isAdvancedOpen ? FaChevronUp : FaChevronDown} />}
            onClick={toggleAdvanced}
          >
            Advanced Filters
          </Button>

          <Collapse in={isAdvancedOpen}>
            <VStack spacing={4} align="stretch">
              {/* Certifications */}
              <VStack spacing={3} align="stretch">
                <Text fontSize="sm" fontWeight="semibold">Certifications</Text>
                <CheckboxGroup
                  value={filters.certifications || []}
                  onChange={(values) => handleCheckboxChange('certifications', values as string[])}
                >
                  <SimpleGrid columns={2} spacing={2}>
                    {certificationOptions.map((cert) => (
                      <Checkbox key={cert} value={cert} size="sm">
                        <Text fontSize="xs">{cert}</Text>
                      </Checkbox>
                    ))}
                  </SimpleGrid>
                </CheckboxGroup>
              </VStack>

              <Divider />

              {/* Impact Categories */}
              <VStack spacing={3} align="stretch">
                <Text fontSize="sm" fontWeight="semibold">Impact Categories</Text>
                <CheckboxGroup
                  value={filters.impactCategories || []}
                  onChange={(values) => handleCheckboxChange('impactCategories', values as string[])}
                >
                  <VStack spacing={2} align="stretch">
                    {impactCategoryOptions.map((category) => (
                      <Checkbox key={category} value={category} size="sm">
                        <Text fontSize="xs">{category}</Text>
                      </Checkbox>
                    ))}
                  </VStack>
                </CheckboxGroup>
              </VStack>

              <Divider />

              {/* Sustainability Goals */}
              <VStack spacing={3} align="stretch">
                <Text fontSize="sm" fontWeight="semibold">Additional Criteria</Text>
                <Checkbox
                  isChecked={filters.sustainabilityGoals || false}
                  onChange={(e) => handleSustainabilityGoalsChange(e.target.checked)}
                  size="sm"
                >
                  <Text fontSize="xs">Has Sustainability Goals</Text>
                </Checkbox>
              </VStack>
            </VStack>
          </Collapse>
        </VStack>

        {/* Quick Filters */}
        <VStack spacing={3} align="stretch">
          <Text fontSize="sm" fontWeight="semibold">Quick Filters</Text>
          <SimpleGrid columns={1} spacing={2}>
            <Button
              size="sm"
              variant="outline"
              colorScheme="green"
              onClick={() => {
                const quickFilter = { ...filters, minEnvironmentalScore: 80 };
                setFilters(quickFilter);
                onFilterChange(quickFilter);
              }}
            >
              🌱 High Environmental Impact
            </Button>
            <Button
              size="sm"
              variant="outline"
              colorScheme="blue"
              onClick={() => {
                const quickFilter = { ...filters, minSocialScore: 80 };
                setFilters(quickFilter);
                onFilterChange(quickFilter);
              }}
            >
              🤝 High Social Impact
            </Button>
            <Button
              size="sm"
              variant="outline"
              colorScheme="purple"
              onClick={() => {
                const quickFilter = { ...filters, minOverallScore: 85 };
                setFilters(quickFilter);
                onFilterChange(quickFilter);
              }}
            >
              ⭐ Top ESG Performers
            </Button>
          </SimpleGrid>
        </VStack>
      </VStack>
    </Box>
  );
}
