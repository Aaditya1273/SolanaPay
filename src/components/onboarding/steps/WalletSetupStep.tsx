"use client";

import { useState, useEffect } from "react";
import {
  VStack,
  HStack,
  Heading,
  Text,
  Box,
  Button,
  Icon,
  SimpleGrid,
  useColorModeValue,
  Alert,
  AlertIcon,
  Code,
  Badge,
  Spinner,
} from "@chakra-ui/react";
import {
  FaWallet,
  FaShieldAlt,
  FaDownload,
  FaExternalLinkAlt,
  FaCheck,
  FaTimes,
} from "react-icons/fa";
import { localizationService } from "../../../services/localizationService";

interface WalletSetupStepProps {
  data: any;
  onComplete: (data: any) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export default function WalletSetupStep({ 
  data, 
  onComplete, 
  isLoading, 
  setIsLoading 
}: WalletSetupStepProps) {
  const [walletStatus, setWalletStatus] = useState<'none' | 'connecting' | 'connected' | 'error'>('none');
  const [walletAddress, setWalletAddress] = useState('');
  const [selectedWallet, setSelectedWallet] = useState('');

  const cardBg = useColorModeValue("white", "gray.800");
  const t = localizationService.t;

  const wallets = [
    {
      id: 'metamask',
      name: 'MetaMask',
      icon: '🦊',
      description: 'Most popular Ethereum wallet',
      downloadUrl: 'https://metamask.io/download/',
      isInstalled: typeof window !== 'undefined' && !!(window as any).ethereum?.isMetaMask,
      features: ['Browser Extension', 'Mobile App', 'Hardware Wallet Support']
    },
    {
      id: 'walletconnect',
      name: 'WalletConnect',
      icon: '🔗',
      description: 'Connect any mobile wallet',
      downloadUrl: 'https://walletconnect.com/',
      isInstalled: true, // Always available
      features: ['Mobile Wallets', 'QR Code', 'Cross-Platform']
    },
    {
      id: 'onechain',
      name: 'OneChain Wallet',
      icon: '⛓️',
      description: 'Native OneChain ecosystem wallet',
      downloadUrl: 'https://onechain.com/wallet',
      isInstalled: typeof window !== 'undefined' && !!(window as any).onechain,
      features: ['OneChain Native', 'Low Fees', 'Fast Transactions']
    },
    {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      icon: '🔵',
      description: 'Self-custody wallet by Coinbase',
      downloadUrl: 'https://wallet.coinbase.com/',
      isInstalled: typeof window !== 'undefined' && !!(window as any).ethereum?.isCoinbaseWallet,
      features: ['DeFi Integration', 'NFT Support', 'Easy Onboarding']
    }
  ];

  const connectWallet = async (walletId: string) => {
    setSelectedWallet(walletId);
    setWalletStatus('connecting');
    setIsLoading(true);

    try {
      // Simulate wallet connection
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock wallet connection logic
      let address = '';
      switch (walletId) {
        case 'metamask':
          if ((window as any).ethereum?.isMetaMask) {
            const accounts = await (window as any).ethereum.request({
              method: 'eth_requestAccounts'
            });
            address = accounts[0];
          } else {
            throw new Error('MetaMask not installed');
          }
          break;
        case 'walletconnect':
          // Mock WalletConnect connection
          address = '0x742d35Cc6634C0532925a3b8D4C9db96c4b4d1b7';
          break;
        case 'onechain':
          // Mock OneChain wallet connection
          address = '0x8ba1f109551bD432803012645Hac136c22C501e5';
          break;
        case 'coinbase':
          // Mock Coinbase wallet connection
          address = '0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5';
          break;
        default:
          throw new Error('Unsupported wallet');
      }

      setWalletAddress(address);
      setWalletStatus('connected');
      
      // Complete the step
      onComplete({ 
        walletAddress: address, 
        walletType: walletId,
        walletConnected: true 
      });

    } catch (error) {
      console.error('Wallet connection error:', error);
      setWalletStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <VStack spacing={8} align="stretch">
      {/* Header */}
      <VStack spacing={4} textAlign="center">
        <Icon as={FaWallet} boxSize={12} color="purple.500" />
        <Heading size="lg" color="gray.800">
          {t('onboarding.connectWallet')}
        </Heading>
        <Text color="gray.600" maxW="2xl">
          {t('onboarding.walletDescription')}
        </Text>
      </VStack>

      {/* Connection Status */}
      {walletStatus === 'connected' && (
        <Alert status="success" rounded="lg">
          <AlertIcon />
          <VStack align="start" spacing={1}>
            <Text fontWeight="bold">Wallet Connected Successfully!</Text>
            <HStack>
              <Text fontSize="sm">Address:</Text>
              <Code fontSize="sm">{formatAddress(walletAddress)}</Code>
            </HStack>
          </VStack>
        </Alert>
      )}

      {walletStatus === 'error' && (
        <Alert status="error" rounded="lg">
          <AlertIcon />
          <Text>Failed to connect wallet. Please try again or select a different wallet.</Text>
        </Alert>
      )}

      {/* Wallet Options */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
        {wallets.map((wallet) => (
          <Box
            key={wallet.id}
            bg={cardBg}
            p={6}
            rounded="xl"
            border="2px solid"
            borderColor={
              selectedWallet === wallet.id && walletStatus === 'connecting'
                ? "purple.500"
                : wallet.isInstalled
                ? "green.200"
                : "gray.200"
            }
            shadow="md"
            _hover={{ shadow: "lg", transform: "translateY(-2px)" }}
            transition="all 0.2s"
            position="relative"
          >
            {/* Status Indicators */}
            {wallet.isInstalled ? (
              <Badge
                position="absolute"
                top={3}
                right={3}
                colorScheme="green"
                variant="solid"
                fontSize="xs"
              >
                <Icon as={FaCheck} mr={1} />
                Installed
              </Badge>
            ) : (
              <Badge
                position="absolute"
                top={3}
                right={3}
                colorScheme="orange"
                variant="outline"
                fontSize="xs"
              >
                Not Installed
              </Badge>
            )}

            <VStack spacing={4} align="start">
              {/* Wallet Header */}
              <HStack>
                <Text fontSize="2xl">{wallet.icon}</Text>
                <VStack align="start" spacing={0}>
                  <Text fontWeight="bold" fontSize="lg">
                    {wallet.name}
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    {wallet.description}
                  </Text>
                </VStack>
              </HStack>

              {/* Features */}
              <Box>
                <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={2}>
                  Features:
                </Text>
                <VStack align="start" spacing={1}>
                  {wallet.features.map((feature) => (
                    <HStack key={feature} spacing={2}>
                      <Icon as={FaCheck} color="green.500" boxSize={3} />
                      <Text fontSize="xs" color="gray.600">
                        {feature}
                      </Text>
                    </HStack>
                  ))}
                </VStack>
              </Box>

              {/* Action Button */}
              {wallet.isInstalled ? (
                <Button
                  colorScheme="purple"
                  size="sm"
                  w="full"
                  onClick={() => connectWallet(wallet.id)}
                  isLoading={selectedWallet === wallet.id && walletStatus === 'connecting'}
                  loadingText="Connecting..."
                  isDisabled={walletStatus === 'connected' && selectedWallet !== wallet.id}
                  leftIcon={
                    walletStatus === 'connected' && selectedWallet === wallet.id
                      ? <Icon as={FaCheck} />
                      : <Icon as={FaWallet} />
                  }
                >
                  {walletStatus === 'connected' && selectedWallet === wallet.id
                    ? 'Connected'
                    : 'Connect Wallet'
                  }
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  w="full"
                  as="a"
                  href={wallet.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  leftIcon={<Icon as={FaDownload} />}
                  rightIcon={<Icon as={FaExternalLinkAlt} />}
                >
                  Install {wallet.name}
                </Button>
              )}
            </VStack>
          </Box>
        ))}
      </SimpleGrid>

      {/* Security Notice */}
      <Box
        bg="blue.50"
        p={6}
        rounded="lg"
        border="1px solid"
        borderColor="blue.200"
      >
        <VStack spacing={3}>
          <Icon as={FaShieldAlt} color="blue.500" boxSize={6} />
          <Heading size="md" color="blue.800">
            Security Best Practices
          </Heading>
          <VStack spacing={2} align="start" w="full">
            <HStack>
              <Icon as={FaCheck} color="green.500" boxSize={4} />
              <Text fontSize="sm" color="blue.700">
                Never share your private keys or seed phrase
              </Text>
            </HStack>
            <HStack>
              <Icon as={FaCheck} color="green.500" boxSize={4} />
              <Text fontSize="sm" color="blue.700">
                Always verify transaction details before signing
              </Text>
            </HStack>
            <HStack>
              <Icon as={FaCheck} color="green.500" boxSize={4} />
              <Text fontSize="sm" color="blue.700">
                Use hardware wallets for large amounts
              </Text>
            </HStack>
            <HStack>
              <Icon as={FaCheck} color="green.500" boxSize={4} />
              <Text fontSize="sm" color="blue.700">
                Keep your wallet software updated
              </Text>
            </HStack>
          </VStack>
        </VStack>
      </Box>

      {/* Help Section */}
      <Box textAlign="center">
        <Text fontSize="sm" color="gray.500" mb={2}>
          Need help setting up a wallet?
        </Text>
        <Button variant="link" size="sm" colorScheme="purple">
          View Wallet Setup Guide
        </Button>
      </Box>
    </VStack>
  );
}
