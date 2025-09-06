"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Crown,
  Sparkles,
  Shield,
  Globe,
  TrendingUp,
  Zap,
  Play,
  Star,
  ArrowRight,
  Building,
  Leaf,
  Gem,
  Factory,
  ChevronRight,
  Award,
  Users,
  BarChart3
} from "lucide-react";
import { ConnectButton } from "thirdweb/react";
import { client } from "../lib/thirdweb";
import Link from "next/link";

const assetTypes = [
  {
    name: "Real Estate",
    icon: Building,
    description: "Tokenize premium properties, commercial buildings, and luxury land",
    totalValue: "$2.4B",
    assets: 1247,
    growth: "+12.5%",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    name: "Carbon Credits",
    icon: Leaf,
    description: "Trade verified carbon offset certificates and green bonds",
    totalValue: "$156M",
    assets: 892,
    growth: "+8.3%",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    name: "Precious Metals",
    icon: Gem,
    description: "Gold, silver, platinum backed tokens with vault storage",
    totalValue: "$890M",
    assets: 445,
    growth: "+15.7%",
    gradient: "from-yellow-500 to-orange-500",
  },
  {
    name: "Commodities",
    icon: Factory,
    description: "Oil, gas, agricultural products and industrial materials",
    totalValue: "$1.2B",
    assets: 678,
    growth: "+9.2%",
    gradient: "from-purple-500 to-pink-500",
  },
];

const features = [
  {
    title: "Cross-Chain Mastery",
    description: "Seamlessly trade assets across Ethereum, Polygon, BSC, and OneChain with lightning-fast settlements",
    icon: Globe,
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    title: "Fortress Security",
    description: "Military-grade security with multi-signature wallets, insurance coverage, and audit trails",
    icon: Shield,
    gradient: "from-green-500 to-emerald-500",
  },
  {
    title: "Fractional Ownership",
    description: "Democratize investing by splitting high-value assets into affordable, tradeable fractions",
    icon: TrendingUp,
    gradient: "from-purple-500 to-pink-500",
  },
  {
    title: "Instant Liquidity",
    description: "24/7 trading with automated market making, instant settlements, and deep liquidity pools",
    icon: Zap,
    gradient: "from-yellow-500 to-orange-500",
  },
];

const stats = [
  {
    label: "Total Value Locked",
    value: "$4.6B",
    growth: "+12.5%",
    icon: BarChart3,
    description: "Assets under management"
  },
  {
    label: "Active Assets",
    value: "3,262",
    growth: "Across 5 chains",
    icon: Award,
    description: "Tokenized real-world assets"
  },
  {
    label: "Total Trades",
    value: "89,432",
    growth: "24/7 liquidity",
    icon: TrendingUp,
    description: "Successful transactions"
  },
  {
    label: "Verified Users",
    value: "12,847",
    growth: "KYC compliant",
    icon: Users,
    description: "Institutional & retail investors"
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
    },
  },
};

export default function LandingPage() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setIsLoaded(true);

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 text-white overflow-hidden relative">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-blue-950/80 to-indigo-950/90" />

        {/* Dynamic Mouse-Following Orb */}
        <motion.div
          className="absolute w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none"
          animate={{
            x: mousePosition.x - 192,
            y: mousePosition.y - 192,
          }}
          transition={{ type: "spring", stiffness: 50, damping: 30 }}
        />

        {/* Static Background Orbs */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute top-3/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5]
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-yellow-500/15 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ duration: 12, repeat: Infinity }}
        />
      </div>

      {/* Navigation */}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 p-6"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl px-8 py-4 shadow-2xl max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <motion.div
              className="flex items-center space-x-3"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
                <Crown className="w-7 h-7 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                OmniVault
              </span>
            </motion.div>

            <div className="hidden md:flex items-center space-x-8">
              {[
                { href: "/marketplace", label: "Marketplace" },
                { href: "/dashboard", label: "Dashboard" },
                { href: "/portfolio", label: "Portfolio" },
                { href: "/analytics", label: "Analytics" },
              ].map((item, index) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                  <Link
                    href={item.href}
                    className="text-white/80 hover:text-white transition-all duration-300 font-medium relative group"
                  >
                    {item.label}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-yellow-400 to-yellow-600 group-hover:w-full transition-all duration-300"></span>
                  </Link>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 }}
            >
              <ConnectButton client={client} theme="dark" />
            </motion.div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative z-10 min-h-screen flex items-center justify-center px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={isLoaded ? "visible" : "hidden"}
          >
            {/* Badge */}
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center space-x-3 bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30 rounded-full px-6 py-3 mb-8"
              whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(245, 158, 11, 0.3)" }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
              <span className="text-yellow-400 font-semibold">Now Live on OneChain</span>
              <Star className="w-4 h-4 text-yellow-400 fill-current animate-spin" style={{ animationDuration: '3s' }} />
            </motion.div>

            {/* Main Title */}
            <motion.h1
              variants={itemVariants}
              className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight tracking-tight"
            >
              <motion.span
                className="bg-gradient-to-r from-white via-yellow-200 to-yellow-400 bg-clip-text text-transparent block"
                animate={{
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                }}
                transition={{ duration: 5, repeat: Infinity }}
                style={{ backgroundSize: "200% 200%" }}
              >
                OmniVault
              </motion.span>
              <motion.span
                className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent block text-3xl md:text-4xl lg:text-5xl font-semibold mt-1 tracking-wide"
                animate={{
                  backgroundPosition: ["100% 50%", "0% 50%", "100% 50%"],
                }}
                transition={{ duration: 5, repeat: Infinity, delay: 0.5 }}
                style={{ backgroundSize: "200% 200%" }}
              >
                Elite Exchange
              </motion.span>
            </motion.h1>

            {/* Description */}
            <motion.p
              variants={itemVariants}
              className="text-lg md:text-xl lg:text-2xl text-white/85 mb-12 max-w-4xl mx-auto leading-relaxed font-light"
            >
              The world's most <span className="text-yellow-400 font-semibold">exclusive</span> cross-chain marketplace for Real World Assets.
              <br className="hidden sm:block" />
              <span className="text-yellow-400 font-semibold">Tokenize, trade, and fractionalize</span> premium assets with
              <span className="text-blue-400 font-semibold"> institutional-grade security</span>.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6"
            >
              <Link href="/marketplace">
                <motion.button
                  className="group relative px-8 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl font-bold text-white text-lg shadow-2xl overflow-hidden"
                  whileHover={{
                    scale: 1.05,
                    boxShadow: "0 0 40px rgba(245, 158, 11, 0.5)"
                  }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <motion.span
                    className="relative z-10 flex items-center space-x-2"
                    animate={{ x: [0, 3, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <span>Launch Marketplace</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </motion.span>
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 to-yellow-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </motion.button>
              </Link>

              <motion.button
                className="group flex items-center space-x-3 px-8 py-4 border-2 border-white/20 rounded-xl backdrop-blur-sm hover:border-white/40 transition-all duration-300 text-lg font-semibold"
                whileHover={{
                  scale: 1.05,
                  backgroundColor: "rgba(255, 255, 255, 0.1)"
                }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-white/20 transition-colors duration-300">
                  <Play className="w-6 h-6 text-white ml-1" />
                </div>
                <span className="text-white font-bold">View Demo</span>
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, staggerChildren: 0.1 }}
            viewport={{ once: true }}
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{
                  y: -10,
                  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)"
                }}
              >
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 text-center hover:bg-white/10 transition-all duration-300 h-full">
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <stat.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent mb-3">
                    {stat.value}
                  </div>
                  <div className="text-white font-bold text-lg mb-2">{stat.label}</div>
                  <div className="text-sm text-green-400 font-medium mb-2">{stat.growth}</div>
                  <div className="text-xs text-white/60">{stat.description}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Asset Types Section */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <motion.h2
              className="text-5xl md:text-7xl font-bold mb-8"
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{ duration: 8, repeat: Infinity }}
            >
              <span className="bg-gradient-to-r from-white to-yellow-400 bg-clip-text text-transparent" style={{ backgroundSize: "200% 200%" }}>
                Premium Asset Classes
              </span>
            </motion.h2>
            <p className="text-2xl text-white/70 max-w-4xl mx-auto leading-relaxed">
              Trade a curated selection of tokenized real-world assets with full regulatory compliance
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {assetTypes.map((asset, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50, rotateY: -15 }}
                whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{
                  y: -15,
                  rotateY: 5,
                  boxShadow: "0 25px 50px rgba(0, 0, 0, 0.3)"
                }}
                style={{ transformStyle: "preserve-3d" }}
              >
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 group cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all duration-500 h-full">
                  <motion.div
                    className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${asset.gradient} mb-8 flex items-center justify-center shadow-lg`}
                    whileHover={{
                      scale: 1.1,
                      rotate: 360
                    }}
                    transition={{ duration: 0.6 }}
                  >
                    <asset.icon className="w-10 h-10 text-white" />
                  </motion.div>

                  <h3 className="text-2xl font-bold text-white mb-4">{asset.name}</h3>
                  <p className="text-white/70 text-base mb-6 leading-relaxed">{asset.description}</p>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">Total Value</span>
                      <span className="text-yellow-400 font-bold text-lg">{asset.totalValue}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">Assets</span>
                      <span className="text-white font-semibold">{asset.assets.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">Growth</span>
                      <span className="text-green-400 font-bold">{asset.growth}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl md:text-7xl font-bold mb-8">
              <span className="bg-gradient-to-r from-white to-blue-400 bg-clip-text text-transparent">
                Why Choose OmniVault?
              </span>
            </h2>
            <p className="text-2xl text-white/70 max-w-4xl mx-auto leading-relaxed">
              Built for institutions and retail investors with enterprise-grade infrastructure
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                viewport={{ once: true }}
                whileHover={{
                  scale: 1.02,
                  boxShadow: "0 25px 50px rgba(0, 0, 0, 0.3)"
                }}
              >
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-10 group hover:bg-white/10 hover:border-white/20 transition-all duration-500">
                  <div className="flex items-start space-x-8">
                    <motion.div
                      className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-lg flex-shrink-0`}
                      whileHover={{
                        scale: 1.1,
                        rotate: 360
                      }}
                      transition={{ duration: 0.6 }}
                    >
                      <feature.icon className="w-10 h-10 text-white" />
                    </motion.div>

                    <div className="flex-1">
                      <h3 className="text-3xl font-bold text-white mb-6">{feature.title}</h3>
                      <p className="text-white/70 leading-relaxed mb-6 text-lg">{feature.description}</p>
                      <motion.div
                        className="flex items-center text-yellow-400 font-bold group-hover:text-yellow-300 transition-colors cursor-pointer text-lg"
                        whileHover={{ x: 10 }}
                      >
                        <span>Learn more</span>
                        <ChevronRight className="w-6 h-6 ml-2" />
                      </motion.div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            className="backdrop-blur-xl bg-gradient-to-br from-yellow-500/10 to-purple-500/10 border border-yellow-500/30 rounded-3xl p-16"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            whileHover={{
              boxShadow: "0 30px 60px rgba(245, 158, 11, 0.2)"
            }}
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-8">
              <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                Ready to Start Trading?
              </span>
            </h2>
            <p className="text-2xl text-white/80 mb-12 max-w-3xl mx-auto leading-relaxed">
              Join thousands of investors already trading real-world assets on OmniVault.
              Get started in minutes with our intuitive platform.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center space-y-6 sm:space-y-0 sm:space-x-8">
              <Link href="/marketplace">
                <motion.button
                  className="px-12 py-6 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-2xl font-bold text-white text-xl shadow-2xl"
                  whileHover={{
                    scale: 1.05,
                    boxShadow: "0 0 40px rgba(245, 158, 11, 0.5)"
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  Launch Marketplace
                </motion.button>
              </Link>

              <motion.button
                className="px-12 py-6 border-2 border-white/20 rounded-2xl backdrop-blur-sm hover:border-white/40 transition-all text-white font-bold text-xl"
                whileHover={{
                  scale: 1.05,
                  backgroundColor: "rgba(255, 255, 255, 0.1)"
                }}
              >
                View Documentation
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-16 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            className="flex items-center justify-center space-x-4 mb-8"
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <span className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
              OmniVault
            </span>
          </motion.div>
          <p className="text-white/60 mb-6 text-lg">
            Built with ❤️ by the OmniVault Elite Team
          </p>
          <div className="flex items-center justify-center space-x-8 text-white/40">
            <span>© 2024 OmniVault. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div >
  );
}