"use client";

import { useState, useEffect } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  FormControl,
  FormLabel,
  useColorModeValue,
  Icon,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Badge,
  Divider,
  useToast,
  Grid,
  GridItem,
  Spinner,
  Progress,
  Card,
  CardBody,
  CardHeader,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Tooltip,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  List,
  ListItem,
  ListIcon,
  CircularProgress,
  CircularProgressLabel,
} from "@chakra-ui/react";
import {
  FaSearch,
  FaShieldAlt,
  FaCheck,
  FaTimes,
  FaExclamationTriangle,
  FaInfoCircle,
  FaClock,
  FaLock,
  FaCloud,
  FaFileAlt,
  FaUser,
  FaGavel,
  FaHashtag,
  FaCalendarAlt,
  FaMapMarkerAlt,
} from "react-icons/fa";
import { 
  Document, 
  VerificationResult,
  proofOfAuthenticityService 
} from "../../services/proofOfAuthenticityService";

interface DocumentVerifierProps {
  documentId?: string;
  onVerificationComplete?: (result: VerificationResult) => void;
}

export default function DocumentVerifier({ documentId, onVerificationComplete }: DocumentVerifierProps) {
  const [searchId, setSearchId] = useState(documentId || "");
  const [document, setDocument] = useState<Document | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const successBg = useColorModeValue("green.50", "green.900");
  const warningBg = useColorModeValue("yellow.50", "yellow.900");
  const errorBg = useColorModeValue("red.50", "red.900");

  useEffect(() => {
    if (documentId) {
      handleVerification();
    }
  }, [documentId]);

  const handleVerification = async () => {
    if (!searchId.trim()) {
      toast({
        title: "Missing Document ID",
        description: "Please enter a document ID to verify",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsVerifying(true);
    setVerificationProgress(0);
    setError(null);
    setDocument(null);
    setVerificationResult(null);

    try {
      // Simulate verification progress
      const progressInterval = setInterval(() => {
        setVerificationProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 15;
        });
      }, 300);

      // Get document
      const doc = await proofOfAuthenticityService.getDocument(searchId);
      setDocument(doc);
      
      // Verify document
      const result = await proofOfAuthenticityService.verifyDocument(searchId);
      setVerificationResult(result);

      clearInterval(progressInterval);
      setVerificationProgress(100);

      if (onVerificationComplete) {
        onVerificationComplete(result);
      }

      toast({
        title: "Verification Complete",
        description: `Document verification completed with ${result.overallScore}% confidence`,
        status: result.isValid ? "success" : "warning",
        duration: 5000,
        isClosable: true,
      });

    } catch (error) {
      console.error('Verification error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Verification failed';
      setError(errorMessage);
      
      toast({
        title: "Verification Failed",
        description: errorMessage,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'verified': return 'green';
      case 'pending': return 'yellow';
      case 'failed': return 'red';
      case 'expired': return 'orange';
      default: return 'gray';
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 90) return 'green';
    if (score >= 70) return 'yellow';
    if (score >= 50) return 'orange';
    return 'red';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Search Section */}
      <Box
        bg={cardBg}
        p={6}
        rounded="xl"
        border="1px solid"
        borderColor={borderColor}
      >
        <VStack spacing={4} align="stretch">
          <HStack>
            <Icon as={FaSearch} color="purple.500" boxSize={6} />
            <Text fontSize="lg" fontWeight="bold">
              Document Verification
            </Text>
          </HStack>

          <HStack spacing={4}>
            <FormControl flex={1}>
              <FormLabel>Document ID or Hash</FormLabel>
              <Input
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="Enter document ID, hash, or IPFS hash"
                size="lg"
              />
            </FormControl>
            
            <Button
              colorScheme="purple"
              size="lg"
              leftIcon={<Icon as={FaShieldAlt} />}
              onClick={handleVerification}
              isLoading={isVerifying}
              loadingText="Verifying"
              mt={8}
            >
              Verify
            </Button>
          </HStack>
        </VStack>
      </Box>

      {/* Verification Progress */}
      {isVerifying && (
        <Box
          bg={cardBg}
          p={6}
          rounded="xl"
          border="1px solid"
          borderColor={borderColor}
        >
          <VStack spacing={4}>
            <HStack spacing={3} w="full">
              <Spinner color="purple.500" />
              <VStack align="start" spacing={0} flex={1}>
                <Text fontWeight="semibold">Verifying Document...</Text>
                <Text fontSize="sm" color="gray.600">
                  {verificationProgress < 20 ? "Retrieving document..." :
                   verificationProgress < 40 ? "Checking hash integrity..." :
                   verificationProgress < 60 ? "Verifying ZK proofs..." :
                   verificationProgress < 80 ? "Validating notarization..." :
                   "Calculating confidence score..."}
                </Text>
              </VStack>
            </HStack>
            
            <Progress value={verificationProgress} w="full" colorScheme="purple" rounded="md" />
            
            <Text fontSize="sm" color="gray.600">
              {verificationProgress}% complete
            </Text>
          </VStack>
        </Box>
      )}

      {/* Error Display */}
      {error && (
        <Alert status="error">
          <AlertIcon />
          <Box>
            <AlertTitle>Verification Failed!</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Box>
        </Alert>
      )}

      {/* Verification Results */}
      {verificationResult && document && (
        <VStack spacing={6} align="stretch">
          {/* Overall Status */}
          <Box
            bg={verificationResult.isValid ? successBg : errorBg}
            p={6}
            rounded="xl"
            border="1px solid"
            borderColor={verificationResult.isValid ? "green.200" : "red.200"}
          >
            <HStack justify="space-between" align="center">
              <HStack spacing={4}>
                <Icon 
                  as={verificationResult.isValid ? FaCheck : FaTimes} 
                  color={verificationResult.isValid ? "green.500" : "red.500"} 
                  boxSize={8} 
                />
                <VStack align="start" spacing={1}>
                  <Text fontSize="xl" fontWeight="bold">
                    {verificationResult.isValid ? "Document Verified" : "Verification Failed"}
                  </Text>
                  <Text fontSize="sm" opacity={0.8}>
                    {verificationResult.isValid 
                      ? "This document has been successfully verified as authentic"
                      : "This document failed verification checks"
                    }
                  </Text>
                </VStack>
              </HStack>
              
              <VStack align="center" spacing={1}>
                <CircularProgress 
                  value={verificationResult.overallScore} 
                  color={getConfidenceColor(verificationResult.overallScore)}
                  size="80px"
                  thickness="8px"
                >
                  <CircularProgressLabel fontSize="sm" fontWeight="bold">
                    {verificationResult.overallScore}%
                  </CircularProgressLabel>
                </CircularProgress>
                <Text fontSize="xs" fontWeight="semibold">
                  Confidence
                </Text>
              </VStack>
            </HStack>
          </Box>

          {/* Document Information */}
          <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={6}>
            <GridItem>
              <Card>
                <CardHeader>
                  <HStack>
                    <Icon as={FaFileAlt} color="blue.500" />
                    <Text fontSize="lg" fontWeight="bold">Document Details</Text>
                  </HStack>
                </CardHeader>
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    <Grid templateColumns="1fr 2fr" gap={3}>
                      <Text fontWeight="semibold">Name:</Text>
                      <Text>{document.name}</Text>
                      
                      <Text fontWeight="semibold">Type:</Text>
                      <Badge colorScheme="blue" w="fit-content">
                        {document.type.replace('_', ' ').toUpperCase()}
                      </Badge>
                      
                      <Text fontWeight="semibold">Status:</Text>
                      <Badge colorScheme={getStatusColor(document.status)} w="fit-content">
                        {document.status.toUpperCase()}
                      </Badge>
                      
                      <Text fontWeight="semibold">Created:</Text>
                      <Text>{formatDate(document.createdAt)}</Text>
                      
                      <Text fontWeight="semibold">Size:</Text>
                      <Text>{document.size} bytes</Text>
                      
                      <Text fontWeight="semibold">Hash:</Text>
                      <Text fontSize="sm" fontFamily="mono">
                        {document.hash.substring(0, 20)}...
                      </Text>
                    </Grid>

                    {document.metadata && (
                      <>
                        <Divider />
                        <VStack spacing={2} align="stretch">
                          <Text fontWeight="semibold">Metadata:</Text>
                          <Grid templateColumns="1fr 2fr" gap={2} fontSize="sm">
                            {document.metadata.issuer && (
                              <>
                                <Text>Issuer:</Text>
                                <Text>{document.metadata.issuer}</Text>
                              </>
                            )}
                            {document.metadata.jurisdiction && (
                              <>
                                <Text>Jurisdiction:</Text>
                                <Text>{document.metadata.jurisdiction}</Text>
                              </>
                            )}
                            {document.metadata.category && (
                              <>
                                <Text>Category:</Text>
                                <Text>{document.metadata.category}</Text>
                              </>
                            )}
                          </Grid>
                        </VStack>
                      </>
                    )}
                  </VStack>
                </CardBody>
              </Card>
            </GridItem>

            <GridItem>
              <Card>
                <CardHeader>
                  <HStack>
                    <Icon as={FaShieldAlt} color="purple.500" />
                    <Text fontSize="lg" fontWeight="bold">Verification Checks</Text>
                  </HStack>
                </CardHeader>
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    {/* Hash Integrity */}
                    <HStack justify="space-between">
                      <HStack spacing={2}>
                        <Icon 
                          as={verificationResult.hashValid ? FaCheck : FaTimes} 
                          color={verificationResult.hashValid ? "green.500" : "red.500"} 
                        />
                        <Text fontSize="sm">Hash Integrity</Text>
                      </HStack>
                      <Badge colorScheme={verificationResult.hashValid ? "green" : "red"}>
                        {verificationResult.hashValid ? "Valid" : "Invalid"}
                      </Badge>
                    </HStack>

                    {/* ZK Proof */}
                    <HStack justify="space-between">
                      <HStack spacing={2}>
                        <Icon 
                          as={verificationResult.zkProofValid ? FaCheck : FaTimes} 
                          color={verificationResult.zkProofValid ? "green.500" : "red.500"} 
                        />
                        <Text fontSize="sm">ZK Proof</Text>
                      </HStack>
                      <Badge colorScheme={verificationResult.zkProofValid ? "green" : "red"}>
                        {verificationResult.zkProofValid ? "Valid" : "Invalid"}
                      </Badge>
                    </HStack>

                    {/* Notarization */}
                    <HStack justify="space-between">
                      <HStack spacing={2}>
                        <Icon 
                          as={verificationResult.notarizationValid ? FaCheck : FaTimes} 
                          color={verificationResult.notarizationValid ? "green.500" : "red.500"} 
                        />
                        <Text fontSize="sm">Notarization</Text>
                      </HStack>
                      <Badge colorScheme={verificationResult.notarizationValid ? "green" : "red"}>
                        {verificationResult.notarizationValid ? "Valid" : "Invalid"}
                      </Badge>
                    </HStack>

                    {/* Metadata */}
                    <HStack justify="space-between">
                      <HStack spacing={2}>
                        <Icon 
                          as={verificationResult.metadataValid ? FaCheck : FaTimes} 
                          color={verificationResult.metadataValid ? "green.500" : "red.500"} 
                        />
                        <Text fontSize="sm">Metadata</Text>
                      </HStack>
                      <Badge colorScheme={verificationResult.metadataValid ? "green" : "red"}>
                        {verificationResult.metadataValid ? "Valid" : "Invalid"}
                      </Badge>
                    </HStack>

                    <Divider />

                    {/* Storage Information */}
                    <VStack spacing={2} align="stretch">
                      <Text fontSize="sm" fontWeight="semibold">Storage:</Text>
                      <HStack spacing={2} flexWrap="wrap">
                        {document.ipfsHash && (
                          <Badge colorScheme="blue" variant="outline">
                            <HStack spacing={1}>
                              <Icon as={FaCloud} boxSize={3} />
                              <Text>IPFS</Text>
                            </HStack>
                          </Badge>
                        )}
                        {document.arweaveId && (
                          <Badge colorScheme="green" variant="outline">
                            <HStack spacing={1}>
                              <Icon as={FaCloud} boxSize={3} />
                              <Text>Arweave</Text>
                            </HStack>
                          </Badge>
                        )}
                        {document.zkProof && (
                          <Badge colorScheme="purple" variant="outline">
                            <HStack spacing={1}>
                              <Icon as={FaLock} boxSize={3} />
                              <Text>ZK Proof</Text>
                            </HStack>
                          </Badge>
                        )}
                      </HStack>
                    </VStack>
                  </VStack>
                </CardBody>
              </Card>
            </GridItem>
          </Grid>

          {/* Detailed Results */}
          <Card>
            <CardHeader>
              <HStack justify="space-between">
                <HStack>
                  <Icon as={FaInfoCircle} color="blue.500" />
                  <Text fontSize="lg" fontWeight="bold">Detailed Verification Report</Text>
                </HStack>
                <Button size="sm" variant="outline" onClick={onOpen}>
                  View Full Report
                </Button>
              </HStack>
            </CardHeader>
            <CardBody>
              <Accordion allowToggle>
                <AccordionItem>
                  <AccordionButton>
                    <Box flex="1" textAlign="left">
                      <Text fontWeight="semibold">Verification Details</Text>
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel>
                    <VStack spacing={3} align="stretch">
                      <Text fontSize="sm">
                        <strong>Verification Timestamp:</strong> {verificationResult.timestamp}
                      </Text>
                      <Text fontSize="sm">
                        <strong>Overall Confidence:</strong> {verificationResult.overallScore}%
                      </Text>
                      <Text fontSize="sm">
                        <strong>Verification Method:</strong> Multi-factor authentication including hash verification, ZK proof validation, and notarization check
                      </Text>
                      {verificationResult.details && (
                        <Text fontSize="sm">
                          <strong>Additional Details:</strong> {verificationResult.details}
                        </Text>
                      )}
                    </VStack>
                  </AccordionPanel>
                </AccordionItem>

                {document.notarizationRecords && document.notarizationRecords.length > 0 && (
                  <AccordionItem>
                    <AccordionButton>
                      <Box flex="1" textAlign="left">
                        <Text fontWeight="semibold">Notarization Records</Text>
                      </Box>
                      <AccordionIcon />
                    </AccordionButton>
                    <AccordionPanel>
                      <VStack spacing={3} align="stretch">
                        {document.notarizationRecords.map((record, index) => (
                          <Box key={index} p={3} bg="gray.50" rounded="md">
                            <Grid templateColumns="1fr 2fr" gap={2} fontSize="sm">
                              <Text fontWeight="semibold">Notary:</Text>
                              <Text>{record.notaryName}</Text>
                              <Text fontWeight="semibold">Date:</Text>
                              <Text>{formatDate(record.notarizationDate)}</Text>
                              <Text fontWeight="semibold">Jurisdiction:</Text>
                              <Text>{record.jurisdiction}</Text>
                              {record.seal && (
                                <>
                                  <Text fontWeight="semibold">Seal:</Text>
                                  <Text>Present</Text>
                                </>
                              )}
                            </Grid>
                          </Box>
                        ))}
                      </VStack>
                    </AccordionPanel>
                  </AccordionItem>
                )}
              </Accordion>
            </CardBody>
          </Card>
        </VStack>
      )}

      {/* Full Report Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Complete Verification Report</ModalHeader>
          <ModalCloseButton />
          
          <ModalBody>
            {verificationResult && document && (
              <VStack spacing={4} align="stretch">
                <Alert status={verificationResult.isValid ? "success" : "error"}>
                  <AlertIcon />
                  <Box>
                    <AlertTitle>
                      {verificationResult.isValid ? "Document Verified" : "Verification Failed"}
                    </AlertTitle>
                    <AlertDescription>
                      Confidence Score: {verificationResult.overallScore}%
                    </AlertDescription>
                  </Box>
                </Alert>

                <Divider />

                <Text fontSize="sm" whiteSpace="pre-wrap">
                  {JSON.stringify({ document, verificationResult }, null, 2)}
                </Text>
              </VStack>
            )}
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="purple" onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
