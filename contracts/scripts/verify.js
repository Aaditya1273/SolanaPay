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
    // Verify VPayToken
    console.log("\n🔍 Verifying VPayToken...");
    await run("verify:verify", {
      address: deployment.contracts.VPayToken,
      constructorArguments: [deployment.deployer]
    });
    console.log("✅ VPayToken verified");
    
    // Verify VPayPayments
    console.log("\n🔍 Verifying VPayPayments...");
    await run("verify:verify", {
      address: deployment.contracts.VPayPayments,
      constructorArguments: [deployment.deployer]
    });
    console.log("✅ VPayPayments verified");
    
    // Verify VPayEscrow
    console.log("\n🔍 Verifying VPayEscrow...");
    await run("verify:verify", {
      address: deployment.contracts.VPayEscrow,
      constructorArguments: [
        deployment.contracts.VPayToken,
        deployment.deployer,
        deployment.deployer
      ]
    });
    console.log("✅ VPayEscrow verified");
    
    // Verify VPayRewards
    console.log("\n🔍 Verifying VPayRewards...");
    await run("verify:verify", {
      address: deployment.contracts.VPayRewards,
      constructorArguments: [
        deployment.contracts.VPayToken,
        deployment.deployer
      ]
    });
    console.log("✅ VPayRewards verified");
    
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
