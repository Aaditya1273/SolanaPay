const { run } = require("hardhat");

async function main() {
  console.log("🔍 Starting contract verification...");
  
  // Read deployment info
  const fs = require('fs');
  const path = require('path');
  
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  const files = fs.readdirSync(deploymentsDir);
  
  if (files.length === 0) {
    console.log("❌ No deployment files found. Please deploy contracts first.");
    return;
  }
  
  // Use the latest deployment file
  const latestFile = files.sort().pop();
  const deploymentPath = path.join(deploymentsDir, latestFile);
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  
  console.log(`📄 Using deployment: ${latestFile}`);
  console.log(`🌐 Network: ${deployment.network} (${deployment.chainId})`);
  
  try {
    // Verify SolanaPayToken
    console.log("\n🔍 Verifying SolanaPayToken...");
    await run("verify:verify", {
      address: deployment.contracts.SolanaPayToken,
      constructorArguments: [deployment.deployer]
    });
    console.log("✅ SolanaPayToken verified");
    
    // Verify SolanaPayPayments
    console.log("\n🔍 Verifying SolanaPayPayments...");
    await run("verify:verify", {
      address: deployment.contracts.SolanaPayPayments,
      constructorArguments: [deployment.deployer]
    });
    console.log("✅ SolanaPayPayments verified");
    
    // Verify SolanaPayEscrow
    console.log("\n🔍 Verifying SolanaPayEscrow...");
    await run("verify:verify", {
      address: deployment.contracts.SolanaPayEscrow,
      constructorArguments: [
        deployment.contracts.SolanaPayToken,
        deployment.deployer,
        deployment.deployer
      ]
    });
    console.log("✅ SolanaPayEscrow verified");
    
    // Verify SolanaPayRewards
    console.log("\n🔍 Verifying SolanaPayRewards...");
    await run("verify:verify", {
      address: deployment.contracts.SolanaPayRewards,
      constructorArguments: [
        deployment.contracts.SolanaPayToken,
        deployment.deployer
      ]
    });
    console.log("✅ SolanaPayRewards verified");
    
    console.log("\n🎉 All contracts verified successfully!");
    
  } catch (error) {
    console.error("❌ Verification failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
