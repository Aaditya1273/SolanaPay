const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting OmniFlow RWA Marketplace deployment...");
  
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("📋 Deployment Details:");
  console.log("- Network:", network.name, `(Chain ID: ${network.chainId})`);
  console.log("- Deployer:", deployer.address);
  console.log("- Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  
  const deployedContracts = {};
  
  try {
    // 1. Deploy RWARegistry (Upgradeable)
    console.log("\n📝 Deploying RWARegistry...");
    const RWARegistry = await ethers.getContractFactory("RWARegistry");
    const rwaRegistry = await upgrades.deployProxy(
      RWARegistry,
      [deployer.address],
      { initializer: "initialize" }
    );
    await rwaRegistry.waitForDeployment();
    const registryAddress = await rwaRegistry.getAddress();
    console.log("✅ RWARegistry deployed to:", registryAddress);
    deployedContracts.RWARegistry = registryAddress;

    // 2. Deploy RWAToken (Upgradeable)
    console.log("\n🎨 Deploying RWAToken...");
    const RWAToken = await ethers.getContractFactory("RWAToken");
    const rwaToken = await upgrades.deployProxy(
      RWAToken,
      [
        "OmniFlow RWA Token",
        "ORWA",
        registryAddress,
        deployer.address,
        "https://api.omniflow.io/metadata/"
      ],
      { initializer: "initialize" }
    );
    await rwaToken.waitForDeployment();
    const tokenAddress = await rwaToken.getAddress();
    console.log("✅ RWAToken deployed to:", tokenAddress);
    deployedContracts.RWAToken = tokenAddress;

    // 3. Deploy CrossChainBridge (Upgradeable)
    console.log("\n🌉 Deploying CrossChainBridge...");
    const CrossChainBridge = await ethers.getContractFactory("CrossChainBridge");
    const bridge = await upgrades.deployProxy(
      CrossChainBridge,
      [registryAddress, deployer.address, deployer.address],
      { initializer: "initialize" }
    );
    await bridge.waitForDeployment();
    const bridgeAddress = await bridge.getAddress();
    console.log("✅ CrossChainBridge deployed to:", bridgeAddress);
    deployedContracts.CrossChainBridge = bridgeAddress;

    // 4. Deploy RWAMarketplace (Upgradeable)
    console.log("\n🏪 Deploying RWAMarketplace...");
    const RWAMarketplace = await ethers.getContractFactory("RWAMarketplace");
    const marketplace = await upgrades.deployProxy(
      RWAMarketplace,
      [registryAddress, deployer.address, deployer.address, 250], // 2.5% platform fee
      { initializer: "initialize" }
    );
    await marketplace.waitForDeployment();
    const marketplaceAddress = await marketplace.getAddress();
    console.log("✅ RWAMarketplace deployed to:", marketplaceAddress);
    deployedContracts.RWAMarketplace = marketplaceAddress;

    // 5. Configure contracts
    console.log("\n⚙️ Configuring contracts...");
    
    // Add bridge as authorized in registry
    console.log("- Adding bridge as authorized...");
    await rwaRegistry.addAuthorizedBridge(bridgeAddress);
    
    // Add marketplace as authorized minter for RWAToken
    console.log("- Adding marketplace as authorized minter...");
    await rwaToken.addAuthorizedMinter(marketplaceAddress);
    
    // Add deployer as verifier for all asset types
    console.log("- Adding deployer as verifier for all asset types...");
    for (let i = 0; i < 8; i++) {
      await rwaRegistry.addVerifier(deployer.address, i);
    }
    
    // Set supported tokens in bridge
    console.log("- Setting supported tokens in bridge...");
    await bridge.setSupportedToken(Number(network.chainId), tokenAddress, true);
    
    // Set accepted payment tokens in marketplace
    console.log("- Setting accepted payment tokens in marketplace...");
    await marketplace.setAcceptedPaymentToken(ethers.ZeroAddress, true); // Native token
    
    console.log("✅ Configuration completed!");

    // 6. Deploy sample fractional token for demo
    console.log("\n🔢 Deploying sample RWAFractional token...");
    const RWAFractional = await ethers.getContractFactory("RWAFractional");
    const fractional = await upgrades.deployProxy(
      RWAFractional,
      [
        "Sample Property Fractions",
        "SPF",
        1, // assetId
        1, // originalTokenId
        tokenAddress, // originalNFTContract
        ethers.parseEther("1000000"), // 1M fractions
        deployer.address, // fractionalizer
        registryAddress,
        deployer.address
      ],
      { initializer: "initialize" }
    );
    await fractional.waitForDeployment();
    const fractionalAddress = await fractional.getAddress();
    console.log("✅ Sample RWAFractional deployed to:", fractionalAddress);
    deployedContracts.SampleRWAFractional = fractionalAddress;

    // 7. Register sample asset
    console.log("\n📋 Registering sample asset...");
    await rwaRegistry.registerAsset(
      0, // REAL_ESTATE
      tokenAddress,
      Number(network.chainId),
      "https://api.omniflow.io/metadata/sample-property.json",
      ethers.parseEther("1000000"), // $1M value
      1, // 1 NFT
      1 // KYC_VERIFIED compliance
    );
    console.log("✅ Sample asset registered!");

    // 8. Save deployment info
    const deploymentInfo = {
      network: {
        name: network.name,
        chainId: Number(network.chainId),
        deployer: deployer.address
      },
      contracts: deployedContracts,
      timestamp: new Date().toISOString(),
      blockNumber: await ethers.provider.getBlockNumber()
    };

    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentFile = path.join(deploymentsDir, `${network.chainId}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    
    console.log("\n📄 Deployment info saved to:", deploymentFile);

    // 9. Generate frontend config
    const frontendConfig = {
      chainId: Number(network.chainId),
      contracts: {
        RWARegistry: {
          address: registryAddress,
          abi: "RWARegistry"
        },
        RWAToken: {
          address: tokenAddress,
          abi: "RWAToken"
        },
        CrossChainBridge: {
          address: bridgeAddress,
          abi: "CrossChainBridge"
        },
        RWAMarketplace: {
          address: marketplaceAddress,
          abi: "RWAMarketplace"
        },
        SampleRWAFractional: {
          address: fractionalAddress,
          abi: "RWAFractional"
        }
      }
    };

    const configDir = path.join(__dirname, "..", "src", "config");
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    const configFile = path.join(configDir, `contracts-${network.chainId}.json`);
    fs.writeFileSync(configFile, JSON.stringify(frontendConfig, null, 2));
    
    console.log("📄 Frontend config saved to:", configFile);

    console.log("\n🎉 OmniFlow RWA Marketplace deployment completed successfully!");
    console.log("\n📋 Contract Addresses:");
    Object.entries(deployedContracts).forEach(([name, address]) => {
      console.log(`- ${name}: ${address}`);
    });

    console.log("\n🔗 Next Steps:");
    console.log("1. Verify contracts on block explorer");
    console.log("2. Set up frontend environment variables");
    console.log("3. Configure cross-chain bridge relayers");
    console.log("4. Add more asset verifiers");
    console.log("5. Deploy to other supported chains");

    // OneChain specific setup
    if (network.chainId === 1001n || network.chainId === 1000n) {
      console.log("\n🔗 OneChain Setup:");
      console.log("- Network: OneChain", network.chainId === 1001n ? "Testnet" : "Mainnet");
      console.log("- Native Token: OCT");
      console.log("- Faucet (Testnet): https://faucet-testnet.onelabs.cc:443");
      console.log("- Explorer: Check OneChain documentation for explorer URL");
    }

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
