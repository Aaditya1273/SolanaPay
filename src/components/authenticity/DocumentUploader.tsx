"use client";

import { useState, useCallback } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  FormControl,
  FormLabel,
  Select,
  Textarea,
  useColorModeValue,
  Icon,
  Progress,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Badge,
  Divider,
  useToast,
  Grid,
  GridItem,
  Checkbox,
  Tooltip,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Spinner,
} from "@chakra-ui/react";
import {
  FaUpload,
  FaFile,
  FaShieldAlt,
  FaCloud,
  FaLock,
  FaCheck,
  FaExclamationTriangle,
  FaInfoCircle,
} from "react-icons/fa";
import { useDropzone } from "react-dropzone";
import { 
  Document, 
  DocumentMetadata, 
  DocumentType,
  proofOfAuthenticityService 
} from "../../services/proofOfAuthenticityService";

interface DocumentUploaderProps {
  onUploadComplete?: (document: Document) => void;
  onUploadError?: (error: string) => void;
}

export default function DocumentUploader({ onUploadComplete, onUploadError }: DocumentUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<Partial<DocumentMetadata>>({
    title: "",
    description: "",
    category: "",
    tags: [],
    issuer: "",
    jurisdiction: "US",
    language: "English",
    version: "1.0"
  });
  const [useIPFS, setUseIPFS] = useState(true);
  const [useArweave, setUseArweave] = useState(false);
  const [generateZKProof, setGenerateZKProof] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedDocument, setUploadedDocument] = useState<Document | null>(null);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const dropzoneBg = useColorModeValue("gray.50", "gray.700");
  const dropzoneBorder = useColorModeValue("gray.300", "gray.600");

  const documentTypes: { value: DocumentType; label: string }[] = [
    { value: 'property_deed', label: 'Property Deed' },
    { value: 'title_certificate', label: 'Title Certificate' },
    { value: 'appraisal_report', label: 'Appraisal Report' },
    { value: 'insurance_policy', label: 'Insurance Policy' },
    { value: 'tax_document', label: 'Tax Document' },
    { value: 'legal_contract', label: 'Legal Contract' },
    { value: 'identity_document', label: 'Identity Document' },
    { value: 'financial_statement', label: 'Financial Statement' },
    { value: 'compliance_certificate', label: 'Compliance Certificate' },
    { value: 'audit_report', label: 'Audit Report' },
    { value: 'other', label: 'Other' },
  ];

  const jurisdictions = [
    { value: 'US', label: 'United States' },
    { value: 'EU', label: 'European Union' },
    { value: 'UK', label: 'United Kingdom' },
    { value: 'CA', label: 'Canada' },
    { value: 'AU', label: 'Australia' },
    { value: 'GLOBAL', label: 'Global/Multi-jurisdiction' },
  ];

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      
      // Auto-populate metadata based on filename
      const filename = file.name;
      setMetadata(prev => ({
        ...prev,
        title: prev.title || filename.replace(/\.[^/.]+$/, ""), // Remove extension
        category: prev.category || inferCategory(filename)
      }));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const inferCategory = (filename: string): string => {
    const name = filename.toLowerCase();
    if (name.includes('deed')) return 'Property';
    if (name.includes('title')) return 'Title';
    if (name.includes('appraisal')) return 'Valuation';
    if (name.includes('insurance')) return 'Insurance';
    if (name.includes('tax')) return 'Tax';
    if (name.includes('contract')) return 'Legal';
    if (name.includes('id') || name.includes('passport')) return 'Identity';
    if (name.includes('financial')) return 'Financial';
    if (name.includes('compliance')) return 'Compliance';
    if (name.includes('audit')) return 'Audit';
    return 'Document';
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a file to upload",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!metadata.title || !metadata.jurisdiction) {
      toast({
        title: "Missing Information",
        description: "Please provide document title and jurisdiction",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const completeMetadata: DocumentMetadata = {
        title: metadata.title!,
        description: metadata.description || "",
        category: metadata.category || "Document",
        tags: metadata.tags || [],
        issuer: metadata.issuer,
        issuedDate: metadata.issuedDate,
        expiryDate: metadata.expiryDate,
        jurisdiction: metadata.jurisdiction!,
        language: metadata.language || "English",
        version: metadata.version || "1.0",
        relatedAssetId: metadata.relatedAssetId
      };

      const document = await proofOfAuthenticityService.uploadDocument(
        selectedFile,
        completeMetadata,
        useIPFS,
        useArweave
      );

      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadedDocument(document);

      toast({
        title: "Upload Successful",
        description: `Document "${document.name}" uploaded and verified successfully`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });

      if (onUploadComplete) {
        onUploadComplete(document);
      }

      onOpen(); // Show success modal

    } catch (error) {
      console.error('Upload error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast({
        title: "Upload Failed",
        description: errorMessage,
        status: "error",
        duration: 5000,
        isClosable: true,
      });

      if (onUploadError) {
        onUploadError(errorMessage);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setMetadata({
      title: "",
      description: "",
      category: "",
      tags: [],
      issuer: "",
      jurisdiction: "US",
      language: "English",
      version: "1.0"
    });
    setUploadProgress(0);
    setUploadedDocument(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Upload Area */}
      <Box
        bg={cardBg}
        p={6}
        rounded="xl"
        border="1px solid"
        borderColor={borderColor}
      >
        <VStack spacing={4} align="stretch">
          <HStack>
            <Icon as={FaUpload} color="purple.500" boxSize={6} />
            <Text fontSize="lg" fontWeight="bold">
              Document Upload
            </Text>
          </HStack>

          {/* Drag and Drop Zone */}
          <Box
            {...getRootProps()}
            p={8}
            border="2px dashed"
            borderColor={isDragActive ? "purple.400" : dropzoneBorder}
            bg={isDragActive ? "purple.50" : dropzoneBg}
            rounded="lg"
            cursor="pointer"
            transition="all 0.2s"
            _hover={{ borderColor: "purple.400", bg: "purple.50" }}
          >
            <input {...getInputProps()} />
            <VStack spacing={3}>
              <Icon 
                as={FaFile} 
                boxSize={12} 
                color={isDragActive ? "purple.500" : "gray.400"} 
              />
              {isDragActive ? (
                <Text fontSize="lg" color="purple.600" fontWeight="semibold">
                  Drop the file here...
                </Text>
              ) : (
                <VStack spacing={1}>
                  <Text fontSize="lg" fontWeight="semibold">
                    Drag & drop a document here, or click to select
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Supports PDF, DOC, DOCX, images up to 50MB
                  </Text>
                </VStack>
              )}
            </VStack>
          </Box>

          {/* Selected File Info */}
          {selectedFile && (
            <Box p={4} bg="blue.50" rounded="lg" border="1px solid" borderColor="blue.200">
              <HStack spacing={3}>
                <Icon as={FaFile} color="blue.500" />
                <VStack align="start" spacing={0} flex={1}>
                  <Text fontWeight="semibold">{selectedFile.name}</Text>
                  <Text fontSize="sm" color="gray.600">
                    {formatFileSize(selectedFile.size)} • {selectedFile.type}
                  </Text>
                </VStack>
                <Button size="sm" variant="outline" onClick={handleReset}>
                  Remove
                </Button>
              </HStack>
            </Box>
          )}
        </VStack>
      </Box>

      {/* Document Metadata */}
      {selectedFile && (
        <Box
          bg={cardBg}
          p={6}
          rounded="xl"
          border="1px solid"
          borderColor={borderColor}
        >
          <VStack spacing={4} align="stretch">
            <Text fontSize="lg" fontWeight="bold">
              Document Information
            </Text>

            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
              <GridItem>
                <FormControl isRequired>
                  <FormLabel>Document Title</FormLabel>
                  <Input
                    value={metadata.title}
                    onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter document title"
                  />
                </FormControl>
              </GridItem>

              <GridItem>
                <FormControl>
                  <FormLabel>Category</FormLabel>
                  <Input
                    value={metadata.category}
                    onChange={(e) => setMetadata(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="Document category"
                  />
                </FormControl>
              </GridItem>

              <GridItem>
                <FormControl>
                  <FormLabel>Issuer/Authority</FormLabel>
                  <Input
                    value={metadata.issuer}
                    onChange={(e) => setMetadata(prev => ({ ...prev, issuer: e.target.value }))}
                    placeholder="Issuing authority or organization"
                  />
                </FormControl>
              </GridItem>

              <GridItem>
                <FormControl isRequired>
                  <FormLabel>Jurisdiction</FormLabel>
                  <Select
                    value={metadata.jurisdiction}
                    onChange={(e) => setMetadata(prev => ({ ...prev, jurisdiction: e.target.value }))}
                  >
                    {jurisdictions.map((jurisdiction) => (
                      <option key={jurisdiction.value} value={jurisdiction.value}>
                        {jurisdiction.label}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              </GridItem>

              <GridItem colSpan={{ base: 1, md: 2 }}>
                <FormControl>
                  <FormLabel>Description</FormLabel>
                  <Textarea
                    value={metadata.description}
                    onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the document"
                    rows={3}
                  />
                </FormControl>
              </GridItem>
            </Grid>
          </VStack>
        </Box>
      )}

      {/* Storage and Security Options */}
      {selectedFile && (
        <Box
          bg={cardBg}
          p={6}
          rounded="xl"
          border="1px solid"
          borderColor={borderColor}
        >
          <VStack spacing={4} align="stretch">
            <Text fontSize="lg" fontWeight="bold">
              Storage & Security Options
            </Text>

            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6}>
              <GridItem>
                <VStack spacing={3} align="stretch">
                  <Text fontSize="md" fontWeight="semibold">
                    Decentralized Storage
                  </Text>
                  
                  <Checkbox
                    isChecked={useIPFS}
                    onChange={(e) => setUseIPFS(e.target.checked)}
                  >
                    <HStack spacing={2}>
                      <Icon as={FaCloud} color="blue.500" />
                      <VStack align="start" spacing={0}>
                        <Text fontSize="sm" fontWeight="semibold">Store on IPFS</Text>
                        <Text fontSize="xs" color="gray.600">
                          Distributed file storage with content addressing
                        </Text>
                      </VStack>
                    </HStack>
                  </Checkbox>

                  <Checkbox
                    isChecked={useArweave}
                    onChange={(e) => setUseArweave(e.target.checked)}
                  >
                    <HStack spacing={2}>
                      <Icon as={FaCloud} color="green.500" />
                      <VStack align="start" spacing={0}>
                        <Text fontSize="sm" fontWeight="semibold">Store on Arweave</Text>
                        <Text fontSize="xs" color="gray.600">
                          Permanent storage with pay-once model
                        </Text>
                      </VStack>
                    </HStack>
                  </Checkbox>
                </VStack>
              </GridItem>

              <GridItem>
                <VStack spacing={3} align="stretch">
                  <Text fontSize="md" fontWeight="semibold">
                    Privacy & Verification
                  </Text>
                  
                  <Checkbox
                    isChecked={generateZKProof}
                    onChange={(e) => setGenerateZKProof(e.target.checked)}
                  >
                    <HStack spacing={2}>
                      <Icon as={FaLock} color="purple.500" />
                      <VStack align="start" spacing={0}>
                        <Text fontSize="sm" fontWeight="semibold">Generate ZK Proof</Text>
                        <Text fontSize="xs" color="gray.600">
                          Prove authenticity without revealing content
                        </Text>
                      </VStack>
                    </HStack>
                  </Checkbox>

                  <Tooltip label="Blockchain timestamping is always enabled for authenticity">
                    <HStack spacing={2} opacity={0.7}>
                      <Icon as={FaShieldAlt} color="orange.500" />
                      <VStack align="start" spacing={0}>
                        <Text fontSize="sm" fontWeight="semibold">Blockchain Timestamp</Text>
                        <Text fontSize="xs" color="gray.600">
                          Immutable proof of existence (always enabled)
                        </Text>
                      </VStack>
                    </HStack>
                  </Tooltip>
                </VStack>
              </GridItem>
            </Grid>

            {(!useIPFS && !useArweave) && (
              <Alert status="warning">
                <AlertIcon />
                <AlertDescription>
                  Please select at least one storage option (IPFS or Arweave) for decentralized storage.
                </AlertDescription>
              </Alert>
            )}
          </VStack>
        </Box>
      )}

      {/* Upload Progress */}
      {isUploading && (
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
                <Text fontWeight="semibold">Uploading Document...</Text>
                <Text fontSize="sm" color="gray.600">
                  {uploadProgress < 30 ? "Calculating hash and generating proofs..." :
                   uploadProgress < 60 ? "Uploading to decentralized storage..." :
                   uploadProgress < 90 ? "Verifying authenticity..." :
                   "Finalizing upload..."}
                </Text>
              </VStack>
            </HStack>
            
            <Progress value={uploadProgress} w="full" colorScheme="purple" rounded="md" />
            
            <Text fontSize="sm" color="gray.600">
              {uploadProgress}% complete
            </Text>
          </VStack>
        </Box>
      )}

      {/* Upload Button */}
      {selectedFile && !isUploading && (
        <Button
          colorScheme="purple"
          size="lg"
          leftIcon={<Icon as={FaUpload} />}
          onClick={handleUpload}
          isDisabled={!useIPFS && !useArweave}
        >
          Upload & Verify Document
        </Button>
      )}

      {/* Success Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack>
              <Icon as={FaCheck} color="green.500" />
              <Text>Upload Successful</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          
          <ModalBody>
            {uploadedDocument && (
              <VStack spacing={4} align="stretch">
                <Alert status="success">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Document Verified!</AlertTitle>
                    <AlertDescription>
                      Your document has been successfully uploaded and verified with proof of authenticity.
                    </AlertDescription>
                  </Box>
                </Alert>

                <Divider />

                <VStack spacing={3} align="stretch">
                  <HStack justify="space-between">
                    <Text fontWeight="semibold">Document ID:</Text>
                    <Badge colorScheme="purple">{uploadedDocument.id.substring(0, 8)}...</Badge>
                  </HStack>

                  <HStack justify="space-between">
                    <Text fontWeight="semibold">Status:</Text>
                    <Badge colorScheme="green">{uploadedDocument.status.toUpperCase()}</Badge>
                  </HStack>

                  <HStack justify="space-between">
                    <Text fontWeight="semibold">Storage:</Text>
                    <HStack>
                      {uploadedDocument.ipfsHash && (
                        <Badge colorScheme="blue" variant="outline">IPFS</Badge>
                      )}
                      {uploadedDocument.arweaveId && (
                        <Badge colorScheme="green" variant="outline">Arweave</Badge>
                      )}
                    </HStack>
                  </HStack>

                  <HStack justify="space-between">
                    <Text fontWeight="semibold">ZK Proof:</Text>
                    <Badge colorScheme={uploadedDocument.zkProof ? "purple" : "gray"}>
                      {uploadedDocument.zkProof ? "Generated" : "Not Generated"}
                    </Badge>
                  </HStack>
                </VStack>
              </VStack>
            )}
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="purple" onClick={onClose}>
              Continue
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
