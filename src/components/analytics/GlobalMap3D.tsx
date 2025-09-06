'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  Box,
  VStack,
  HStack,
  Text as ChakraText,
  Badge,
  Card,
  CardBody,
  Button,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Progress,
  Icon,
  Tooltip,
} from '@chakra-ui/react';
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiUsers, FiActivity } from 'react-icons/fi';
import { GlobalAsset, TradingActivity } from '../../services/globalAnalyticsService';

interface AssetPinProps {
  asset: GlobalAsset;
  position: [number, number, number];
  onClick: (asset: GlobalAsset) => void;
  isSelected: boolean;
}

function AssetPin({ asset, position, onClick, isSelected }: AssetPinProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
      meshRef.current.scale.setScalar(
        (hovered || isSelected ? 1.5 : 1) + Math.sin(state.clock.elapsedTime * 2) * 0.1
      );
    }
  });

  const getColorByType = (type: string) => {
    const colors = {
      'real-estate': '#3182CE',
      'carbon-credits': '#38A169',
      'precious-metals': '#D69E2E',
      'commodities': '#E53E3E',
      'renewable-energy': '#00B5D8',
      'infrastructure': '#805AD5',
      'art': '#D53F8C',
      'bonds': '#718096'
    };
    return colors[type as keyof typeof colors] || '#718096';
  };

  const getIntensity = () => {
    const volume = asset.trading.volume24h;
    return Math.min(volume / 100000, 2) + 0.5;
  };

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={() => onClick(asset)}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <cylinderGeometry args={[0.02, 0.02, 0.1, 8]} />
        <meshStandardMaterial
          color={getColorByType(asset.type)}
          emissive={getColorByType(asset.type)}
          emissiveIntensity={getIntensity()}
        />
      </mesh>
      
      {/* Pulsing ring for high activity */}
      {asset.trading.volume24h > 50000 && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[0.05, 0.08, 16]} />
          <meshBasicMaterial
            color={getColorByType(asset.type)}
            transparent
            opacity={0.6}
          />
        </mesh>
      )}

      {/* Hover label */}
      {hovered && (
        <Html distanceFactor={10}>
          <Box
            bg="white"
            p={2}
            borderRadius="md"
            shadow="lg"
            border="1px solid"
            borderColor="gray.200"
            minW="200px"
          >
            <VStack spacing={1} align="start">
              <ChakraText fontSize="sm" fontWeight="bold">
                {asset.name}
              </ChakraText>
              <HStack>
                <Badge colorScheme="blue">{asset.type}</Badge>
                <Badge colorScheme={asset.value.changePercent24h >= 0 ? 'green' : 'red'}>
                  {asset.value.changePercent24h >= 0 ? '+' : ''}
                  {asset.value.changePercent24h.toFixed(1)}%
                </Badge>
              </HStack>
              <ChakraText fontSize="xs" color="gray.600">
                ${asset.value.current.toLocaleString()}
              </ChakraText>
            </VStack>
          </Box>
        </Html>
      )}
    </group>
  );
}

function Globe() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.001;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2, 64, 32]} />
      <meshStandardMaterial
        color="#1a365d"
        transparent
        opacity={0.8}
        wireframe
      />
    </mesh>
  );
}

function TradingParticles({ activities }: { activities: TradingActivity[] }) {
  const particlesRef = useRef<THREE.Points>(null);
  
  const positions = useMemo(() => {
    const pos = new Float32Array(activities.length * 3);
    activities.forEach((activity, i) => {
      const phi = (90 - activity.location.lat) * (Math.PI / 180);
      const theta = (activity.location.lng + 180) * (Math.PI / 180);
      const radius = 2.1;
      
      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.cos(phi);
      pos[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    });
    return pos;
  }, [activities]);

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#00ff88"
        transparent
        opacity={0.8}
      />
    </points>
  );
}

interface GlobalMap3DProps {
  assets: GlobalAsset[];
  tradingActivity: TradingActivity[];
  onAssetSelect?: (asset: GlobalAsset) => void;
}

export default function GlobalMap3D({ assets, tradingActivity, onAssetSelect }: GlobalMap3DProps) {
  const [selectedAsset, setSelectedAsset] = useState<GlobalAsset | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const assetPositions = useMemo(() => {
    return assets.map(asset => {
      const phi = (90 - asset.location.lat) * (Math.PI / 180);
      const theta = (asset.location.lng + 180) * (Math.PI / 180);
      const radius = 2.15;
      
      return [
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      ] as [number, number, number];
    });
  }, [assets]);

  const handleAssetClick = (asset: GlobalAsset) => {
    setSelectedAsset(asset);
    onAssetSelect?.(asset);
    onOpen();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <>
      <Box h="600px" w="100%" position="relative" bg="black" borderRadius="lg" overflow="hidden">
        <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
          <ambientLight intensity={0.3} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <pointLight position={[-10, -10, -10]} intensity={0.5} />
          
          <Globe />
          
          {assets.map((asset, index) => (
            <AssetPin
              key={asset.id}
              asset={asset}
              position={assetPositions[index]}
              onClick={handleAssetClick}
              isSelected={selectedAsset?.id === asset.id}
            />
          ))}
          
          <TradingParticles activities={tradingActivity} />
          
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={3}
            maxDistance={10}
          />
        </Canvas>

        {/* Legend */}
        <Box
          position="absolute"
          top={4}
          left={4}
          bg="rgba(0,0,0,0.8)"
          color="white"
          p={3}
          borderRadius="md"
          fontSize="sm"
        >
          <VStack spacing={2} align="start">
            <ChakraText fontWeight="bold">Asset Types</ChakraText>
            <HStack><Box w={3} h={3} bg="#3182CE" borderRadius="full" /><ChakraText>Real Estate</ChakraText></HStack>
            <HStack><Box w={3} h={3} bg="#38A169" borderRadius="full" /><ChakraText>Carbon Credits</ChakraText></HStack>
            <HStack><Box w={3} h={3} bg="#D69E2E" borderRadius="full" /><ChakraText>Precious Metals</ChakraText></HStack>
            <HStack><Box w={3} h={3} bg="#00B5D8" borderRadius="full" /><ChakraText>Renewable Energy</ChakraText></HStack>
          </VStack>
        </Box>

        {/* Stats overlay */}
        <Box
          position="absolute"
          top={4}
          right={4}
          bg="rgba(0,0,0,0.8)"
          color="white"
          p={3}
          borderRadius="md"
          fontSize="sm"
        >
          <VStack spacing={1} align="end">
            <ChakraText fontWeight="bold">Live Stats</ChakraText>
            <ChakraText>{assets.length} Assets</ChakraText>
            <ChakraText>{tradingActivity.length} Recent Trades</ChakraText>
            <ChakraText>
              {formatCurrency(assets.reduce((sum, a) => sum + a.value.current, 0))} TVL
            </ChakraText>
          </VStack>
        </Box>
      </Box>

      {/* Asset Detail Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{selectedAsset?.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {selectedAsset && (
              <VStack spacing={6} align="stretch">
                <SimpleGrid columns={2} spacing={4}>
                  <Stat>
                    <StatLabel>Current Value</StatLabel>
                    <StatNumber color="blue.600">
                      {formatCurrency(selectedAsset.value.current)}
                    </StatNumber>
                    <StatHelpText>
                      <Icon as={selectedAsset.value.changePercent24h >= 0 ? FiTrendingUp : FiTrendingDown} />
                      {selectedAsset.value.changePercent24h >= 0 ? '+' : ''}
                      {selectedAsset.value.changePercent24h.toFixed(1)}% (24h)
                    </StatHelpText>
                  </Stat>

                  <Stat>
                    <StatLabel>Trading Volume</StatLabel>
                    <StatNumber color="green.600">
                      {formatCurrency(selectedAsset.trading.volume24h)}
                    </StatNumber>
                    <StatHelpText>
                      <Icon as={FiActivity} />
                      {selectedAsset.trading.trades24h} trades (24h)
                    </StatHelpText>
                  </Stat>
                </SimpleGrid>

                <Box>
                  <ChakraText fontWeight="semibold" mb={2}>Ownership Distribution</ChakraText>
                  <Progress
                    value={(selectedAsset.ownership.holders / 100) * 100}
                    colorScheme="blue"
                    mb={2}
                  />
                  <HStack justify="space-between" fontSize="sm">
                    <ChakraText>{selectedAsset.ownership.holders} holders</ChakraText>
                    <ChakraText>{selectedAsset.ownership.distributionScore}/100 distribution score</ChakraText>
                  </HStack>
                </Box>

                <SimpleGrid columns={3} spacing={4}>
                  <VStack>
                    <ChakraText fontSize="2xl" fontWeight="bold" color="purple.600">
                      {selectedAsset.performance.roi1y.toFixed(1)}%
                    </ChakraText>
                    <ChakraText fontSize="sm" color="gray.600">1Y ROI</ChakraText>
                  </VStack>
                  <VStack>
                    <ChakraText fontSize="2xl" fontWeight="bold" color="orange.600">
                      {selectedAsset.performance.volatility.toFixed(1)}%
                    </ChakraText>
                    <ChakraText fontSize="sm" color="gray.600">Volatility</ChakraText>
                  </VStack>
                  <VStack>
                    <ChakraText fontSize="2xl" fontWeight="bold" color="green.600">
                      {selectedAsset.metadata.sustainability.esgScore}
                    </ChakraText>
                    <ChakraText fontSize="sm" color="gray.600">ESG Score</ChakraText>
                  </VStack>
                </SimpleGrid>

                <Box>
                  <ChakraText fontWeight="semibold" mb={2}>Location & Details</ChakraText>
                  <VStack spacing={2} align="start" fontSize="sm">
                    <HStack>
                      <ChakraText fontWeight="medium">Location:</ChakraText>
                      <ChakraText>{selectedAsset.location.city}, {selectedAsset.location.country}</ChakraText>
                    </HStack>
                    <HStack>
                      <ChakraText fontWeight="medium">Type:</ChakraText>
                      <Badge colorScheme="blue">{selectedAsset.type}</Badge>
                    </HStack>
                    <HStack>
                      <ChakraText fontWeight="medium">Status:</ChakraText>
                      <Badge colorScheme={selectedAsset.status === 'active' ? 'green' : 'gray'}>
                        {selectedAsset.status}
                      </Badge>
                    </HStack>
                  </VStack>
                </Box>

                <Box>
                  <ChakraText>{selectedAsset.metadata.description}</ChakraText>
                </Box>
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
