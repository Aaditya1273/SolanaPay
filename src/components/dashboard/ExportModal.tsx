"use client";

import { useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  Button,
  RadioGroup,
  Radio,
  Checkbox,
  CheckboxGroup,
  FormControl,
  FormLabel,
  Input,
  useToast,
  Divider,
  Icon,
  Box,
  Badge,
  Spinner,
} from "@chakra-ui/react";
import { FaFileExport, FaFileCsv, FaFilePdf, FaDownload } from "react-icons/fa";
import { ExportOptions, portfolioService } from "../../services/portfolioService";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    dateRange: {
      start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    includeTransactions: true,
    includeDividends: true,
    includePerformance: true,
    includeAllocation: true
  });
  
  const [isExporting, setIsExporting] = useState(false);
  const toast = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let blob: Blob;
      let filename: string;
      let mimeType: string;

      if (exportOptions.format === 'csv') {
        const csvContent = await portfolioService.exportToCSV(exportOptions);
        blob = new Blob([csvContent], { type: 'text/csv' });
        filename = `portfolio-report-${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      } else {
        blob = await portfolioService.exportToPDF(exportOptions);
        filename = `portfolio-report-${new Date().toISOString().split('T')[0]}.pdf`;
        mimeType = 'application/pdf';
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `Your portfolio report has been downloaded as ${filename}`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });

      onClose();
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "There was an error generating your report. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleIncludeOptionsChange = (values: string[]) => {
    setExportOptions(prev => ({
      ...prev,
      includeTransactions: values.includes('transactions'),
      includeDividends: values.includes('dividends'),
      includePerformance: values.includes('performance'),
      includeAllocation: values.includes('allocation')
    }));
  };

  const getIncludeValues = () => {
    const values = [];
    if (exportOptions.includeTransactions) values.push('transactions');
    if (exportOptions.includeDividends) values.push('dividends');
    if (exportOptions.includePerformance) values.push('performance');
    if (exportOptions.includeAllocation) values.push('allocation');
    return values;
  };

  const getEstimatedFileSize = () => {
    let size = 0;
    if (exportOptions.includePerformance) size += 5;
    if (exportOptions.includeAllocation) size += 3;
    if (exportOptions.includeTransactions) size += 15;
    if (exportOptions.includeDividends) size += 8;
    
    return exportOptions.format === 'pdf' ? `${size * 2}KB` : `${size}KB`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(10px)" />
      <ModalContent>
        <ModalHeader>
          <HStack>
            <Icon as={FaFileExport} color="purple.500" />
            <Text>Export Portfolio Report</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <VStack spacing={6} align="stretch">
            {/* Export Format */}
            <FormControl>
              <FormLabel fontWeight="bold">Export Format</FormLabel>
              <RadioGroup
                value={exportOptions.format}
                onChange={(value: 'csv' | 'pdf') => 
                  setExportOptions(prev => ({ ...prev, format: value }))
                }
              >
                <VStack align="start" spacing={3}>
                  <Radio value="csv">
                    <HStack>
                      <Icon as={FaFileCsv} color="green.500" />
                      <VStack align="start" spacing={0}>
                        <Text fontWeight="semibold">CSV (Comma Separated Values)</Text>
                        <Text fontSize="sm" color="gray.600">
                          Best for data analysis and spreadsheet import
                        </Text>
                      </VStack>
                    </HStack>
                  </Radio>
                  
                  <Radio value="pdf">
                    <HStack>
                      <Icon as={FaFilePdf} color="red.500" />
                      <VStack align="start" spacing={0}>
                        <Text fontWeight="semibold">PDF (Portable Document Format)</Text>
                        <Text fontSize="sm" color="gray.600">
                          Professional formatted report for sharing and printing
                        </Text>
                      </VStack>
                    </HStack>
                  </Radio>
                </VStack>
              </RadioGroup>
            </FormControl>

            <Divider />

            {/* Date Range */}
            <FormControl>
              <FormLabel fontWeight="bold">Date Range</FormLabel>
              <HStack spacing={4}>
                <VStack align="start" spacing={1}>
                  <Text fontSize="sm" color="gray.600">From</Text>
                  <Input
                    type="date"
                    value={exportOptions.dateRange.start}
                    onChange={(e) => 
                      setExportOptions(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, start: e.target.value }
                      }))
                    }
                  />
                </VStack>
                
                <VStack align="start" spacing={1}>
                  <Text fontSize="sm" color="gray.600">To</Text>
                  <Input
                    type="date"
                    value={exportOptions.dateRange.end}
                    onChange={(e) => 
                      setExportOptions(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, end: e.target.value }
                      }))
                    }
                  />
                </VStack>
              </HStack>
            </FormControl>

            <Divider />

            {/* Include Options */}
            <FormControl>
              <FormLabel fontWeight="bold">Include in Report</FormLabel>
              <CheckboxGroup
                value={getIncludeValues()}
                onChange={handleIncludeOptionsChange}
              >
                <VStack align="start" spacing={3}>
                  <Checkbox value="performance">
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="semibold">Portfolio Performance</Text>
                      <Text fontSize="sm" color="gray.600">
                        Overall returns, gains/losses, and key metrics
                      </Text>
                    </VStack>
                  </Checkbox>
                  
                  <Checkbox value="allocation">
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="semibold">Asset Allocation</Text>
                      <Text fontSize="sm" color="gray.600">
                        Breakdown by asset type and geographic distribution
                      </Text>
                    </VStack>
                  </Checkbox>
                  
                  <Checkbox value="transactions">
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="semibold">Transaction History</Text>
                      <Text fontSize="sm" color="gray.600">
                        Buy/sell orders, fees, and transaction details
                      </Text>
                    </VStack>
                  </Checkbox>
                  
                  <Checkbox value="dividends">
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="semibold">Dividend Payments</Text>
                      <Text fontSize="sm" color="gray.600">
                        Dividend history, yields, and payment schedules
                      </Text>
                    </VStack>
                  </Checkbox>
                </VStack>
              </CheckboxGroup>
            </FormControl>

            <Divider />

            {/* Export Summary */}
            <Box bg="gray.50" p={4} rounded="lg">
              <VStack spacing={3}>
                <HStack justify="space-between" w="full">
                  <Text fontSize="sm" fontWeight="semibold">Export Summary</Text>
                  <Badge colorScheme="purple" variant="outline">
                    {exportOptions.format.toUpperCase()}
                  </Badge>
                </HStack>
                
                <HStack justify="space-between" w="full">
                  <Text fontSize="sm" color="gray.600">Date Range:</Text>
                  <Text fontSize="sm" fontWeight="semibold">
                    {new Date(exportOptions.dateRange.start).toLocaleDateString()} - {new Date(exportOptions.dateRange.end).toLocaleDateString()}
                  </Text>
                </HStack>
                
                <HStack justify="space-between" w="full">
                  <Text fontSize="sm" color="gray.600">Sections Included:</Text>
                  <Text fontSize="sm" fontWeight="semibold">
                    {getIncludeValues().length} of 4
                  </Text>
                </HStack>
                
                <HStack justify="space-between" w="full">
                  <Text fontSize="sm" color="gray.600">Estimated File Size:</Text>
                  <Text fontSize="sm" fontWeight="semibold">
                    {getEstimatedFileSize()}
                  </Text>
                </HStack>
              </VStack>
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button variant="outline" onClick={onClose} isDisabled={isExporting}>
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              onClick={handleExport}
              isLoading={isExporting}
              loadingText="Exporting..."
              leftIcon={isExporting ? <Spinner size="sm" /> : <Icon as={FaDownload} />}
              isDisabled={getIncludeValues().length === 0}
            >
              Export Report
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
