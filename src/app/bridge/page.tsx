"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  Card,
  CardBody,
  Badge,
  HStack,
  VStack,
  Icon,
  useColorModeValue,
  Progress,
  Select,
  Input,
  NumberInput,
  NumberInputField,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Alert,
  AlertIcon,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from "@chakra-ui/react";
import {
  FaExchangeAlt,
  FaEthereum,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaEye,
  FaArrowRight,
} from "react-icons/fa";

interface BridgeTransaction {
  id: string;
  sourceChain: string;
  targetChain: string;
  asset: string;
  amount: string;
  status: "pending" | "confirming" | "completed" | "failed" | "challenged";
  timestamp: number;
  txHash: string;
  estimatedTime: number;
  confirmations: number;
  requiredConfirmations: number;
  fee: string;
}

const mockTransactions: BridgeTransaction[] = [
  {
    id: "1",
    sourceChain: "Ethereum",
    targetChain: "OneChain",
    asset: "Manhattan Office NFT",
    amount: "1",
    status: "completed",
    timestamp: Date.now() - 3600000,
    txHash: "0x1234...5678",
    estimatedTime: 300,
    confirmations: 12,
    requiredConfirmations: 12,
    fee: "0.01 ETH",
  },
  {
    id: "2",
    sourceChain: "Polygon",
    targetChain: "BSC",
    asset: "Carbon Credits",
    amount: "500",
    status: "confirming",
    timestamp: Date.now() - 1800000,
    txHash: "0xabcd...efgh",
    estimatedTime: 180,
    confirmations: 8,
    requiredConfirmations: 20,
    fee: "2 MATIC",
  },
];

export default function BridgePage() {
  const [transactions, setTransactions] = useState<BridgeTransaction[]>(mockTransactions);
  const [selectedTransaction, setSelectedTransaction] = useState<BridgeTransaction | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [sourceChain, setSourceChain] = useState("Ethereum");
  const [targetChain, setTargetChain] = useState("OneChain");
  const [amount, setAmount] = useState("");
  
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "green";
      case "confirming": return "blue";
      case "pending": return "yellow";
      case "failed": return "red";
      case "challenged": return "orange";
      default: return "gray";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return FaCheckCircle;
      case "confirming": return FaClock;
      case "pending": return FaClock;
      case "failed": return FaTimesCircle;
      case "challenged": return FaTimesCircle;
      default: return FaClock;
    }
  };

  const getChainColor = (chain: string) => {
    switch (chain) {
      case "Ethereum": return "blue";
      case "Polygon": return "purple";
      case "BSC": return "yellow";
      case "OneChain": return "green";
      default: return "gray";
    }
  };

  const handleTransactionClick = (tx: BridgeTransaction) => {
    setSelectedTransaction(tx);
    onOpen();
  };

  return (
    <Box minH="100vh" bg={useColorModeValue("gray.50", "gray.900")}>
      <Container maxW="7xl" py={8}>
        <VStack spacing={8}>
          <VStack spacing={4} textAlign="center">
            <Heading as="h1" size="2xl">
              Cross-Chain Bridge
            </Heading>
            <Text fontSize="lg" color="gray.600" maxW="2xl">
              Securely transfer RWA tokens across Ethereum, Polygon, BSC, and OneChain
            </Text>
          </VStack>

          <Tabs w="full" variant="enclosed">
            <TabList>
              <Tab>Bridge Assets</Tab>
              <Tab>Transaction History</Tab>
              <Tab>Atomic Swaps</Tab>
            </TabList>

            <TabPanels>
              {/* Bridge Assets Tab */}
              <TabPanel>
                <Card bg={cardBg} p={6}>
                  <VStack spacing={6}>
                    <Heading size="md">Bridge Your Assets</Heading>
                    
                    <HStack spacing={4} w="full" align="end">
                      <VStack align="start" flex={1}>
                        <Text fontWeight="semibold">From</Text>
                        <Select value={sourceChain} onChange={(e) => setSourceChain(e.target.value)}>
                          <option value="Ethereum">Ethereum</option>
                          <option value="Polygon">Polygon</option>
                          <option value="BSC">BSC</option>
                          <option value="OneChain">OneChain</option>
                        </Select>
                      </VStack>
                      
                      <Icon as={FaArrowRight} color="gray.400" mt={8} />
                      
                      <VStack align="start" flex={1}>
                        <Text fontWeight="semibold">To</Text>
                        <Select value={targetChain} onChange={(e) => setTargetChain(e.target.value)}>
                          <option value="Ethereum">Ethereum</option>
                          <option value="Polygon">Polygon</option>
                          <option value="BSC">BSC</option>
                          <option value="OneChain">OneChain</option>
                        </Select>
                      </VStack>
                    </HStack>

                    <VStack align="start" w="full">
                      <Text fontWeight="semibold">Asset</Text>
                      <Select placeholder="Select asset to bridge">
                        <option value="nft1">Manhattan Office NFT</option>
                        <option value="frac1">Property Fractions (SPF)</option>
                        <option value="carbon1">Carbon Credits</option>
                      </Select>
                    </VStack>

                    <VStack align="start" w="full">
                      <Text fontWeight="semibold">Amount</Text>
                      <NumberInput>
                        <NumberInputField placeholder="Enter amount" />
                      </NumberInput>
                    </VStack>

                    <Alert status="info">
                      <AlertIcon />
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="semibold">Bridge Fee: 0.01 ETH</Text>
                        <Text fontSize="sm">Estimated time: 5-10 minutes</Text>
                      </VStack>
                    </Alert>

                    <Button colorScheme="purple" size="lg" w="full" leftIcon={<FaExchangeAlt />}>
                      Initiate Bridge Transfer
                    </Button>
                  </VStack>
                </Card>
              </TabPanel>

              {/* Transaction History Tab */}
              <TabPanel>
                <VStack spacing={6}>
                  <Heading size="md">Bridge Transaction History</Heading>
                  
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Asset</Th>
                        <Th>Route</Th>
                        <Th>Amount</Th>
                        <Th>Status</Th>
                        <Th>Time</Th>
                        <Th>Action</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {transactions.map((tx) => (
                        <Tr key={tx.id}>
                          <Td>{tx.asset}</Td>
                          <Td>
                            <HStack spacing={2}>
                              <Badge colorScheme={getChainColor(tx.sourceChain)}>
                                {tx.sourceChain}
                              </Badge>
                              <Icon as={FaArrowRight} color="gray.400" />
                              <Badge colorScheme={getChainColor(tx.targetChain)}>
                                {tx.targetChain}
                              </Badge>
                            </HStack>
                          </Td>
                          <Td>{tx.amount}</Td>
                          <Td>
                            <HStack spacing={2}>
                              <Icon as={getStatusIcon(tx.status)} color={`${getStatusColor(tx.status)}.500`} />
                              <Badge colorScheme={getStatusColor(tx.status)}>
                                {tx.status}
                              </Badge>
                            </HStack>
                          </Td>
                          <Td>{new Date(tx.timestamp).toLocaleString()}</Td>
                          <Td>
                            <Button size="sm" leftIcon={<FaEye />} onClick={() => handleTransactionClick(tx)}>
                              View
                            </Button>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </VStack>
              </TabPanel>

              {/* Atomic Swaps Tab */}
              <TabPanel>
                <VStack spacing={6}>
                  <Heading size="md">Atomic Swaps</Heading>
                  <Text color="gray.600" textAlign="center">
                    Trustless cross-chain asset swaps with hash time-locked contracts
                  </Text>
                  
                  <Card bg={cardBg} p={6} w="full">
                    <VStack spacing={4}>
                      <Text fontWeight="semibold">Create Atomic Swap</Text>
                      <Text fontSize="sm" color="gray.600">
                        Coming soon - Direct peer-to-peer asset swaps across chains
                      </Text>
                      <Button colorScheme="purple" isDisabled>
                        Create Swap
                      </Button>
                    </VStack>
                  </Card>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>

        {/* Transaction Detail Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Bridge Transaction Details</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              {selectedTransaction && (
                <VStack spacing={4} align="start">
                  <HStack justify="space-between" w="full">
                    <Text fontWeight="semibold">Status:</Text>
                    <HStack>
                      <Icon as={getStatusIcon(selectedTransaction.status)} 
                            color={`${getStatusColor(selectedTransaction.status)}.500`} />
                      <Badge colorScheme={getStatusColor(selectedTransaction.status)}>
                        {selectedTransaction.status}
                      </Badge>
                    </HStack>
                  </HStack>

                  <HStack justify="space-between" w="full">
                    <Text fontWeight="semibold">Asset:</Text>
                    <Text>{selectedTransaction.asset}</Text>
                  </HStack>

                  <HStack justify="space-between" w="full">
                    <Text fontWeight="semibold">Amount:</Text>
                    <Text>{selectedTransaction.amount}</Text>
                  </HStack>

                  <HStack justify="space-between" w="full">
                    <Text fontWeight="semibold">Route:</Text>
                    <HStack>
                      <Badge colorScheme={getChainColor(selectedTransaction.sourceChain)}>
                        {selectedTransaction.sourceChain}
                      </Badge>
                      <Icon as={FaArrowRight} />
                      <Badge colorScheme={getChainColor(selectedTransaction.targetChain)}>
                        {selectedTransaction.targetChain}
                      </Badge>
                    </HStack>
                  </HStack>

                  <HStack justify="space-between" w="full">
                    <Text fontWeight="semibold">Transaction Hash:</Text>
                    <Text fontFamily="mono" fontSize="sm">{selectedTransaction.txHash}</Text>
                  </HStack>

                  <HStack justify="space-between" w="full">
                    <Text fontWeight="semibold">Bridge Fee:</Text>
                    <Text>{selectedTransaction.fee}</Text>
                  </HStack>

                  <VStack align="start" w="full" spacing={2}>
                    <Text fontWeight="semibold">Confirmations:</Text>
                    <Progress 
                      value={(selectedTransaction.confirmations / selectedTransaction.requiredConfirmations) * 100}
                      colorScheme="blue"
                      w="full"
                    />
                    <Text fontSize="sm" color="gray.600">
                      {selectedTransaction.confirmations} / {selectedTransaction.requiredConfirmations} confirmations
                    </Text>
                  </VStack>

                  <HStack justify="space-between" w="full">
                    <Text fontWeight="semibold">Timestamp:</Text>
                    <Text>{new Date(selectedTransaction.timestamp).toLocaleString()}</Text>
                  </HStack>
                </VStack>
              )}
            </ModalBody>
          </ModalContent>
        </Modal>
      </Container>
    </Box>
  );
}
