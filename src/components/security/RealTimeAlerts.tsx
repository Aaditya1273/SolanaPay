"use client";

import { useState, useEffect, useRef } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  useColorModeValue,
  Icon,
  Badge,
  Card,
  CardBody,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Slide,
  ScaleFade,
  Collapse,
  IconButton,
  Tooltip,
  Progress,
  CircularProgress,
  CircularProgressLabel,
  Divider,
  Switch,
  FormControl,
  FormLabel,
} from "@chakra-ui/react";
import {
  FaBell,
  FaExclamationTriangle,
  FaShieldAlt,
  FaTimes,
  FaVolumeUp,
  FaVolumeMute,
  FaPause,
  FaPlay,
  FaCheck,
  FaEye,
  FaClock,
} from "react-icons/fa";
import { SecurityAlert, crossChainSecurityService } from "../../services/crossChainSecurityService";

interface RealTimeAlertsProps {
  onAlertClick?: (alert: SecurityAlert) => void;
  maxAlerts?: number;
  autoHide?: boolean;
  soundEnabled?: boolean;
}

export default function RealTimeAlerts({ 
  onAlertClick, 
  maxAlerts = 5, 
  autoHide = true,
  soundEnabled = true 
}: RealTimeAlertsProps) {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [isListening, setIsListening] = useState(true);
  const [soundOn, setSoundOn] = useState(soundEnabled);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const toast = useToast();

  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const alertBg = useColorModeValue("red.50", "red.900");

  useEffect(() => {
    if (isListening) {
      setupAlertListeners();
    }

    return () => {
      crossChainSecurityService.removeAllListeners('new_alert');
    };
  }, [isListening]);

  useEffect(() => {
    // Initialize audio for alert sounds
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/sounds/alert.mp3'); // You'd need to add this sound file
      audioRef.current.volume = 0.5;
    }
  }, []);

  const setupAlertListeners = () => {
    crossChainSecurityService.on('new_alert', (alert: SecurityAlert) => {
      if (dismissedAlerts.has(alert.id)) return;

      setAlerts(prev => {
        const newAlerts = [alert, ...prev].slice(0, maxAlerts);
        return newAlerts;
      });

      // Play sound for critical/high alerts
      if (soundOn && (alert.severity === 'critical' || alert.severity === 'high')) {
        playAlertSound();
      }

      // Show toast notification
      toast({
        title: `${alert.severity.toUpperCase()} Security Alert`,
        description: alert.title,
        status: getSeverityStatus(alert.severity),
        duration: alert.severity === 'critical' ? 0 : 8000, // Critical alerts don't auto-dismiss
        isClosable: true,
        position: "top-right",
      });

      // Auto-hide after delay if enabled
      if (autoHide && alert.severity !== 'critical') {
        setTimeout(() => {
          handleDismissAlert(alert.id);
        }, 10000);
      }
    });
  };

  const playAlertSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(console.error);
    }
  };

  const getSeverityStatus = (severity: string): "success" | "error" | "warning" | "info" => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'info';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      case 'low': return 'blue';
      default: return 'gray';
    }
  };

  const getThreatIcon = (type: string) => {
    switch (type) {
      case 'fraud_detection': return FaShieldAlt;
      case 'bridge_exploit': return FaExclamationTriangle;
      case 'flash_loan_attack': return FaExclamationTriangle;
      case 'suspicious_activity': return FaBell;
      case 'anomaly_detection': return FaShieldAlt;
      default: return FaBell;
    }
  };

  const handleDismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const handleViewAlert = (alert: SecurityAlert) => {
    if (onAlertClick) {
      onAlertClick(alert);
    }
  };

  const handleToggleListening = () => {
    setIsListening(!isListening);
    
    if (!isListening) {
      toast({
        title: "Real-time Alerts Enabled",
        description: "You will now receive live security alerts",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } else {
      toast({
        title: "Real-time Alerts Disabled",
        description: "Live security alerts have been paused",
        status: "info",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return date.toLocaleTimeString();
  };

  const visibleAlerts = alerts.filter(alert => !dismissedAlerts.has(alert.id));
  const criticalAlerts = visibleAlerts.filter(alert => alert.severity === 'critical');
  const highAlerts = visibleAlerts.filter(alert => alert.severity === 'high');

  return (
    <Box position="fixed" top={4} right={4} zIndex={1000} w="400px">
      <VStack spacing={3} align="stretch">
        {/* Control Panel */}
        <Card
          bg={cardBg}
          border="1px solid"
          borderColor={borderColor}
          shadow="lg"
        >
          <CardBody p={3}>
            <HStack justify="space-between" align="center">
              <HStack spacing={2}>
                <Icon 
                  as={FaBell} 
                  color={isListening ? "green.500" : "gray.400"} 
                  boxSize={4} 
                />
                <Text fontSize="sm" fontWeight="semibold">
                  Real-time Alerts
                </Text>
                {visibleAlerts.length > 0 && (
                  <Badge colorScheme="red" variant="solid">
                    {visibleAlerts.length}
                  </Badge>
                )}
              </HStack>

              <HStack spacing={1}>
                <Tooltip label={soundOn ? "Mute sounds" : "Enable sounds"}>
                  <IconButton
                    size="xs"
                    variant="ghost"
                    icon={<Icon as={soundOn ? FaVolumeUp : FaVolumeMute} />}
                    onClick={() => setSoundOn(!soundOn)}
                  />
                </Tooltip>
                
                <Tooltip label={isListening ? "Pause alerts" : "Resume alerts"}>
                  <IconButton
                    size="xs"
                    variant="ghost"
                    icon={<Icon as={isListening ? FaPause : FaPlay} />}
                    onClick={handleToggleListening}
                  />
                </Tooltip>

                {visibleAlerts.length > 0 && (
                  <Tooltip label={isExpanded ? "Collapse" : "Expand"}>
                    <IconButton
                      size="xs"
                      variant="ghost"
                      icon={<Icon as={FaEye} />}
                      onClick={() => setIsExpanded(!isExpanded)}
                    />
                  </Tooltip>
                )}
              </HStack>
            </HStack>

            {/* Quick Stats */}
            {visibleAlerts.length > 0 && (
              <HStack spacing={4} mt={2} fontSize="xs">
                {criticalAlerts.length > 0 && (
                  <HStack spacing={1}>
                    <Icon as={FaExclamationTriangle} color="red.500" />
                    <Text color="red.500">{criticalAlerts.length} Critical</Text>
                  </HStack>
                )}
                {highAlerts.length > 0 && (
                  <HStack spacing={1}>
                    <Icon as={FaExclamationTriangle} color="orange.500" />
                    <Text color="orange.500">{highAlerts.length} High</Text>
                  </HStack>
                )}
              </HStack>
            )}
          </CardBody>
        </Card>

        {/* Alert List */}
        <Collapse in={isExpanded || visibleAlerts.some(a => a.severity === 'critical')}>
          <VStack spacing={2} align="stretch" maxH="500px" overflowY="auto">
            {visibleAlerts.map((alert, index) => {
              const ThreatIcon = getThreatIcon(alert.type);
              
              return (
                <ScaleFade key={alert.id} in={true} initialScale={0.9}>
                  <Card
                    bg={alert.severity === 'critical' ? alertBg : cardBg}
                    border="2px solid"
                    borderColor={`${getSeverityColor(alert.severity)}.500`}
                    shadow="lg"
                    _hover={{ shadow: "xl" }}
                    transition="all 0.2s"
                  >
                    <CardBody p={3}>
                      <VStack spacing={2} align="stretch">
                        <HStack justify="space-between" align="start">
                          <HStack spacing={2} flex={1}>
                            <Icon 
                              as={ThreatIcon} 
                              color={`${getSeverityColor(alert.severity)}.500`}
                              boxSize={4}
                            />
                            <VStack align="start" spacing={0} flex={1}>
                              <Text fontSize="sm" fontWeight="bold" noOfLines={1}>
                                {alert.title}
                              </Text>
                              <HStack spacing={2}>
                                <Badge 
                                  colorScheme={getSeverityColor(alert.severity)} 
                                  variant="solid"
                                  size="sm"
                                >
                                  {alert.severity.toUpperCase()}
                                </Badge>
                                <Text fontSize="xs" color="gray.500">
                                  {alert.chainName}
                                </Text>
                              </HStack>
                            </VStack>
                          </HStack>

                          <HStack spacing={1}>
                            <CircularProgress 
                              value={alert.riskScore} 
                              color={`${getSeverityColor(alert.severity)}.500`}
                              size="30px"
                              thickness="8px"
                            >
                              <CircularProgressLabel fontSize="xs">
                                {alert.riskScore}
                              </CircularProgressLabel>
                            </CircularProgress>
                            
                            <IconButton
                              size="xs"
                              variant="ghost"
                              icon={<Icon as={FaTimes} />}
                              onClick={() => handleDismissAlert(alert.id)}
                            />
                          </HStack>
                        </HStack>

                        <Text fontSize="xs" color="gray.600" noOfLines={2}>
                          {alert.description}
                        </Text>

                        <HStack justify="space-between" align="center">
                          <HStack spacing={1} fontSize="xs" color="gray.500">
                            <Icon as={FaClock} boxSize={3} />
                            <Text>{formatTimestamp(alert.timestamp)}</Text>
                          </HStack>

                          <HStack spacing={1}>
                            <Button
                              size="xs"
                              variant="outline"
                              colorScheme={getSeverityColor(alert.severity)}
                              leftIcon={<Icon as={FaEye} />}
                              onClick={() => handleViewAlert(alert)}
                            >
                              View
                            </Button>
                            
                            {alert.severity === 'critical' && (
                              <Button
                                size="xs"
                                colorScheme="red"
                                leftIcon={<Icon as={FaCheck} />}
                                onClick={() => {
                                  // Handle acknowledge action
                                  handleDismissAlert(alert.id);
                                  toast({
                                    title: "Alert Acknowledged",
                                    description: "Critical alert has been acknowledged",
                                    status: "success",
                                    duration: 3000,
                                    isClosable: true,
                                  });
                                }}
                              >
                                ACK
                              </Button>
                            )}
                          </HStack>
                        </HStack>

                        {/* Progress bar for auto-dismiss */}
                        {autoHide && alert.severity !== 'critical' && (
                          <Progress
                            size="xs"
                            colorScheme={getSeverityColor(alert.severity)}
                            value={100}
                            hasStripe
                            isAnimated
                          />
                        )}
                      </VStack>
                    </CardBody>
                  </Card>
                </ScaleFade>
              );
            })}
          </VStack>
        </Collapse>

        {/* No Alerts Message */}
        {visibleAlerts.length === 0 && isListening && (
          <Slide direction="top" in={true}>
            <Card
              bg={cardBg}
              border="1px solid"
              borderColor="green.200"
              shadow="md"
            >
              <CardBody p={3} textAlign="center">
                <VStack spacing={2}>
                  <Icon as={FaShieldAlt} color="green.500" boxSize={6} />
                  <Text fontSize="sm" color="green.600" fontWeight="semibold">
                    All Systems Secure
                  </Text>
                  <Text fontSize="xs" color="gray.600">
                    No active threats detected
                  </Text>
                </VStack>
              </CardBody>
            </Card>
          </Slide>
        )}

        {/* Paused State */}
        {!isListening && (
          <Card
            bg={cardBg}
            border="1px solid"
            borderColor="yellow.200"
            shadow="md"
          >
            <CardBody p={3} textAlign="center">
              <VStack spacing={2}>
                <Icon as={FaPause} color="yellow.500" boxSize={6} />
                <Text fontSize="sm" color="yellow.600" fontWeight="semibold">
                  Alerts Paused
                </Text>
                <Button
                  size="xs"
                  colorScheme="yellow"
                  leftIcon={<Icon as={FaPlay} />}
                  onClick={handleToggleListening}
                >
                  Resume Monitoring
                </Button>
              </VStack>
            </CardBody>
          </Card>
        )}
      </VStack>
    </Box>
  );
}
