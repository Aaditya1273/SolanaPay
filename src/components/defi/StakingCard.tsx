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
} from '@chakra-ui/react';
import { 
  FiTrendingUp, 
  FiDollarSign, 
  FiClock, 
  FiGift,
  FiMinus,
  FiRefreshCw,
  FiLock,
  FiUnlock,
} from 'react-icons/fi';
import { StakedAsset } from '../../services/defiYieldService';

interface StakingCardProps {
  stakedAsset: StakedAsset;
  onUnstake?: (stakeId: string) => void;
  onClaimRewards?: (stakeId: string) => void;
  onCompoundRewards?: (stakeId: string) => void;
  onEmergencyWithdraw?: (stakeId: string) => void;
}

export default function StakingCard({ 
  stakedAsset, 
  onUnstake, 
  onClaimRewards, 
  onCompoundRewards, 
  onEmergencyWithdraw 
}: StakingCardProps) {
  const toast = useToast();
  const { isOpen: isUnstakeOpen, onOpen: onUnstakeOpen, onClose: onUnstakeClose } = useDisclosure();
  const { isOpen: isEmergencyOpen, onOpen: onEmergencyOpen, onClose: onEmergencyClose } = useDisclosure();
  
  const [unstakeAmount, setUnstakeAmount] = useState<number>(stakedAsset.stakedAmount);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDuration = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  const calculatePendingRewards = () => {
    const stakingDuration = Date.now() - new Date(stakedAsset.lastRewardClaim).getTime();
    const annualRewards = stakedAsset.stakedAmount * (stakedAsset.yieldRate / 100);
    const pendingRewards = (annualRewards * stakingDuration) / (365 * 24 * 60 * 60 * 1000);
    return Math.max(0, pendingRewards);
  };

  const calculateLockupRemaining = () => {
    const stakingTime = new Date(stakedAsset.stakingTime).getTime();
    const lockupPeriod = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    const lockupEnd = stakingTime + lockupPeriod;
    const now = Date.now();
    
    if (now >= lockupEnd) return 0;
    
    const remaining = lockupEnd - now;
    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    
    return { days, hours, isLocked: true };
  };

  const pendingRewards = calculatePendingRewards();
  const lockupInfo = calculateLockupRemaining();
  const isLocked = typeof lockupInfo === 'object' && lockupInfo.isLocked;

  const getYieldColor = (apy: number) => {
    if (apy >= 15) return 'green';
    if (apy >= 10) return 'blue';
    if (apy >= 5) return 'yellow';
    return 'gray';
  };

  const handleUnstake = () => {
    if (isLocked) {
      toast({
        title: 'Asset Locked',
        description: 'Cannot unstake during lockup period',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    onUnstake?.(stakedAsset.id);
    onUnstakeClose();
    
    toast({
      title: 'Unstaking Initiated',
      description: 'Your asset has been unstaked and rewards claimed',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleClaimRewards = () => {
    if (pendingRewards <= 0) {
      toast({
        title: 'No Rewards',
        description: 'No rewards available to claim',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    onClaimRewards?.(stakedAsset.id);
    
    toast({
      title: 'Rewards Claimed',
      description: `Successfully claimed ${formatCurrency(pendingRewards)} in rewards`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleCompoundRewards = () => {
    if (pendingRewards <= 0) {
      toast({
        title: 'No Rewards',
        description: 'No rewards available to compound',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    onCompoundRewards?.(stakedAsset.id);
    
    toast({
      title: 'Rewards Compounded',
      description: `Successfully compounded ${formatCurrency(pendingRewards)} into staking`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleEmergencyWithdraw = () => {
    onEmergencyWithdraw?.(stakedAsset.id);
    onEmergencyClose();
    
    toast({
      title: 'Emergency Withdrawal',
      description: 'Asset withdrawn without rewards',
      status: 'warning',
      duration: 3000,
      isClosable: true,
    });
  };

  return (
    <>
      <Card 
        shadow="md" 
        borderRadius="lg" 
        overflow="hidden"
        transition="all 0.2s"
        _hover={{ shadow: 'lg', transform: 'translateY(-2px)' }}
        border={isLocked ? "2px solid" : "1px solid"}
        borderColor={isLocked ? "orange.200" : "gray.200"}
      >
        <CardHeader pb={2}>
          <HStack justify="space-between" align="start">
            <VStack align="start" spacing={1}>
              <HStack>
                <Text fontSize="lg" fontWeight="bold">
                  RWA NFT #{stakedAsset.tokenId}
                </Text>
                <Badge colorScheme={stakedAsset.isActive ? 'green' : 'gray'}>
                  {stakedAsset.isActive ? 'Staking' : 'Inactive'}
                </Badge>
                {isLocked && (
                  <Badge colorScheme="orange" variant="solid">
                    <Icon as={FiLock} mr={1} />
                    Locked
                  </Badge>
                )}
              </HStack>
              <Text fontSize="sm" color="gray.600">
                Pool: {stakedAsset.poolId.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Text>
            </VStack>

            <VStack align="end" spacing={1}>
              <Badge colorScheme={getYieldColor(stakedAsset.yieldRate)} variant="solid">
                {stakedAsset.yieldRate.toFixed(1)}% APY
              </Badge>
              <Text fontSize="sm" color="gray.600">
                Staked: {formatDuration(stakedAsset.stakingTime)}
              </Text>
            </VStack>
          </HStack>
        </CardHeader>

        <CardBody pt={0}>
          <VStack spacing={4} align="stretch">
            {/* Key Metrics */}
            <SimpleGrid columns={2} spacing={4}>
              <Box>
                <Text fontSize="sm" color="gray.600" mb={1}>Staked Amount</Text>
                <Text fontSize="lg" fontWeight="semibold" color="blue.600">
                  {formatCurrency(stakedAsset.stakedAmount)}
                </Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.600" mb={1}>Total Rewards</Text>
                <Text fontSize="lg" fontWeight="semibold" color="green.600">
                  {formatCurrency(stakedAsset.accumulatedRewards)}
                </Text>
              </Box>
            </SimpleGrid>

            {/* Pending Rewards */}
            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontSize="sm" fontWeight="medium">Pending Rewards</Text>
                <HStack>
                  <Icon as={FiGift} color="green.500" />
                  <Text fontSize="sm" fontWeight="bold" color="green.600">
                    {formatCurrency(pendingRewards)}
                  </Text>
                </HStack>
              </HStack>
              <Progress 
                value={Math.min((pendingRewards / (stakedAsset.stakedAmount * 0.01)) * 100, 100)} 
                size="sm" 
                colorScheme="green"
                bg="gray.100"
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                Last claimed: {formatDuration(stakedAsset.lastRewardClaim)}
              </Text>
            </Box>

            {/* Lockup Status */}
            {isLocked && typeof lockupInfo === 'object' && (
              <Alert status="warning" size="sm" borderRadius="md">
                <AlertIcon />
                <Box>
                  <Text fontSize="sm" fontWeight="medium">Lockup Period Active</Text>
                  <Text fontSize="xs">
                    Remaining: {lockupInfo.days} days, {lockupInfo.hours} hours
                  </Text>
                </Box>
              </Alert>
            )}

            {/* Yield Projection */}
            <Box bg="gray.50" p={3} borderRadius="md">
              <Text fontSize="sm" fontWeight="medium" mb={2}>Yield Projection</Text>
              <SimpleGrid columns={3} spacing={2} fontSize="xs">
                <VStack spacing={0}>
                  <Text color="gray.600">Daily</Text>
                  <Text fontWeight="semibold">
                    {formatCurrency(stakedAsset.stakedAmount * (stakedAsset.yieldRate / 100) / 365)}
                  </Text>
                </VStack>
                <VStack spacing={0}>
                  <Text color="gray.600">Monthly</Text>
                  <Text fontWeight="semibold">
                    {formatCurrency(stakedAsset.stakedAmount * (stakedAsset.yieldRate / 100) / 12)}
                  </Text>
                </VStack>
                <VStack spacing={0}>
                  <Text color="gray.600">Yearly</Text>
                  <Text fontWeight="semibold">
                    {formatCurrency(stakedAsset.stakedAmount * (stakedAsset.yieldRate / 100))}
                  </Text>
                </VStack>
              </SimpleGrid>
            </Box>

            <Divider />

            {/* Action Buttons */}
            <SimpleGrid columns={2} spacing={3}>
              <Button
                colorScheme="green"
                size="sm"
                leftIcon={<Icon as={FiGift} />}
                onClick={handleClaimRewards}
                isDisabled={pendingRewards <= 0}
              >
                Claim Rewards
              </Button>
              <Button
                colorScheme="blue"
                size="sm"
                leftIcon={<Icon as={FiRefreshCw} />}
                onClick={handleCompoundRewards}
                isDisabled={pendingRewards <= 0}
              >
                Compound
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Icon as={isLocked ? FiLock : FiUnlock} />}
                onClick={onUnstakeOpen}
                isDisabled={isLocked}
              >
                Unstake
              </Button>
              <Button
                variant="outline"
                colorScheme="red"
                size="sm"
                leftIcon={<Icon as={FiMinus} />}
                onClick={onEmergencyOpen}
              >
                Emergency
              </Button>
            </SimpleGrid>

            {/* Additional Info */}
            <Box fontSize="xs" color="gray.500">
              <HStack justify="space-between">
                <Text>Staking Duration:</Text>
                <Text>{formatDuration(stakedAsset.stakingTime)}</Text>
              </HStack>
              <HStack justify="space-between">
                <Text>Current APY:</Text>
                <Text>{stakedAsset.yieldRate.toFixed(2)}%</Text>
              </HStack>
              {isLocked && typeof lockupInfo === 'object' && (
                <HStack justify="space-between">
                  <Text>Lockup Remaining:</Text>
                  <Text>{lockupInfo.days}d {lockupInfo.hours}h</Text>
                </HStack>
              )}
            </Box>
          </VStack>
        </CardBody>
      </Card>

      {/* Unstake Modal */}
      <Modal isOpen={isUnstakeOpen} onClose={onUnstakeClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Unstake Asset</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <Alert status="info" size="sm">
                <AlertIcon />
                <Text fontSize="sm">
                  Unstaking will claim all pending rewards and return your NFT.
                </Text>
              </Alert>

              <Box w="full" p={4} bg="gray.50" borderRadius="md">
                <VStack spacing={2}>
                  <HStack justify="space-between" w="full">
                    <Text fontSize="sm">Staked Amount:</Text>
                    <Text fontSize="sm" fontWeight="semibold">
                      {formatCurrency(stakedAsset.stakedAmount)}
                    </Text>
                  </HStack>
                  <HStack justify="space-between" w="full">
                    <Text fontSize="sm">Pending Rewards:</Text>
                    <Text fontSize="sm" fontWeight="semibold" color="green.600">
                      {formatCurrency(pendingRewards)}
                    </Text>
                  </HStack>
                  <Divider />
                  <HStack justify="space-between" w="full">
                    <Text fontSize="sm" fontWeight="bold">Total Received:</Text>
                    <Text fontSize="sm" fontWeight="bold">
                      {formatCurrency(stakedAsset.stakedAmount + pendingRewards)}
                    </Text>
                  </HStack>
                </VStack>
              </Box>

              <HStack w="full" spacing={3}>
                <Button variant="outline" onClick={onUnstakeClose} flex={1}>
                  Cancel
                </Button>
                <Button 
                  colorScheme="blue" 
                  onClick={handleUnstake} 
                  flex={1}
                  isDisabled={isLocked}
                >
                  {isLocked ? 'Locked' : 'Unstake & Claim'}
                </Button>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Emergency Withdraw Modal */}
      <Modal isOpen={isEmergencyOpen} onClose={onEmergencyClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Emergency Withdrawal</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <Alert status="error" size="sm">
                <AlertIcon />
                <Text fontSize="sm">
                  Emergency withdrawal will forfeit all pending rewards and only return your NFT.
                </Text>
              </Alert>

              <Box w="full" p={4} bg="red.50" borderRadius="md" border="1px solid" borderColor="red.200">
                <VStack spacing={2}>
                  <HStack justify="space-between" w="full">
                    <Text fontSize="sm">NFT Returned:</Text>
                    <Text fontSize="sm" fontWeight="semibold">
                      RWA NFT #{stakedAsset.tokenId}
                    </Text>
                  </HStack>
                  <HStack justify="space-between" w="full">
                    <Text fontSize="sm" color="red.600">Forfeited Rewards:</Text>
                    <Text fontSize="sm" fontWeight="semibold" color="red.600">
                      -{formatCurrency(pendingRewards)}
                    </Text>
                  </HStack>
                </VStack>
              </Box>

              <Text fontSize="sm" color="gray.600" textAlign="center">
                This action cannot be undone. Only use in emergency situations.
              </Text>

              <HStack w="full" spacing={3}>
                <Button variant="outline" onClick={onEmergencyClose} flex={1}>
                  Cancel
                </Button>
                <Button colorScheme="red" onClick={handleEmergencyWithdraw} flex={1}>
                  Emergency Withdraw
                </Button>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
