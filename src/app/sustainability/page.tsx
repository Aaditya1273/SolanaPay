"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Grid,
  GridItem,
  useColorModeValue,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Button,
  Icon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
} from "@chakra-ui/react";
import {
  FaLeaf,
  FaChartLine,
  FaFilter,
  FaGlobe,
  FaUsers,
  FaShieldAlt,
} from "react-icons/fa";
import { AssetESGProfile, ESGFilter, esgService } from "../../services/esgService";
import ESGFilterPanel from "../../components/esg/ESGFilterPanel";
import ESGAssetGrid from "../../components/esg/ESGAssetGrid";
import ESGImpactDashboard from "../../components/esg/ESGImpactDashboard";
import ESGScoreCard from "../../components/esg/ESGScoreCard";

export default function SustainabilityPage() {
  const [selectedAsset, setSelectedAsset] = useState<AssetESGProfile | null>(null);
  const [esgFilter, setESGFilter] = useState<ESGFilter>({});
  const [filteredAssets, setFilteredAssets] = useState<AssetESGProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { isOpen: isAssetModalOpen, onOpen: openAssetModal, onClose: closeAssetModal } = useDisclosure();

  const bgGradient = useColorModeValue(
    "linear(to-br, green.50, blue.50)",
    "linear(to-br, gray.900, green.900)"
  );

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // Load initial assets with no filters
      const assets = await esgService.searchAssetsByESG({});
      setFilteredAssets(assets);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = async (filter: ESGFilter) => {
    setESGFilter(filter);
    setIsLoading(true);
    try {
      const assets = await esgService.searchAssetsByESG(filter);
      setFilteredAssets(assets);
    } catch (error) {
      console.error('Error applying filters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssetSelect = (asset: AssetESGProfile) => {
    setSelectedAsset(asset);
    openAssetModal();
  };

  const getOverallStats = () => {
    if (filteredAssets.length === 0) {
      return {
        avgESGScore: 0,
        avgEnvironmental: 0,
        avgSocial: 0,
        avgGovernance: 0,
        totalCarbonSaved: 0,
        totalJobsCreated: 0,
        totalAssets: 0
      };
    }

    const totalESG = filteredAssets.reduce((sum, asset) => sum + asset.esgScore.overall, 0);
    const totalEnv = filteredAssets.reduce((sum, asset) => sum + asset.esgScore.environmental, 0);
    const totalSoc = filteredAssets.reduce((sum, asset) => sum + asset.esgScore.social, 0);
    const totalGov = filteredAssets.reduce((sum, asset) => sum + asset.esgScore.governance, 0);
    const totalCarbon = filteredAssets.reduce((sum, asset) => sum + asset.esgScore.impactMetrics.carbonFootprint, 0);
    const totalJobs = filteredAssets.reduce((sum, asset) => sum + asset.esgScore.impactMetrics.jobsCreated, 0);

    return {
      avgESGScore: totalESG / filteredAssets.length,
      avgEnvironmental: totalEnv / filteredAssets.length,
      avgSocial: totalSoc / filteredAssets.length,
      avgGovernance: totalGov / filteredAssets.length,
      totalCarbonSaved: totalCarbon,
      totalJobsCreated: totalJobs,
      totalAssets: filteredAssets.length
    };
  };

  const stats = getOverallStats();

  return (
    <Box minH="100vh" bg={bgGradient}>
      <Container maxW="7xl" py={8}>
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <VStack spacing={4} textAlign="center">
            <HStack spacing={3}>
              <Icon as={FaLeaf} boxSize={8} color="green.500" />
              <Heading
                size="2xl"
                bgGradient="linear(to-r, green.400, blue.400)"
                bgClip="text"
                fontWeight="extrabold"
              >
                Sustainability Hub
              </Heading>
            </HStack>
            <Text fontSize="xl" color="gray.600" maxW="3xl">
              Discover and invest in Real World Assets with exceptional environmental, 
              social, and governance performance. Make a positive impact while building wealth.
            </Text>
          </VStack>

          {/* Overall Impact Stats */}
          <Box
            bg="gradient-to-r from-green-500 to-blue-500"
            p={8}
            rounded="2xl"
            color="white"
            shadow="xl"
          >
            <VStack spacing={6}>
              <Heading size="lg" textAlign="center">
                Collective Impact Dashboard
              </Heading>
              
              <Grid templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }} gap={6} w="full">
                <VStack>
                  <Icon as={FaChartLine} boxSize={8} />
                  <Text fontSize="3xl" fontWeight="bold">
                    {stats.avgESGScore.toFixed(1)}
                  </Text>
                  <Text fontSize="sm" opacity={0.9} textAlign="center">
                    Average ESG Score
                  </Text>
                </VStack>
                
                <VStack>
                  <Icon as={FaLeaf} boxSize={8} />
                  <Text fontSize="3xl" fontWeight="bold">
                    {(stats.totalCarbonSaved * -1).toFixed(0)}
                  </Text>
                  <Text fontSize="sm" opacity={0.9} textAlign="center">
                    kg CO₂ Impact
                  </Text>
                </VStack>
                
                <VStack>
                  <Icon as={FaUsers} boxSize={8} />
                  <Text fontSize="3xl" fontWeight="bold">
                    {stats.totalJobsCreated.toLocaleString()}
                  </Text>
                  <Text fontSize="sm" opacity={0.9} textAlign="center">
                    Jobs Created
                  </Text>
                </VStack>
                
                <VStack>
                  <Icon as={FaGlobe} boxSize={8} />
                  <Text fontSize="3xl" fontWeight="bold">
                    {stats.totalAssets}
                  </Text>
                  <Text fontSize="sm" opacity={0.9} textAlign="center">
                    Sustainable Assets
                  </Text>
                </VStack>
              </Grid>
            </VStack>
          </Box>

          {/* Main Content */}
          <Grid templateColumns={{ base: "1fr", lg: "300px 1fr" }} gap={8}>
            {/* Filter Panel */}
            <GridItem>
              <ESGFilterPanel
                onFilterChange={handleFilterChange}
                assetCount={filteredAssets.length}
                isLoading={isLoading}
              />
            </GridItem>

            {/* Asset Grid */}
            <GridItem>
              <Tabs colorScheme="green" variant="enclosed">
                <TabList>
                  <Tab leftIcon={<Icon as={FaGlobe} />}>
                    Sustainable Assets
                  </Tab>
                  <Tab leftIcon={<Icon as={FaChartLine} />}>
                    Impact Analytics
                  </Tab>
                </TabList>

                <TabPanels>
                  <TabPanel px={0}>
                    <ESGAssetGrid
                      filters={esgFilter}
                      onAssetSelect={handleAssetSelect}
                    />
                  </TabPanel>
                  
                  <TabPanel px={0}>
                    <VStack spacing={6} align="stretch">
                      <Heading size="lg">Portfolio Impact Analysis</Heading>
                      
                      {/* ESG Score Breakdown */}
                      <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={6}>
                        <Box bg="white" p={6} rounded="xl" shadow="md">
                          <VStack spacing={4}>
                            <Icon as={FaLeaf} color="green.500" boxSize={8} />
                            <Text fontSize="2xl" fontWeight="bold" color="green.600">
                              {stats.avgEnvironmental.toFixed(1)}
                            </Text>
                            <Text fontSize="sm" color="gray.600" textAlign="center">
                              Average Environmental Score
                            </Text>
                          </VStack>
                        </Box>
                        
                        <Box bg="white" p={6} rounded="xl" shadow="md">
                          <VStack spacing={4}>
                            <Icon as={FaUsers} color="blue.500" boxSize={8} />
                            <Text fontSize="2xl" fontWeight="bold" color="blue.600">
                              {stats.avgSocial.toFixed(1)}
                            </Text>
                            <Text fontSize="sm" color="gray.600" textAlign="center">
                              Average Social Score
                            </Text>
                          </VStack>
                        </Box>
                        
                        <Box bg="white" p={6} rounded="xl" shadow="md">
                          <VStack spacing={4}>
                            <Icon as={FaShieldAlt} color="purple.500" boxSize={8} />
                            <Text fontSize="2xl" fontWeight="bold" color="purple.600">
                              {stats.avgGovernance.toFixed(1)}
                            </Text>
                            <Text fontSize="sm" color="gray.600" textAlign="center">
                              Average Governance Score
                            </Text>
                          </VStack>
                        </Box>
                      </Grid>

                      {/* Top Performing Assets */}
                      <Box bg="white" p={6} rounded="xl" shadow="md">
                        <VStack spacing={4} align="stretch">
                          <Heading size="md">Top ESG Performers</Heading>
                          <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4}>
                            {filteredAssets
                              .sort((a, b) => b.esgScore.overall - a.esgScore.overall)
                              .slice(0, 3)
                              .map((asset) => (
                                <Box
                                  key={asset.assetId}
                                  p={4}
                                  border="1px solid"
                                  borderColor="gray.200"
                                  rounded="lg"
                                  cursor="pointer"
                                  onClick={() => handleAssetSelect(asset)}
                                  _hover={{ shadow: "md", borderColor: "green.300" }}
                                  transition="all 0.2s"
                                >
                                  <VStack spacing={3}>
                                    <Text fontWeight="bold" noOfLines={1}>
                                      {asset.assetId}
                                    </Text>
                                    <ESGScoreCard 
                                      esgScore={asset.esgScore} 
                                      size="sm" 
                                      showDetails={false}
                                    />
                                  </VStack>
                                </Box>
                              ))}
                          </Grid>
                        </VStack>
                      </Box>
                    </VStack>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </GridItem>
          </Grid>
        </VStack>
      </Container>

      {/* Asset Detail Modal */}
      <Modal isOpen={isAssetModalOpen} onClose={closeAssetModal} size="6xl">
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(10px)" />
        <ModalContent maxW="90vw" maxH="90vh">
          <ModalHeader>
            <HStack>
              <Icon as={FaLeaf} color="green.500" />
              <Text>{selectedAsset?.assetId} - Sustainability Profile</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {selectedAsset && (
              <VStack spacing={6} align="stretch">
                {/* ESG Score Overview */}
                <ESGScoreCard 
                  esgScore={selectedAsset.esgScore} 
                  size="lg" 
                  showDetails={true}
                />

                {/* Impact Dashboard */}
                <ESGImpactDashboard
                  impactMetrics={selectedAsset.esgScore.impactMetrics}
                  sustainabilityGoals={selectedAsset.sustainabilityGoals}
                  assetType={selectedAsset.assetType}
                />

                {/* Investment Actions */}
                <HStack spacing={4} justify="center">
                  <Button colorScheme="green" size="lg">
                    Invest Now
                  </Button>
                  <Button variant="outline" size="lg">
                    Add to Watchlist
                  </Button>
                  <Button variant="outline" size="lg">
                    Download Report
                  </Button>
                </HStack>
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
