"use client";

import { useState, useEffect } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  useColorModeValue,
  Icon,
  Grid,
  GridItem,
  Card,
  CardBody,
  CardHeader,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Progress,
  CircularProgress,
  CircularProgressLabel,
  Tooltip,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Flex,
  Spacer,
} from "@chakra-ui/react";
import {
  FaShieldAlt,
  FaFileAlt,
  FaCheck,
  FaTimes,
  FaExclamationTriangle,
  FaSearch,
  FaUpload,
  FaEye,
  FaClock,
  FaChartLine,
  FaFilter,
  FaDownload,
  FaRefresh,
} from "react-icons/fa";
import { 
  Document, 
  VerificationResult,
  proofOfAuthenticityService 
} from "../../services/proofOfAuthenticityService";
import DocumentUploader from "./DocumentUploader";
import DocumentVerifier from "./DocumentVerifier";

interface DashboardStats {
  totalDocuments: number;
  verifiedDocuments: number;
  pendingDocuments: number;
  failedDocuments: number;
  averageConfidence: number;
  recentActivity: number;
}

export default function AuthenticityDashboard() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalDocuments: 0,
    verifiedDocuments: 0,
    pendingDocuments: 0,
    failedDocuments: 0,
    averageConfidence: 0,
    recentActivity: 0,
  });
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState(0);

  const { isOpen: isUploadOpen, onOpen: onUploadOpen, onClose: onUploadClose } = useDisclosure();
  const { isOpen: isVerifyOpen, onOpen: onVerifyOpen, onClose: onVerifyClose } = useDisclosure();
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();

  const toast = useToast();

  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const statBg = useColorModeValue("gray.50", "gray.700");

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Load mock documents for demonstration
      const mockDocuments = await proofOfAuthenticityService.getAllDocuments();
      setDocuments(mockDocuments);
      
      // Calculate stats
      const totalDocs = mockDocuments.length;
      const verified = mockDocuments.filter(doc => doc.status === 'verified').length;
      const pending = mockDocuments.filter(doc => doc.status === 'pending').length;
      const failed = mockDocuments.filter(doc => doc.status === 'failed').length;
      
      // Calculate average confidence from verification results
      let totalConfidence = 0;
      let verifiedCount = 0;
      
      for (const doc of mockDocuments) {
        if (doc.status === 'verified') {
          try {
            const result = await proofOfAuthenticityService.verifyDocument(doc.id);
            totalConfidence += result.overallScore;
            verifiedCount++;
          } catch (error) {
            // Skip if verification fails
          }
        }
      }
      
      const avgConfidence = verifiedCount > 0 ? Math.round(totalConfidence / verifiedCount) : 0;
      
      setStats({
        totalDocuments: totalDocs,
        verifiedDocuments: verified,
        pendingDocuments: pending,
        failedDocuments: failed,
        averageConfidence: avgConfidence,
        recentActivity: Math.floor(Math.random() * 10) + 1, // Mock recent activity
      });
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error Loading Data",
        description: "Failed to load dashboard data",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadComplete = (document: Document) => {
    setDocuments(prev => [document, ...prev]);
    setStats(prev => ({
      ...prev,
      totalDocuments: prev.totalDocuments + 1,
      pendingDocuments: prev.pendingDocuments + 1,
      recentActivity: prev.recentActivity + 1,
    }));
    onUploadClose();
  };

  const handleVerificationComplete = (result: VerificationResult) => {
    // Update document status based on verification result
    setDocuments(prev => prev.map(doc => 
      doc.id === result.documentId 
        ? { ...doc, status: result.isValid ? 'verified' : 'failed' }
        : doc
    ));
    
    // Update stats
    setStats(prev => ({
      ...prev,
      verifiedDocuments: result.isValid ? prev.verifiedDocuments + 1 : prev.verifiedDocuments,
      failedDocuments: !result.isValid ? prev.failedDocuments + 1 : prev.failedDocuments,
      pendingDocuments: Math.max(0, prev.pendingDocuments - 1),
    }));
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'verified': return 'green';
      case 'pending': return 'yellow';
      case 'failed': return 'red';
      case 'expired': return 'orange';
      default: return 'gray';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <VStack spacing={6} align="center" justify="center" minH="400px">
        <CircularProgress isIndeterminate color="purple.500" size="80px" />
        <Text>Loading dashboard...</Text>
      </VStack>
    );
  }

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
        <Flex align="center">
          <HStack spacing={4}>
            <Icon as={FaShieldAlt} color="purple.500" boxSize={8} />
            <VStack align="start" spacing={1}>
              <Text fontSize="2xl" fontWeight="bold">
                Proof of Authenticity Dashboard
              </Text>
              <Text color="gray.600">
                Manage and verify document authenticity with blockchain security
              </Text>
            </VStack>
          </HStack>
          
          <Spacer />
          
          <HStack spacing={3}>
            <Button
              colorScheme="purple"
              leftIcon={<Icon as={FaUpload} />}
              onClick={onUploadOpen}
            >
              Upload Document
            </Button>
            <Button
              variant="outline"
              leftIcon={<Icon as={FaSearch} />}
              onClick={onVerifyOpen}
            >
              Verify Document
            </Button>
            <Button
              variant="ghost"
              leftIcon={<Icon as={FaRefresh} />}
              onClick={loadDashboardData}
            >
              Refresh
            </Button>
          </HStack>
        </Flex>
      </Box>

      {/* Stats Grid */}
      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }} gap={6}>
        <GridItem>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Total Documents</StatLabel>
                <StatNumber>{stats.totalDocuments}</StatNumber>
                <StatHelpText>
                  <StatArrow type="increase" />
                  {stats.recentActivity} this week
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Verified Documents</StatLabel>
                <StatNumber color="green.500">{stats.verifiedDocuments}</StatNumber>
                <StatHelpText>
                  {stats.totalDocuments > 0 
                    ? `${Math.round((stats.verifiedDocuments / stats.totalDocuments) * 100)}% of total`
                    : "0% of total"
                  }
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Average Confidence</StatLabel>
                <StatNumber>{stats.averageConfidence}%</StatNumber>
                <StatHelpText>
                  <CircularProgress 
                    value={stats.averageConfidence} 
                    color={stats.averageConfidence >= 80 ? "green.500" : stats.averageConfidence >= 60 ? "yellow.500" : "red.500"}
                    size="40px"
                    thickness="8px"
                  />
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem>
          <Card>
            <CardBody>
              <VStack spacing={2}>
                <HStack w="full" justify="space-between">
                  <Text fontSize="sm" color="gray.600">Pending</Text>
                  <Text fontSize="sm" fontWeight="bold" color="yellow.500">
                    {stats.pendingDocuments}
                  </Text>
                </HStack>
                <HStack w="full" justify="space-between">
                  <Text fontSize="sm" color="gray.600">Failed</Text>
                  <Text fontSize="sm" fontWeight="bold" color="red.500">
                    {stats.failedDocuments}
                  </Text>
                </HStack>
                <Progress 
                  value={stats.totalDocuments > 0 ? (stats.verifiedDocuments / stats.totalDocuments) * 100 : 0}
                  colorScheme="green"
                  size="sm"
                  w="full"
                />
              </VStack>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>

      {/* Main Content Tabs */}
      <Card>
        <CardBody>
          <Tabs index={activeTab} onChange={setActiveTab}>
            <TabList>
              <Tab>
                <HStack spacing={2}>
                  <Icon as={FaFileAlt} />
                  <Text>Documents</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <Icon as={FaChartLine} />
                  <Text>Analytics</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <Icon as={FaClock} />
                  <Text>Recent Activity</Text>
                </HStack>
              </Tab>
            </TabList>

            <TabPanels>
              {/* Documents Tab */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  {/* Filters */}
                  <HStack spacing={4}>
                    <InputGroup maxW="300px">
                      <InputLeftElement>
                        <Icon as={FaSearch} color="gray.400" />
                      </InputLeftElement>
                      <Input
                        placeholder="Search documents..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </InputGroup>
                    
                    <Select
                      maxW="200px"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">All Status</option>
                      <option value="verified">Verified</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                    </Select>
                  </HStack>

                  {/* Documents Table */}
                  <TableContainer>
                    <Table variant="simple">
                      <Thead>
                        <Tr>
                          <Th>Document</Th>
                          <Th>Type</Th>
                          <Th>Status</Th>
                          <Th>Size</Th>
                          <Th>Created</Th>
                          <Th>Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {filteredDocuments.map((document) => (
                          <Tr key={document.id}>
                            <Td>
                              <VStack align="start" spacing={1}>
                                <Text fontWeight="semibold">{document.name}</Text>
                                <Text fontSize="xs" color="gray.500" fontFamily="mono">
                                  {document.id.substring(0, 8)}...
                                </Text>
                              </VStack>
                            </Td>
                            <Td>
                              <Badge colorScheme="blue" variant="outline">
                                {document.type.replace('_', ' ').toUpperCase()}
                              </Badge>
                            </Td>
                            <Td>
                              <Badge colorScheme={getStatusColor(document.status)}>
                                {document.status.toUpperCase()}
                              </Badge>
                            </Td>
                            <Td>{formatFileSize(document.size)}</Td>
                            <Td>{formatDate(document.createdAt)}</Td>
                            <Td>
                              <HStack spacing={2}>
                                <Tooltip label="View Details">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setSelectedDocument(document);
                                      onDetailOpen();
                                    }}
                                  >
                                    <Icon as={FaEye} />
                                  </Button>
                                </Tooltip>
                                <Tooltip label="Verify">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    colorScheme="purple"
                                    onClick={() => {
                                      setSelectedDocument(document);
                                      onVerifyOpen();
                                    }}
                                  >
                                    <Icon as={FaShieldAlt} />
                                  </Button>
                                </Tooltip>
                              </HStack>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </TableContainer>

                  {filteredDocuments.length === 0 && (
                    <Box textAlign="center" py={10}>
                      <Icon as={FaFileAlt} boxSize={12} color="gray.400" mb={4} />
                      <Text fontSize="lg" color="gray.600">
                        {searchTerm || statusFilter !== "all" 
                          ? "No documents match your filters"
                          : "No documents uploaded yet"
                        }
                      </Text>
                      <Text fontSize="sm" color="gray.500" mt={2}>
                        {!searchTerm && statusFilter === "all" && "Upload your first document to get started"}
                      </Text>
                    </Box>
                  )}
                </VStack>
              </TabPanel>

              {/* Analytics Tab */}
              <TabPanel>
                <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap={6}>
                  <GridItem>
                    <Card>
                      <CardHeader>
                        <Text fontSize="lg" fontWeight="bold">Verification Success Rate</Text>
                      </CardHeader>
                      <CardBody>
                        <VStack spacing={4}>
                          <CircularProgress 
                            value={stats.totalDocuments > 0 ? (stats.verifiedDocuments / stats.totalDocuments) * 100 : 0}
                            color="green.500"
                            size="120px"
                            thickness="8px"
                          >
                            <CircularProgressLabel fontSize="xl" fontWeight="bold">
                              {stats.totalDocuments > 0 
                                ? Math.round((stats.verifiedDocuments / stats.totalDocuments) * 100)
                                : 0
                              }%
                            </CircularProgressLabel>
                          </CircularProgress>
                          <Text textAlign="center" color="gray.600">
                            {stats.verifiedDocuments} of {stats.totalDocuments} documents verified
                          </Text>
                        </VStack>
                      </CardBody>
                    </Card>
                  </GridItem>

                  <GridItem>
                    <Card>
                      <CardHeader>
                        <Text fontSize="lg" fontWeight="bold">Document Types</Text>
                      </CardHeader>
                      <CardBody>
                        <VStack spacing={3} align="stretch">
                          {/* Mock document type distribution */}
                          <HStack justify="space-between">
                            <Text fontSize="sm">Property Deeds</Text>
                            <Badge colorScheme="blue">40%</Badge>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontSize="sm">Appraisal Reports</Text>
                            <Badge colorScheme="green">25%</Badge>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontSize="sm">Legal Contracts</Text>
                            <Badge colorScheme="purple">20%</Badge>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontSize="sm">Other</Text>
                            <Badge colorScheme="gray">15%</Badge>
                          </HStack>
                        </VStack>
                      </CardBody>
                    </Card>
                  </GridItem>
                </Grid>
              </TabPanel>

              {/* Recent Activity Tab */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  {documents.slice(0, 5).map((document) => (
                    <Card key={document.id}>
                      <CardBody>
                        <HStack spacing={4}>
                          <Icon 
                            as={document.status === 'verified' ? FaCheck : 
                                document.status === 'failed' ? FaTimes : FaClock} 
                            color={getStatusColor(document.status) + '.500'} 
                            boxSize={6}
                          />
                          <VStack align="start" spacing={1} flex={1}>
                            <Text fontWeight="semibold">{document.name}</Text>
                            <Text fontSize="sm" color="gray.600">
                              {document.status === 'verified' ? 'Successfully verified' :
                               document.status === 'failed' ? 'Verification failed' :
                               'Pending verification'} • {formatDate(document.createdAt)}
                            </Text>
                          </VStack>
                          <Badge colorScheme={getStatusColor(document.status)}>
                            {document.status.toUpperCase()}
                          </Badge>
                        </HStack>
                      </CardBody>
                    </Card>
                  ))}

                  {documents.length === 0 && (
                    <Box textAlign="center" py={10}>
                      <Icon as={FaClock} boxSize={12} color="gray.400" mb={4} />
                      <Text fontSize="lg" color="gray.600">No recent activity</Text>
                    </Box>
                  )}
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </CardBody>
      </Card>

      {/* Upload Modal */}
      <Modal isOpen={isUploadOpen} onClose={onUploadClose} size="6xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Upload Document</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <DocumentUploader 
              onUploadComplete={handleUploadComplete}
              onUploadError={(error) => {
                toast({
                  title: "Upload Error",
                  description: error,
                  status: "error",
                  duration: 5000,
                  isClosable: true,
                });
              }}
            />
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Verify Modal */}
      <Modal isOpen={isVerifyOpen} onClose={onVerifyClose} size="6xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Verify Document</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <DocumentVerifier 
              documentId={selectedDocument?.id}
              onVerificationComplete={handleVerificationComplete}
            />
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Document Detail Modal */}
      <Modal isOpen={isDetailOpen} onClose={onDetailClose} size="4xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Document Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedDocument && (
              <VStack spacing={4} align="stretch">
                <Grid templateColumns="1fr 2fr" gap={4}>
                  <Text fontWeight="semibold">Name:</Text>
                  <Text>{selectedDocument.name}</Text>
                  
                  <Text fontWeight="semibold">ID:</Text>
                  <Text fontFamily="mono" fontSize="sm">{selectedDocument.id}</Text>
                  
                  <Text fontWeight="semibold">Type:</Text>
                  <Badge colorScheme="blue" w="fit-content">
                    {selectedDocument.type.replace('_', ' ').toUpperCase()}
                  </Badge>
                  
                  <Text fontWeight="semibold">Status:</Text>
                  <Badge colorScheme={getStatusColor(selectedDocument.status)} w="fit-content">
                    {selectedDocument.status.toUpperCase()}
                  </Badge>
                  
                  <Text fontWeight="semibold">Size:</Text>
                  <Text>{formatFileSize(selectedDocument.size)}</Text>
                  
                  <Text fontWeight="semibold">Created:</Text>
                  <Text>{formatDate(selectedDocument.createdAt)}</Text>
                  
                  <Text fontWeight="semibold">Hash:</Text>
                  <Text fontFamily="mono" fontSize="sm">{selectedDocument.hash}</Text>
                </Grid>

                {selectedDocument.metadata && (
                  <>
                    <Text fontSize="lg" fontWeight="bold" mt={4}>Metadata</Text>
                    <Grid templateColumns="1fr 2fr" gap={2} fontSize="sm">
                      {Object.entries(selectedDocument.metadata).map(([key, value]) => (
                        value && (
                          <>
                            <Text key={key} fontWeight="semibold" textTransform="capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}:
                            </Text>
                            <Text key={`${key}-value`}>{String(value)}</Text>
                          </>
                        )
                      ))}
                    </Grid>
                  </>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="purple" onClick={onDetailClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
