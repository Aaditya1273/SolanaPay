"use client";

import { useState, useEffect } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  Button,
  Badge,
  Icon,
  useColorModeValue,
  Grid,
  GridItem,
  Select,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Link,
  Tooltip,
  SimpleGrid,
} from "@chakra-ui/react";
import {
  FaSearch,
  FaBookOpen,
  FaGavel,
  FaFileAlt,
  FaExternalLinkAlt,
  FaFilter,
  FaDownload,
  FaEye,
  FaStar,
  FaCalendar,
} from "react-icons/fa";
import { LegalSource, Region, AssetType } from "../../services/legalBotService";

interface LegalResourceLibraryProps {
  onResourceSelect?: (resource: LegalSource) => void;
}

interface ResourceCategory {
  id: string;
  name: string;
  description: string;
  icon: any;
  count: number;
}

export default function LegalResourceLibrary({ onResourceSelect }: LegalResourceLibraryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<Region | "ALL">("ALL");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [filteredResources, setFilteredResources] = useState<LegalSource[]>([]);
  const [featuredResources, setFeaturedResources] = useState<LegalSource[]>([]);

  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  // Mock legal resources data
  const mockResources: LegalSource[] = [
    {
      id: "sec-howey-test",
      title: "SEC v. W.J. Howey Co. - Investment Contract Test",
      type: "case_law",
      jurisdiction: "US",
      excerpt: "Supreme Court case establishing the four-prong test for determining whether an arrangement constitutes an investment contract under federal securities laws.",
      url: "https://www.sec.gov/about/laws/secrulesregs.htm",
      relevanceScore: 0.95
    },
    {
      id: "mifid-ii-directive",
      title: "Markets in Financial Instruments Directive II (MiFID II)",
      type: "regulation",
      jurisdiction: "EU",
      excerpt: "EU regulation governing investment services and activities, market transparency, and investor protection in financial markets.",
      url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32014L0065",
      relevanceScore: 0.92
    },
    {
      id: "cftc-digital-assets",
      title: "CFTC Digital Asset Guidance",
      type: "guidance",
      jurisdiction: "US",
      excerpt: "Commodity Futures Trading Commission guidance on the application of commodity regulations to digital assets and virtual currencies.",
      url: "https://www.cftc.gov/digitalassets",
      relevanceScore: 0.88
    },
    {
      id: "gdpr-regulation",
      title: "General Data Protection Regulation (GDPR)",
      type: "regulation",
      jurisdiction: "EU",
      excerpt: "EU regulation on data protection and privacy for individuals within the European Union and European Economic Area.",
      url: "https://gdpr-info.eu/",
      relevanceScore: 0.85
    },
    {
      id: "fca-cryptoasset-guidance",
      title: "FCA Guidance on Cryptoassets",
      type: "guidance",
      jurisdiction: "UK",
      excerpt: "Financial Conduct Authority guidance on the regulatory treatment of cryptoassets and related activities in the UK.",
      url: "https://www.fca.org.uk/publications/guidance-consultations/guidance-cryptoassets",
      relevanceScore: 0.82
    },
    {
      id: "reg-d-private-placement",
      title: "Regulation D - Private Placement Exemptions",
      type: "regulation",
      jurisdiction: "US",
      excerpt: "SEC regulation providing exemptions from registration requirements for private offerings of securities.",
      url: "https://www.sec.gov/smallbusiness/exemptofferings/rule506",
      relevanceScore: 0.90
    }
  ];

  const categories: ResourceCategory[] = [
    {
      id: "case_law",
      name: "Case Law",
      description: "Court decisions and legal precedents",
      icon: FaGavel,
      count: mockResources.filter(r => r.type === "case_law").length
    },
    {
      id: "regulation",
      name: "Regulations",
      description: "Government regulations and statutes",
      icon: FaFileAlt,
      count: mockResources.filter(r => r.type === "regulation").length
    },
    {
      id: "guidance",
      name: "Guidance",
      description: "Regulatory guidance and interpretations",
      icon: FaBookOpen,
      count: mockResources.filter(r => r.type === "guidance").length
    },
    {
      id: "best_practice",
      name: "Best Practices",
      description: "Industry standards and recommendations",
      icon: FaStar,
      count: mockResources.filter(r => r.type === "best_practice").length
    }
  ];

  const regions = [
    { value: "ALL", label: "All Jurisdictions" },
    { value: "US", label: "United States" },
    { value: "EU", label: "European Union" },
    { value: "UK", label: "United Kingdom" },
    { value: "APAC", label: "Asia Pacific" },
    { value: "GLOBAL", label: "Global" }
  ];

  useEffect(() => {
    filterResources();
    setFeaturedResources(mockResources.slice(0, 3));
  }, [searchTerm, selectedRegion, selectedType]);

  const filterResources = () => {
    let filtered = mockResources;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(resource =>
        resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by region
    if (selectedRegion !== "ALL") {
      filtered = filtered.filter(resource => resource.jurisdiction === selectedRegion);
    }

    // Filter by type
    if (selectedType !== "all") {
      filtered = filtered.filter(resource => resource.type === selectedType);
    }

    // Sort by relevance score
    filtered.sort((a, b) => b.relevanceScore - a.relevanceScore);

    setFilteredResources(filtered);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "case_law": return "purple";
      case "regulation": return "blue";
      case "guidance": return "green";
      case "best_practice": return "orange";
      default: return "gray";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "case_law": return FaGavel;
      case "regulation": return FaFileAlt;
      case "guidance": return FaBookOpen;
      case "best_practice": return FaStar;
      default: return FaFileAlt;
    }
  };

  const handleResourceClick = (resource: LegalSource) => {
    if (onResourceSelect) {
      onResourceSelect(resource);
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <Box
        bg={cardBg}
        p={6}
        rounded="xl"
        border="1px solid"
        borderColor={borderColor}
      >
        <VStack spacing={4} align="stretch">
          <HStack>
            <Icon as={FaBookOpen} color="purple.500" boxSize={6} />
            <VStack align="start" spacing={0}>
              <Text fontSize="xl" fontWeight="bold">
                Legal Resource Library
              </Text>
              <Text color="gray.600">
                Comprehensive collection of RWA legal resources and compliance materials
              </Text>
            </VStack>
          </HStack>

          {/* Search and Filters */}
          <Grid templateColumns={{ base: "1fr", md: "2fr 1fr 1fr" }} gap={4}>
            <GridItem>
              <InputGroup>
                <InputLeftElement>
                  <Icon as={FaSearch} color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Search legal resources..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </GridItem>

            <GridItem>
              <Select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value as Region | "ALL")}
              >
                {regions.map((region) => (
                  <option key={region.value} value={region.value}>
                    {region.label}
                  </option>
                ))}
              </Select>
            </GridItem>

            <GridItem>
              <Select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="all">All Types</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </GridItem>
          </Grid>
        </VStack>
      </Box>

      {/* Resource Categories */}
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
        {categories.map((category) => (
          <Box
            key={category.id}
            bg={cardBg}
            p={4}
            rounded="lg"
            border="1px solid"
            borderColor={borderColor}
            cursor="pointer"
            _hover={{ borderColor: "purple.300", transform: "translateY(-2px)" }}
            transition="all 0.2s"
            onClick={() => setSelectedType(category.id)}
          >
            <VStack spacing={2}>
              <Icon as={category.icon} color="purple.500" boxSize={6} />
              <Text fontWeight="semibold" fontSize="sm" textAlign="center">
                {category.name}
              </Text>
              <Badge colorScheme="purple" variant="outline">
                {category.count} resources
              </Badge>
            </VStack>
          </Box>
        ))}
      </SimpleGrid>

      {/* Featured Resources */}
      <Box
        bg={cardBg}
        p={6}
        rounded="xl"
        border="1px solid"
        borderColor={borderColor}
      >
        <VStack spacing={4} align="stretch">
          <HStack>
            <Icon as={FaStar} color="orange.500" />
            <Text fontSize="lg" fontWeight="bold">
              Featured Resources
            </Text>
          </HStack>

          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
            {featuredResources.map((resource) => (
              <Card
                key={resource.id}
                variant="outline"
                cursor="pointer"
                _hover={{ shadow: "md", borderColor: "purple.300" }}
                onClick={() => handleResourceClick(resource)}
              >
                <CardHeader pb={2}>
                  <HStack justify="space-between" align="start">
                    <VStack align="start" spacing={1} flex={1}>
                      <HStack>
                        <Icon as={getTypeIcon(resource.type)} color={`${getTypeColor(resource.type)}.500`} />
                        <Badge colorScheme={getTypeColor(resource.type)} size="sm">
                          {resource.type.replace('_', ' ')}
                        </Badge>
                      </HStack>
                      <Text fontSize="sm" fontWeight="bold" noOfLines={2}>
                        {resource.title}
                      </Text>
                    </VStack>
                    <Badge variant="outline" size="sm">
                      {resource.jurisdiction}
                    </Badge>
                  </HStack>
                </CardHeader>
                <CardBody pt={0}>
                  <Text fontSize="xs" color="gray.600" noOfLines={3}>
                    {resource.excerpt}
                  </Text>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        </VStack>
      </Box>

      {/* Resource List */}
      <Box
        bg={cardBg}
        p={6}
        rounded="xl"
        border="1px solid"
        borderColor={borderColor}
      >
        <VStack spacing={4} align="stretch">
          <HStack justify="space-between">
            <Text fontSize="lg" fontWeight="bold">
              Legal Resources
            </Text>
            <Badge colorScheme="purple" variant="outline">
              {filteredResources.length} results
            </Badge>
          </HStack>

          <Divider />

          <VStack spacing={3} align="stretch">
            {filteredResources.map((resource) => (
              <Box
                key={resource.id}
                p={4}
                border="1px solid"
                borderColor={borderColor}
                rounded="lg"
                cursor="pointer"
                _hover={{ borderColor: "purple.300", bg: "purple.50" }}
                onClick={() => handleResourceClick(resource)}
              >
                <VStack spacing={3} align="stretch">
                  <HStack justify="space-between" align="start">
                    <HStack spacing={3} flex={1}>
                      <Icon as={getTypeIcon(resource.type)} color={`${getTypeColor(resource.type)}.500`} boxSize={5} />
                      <VStack align="start" spacing={1} flex={1}>
                        <Text fontWeight="bold" fontSize="md">
                          {resource.title}
                        </Text>
                        <HStack spacing={2}>
                          <Badge colorScheme={getTypeColor(resource.type)} size="sm">
                            {resource.type.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline" size="sm">
                            {resource.jurisdiction}
                          </Badge>
                          <Badge colorScheme="green" variant="outline" size="sm">
                            {Math.round(resource.relevanceScore * 100)}% relevant
                          </Badge>
                        </HStack>
                      </VStack>
                    </HStack>

                    <HStack spacing={2}>
                      <Tooltip label="View Resource">
                        <Button size="sm" variant="outline" leftIcon={<Icon as={FaEye} />}>
                          View
                        </Button>
                      </Tooltip>
                      {resource.url && (
                        <Tooltip label="External Link">
                          <Button
                            as={Link}
                            href={resource.url}
                            isExternal
                            size="sm"
                            variant="outline"
                            leftIcon={<Icon as={FaExternalLinkAlt} />}
                            onClick={(e) => e.stopPropagation()}
                          >
                            Source
                          </Button>
                        </Tooltip>
                      )}
                    </HStack>
                  </HStack>

                  <Text fontSize="sm" color="gray.600" noOfLines={2}>
                    {resource.excerpt}
                  </Text>
                </VStack>
              </Box>
            ))}

            {filteredResources.length === 0 && (
              <Box textAlign="center" py={8}>
                <VStack spacing={3}>
                  <Icon as={FaSearch} boxSize={12} color="gray.400" />
                  <Text fontSize="lg" fontWeight="bold" color="gray.600">
                    No Resources Found
                  </Text>
                  <Text color="gray.500">
                    Try adjusting your search terms or filters
                  </Text>
                </VStack>
              </Box>
            )}
          </VStack>
        </VStack>
      </Box>
    </VStack>
  );
}
