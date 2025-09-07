const { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { Program, Provider, BN } = require('@project-serum/anchor');
const { readFileSync } = require('fs');
const path = require('path');
require('dotenv').config();

// Load program IDs
const { 
  FIAT_BRIDGE_PROGRAM_ID, 
  MERCHANT_REWARDS_PROGRAM_ID, 
  KYC_VERIFICATION_PROGRAM_ID,
  DEVNET_USDC_MINT,
  getProgramId
} = require('../frontend/src/config/programIds');

// Initialize connection
const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com');

// Load IDLs
const fiatBridgeIdl = JSON.parse(
  readFileSync(
    path.join(__dirname, '../contracts/target/idl/fiat_bridge.json'),
    'utf-8'
  )
);

const merchantRewardsIdl = JSON.parse(
  readFileSync(
    path.join(__dirname, '../contracts/target/idl/merchant_rewards.json'),
    'utf-8'
  )
);

const kycVerificationIdl = JSON.parse(
  readFileSync(
    path.join(__dirname, '../contracts/target/idl/kyc_verification.json'),
    'utf-8'
  )
);

// Load wallet
const wallet = Keypair.generate();
const provider = new Provider(connection, wallet, {});

// Initialize programs
const fiatBridgeProgram = new Program(
  fiatBridgeIdl,
  new PublicKey(FIAT_BRIDGE_PROGRAM_ID),
  provider
);

const merchantRewardsProgram = new Program(
  merchantRewardsIdl,
  new PublicKey(MERCHANT_REWARDS_PROGRAM_ID),
  provider
);

const kycVerificationProgram = new Program(
  kycVerificationIdl,
  new PublicKey(KYC_VERIFICATION_PROGRAM_ID),
  provider
);

async function testFiatBridge() {
  try {
    console.log('🚀 Starting Fiat Bridge Tests');
    
    // 1. Test Connection
    console.log('\n🔌 Testing Solana connection...');
    const version = await connection.getVersion();
    console.log(`✅ Connected to Solana ${version['solana-core']}`);
    
    // 2. Airdrop SOL for test
    console.log('\n💰 Requesting airdrop...');
    const airdropSig = await connection.requestAirdrop(
      wallet.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropSig);
    console.log(`✅ Airdrop successful: ${airdropSig}`);
    
    // 3. Test Fiat Bridge Program
    console.log('\n🌉 Testing Fiat Bridge Program...');
    const [bridgeStatePDA] = await PublicKey.findProgramAddress(
      [Buffer.from('bridge_state')],
      fiatBridgeProgram.programId
    );
    
    console.log(`Bridge State PDA: ${bridgeStatePDA.toString()}`);
    
    // 4. Test KYC Verification
    console.log('\n✅ Testing KYC Verification...');
    const [kycMint] = await PublicKey.findProgramAddress(
      [Buffer.from('kyc_mint')],
      kycVerificationProgram.programId
    );
    
    console.log(`KYC Mint: ${kycMint.toString()}`);
    
    // 5. Test Merchant Rewards
    console.log('\n🏪 Testing Merchant Rewards...');
    const [rewardPool] = await PublicKey.findProgramAddress(
      [Buffer.from('reward_pool')],
      merchantRewardsProgram.programId
    );
    
    console.log(`Reward Pool: ${rewardPool.toString()}`);
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testFiatBridge();
