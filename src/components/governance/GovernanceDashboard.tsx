"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Button,
  Icon,
  Badge,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useColorModeValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Input,
  Select,
  Textarea,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  useToast,
} from "@chakra-ui/react";
import {
  FaVoteYea,
  FaPlus,
  FaCoins,
  FaUsers,
  FaChartLine,
  FaClock,
  FaExclamationTriangle,
} from "react-icons/fa";
import ProposalCard, { Proposal } from "./ProposalCard";

interface Asset {
  id: string;
  name: string;
  type: string;
  totalValue: number;
  userShares: number;
  totalShares: number;
  ownershipPercentage: number;
}

interface GovernanceStats {
  totalProposals: number;
  activeProposals: number;
  userVotingPower: number;
  totalVotingPower: number;
  participationRate: number;
  proposalsCreated: number;
}

export default function GovernanceDashboard() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [stats, setStats] = useState<GovernanceStats>({
    totalProposals: 0,
    activeProposals: 0,
    userVotingPower: 0,
    totalVotingPower: 0,
    participationRate: 0,
    proposalsCreated: 0,
  });
  const [selectedAsset, setSelectedAsset] = useState<string>("");
  const [proposalType, setProposalType] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  
  const bgGradient = useColorModeValue(
    "linear(to-br, blue.50, purple.50)",
    "linear(to-br, gray.900, purple.900)"
  );

  // Mock data initialization
  useEffect(() => {
    const mockAssets: Asset[] = [
      {
        id: "1",
        name: "Manhattan Office Complex",
        type: "Real Estate",
        totalValue: 5000000,
        userShares: 250,
        totalShares: 10000,
        ownershipPercentage: 2.5,
      },
      {
        id: "2",
        name: "Carbon Credit Portfolio A",
        type: "Carbon Credits",
        totalValue: 750000,
        userShares: 500,
        totalShares: 5000,
        ownershipPercentage: 10,
      },
      {
        id: "3",
        name: "Gold Reserve Fund",
        type: "Precious Metals",
        totalValue: 2000000,
        userShares: 100,
        totalShares: 8000,
        ownershipPercentage: 1.25,
      },
    ];

    const mockProposals: Proposal[] = [
      {
        id: "1",
        assetId: "1",
        assetName: "Manhattan Office Complex",
        assetType: "Real Estate",
        type: "VALUATION_UPDATE",
        title: "Update Property Valuation Based on Recent Market Analysis",
        description: "Recent market analysis shows significant appreciation in Manhattan commercial real estate. Proposing to update valuation from $5M to $5.8M based on comparable sales and professional appraisal.",
        proposer: "0x1234567890123456789012345678901234567890",
        status: "ACTIVE",
        votingEnds: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        forVotes: 6750,
        againstVotes: 1250,
        abstainVotes: 500,
        totalVotes: 8500,
        quorumRequired: 25,
        currentQuorum: 85,
        newValuation: 5800000,
        hasVoted: false,
        userVotingPower: 250,
      },
      {
        id: "2",
        assetId: "2",
        assetName: "Carbon Credit Portfolio A",
        assetType: "Carbon Credits",
        type: "YIELD_DISTRIBUTION",
        title: "Distribute Q4 Carbon Credit Trading Profits",
        description: "Carbon credit trading generated $75,000 in profits this quarter. Proposing to distribute 80% to shareholders and retain 20% for operational expenses.",
        proposer: "0x2345678901234567890123456789012345678901",
        status: "ACTIVE",
        votingEnds: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        forVotes: 4200,
        againstVotes: 300,
        abstainVotes: 100,
        totalVotes: 4600,
        quorumRequired: 20,
        currentQuorum: 92,
        yieldAmount: 60000,
        hasVoted: true,
        userVote: "FOR",
        userVotingPower: 500,
      },
      {
        id: "3",
        assetId: "1",
        assetName: "Manhattan Office Complex",
        assetType: "Real Estate",
        type: "ASSET_LIQUIDATION",
        title: "Emergency Liquidation Due to Structural Issues",
        description: "Recent inspection revealed significant structural issues requiring immediate attention. Repair costs exceed 40% of property value. Proposing liquidation at current market value.",
        proposer: "0x3456789012345678901234567890123456789012",
        status: "FAILED",
        votingEnds: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        forVotes: 2100,
        againstVotes: 7200,
        abstainVotes: 300,
        totalVotes: 9600,
        quorumRequired: 25,
        currentQuorum: 96,
        liquidationPrice: 4500000,
        hasVoted: true,
        userVote: "AGAINST",
        userVotingPower: 250,
      },
    ];

    setAssets(mockAssets);
    setProposals(mockProposals);
    
    // Calculate stats
    const totalUserShares = mockAssets.reduce((sum, asset) => sum + asset.userShares, 0);
    const totalShares = mockAssets.reduce((sum, asset) => sum + asset.totalShares, 0);
    const activeProposals = mockProposals.filter(p => p.status === "ACTIVE").length;
    
    setStats({
      totalProposals: mockProposals.length,
      activeProposals,
      userVotingPower: totalUserShares,
      totalVotingPower: totalShares,
      participationRate: 78.5,
      proposalsCreated: 2,
    });
  }, []);

  const handleVote = async (proposalId: string, vote: "FOR" | "AGAINST" | "ABSTAIN") => {
    setIsLoading(true);
    
    // Simulate voting transaction
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update proposal with vote
    setProposals(prev => prev.map(p => {
      if (p.id === proposalId) {
        const votingPower = p.userVotingPower || 0;
        return {
          ...p,
          hasVoted: true,
          userVote: vote,
          forVotes: vote === "FOR" ? p.forVotes + votingPower : p.forVotes,
          againstVotes: vote === "AGAINST" ? p.againstVotes + votingPower : p.againstVotes,
          abstainVotes: vote === "ABSTAIN" ? p.abstainVotes + votingPower : p.abstainVotes,
        };
      }
      return p;
    }));
    
    toast({
      title: "Vote Cast Successfully",
      description: `Your ${vote} vote has been recorded on-chain.`,
      status: "success",
      duration: 5000,
      isClosable: true,
    });
    
    setIsLoading(false);
  };

  const handleCreateProposal = async (formData: any) => {
    setIsLoading(true);
    
    // Simulate proposal creation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const newProposal: Proposal = {
      id: (proposals.length + 1).toString(),
      assetId: formData.assetId,
      assetName: assets.find(a => a.id === formData.assetId)?.name || "",
      assetType: assets.find(a => a.id === formData.assetId)?.type || "",
      type: formData.type,
      title: formData.title,
      description: formData.description,
      proposer: "0x1234567890123456789012345678901234567890", // Current user
      status: "ACTIVE",
      votingEnds: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      forVotes: 0,
      againstVotes: 0,
      abstainVotes: 0,
      totalVotes: 0,
      quorumRequired: 25,
      currentQuorum: 0,
      newValuation: formData.newValuation,
      liquidationPrice: formData.liquidationPrice,
      yieldAmount: formData.yieldAmount,
      hasVoted: false,
      userVotingPower: assets.find(a => a.id === formData.assetId)?.userShares || 0,
    };
    
    setProposals(prev => [newProposal, ...prev]);
    
    toast({
      title: "Proposal Created",
      description: "Your proposal has been submitted and voting is now open.",
      status: "success",
      duration: 5000,
      isClosable: true,
    });
    
    setIsLoading(false);
    onClose();
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(2)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount.toLocaleString()}`;
  };

  const activeProposals = proposals.filter(p => p.status === "ACTIVE");
  const completedProposals = proposals.filter(p => p.status !== "ACTIVE");

  return (
    <Box minH="100vh" bg={bgGradient}>
      <Container maxW="7xl" py={8}>
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <VStack spacing={4} textAlign="center">
            <HStack justify="center" spacing={3}>
              <Icon as={FaVoteYea} boxSize={8} color="purple.500" />
              <Heading size="xl" bgGradient="linear(to-r, purple.400, blue.400)" bgClip="text">
                RWA Governance
              </Heading>
            </HStack>
            <Text fontSize="lg" color="gray.600" maxW="2xl">
              Participate in decentralized governance for your fractional RWA investments
            </Text>
          </VStack>

          {/* Stats Overview */}
          <SimpleGrid columns={{ base: 2, md: 3, lg: 6 }} spacing={4}>
            <Stat
              textAlign="center"
              bg="white"
              p={4}
              rounded="lg"
              border="1px solid"
              borderColor="gray.200"
              shadow="sm"
            >
              <StatLabel>Total Proposals</StatLabel>
              <StatNumber color="purple.500">{stats.totalProposals}</StatNumber>
              <StatHelpText>All time</StatHelpText>
            </Stat>

            <Stat
              textAlign="center"
              bg="white"
              p={4}
              rounded="lg"
              border="1px solid"
              borderColor="gray.200"
              shadow="sm"
            >
              <StatLabel>Active Votes</StatLabel>
              <StatNumber color="blue.500">{stats.activeProposals}</StatNumber>
              <StatHelpText>Ongoing</StatHelpText>
            </Stat>

            <Stat
              textAlign="center"
              bg="white"
              p={4}
              rounded="lg"
              border="1px solid"
              borderColor="gray.200"
              shadow="sm"
            >
              <StatLabel>Your Voting Power</StatLabel>
              <StatNumber color="green.500">{stats.userVotingPower.toLocaleString()}</StatNumber>
              <StatHelpText>Total shares</StatHelpText>
            </Stat>

            <Stat
              textAlign="center"
              bg="white"
              p={4}
              rounded="lg"
              border="1px solid"
              borderColor="gray.200"
              shadow="sm"
            >
              <StatLabel>Participation Rate</StatLabel>
              <StatNumber color="orange.500">{stats.participationRate}%</StatNumber>
              <StatHelpText>Community average</StatHelpText>
            </Stat>

            <Stat
              textAlign="center"
              bg="white"
              p={4}
              rounded="lg"
              border="1px solid"
              borderColor="gray.200"
              shadow="sm"
            >
              <StatLabel>Proposals Created</StatLabel>
              <StatNumber color="teal.500">{stats.proposalsCreated}</StatNumber>
              <StatHelpText>By you</StatHelpText>
            </Stat>

            <Stat
              textAlign="center"
              bg="white"
              p={4}
              rounded="lg"
              border="1px solid"
              borderColor="gray.200"
              shadow="sm"
            >
              <StatLabel>Portfolio Value</StatLabel>
              <StatNumber color="green.500">
                {formatCurrency(assets.reduce((sum, asset) => sum + (asset.totalValue * asset.ownershipPercentage / 100), 0))}
              </StatNumber>
              <StatHelpText>Your stake</StatHelpText>
            </Stat>
          </SimpleGrid>

          {/* Action Bar */}
          <HStack justify="space-between" align="center">
            <Heading size="lg">Governance Proposals</Heading>
            <Button
              leftIcon={<Icon as={FaPlus} />}
              colorScheme="purple"
              onClick={onOpen}
            >
              Create Proposal
            </Button>
          </HStack>

          {/* Proposals Tabs */}
          <Tabs variant="enclosed" colorScheme="purple">
            <TabList>
              <Tab>
                <HStack>
                  <Icon as={FaClock} />
                  <Text>Active Proposals ({activeProposals.length})</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack>
                  <Icon as={FaChartLine} />
                  <Text>Completed ({completedProposals.length})</Text>
                </HStack>
              </Tab>
            </TabList>

            <TabPanels>
              <TabPanel p={0} pt={6}>
                {activeProposals.length > 0 ? (
                  <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                    {activeProposals.map((proposal) => (
                      <ProposalCard
                        key={proposal.id}
                        proposal={proposal}
                        onVote={handleVote}
                        isLoading={isLoading}
                      />
                    ))}
                  </SimpleGrid>
                ) : (
                  <VStack spacing={4} py={12} textAlign="center">
                    <Icon as={FaVoteYea} boxSize={12} color="gray.400" />
                    <Text fontSize="lg" color="gray.600">
                      No active proposals at the moment
                    </Text>
                    <Button
                      colorScheme="purple"
                      leftIcon={<Icon as={FaPlus} />}
                      onClick={onOpen}
                    >
                      Create First Proposal
                    </Button>
                  </VStack>
                )}
              </TabPanel>
              
              <TabPanel p={0} pt={6}>
                <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                  {completedProposals.map((proposal) => (
                    <ProposalCard
                      key={proposal.id}
                      proposal={proposal}
                      onVote={handleVote}
                      isLoading={isLoading}
                    />
                  ))}
                </SimpleGrid>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      </Container>

      {/* Create Proposal Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Proposal</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Asset</FormLabel>
                <Select
                  placeholder="Select asset"
                  value={selectedAsset}
                  onChange={(e) => setSelectedAsset(e.target.value)}
                >
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name} ({asset.type})
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Proposal Type</FormLabel>
                <Select
                  placeholder="Select proposal type"
                  value={proposalType}
                  onChange={(e) => setProposalType(e.target.value)}
                >
                  <option value="VALUATION_UPDATE">Valuation Update</option>
                  <option value="YIELD_DISTRIBUTION">Yield Distribution</option>
                  <option value="ASSET_LIQUIDATION">Asset Liquidation</option>
                  <option value="GOVERNANCE_PARAMETER">Governance Parameter</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Title</FormLabel>
                <Input placeholder="Enter proposal title" />
              </FormControl>

              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  placeholder="Provide detailed description of the proposal"
                  rows={4}
                />
              </FormControl>

              {proposalType === "VALUATION_UPDATE" && (
                <FormControl>
                  <FormLabel>New Valuation ($)</FormLabel>
                  <NumberInput>
                    <NumberInputField placeholder="Enter new valuation" />
                  </NumberInput>
                </FormControl>
              )}

              {proposalType === "YIELD_DISTRIBUTION" && (
                <FormControl>
                  <FormLabel>Yield Amount ($)</FormLabel>
                  <NumberInput>
                    <NumberInputField placeholder="Enter yield amount" />
                  </NumberInput>
                </FormControl>
              )}

              {proposalType === "ASSET_LIQUIDATION" && (
                <FormControl>
                  <FormLabel>Liquidation Price ($)</FormLabel>
                  <NumberInput>
                    <NumberInputField placeholder="Enter liquidation price" />
                  </NumberInput>
                </FormControl>
              )}

              <HStack spacing={3} pt={4}>
                <Button variant="outline" onClick={onClose} flex={1}>
                  Cancel
                </Button>
                <Button
                  colorScheme="purple"
                  flex={1}
                  isLoading={isLoading}
                  onClick={() => handleCreateProposal({
                    assetId: selectedAsset,
                    type: proposalType,
                    title: "Sample Proposal",
                    description: "Sample description",
                  })}
                  isDisabled={!selectedAsset || !proposalType}
                >
                  Create Proposal
                </Button>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
