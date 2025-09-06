const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
const TEST_USER_ID = 'test-user-123';
const TEST_TOKEN = 'test-jwt-token';

// Test configuration
const config = {
  headers: {
    'Authorization': `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json'
  }
};

async function testGamificationEndpoints() {
  console.log('🎮 Testing VPay Gamification API Endpoints...\n');

  try {
    // Test Quest endpoints
    console.log('📋 Testing Quest Endpoints:');
    
    // Generate daily quests
    try {
      const questResponse = await axios.post(`${BASE_URL}/api/quests/generate`, {
        userId: TEST_USER_ID,
        type: 'daily'
      }, config);
      console.log('✅ Quest generation:', questResponse.status === 200 ? 'SUCCESS' : 'FAILED');
    } catch (error) {
      console.log('❌ Quest generation: FAILED -', error.message);
    }

    // Get user quests
    try {
      const userQuestsResponse = await axios.get(`${BASE_URL}/api/quests/user/${TEST_USER_ID}`, config);
      console.log('✅ Get user quests:', userQuestsResponse.status === 200 ? 'SUCCESS' : 'FAILED');
    } catch (error) {
      console.log('❌ Get user quests: FAILED -', error.message);
    }

    // Test Streak endpoints
    console.log('\n🔥 Testing Streak Endpoints:');
    
    try {
      const streakResponse = await axios.post(`${BASE_URL}/api/streaks/update`, {
        userId: TEST_USER_ID,
        type: 'login'
      }, config);
      console.log('✅ Update streak:', streakResponse.status === 200 ? 'SUCCESS' : 'FAILED');
    } catch (error) {
      console.log('❌ Update streak: FAILED -', error.message);
    }

    try {
      const getStreaksResponse = await axios.get(`${BASE_URL}/api/streaks/user/${TEST_USER_ID}`, config);
      console.log('✅ Get user streaks:', getStreaksResponse.status === 200 ? 'SUCCESS' : 'FAILED');
    } catch (error) {
      console.log('❌ Get user streaks: FAILED -', error.message);
    }

    // Test Leaderboard endpoints
    console.log('\n🏆 Testing Leaderboard Endpoints:');
    
    try {
      const leaderboardResponse = await axios.get(`${BASE_URL}/api/leaderboards/points?period=weekly`, config);
      console.log('✅ Get leaderboard:', leaderboardResponse.status === 200 ? 'SUCCESS' : 'FAILED');
    } catch (error) {
      console.log('❌ Get leaderboard: FAILED -', error.message);
    }

    try {
      const dashboardResponse = await axios.get(`${BASE_URL}/api/leaderboards/dashboard`, config);
      console.log('✅ Get dashboard:', dashboardResponse.status === 200 ? 'SUCCESS' : 'FAILED');
    } catch (error) {
      console.log('❌ Get dashboard: FAILED -', error.message);
    }

    // Test NFT Badge endpoints
    console.log('\n🏅 Testing NFT Badge Endpoints:');
    
    try {
      const badgesResponse = await axios.get(`${BASE_URL}/api/nft-badges`, config);
      console.log('✅ Get badges:', badgesResponse.status === 200 ? 'SUCCESS' : 'FAILED');
    } catch (error) {
      console.log('❌ Get badges: FAILED -', error.message);
    }

    try {
      const userBadgesResponse = await axios.get(`${BASE_URL}/api/nft-badges/user/${TEST_USER_ID}`, config);
      console.log('✅ Get user badges:', userBadgesResponse.status === 200 ? 'SUCCESS' : 'FAILED');
    } catch (error) {
      console.log('❌ Get user badges: FAILED -', error.message);
    }

    console.log('\n🎯 Gamification API Test Complete!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test server connectivity first
async function testServerConnection() {
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server connection: SUCCESS');
    return true;
  } catch (error) {
    console.log('❌ Server connection: FAILED -', error.message);
    console.log('💡 Make sure the backend server is running on port 3001');
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting VPay Gamification Tests...\n');
  
  const serverOnline = await testServerConnection();
  if (serverOnline) {
    await testGamificationEndpoints();
  }
}

// Run tests
runTests();
