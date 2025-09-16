const axios = require('axios');

async function testHealth() {
  try {
    console.log('🏥 Testing Server Health...');
    
    const response = await axios.get('http://localhost:3000/health', {
      timeout: 5000
    });
    
    console.log(`✅ Server is running! Status: ${response.status}`);
    console.log('Response:', response.data);
    
    // Now try the API endpoint
    console.log('\n🚀 Testing Summary API...');
    const apiResponse = await axios.get('http://localhost:3000/api/l1-summary-data?from=2025-04-01&to=2025-04-30', {
      timeout: 10000
    });
    
    console.log(`✅ API Response: ${apiResponse.status}`);
    console.log('Data:', JSON.stringify(apiResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testHealth();
