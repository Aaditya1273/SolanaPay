"use client";

import {
  Box,
  HStack,
  VStack,
  Text,
  Badge,
  Icon,
  Tooltip,
  SimpleGrid,
  useColorModeValue,
} from "@chakra-ui/react";
import {
  FaLeaf,
  FaRecycle,
  FaWater,
  FaBolt,
  FaUsers,
  FaHandsHelping,
  FaShieldAlt,
  FaAward,
  FaCertificate,
  FaStar,
  FaGlobe,
  FaHeart,
} from "react-icons/fa";
import { ESGCertification, ImpactMetrics } from "../../services/esgService";

interface SustainabilityBadgesProps {
  certifications: ESGCertification[];
  impactMetrics: ImpactMetrics;
  assetType: string;
  size?: "sm" | "md" | "lg";
  maxBadges?: number;
}

export default function SustainabilityBadges({
  certifications,
  impactMetrics,
  assetType,
  size = "md",
  maxBadges = 6
}: SustainabilityBadgesProps) {
  const cardBg = useColorModeValue("white", "gray.800");

  // Generate impact-based badges
  const getImpactBadges = () => {
    const badges = [];

    // Carbon Neutral/Negative
    if (impactMetrics.carbonFootprint <= 10) {
      badges.push({
        icon: FaLeaf,
        label: "Carbon Neutral",
        color: "green",
        description: "Minimal carbon footprint",
        verified: true
      });
    }

    // High Energy Efficiency
    if (impactMetrics.energyEfficiency <= 50) {
      badges.push({
        icon: FaBolt,
        label: "Energy Efficient",
        color: "yellow",
        description: "Low energy consumption",
        verified: true
      });
    }

    // Water Conservation
    if (impactMetrics.waterUsage <= 500) {
      badges.push({
        icon: FaWater,
        label: "Water Wise",
        color: "blue",
        description: "Efficient water usage",
        verified: true
      });
    }

    // Waste Reduction
    if (impactMetrics.wasteReduction >= 30) {
      badges.push({
        icon: FaRecycle,
        label: "Waste Reducer",
        color: "purple",
        description: `${impactMetrics.wasteReduction}% waste reduction`,
        verified: true
      });
    }

    // Job Creator
    if (impactMetrics.jobsCreated >= 20) {
      badges.push({
        icon: FaUsers,
        label: "Job Creator",
        color: "blue",
        description: `${impactMetrics.jobsCreated} jobs created`,
        verified: true
      });
    }

    // Community Impact
    if (impactMetrics.communityBenefit >= 70) {
      badges.push({
        icon: FaHandsHelping,
        label: "Community Champion",
        color: "orange",
        description: "High community benefit score",
        verified: true
      });
    }

    // Social Programs
    if (impactMetrics.socialPrograms >= 3) {
      badges.push({
        icon: FaHeart,
        label: "Social Impact",
        color: "pink",
        description: `${impactMetrics.socialPrograms} social programs`,
        verified: true
      });
    }

    return badges;
  };

  // Generate certification badges
  const getCertificationBadges = () => {
    return certifications.map(cert => ({
      icon: FaCertificate,
      label: cert.name,
      color: getCertificationColor(cert.name),
      description: `Issued by ${cert.issuer}`,
      verified: cert.verified
    }));
  };

  // Generate asset-specific badges
  const getAssetTypeBadges = () => {
    const badges = [];

    switch (assetType) {
      case 'renewable-energy':
        badges.push({
          icon: FaBolt,
          label: "Clean Energy",
          color: "green",
          description: "Renewable energy asset",
          verified: true
        });
        break;
      case 'carbon-credits':
        badges.push({
          icon: FaLeaf,
          label: "Carbon Credits",
          color: "teal",
          description: "Verified carbon offset",
          verified: true
        });
        break;
      case 'real-estate':
        if (impactMetrics.energyEfficiency <= 75) {
          badges.push({
            icon: FaShieldAlt,
            label: "Green Building",
            color: "green",
            description: "Sustainable real estate",
            verified: true
          });
        }
        break;
      case 'agriculture':
        badges.push({
          icon: FaLeaf,
          label: "Sustainable Farming",
          color: "green",
          description: "Eco-friendly agriculture",
          verified: true
        });
        break;
      case 'forestry':
        badges.push({
          icon: FaLeaf,
          label: "Forest Conservation",
          color: "green",
          description: "Protecting natural forests",
          verified: true
        });
        break;
    }

    return badges;
  };

  const getCertificationColor = (certName: string) => {
    const colors: { [key: string]: string } = {
      'LEED': 'green',
      'BREEAM': 'blue',
      'Energy Star': 'yellow',
      'B Corp': 'purple',
      'ISO 14001': 'teal',
      'TCFD': 'orange',
      'GRI': 'cyan',
      'SASB': 'pink'
    };
    return colors[certName] || 'gray';
  };

  // Combine all badges
  const allBadges = [
    ...getImpactBadges(),
    ...getCertificationBadges(),
    ...getAssetTypeBadges()
  ].slice(0, maxBadges);

  const badgeSize = {
    sm: { fontSize: "xs", px: 2, py: 1 },
    md: { fontSize: "sm", px: 3, py: 1 },
    lg: { fontSize: "md", px: 4, py: 2 }
  }[size];

  if (allBadges.length === 0) {
    return null;
  }

  return (
    <Box>
      <SimpleGrid 
        columns={{ base: 2, md: 3, lg: Math.min(4, allBadges.length) }} 
        spacing={2}
      >
        {allBadges.map((badge, index) => (
          <Tooltip
            key={index}
            label={badge.description}
            placement="top"
            hasArrow
          >
            <Badge
              colorScheme={badge.color}
              variant={badge.verified ? "solid" : "outline"}
              display="flex"
              alignItems="center"
              gap={1}
              fontSize={badgeSize.fontSize}
              px={badgeSize.px}
              py={badgeSize.py}
              rounded="md"
              cursor="help"
              _hover={{ transform: "scale(1.05)" }}
              transition="transform 0.2s"
            >
              <Icon as={badge.icon} boxSize={3} />
              <Text noOfLines={1}>{badge.label}</Text>
              {badge.verified && (
                <Icon as={FaStar} boxSize={2} color="white" />
              )}
            </Badge>
          </Tooltip>
        ))}
      </SimpleGrid>

      {/* Show count if there are more badges */}
      {(getImpactBadges().length + getCertificationBadges().length + getAssetTypeBadges().length) > maxBadges && (
        <Text fontSize="xs" color="gray.500" mt={2} textAlign="center">
          +{(getImpactBadges().length + getCertificationBadges().length + getAssetTypeBadges().length) - maxBadges} more sustainability achievements
        </Text>
      )}
    </Box>
  );
}
