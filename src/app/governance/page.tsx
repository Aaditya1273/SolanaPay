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
import { FaVoteYea, FaCoins, FaChartPie } from "react-icons/fa";
import GovernanceDashboard from "../../components/governance/GovernanceDashboard";
import FractionalOwnershipViewer from "../../components/governance/FractionalOwnershipViewer";

export default function GovernancePage() {
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
              <Icon as={FaVoteYea} boxSize={8} color="purple.500" />
              <Heading size="xl" bgGradient="linear(to-r, purple.400, blue.400)" bgClip="text">
                Fractional Ownership & Governance
              </Heading>
            </HStack>
            <Text fontSize="lg" color="gray.600" maxW="2xl">
              Manage your fractional RWA investments and participate in decentralized governance decisions
            </Text>
          </VStack>

          {/* Governance Tabs */}
          <Tabs variant="enclosed" colorScheme="purple">
            <TabList>
              <Tab>
                <HStack>
                  <Icon as={FaVoteYea} />
                  <Text>Governance & Voting</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack>
                  <Icon as={FaCoins} />
                  <Text>Fractional Ownership</Text>
                </HStack>
              </Tab>
            </TabList>

            <TabPanels>
              <TabPanel p={0} pt={6}>
                <GovernanceDashboard />
              </TabPanel>
              
              <TabPanel p={0} pt={6}>
                <FractionalOwnershipViewer />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      </Container>
    </Box>
  );
}
