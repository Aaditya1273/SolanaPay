const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting SolanaPay contracts deployment...");
  
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
  
  // Deploy SolanaPayToken (required for SolanaPayEscrow and SolanaPayRewards)
  console.log("\n📄 Deploying SolanaPayToken...");
  const SolanaPayToken = await ethers.getContractFactory("SolanaPayToken");
  const vrcToken = await SolanaPayToken.deploy(deployer.address);
  await vrcToken.waitForDeployment();
  const vrcTokenAddress = await vrcToken.getAddress();
  console.log("✅ SolanaPayToken deployed to:", vrcTokenAddress);
  
  // Deploy SolanaPayPayments
  console.log("\n📄 Deploying SolanaPayPayments...");
  const SolanaPayPayments = await ethers.getContractFactory("SolanaPayPayments");
  const payments = await SolanaPayPayments.deploy(deployer.address);
  await payments.waitForDeployment();
  const paymentsAddress = await payments.getAddress();
  console.log("✅ SolanaPayPayments deployed to:", paymentsAddress);
  
  // Deploy SolanaPayEscrow
  console.log("\n📄 Deploying SolanaPayEscrow...");
  const SolanaPayEscrow = await ethers.getContractFactory("SolanaPayEscrow");
  const escrow = await SolanaPayEscrow.deploy(
    vrcTokenAddress,
    deployer.address, // Fee recipient
    deployer.address  // Initial owner
  );
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log("✅ SolanaPayEscrow deployed to:", escrowAddress);
  
  // Deploy SolanaPayRewards
  console.log("\n📄 Deploying SolanaPayRewards...");
  const SolanaPayRewards = await ethers.getContractFactory("SolanaPayRewards");
  const rewards = await SolanaPayRewards.deploy(vrcTokenAddress, deployer.address);
  await rewards.waitForDeployment();
  const rewardsAddress = await rewards.getAddress();
  console.log("✅ SolanaPayRewards deployed to:", rewardsAddress);
  
  // Print deployed contract addresses
  console.log("\n📋 Deployed Contract Addresses:");
  console.log("================================");
  console.log("SolanaPayPayments:", paymentsAddress);
  console.log("SolanaPayEscrow:", escrowAddress);
  console.log("SolanaPayRewards:", rewardsAddress);
  console.log("================================");
  
  console.log("\n🎉 SolanaPay contracts deployed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
