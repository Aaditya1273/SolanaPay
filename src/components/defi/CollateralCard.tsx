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
  Image,
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
  Select,
  useToast,
  Icon,
  Tooltip,
  Alert,
  AlertIcon,
  SimpleGrid,
} from '@chakra-ui/react';
import { 
  FiShield, 
  FiTrendingDown, 
  FiDollarSign, 
  FiAlertTriangle,
  FiInfo,
  FiRepeat,
  FiPlus,
} from 'react-icons/fi';
import { CollateralAsset } from '../../services/defiYieldService';

interface CollateralCardProps {
  collateral: CollateralAsset;
  onBorrow?: (collateralId: string, amount: number, asset: string) => void;
  onRepay?: (collateralId: string, amount: number) => void;
  onWithdraw?: (collateralId: string) => void;
  onAddCollateral?: (collateralId: string, amount: number) => void;
}

export default function CollateralCard({ 
  collateral, 
  onBorrow, 
  onRepay, 
  onWithdraw, 
  onAddCollateral 
}: CollateralCardProps) {
  const toast = useToast();
  const { isOpen: isBorrowOpen, onOpen: onBorrowOpen, onClose: onBorrowClose } = useDisclosure();
  const { isOpen: isRepayOpen, onOpen: onRepayOpen, onClose: onRepayClose } = useDisclosure();
  const { isOpen: isAddOpen, onOpen: onAddOpen, onClose: onAddClose } = useDisclosure();
  
  const [borrowAmount, setBorrowAmount] = useState<number>(0);
  const [borrowAsset, setBorrowAsset] = useState<string>('USDC');
  const [repayAmount, setRepayAmount] = useState<number>(0);
  const [addAmount, setAddAmount] = useState<number>(0);

  const getHealthFactorColor = (healthFactor: number) => {
    if (healthFactor >= 2) return 'green';
    if (healthFactor >= 1.5) return 'yellow';
    if (healthFactor >= 1.2) return 'orange';
    return 'red';
  };

  const getRiskLevel = (healthFactor: number) => {
    if (healthFactor >= 2) return { level: 'Low Risk', color: 'green' };
    if (healthFactor >= 1.5) return { level: 'Medium Risk', color: 'yellow' };
    if (healthFactor >= 1.2) return { level: 'High Risk', color: 'orange' };
    return { level: 'Liquidation Risk', color: 'red' };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const maxBorrowAmount = collateral.collateralValue * 0.75 - collateral.loanAmount;
  const utilizationPercentage = (collateral.loanAmount / collateral.collateralValue) * 100;
  const riskInfo = getRiskLevel(collateral.healthFactor);

  const handleBorrow = () => {
    if (borrowAmount <= 0 || borrowAmount > maxBorrowAmount) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid borrow amount',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    onBorrow?.(collateral.id, borrowAmount, borrowAsset);
    setBorrowAmount(0);
    onBorrowClose();
    
    toast({
      title: 'Borrow Initiated',
      description: `Successfully borrowed ${formatCurrency(borrowAmount)} ${borrowAsset}`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleRepay = () => {
    if (repayAmount <= 0 || repayAmount > collateral.loanAmount) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid repay amount',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    onRepay?.(collateral.id, repayAmount);
    setRepayAmount(0);
    onRepayClose();
    
    toast({
      title: 'Repayment Successful',
      description: `Successfully repaid ${formatCurrency(repayAmount)}`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleAddCollateral = () => {
    if (addAmount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    onAddCollateral?.(collateral.id, addAmount);
    setAddAmount(0);
    onAddClose();
    
    toast({
      title: 'Collateral Added',
      description: `Successfully added ${formatCurrency(addAmount)} collateral`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleWithdraw = () => {
    if (collateral.loanAmount > 0) {
      toast({
        title: 'Cannot Withdraw',
        description: 'Please repay your loan before withdrawing collateral',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    onWithdraw?.(collateral.id);
    
    toast({
      title: 'Withdrawal Initiated',
      description: 'Your collateral withdrawal has been initiated',
      status: 'success',
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
      >
        <CardHeader pb={2}>
          <HStack justify="space-between" align="start">
            <VStack align="start" spacing={1}>
              <HStack>
                <Text fontSize="lg" fontWeight="bold">
                  RWA NFT #{collateral.tokenId}
                </Text>
                <Badge colorScheme={collateral.isActive ? 'green' : 'gray'}>
                  {collateral.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </HStack>
              <Text fontSize="sm" color="gray.600">
                Protocol: {collateral.lendingProtocol.toUpperCase()}
              </Text>
            </VStack>

            <VStack align="end" spacing={1}>
              <Badge colorScheme={riskInfo.color} variant="solid">
                {riskInfo.level}
              </Badge>
              <Text fontSize="sm" color="gray.600">
                Health: {collateral.healthFactor.toFixed(2)}
              </Text>
            </VStack>
          </HStack>
        </CardHeader>

        <CardBody pt={0}>
          <VStack spacing={4} align="stretch">
            {/* Key Metrics */}
            <SimpleGrid columns={2} spacing={4}>
              <Box>
                <Text fontSize="sm" color="gray.600" mb={1}>Collateral Value</Text>
                <Text fontSize="lg" fontWeight="semibold" color="blue.600">
                  {formatCurrency(collateral.collateralValue)}
                </Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.600" mb={1}>Loan Amount</Text>
                <Text fontSize="lg" fontWeight="semibold" color={collateral.loanAmount > 0 ? "red.600" : "gray.600"}>
                  {formatCurrency(collateral.loanAmount)}
                </Text>
              </Box>
            </SimpleGrid>

            {/* Health Factor Visualization */}
            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontSize="sm" fontWeight="medium">Health Factor</Text>
                <HStack>
                  <Icon as={FiShield} color={getHealthFactorColor(collateral.healthFactor)} />
                  <Text fontSize="sm" fontWeight="bold" color={getHealthFactorColor(collateral.healthFactor)}>
                    {collateral.healthFactor.toFixed(2)}
                  </Text>
                </HStack>
              </HStack>
              <Progress 
                value={Math.min(collateral.healthFactor * 50, 100)} 
                size="sm" 
                colorScheme={getHealthFactorColor(collateral.healthFactor)}
                bg="gray.100"
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                Safe zone: &gt; 1.5 | Liquidation risk: &lt; 1.2
              </Text>
            </Box>

            {/* Utilization */}
            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontSize="sm" fontWeight="medium">Utilization</Text>
                <Text fontSize="sm" fontWeight="bold">
                  {utilizationPercentage.toFixed(1)}%
                </Text>
              </HStack>
              <Progress 
                value={utilizationPercentage} 
                size="sm" 
                colorScheme={utilizationPercentage > 75 ? 'red' : utilizationPercentage > 50 ? 'yellow' : 'green'}
              />
              <HStack justify="space-between" fontSize="xs" color="gray.500" mt={1}>
                <Text>Available: {formatCurrency(maxBorrowAmount)}</Text>
                <Text>Max LTV: 75%</Text>
              </HStack>
            </Box>

            {/* Risk Warnings */}
            {collateral.healthFactor < 1.5 && (
              <Alert status="warning" size="sm" borderRadius="md">
                <AlertIcon />
                <Box>
                  <Text fontSize="sm" fontWeight="medium">Risk Warning</Text>
                  <Text fontSize="xs">
                    {collateral.healthFactor < 1.2 
                      ? 'Position at risk of liquidation. Repay loan or add collateral immediately.'
                      : 'Monitor position closely. Consider repaying loan or adding collateral.'
                    }
                  </Text>
                </Box>
              </Alert>
            )}

            <Divider />

            {/* Action Buttons */}
            <SimpleGrid columns={2} spacing={3}>
              <Button
                colorScheme="blue"
                size="sm"
                leftIcon={<Icon as={FiDollarSign} />}
                onClick={onBorrowOpen}
                isDisabled={maxBorrowAmount <= 0}
              >
                Borrow
              </Button>
              <Button
                colorScheme="green"
                size="sm"
                leftIcon={<Icon as={FiRepeat} />}
                onClick={onRepayOpen}
                isDisabled={collateral.loanAmount <= 0}
              >
                Repay
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Icon as={FiPlus} />}
                onClick={onAddOpen}
              >
                Add Collateral
              </Button>
              <Button
                variant="outline"
                colorScheme="red"
                size="sm"
                leftIcon={<Icon as={FiTrendingDown} />}
                onClick={handleWithdraw}
                isDisabled={collateral.loanAmount > 0}
              >
                Withdraw
              </Button>
            </SimpleGrid>

            {/* Additional Info */}
            <Box fontSize="xs" color="gray.500">
              <HStack justify="space-between">
                <Text>Last Valuation:</Text>
                <Text>{new Date(collateral.lastValuation).toLocaleDateString()}</Text>
              </HStack>
              <HStack justify="space-between">
                <Text>Liquidation Threshold:</Text>
                <Text>{collateral.liquidationThreshold}%</Text>
              </HStack>
            </Box>
          </VStack>
        </CardBody>
      </Card>

      {/* Borrow Modal */}
      <Modal isOpen={isBorrowOpen} onClose={onBorrowClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Borrow Against Collateral</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Borrow Amount</FormLabel>
                <NumberInput
                  value={borrowAmount}
                  onChange={(_, value) => setBorrowAmount(value)}
                  min={0}
                  max={maxBorrowAmount}
                >
                  <NumberInputField placeholder="Enter amount to borrow" />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Text fontSize="sm" color="gray.600" mt={1}>
                  Max available: {formatCurrency(maxBorrowAmount)}
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel>Asset to Borrow</FormLabel>
                <Select value={borrowAsset} onChange={(e) => setBorrowAsset(e.target.value)}>
                  <option value="USDC">USDC</option>
                  <option value="USDT">USDT</option>
                  <option value="DAI">DAI</option>
                  <option value="WETH">WETH</option>
                </Select>
              </FormControl>

              <Alert status="info" size="sm">
                <AlertIcon />
                <Text fontSize="sm">
                  Borrowing will increase your utilization and affect your health factor.
                </Text>
              </Alert>

              <HStack w="full" spacing={3}>
                <Button variant="outline" onClick={onBorrowClose} flex={1}>
                  Cancel
                </Button>
                <Button colorScheme="blue" onClick={handleBorrow} flex={1}>
                  Borrow {borrowAsset}
                </Button>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Repay Modal */}
      <Modal isOpen={isRepayOpen} onClose={onRepayClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Repay Loan</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Repay Amount</FormLabel>
                <NumberInput
                  value={repayAmount}
                  onChange={(_, value) => setRepayAmount(value)}
                  min={0}
                  max={collateral.loanAmount}
                >
                  <NumberInputField placeholder="Enter amount to repay" />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Text fontSize="sm" color="gray.600" mt={1}>
                  Total debt: {formatCurrency(collateral.loanAmount)}
                </Text>
              </FormControl>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setRepayAmount(collateral.loanAmount)}
              >
                Repay Full Amount
              </Button>

              <Alert status="success" size="sm">
                <AlertIcon />
                <Text fontSize="sm">
                  Repaying will improve your health factor and reduce liquidation risk.
                </Text>
              </Alert>

              <HStack w="full" spacing={3}>
                <Button variant="outline" onClick={onRepayClose} flex={1}>
                  Cancel
                </Button>
                <Button colorScheme="green" onClick={handleRepay} flex={1}>
                  Repay Loan
                </Button>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Add Collateral Modal */}
      <Modal isOpen={isAddOpen} onClose={onAddClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Collateral</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Additional Collateral Value</FormLabel>
                <NumberInput
                  value={addAmount}
                  onChange={(_, value) => setAddAmount(value)}
                  min={0}
                >
                  <NumberInputField placeholder="Enter additional collateral value" />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>

              <Alert status="info" size="sm">
                <AlertIcon />
                <Text fontSize="sm">
                  Adding collateral will improve your health factor and borrowing capacity.
                </Text>
              </Alert>

              <HStack w="full" spacing={3}>
                <Button variant="outline" onClick={onAddClose} flex={1}>
                  Cancel
                </Button>
                <Button colorScheme="blue" onClick={handleAddCollateral} flex={1}>
                  Add Collateral
                </Button>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
