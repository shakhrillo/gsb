/**
 * Test script for location-based business queries
 * 
 * This script demonstrates how to:
 * 1. Use the new getBusinessesNearLocation method
 * 2. Migrate existing location data to GeoPoint format
 * 3. Test different coordinate formats
 */

const businessService = require('../services/business.service');

async function testLocationQueries() {
  console.log('=== Testing Location-Based Business Queries ===\n');

  // Test coordinates (Tashkent, Uzbekistan area)
  const testLat = 40.02422651108488;
  const testLng = 64.51420448720457;
  const testRadius = 20; // 20km radius

  try {
    console.log('1. Testing getBusinessesNearLocation method...');
    console.log(`   Center: ${testLat}, ${testLng}`);
    console.log(`   Radius: ${testRadius}km\n`);

    const nearbyResult = await businessService.getBusinessesNearLocation(
      testLat, 
      testLng, 
      testRadius,
      { status: 'active' }, // Only active businesses
      { page: 1, limit: 10 }
    );

    if (nearbyResult.success) {
      console.log(`   ✅ Found ${nearbyResult.data.length} businesses nearby`);
      console.log(`   📄 Total items: ${nearbyResult.pagination.totalItems}`);
      
      if (nearbyResult.data.length > 0) {
        console.log('\n   📍 Sample businesses with distances:');
        nearbyResult.data.slice(0, 3).forEach((business, index) => {
          const distance = business.distance ? `${business.distance.toFixed(2)}km` : 'N/A';
          console.log(`      ${index + 1}. ${business.businessName || business.name || 'Unnamed'} - ${distance}`);
        });
      }
    } else {
      console.log(`   ❌ Error: ${nearbyResult.error}`);
    }

    console.log('\n2. Testing getAllBusinesses with location filters...');
    
    const allBusinessesResult = await businessService.getAllBusinesses(
      {
        circlecenter: `${testLat},${testLng}`,
        radius: testRadius,
        status: 'active'
      },
      { page: 1, limit: 5 },
      { sortBy: 'distance', sortOrder: 'asc' }
    );

    if (allBusinessesResult.success) {
      console.log(`   ✅ Found ${allBusinessesResult.data.length} businesses using getAllBusinesses`);
      console.log(`   📄 Total items: ${allBusinessesResult.pagination.totalItems}`);
    } else {
      console.log(`   ❌ Error: ${allBusinessesResult.error}`);
    }

    console.log('\n3. Testing location data migration...');
    
    const migrationResult = await businessService.migrateLocationDataToGeoPoint();
    
    if (migrationResult.success) {
      console.log(`   ✅ Migration completed successfully`);
      console.log(`   📊 Migrated ${migrationResult.migrated} businesses to GeoPoint format`);
    } else {
      console.log(`   ❌ Migration error: ${migrationResult.error}`);
    }

    console.log('\n4. Testing coordinate format compatibility...');
    
    // Test with bounding box
    const boundingBoxResult = await businessService.getAllBusinesses(
      {
        circleboundingbox: `${testLat - 0.1},${testLng - 0.1},${testLat + 0.1},${testLng + 0.1}`,
        status: 'active'
      },
      { page: 1, limit: 5 }
    );

    if (boundingBoxResult.success) {
      console.log(`   ✅ Bounding box search found ${boundingBoxResult.data.length} businesses`);
    } else {
      console.log(`   ❌ Bounding box error: ${boundingBoxResult.error}`);
    }

  } catch (error) {
    console.error('❌ Test script error:', error);
  }

  console.log('\n=== Location Query Tests Completed ===');
}

// Example of how to create a GeoPoint manually
function demonstrateGeoPointCreation() {
  console.log('\n=== GeoPoint Creation Example ===');
  
  const latitude = 40.02422651108488;
  const longitude = 64.51420448720457;
  
  const geoPoint = businessService.createGeoPoint(latitude, longitude);
  console.log('Created GeoPoint:', geoPoint);
  console.log('Latitude:', geoPoint._latitude);
  console.log('Longitude:', geoPoint._longitude);
}

// Run tests if script is executed directly
if (require.main === module) {
  testLocationQueries()
    .then(() => {
      demonstrateGeoPointCreation();
      process.exit(0);
    })
    .catch(error => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { testLocationQueries, demonstrateGeoPointCreation };
