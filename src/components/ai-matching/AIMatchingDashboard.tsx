'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  Select,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Progress,
  Spinner,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Icon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Divider,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { 
  FiUsers, 
  FiTrendingUp, 
  FiTarget, 
  FiRefreshCw,
  FiFilter,
  FiSearch,
  FiPlus,
  FiBarChart3,
  FiSettings,
} from 'react-icons/fi';
import { 
  aiMatchingService, 
  InvestorProfile, 
  MatchingRecommendation,
  ClusterAnalysis,
  AssetType 
} from '../../services/aiMatchingService';
import RecommendationCard from './RecommendationCard';
import InvestorProfileForm from './InvestorProfileForm';

export default function AIMatchingDashboard() {
  const toast = useToast();
  const { isOpen: isProfileOpen, onOpen: onProfileOpen, onClose: onProfileClose } = useDisclosure();
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  
  // State
  const [currentProfile, setCurrentProfile] = useState<InvestorProfile | null>(null);
  const [recommendations, setRecommendations] = useState<MatchingRecommendation[]>([]);
  const [allProfiles, setAllProfiles] = useState<InvestorProfile[]>([]);
  const [clusterAnalysis, setClusterAnalysis] = useState<ClusterAnalysis[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [assetTypeFilter, setAssetTypeFilter] = useState<AssetType | 'all'>('all');
  const [minMatchScore, setMinMatchScore] = useState(50);
  const [sortBy, setSortBy] = useState<'matchScore' | 'confidence' | 'expectedReturn'>('matchScore');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [profiles, clusters, metricsData] = await Promise.all([
        aiMatchingService.getAllProfiles(),
        aiMatchingService.getClusterAnalysis(),
        aiMatchingService.getMatchingMetrics(),
      ]);
      
      setAllProfiles(profiles);
      setClusterAnalysis(clusters);
      setMetrics(metricsData);
      
      if (profiles.length > 0) {
        setSelectedProfileId(profiles[0].id);
        setCurrentProfile(profiles[0]);
        await loadRecommendations(profiles[0].id);
      }
    } catch (error) {
      toast({
        title: 'Error loading data',
        description: 'Failed to load AI matching data',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecommendations = async (profileId: string) => {
    setIsLoading(true);
    try {
      const recs = await aiMatchingService.getRecommendations(profileId, 20);
      setRecommendations(recs);
    } catch (error) {
      toast({
        title: 'Error loading recommendations',
        description: 'Failed to load investment recommendations',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileSelect = async (profileId: string) => {
    setSelectedProfileId(profileId);
    const profile = allProfiles.find(p => p.id === profileId);
    if (profile) {
      setCurrentProfile(profile);
      await loadRecommendations(profileId);
    }
  };

  const handleCreateProfile = async (profileData: Partial<InvestorProfile>) => {
    setIsLoading(true);
    try {
      const newProfile = await aiMatchingService.createInvestorProfile(profileData);
      setAllProfiles(prev => [...prev, newProfile]);
      setSelectedProfileId(newProfile.id);
      setCurrentProfile(newProfile);
      await loadRecommendations(newProfile.id);
      onCreateClose();
      
      toast({
        title: 'Profile created successfully',
        description: 'Your investor profile has been created and AI recommendations are ready',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error creating profile',
        description: 'Failed to create investor profile',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (profileData: Partial<InvestorProfile>) => {
    if (!currentProfile) return;
    
    setIsLoading(true);
    try {
      const updatedProfile = await aiMatchingService.updateInvestorProfile(currentProfile.id, profileData);
      if (updatedProfile) {
        setCurrentProfile(updatedProfile);
        setAllProfiles(prev => prev.map(p => p.id === updatedProfile.id ? updatedProfile : p));
        await loadRecommendations(updatedProfile.id);
        onProfileClose();
        
        toast({
          title: 'Profile updated successfully',
          description: 'Your recommendations have been refreshed based on your updated profile',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'Error updating profile',
        description: 'Failed to update investor profile',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvest = (assetId: string) => {
    toast({
      title: 'Investment Process',
      description: 'Redirecting to investment flow...',
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };

  const handleLearnMore = (assetId: string) => {
    toast({
      title: 'Asset Details',
      description: 'Opening detailed asset information...',
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };

  const handleFeedback = (assetId: string, rating: number) => {
    toast({
      title: 'Feedback Received',
      description: `Thank you for rating this recommendation ${rating}/5 stars`,
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const filteredRecommendations = recommendations
    .filter(rec => {
      const matchesSearch = rec.asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           rec.asset.location.country.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAssetType = assetTypeFilter === 'all' || rec.asset.type === assetTypeFilter;
      const matchesScore = rec.matchScore >= minMatchScore;
      return matchesSearch && matchesAssetType && matchesScore;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'confidence':
          return b.confidence - a.confidence;
        case 'expectedReturn':
          return b.asset.financialMetrics.expectedReturn - a.asset.financialMetrics.expectedReturn;
        default:
          return b.matchScore - a.matchScore;
      }
    });

  const renderOverview = () => (
    <VStack spacing={6} align="stretch">
      {/* Key Metrics */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Total Profiles</StatLabel>
              <StatNumber>{metrics?.totalProfiles || 0}</StatNumber>
              <StatHelpText>
                <StatArrow type="increase" />
                Active investors
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Available Assets</StatLabel>
              <StatNumber>{metrics?.totalAssets || 0}</StatNumber>
              <StatHelpText>Investment opportunities</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Matching Accuracy</StatLabel>
              <StatNumber>{((metrics?.matchingAccuracy || 0) * 100).toFixed(1)}%</StatNumber>
              <StatHelpText>
                <StatArrow type="increase" />
                AI performance
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Avg Match Score</StatLabel>
              <StatNumber>{metrics?.avgMatchScore || 0}</StatNumber>
              <StatHelpText>Recommendation quality</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Current Profile Info */}
      {currentProfile && (
        <Card>
          <CardHeader>
            <HStack justify="space-between">
              <Text fontSize="lg" fontWeight="semibold">Current Profile</Text>
              <Button size="sm" variant="outline" onClick={onProfileOpen}>
                Edit Profile
              </Button>
            </HStack>
          </CardHeader>
          <CardBody pt={0}>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              <Box>
                <Text fontSize="sm" color="gray.600">Risk Tolerance</Text>
                <Badge colorScheme={
                  currentProfile.riskProfile.riskTolerance === 'conservative' ? 'green' :
                  currentProfile.riskProfile.riskTolerance === 'moderate' ? 'blue' : 'red'
                }>
                  {currentProfile.riskProfile.riskTolerance.toUpperCase()}
                </Badge>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.600">Preferred Investment</Text>
                <Text fontWeight="medium">
                  ${currentProfile.preferences.investmentAmount.preferred.toLocaleString()}
                </Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.600">Time Horizon</Text>
                <Text fontWeight="medium" textTransform="capitalize">
                  {currentProfile.preferences.timeHorizon} Term
                </Text>
              </Box>
            </SimpleGrid>
          </CardBody>
        </Card>
      )}

      {/* Cluster Analysis */}
      <Card>
        <CardHeader>
          <Text fontSize="lg" fontWeight="semibold">Investor Clusters</Text>
        </CardHeader>
        <CardBody pt={0}>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
            {clusterAnalysis.map((cluster) => (
              <Box key={cluster.clusterId} p={4} border="1px" borderColor="gray.200" borderRadius="md">
                <VStack align="start" spacing={2}>
                  <HStack justify="space-between" w="full">
                    <Text fontWeight="semibold">{cluster.clusterName}</Text>
                    <Badge>{cluster.memberCount} members</Badge>
                  </HStack>
                  <Text fontSize="sm" color="gray.600">{cluster.description}</Text>
                  <HStack spacing={2} flexWrap="wrap">
                    {cluster.characteristics.commonAssetTypes.slice(0, 2).map(type => (
                      <Badge key={type} size="sm" variant="outline">
                        {type.replace('_', ' ')}
                      </Badge>
                    ))}
                  </HStack>
                </VStack>
              </Box>
            ))}
          </SimpleGrid>
        </CardBody>
      </Card>
    </VStack>
  );

  const renderRecommendations = () => (
    <VStack spacing={6} align="stretch">
      {/* Profile Selector and Filters */}
      <Card>
        <CardBody>
          <VStack spacing={4}>
            <HStack w="full" spacing={4}>
              <Box flex={1}>
                <Text fontSize="sm" mb={2}>Select Investor Profile</Text>
                <Select
                  value={selectedProfileId}
                  onChange={(e) => handleProfileSelect(e.target.value)}
                >
                  {allProfiles.map(profile => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name || profile.id} - {profile.riskProfile.riskTolerance}
                    </option>
                  ))}
                </Select>
              </Box>
              <Button
                colorScheme="blue"
                leftIcon={<Icon as={FiPlus} />}
                onClick={onCreateOpen}
              >
                New Profile
              </Button>
            </HStack>

            <HStack w="full" spacing={4} flexWrap="wrap">
              <Box flex={1} minW="200px">
                <Input
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  leftElement={<Icon as={FiSearch} />}
                />
              </Box>
              
              <Select
                value={assetTypeFilter}
                onChange={(e) => setAssetTypeFilter(e.target.value as AssetType | 'all')}
                minW="150px"
              >
                <option value="all">All Types</option>
                <option value="real_estate">Real Estate</option>
                <option value="carbon_credits">Carbon Credits</option>
                <option value="precious_metals">Precious Metals</option>
                <option value="commodities">Commodities</option>
                <option value="renewable_energy">Renewable Energy</option>
                <option value="infrastructure">Infrastructure</option>
                <option value="art_collectibles">Art & Collectibles</option>
                <option value="bonds">Bonds</option>
              </Select>

              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'matchScore' | 'confidence' | 'expectedReturn')}
                minW="150px"
              >
                <option value="matchScore">Match Score</option>
                <option value="confidence">Confidence</option>
                <option value="expectedReturn">Expected Return</option>
              </Select>

              <Button
                variant="outline"
                leftIcon={<Icon as={FiRefreshCw} />}
                onClick={() => currentProfile && loadRecommendations(currentProfile.id)}
                isLoading={isLoading}
              >
                Refresh
              </Button>
            </HStack>

            <HStack w="full">
              <Text fontSize="sm">Min Match Score: {minMatchScore}%</Text>
              <Box flex={1} mx={4}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={minMatchScore}
                  onChange={(e) => setMinMatchScore(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </Box>
            </HStack>
          </VStack>
        </CardBody>
      </Card>

      {/* Recommendations Grid */}
      {isLoading ? (
        <Box textAlign="center" py={10}>
          <Spinner size="lg" />
          <Text mt={4}>Loading AI recommendations...</Text>
        </Box>
      ) : filteredRecommendations.length === 0 ? (
        <Alert status="info">
          <AlertIcon />
          No recommendations match your current filters. Try adjusting the criteria or creating a new profile.
        </Alert>
      ) : (
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
          {filteredRecommendations.map((recommendation) => (
            <RecommendationCard
              key={recommendation.assetId}
              recommendation={recommendation}
              onInvest={handleInvest}
              onLearnMore={handleLearnMore}
              onFeedback={handleFeedback}
            />
          ))}
        </SimpleGrid>
      )}
    </VStack>
  );

  return (
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <VStack align="start" spacing={1}>
            <Text fontSize="3xl" fontWeight="bold">
              AI-Powered Investor Matching
            </Text>
            <Text color="gray.600">
              Discover personalized investment opportunities with AI-driven recommendations
            </Text>
          </VStack>
        </HStack>

        {/* Main Content */}
        <Tabs colorScheme="blue" variant="enclosed">
          <TabList>
            <Tab>
              <Icon as={FiBarChart3} mr={2} />
              Overview
            </Tab>
            <Tab>
              <Icon as={FiTarget} mr={2} />
              Recommendations
            </Tab>
          </TabList>

          <TabPanels>
            <TabPanel px={0}>
              {renderOverview()}
            </TabPanel>
            <TabPanel px={0}>
              {renderRecommendations()}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>

      {/* Profile Form Modal */}
      <Modal isOpen={isProfileOpen} onClose={onProfileClose} size="6xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Update Investor Profile</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <InvestorProfileForm
              profile={currentProfile || undefined}
              onSave={handleUpdateProfile}
              onCancel={onProfileClose}
              isLoading={isLoading}
            />
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Create Profile Modal */}
      <Modal isOpen={isCreateOpen} onClose={onCreateClose} size="6xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Investor Profile</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <InvestorProfileForm
              onSave={handleCreateProfile}
              onCancel={onCreateClose}
              isLoading={isLoading}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
