"use client";

import { useState, useRef, useEffect } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  Avatar,
  Badge,
  Spinner,
  Icon,
  useColorModeValue,
  Flex,
  Divider,
  Tooltip,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
} from "@chakra-ui/react";
import {
  FaPaperPlane,
  FaRobot,
  FaUser,
  FaExclamationTriangle,
  FaThumbsUp,
  FaThumbsDown,
  FaCopy,
  FaEllipsisV,
  FaBookOpen,
  FaGavel,
} from "react-icons/fa";
import { LegalQuery, LegalResponse, legalBotService } from "../../services/legalBotService";

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  sources?: any[];
  confidence?: number;
  followUpQuestions?: string[];
  isLoading?: boolean;
}

interface ChatInterfaceProps {
  userRegion: string;
  onQuerySubmit?: (query: LegalQuery) => void;
}

export default function ChatInterface({ userRegion, onQuerySubmit }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const userBubbleBg = useColorModeValue("purple.500", "purple.600");
  const botBubbleBg = useColorModeValue("gray.100", "gray.700");

  useEffect(() => {
    // Add welcome message
    setMessages([{
      id: 'welcome',
      type: 'bot',
      content: `Hello! I'm your AI Legal & Compliance Assistant. I can help you understand RWA investment regulations, compliance requirements, and legal considerations for your region (${userRegion}). What would you like to know?`,
      timestamp: new Date(),
      followUpQuestions: [
        "What are the securities law requirements for tokenizing real estate?",
        "How do KYC/AML rules apply to my RWA platform?",
        "What licenses do I need to operate in my jurisdiction?"
      ]
    }]);
  }, [userRegion]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (question?: string) => {
    const queryText = question || inputValue.trim();
    if (!queryText || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: queryText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // Add loading message
    const loadingMessage: Message = {
      id: 'loading-' + Date.now(),
      type: 'bot',
      content: "Analyzing your question and searching legal databases...",
      timestamp: new Date(),
      isLoading: true
    };

    setMessages(prev => [...prev, loadingMessage]);

    try {
      // Create legal query
      const legalQuery: LegalQuery = {
        id: Date.now().toString(),
        question: queryText,
        category: 'general',
        region: userRegion,
        timestamp: new Date(),
        userId: 'current-user'
      };

      // Process with legal bot service
      const response = await legalBotService.processQuery(legalQuery);

      // Remove loading message and add bot response
      setMessages(prev => {
        const filtered = prev.filter(msg => !msg.isLoading);
        const botMessage: Message = {
          id: response.id,
          type: 'bot',
          content: response.answer,
          timestamp: response.timestamp,
          sources: response.sources,
          confidence: response.confidence,
          followUpQuestions: response.followUpQuestions
        };
        return [...filtered, botMessage];
      });

      // Call callback if provided
      if (onQuerySubmit) {
        onQuerySubmit(legalQuery);
      }

    } catch (error) {
      console.error('Error processing legal query:', error);
      
      // Remove loading message and add error message
      setMessages(prev => {
        const filtered = prev.filter(msg => !msg.isLoading);
        const errorMessage: Message = {
          id: 'error-' + Date.now(),
          type: 'bot',
          content: "I apologize, but I encountered an error processing your question. Please try again or rephrase your question.",
          timestamp: new Date()
        };
        return [...filtered, errorMessage];
      });

      toast({
        title: "Error",
        description: "Failed to process your legal query. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      status: "success",
      duration: 2000,
      isClosable: true,
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "green";
    if (confidence >= 0.6) return "yellow";
    return "red";
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return "High Confidence";
    if (confidence >= 0.6) return "Medium Confidence";
    return "Low Confidence";
  };

  return (
    <VStack spacing={0} h="600px" bg={cardBg} rounded="xl" border="1px solid" borderColor={borderColor}>
      {/* Chat Header */}
      <HStack w="full" p={4} borderBottom="1px solid" borderColor={borderColor}>
        <Avatar size="sm" bg="purple.500" icon={<FaRobot />} />
        <VStack align="start" spacing={0} flex={1}>
          <Text fontWeight="bold">Legal & Compliance Assistant</Text>
          <HStack spacing={2}>
            <Badge size="sm" colorScheme="green">Online</Badge>
            <Badge size="sm" colorScheme="blue">{userRegion}</Badge>
          </HStack>
        </VStack>
        <Tooltip label="This bot provides educational information only">
          <Icon as={FaExclamationTriangle} color="orange.500" />
        </Tooltip>
      </HStack>

      {/* Messages Area */}
      <VStack 
        flex={1} 
        w="full" 
        p={4} 
        spacing={4} 
        overflowY="auto" 
        align="stretch"
        css={{
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-track': {
            width: '6px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#CBD5E0',
            borderRadius: '24px',
          },
        }}
      >
        {messages.map((message) => (
          <Box key={message.id}>
            <Flex justify={message.type === 'user' ? 'flex-end' : 'flex-start'}>
              <HStack 
                spacing={3} 
                maxW="80%" 
                align="flex-start"
                flexDirection={message.type === 'user' ? 'row-reverse' : 'row'}
              >
                <Avatar 
                  size="sm" 
                  bg={message.type === 'user' ? "blue.500" : "purple.500"}
                  icon={message.type === 'user' ? <FaUser /> : <FaRobot />}
                />
                
                <VStack align={message.type === 'user' ? 'flex-end' : 'flex-start'} spacing={2}>
                  <Box
                    bg={message.type === 'user' ? userBubbleBg : botBubbleBg}
                    color={message.type === 'user' ? "white" : "inherit"}
                    p={3}
                    rounded="lg"
                    maxW="full"
                    position="relative"
                  >
                    {message.isLoading ? (
                      <HStack spacing={2}>
                        <Spinner size="sm" />
                        <Text fontSize="sm">{message.content}</Text>
                      </HStack>
                    ) : (
                      <Text fontSize="sm" whiteSpace="pre-wrap">
                        {message.content}
                      </Text>
                    )}

                    {/* Message Actions */}
                    {!message.isLoading && message.type === 'bot' && (
                      <HStack spacing={1} mt={2} justify="flex-end">
                        <IconButton
                          aria-label="Copy message"
                          icon={<FaCopy />}
                          size="xs"
                          variant="ghost"
                          onClick={() => copyToClipboard(message.content)}
                        />
                        <Menu>
                          <MenuButton
                            as={IconButton}
                            aria-label="More options"
                            icon={<FaEllipsisV />}
                            size="xs"
                            variant="ghost"
                          />
                          <MenuList>
                            <MenuItem icon={<FaThumbsUp />}>Helpful</MenuItem>
                            <MenuItem icon={<FaThumbsDown />}>Not Helpful</MenuItem>
                          </MenuList>
                        </Menu>
                      </HStack>
                    )}
                  </Box>

                  {/* Confidence Badge */}
                  {message.confidence && (
                    <Badge 
                      size="sm" 
                      colorScheme={getConfidenceColor(message.confidence)}
                      variant="outline"
                    >
                      {getConfidenceLabel(message.confidence)}
                    </Badge>
                  )}

                  {/* Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <VStack align="start" spacing={1} w="full">
                      <Text fontSize="xs" fontWeight="semibold" color="gray.600">
                        <Icon as={FaBookOpen} mr={1} />
                        Sources:
                      </Text>
                      {message.sources.map((source, index) => (
                        <Badge key={index} size="sm" colorScheme="blue" variant="outline">
                          {source.title}
                        </Badge>
                      ))}
                    </VStack>
                  )}

                  {/* Follow-up Questions */}
                  {message.followUpQuestions && message.followUpQuestions.length > 0 && (
                    <VStack align="start" spacing={2} w="full">
                      <Text fontSize="xs" fontWeight="semibold" color="gray.600">
                        Related questions:
                      </Text>
                      <VStack spacing={1} align="stretch">
                        {message.followUpQuestions.map((question, index) => (
                          <Button
                            key={index}
                            size="sm"
                            variant="outline"
                            colorScheme="purple"
                            fontSize="xs"
                            h="auto"
                            p={2}
                            whiteSpace="normal"
                            textAlign="left"
                            onClick={() => handleSubmit(question)}
                            isDisabled={isLoading}
                          >
                            {question}
                          </Button>
                        ))}
                      </VStack>
                    </VStack>
                  )}

                  <Text fontSize="xs" color="gray.500">
                    {message.timestamp.toLocaleTimeString()}
                  </Text>
                </VStack>
              </HStack>
            </Flex>
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </VStack>

      {/* Legal Disclaimer */}
      <Box w="full" px={4} py={2} bg="orange.50" borderTop="1px solid" borderColor="orange.200">
        <HStack spacing={2}>
          <Icon as={FaGavel} color="orange.500" boxSize={3} />
          <Text fontSize="xs" color="orange.700">
            This is educational information only, not legal advice. Consult qualified counsel for specific matters.
          </Text>
        </HStack>
      </Box>

      {/* Input Area */}
      <HStack w="full" p={4} borderTop="1px solid" borderColor={borderColor} spacing={3}>
        <Input
          placeholder="Ask about RWA legal compliance, regulations, or requirements..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          isDisabled={isLoading}
          bg={useColorModeValue("white", "gray.700")}
        />
        <Button
          colorScheme="purple"
          onClick={() => handleSubmit()}
          isLoading={isLoading}
          isDisabled={!inputValue.trim()}
          leftIcon={<Icon as={FaPaperPlane} />}
        >
          Send
        </Button>
      </HStack>
    </VStack>
  );
}
