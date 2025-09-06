'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SafeDateDisplay, ClientOnly } from '@/components/ui/hydration-safe';
import { 
  Wallet, 
  Shield, 
  Globe, 
  TrendingUp, 
  Zap, 
  CheckCircle, 
  ArrowRight, 
  ExternalLink,
  Play,
  Pause,
  RotateCcw,
  Eye,
  Copy,
  Download,
  ArrowRightLeft, 
  Coins, 
  FileCheck, 
  Sparkles
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function DemoPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const demoSteps = [
    {
      id: 'wallet',
      title: 'MetaMask Embedded Wallet',
      description: 'Seedless social login with Web3Auth',
      icon: <Wallet className="w-6 h-6" />,
      color: 'bg-blue-500',
      demo: 'Connect with Google, Twitter, or email - no seed phrases needed!'
    },
    {
      id: 'identity',
      title: 'Decentralized Identity',
      description: 'Create DID and verifiable credentials',
      icon: <Shield className="w-6 h-6" />,
      color: 'bg-purple-500',
      demo: 'Generate your DID and issue RWA credentials on Ceramic Network'
    },
    {
      id: 'tokenize',
      title: 'RWA Tokenization',
      description: 'Mint real-world assets as NFTs',
      icon: <Coins className="w-6 h-6" />,
      color: 'bg-green-500',
      demo: 'Tokenize real estate, carbon credits, or certificates on Solana & EVM'
    },
    {
      id: 'bridge',
      title: 'Cross-Chain Bridge',
      description: 'Transfer assets between chains',
      icon: <ArrowRightLeft className="w-6 h-6" />,
      color: 'bg-orange-500',
      demo: 'Bridge your RWA NFTs from Solana to Ethereum using Wormhole'
    },
    {
      id: 'oracle',
      title: 'Oracle Integration',
      description: 'Real-time price feeds and verification',
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'bg-red-500',
      demo: 'Get live asset prices from Chainlink oracles and verify authenticity'
    },
    {
      id: 'dashboard',
      title: 'Cross-Chain Dashboard',
      description: 'Unified portfolio management',
      icon: <Globe className="w-6 h-6" />,
      color: 'bg-indigo-500',
      demo: 'View all your assets, transactions, and credentials in one place'
    }
  ];

  const hackathonFeatures = [
    {
      track: 'Cross-Chain Interoperability',
      features: [
        'Wormhole bridge for Solana ↔ EVM transfers',
        'Multi-chain asset management',
        'Unified transaction tracking',
        'Cross-chain marketplace listings'
      ]
    },
    {
      track: 'RWA Tokenization & Digital Identity',
      features: [
        'Real-world asset tokenization (Real Estate, Carbon Credits, etc.)',
        'Decentralized Identity with verifiable credentials',
        'KYC/AML compliance integration',
        'Reputation-based asset verification'
      ]
    }
  ];

  const startDemo = () => {
    setIsPlaying(true);
    setCurrentStep(0);
    setCompletedSteps([]);
    
    // Auto-progress through demo steps
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        const next = prev + 1;
        setCompletedSteps(completed => [...completed, prev]);
        
        if (next >= demoSteps.length) {
          clearInterval(interval);
          setIsPlaying(false);
          return prev;
        }
        return next;
      });
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Sparkles className="w-8 h-8 text-yellow-400" />
            <h1 className="text-4xl font-bold text-white">
              OmniFlow Demo
            </h1>
            <Sparkles className="w-8 h-8 text-yellow-400" />
          </div>
          
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Universal Cross-Chain RWA + Identity Router
          </p>
          
          <div className="flex items-center justify-center space-x-4">
            <Badge variant="outline" className="text-green-400 border-green-400">
              ✅ Cross-Chain Interoperability Track
            </Badge>
            <Badge variant="outline" className="text-blue-400 border-blue-400">
              ✅ RWA Tokenization & Digital Identity Track
            </Badge>
          </div>
        </motion.div>

        {/* Demo Control */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <Button
            onClick={startDemo}
            disabled={isPlaying}
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <Play className="w-5 h-5 mr-2" />
            {isPlaying ? 'Demo Running...' : 'Start Live Demo'}
          </Button>
        </motion.div>

        {/* Demo Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {demoSteps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`relative overflow-hidden transition-all duration-500 ${
                currentStep === index && isPlaying
                  ? 'ring-2 ring-yellow-400 bg-white/20'
                  : completedSteps.includes(index)
                  ? 'bg-white/10 border-green-500'
                  : 'bg-white/5'
              } backdrop-blur-lg border-white/20`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${step.color}`}>
                      {step.icon}
                    </div>
                    {completedSteps.includes(index) && (
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    )}
                    {currentStep === index && isPlaying && (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      >
                        <Zap className="w-6 h-6 text-yellow-400" />
                      </motion.div>
                    )}
                  </div>
                  <CardTitle className="text-white text-lg">
                    {step.title}
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    {step.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-400">
                    {step.demo}
                  </p>
                  
                  {currentStep === index && isPlaying && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 p-2 bg-yellow-400/20 rounded border border-yellow-400/30"
                    >
                      <p className="text-yellow-300 text-xs font-medium">
                        🚀 Currently demonstrating...
                      </p>
                    </motion.div>
                  )}
                </CardContent>
                
                {/* Progress bar */}
                {currentStep === index && isPlaying && (
                  <motion.div
                    className="absolute bottom-0 left-0 h-1 bg-yellow-400"
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 3, ease: "linear" }}
                  />
                )}
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Hackathon Tracks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Tabs defaultValue="track1" className="space-y-6">
            <TabsList className="bg-white/10 backdrop-blur-lg border-white/20 grid w-full grid-cols-2">
              <TabsTrigger value="track1">Cross-Chain Interoperability</TabsTrigger>
              <TabsTrigger value="track2">RWA Tokenization & Identity</TabsTrigger>
            </TabsList>

            <TabsContent value="track1" className="space-y-4">
              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <ArrowRightLeft className="w-6 h-6 mr-2 text-orange-400" />
                    Cross-Chain Interoperability & Asset Movement
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    Seamless asset transfers across Solana and EVM chains
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {hackathonFeatures[0].features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 p-4 bg-orange-500/20 rounded-lg border border-orange-500/30">
                    <h4 className="text-orange-300 font-semibold mb-2">🏆 Winning Edge</h4>
                    <p className="text-orange-200 text-sm">
                      First universal bridge specifically designed for RWA NFTs with built-in compliance and identity verification
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="track2" className="space-y-4">
              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Shield className="w-6 h-6 mr-2 text-purple-400" />
                    Tokenization of Real-World Assets & Digital Identity
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    Complete RWA lifecycle with verifiable identity integration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {hackathonFeatures[1].features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 p-4 bg-purple-500/20 rounded-lg border border-purple-500/30">
                    <h4 className="text-purple-300 font-semibold mb-2">🏆 Winning Edge</h4>
                    <p className="text-purple-200 text-sm">
                      Only platform combining RWA tokenization with self-sovereign identity and cross-chain interoperability
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Technical Architecture */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <FileCheck className="w-6 h-6 mr-2 text-blue-400" />
                Technical Implementation
              </CardTitle>
              <CardDescription className="text-gray-300">
                Production-ready architecture built for scale
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <h4 className="text-white font-semibold">Frontend</h4>
                  <div className="space-y-1 text-sm text-gray-300">
                    <p>• Next.js 14 + TypeScript</p>
                    <p>• Tailwind CSS + Framer Motion</p>
                    <p>• Real-time dashboard</p>
                    <p>• Mobile-responsive design</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="text-white font-semibold">Blockchain</h4>
                  <div className="space-y-1 text-sm text-gray-300">
                    <p>• Solana + Metaplex NFTs</p>
                    <p>• EVM (Ethereum, Polygon, BSC)</p>
                    <p>• Wormhole cross-chain bridge</p>
                    <p>• Chainlink oracles</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="text-white font-semibold">Identity & Storage</h4>
                  <div className="space-y-1 text-sm text-gray-300">
                    <p>• Web3Auth + MetaMask SDK</p>
                    <p>• Ceramic Network DIDs</p>
                    <p>• IPFS/Arweave metadata</p>
                    <p>• Verifiable credentials</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="text-center space-y-4"
        >
          <div className="flex items-center justify-center space-x-4">
            <Button variant="outline" size="lg">
              <ExternalLink className="w-5 h-5 mr-2" />
              View Live Dashboard
            </Button>
            <Button variant="outline" size="lg">
              <Globe className="w-5 h-5 mr-2" />
              Try Cross-Chain Bridge
            </Button>
          </div>
          
          <p className="text-gray-400 text-sm">
            🚀 Ready for production deployment on testnets and mainnet
          </p>
        </motion.div>
      </div>
    </div>
  );
}
