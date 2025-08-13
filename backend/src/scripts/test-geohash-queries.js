/**
 * Test script for geohash-based location queries
 */

const { db } = require('../services/firebase');
const BusinessService = require('../services/business.service');
const geofire = require('geofire-common');

async function testGeohashQueries() {
  console.log('🔍 Testing geohash-based location queries...\n');

  const businessService = new BusinessService();

  // Test coordinates from your response
  const testLat = 40.043701196725735;
  const testLng = 64.39324390143156;
  const radiusKm = 10;

  console.log(`📍 Test center: ${testLat}, ${testLng}`);
  console.log(`🔄 Search radius: ${radiusKm}km\n`);

  try {
    // First, let's check what businesses exist in the database
    console.log('📊 Checking existing businesses...');
    const allBusinesses = await db.collection('businesses').limit(5).get();
    
    allBusinesses.docs.forEach(doc => {
      const data = doc.data();
      console.log(`Business: ${data.businessName || data.name || doc.id}`);
      console.log(`  - ID: ${doc.id}`);
      console.log(`  - Geohash: ${data.geohash || 'MISSING'}`);
      console.log(`  - Location: ${JSON.stringify(data.businessLocation || data.geoLocation || 'MISSING')}`);
      console.log('');
    });

    // Test the optimized geohash query
    console.log('🚀 Testing optimized geohash query...');
    const result = await businessService.getBusinessesNearLocation(
      testLat, testLng, radiusKm, 
      { status: 'pending' }, // Using status from your response
      { page: 1, limit: 10 }
    );

    if (result.success) {
      console.log(`✅ Query successful! Found ${result.data.length} businesses`);
      console.log('📋 Pagination:', result.pagination);
      
      result.data.forEach((business, index) => {
        console.log(`${index + 1}. ${business.businessName || business.name}`);
        console.log(`   Distance: ${business.distance?.toFixed(2)}km`);
        console.log(`   Geohash: ${business.geohash}`);
        console.log('');
      });
    } else {
      console.log('❌ Query failed:', result.error);
    }

    // Test geohash bounds generation
    console.log('🔢 Testing geohash bounds generation...');
    const bounds = geofire.geohashQueryBounds([testLat, testLng], radiusKm * 1000);
    console.log('Geohash query bounds:');
    bounds.forEach((bound, index) => {
      console.log(`  ${index + 1}. ${bound[0]} to ${bound[1]}`);
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testGeohashQueries()
    .then(() => {
      console.log('\n✨ Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testGeohashQueries };
