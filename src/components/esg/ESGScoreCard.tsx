"use client";

import {
  Box,
  VStack,
  HStack,
  Text,
  Progress,
  Badge,
  Icon,
  SimpleGrid,
  Tooltip,
  useColorModeValue,
  CircularProgress,
  CircularProgressLabel,
} from "@chakra-ui/react";
import {
  FaLeaf,
  FaUsers,
  FaShieldAlt,
  FaAward,
  FaInfoCircle,
  FaChartLine,
} from "react-icons/fa";
import { ESGScore } from "../../services/esgService";

interface ESGScoreCardProps {
  esgScore: ESGScore;
  size?: "sm" | "md" | "lg";
  showDetails?: boolean;
}

export default function ESGScoreCard({ 
  esgScore, 
  size = "md", 
  showDetails = true 
}: ESGScoreCardProps) {
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  const getScoreColor = (score: number) => {
    if (score >= 80) return "green";
    if (score >= 60) return "blue";
    if (score >= 40) return "yellow";
    return "red";
  };

  const getScoreGrade = (score: number) => {
    if (score >= 90) return "A+";
    if (score >= 80) return "A";
    if (score >= 70) return "B+";
    if (score >= 60) return "B";
    if (score >= 50) return "C+";
    if (score >= 40) return "C";
    return "D";
  };

  const formatLastUpdated = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const cardSize = {
    sm: { p: 3, fontSize: "sm" },
    md: { p: 4, fontSize: "md" },
    lg: { p: 6, fontSize: "lg" }
  }[size];

  return (
    <Box
      bg={cardBg}
      border="1px solid"
      borderColor={borderColor}
      rounded="xl"
      p={cardSize.p}
      shadow="md"
      _hover={{ shadow: "lg" }}
      transition="all 0.2s"
    >
      <VStack spacing={4} align="stretch">
        {/* Overall ESG Score */}
        <HStack justify="space-between" align="center">
          <VStack align="start" spacing={1}>
            <HStack>
              <Icon as={FaChartLine} color={`${getScoreColor(esgScore.overall)}.500`} />
              <Text fontWeight="bold" fontSize={cardSize.fontSize}>
                ESG Score
              </Text>
            </HStack>
            <Text fontSize="xs" color="gray.500">
              Updated {formatLastUpdated(esgScore.lastUpdated)}
            </Text>
          </VStack>

          <VStack align="center" spacing={1}>
            <CircularProgress
              value={esgScore.overall}
              color={`${getScoreColor(esgScore.overall)}.500`}
              size={size === "sm" ? "60px" : size === "md" ? "80px" : "100px"}
              thickness="8px"
            >
              <CircularProgressLabel>
                <VStack spacing={0}>
                  <Text fontSize={size === "sm" ? "lg" : "xl"} fontWeight="bold">
                    {Math.round(esgScore.overall)}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {getScoreGrade(esgScore.overall)}
                  </Text>
                </VStack>
              </CircularProgressLabel>
            </CircularProgress>
          </VStack>
        </HStack>

        {showDetails && (
          <>
            {/* Individual Scores */}
            <SimpleGrid columns={3} spacing={3}>
              {/* Environmental */}
              <VStack spacing={2}>
                <HStack>
                  <Icon as={FaLeaf} color="green.500" boxSize={4} />
                  <Tooltip label="Environmental impact and sustainability practices">
                    <Icon as={FaInfoCircle} color="gray.400" boxSize={3} />
                  </Tooltip>
                </HStack>
                <Text fontSize="xs" color="gray.600" textAlign="center">
                  Environmental
                </Text>
                <Progress
                  value={esgScore.environmental}
                  colorScheme={getScoreColor(esgScore.environmental)}
                  size="sm"
                  rounded="full"
                  w="full"
                />
                <Text fontSize="sm" fontWeight="bold" color={`${getScoreColor(esgScore.environmental)}.600`}>
                  {Math.round(esgScore.environmental)}
                </Text>
              </VStack>

              {/* Social */}
              <VStack spacing={2}>
                <HStack>
                  <Icon as={FaUsers} color="blue.500" boxSize={4} />
                  <Tooltip label="Social impact and community benefits">
                    <Icon as={FaInfoCircle} color="gray.400" boxSize={3} />
                  </Tooltip>
                </HStack>
                <Text fontSize="xs" color="gray.600" textAlign="center">
                  Social
                </Text>
                <Progress
                  value={esgScore.social}
                  colorScheme={getScoreColor(esgScore.social)}
                  size="sm"
                  rounded="full"
                  w="full"
                />
                <Text fontSize="sm" fontWeight="bold" color={`${getScoreColor(esgScore.social)}.600`}>
                  {Math.round(esgScore.social)}
                </Text>
              </VStack>

              {/* Governance */}
              <VStack spacing={2}>
                <HStack>
                  <Icon as={FaShieldAlt} color="purple.500" boxSize={4} />
                  <Tooltip label="Corporate governance and compliance">
                    <Icon as={FaInfoCircle} color="gray.400" boxSize={3} />
                  </Tooltip>
                </HStack>
                <Text fontSize="xs" color="gray.600" textAlign="center">
                  Governance
                </Text>
                <Progress
                  value={esgScore.governance}
                  colorScheme={getScoreColor(esgScore.governance)}
                  size="sm"
                  rounded="full"
                  w="full"
                />
                <Text fontSize="sm" fontWeight="bold" color={`${getScoreColor(esgScore.governance)}.600`}>
                  {Math.round(esgScore.governance)}
                </Text>
              </VStack>
            </SimpleGrid>

            {/* Certifications */}
            {esgScore.certifications && esgScore.certifications.length > 0 && (
              <VStack align="start" spacing={2}>
                <HStack>
                  <Icon as={FaAward} color="gold" boxSize={4} />
                  <Text fontSize="sm" fontWeight="semibold">
                    Certifications
                  </Text>
                </HStack>
                <HStack spacing={2} flexWrap="wrap">
                  {esgScore.certifications.slice(0, 3).map((cert, index) => (
                    <Badge
                      key={index}
                      colorScheme="green"
                      variant="outline"
                      fontSize="xs"
                      px={2}
                      py={1}
                      rounded="md"
                    >
                      {cert}
                    </Badge>
                  ))}
                  {esgScore.certifications.length > 3 && (
                    <Badge
                      colorScheme="gray"
                      variant="outline"
                      fontSize="xs"
                      px={2}
                      py={1}
                      rounded="md"
                    >
                      +{esgScore.certifications.length - 3} more
                    </Badge>
                  )}
                </HStack>
              </VStack>
            )}

            {/* Key Impact Metrics */}
            <Box bg="gray.50" p={3} rounded="lg">
              <Text fontSize="sm" fontWeight="semibold" mb={2}>
                Key Impact Metrics
              </Text>
              <SimpleGrid columns={2} spacing={2}>
                <VStack align="start" spacing={1}>
                  <Text fontSize="xs" color="gray.600">Carbon Footprint</Text>
                  <Text fontSize="sm" fontWeight="bold">
                    {esgScore.impactMetrics.carbonFootprint.toFixed(1)} kg CO₂
                  </Text>
                </VStack>
                <VStack align="start" spacing={1}>
                  <Text fontSize="xs" color="gray.600">Jobs Created</Text>
                  <Text fontSize="sm" fontWeight="bold">
                    {esgScore.impactMetrics.jobsCreated}
                  </Text>
                </VStack>
                <VStack align="start" spacing={1}>
                  <Text fontSize="xs" color="gray.600">Energy Efficiency</Text>
                  <Text fontSize="sm" fontWeight="bold">
                    {esgScore.impactMetrics.energyEfficiency.toFixed(1)} kWh
                  </Text>
                </VStack>
                <VStack align="start" spacing={1}>
                  <Text fontSize="xs" color="gray.600">Community Benefit</Text>
                  <Text fontSize="sm" fontWeight="bold">
                    {Math.round(esgScore.impactMetrics.communityBenefit)}/100
                  </Text>
                </VStack>
              </SimpleGrid>
            </Box>
          </>
        )}
      </VStack>
    </Box>
  );
}
