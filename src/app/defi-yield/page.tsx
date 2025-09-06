'use client';

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Container,
  SimpleGrid,
  Card,
  CardBody,
  Icon,
  Badge,
  Divider,
  List,
  ListItem,
  ListIcon,
} from '@chakra-ui/react';
import { 
  FiTrendingUp, 
  FiDollarSign, 
  FiShield, 
  FiUsers,
  FiLock,
  FiZap,
  FiTarget,
  FiCheckCircle,
  FiArrowRight,
} from 'react-icons/fi';
import DeFiYieldDashboard from '../../components/defi/DeFiYieldDashboard';

export default function DeFiYieldPage() {
  return (
    <Box minH="100vh" bg="gray.50">
      {/* Hero Section */}
      <Box bg="gradient-to-r from-blue-600 to-purple-600" color="white" py={20}>
        <Container maxW="7xl">
          <VStack spacing={8} textAlign="center">
            <VStack spacing={4}>
              <Text fontSize="5xl" fontWeight="bold" lineHeight="shorter">
                DeFi Yield Integration
              </Text>
              <Text fontSize="xl" maxW="3xl" opacity={0.9}>
                Unlock the power of your Real-World Assets in DeFi. Use RWA NFTs as collateral 
                for lending and stake them to earn stable yield across multiple protocols.
              </Text>
            </VStack>

            <HStack spacing={8} fontSize="lg">
              <VStack>
                <Text fontSize="3xl" fontWeight="bold">15%+</Text>
                <Text opacity={0.8}>Average APY</Text>
              </VStack>
              <VStack>
                <Text fontSize="3xl" fontWeight="bold">$2.5M+</Text>
                <Text opacity={0.8}>TVL</Text>
              </VStack>
              <VStack>
                <Text fontSize="3xl" fontWeight="bold">500+</Text>
                <Text opacity={0.8}>Active Users</Text>
              </VStack>
              <VStack>
                <Text fontSize="3xl" fontWeight="bold">99.9%</Text>
                <Text opacity={0.8}>Uptime</Text>
              </VStack>
            </HStack>

            <Button
              size="lg"
              colorScheme="whiteAlpha"
              variant="solid"
              rightIcon={<Icon as={FiArrowRight} />}
              onClick={() => document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Start Earning Yield
            </Button>
          </VStack>
        </Container>
      </Box>

      {/* Features Section */}
      <Box py={20}>
        <Container maxW="7xl">
          <VStack spacing={16}>
            <VStack spacing={4} textAlign="center">
              <Text fontSize="3xl" fontWeight="bold">
                Comprehensive DeFi Integration
              </Text>
              <Text fontSize="lg" color="gray.600" maxW="3xl">
                Our platform seamlessly integrates with major DeFi protocols, enabling you to 
                maximize the utility of your tokenized real-world assets.
              </Text>
            </VStack>

            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8}>
              {/* Collateral Management */}
              <Card shadow="lg" borderRadius="xl" overflow="hidden">
                <CardBody p={8}>
                  <VStack spacing={4} align="start">
                    <Box p={3} bg="blue.100" borderRadius="lg">
                      <Icon as={FiShield} size="24px" color="blue.600" />
                    </Box>
                    <Text fontSize="xl" fontWeight="bold">
                      Collateral Management
                    </Text>
                    <Text color="gray.600">
                      Use your RWA NFTs as collateral across Aave, Compound, and OneChain's 
                      native lending protocol. Smart risk management keeps your assets safe.
                    </Text>
                    <List spacing={2} fontSize="sm">
                      <ListItem>
                        <ListIcon as={FiCheckCircle} color="green.500" />
                        Multi-protocol support
                      </ListItem>
                      <ListItem>
                        <ListIcon as={FiCheckCircle} color="green.500" />
                        Real-time health monitoring
                      </ListItem>
                      <ListItem>
                        <ListIcon as={FiCheckCircle} color="green.500" />
                        Automated liquidation protection
                      </ListItem>
                    </List>
                  </VStack>
                </CardBody>
              </Card>

              {/* Yield Staking */}
              <Card shadow="lg" borderRadius="xl" overflow="hidden">
                <CardBody p={8}>
                  <VStack spacing={4} align="start">
                    <Box p={3} bg="green.100" borderRadius="lg">
                      <Icon as={FiTrendingUp} size="24px" color="green.600" />
                    </Box>
                    <Text fontSize="xl" fontWeight="bold">
                      Yield Staking
                    </Text>
                    <Text color="gray.600">
                      Stake your RWA NFTs in specialized yield pools to earn consistent returns. 
                      Multiple pools with varying risk profiles and lockup periods.
                    </Text>
                    <List spacing={2} fontSize="sm">
                      <ListItem>
                        <ListIcon as={FiCheckCircle} color="green.500" />
                        Up to 20% APY
                      </ListItem>
                      <ListItem>
                        <ListIcon as={FiCheckCircle} color="green.500" />
                        Auto-compounding rewards
                      </ListItem>
                      <ListItem>
                        <ListIcon as={FiCheckCircle} color="green.500" />
                        Flexible lockup periods
                      </ListItem>
                    </List>
                  </VStack>
                </CardBody>
              </Card>

              {/* Risk Management */}
              <Card shadow="lg" borderRadius="xl" overflow="hidden">
                <CardBody p={8}>
                  <VStack spacing={4} align="start">
                    <Box p={3} bg="purple.100" borderRadius="lg">
                      <Icon as={FiTarget} size="24px" color="purple.600" />
                    </Box>
                    <Text fontSize="xl" fontWeight="bold">
                      Smart Risk Management
                    </Text>
                    <Text color="gray.600">
                      Advanced risk assessment and monitoring systems protect your investments 
                      with real-time alerts and automated safety mechanisms.
                    </Text>
                    <List spacing={2} fontSize="sm">
                      <ListItem>
                        <ListIcon as={FiCheckCircle} color="green.500" />
                        Health factor monitoring
                      </ListItem>
                      <ListItem>
                        <ListIcon as={FiCheckCircle} color="green.500" />
                        Liquidation alerts
                      </ListItem>
                      <ListItem>
                        <ListIcon as={FiCheckCircle} color="green.500" />
                        Emergency withdrawal
                      </ListItem>
                    </List>
                  </VStack>
                </CardBody>
              </Card>
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>

      {/* Supported Protocols */}
      <Box py={20} bg="white">
        <Container maxW="7xl">
          <VStack spacing={12}>
            <VStack spacing={4} textAlign="center">
              <Text fontSize="3xl" fontWeight="bold">
                Integrated DeFi Protocols
              </Text>
              <Text fontSize="lg" color="gray.600">
                Seamlessly connect with leading DeFi protocols for maximum yield opportunities
              </Text>
            </VStack>

            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8}>
              <Card borderWidth={2} borderColor="blue.200" bg="blue.50">
                <CardBody textAlign="center" p={8}>
                  <VStack spacing={4}>
                    <Box p={4} bg="blue.100" borderRadius="full">
                      <Icon as={FiDollarSign} size="32px" color="blue.600" />
                    </Box>
                    <Text fontSize="xl" fontWeight="bold">Aave Protocol</Text>
                    <Text color="gray.600">
                      World's leading decentralized lending protocol with billions in TVL
                    </Text>
                    <Badge colorScheme="blue" size="lg">Integrated</Badge>
                  </VStack>
                </CardBody>
              </Card>

              <Card borderWidth={2} borderColor="green.200" bg="green.50">
                <CardBody textAlign="center" p={8}>
                  <VStack spacing={4}>
                    <Box p={4} bg="green.100" borderRadius="full">
                      <Icon as={FiUsers} size="32px" color="green.600" />
                    </Box>
                    <Text fontSize="xl" fontWeight="bold">Compound</Text>
                    <Text color="gray.600">
                      Algorithmic money markets protocol for earning interest on crypto assets
                    </Text>
                    <Badge colorScheme="green" size="lg">Integrated</Badge>
                  </VStack>
                </CardBody>
              </Card>

              <Card borderWidth={2} borderColor="purple.200" bg="purple.50">
                <CardBody textAlign="center" p={8}>
                  <VStack spacing={4}>
                    <Box p={4} bg="purple.100" borderRadius="full">
                      <Icon as={FiZap} size="32px" color="purple.600" />
                    </Box>
                    <Text fontSize="xl" fontWeight="bold">OneChain Native</Text>
                    <Text color="gray.600">
                      Our native lending protocol optimized for RWA assets with competitive rates
                    </Text>
                    <Badge colorScheme="purple" size="lg">Native</Badge>
                  </VStack>
                </CardBody>
              </Card>
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>

      {/* Benefits Section */}
      <Box py={20} bg="gray.100">
        <Container maxW="7xl">
          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={16} alignItems="center">
            <VStack spacing={8} align="start">
              <VStack spacing={4} align="start">
                <Text fontSize="3xl" fontWeight="bold">
                  Why Choose Our DeFi Integration?
                </Text>
                <Text fontSize="lg" color="gray.600">
                  Maximize the potential of your real-world assets with our comprehensive 
                  DeFi yield platform designed specifically for RWA tokens.
                </Text>
              </VStack>

              <VStack spacing={6} align="start">
                <HStack spacing={4}>
                  <Box p={2} bg="blue.100" borderRadius="lg">
                    <Icon as={FiLock} color="blue.600" />
                  </Box>
                  <VStack align="start" spacing={1}>
                    <Text fontWeight="semibold">Secure & Audited</Text>
                    <Text fontSize="sm" color="gray.600">
                      Smart contracts audited by leading security firms
                    </Text>
                  </VStack>
                </HStack>

                <HStack spacing={4}>
                  <Box p={2} bg="green.100" borderRadius="lg">
                    <Icon as={FiTrendingUp} color="green.600" />
                  </Box>
                  <VStack align="start" spacing={1}>
                    <Text fontWeight="semibold">Optimized Yields</Text>
                    <Text fontSize="sm" color="gray.600">
                      Automated strategies to maximize your returns
                    </Text>
                  </VStack>
                </HStack>

                <HStack spacing={4}>
                  <Box p={2} bg="purple.100" borderRadius="lg">
                    <Icon as={FiZap} color="purple.600" />
                  </Box>
                  <VStack align="start" spacing={1}>
                    <Text fontWeight="semibold">Instant Liquidity</Text>
                    <Text fontSize="sm" color="gray.600">
                      Access liquidity without selling your RWA assets
                    </Text>
                  </VStack>
                </HStack>

                <HStack spacing={4}>
                  <Box p={2} bg="orange.100" borderRadius="lg">
                    <Icon as={FiShield} color="orange.600" />
                  </Box>
                  <VStack align="start" spacing={1}>
                    <Text fontWeight="semibold">Risk Management</Text>
                    <Text fontSize="sm" color="gray.600">
                      Advanced monitoring and protection systems
                    </Text>
                  </VStack>
                </HStack>
              </VStack>
            </VStack>

            <Box>
              <Card shadow="2xl" borderRadius="2xl" overflow="hidden">
                <CardBody p={8}>
                  <VStack spacing={6}>
                    <Text fontSize="2xl" fontWeight="bold" textAlign="center">
                      Start Earning Today
                    </Text>
                    
                    <SimpleGrid columns={2} spacing={4} w="full">
                      <VStack>
                        <Text fontSize="2xl" fontWeight="bold" color="blue.600">15.2%</Text>
                        <Text fontSize="sm" color="gray.600">Current Avg APY</Text>
                      </VStack>
                      <VStack>
                        <Text fontSize="2xl" fontWeight="bold" color="green.600">$2.5M</Text>
                        <Text fontSize="sm" color="gray.600">Total Value Locked</Text>
                      </VStack>
                      <VStack>
                        <Text fontSize="2xl" fontWeight="bold" color="purple.600">500+</Text>
                        <Text fontSize="sm" color="gray.600">Active Stakers</Text>
                      </VStack>
                      <VStack>
                        <Text fontSize="2xl" fontWeight="bold" color="orange.600">24/7</Text>
                        <Text fontSize="sm" color="gray.600">Monitoring</Text>
                      </VStack>
                    </SimpleGrid>

                    <Divider />

                    <VStack spacing={3} w="full">
                      <Text fontSize="lg" fontWeight="semibold">Quick Start</Text>
                      <VStack spacing={2} fontSize="sm" align="start" w="full">
                        <HStack>
                          <Badge colorScheme="blue">1</Badge>
                          <Text>Connect your wallet and deposit RWA NFT</Text>
                        </HStack>
                        <HStack>
                          <Badge colorScheme="blue">2</Badge>
                          <Text>Choose lending protocol or staking pool</Text>
                        </HStack>
                        <HStack>
                          <Badge colorScheme="blue">3</Badge>
                          <Text>Start earning yield immediately</Text>
                        </HStack>
                      </VStack>
                    </VStack>

                    <Button
                      colorScheme="blue"
                      size="lg"
                      w="full"
                      rightIcon={<Icon as={FiArrowRight} />}
                      onClick={() => document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                      Launch Dashboard
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            </Box>
          </SimpleGrid>
        </Container>
      </Box>

      {/* Dashboard Section */}
      <Box id="dashboard" py={20}>
        <Container maxW="7xl">
          <VStack spacing={8}>
            <VStack spacing={4} textAlign="center">
              <Text fontSize="3xl" fontWeight="bold">
                DeFi Yield Dashboard
              </Text>
              <Text fontSize="lg" color="gray.600">
                Manage your collateral, loans, and staking positions in one unified interface
              </Text>
            </VStack>

            <Box w="full">
              <DeFiYieldDashboard />
            </Box>
          </VStack>
        </Container>
      </Box>

      {/* Technical Specifications */}
      <Box py={20} bg="white">
        <Container maxW="7xl">
          <VStack spacing={12}>
            <VStack spacing={4} textAlign="center">
              <Text fontSize="3xl" fontWeight="bold">
                Technical Specifications
              </Text>
              <Text fontSize="lg" color="gray.600">
                Built with cutting-edge technology for maximum security and efficiency
              </Text>
            </VStack>

            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={8}>
              <Card>
                <CardBody textAlign="center" p={6}>
                  <VStack spacing={3}>
                    <Icon as={FiShield} size="32px" color="blue.500" />
                    <Text fontWeight="bold">Smart Contracts</Text>
                    <Text fontSize="sm" color="gray.600">
                      Upgradeable UUPS proxy pattern with comprehensive security measures
                    </Text>
                  </VStack>
                </CardBody>
              </Card>

              <Card>
                <CardBody textAlign="center" p={6}>
                  <VStack spacing={3}>
                    <Icon as={FiZap} size="32px" color="green.500" />
                    <Text fontWeight="bold">Oracles</Text>
                    <Text fontSize="sm" color="gray.600">
                      Chainlink price feeds for real-time asset valuations and risk assessment
                    </Text>
                  </VStack>
                </CardBody>
              </Card>

              <Card>
                <CardBody textAlign="center" p={6}>
                  <VStack spacing={3}>
                    <Icon as={FiUsers} size="32px" color="purple.500" />
                    <Text fontWeight="bold">Multi-Protocol</Text>
                    <Text fontSize="sm" color="gray.600">
                      Seamless integration with Aave, Compound, and OneChain protocols
                    </Text>
                  </VStack>
                </CardBody>
              </Card>

              <Card>
                <CardBody textAlign="center" p={6}>
                  <VStack spacing={3}>
                    <Icon as={FiTarget} size="32px" color="orange.500" />
                    <Text fontWeight="bold">Risk Engine</Text>
                    <Text fontSize="sm" color="gray.600">
                      Advanced risk management with health factor monitoring and alerts
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>
    </Box>
  );
}
