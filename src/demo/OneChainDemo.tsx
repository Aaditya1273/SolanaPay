import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Badge,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Grid,
  GridItem,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Code,
  Divider,
  List,
  ListItem,
  ListIcon,
  Icon,
} from '@chakra-ui/react';
import { CheckCircleIcon, ExternalLinkIcon, CopyIcon } from '@chakra-ui/icons';
import { OmniFlowSDK } from '../sdk';
import { SDKConfig } from '../sdk/core/types';

interface DemoStats {
  assetsCreated: number;
  transactionsExecuted: number;
  totalValue: string;
  demoUrl: string;
}

interface DemoStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  result?: any;
}

/**
 * OneChain-First Deployment Demo Component
 * Showcases OmniFlow SDK capabilities for hackathon judges
 */
export const OneChainDemo: React.FC = () => {
  const [sdk, setSDK] = useState<OmniFlowSDK | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isRunningDemo, setIsRunningDemo] = useState(false);
  const [demoStats, setDemoStats] = useState<DemoStats | null>(null);
  const [demoSteps, setDemoSteps] = useState<DemoStep[]>([
    {
      id: 'init-sdk',
      title: 'Initialize OmniFlow SDK',
      description: 'Connect to OneChain testnet and initialize providers',
      status: 'pending',
    },
    {
      id: 'create-assets',
      title: 'Create Demo RWA Assets',
      description: 'Generate real estate, renewable energy, and carbon credit assets',
      status: 'pending',
    },
    {
      id: 'create-listings',
      title: 'List Assets on Marketplace',
      description: 'Create fixed price and auction listings',
      status: 'pending',
    },
    {
      id: 'defi-operations',
      title: 'DeFi Integration Demo',
      description: 'Stake assets and demonstrate yield generation',
      status: 'pending',
    },
    {
      id: 'bridge-demo',
      title: 'Cross-Chain Bridge Demo',
      description: 'Simulate asset transfers to other chains',
      status: 'pending',
    },
    {
      id: 'analytics',
      title: 'Generate Analytics',
      description: 'Display marketplace and DeFi analytics',
      status: 'pending',
    },
  ]);

  const toast = useToast();

  const updateStepStatus = (stepId: string, status: DemoStep['status'], result?: any) => {
    setDemoSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status, result } : step
    ));
  };

  const initializeSDK = async () => {
    setIsInitializing(true);
    try {
      const config: SDKConfig = {
        chains: ['onechain'],
        preferredChain: 'onechain',
        environment: 'testnet',
        apiEndpoints: {
          rest: 'http://localhost:3001',
          websocket: 'ws://localhost:3001',
        },
        rpcEndpoints: {
          onechain: 'https://testnet-rpc.onechain.ai',
        },
      };

      const sdkInstance = new OmniFlowSDK(config);
      await sdkInstance.initialize();
      setSDK(sdkInstance);

      toast({
        title: 'SDK Initialized',
        description: 'Connected to OneChain testnet successfully',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Initialization Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const runCompleteDemo = async () => {
    if (!sdk) return;

    setIsRunningDemo(true);
    
    try {
      // Step 1: Initialize SDK (already done)
      updateStepStatus('init-sdk', 'completed');

      // Step 2: Create Demo Assets
      updateStepStatus('create-assets', 'running');
      const assets = await sdk.assets.loadDemoAssets();
      updateStepStatus('create-assets', 'completed', { count: assets.length });

      // Step 3: Create Marketplace Listings
      updateStepStatus('create-listings', 'running');
      const listings = await sdk.marketplace.loadDemoListings();
      updateStepStatus('create-listings', 'completed', { count: listings.length });

      // Step 4: DeFi Operations Demo
      updateStepStatus('defi-operations', 'running');
      const defiAnalytics = await sdk.defi.getDeFiAnalytics();
      updateStepStatus('defi-operations', 'completed', defiAnalytics);

      // Step 5: Bridge Demo
      updateStepStatus('bridge-demo', 'running');
      const bridgeTransfers = await sdk.bridge.loadDemoBridgeTransfers();
      updateStepStatus('bridge-demo', 'completed', { count: bridgeTransfers.length });

      // Step 6: Generate Analytics
      updateStepStatus('analytics', 'running');
      const marketplaceStats = await sdk.marketplace.getMarketplaceStats();
      const bridgeAnalytics = await sdk.bridge.getBridgeAnalytics();
      updateStepStatus('analytics', 'completed', { marketplace: marketplaceStats, bridge: bridgeAnalytics });

      // Get OneChain specific demo stats
      const oneChainProvider = sdk.getProvider('onechain');
      if ('simulateHackathonDemo' in oneChainProvider) {
        const stats = await (oneChainProvider as any).simulateHackathonDemo();
        setDemoStats(stats);
      }

      toast({
        title: 'Demo Completed Successfully!',
        description: 'All OneChain RWA marketplace features demonstrated',
        status: 'success',
        duration: 5000,
      });

    } catch (error) {
      toast({
        title: 'Demo Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsRunningDemo(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard',
      status: 'success',
      duration: 2000,
    });
  };

  return (
    <Box maxW="1200px" mx="auto" p={6}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Box textAlign="center">
          <Heading size="xl" mb={4}>
            🚀 OmniFlow OneChain Demo
          </Heading>
          <Text fontSize="lg" color="gray.600">
            Complete RWA Marketplace SDK demonstration for hackathon judges
          </Text>
          <Badge colorScheme="blue" fontSize="md" mt={2}>
            OneChain-First Deployment
          </Badge>
        </Box>

        {/* Quick Stats */}
        {demoStats && (
          <Card>
            <CardHeader>
              <Heading size="md">Demo Results</Heading>
            </CardHeader>
            <CardBody>
              <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={6}>
                <Stat>
                  <StatLabel>Assets Created</StatLabel>
                  <StatNumber>{demoStats.assetsCreated}</StatNumber>
                  <StatHelpText>
                    <StatArrow type="increase" />
                    Real-world assets tokenized
                  </StatHelpText>
                </Stat>
                <Stat>
                  <StatLabel>Transactions</StatLabel>
                  <StatNumber>{demoStats.transactionsExecuted}</StatNumber>
                  <StatHelpText>
                    <StatArrow type="increase" />
                    On OneChain testnet
                  </StatHelpText>
                </Stat>
                <Stat>
                  <StatLabel>Total Value</StatLabel>
                  <StatNumber>${demoStats.totalValue}M</StatNumber>
                  <StatHelpText>
                    <StatArrow type="increase" />
                    Asset portfolio value
                  </StatHelpText>
                </Stat>
              </Grid>
              <Divider my={4} />
              <HStack>
                <Text fontWeight="bold">Explorer:</Text>
                <Code>{demoStats.demoUrl}</Code>
                <Button
                  size="sm"
                  leftIcon={<CopyIcon />}
                  onClick={() => copyToClipboard(demoStats.demoUrl)}
                >
                  Copy
                </Button>
                <Button
                  size="sm"
                  leftIcon={<ExternalLinkIcon />}
                  as="a"
                  href={demoStats.demoUrl}
                  target="_blank"
                >
                  View
                </Button>
              </HStack>
            </CardBody>
          </Card>
        )}

        {/* Control Panel */}
        <Card>
          <CardHeader>
            <Heading size="md">Demo Control Panel</Heading>
          </CardHeader>
          <CardBody>
            <HStack spacing={4}>
              {!sdk ? (
                <Button
                  colorScheme="blue"
                  onClick={initializeSDK}
                  isLoading={isInitializing}
                  loadingText="Initializing..."
                  size="lg"
                >
                  Initialize OneChain SDK
                </Button>
              ) : (
                <Button
                  colorScheme="green"
                  onClick={runCompleteDemo}
                  isLoading={isRunningDemo}
                  loadingText="Running Demo..."
                  size="lg"
                  isDisabled={isRunningDemo}
                >
                  Run Complete Demo
                </Button>
              )}
              
              {sdk && (
                <Alert status="success" variant="subtle">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>SDK Ready!</AlertTitle>
                    <AlertDescription>
                      Connected to OneChain testnet
                    </AlertDescription>
                  </Box>
                </Alert>
              )}
            </HStack>
          </CardBody>
        </Card>

        {/* Demo Steps Progress */}
        <Card>
          <CardHeader>
            <Heading size="md">Demo Progress</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              {demoSteps.map((step, index) => (
                <Box key={step.id}>
                  <HStack justify="space-between" mb={2}>
                    <HStack>
                      <Text fontWeight="bold">{index + 1}.</Text>
                      <Text fontWeight="semibold">{step.title}</Text>
                      {step.status === 'completed' && (
                        <Icon as={CheckCircleIcon} color="green.500" />
                      )}
                      {step.status === 'running' && <Spinner size="sm" />}
                    </HStack>
                    <Badge
                      colorScheme={
                        step.status === 'completed' ? 'green' :
                        step.status === 'running' ? 'blue' :
                        step.status === 'error' ? 'red' : 'gray'
                      }
                    >
                      {step.status}
                    </Badge>
                  </HStack>
                  <Text color="gray.600" fontSize="sm" mb={2}>
                    {step.description}
                  </Text>
                  
                  {step.result && (
                    <Box bg="gray.50" p={3} borderRadius="md" fontSize="sm">
                      <Code>{JSON.stringify(step.result, null, 2)}</Code>
                    </Box>
                  )}
                  
                  {index < demoSteps.length - 1 && <Divider mt={4} />}
                </Box>
              ))}
            </VStack>
          </CardBody>
        </Card>

        {/* Technical Features */}
        <Card>
          <CardHeader>
            <Heading size="md">🛠️ Technical Features Demonstrated</Heading>
          </CardHeader>
          <CardBody>
            <Grid templateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap={6}>
              <Box>
                <Heading size="sm" mb={3}>SDK Architecture</Heading>
                <List spacing={2}>
                  <ListItem>
                    <ListIcon as={CheckCircleIcon} color="green.500" />
                    Modular chain providers
                  </ListItem>
                  <ListItem>
                    <ListIcon as={CheckCircleIcon} color="green.500" />
                    OneChain-first deployment
                  </ListItem>
                  <ListItem>
                    <ListIcon as={CheckCircleIcon} color="green.500" />
                    Cross-chain compatibility
                  </ListItem>
                  <ListItem>
                    <ListIcon as={CheckCircleIcon} color="green.500" />
                    Event-driven architecture
                  </ListItem>
                </List>
              </Box>

              <Box>
                <Heading size="sm" mb={3}>RWA Marketplace</Heading>
                <List spacing={2}>
                  <ListItem>
                    <ListIcon as={CheckCircleIcon} color="green.500" />
                    Asset tokenization
                  </ListItem>
                  <ListItem>
                    <ListIcon as={CheckCircleIcon} color="green.500" />
                    Fixed price & auction listings
                  </ListItem>
                  <ListItem>
                    <ListIcon as={CheckCircleIcon} color="green.500" />
                    Fractional ownership
                  </ListItem>
                  <ListItem>
                    <ListIcon as={CheckCircleIcon} color="green.500" />
                    Compliance integration
                  </ListItem>
                </List>
              </Box>

              <Box>
                <Heading size="sm" mb={3}>DeFi Integration</Heading>
                <List spacing={2}>
                  <ListItem>
                    <ListIcon as={CheckCircleIcon} color="green.500" />
                    RWA asset staking
                  </ListItem>
                  <ListItem>
                    <ListIcon as={CheckCircleIcon} color="green.500" />
                    Collateral lending
                  </ListItem>
                  <ListItem>
                    <ListIcon as={CheckCircleIcon} color="green.500" />
                    Yield farming strategies
                  </ListItem>
                  <ListItem>
                    <ListIcon as={CheckCircleIcon} color="green.500" />
                    Reward distribution
                  </ListItem>
                </List>
              </Box>

              <Box>
                <Heading size="sm" mb={3}>Cross-Chain Bridge</Heading>
                <List spacing={2}>
                  <ListItem>
                    <ListIcon as={CheckCircleIcon} color="green.500" />
                    Multi-chain asset transfers
                  </ListItem>
                  <ListItem>
                    <ListIcon as={CheckCircleIcon} color="green.500" />
                    Bridge cost estimation
                  </ListItem>
                  <ListItem>
                    <ListIcon as={CheckCircleIcon} color="green.500" />
                    Transfer monitoring
                  </ListItem>
                  <ListItem>
                    <ListIcon as={CheckCircleIcon} color="green.500" />
                    Security validations
                  </ListItem>
                </List>
              </Box>

              <Box>
                <Heading size="sm" mb={3}>API Ecosystem</Heading>
                <List spacing={2}>
                  <ListItem>
                    <ListIcon as={CheckCircleIcon} color="green.500" />
                    REST API endpoints
                  </ListItem>
                  <ListItem>
                    <ListIcon as={CheckCircleIcon} color="green.500" />
                    GraphQL with subscriptions
                  </ListItem>
                  <ListItem>
                    <ListIcon as={CheckCircleIcon} color="green.500" />
                    Real-time event streaming
                  </ListItem>
                  <ListItem>
                    <ListIcon as={CheckCircleIcon} color="green.500" />
                    Swagger documentation
                  </ListItem>
                </List>
              </Box>

              <Box>
                <Heading size="sm" mb={3}>Developer Experience</Heading>
                <List spacing={2}>
                  <ListItem>
                    <ListIcon as={CheckCircleIcon} color="green.500" />
                    TypeScript SDK
                  </ListItem>
                  <ListItem>
                    <ListIcon as={CheckCircleIcon} color="green.500" />
                    Comprehensive error handling
                  </ListItem>
                  <ListItem>
                    <ListIcon as={CheckCircleIcon} color="green.500" />
                    Plugin architecture
                  </ListItem>
                  <ListItem>
                    <ListIcon as={CheckCircleIcon} color="green.500" />
                    Demo data generators
                  </ListItem>
                </List>
              </Box>
            </Grid>
          </CardBody>
        </Card>

        {/* API Endpoints */}
        <Card>
          <CardHeader>
            <Heading size="md">🔗 API Endpoints</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={3} align="stretch">
              <HStack justify="space-between">
                <Text fontWeight="semibold">REST API:</Text>
                <HStack>
                  <Code>http://localhost:3001/api</Code>
                  <Button size="sm" leftIcon={<ExternalLinkIcon />} as="a" href="http://localhost:3001/api/docs" target="_blank">
                    Docs
                  </Button>
                </HStack>
              </HStack>
              
              <HStack justify="space-between">
                <Text fontWeight="semibold">GraphQL:</Text>
                <HStack>
                  <Code>http://localhost:4000/graphql</Code>
                  <Button size="sm" leftIcon={<ExternalLinkIcon />} as="a" href="http://localhost:4000/graphql" target="_blank">
                    Playground
                  </Button>
                </HStack>
              </HStack>

              <HStack justify="space-between">
                <Text fontWeight="semibold">WebSocket:</Text>
                <Code>ws://localhost:4000/graphql</Code>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        {/* Footer */}
        <Box textAlign="center" py={8}>
          <Text color="gray.600">
            🏆 Built for hackathon judges to showcase OmniFlow's comprehensive RWA marketplace capabilities
          </Text>
          <Text fontSize="sm" color="gray.500" mt={2}>
            OneChain-first • Cross-chain ready • API-first architecture
          </Text>
        </Box>
      </VStack>
    </Box>
  );
};
