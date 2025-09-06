'use client';

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Progress,
  Card,
  CardBody,
  CardHeader,
  Divider,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  FormControl,
  FormLabel,
  useToast,
  Icon,
  SimpleGrid,
  Alert,
  AlertIcon,
  Tooltip,
  Image,
} from '@chakra-ui/react';
import { 
  FiTrendingUp, 
  FiUsers, 
  FiDollarSign, 
  FiClock,
  FiInfo,
  FiStar,
  FiLock,
} from 'react-icons/fi';
import { YieldPool } from '../../services/defiYieldService';

interface YieldPoolCardProps {
  pool: YieldPool;
  userBalance?: number;
  onStake?: (poolId: string, tokenId: number) => void;
}

export default function YieldPoolCard({ 
  pool, 
  userBalance = 0,
  onStake 
}: YieldPoolCardProps) {
  const toast = useToast();
  const { isOpen: isStakeOpen, onOpen: onStakeOpen, onClose: onStakeClose } = useDisclosure();
  
  const [selectedTokenId, setSelectedTokenId] = useState<number>(1);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getPoolStatusColor = () => {
    if (!pool.isActive) return 'gray';
    if (pool.totalStaked >= pool.maxCapacity * 0.9) return 'orange';
    return 'green';
  };

  const getPoolStatus = () => {
    if (!pool.isActive) return 'Inactive';
    if (pool.totalStaked >= pool.maxCapacity) return 'Full';
    if (pool.totalStaked >= pool.maxCapacity * 0.9) return 'Nearly Full';
    return 'Active';
  };

  const getAPYColor = (apy: number) => {
    if (apy >= 20) return 'green';
    if (apy >= 15) return 'blue';
    if (apy >= 10) return 'purple';
    return 'gray';
  };

  const utilizationPercentage = (pool.totalStaked / pool.maxCapacity) * 100;

  const handleStake = () => {
    if (!pool.isActive) {
      toast({
        title: 'Pool Inactive',
        description: 'This pool is currently inactive',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (pool.totalStaked >= pool.maxCapacity) {
      toast({
        title: 'Pool Full',
        description: 'This pool has reached maximum capacity',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (selectedTokenId <= 0) {
      toast({
        title: 'Invalid Token ID',
        description: 'Please enter a valid NFT token ID',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    onStake?.(pool.id, selectedTokenId);
    onStakeClose();
    
    toast({
      title: 'Staking Initiated',
      description: `Successfully staked RWA NFT #${selectedTokenId} in ${pool.name}`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const estimatedDailyRewards = (userBalance * (pool.apy / 100)) / 365;
  const estimatedMonthlyRewards = (userBalance * (pool.apy / 100)) / 12;

  return (
    <>
      <Card 
        shadow="md" 
        borderRadius="lg" 
        overflow="hidden"
        transition="all 0.2s"
        _hover={{ shadow: 'lg', transform: 'translateY(-2px)' }}
        border="1px solid"
        borderColor="gray.200"
      >
        <CardHeader pb={2}>
          <HStack justify="space-between" align="start">
            <VStack align="start" spacing={1}>
              <HStack>
                <Text fontSize="lg" fontWeight="bold">
                  {pool.name}
                </Text>
                <Badge colorScheme={getPoolStatusColor()} variant="solid">
                  {getPoolStatus()}
                </Badge>
              </HStack>
              <Text fontSize="sm" color="gray.600">
                {pool.description}
              </Text>
            </VStack>

            <VStack align="end" spacing={1}>
              <Badge colorScheme={getAPYColor(pool.apy)} variant="solid" fontSize="md" px={3} py={1}>
                {pool.apy.toFixed(1)}% APY
              </Badge>
              <HStack>
                <Icon as={FiUsers} color="gray.500" />
                <Text fontSize="sm" color="gray.600">
                  {pool.participantCount} stakers
                </Text>
              </HStack>
            </VStack>
          </HStack>
        </CardHeader>

        <CardBody pt={0}>
          <VStack spacing={4} align="stretch">
            {/* Pool Statistics */}
            <SimpleGrid columns={2} spacing={4}>
              <Box>
                <Text fontSize="sm" color="gray.600" mb={1}>Total Value Locked</Text>
                <Text fontSize="lg" fontWeight="semibold" color="blue.600">
                  {formatCurrency(pool.totalStaked)}
                </Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.600" mb={1}>Reward Token</Text>
                <HStack>
                  <Text fontSize="lg" fontWeight="semibold" color="green.600">
                    {pool.rewardToken}
                  </Text>
                  <Badge colorScheme="green" variant="outline">
                    ERC20
                  </Badge>
                </HStack>
              </Box>
            </SimpleGrid>

            {/* Pool Utilization */}
            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontSize="sm" fontWeight="medium">Pool Utilization</Text>
                <Text fontSize="sm" fontWeight="bold">
                  {utilizationPercentage.toFixed(1)}%
                </Text>
              </HStack>
              <Progress 
                value={utilizationPercentage} 
                size="sm" 
                colorScheme={utilizationPercentage > 90 ? 'red' : utilizationPercentage > 75 ? 'yellow' : 'green'}
              />
              <HStack justify="space-between" fontSize="xs" color="gray.500" mt={1}>
                <Text>Capacity: {formatCurrency(pool.maxCapacity)}</Text>
                <Text>Available: {formatCurrency(pool.maxCapacity - pool.totalStaked)}</Text>
              </HStack>
            </Box>

            {/* Lockup Information */}
            <Box bg="gray.50" p={3} borderRadius="md">
              <HStack justify="space-between" mb={2}>
                <HStack>
                  <Icon as={FiLock} color="orange.500" />
                  <Text fontSize="sm" fontWeight="medium">Lockup Period</Text>
                </HStack>
                <Text fontSize="sm" fontWeight="bold">
                  {pool.lockupPeriod} days
                </Text>
              </HStack>
              <Text fontSize="xs" color="gray.600">
                Assets will be locked for {pool.lockupPeriod} days after staking. Early withdrawal may incur penalties.
              </Text>
            </Box>

            {/* User Position (if any) */}
            {userBalance > 0 && (
              <Box bg="blue.50" p={3} borderRadius="md" border="1px solid" borderColor="blue.200">
                <Text fontSize="sm" fontWeight="medium" mb={2} color="blue.800">
                  Your Position
                </Text>
                <SimpleGrid columns={2} spacing={2} fontSize="sm">
                  <VStack spacing={0} align="start">
                    <Text color="gray.600">Staked Value</Text>
                    <Text fontWeight="semibold" color="blue.600">
                      {formatCurrency(userBalance)}
                    </Text>
                  </VStack>
                  <VStack spacing={0} align="start">
                    <Text color="gray.600">Est. Daily Rewards</Text>
                    <Text fontWeight="semibold" color="green.600">
                      {formatCurrency(estimatedDailyRewards)}
                    </Text>
                  </VStack>
                </SimpleGrid>
              </Box>
            )}

            {/* Yield Projections */}
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>Yield Projections (per $10,000)</Text>
              <SimpleGrid columns={3} spacing={2} fontSize="xs">
                <VStack spacing={0}>
                  <Text color="gray.600">Daily</Text>
                  <Text fontWeight="semibold">
                    {formatCurrency((10000 * (pool.apy / 100)) / 365)}
                  </Text>
                </VStack>
                <VStack spacing={0}>
                  <Text color="gray.600">Monthly</Text>
                  <Text fontWeight="semibold">
                    {formatCurrency((10000 * (pool.apy / 100)) / 12)}
                  </Text>
                </VStack>
                <VStack spacing={0}>
                  <Text color="gray.600">Yearly</Text>
                  <Text fontWeight="semibold">
                    {formatCurrency(10000 * (pool.apy / 100))}
                  </Text>
                </VStack>
              </SimpleGrid>
            </Box>

            <Divider />

            {/* Pool Features */}
            <VStack spacing={2} align="stretch">
              <Text fontSize="sm" fontWeight="medium">Pool Features</Text>
              <SimpleGrid columns={2} spacing={2} fontSize="xs">
                <HStack>
                  <Icon as={FiStar} color="yellow.500" />
                  <Text>Auto-compounding</Text>
                </HStack>
                <HStack>
                  <Icon as={FiTrendingUp} color="green.500" />
                  <Text>Variable APY</Text>
                </HStack>
                <HStack>
                  <Icon as={FiDollarSign} color="blue.500" />
                  <Text>No deposit fees</Text>
                </HStack>
                <HStack>
                  <Icon as={FiClock} color="orange.500" />
                  <Text>{pool.lockupPeriod}d lockup</Text>
                </HStack>
              </SimpleGrid>
            </VStack>

            {/* Action Button */}
            <Button
              colorScheme="blue"
              size="md"
              leftIcon={<Icon as={FiTrendingUp} />}
              onClick={onStakeOpen}
              isDisabled={!pool.isActive || pool.totalStaked >= pool.maxCapacity}
            >
              {!pool.isActive ? 'Pool Inactive' : 
               pool.totalStaked >= pool.maxCapacity ? 'Pool Full' : 
               'Stake RWA NFT'}
            </Button>

            {/* Additional Info */}
            <Box fontSize="xs" color="gray.500">
              <HStack justify="space-between">
                <Text>Min. Staking Period:</Text>
                <Text>{pool.lockupPeriod} days</Text>
              </HStack>
              <HStack justify="space-between">
                <Text>Pool Created:</Text>
                <Text>{new Date(pool.createdAt).toLocaleDateString()}</Text>
              </HStack>
              <HStack justify="space-between">
                <Text>Last Updated:</Text>
                <Text>{new Date(pool.lastUpdated).toLocaleDateString()}</Text>
              </HStack>
            </Box>
          </VStack>
        </CardBody>
      </Card>

      {/* Stake Modal */}
      <Modal isOpen={isStakeOpen} onClose={onStakeClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Stake in {pool.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <Alert status="info" size="sm">
                <AlertIcon />
                <Text fontSize="sm">
                  Staking your RWA NFT will earn {pool.apy.toFixed(1)}% APY in {pool.rewardToken} tokens.
                </Text>
              </Alert>

              <FormControl>
                <FormLabel>RWA NFT Token ID</FormLabel>
                <NumberInput
                  value={selectedTokenId}
                  onChange={(_, value) => setSelectedTokenId(value)}
                  min={1}
                >
                  <NumberInputField placeholder="Enter your NFT token ID" />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Text fontSize="sm" color="gray.600" mt={1}>
                  You must own this NFT to stake it in the pool
                </Text>
              </FormControl>

              {/* Pool Details */}
              <Box w="full" p={4} bg="gray.50" borderRadius="md">
                <VStack spacing={2}>
                  <HStack justify="space-between" w="full">
                    <Text fontSize="sm">Pool APY:</Text>
                    <Text fontSize="sm" fontWeight="semibold" color="green.600">
                      {pool.apy.toFixed(1)}%
                    </Text>
                  </HStack>
                  <HStack justify="space-between" w="full">
                    <Text fontSize="sm">Lockup Period:</Text>
                    <Text fontSize="sm" fontWeight="semibold">
                      {pool.lockupPeriod} days
                    </Text>
                  </HStack>
                  <HStack justify="space-between" w="full">
                    <Text fontSize="sm">Reward Token:</Text>
                    <Text fontSize="sm" fontWeight="semibold">
                      {pool.rewardToken}
                    </Text>
                  </HStack>
                  <HStack justify="space-between" w="full">
                    <Text fontSize="sm">Pool Utilization:</Text>
                    <Text fontSize="sm" fontWeight="semibold">
                      {utilizationPercentage.toFixed(1)}%
                    </Text>
                  </HStack>
                </VStack>
              </Box>

              {/* Warning for lockup */}
              <Alert status="warning" size="sm">
                <AlertIcon />
                <Text fontSize="sm">
                  Your NFT will be locked for {pool.lockupPeriod} days. Early withdrawal may result in penalty fees.
                </Text>
              </Alert>

              <HStack w="full" spacing={3}>
                <Button variant="outline" onClick={onStakeClose} flex={1}>
                  Cancel
                </Button>
                <Button colorScheme="blue" onClick={handleStake} flex={1}>
                  Stake NFT #{selectedTokenId}
                </Button>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
