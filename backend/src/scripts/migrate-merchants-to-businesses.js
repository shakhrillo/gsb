/**
 * Migration Script: Merchant to Business Structure
 * 
 * This script migrates existing merchant data from the users collection
 * to the new businesses collection structure.
 */

const { db } = require('../services/firebase');

async function migrateMerchantsToBusinesses() {
  try {
    console.log('Starting migration from merchants to businesses...');
    
    // Get all users who are merchants
    const merchantsQuery = await db.collection('users')
      .where('isMerchant', '==', true)
      .get();
    
    if (merchantsQuery.empty) {
      console.log('No merchants found to migrate.');
      return;
    }
    
    const batch = db.batch();
    let migrationCount = 0;
    
    for (const merchantDoc of merchantsQuery.docs) {
      const merchantData = merchantDoc.data();
      const uid = merchantDoc.id;
      
      // Check if this merchant has required business data
      if (!merchantData.businessName || !merchantData.innPinfl) {
        console.log(`Skipping merchant ${uid} - missing required business data`);
        continue;
      }
      
      // Check if business already exists in new structure
      const existingBusinessQuery = await db.collection('businesses')
        .where('ownerId', '==', uid)
        .where('innPinfl', '==', merchantData.innPinfl)
        .get();
      
      if (!existingBusinessQuery.empty) {
        console.log(`Business already exists for merchant ${uid}, skipping...`);
        continue;
      }
      
      // Create new business document
      const businessRef = db.collection('businesses').doc();
      const businessData = {
        businessId: businessRef.id,
        ownerId: uid,
        businessName: merchantData.businessName,
        businessType: merchantData.businessType || 'other',
        businessLocation: merchantData.businessLocation || null,
        innPinfl: merchantData.innPinfl,
        bankAccount: merchantData.bankAccount || '',
        mfoCode: merchantData.mfoCode || '',
        businessLicenseUrl: merchantData.businessLicenseUrl || '',
        directorPassportUrl: merchantData.directorPassportUrl || '',
        businessLogoUrl: merchantData.businessLogoUrl || '',
        status: merchantData.merchantRequestStatus === 'active' ? 'active' : 
                merchantData.merchantRequestStatus === 'pending' ? 'pending' :
                merchantData.merchantRequestStatus === 'rejected' ? 'rejected' : 'pending',
        requestDate: merchantData.merchantRequestDate || merchantData.createdAt || new Date(),
        createdAt: merchantData.createdAt || new Date(),
        updatedAt: new Date(),
        // Preserve rejection reason if exists
        ...(merchantData.rejectionReason && { rejectionReason: merchantData.rejectionReason }),
        // Migration metadata
        migratedFrom: 'users_collection',
        migratedAt: new Date()
      };
      
      batch.set(businessRef, businessData);
      
      // Update user document to use new structure
      const userRef = db.collection('users').doc(uid);
      const userUpdates = {
        hasBusiness: true,
        updatedAt: new Date(),
        // Keep legacy fields for backward compatibility during transition
        // You can remove these later when all clients are updated
        isMerchant: merchantData.isMerchant,
        merchantRequestStatus: merchantData.merchantRequestStatus
      };
      
      batch.update(userRef, userUpdates);
      
      migrationCount++;
      console.log(`Prepared migration for merchant ${uid} (${businessData.businessName})`);
    }
    
    if (migrationCount > 0) {
      await batch.commit();
      console.log(`Successfully migrated ${migrationCount} merchants to businesses structure.`);
    } else {
      console.log('No merchants needed migration.');
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

async function rollbackMigration() {
  try {
    console.log('Starting rollback of business migration...');
    
    // Get all businesses that were migrated
    const businessesQuery = await db.collection('businesses')
      .where('migratedFrom', '==', 'users_collection')
      .get();
    
    if (businessesQuery.empty) {
      console.log('No migrated businesses found to rollback.');
      return;
    }
    
    const batch = db.batch();
    let rollbackCount = 0;
    
    for (const businessDoc of businessesQuery.docs) {
      const businessData = businessDoc.data();
      const ownerId = businessData.ownerId;
      
      // Delete the business document
      batch.delete(businessDoc.ref);
      
      // Reset user document
      const userRef = db.collection('users').doc(ownerId);
      const userUpdates = {
        hasBusiness: false,
        updatedAt: new Date()
      };
      
      batch.update(userRef, userUpdates);
      
      rollbackCount++;
      console.log(`Prepared rollback for business ${businessDoc.id} (owner: ${ownerId})`);
    }
    
    await batch.commit();
    console.log(`Successfully rolled back ${rollbackCount} businesses.`);
    
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  }
}

async function validateMigration() {
  try {
    console.log('Validating migration...');
    
    // Count merchants and businesses
    const merchantsSnapshot = await db.collection('users').where('isMerchant', '==', true).get();
    const businessesSnapshot = await db.collection('businesses').get();
    const migratedBusinessesSnapshot = await db.collection('businesses')
      .where('migratedFrom', '==', 'users_collection').get();
    
    console.log(`Total merchants in users collection: ${merchantsSnapshot.size}`);
    console.log(`Total businesses in businesses collection: ${businessesSnapshot.size}`);
    console.log(`Migrated businesses: ${migratedBusinessesSnapshot.size}`);
    
    // Check for orphaned merchants (merchants without corresponding businesses)
    let orphanedMerchants = 0;
    for (const merchantDoc of merchantsSnapshot.docs) {
      const uid = merchantDoc.id;
      const merchantData = merchantDoc.data();
      
      if (merchantData.businessName && merchantData.innPinfl) {
        const businessQuery = await db.collection('businesses')
          .where('ownerId', '==', uid)
          .limit(1)
          .get();
        
        if (businessQuery.empty) {
          orphanedMerchants++;
          console.log(`Orphaned merchant found: ${uid} (${merchantData.businessName})`);
        }
      }
    }
    
    console.log(`Orphaned merchants (have business data but no business document): ${orphanedMerchants}`);
    
    if (orphanedMerchants === 0) {
      console.log('✅ Migration validation passed!');
    } else {
      console.log('⚠️ Migration validation found issues.');
    }
    
  } catch (error) {
    console.error('Validation failed:', error);
    throw error;
  }
}

// Export functions for use
module.exports = {
  migrateMerchantsToBusinesses,
  rollbackMigration,
  validateMigration
};

// If running this script directly
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'migrate':
      migrateMerchantsToBusinesses()
        .then(() => {
          console.log('Migration completed successfully!');
          process.exit(0);
        })
        .catch(error => {
          console.error('Migration failed:', error);
          process.exit(1);
        });
      break;
      
    case 'rollback':
      rollbackMigration()
        .then(() => {
          console.log('Rollback completed successfully!');
          process.exit(0);
        })
        .catch(error => {
          console.error('Rollback failed:', error);
          process.exit(1);
        });
      break;
      
    case 'validate':
      validateMigration()
        .then(() => {
          console.log('Validation completed!');
          process.exit(0);
        })
        .catch(error => {
          console.error('Validation failed:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Usage: node migrate-merchants-to-businesses.js [migrate|rollback|validate]');
      console.log('');
      console.log('Commands:');
      console.log('  migrate   - Migrate merchants to businesses structure');
      console.log('  rollback  - Rollback the migration');
      console.log('  validate  - Validate the migration results');
      process.exit(1);
  }
}
