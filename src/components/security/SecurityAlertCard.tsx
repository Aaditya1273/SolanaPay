"use client";

import { useState } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Card,
  CardBody,
  CardHeader,
  useColorModeValue,
  Icon,
  Collapse,
  Divider,
  Grid,
  GridItem,
  Tooltip,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
  Alert,
  AlertIcon,
  Progress,
  CircularProgress,
  CircularProgressLabel,
} from "@chakra-ui/react";
import {
  FaShieldAlt,
  FaExclamationTriangle,
  FaInfoCircle,
  FaTimes,
  FaCheck,
  FaEye,
  FaChevronDown,
  FaChevronUp,
  FaClock,
  FaUser,
  FaLink,
  FaFlag,
  FaEllipsisV,
} from "react-icons/fa";
import { SecurityAlert, crossChainSecurityService } from "../../services/crossChainSecurityService";

interface SecurityAlertCardProps {
  alert: SecurityAlert;
  onStatusChange?: (alertId: string, status: SecurityAlert['status']) => void;
  onViewDetails?: (alert: SecurityAlert) => void;
}

export default function SecurityAlertCard({ alert, onStatusChange, onViewDetails }: SecurityAlertCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const toast = useToast();

  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const expandedBg = useColorModeValue("gray.50", "gray.700");

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      case 'low': return 'blue';
      default: return 'gray';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'red';
      case 'investigating': return 'yellow';
      case 'resolved': return 'green';
      case 'false_positive': return 'gray';
      default: return 'gray';
    }
  };

  const getThreatIcon = (type: string) => {
    switch (type) {
      case 'fraud_detection': return FaShieldAlt;
      case 'bridge_exploit': return FaLink;
      case 'flash_loan_attack': return FaExclamationTriangle;
      case 'suspicious_activity': return FaFlag;
      case 'anomaly_detection': return FaInfoCircle;
      default: return FaShieldAlt;
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'red';
    if (score >= 60) return 'orange';
    if (score >= 40) return 'yellow';
    return 'green';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleStatusUpdate = async (newStatus: SecurityAlert['status']) => {
    setIsUpdating(true);
    try {
      await crossChainSecurityService.updateAlertStatus(alert.id, newStatus);
      
      if (onStatusChange) {
        onStatusChange(alert.id, newStatus);
      }

      toast({
        title: "Status Updated",
        description: `Alert status changed to ${newStatus.replace('_', ' ').toUpperCase()}`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update alert status",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const ThreatIcon = getThreatIcon(alert.type);

  return (
    <Card
      bg={cardBg}
      border="1px solid"
      borderColor={borderColor}
      borderLeftWidth="4px"
      borderLeftColor={`${getSeverityColor(alert.severity)}.500`}
      _hover={{ shadow: "md" }}
      transition="all 0.2s"
    >
      <CardHeader pb={2}>
        <HStack justify="space-between" align="start">
          <HStack spacing={3} flex={1}>
            <Box
              p={2}
              rounded="lg"
              bg={`${getSeverityColor(alert.severity)}.100`}
              color={`${getSeverityColor(alert.severity)}.600`}
            >
              <Icon as={ThreatIcon} boxSize={5} />
            </Box>
            
            <VStack align="start" spacing={1} flex={1}>
              <HStack spacing={2} flexWrap="wrap">
                <Text fontSize="lg" fontWeight="bold" noOfLines={1}>
                  {alert.title}
                </Text>
                <Badge colorScheme={getSeverityColor(alert.severity)} variant="solid">
                  {alert.severity.toUpperCase()}
                </Badge>
                <Badge colorScheme={getStatusColor(alert.status)} variant="outline">
                  {alert.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </HStack>
              
              <HStack spacing={4} fontSize="sm" color="gray.600">
                <HStack spacing={1}>
                  <Icon as={FaClock} boxSize={3} />
                  <Text>{formatTimestamp(alert.timestamp)}</Text>
                </HStack>
                <Text>•</Text>
                <Text>{alert.chainName}</Text>
                <Text>•</Text>
                <HStack spacing={1}>
                  <Text>Risk:</Text>
                  <CircularProgress 
                    value={alert.riskScore} 
                    color={`${getRiskColor(alert.riskScore)}.500`}
                    size="20px"
                    thickness="8px"
                  >
                    <CircularProgressLabel fontSize="xs">
                      {alert.riskScore}
                    </CircularProgressLabel>
                  </CircularProgress>
                </HStack>
              </HStack>
            </VStack>
          </HStack>

          <HStack spacing={2}>
            <Menu>
              <MenuButton
                as={Button}
                size="sm"
                variant="ghost"
                isLoading={isUpdating}
                rightIcon={<Icon as={FaEllipsisV} />}
              >
                Actions
              </MenuButton>
              <MenuList>
                <MenuItem 
                  icon={<Icon as={FaEye} />}
                  onClick={() => onViewDetails?.(alert)}
                >
                  View Details
                </MenuItem>
                <Divider />
                <MenuItem 
                  icon={<Icon as={FaClock} />}
                  onClick={() => handleStatusUpdate('investigating')}
                  isDisabled={alert.status === 'investigating'}
                >
                  Mark Investigating
                </MenuItem>
                <MenuItem 
                  icon={<Icon as={FaCheck} />}
                  onClick={() => handleStatusUpdate('resolved')}
                  isDisabled={alert.status === 'resolved'}
                >
                  Mark Resolved
                </MenuItem>
                <MenuItem 
                  icon={<Icon as={FaTimes} />}
                  onClick={() => handleStatusUpdate('false_positive')}
                  isDisabled={alert.status === 'false_positive'}
                >
                  Mark False Positive
                </MenuItem>
              </MenuList>
            </Menu>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
              rightIcon={<Icon as={isExpanded ? FaChevronUp : FaChevronDown} />}
            >
              {isExpanded ? 'Less' : 'More'}
            </Button>
          </HStack>
        </HStack>
      </CardHeader>

      <CardBody pt={0}>
        <Text fontSize="sm" color="gray.700" mb={3} noOfLines={isExpanded ? undefined : 2}>
          {alert.description}
        </Text>

        <Collapse in={isExpanded}>
          <VStack spacing={4} align="stretch">
            <Divider />
            
            {/* Alert Details */}
            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4}>
              <GridItem>
                <VStack spacing={3} align="stretch">
                  <Text fontSize="sm" fontWeight="semibold">Alert Information</Text>
                  
                  <Grid templateColumns="1fr 2fr" gap={2} fontSize="sm">
                    <Text color="gray.600">Alert ID:</Text>
                    <Text fontFamily="mono">{alert.id}</Text>
                    
                    <Text color="gray.600">Type:</Text>
                    <Text>{alert.type.replace('_', ' ').toUpperCase()}</Text>
                    
                    <Text color="gray.600">Chain:</Text>
                    <Text>{alert.chainName} ({alert.chainId})</Text>
                    
                    {alert.transactionHash && (
                      <>
                        <Text color="gray.600">Transaction:</Text>
                        <Text fontFamily="mono" fontSize="xs">
                          {alert.transactionHash.substring(0, 10)}...
                        </Text>
                      </>
                    )}
                    
                    {alert.walletAddress && (
                      <>
                        <Text color="gray.600">Wallet:</Text>
                        <Text fontFamily="mono" fontSize="xs">
                          {alert.walletAddress.substring(0, 10)}...
                        </Text>
                      </>
                    )}
                  </Grid>
                </VStack>
              </GridItem>

              <GridItem>
                <VStack spacing={3} align="stretch">
                  <Text fontSize="sm" fontWeight="semibold">Risk Assessment</Text>
                  
                  <VStack spacing={2} align="stretch">
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="gray.600">Risk Score</Text>
                      <HStack spacing={2}>
                        <Progress 
                          value={alert.riskScore} 
                          colorScheme={getRiskColor(alert.riskScore)}
                          size="sm"
                          w="100px"
                        />
                        <Text fontSize="sm" fontWeight="semibold">
                          {alert.riskScore}/100
                        </Text>
                      </HStack>
                    </HStack>
                    
                    {alert.amount && (
                      <HStack justify="space-between">
                        <Text fontSize="sm" color="gray.600">Amount</Text>
                        <Text fontSize="sm">${parseFloat(alert.amount).toLocaleString()}</Text>
                      </HStack>
                    )}
                  </VStack>
                </VStack>
              </GridItem>
            </Grid>

            {/* Risk Indicators */}
            {alert.indicators && alert.indicators.length > 0 && (
              <VStack spacing={2} align="stretch">
                <Text fontSize="sm" fontWeight="semibold">Risk Indicators</Text>
                <VStack spacing={1} align="stretch">
                  {alert.indicators.map((indicator, index) => (
                    <HStack key={index} spacing={2}>
                      <Icon as={FaFlag} color="orange.500" boxSize={3} />
                      <Text fontSize="sm">{indicator}</Text>
                    </HStack>
                  ))}
                </VStack>
              </VStack>
            )}

            {/* Recommended Actions */}
            {alert.recommendedActions && alert.recommendedActions.length > 0 && (
              <VStack spacing={2} align="stretch">
                <Text fontSize="sm" fontWeight="semibold">Recommended Actions</Text>
                <VStack spacing={1} align="stretch">
                  {alert.recommendedActions.map((action, index) => (
                    <HStack key={index} spacing={2}>
                      <Icon as={FaCheck} color="green.500" boxSize={3} />
                      <Text fontSize="sm">{action}</Text>
                    </HStack>
                  ))}
                </VStack>
              </VStack>
            )}

            {/* Metadata */}
            {alert.metadata && (
              <VStack spacing={2} align="stretch">
                <Text fontSize="sm" fontWeight="semibold">Additional Information</Text>
                <Grid templateColumns="1fr 2fr" gap={2} fontSize="xs">
                  {Object.entries(alert.metadata).map(([key, value]) => (
                    <>
                      <Text key={key} color="gray.600" textTransform="capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}:
                      </Text>
                      <Text key={`${key}-value`}>
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </Text>
                    </>
                  ))}
                </Grid>
              </VStack>
            )}

            {/* Status-specific alerts */}
            {alert.status === 'active' && alert.severity === 'critical' && (
              <Alert status="error" size="sm">
                <AlertIcon />
                <Text fontSize="sm">
                  Critical threat requires immediate attention. Consider emergency response protocols.
                </Text>
              </Alert>
            )}
            
            {alert.status === 'false_positive' && (
              <Alert status="info" size="sm">
                <AlertIcon />
                <Text fontSize="sm">
                  This alert has been marked as a false positive and will be used to improve detection algorithms.
                </Text>
              </Alert>
            )}
          </VStack>
        </Collapse>
      </CardBody>
    </Card>
  );
}
