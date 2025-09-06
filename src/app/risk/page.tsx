"use client";

import { useState } from "react";
import {
  Box,
  Container,
  Heading,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  VStack,
  HStack,
  Icon,
  useColorModeValue,
} from "@chakra-ui/react";
import { FaRobot, FaShieldAlt, FaBell } from "react-icons/fa";
import RiskDashboard from "../../components/ai/RiskDashboard";
import RiskMonitor from "../../components/ai/RiskMonitor";

export default function RiskPage() {
  const bgGradient = useColorModeValue(
    "linear(to-br, blue.50, purple.50)",
    "linear(to-br, gray.900, purple.900)"
  );

  return (
    <Box minH="100vh" bg={bgGradient}>
      <Container maxW="7xl" py={8}>
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <VStack spacing={4} textAlign="center">
            <HStack justify="center" spacing={3}>
              <Icon as={FaRobot} boxSize={8} color="purple.500" />
              <Heading size="xl" bgGradient="linear(to-r, purple.400, blue.400)" bgClip="text">
                AI Risk Engine
              </Heading>
            </HStack>
            <Text fontSize="lg" color="gray.600" maxW="2xl">
              Advanced AI-powered risk assessment and fraud detection for RWA assets and wallet addresses
            </Text>
          </VStack>

          {/* Risk Management Tabs */}
          <Tabs variant="enclosed" colorScheme="purple">
            <TabList>
              <Tab>
                <HStack>
                  <Icon as={FaShieldAlt} />
                  <Text>Risk Dashboard</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack>
                  <Icon as={FaBell} />
                  <Text>Real-Time Monitor</Text>
                </HStack>
              </Tab>
            </TabList>

            <TabPanels>
              <TabPanel p={0} pt={6}>
                <RiskDashboard />
              </TabPanel>
              
              <TabPanel p={0} pt={6}>
                <RiskMonitor />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      </Container>
    </Box>
  );
}
