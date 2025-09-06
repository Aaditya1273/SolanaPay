'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Card,
  CardBody,
  CardHeader,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  useToast,
  Icon,
  Divider,
  Alert,
  AlertIcon,
  Spinner,
  Select,
  Input,
  InputGroup,
  InputLeftElement,
  Flex,
  Spacer,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
} from '@chakra-ui/react';
import { 
  FiTrendingUp, 
  FiDollarSign, 
  FiShield, 
  FiUsers,
  FiRefreshCw,
  FiSearch,
  FiFilter,
  FiPlus,
  FiAlertTriangle,
} from 'react-icons/fi';
import { 
  defiYieldService,
  CollateralAsset,
  StakedAsset,
  YieldPool,
  LendingPool,
  UserPosition,
} from '../../services/defiYieldService';
import CollateralCard from './CollateralCard';
import StakingCard from './StakingCard';
import YieldPoolCard from './YieldPoolCard';

export default function DeFiYieldDashboard() {
  const toast = useToast();
  const { isOpen: isDepositOpen, onOpen: onDepositOpen, onClose: onDepositClose } = useDisclosure();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [userPositions, setUserPositions] = useState<UserPosition[]>([]);
  const [collateralAssets, setCollateralAssets] = useState<CollateralAsset[]>([]);
  const [stakedAssets, setStakedAssets] = useState<StakedAsset[]>([]);
  const [yieldPools, setYieldPools] = useState<YieldPool[]>([]);
  const [lendingPools, setLendingPools] = useState<LendingPool[]>([]);
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [protocolFilter, setProtocolFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // New deposit form
  const [newDepositTokenId, setNewDepositTokenId] = useState<number>(0);
  const [newDepositProtocol, setNewDepositProtocol] = useState('aave');

  // Load data on component mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [positions, collateral, staked, pools, lending] = await Promise.all([
        defiYieldService.getUserPositions('user123'),
        defiYieldService.getUserCollateral('user123'),
        defiYieldService.getUserStakedAssets('user123'),
        defiYieldService.getYieldPools(),
        defiYieldService.getLendingPools(),
      ]);
      
      setUserPositions(positions);
      setCollateralAssets(collateral);
      setStakedAssets(staked);
      setYieldPools(pools);
      setLendingPools(lending);
    } catch (error) {
      toast({
        title: 'Error Loading Data',
        description: 'Failed to load dashboard data',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate dashboard metrics
  const totalCollateralValue = collateralAssets.reduce((sum, asset) => sum + asset.collateralValue, 0);
  const totalLoanAmount = collateralAssets.reduce((sum, asset) => sum + asset.loanAmount, 0);
  const totalStakedValue = stakedAssets.reduce((sum, asset) => sum + asset.stakedAmount, 0);
  const totalRewards = stakedAssets.reduce((sum, asset) => sum + asset.accumulatedRewards, 0);
  const averageHealthFactor = collateralAssets.length > 0 
    ? collateralAssets.reduce((sum, asset) => sum + asset.healthFactor, 0) / collateralAssets.length 
    : 0;

  // Risk assessment
  const atRiskPositions = collateralAssets.filter(asset => asset.healthFactor < 1.5).length;
  const liquidationRiskPositions = collateralAssets.filter(asset => asset.healthFactor < 1.2).length;

  // Filter functions
  const filteredCollateral = collateralAssets.filter(asset => {
    const matchesSearch = asset.tokenId.toString().includes(searchTerm);
    const matchesProtocol = protocolFilter === 'all' || asset.lendingProtocol === protocolFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && asset.isActive) ||
      (statusFilter === 'inactive' && !asset.isActive) ||
      (statusFilter === 'at-risk' && asset.healthFactor < 1.5);
    
    return matchesSearch && matchesProtocol && matchesStatus;
  });

  const filteredStaked = stakedAssets.filter(asset => {
    const matchesSearch = asset.tokenId.toString().includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && asset.isActive) ||
      (statusFilter === 'inactive' && !asset.isActive);
    
    return matchesSearch && matchesStatus;
  });

  // Event handlers
  const handleDepositCollateral = async () => {
    if (newDepositTokenId <= 0) {
      toast({
        title: 'Invalid Token ID',
        description: 'Please enter a valid NFT token ID',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      await defiYieldService.depositCollateral('user123', newDepositTokenId, newDepositProtocol);
      toast({
        title: 'Collateral Deposited',
        description: `Successfully deposited RWA NFT #${newDepositTokenId}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onDepositClose();
      loadDashboardData();
    } catch (error) {
      toast({
        title: 'Deposit Failed',
        description: 'Failed to deposit collateral',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleBorrow = async (collateralId: string, amount: number, asset: string) => {
    try {
      await defiYieldService.borrowAgainstCollateral('user123', collateralId, amount, asset);
      loadDashboardData();
    } catch (error) {
      toast({
        title: 'Borrowing Failed',
        description: 'Failed to process loan',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleRepay = async (collateralId: string, amount: number) => {
    try {
      // Simulate repayment logic
      toast({
        title: 'Repayment Processed',
        description: 'Loan repayment successful',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      loadDashboardData();
    } catch (error) {
      toast({
        title: 'Repayment Failed',
        description: 'Failed to process repayment',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleStakeAsset = async (poolId: string, tokenId: number) => {
    try {
      await defiYieldService.stakeAsset('user123', tokenId, poolId);
      loadDashboardData();
    } catch (error) {
      toast({
        title: 'Staking Failed',
        description: 'Failed to stake asset',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleUnstake = async (stakeId: string) => {
    try {
      await defiYieldService.unstakeAsset('user123', stakeId);
      loadDashboardData();
    } catch (error) {
      toast({
        title: 'Unstaking Failed',
        description: 'Failed to unstake asset',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleClaimRewards = async (stakeId: string) => {
    try {
      await defiYieldService.claimRewards('user123', stakeId);
      loadDashboardData();
    } catch (error) {
      toast({
        title: 'Claim Failed',
        description: 'Failed to claim rewards',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="400px">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text>Loading DeFi Yield Dashboard...</Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box p={6} maxW="7xl" mx="auto">
      {/* Header */}
      <VStack spacing={6} align="stretch">
        <Box>
          <HStack justify="space-between" align="start" mb={4}>
            <VStack align="start" spacing={1}>
              <Text fontSize="3xl" fontWeight="bold">
                DeFi Yield Dashboard
              </Text>
              <Text color="gray.600">
                Manage your RWA collateral, loans, and staking positions
              </Text>
            </VStack>
            <HStack>
              <Button
                leftIcon={<Icon as={FiRefreshCw} />}
                onClick={loadDashboardData}
                variant="outline"
              >
                Refresh
              </Button>
              <Button
                leftIcon={<Icon as={FiPlus} />}
                colorScheme="blue"
                onClick={onDepositOpen}
              >
                Deposit Collateral
              </Button>
            </HStack>
          </HStack>

          {/* Risk Alerts */}
          {liquidationRiskPositions > 0 && (
            <Alert status="error" mb={4}>
              <AlertIcon />
              <Text>
                <strong>Liquidation Risk:</strong> {liquidationRiskPositions} position(s) at risk of liquidation. 
                Take action immediately.
              </Text>
            </Alert>
          )}
          {atRiskPositions > liquidationRiskPositions && (
            <Alert status="warning" mb={4}>
              <AlertIcon />
              <Text>
                <strong>High Risk:</strong> {atRiskPositions - liquidationRiskPositions} position(s) require attention.
              </Text>
            </Alert>
          )}
        </Box>

        {/* Key Metrics */}
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={6}>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Total Collateral</StatLabel>
                <StatNumber color="blue.600">{formatCurrency(totalCollateralValue)}</StatNumber>
                <StatHelpText>
                  <StatArrow type="increase" />
                  Across {collateralAssets.length} assets
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Total Borrowed</StatLabel>
                <StatNumber color="red.600">{formatCurrency(totalLoanAmount)}</StatNumber>
                <StatHelpText>
                  {totalCollateralValue > 0 && 
                    `${((totalLoanAmount / totalCollateralValue) * 100).toFixed(1)}% utilization`
                  }
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Staked Value</StatLabel>
                <StatNumber color="green.600">{formatCurrency(totalStakedValue)}</StatNumber>
                <StatHelpText>
                  <StatArrow type="increase" />
                  {stakedAssets.length} staked assets
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Total Rewards</StatLabel>
                <StatNumber color="purple.600">{formatCurrency(totalRewards)}</StatNumber>
                <StatHelpText>
                  Accumulated earnings
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Health Factor Overview */}
        <Card>
          <CardHeader>
            <Text fontSize="lg" fontWeight="semibold">Portfolio Health</Text>
          </CardHeader>
          <CardBody>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
              <VStack>
                <Icon as={FiShield} size="24px" color={averageHealthFactor >= 2 ? 'green.500' : averageHealthFactor >= 1.5 ? 'yellow.500' : 'red.500'} />
                <Text fontSize="2xl" fontWeight="bold" color={averageHealthFactor >= 2 ? 'green.600' : averageHealthFactor >= 1.5 ? 'yellow.600' : 'red.600'}>
                  {averageHealthFactor.toFixed(2)}
                </Text>
                <Text fontSize="sm" color="gray.600">Average Health Factor</Text>
              </VStack>
              <VStack>
                <Icon as={FiAlertTriangle} size="24px" color={atRiskPositions > 0 ? 'orange.500' : 'green.500'} />
                <Text fontSize="2xl" fontWeight="bold" color={atRiskPositions > 0 ? 'orange.600' : 'green.600'}>
                  {atRiskPositions}
                </Text>
                <Text fontSize="sm" color="gray.600">At-Risk Positions</Text>
              </VStack>
              <VStack>
                <Icon as={FiTrendingUp} size="24px" color="blue.500" />
                <Text fontSize="2xl" fontWeight="bold" color="blue.600">
                  {((totalStakedValue / (totalCollateralValue + totalStakedValue)) * 100).toFixed(1)}%
                </Text>
                <Text fontSize="sm" color="gray.600">Staking Allocation</Text>
              </VStack>
            </SimpleGrid>
          </CardBody>
        </Card>

        {/* Main Content Tabs */}
        <Tabs variant="enclosed" colorScheme="blue">
          <TabList>
            <Tab>Collateral & Loans ({collateralAssets.length})</Tab>
            <Tab>Staking ({stakedAssets.length})</Tab>
            <Tab>Yield Pools ({yieldPools.length})</Tab>
            <Tab>Analytics</Tab>
          </TabList>

          <TabPanels>
            {/* Collateral & Loans Tab */}
            <TabPanel px={0}>
              <VStack spacing={4} align="stretch">
                {/* Filters */}
                <Card>
                  <CardBody>
                    <HStack spacing={4} wrap="wrap">
                      <InputGroup maxW="300px">
                        <InputLeftElement>
                          <Icon as={FiSearch} color="gray.400" />
                        </InputLeftElement>
                        <Input
                          placeholder="Search by token ID..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </InputGroup>
                      
                      <Select
                        maxW="200px"
                        value={protocolFilter}
                        onChange={(e) => setProtocolFilter(e.target.value)}
                      >
                        <option value="all">All Protocols</option>
                        <option value="aave">Aave</option>
                        <option value="compound">Compound</option>
                        <option value="onechain">OneChain</option>
                      </Select>
                      
                      <Select
                        maxW="200px"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="at-risk">At Risk</option>
                      </Select>
                    </HStack>
                  </CardBody>
                </Card>

                {/* Collateral Assets Grid */}
                {filteredCollateral.length > 0 ? (
                  <SimpleGrid columns={{ base: 1, lg: 2, xl: 3 }} spacing={6}>
                    {filteredCollateral.map((asset) => (
                      <CollateralCard
                        key={asset.id}
                        collateral={asset}
                        onBorrow={handleBorrow}
                        onRepay={handleRepay}
                        onWithdraw={() => loadDashboardData()}
                        onAddCollateral={() => loadDashboardData()}
                      />
                    ))}
                  </SimpleGrid>
                ) : (
                  <Card>
                    <CardBody textAlign="center" py={12}>
                      <Icon as={FiDollarSign} size="48px" color="gray.400" mb={4} />
                      <Text fontSize="lg" color="gray.600" mb={2}>
                        No collateral assets found
                      </Text>
                      <Text color="gray.500" mb={4}>
                        Deposit your RWA NFTs as collateral to start earning yield
                      </Text>
                      <Button colorScheme="blue" onClick={onDepositOpen}>
                        Deposit Collateral
                      </Button>
                    </CardBody>
                  </Card>
                )}
              </VStack>
            </TabPanel>

            {/* Staking Tab */}
            <TabPanel px={0}>
              <VStack spacing={4} align="stretch">
                {/* Staked Assets Grid */}
                {filteredStaked.length > 0 ? (
                  <SimpleGrid columns={{ base: 1, lg: 2, xl: 3 }} spacing={6}>
                    {filteredStaked.map((asset) => (
                      <StakingCard
                        key={asset.id}
                        stakedAsset={asset}
                        onUnstake={handleUnstake}
                        onClaimRewards={handleClaimRewards}
                        onCompoundRewards={() => loadDashboardData()}
                        onEmergencyWithdraw={() => loadDashboardData()}
                      />
                    ))}
                  </SimpleGrid>
                ) : (
                  <Card>
                    <CardBody textAlign="center" py={12}>
                      <Icon as={FiTrendingUp} size="48px" color="gray.400" mb={4} />
                      <Text fontSize="lg" color="gray.600" mb={2}>
                        No staked assets found
                      </Text>
                      <Text color="gray.500" mb={4}>
                        Stake your RWA NFTs in yield pools to earn rewards
                      </Text>
                      <Button colorScheme="green" onClick={() => document.getElementById('yield-pools-tab')?.click()}>
                        View Yield Pools
                      </Button>
                    </CardBody>
                  </Card>
                )}
              </VStack>
            </TabPanel>

            {/* Yield Pools Tab */}
            <TabPanel px={0}>
              <VStack spacing={4} align="stretch">
                {/* Yield Pools Grid */}
                <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                  {yieldPools.map((pool) => (
                    <YieldPoolCard
                      key={pool.id}
                      pool={pool}
                      userBalance={stakedAssets
                        .filter(asset => asset.poolId === pool.id)
                        .reduce((sum, asset) => sum + asset.stakedAmount, 0)
                      }
                      onStake={handleStakeAsset}
                    />
                  ))}
                </SimpleGrid>
              </VStack>
            </TabPanel>

            {/* Analytics Tab */}
            <TabPanel px={0}>
              <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                <Card>
                  <CardHeader>
                    <Text fontSize="lg" fontWeight="semibold">Portfolio Distribution</Text>
                  </CardHeader>
                  <CardBody>
                    <VStack spacing={4}>
                      <HStack justify="space-between" w="full">
                        <Text>Collateral Value</Text>
                        <Text fontWeight="semibold">{formatCurrency(totalCollateralValue)}</Text>
                      </HStack>
                      <HStack justify="space-between" w="full">
                        <Text>Staked Value</Text>
                        <Text fontWeight="semibold">{formatCurrency(totalStakedValue)}</Text>
                      </HStack>
                      <HStack justify="space-between" w="full">
                        <Text>Total Borrowed</Text>
                        <Text fontWeight="semibold" color="red.600">{formatCurrency(totalLoanAmount)}</Text>
                      </HStack>
                      <HStack justify="space-between" w="full">
                        <Text>Net Position</Text>
                        <Text fontWeight="bold" color="green.600">
                          {formatCurrency(totalCollateralValue + totalStakedValue - totalLoanAmount)}
                        </Text>
                      </HStack>
                    </VStack>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <Text fontSize="lg" fontWeight="semibold">Risk Metrics</Text>
                  </CardHeader>
                  <CardBody>
                    <VStack spacing={4}>
                      <HStack justify="space-between" w="full">
                        <Text>Average Health Factor</Text>
                        <Badge colorScheme={averageHealthFactor >= 2 ? 'green' : averageHealthFactor >= 1.5 ? 'yellow' : 'red'}>
                          {averageHealthFactor.toFixed(2)}
                        </Badge>
                      </HStack>
                      <HStack justify="space-between" w="full">
                        <Text>Utilization Rate</Text>
                        <Text fontWeight="semibold">
                          {totalCollateralValue > 0 ? ((totalLoanAmount / totalCollateralValue) * 100).toFixed(1) : 0}%
                        </Text>
                      </HStack>
                      <HStack justify="space-between" w="full">
                        <Text>At-Risk Positions</Text>
                        <Badge colorScheme={atRiskPositions > 0 ? 'red' : 'green'}>
                          {atRiskPositions}
                        </Badge>
                      </HStack>
                      <HStack justify="space-between" w="full">
                        <Text>Total Rewards Earned</Text>
                        <Text fontWeight="semibold" color="green.600">
                          {formatCurrency(totalRewards)}
                        </Text>
                      </HStack>
                    </VStack>
                  </CardBody>
                </Card>
              </SimpleGrid>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>

      {/* Deposit Collateral Modal */}
      <Modal isOpen={isDepositOpen} onClose={onDepositClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Deposit RWA Collateral</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>RWA NFT Token ID</FormLabel>
                <NumberInput
                  value={newDepositTokenId}
                  onChange={(_, value) => setNewDepositTokenId(value)}
                  min={1}
                >
                  <NumberInputField placeholder="Enter your NFT token ID" />
                </NumberInput>
              </FormControl>

              <FormControl>
                <FormLabel>Lending Protocol</FormLabel>
                <Select
                  value={newDepositProtocol}
                  onChange={(e) => setNewDepositProtocol(e.target.value)}
                >
                  <option value="aave">Aave</option>
                  <option value="compound">Compound</option>
                  <option value="onechain">OneChain Native</option>
                </Select>
              </FormControl>

              <Alert status="info" size="sm">
                <AlertIcon />
                <Text fontSize="sm">
                  Your RWA NFT will be used as collateral. You can borrow against its value once deposited.
                </Text>
              </Alert>

              <HStack w="full" spacing={3}>
                <Button variant="outline" onClick={onDepositClose} flex={1}>
                  Cancel
                </Button>
                <Button colorScheme="blue" onClick={handleDepositCollateral} flex={1}>
                  Deposit Collateral
                </Button>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
