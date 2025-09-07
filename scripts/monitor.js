const { Connection, PublicKey } = require('@solana/web3.js');
const { Program } = require('@project-serum/anchor');
const { readFileSync } = require('fs');
const path = require('path');
const WebSocket = require('ws');
const { notify } = require('./notifications');
require('dotenv').config();

// Load program IDs
const { 
  FIAT_BRIDGE_PROGRAM_ID,
  MERCHANT_REWARDS_PROGRAM_ID,
  KYC_VERIFICATION_PROGRAM_ID,
  getProgramId
} = require('../frontend/src/config/programIds');

// Initialize connection
const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com');

// Load IDLs
const loadIdl = (name) => {
  try {
    return JSON.parse(
      readFileSync(
        path.join(__dirname, `../contracts/target/idl/${name}.json`),
        'utf-8'
      )
    );
  } catch (error) {
    console.error(`Failed to load IDL for ${name}:`, error);
    return null;
  }
};

const fiatBridgeIdl = loadIdl('fiat_bridge');
const merchantRewardsIdl = loadIdl('merchant_rewards');
const kycVerificationIdl = loadIdl('kyc_verification');

// Initialize programs
const fiatBridgeProgram = new Program(
  fiatBridgeIdl,
  new PublicKey(FIAT_BRIDGE_PROGRAM_ID),
  { connection }
);

const merchantRewardsProgram = new Program(
  merchantRewardsIdl,
  new PublicKey(MERCHANT_REWARDS_PROGRAM_ID),
  { connection }
);

const kycVerificationProgram = new Program(
  kycVerificationIdl,
  new PublicKey(KYC_VERIFICATION_PROGRAM_ID),
  { connection }
);

class TransactionMonitor {
  constructor() {
    this.lastProcessedSlot = 0;
    this.programs = [
      { name: 'Fiat Bridge', program: fiatBridgeProgram },
      { name: 'Merchant Rewards', program: merchantRewardsProgram },
      { name: 'KYC Verification', program: kycVerificationProgram }
    ];
  }

  async start() {
    console.log('🚀 Starting SolanaPay Monitor');
    
    // Initial slot
    this.lastProcessedSlot = await connection.getSlot();
    
    // Start WebSocket connection for real-time updates
    this.setupWebSocket();
    
    // Initial historical scan
    this.scanHistoricalTransactions();
    
    // Periodic full scan
    setInterval(() => this.scanHistoricalTransactions(), 5 * 60 * 1000); // Every 5 minutes
  }
  
  async setupWebSocket() {
    const wsUrl = connection._rpcEndpoint.replace('http', 'ws');
    const ws = new WebSocket(wsUrl);
    
    ws.on('open', () => {
      console.log('🔌 WebSocket connected');
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'slotSubscribe',
        params: []
      }));
    });
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data);
        if (message.method === 'slotNotification') {
          const newSlot = message.params.result;
          await this.processNewSlots(newSlot);
          this.lastProcessedSlot = newSlot;
        }
      } catch (error) {
        console.error('WebSocket error:', error);
      }
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      // Attempt to reconnect after a delay
      setTimeout(() => this.setupWebSocket(), 5000);
    });
    
    ws.on('close', () => {
      console.log('WebSocket disconnected, reconnecting...');
      setTimeout(() => this.setupWebSocket(), 5000);
    });
  }
  
  async scanHistoricalTransactions() {
    console.log('🔍 Scanning historical transactions...');
    const currentSlot = await connection.getSlot();
    await this.processNewSlots(currentSlot);
  }
  
  async processNewSlots(newSlot) {
    if (newSlot <= this.lastProcessedSlot) return;
    
    console.log(`🔄 Processing slots ${this.lastProcessedSlot + 1} to ${newSlot}`);
    
    // Process each program's transactions
    for (const { name, program } of this.programs) {
      try {
        const signatures = await connection.getProgramAccounts(program.programId, {
          filters: [
            {
              dataSize: 165, // Adjust based on your account size
            },
          ],
          commitment: 'confirmed',
        });
        
        console.log(`Found ${signatures.length} ${name} transactions`);
        
        // Process each transaction
        for (const { pubkey, account } of signatures) {
          await this.processAccount(name, program, pubkey, account);
        }
      } catch (error) {
        console.error(`Error processing ${name} transactions:`, error);
      }
    }
    
    this.lastProcessedSlot = newSlot;
  }
  
  async processAccount(programName, program, pubkey, account) {
    try {
      // Decode the account data based on program
      let accountData;
      
      if (programName === 'Fiat Bridge') {
        accountData = fiatBridgeProgram.account.bridgeState.fetch(pubkey);
      } else if (programName === 'Merchant Rewards') {
        accountData = merchantRewardsProgram.account.rewardPool.fetch(pubkey);
      } else if (programName === 'KYC Verification') {
        accountData = kycVerificationProgram.account.kycAccount.fetch(pubkey);
      }
      
      // Process the account data
      console.log(`\n📊 ${programName} Account: ${pubkey.toString()}`);
      console.log(JSON.stringify(accountData, null, 2));
      
      // Here you can add specific monitoring logic for each program
      // For example, check for unusual activity, send alerts, etc.
      
    } catch (error) {
      console.error(`Error processing ${programName} account ${pubkey.toString()}:`, error);
    }
  }
}

// Start the monitor
const monitor = new TransactionMonitor();
monitor.start().catch(console.error);

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping monitor...');
  process.exit(0);
});
