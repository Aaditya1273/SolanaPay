"use client";

import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  Badge,
  Progress,
  VStack,
  HStack,
  Button,
  Icon,
  Divider,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useColorModeValue,
  Tooltip,
  Avatar,
  AvatarGroup,
} from "@chakra-ui/react";
import {
  FaVoteYea,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaCoins,
  FaHome,
  FaRecycle,
} from "react-icons/fa";

export interface Proposal {
  id: string;
  assetId: string;
  assetName: string;
  assetType: string;
  type: "VALUATION_UPDATE" | "ASSET_LIQUIDATION" | "YIELD_DISTRIBUTION" | "GOVERNANCE_PARAMETER" | "EMERGENCY_ACTION";
  title: string;
  description: string;
  proposer: string;
  status: "ACTIVE" | "PASSED" | "FAILED" | "EXECUTED" | "CANCELLED";
  votingEnds: Date;
  createdAt: Date;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  totalVotes: number;
  quorumRequired: number;
  currentQuorum: number;
  executionDelay?: number;
  newValuation?: number;
  liquidationPrice?: number;
  yieldAmount?: number;
  hasVoted?: boolean;
  userVote?: "FOR" | "AGAINST" | "ABSTAIN";
  userVotingPower?: number;
}

interface ProposalCardProps {
  proposal: Proposal;
  onVote?: (proposalId: string, vote: "FOR" | "AGAINST" | "ABSTAIN") => void;
  onViewDetails?: (proposalId: string) => void;
  isLoading?: boolean;
}

export default function ProposalCard({ 
  proposal, 
  onVote, 
  onViewDetails, 
  isLoading = false 
}: ProposalCardProps) {
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  
  const getProposalTypeIcon = (type: string) => {
    switch (type) {
      case "VALUATION_UPDATE":
        return FaCoins;
      case "ASSET_LIQUIDATION":
        return FaExclamationTriangle;
      case "YIELD_DISTRIBUTION":
        return FaRecycle;
      default:
        return FaVoteYea;
    }
  };

  const getProposalTypeColor = (type: string) => {
    switch (type) {
      case "VALUATION_UPDATE":
        return "blue";
      case "ASSET_LIQUIDATION":
        return "red";
      case "YIELD_DISTRIBUTION":
        return "green";
      case "EMERGENCY_ACTION":
        return "orange";
      default:
        return "purple";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "blue";
      case "PASSED":
        return "green";
      case "FAILED":
        return "red";
      case "EXECUTED":
        return "purple";
      case "CANCELLED":
        return "gray";
      default:
        return "gray";
    }
  };

  const getAssetTypeIcon = (assetType: string) => {
    switch (assetType.toLowerCase()) {
      case "real estate":
        return FaHome;
      case "carbon credits":
        return FaRecycle;
      default:
        return FaCoins;
    }
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

  const formatTimeRemaining = (endDate: Date) => {
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    
    if (diff <= 0) return "Voting ended";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  };

  const calculateVotePercentages = () => {
    const total = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
    if (total === 0) return { for: 0, against: 0, abstain: 0 };
    
    return {
      for: (proposal.forVotes / total) * 100,
      against: (proposal.againstVotes / total) * 100,
      abstain: (proposal.abstainVotes / total) * 100,
    };
  };

  const votePercentages = calculateVotePercentages();
  const quorumMet = proposal.currentQuorum >= proposal.quorumRequired;

  return (
    <Card
      bg={cardBg}
      border="1px solid"
      borderColor={borderColor}
      shadow="md"
      _hover={{ shadow: "lg", transform: "translateY(-2px)" }}
      transition="all 0.2s"
    >
      <CardHeader pb={2}>
        <VStack align="stretch" spacing={3}>
          {/* Header with asset info and status */}
          <HStack justify="space-between" align="start">
            <VStack align="start" spacing={1}>
              <HStack>
                <Icon as={getAssetTypeIcon(proposal.assetType)} color="gray.500" />
                <Text fontSize="sm" color="gray.600">
                  {proposal.assetName} • {proposal.assetType}
                </Text>
              </HStack>
              <Heading size="md" noOfLines={2}>
                {proposal.title}
              </Heading>
            </VStack>
            
            <VStack align="end" spacing={2}>
              <Badge
                colorScheme={getStatusColor(proposal.status)}
                variant="solid"
                px={3}
                py={1}
              >
                {proposal.status}
              </Badge>
              <Badge
                colorScheme={getProposalTypeColor(proposal.type)}
                variant="outline"
              >
                <HStack spacing={1}>
                  <Icon as={getProposalTypeIcon(proposal.type)} boxSize={3} />
                  <Text fontSize="xs">
                    {proposal.type.replace("_", " ")}
                  </Text>
                </HStack>
              </Badge>
            </VStack>
          </HStack>

          {/* Proposal details */}
          {(proposal.newValuation || proposal.liquidationPrice || proposal.yieldAmount) && (
            <Box bg="gray.50" p={3} rounded="md">
              {proposal.newValuation && (
                <Text fontSize="sm">
                  <Text as="span" fontWeight="bold">New Valuation:</Text>{" "}
                  {formatCurrency(proposal.newValuation)}
                </Text>
              )}
              {proposal.liquidationPrice && (
                <Text fontSize="sm" color="red.600">
                  <Text as="span" fontWeight="bold">Liquidation Price:</Text>{" "}
                  {formatCurrency(proposal.liquidationPrice)}
                </Text>
              )}
              {proposal.yieldAmount && (
                <Text fontSize="sm" color="green.600">
                  <Text as="span" fontWeight="bold">Yield Distribution:</Text>{" "}
                  {formatCurrency(proposal.yieldAmount)}
                </Text>
              )}
            </Box>
          )}
        </VStack>
      </CardHeader>

      <CardBody pt={0}>
        <VStack align="stretch" spacing={4}>
          {/* Description */}
          <Text fontSize="sm" color="gray.600" noOfLines={3}>
            {proposal.description}
          </Text>

          <Divider />

          {/* Voting Progress */}
          <VStack align="stretch" spacing={3}>
            <HStack justify="space-between">
              <Text fontSize="sm" fontWeight="bold">Voting Progress</Text>
              <HStack spacing={2}>
                <Icon as={FaClock} boxSize={3} color="gray.500" />
                <Text fontSize="xs" color="gray.600">
                  {formatTimeRemaining(proposal.votingEnds)}
                </Text>
              </HStack>
            </HStack>

            {/* Vote bars */}
            <VStack spacing={2}>
              <HStack w="full" justify="space-between">
                <HStack>
                  <Icon as={FaCheckCircle} color="green.500" boxSize={3} />
                  <Text fontSize="xs">For ({votePercentages.for.toFixed(1)}%)</Text>
                </HStack>
                <Text fontSize="xs" fontWeight="bold">
                  {proposal.forVotes.toLocaleString()}
                </Text>
              </HStack>
              <Progress
                value={votePercentages.for}
                colorScheme="green"
                size="sm"
                w="full"
                rounded="full"
              />

              <HStack w="full" justify="space-between">
                <HStack>
                  <Icon as={FaTimesCircle} color="red.500" boxSize={3} />
                  <Text fontSize="xs">Against ({votePercentages.against.toFixed(1)}%)</Text>
                </HStack>
                <Text fontSize="xs" fontWeight="bold">
                  {proposal.againstVotes.toLocaleString()}
                </Text>
              </HStack>
              <Progress
                value={votePercentages.against}
                colorScheme="red"
                size="sm"
                w="full"
                rounded="full"
              />

              {proposal.abstainVotes > 0 && (
                <>
                  <HStack w="full" justify="space-between">
                    <Text fontSize="xs">Abstain ({votePercentages.abstain.toFixed(1)}%)</Text>
                    <Text fontSize="xs" fontWeight="bold">
                      {proposal.abstainVotes.toLocaleString()}
                    </Text>
                  </HStack>
                  <Progress
                    value={votePercentages.abstain}
                    colorScheme="gray"
                    size="sm"
                    w="full"
                    rounded="full"
                  />
                </>
              )}
            </VStack>

            {/* Quorum indicator */}
            <HStack justify="space-between" fontSize="xs">
              <Text color="gray.600">
                Quorum: {proposal.currentQuorum.toFixed(1)}% / {proposal.quorumRequired}%
              </Text>
              <Badge
                colorScheme={quorumMet ? "green" : "orange"}
                variant="subtle"
              >
                {quorumMet ? "Met" : "Pending"}
              </Badge>
            </HStack>
          </VStack>

          <Divider />

          {/* User voting section */}
          {proposal.status === "ACTIVE" && (
            <VStack spacing={3}>
              {proposal.hasVoted ? (
                <Box
                  bg="blue.50"
                  p={3}
                  rounded="md"
                  w="full"
                  textAlign="center"
                >
                  <Text fontSize="sm" color="blue.700">
                    You voted: <Text as="span" fontWeight="bold">{proposal.userVote}</Text>
                  </Text>
                  <Text fontSize="xs" color="blue.600">
                    Voting power: {proposal.userVotingPower?.toLocaleString()} shares
                  </Text>
                </Box>
              ) : (
                <HStack spacing={2} w="full">
                  <Button
                    size="sm"
                    colorScheme="green"
                    variant="outline"
                    flex={1}
                    onClick={() => onVote?.(proposal.id, "FOR")}
                    isLoading={isLoading}
                  >
                    For
                  </Button>
                  <Button
                    size="sm"
                    colorScheme="red"
                    variant="outline"
                    flex={1}
                    onClick={() => onVote?.(proposal.id, "AGAINST")}
                    isLoading={isLoading}
                  >
                    Against
                  </Button>
                  <Button
                    size="sm"
                    colorScheme="gray"
                    variant="outline"
                    flex={1}
                    onClick={() => onVote?.(proposal.id, "ABSTAIN")}
                    isLoading={isLoading}
                  >
                    Abstain
                  </Button>
                </HStack>
              )}
            </VStack>
          )}

          {/* Action buttons */}
          <HStack spacing={2}>
            <Button
              size="sm"
              variant="outline"
              flex={1}
              onClick={() => onViewDetails?.(proposal.id)}
            >
              View Details
            </Button>
            {proposal.status === "ACTIVE" && proposal.userVotingPower && (
              <Tooltip label={`Your voting power: ${proposal.userVotingPower.toLocaleString()} shares`}>
                <Badge colorScheme="purple" px={2} py={1}>
                  {proposal.userVotingPower.toLocaleString()}
                </Badge>
              </Tooltip>
            )}
          </HStack>

          {/* Proposer info */}
          <HStack justify="space-between" fontSize="xs" color="gray.500">
            <Text>
              Proposed by {proposal.proposer.slice(0, 6)}...{proposal.proposer.slice(-4)}
            </Text>
            <Text>
              {proposal.createdAt.toLocaleDateString()}
            </Text>
          </HStack>
        </VStack>
      </CardBody>
    </Card>
  );
}
