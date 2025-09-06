const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting VPay contracts deployment...");
  
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
  
  // Deploy VPayToken (required for VPayEscrow and VPayRewards)
  console.log("\n📄 Deploying VPayToken...");
  const VPayToken = await ethers.getContractFactory("VPayToken");
  const vrcToken = await VPayToken.deploy(deployer.address);
  await vrcToken.waitForDeployment();
  const vrcTokenAddress = await vrcToken.getAddress();
  console.log("✅ VPayToken deployed to:", vrcTokenAddress);
  
  // Deploy VPayPayments
  console.log("\n📄 Deploying VPayPayments...");
  const VPayPayments = await ethers.getContractFactory("VPayPayments");
  const payments = await VPayPayments.deploy(deployer.address);
  await payments.waitForDeployment();
  const paymentsAddress = await payments.getAddress();
  console.log("✅ VPayPayments deployed to:", paymentsAddress);
  
  // Deploy VPayEscrow
  console.log("\n📄 Deploying VPayEscrow...");
  const VPayEscrow = await ethers.getContractFactory("VPayEscrow");
  const escrow = await VPayEscrow.deploy(
    vrcTokenAddress,
    deployer.address, // Fee recipient
    deployer.address  // Initial owner
  );
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log("✅ VPayEscrow deployed to:", escrowAddress);
  
  // Deploy VPayRewards
  console.log("\n📄 Deploying VPayRewards...");
  const VPayRewards = await ethers.getContractFactory("VPayRewards");
  const rewards = await VPayRewards.deploy(vrcTokenAddress, deployer.address);
  await rewards.waitForDeployment();
  const rewardsAddress = await rewards.getAddress();
  console.log("✅ VPayRewards deployed to:", rewardsAddress);
  
  // Print deployed contract addresses
  console.log("\n📋 Deployed Contract Addresses:");
  console.log("================================");
  console.log("VPayPayments:", paymentsAddress);
  console.log("VPayEscrow:", escrowAddress);
  console.log("VPayRewards:", rewardsAddress);
  console.log("================================");
  
  console.log("\n🎉 VPay contracts deployed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
