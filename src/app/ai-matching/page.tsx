'use client';

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  SimpleGrid,
  Card,
  CardBody,
  Icon,
  Badge,
  Container,
  Heading,
  List,
  ListItem,
  ListIcon,
  Divider,
} from '@chakra-ui/react';
import { 
  FiTarget, 
  FiTrendingUp, 
  FiShield, 
  FiUsers,
  FiBrain,
  FiBarChart3,
  FiCheckCircle,
  FiZap,
  FiGlobe,
  FiLock,
} from 'react-icons/fi';
import AIMatchingDashboard from '../../components/ai-matching/AIMatchingDashboard';

export default function AIMatchingPage() {
  return (
    <Box minH="100vh" bg="gray.50">
      {/* Hero Section */}
      <Box bg="gradient-to-r" bgGradient="linear(to-r, blue.600, purple.600)" color="white" py={20}>
        <Container maxW="7xl">
          <VStack spacing={8} textAlign="center">
            <VStack spacing={4}>
              <Badge colorScheme="whiteAlpha" variant="solid" px={4} py={2} borderRadius="full">
                <HStack>
                  <Icon as={FiBrain} />
                  <Text>AI-Powered Matching</Text>
                </HStack>
              </Badge>
              
              <Heading size="2xl" maxW="4xl">
                Discover Your Perfect Investment Matches with AI Intelligence
              </Heading>
              
              <Text fontSize="xl" maxW="3xl" opacity={0.9}>
                Our advanced AI algorithms analyze your risk profile, investment goals, and preferences 
                to recommend the most suitable real-world assets for your portfolio.
              </Text>
            </VStack>

            <HStack spacing={8} flexWrap="wrap" justify="center">
              <VStack>
                <Text fontSize="3xl" fontWeight="bold">87%</Text>
                <Text fontSize="sm" opacity={0.8}>Matching Accuracy</Text>
              </VStack>
              <VStack>
                <Text fontSize="3xl" fontWeight="bold">50+</Text>
                <Text fontSize="sm" opacity={0.8}>Active Investors</Text>
              </VStack>
              <VStack>
                <Text fontSize="3xl" fontWeight="bold">100+</Text>
                <Text fontSize="sm" opacity={0.8}>Available Assets</Text>
              </VStack>
              <VStack>
                <Text fontSize="3xl" fontWeight="bold">5</Text>
                <Text fontSize="sm" opacity={0.8}>Investor Clusters</Text>
              </VStack>
            </HStack>
          </VStack>
        </Container>
      </Box>

      {/* Features Section */}
      <Box py={20}>
        <Container maxW="7xl">
          <VStack spacing={16}>
            <VStack spacing={4} textAlign="center">
              <Heading size="xl">How AI Matching Works</Heading>
              <Text fontSize="lg" color="gray.600" maxW="3xl">
                Our sophisticated matching engine uses machine learning algorithms to analyze multiple 
                dimensions of your investment profile and match you with optimal opportunities.
              </Text>
            </VStack>

            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8}>
              <Card shadow="lg" borderRadius="xl" overflow="hidden">
                <CardBody p={8}>
                  <VStack spacing={4} align="start">
                    <Box p={3} bg="blue.100" borderRadius="lg">
                      <Icon as={FiUsers} size="24px" color="blue.600" />
                    </Box>
                    <VStack align="start" spacing={2}>
                      <Text fontSize="xl" fontWeight="bold">Investor Profiling</Text>
                      <Text color="gray.600">
                        Advanced clustering algorithms group investors based on risk tolerance, 
                        preferences, demographics, and behavior patterns.
                      </Text>
                    </VStack>
                    <List spacing={2}>
                      <ListItem fontSize="sm">
                        <ListIcon as={FiCheckCircle} color="green.500" />
                        Risk assessment & tolerance analysis
                      </ListItem>
                      <ListItem fontSize="sm">
                        <ListIcon as={FiCheckCircle} color="green.500" />
                        Investment preference mapping
                      </ListItem>
                      <ListItem fontSize="sm">
                        <ListIcon as={FiCheckCircle} color="green.500" />
                        Behavioral pattern recognition
                      </ListItem>
                    </List>
                  </VStack>
                </CardBody>
              </Card>

              <Card shadow="lg" borderRadius="xl" overflow="hidden">
                <CardBody p={8}>
                  <VStack spacing={4} align="start">
                    <Box p={3} bg="purple.100" borderRadius="lg">
                      <Icon as={FiTarget} size="24px" color="purple.600" />
                    </Box>
                    <VStack align="start" spacing={2}>
                      <Text fontSize="xl" fontWeight="bold">Smart Matching</Text>
                      <Text color="gray.600">
                        Multi-factor recommendation engine that considers risk alignment, 
                        financial fit, geographic preferences, and time horizons.
                      </Text>
                    </VStack>
                    <List spacing={2}>
                      <ListItem fontSize="sm">
                        <ListIcon as={FiCheckCircle} color="green.500" />
                        Multi-dimensional scoring algorithm
                      </ListItem>
                      <ListItem fontSize="sm">
                        <ListIcon as={FiCheckCircle} color="green.500" />
                        Real-time confidence scoring
                      </ListItem>
                      <ListItem fontSize="sm">
                        <ListIcon as={FiCheckCircle} color="green.500" />
                        Personalized reasoning & warnings
                      </ListItem>
                    </List>
                  </VStack>
                </CardBody>
              </Card>

              <Card shadow="lg" borderRadius="xl" overflow="hidden">
                <CardBody p={8}>
                  <VStack spacing={4} align="start">
                    <Box p={3} bg="green.100" borderRadius="lg">
                      <Icon as={FiTrendingUp} size="24px" color="green.600" />
                    </Box>
                    <VStack align="start" spacing={2}>
                      <Text fontSize="xl" fontWeight="bold">Continuous Learning</Text>
                      <Text color="gray.600">
                        Machine learning models that improve over time based on user feedback, 
                        investment outcomes, and market performance.
                      </Text>
                    </VStack>
                    <List spacing={2}>
                      <ListItem fontSize="sm">
                        <ListIcon as={FiCheckCircle} color="green.500" />
                        Feedback-driven improvements
                      </ListItem>
                      <ListItem fontSize="sm">
                        <ListIcon as={FiCheckCircle} color="green.500" />
                        Performance-based adjustments
                      </ListItem>
                      <ListItem fontSize="sm">
                        <ListIcon as={FiCheckCircle} color="green.500" />
                        Market trend adaptation
                      </ListItem>
                    </List>
                  </VStack>
                </CardBody>
              </Card>
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>

      {/* Key Benefits */}
      <Box bg="blue.50" py={20}>
        <Container maxW="7xl">
          <VStack spacing={12}>
            <VStack spacing={4} textAlign="center">
              <Heading size="xl">Why Choose AI-Powered Matching?</Heading>
              <Text fontSize="lg" color="gray.600" maxW="3xl">
                Experience the future of investment discovery with our cutting-edge AI technology 
                that delivers personalized, data-driven recommendations.
              </Text>
            </VStack>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={12}>
              <VStack spacing={6} align="start">
                <HStack>
                  <Icon as={FiZap} color="yellow.500" size="24px" />
                  <Text fontSize="xl" fontWeight="bold">Lightning-Fast Analysis</Text>
                </HStack>
                <Text color="gray.700">
                  Process thousands of investment opportunities in seconds, analyzing complex 
                  relationships between your profile and available assets.
                </Text>

                <HStack>
                  <Icon as={FiShield} color="green.500" size="24px" />
                  <Text fontSize="xl" fontWeight="bold">Risk-Aligned Recommendations</Text>
                </HStack>
                <Text color="gray.700">
                  Every recommendation is carefully calibrated to your risk tolerance, ensuring 
                  investments align with your comfort zone and financial goals.
                </Text>

                <HStack>
                  <Icon as={FiBarChart3} color="blue.500" size="24px" />
                  <Text fontSize="xl" fontWeight="bold">Data-Driven Insights</Text>
                </HStack>
                <Text color="gray.700">
                  Leverage comprehensive analytics including performance metrics, market trends, 
                  and predictive modeling for informed decision-making.
                </Text>
              </VStack>

              <VStack spacing={6} align="start">
                <HStack>
                  <Icon as={FiGlobe} color="purple.500" size="24px" />
                  <Text fontSize="xl" fontWeight="bold">Global Asset Coverage</Text>
                </HStack>
                <Text color="gray.700">
                  Access investment opportunities across multiple asset classes, geographic regions, 
                  and market segments from a single platform.
                </Text>

                <HStack>
                  <Icon as={FiBrain} color="orange.500" size="24px" />
                  <Text fontSize="xl" fontWeight="bold">Intelligent Clustering</Text>
                </HStack>
                <Text color="gray.700">
                  Benefit from collective intelligence by being grouped with similar investors, 
                  enabling better benchmarking and strategy optimization.
                </Text>

                <HStack>
                  <Icon as={FiLock} color="red.500" size="24px" />
                  <Text fontSize="xl" fontWeight="bold">Privacy-First Design</Text>
                </HStack>
                <Text color="gray.700">
                  Your investment data and preferences are protected with enterprise-grade security 
                  while still enabling personalized recommendations.
                </Text>
              </VStack>
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>

      {/* Main Dashboard */}
      <Box py={12}>
        <Container maxW="7xl">
          <AIMatchingDashboard />
        </Container>
      </Box>

      {/* Technical Specifications */}
      <Box bg="gray.900" color="white" py={20}>
        <Container maxW="7xl">
          <VStack spacing={12}>
            <VStack spacing={4} textAlign="center">
              <Heading size="xl">Technical Specifications</Heading>
              <Text fontSize="lg" opacity={0.8} maxW="3xl">
                Built with cutting-edge AI and machine learning technologies for maximum 
                accuracy and performance.
              </Text>
            </VStack>

            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={8}>
              <Card bg="gray.800" borderColor="gray.700">
                <CardBody textAlign="center">
                  <VStack spacing={3}>
                    <Text fontSize="2xl" fontWeight="bold" color="blue.400">K-Means</Text>
                    <Text fontSize="sm" opacity={0.8}>Clustering Algorithm</Text>
                    <Text fontSize="xs" opacity={0.6}>
                      Advanced unsupervised learning for investor segmentation
                    </Text>
                  </VStack>
                </CardBody>
              </Card>

              <Card bg="gray.800" borderColor="gray.700">
                <CardBody textAlign="center">
                  <VStack spacing={3}>
                    <Text fontSize="2xl" fontWeight="bold" color="green.400">Multi-Factor</Text>
                    <Text fontSize="sm" opacity={0.8}>Scoring Engine</Text>
                    <Text fontSize="xs" opacity={0.6}>
                      Weighted algorithm considering 5+ matching dimensions
                    </Text>
                  </VStack>
                </CardBody>
              </Card>

              <Card bg="gray.800" borderColor="gray.700">
                <CardBody textAlign="center">
                  <VStack spacing={3}>
                    <Text fontSize="2xl" fontWeight="bold" color="purple.400">Real-Time</Text>
                    <Text fontSize="sm" opacity={0.8}>Processing</Text>
                    <Text fontSize="xs" opacity={0.6}>
                      Instant recommendations with live data updates
                    </Text>
                  </VStack>
                </CardBody>
              </Card>

              <Card bg="gray.800" borderColor="gray.700">
                <CardBody textAlign="center">
                  <VStack spacing={3}>
                    <Text fontSize="2xl" fontWeight="bold" color="orange.400">Adaptive</Text>
                    <Text fontSize="sm" opacity={0.8}>Learning</Text>
                    <Text fontSize="xs" opacity={0.6}>
                      Continuous improvement through feedback loops
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
            </SimpleGrid>

            <Divider borderColor="gray.700" />

            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8} w="full">
              <VStack spacing={3}>
                <Text fontSize="lg" fontWeight="semibold" color="blue.400">Asset Coverage</Text>
                <List spacing={1} fontSize="sm" opacity={0.8}>
                  <ListItem>• Real Estate & REITs</ListItem>
                  <ListItem>• Carbon Credits & ESG</ListItem>
                  <ListItem>• Precious Metals</ListItem>
                  <ListItem>• Renewable Energy</ListItem>
                  <ListItem>• Infrastructure Projects</ListItem>
                  <ListItem>• Art & Collectibles</ListItem>
                </List>
              </VStack>

              <VStack spacing={3}>
                <Text fontSize="lg" fontWeight="semibold" color="green.400">Matching Factors</Text>
                <List spacing={1} fontSize="sm" opacity={0.8}>
                  <ListItem>• Risk Tolerance Alignment</ListItem>
                  <ListItem>• Financial Capacity Fit</ListItem>
                  <ListItem>• Geographic Preferences</ListItem>
                  <ListItem>• Time Horizon Matching</ListItem>
                  <ListItem>• Sustainability Focus</ListItem>
                  <ListItem>• Liquidity Requirements</ListItem>
                </List>
              </VStack>

              <VStack spacing={3}>
                <Text fontSize="lg" fontWeight="semibold" color="purple.400">AI Capabilities</Text>
                <List spacing={1} fontSize="sm" opacity={0.8}>
                  <ListItem>• Behavioral Pattern Analysis</ListItem>
                  <ListItem>• Predictive Risk Modeling</ListItem>
                  <ListItem>• Performance Forecasting</ListItem>
                  <ListItem>• Sentiment Analysis</ListItem>
                  <ListItem>• Market Trend Recognition</ListItem>
                  <ListItem>• Anomaly Detection</ListItem>
                </List>
              </VStack>
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>
    </Box>
  );
}
