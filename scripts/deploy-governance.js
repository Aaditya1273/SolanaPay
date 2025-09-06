const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("🚀 Deploying RWA Fractional Ownership & Governance System...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy RWAFractionalOwnership (ERC-1155)
  console.log("\n📜 Deploying RWAFractionalOwnership...");
  const RWAFractionalOwnership = await ethers.getContractFactory("RWAFractionalOwnership");
  const fractionalOwnership = await upgrades.deployProxy(
    RWAFractionalOwnership,
    [
      deployer.address, // initialOwner
      "https://api.omniflow.com/metadata/{id}", // baseURI
      deployer.address, // feeRecipient
    ],
    { initializer: "initialize" }
  );
  await fractionalOwnership.deployed();
  console.log("✅ RWAFractionalOwnership deployed to:", fractionalOwnership.address);

  // Deploy TimelockController
  console.log("\n⏰ Deploying RWATimelockController...");
  const RWATimelockController = await ethers.getContractFactory("RWATimelockController");
  const timelock = await upgrades.deployProxy(
    RWATimelockController,
    [
      86400, // 1 day minimum delay
      [deployer.address], // proposers
      [deployer.address], // executors
      deployer.address, // admin
      deployer.address, // initialOwner
    ],
    { initializer: "initialize" }
  );
  await timelock.deployed();
  console.log("✅ RWATimelockController deployed to:", timelock.address);

  // Deploy RWAGovernance
  console.log("\n🏛️ Deploying RWAGovernance...");
  const RWAGovernance = await ethers.getContractFactory("RWAGovernance");
  const governance = await upgrades.deployProxy(
    RWAGovernance,
    [
      fractionalOwnership.address, // fractionalOwnership
      timelock.address, // timelock
      deployer.address, // initialOwner
    ],
    { initializer: "initialize" }
  );
  await governance.deployed();
  console.log("✅ RWAGovernance deployed to:", governance.address);

  // Configure governance roles
  console.log("\n🔧 Configuring governance roles...");
  
  // Grant proposer role to governance contract
  const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
  const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
  const TIMELOCK_ADMIN_ROLE = await timelock.TIMELOCK_ADMIN_ROLE();
  
  await timelock.grantRole(PROPOSER_ROLE, governance.address);
  console.log("✅ Granted PROPOSER_ROLE to governance contract");
  
  await timelock.grantRole(EXECUTOR_ROLE, governance.address);
  console.log("✅ Granted EXECUTOR_ROLE to governance contract");

  // Set governance contract in fractional ownership
  console.log("\n🔗 Linking contracts...");
  
  // Create sample assets for demonstration
  console.log("\n🏢 Creating sample RWA assets...");
  
  const assets = [
    {
      name: "Manhattan Office Complex",
      description: "Premium commercial real estate in Manhattan's financial district",
      assetType: "Real Estate",
      location: "New York, NY",
      totalSupply: 10000,
      totalValue: ethers.utils.parseEther("5000"), // 5000 ETH
      metadataURI: "https://api.omniflow.com/assets/1/metadata",
    },
    {
      name: "Carbon Credit Portfolio A",
      description: "Diversified portfolio of verified carbon credits",
      assetType: "Carbon Credits",
      location: "Global",
      totalSupply: 5000,
      totalValue: ethers.utils.parseEther("750"), // 750 ETH
      metadataURI: "https://api.omniflow.com/assets/2/metadata",
    },
    {
      name: "Gold Reserve Fund",
      description: "Physical gold reserves with full insurance coverage",
      assetType: "Precious Metals",
      location: "London, UK",
      totalSupply: 8000,
      totalValue: ethers.utils.parseEther("2000"), // 2000 ETH
      metadataURI: "https://api.omniflow.com/assets/3/metadata",
    },
  ];

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    const tx = await fractionalOwnership.createAsset(
      asset.name,
      asset.description,
      asset.assetType,
      asset.location,
      asset.totalSupply,
      asset.totalValue,
      asset.metadataURI
    );
    await tx.wait();
    
    const assetId = i + 1;
    console.log(`✅ Created asset ${assetId}: ${asset.name}`);
    
    // Set governance contract for each asset
    await fractionalOwnership.setGovernanceContract(assetId, governance.address);
    console.log(`🔗 Linked governance contract to asset ${assetId}`);
  }

  // Configure default governance parameters
  console.log("\n⚙️ Setting default governance parameters...");
  await governance.setDefaultParameters(
    100, // defaultMinProposalThreshold (100 shares)
    1, // defaultVotingDelay (1 block)
    50400, // defaultVotingPeriod (~1 week)
    400 // defaultQuorumFraction (4%)
  );
  console.log("✅ Default governance parameters set");

  // Set platform fee (2.5%)
  await fractionalOwnership.setPlatformFee(250);
  console.log("✅ Platform fee set to 2.5%");

  // Deploy ChainlinkPriceManager for price feeds
  console.log("\n📊 Deploying ChainlinkPriceManager...");
  const ChainlinkPriceManager = await ethers.getContractFactory("ChainlinkPriceManager");
  const priceManager = await upgrades.deployProxy(
    ChainlinkPriceManager,
    [deployer.address], // initialOwner
    { initializer: "initialize" }
  );
  await priceManager.deployed();
  console.log("✅ ChainlinkPriceManager deployed to:", priceManager.address);

  console.log("\n🎉 Deployment Summary:");
  console.log("========================");
  console.log("RWAFractionalOwnership:", fractionalOwnership.address);
  console.log("RWATimelockController:", timelock.address);
  console.log("RWAGovernance:", governance.address);
  console.log("ChainlinkPriceManager:", priceManager.address);
  console.log("========================");

  // Save deployment addresses
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      RWAFractionalOwnership: fractionalOwnership.address,
      RWATimelockController: timelock.address,
      RWAGovernance: governance.address,
      ChainlinkPriceManager: priceManager.address,
    },
    assets: assets.map((asset, index) => ({
      id: index + 1,
      name: asset.name,
      assetType: asset.assetType,
      totalSupply: asset.totalSupply,
      totalValue: asset.totalValue.toString(),
    })),
  };

  const fs = require("fs");
  const path = require("path");
  
  // Ensure deployments directory exists
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  // Save deployment info
  fs.writeFileSync(
    path.join(deploymentsDir, `governance-${hre.network.name}.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log(`\n📁 Deployment info saved to deployments/governance-${hre.network.name}.json`);

  // Verify contracts if on a public network
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n🔍 Verifying contracts...");
    
    try {
      await hre.run("verify:verify", {
        address: fractionalOwnership.address,
        constructorArguments: [],
      });
      console.log("✅ RWAFractionalOwnership verified");
    } catch (error) {
      console.log("❌ RWAFractionalOwnership verification failed:", error.message);
    }

    try {
      await hre.run("verify:verify", {
        address: timelock.address,
        constructorArguments: [],
      });
      console.log("✅ RWATimelockController verified");
    } catch (error) {
      console.log("❌ RWATimelockController verification failed:", error.message);
    }

    try {
      await hre.run("verify:verify", {
        address: governance.address,
        constructorArguments: [],
      });
      console.log("✅ RWAGovernance verified");
    } catch (error) {
      console.log("❌ RWAGovernance verification failed:", error.message);
    }

    try {
      await hre.run("verify:verify", {
        address: priceManager.address,
        constructorArguments: [],
      });
      console.log("✅ ChainlinkPriceManager verified");
    } catch (error) {
      console.log("❌ ChainlinkPriceManager verification failed:", error.message);
    }
  }

  console.log("\n🚀 Fractional Ownership & Governance System deployed successfully!");
  console.log("\n📋 Next Steps:");
  console.log("1. Update frontend configuration with new contract addresses");
  console.log("2. Configure Chainlink price feeds for asset types");
  console.log("3. Set up asset managers and governance parameters");
  console.log("4. Test governance proposals and voting mechanisms");
  console.log("5. Configure dividend distribution schedules");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
