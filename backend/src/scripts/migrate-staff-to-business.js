/**
 * Migration Script: Staff to Business-Based Structure
 * 
 * This script migrates existing staff members from merchant-based structure
 * to the new business-based structure.
 */

const { db } = require('../services/firebase');

async function migrateStaffToBusinessStructure() {
  try {
    console.log('Starting migration of staff to business structure...');
    
    // Get all users who are staff
    const staffQuery = await db.collection('users')
      .where('isStaff', '==', true)
      .get();
    
    if (staffQuery.empty) {
      console.log('No staff members found to migrate.');
      return;
    }
    
    const batch = db.batch();
    let migrationCount = 0;
    let skippedCount = 0;
    
    for (const staffDoc of staffQuery.docs) {
      const staffData = staffDoc.data();
      const staffUid = staffDoc.id;
      
      // Skip if already has businessId
      if (staffData.businessId) {
        console.log(`Staff member ${staffUid} already has businessId, skipping...`);
        skippedCount++;
        continue;
      }
      
      // Get the merchant (owner) UID
      const merchantUid = staffData.merchantUid;
      if (!merchantUid) {
        console.log(`Staff member ${staffUid} has no merchantUid, skipping...`);
        skippedCount++;
        continue;
      }
      
      // Find the first active business for this merchant
      const businessQuery = await db.collection('businesses')
        .where('ownerId', '==', merchantUid)
        .where('status', '==', 'active')
        .limit(1)
        .get();
      
      if (businessQuery.empty) {
        // Try to find any business for this merchant
        const anyBusinessQuery = await db.collection('businesses')
          .where('ownerId', '==', merchantUid)
          .limit(1)
          .get();
        
        if (anyBusinessQuery.empty) {
          console.log(`No business found for merchant ${merchantUid}, staff ${staffUid} will be skipped`);
          skippedCount++;
          continue;
        }
        
        const business = anyBusinessQuery.docs[0];
        const businessData = business.data();
        
        console.log(`Assigning staff ${staffUid} to non-active business ${business.id} (status: ${businessData.status})`);
        
        const staffRef = db.collection('users').doc(staffUid);
        batch.update(staffRef, {
          businessId: business.id,
          businessName: businessData.businessName,
          ownerId: merchantUid,
          updatedAt: new Date(),
          migratedToBusinessStructure: true,
          migrationDate: new Date()
        });
        
        migrationCount++;
      } else {
        const business = businessQuery.docs[0];
        const businessData = business.data();
        
        console.log(`Assigning staff ${staffUid} to business ${business.id} (${businessData.businessName})`);
        
        const staffRef = db.collection('users').doc(staffUid);
        batch.update(staffRef, {
          businessId: business.id,
          businessName: businessData.businessName,
          ownerId: merchantUid,
          updatedAt: new Date(),
          migratedToBusinessStructure: true,
          migrationDate: new Date()
        });
        
        migrationCount++;
      }
    }
    
    if (migrationCount > 0) {
      await batch.commit();
      console.log(`Successfully migrated ${migrationCount} staff members to business structure.`);
    }
    
    if (skippedCount > 0) {
      console.log(`Skipped ${skippedCount} staff members (already migrated or missing data).`);
    }
    
    if (migrationCount === 0 && skippedCount === 0) {
      console.log('No staff members needed migration.');
    }
    
  } catch (error) {
    console.error('Staff migration failed:', error);
    throw error;
  }
}

async function rollbackStaffMigration() {
  try {
    console.log('Starting rollback of staff business migration...');
    
    // Get all staff that were migrated
    const staffQuery = await db.collection('users')
      .where('migratedToBusinessStructure', '==', true)
      .get();
    
    if (staffQuery.empty) {
      console.log('No migrated staff found to rollback.');
      return;
    }
    
    const batch = db.batch();
    let rollbackCount = 0;
    
    for (const staffDoc of staffQuery.docs) {
      const staffUid = staffDoc.id;
      
      console.log(`Rolling back staff ${staffUid}`);
      
      const staffRef = db.collection('users').doc(staffUid);
      batch.update(staffRef, {
        businessId: null,
        businessName: null,
        ownerId: null,
        migratedToBusinessStructure: false,
        migrationDate: null,
        updatedAt: new Date()
      });
      
      rollbackCount++;
    }
    
    await batch.commit();
    console.log(`Successfully rolled back ${rollbackCount} staff members.`);
    
  } catch (error) {
    console.error('Staff rollback failed:', error);
    throw error;
  }
}

async function validateStaffMigration() {
  try {
    console.log('Validating staff migration...');
    
    // Count staff members
    const allStaffSnapshot = await db.collection('users').where('isStaff', '==', true).get();
    const migratedStaffSnapshot = await db.collection('users')
      .where('migratedToBusinessStructure', '==', true).get();
    const staffWithBusinessSnapshot = await db.collection('users')
      .where('isStaff', '==', true)
      .where('businessId', '!=', null).get();
    
    console.log(`Total staff members: ${allStaffSnapshot.size}`);
    console.log(`Migrated staff members: ${migratedStaffSnapshot.size}`);
    console.log(`Staff with businessId: ${staffWithBusinessSnapshot.size}`);
    
    // Check for orphaned staff (staff without businessId)
    let orphanedStaff = 0;
    for (const staffDoc of allStaffSnapshot.docs) {
      const staffData = staffDoc.data();
      if (!staffData.businessId) {
        orphanedStaff++;
        console.log(`Orphaned staff found: ${staffDoc.id} (merchantUid: ${staffData.merchantUid})`);
      }
    }
    
    console.log(`Orphaned staff (no businessId): ${orphanedStaff}`);
    
    // Check for staff with invalid business references
    let invalidBusinessRefs = 0;
    for (const staffDoc of staffWithBusinessSnapshot.docs) {
      const staffData = staffDoc.data();
      if (staffData.businessId) {
        const businessDoc = await db.collection('businesses').doc(staffData.businessId).get();
        if (!businessDoc.exists) {
          invalidBusinessRefs++;
          console.log(`Staff with invalid business reference: ${staffDoc.id} -> ${staffData.businessId}`);
        }
      }
    }
    
    console.log(`Staff with invalid business references: ${invalidBusinessRefs}`);
    
    if (orphanedStaff === 0 && invalidBusinessRefs === 0) {
      console.log('✅ Staff migration validation passed!');
    } else {
      console.log('⚠️ Staff migration validation found issues.');
    }
    
  } catch (error) {
    console.error('Staff validation failed:', error);
    throw error;
  }
}

// Export functions for use
module.exports = {
  migrateStaffToBusinessStructure,
  rollbackStaffMigration,
  validateStaffMigration
};

// If running this script directly
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'migrate':
      migrateStaffToBusinessStructure()
        .then(() => {
          console.log('Staff migration completed successfully!');
          process.exit(0);
        })
        .catch(error => {
          console.error('Staff migration failed:', error);
          process.exit(1);
        });
      break;
      
    case 'rollback':
      rollbackStaffMigration()
        .then(() => {
          console.log('Staff rollback completed successfully!');
          process.exit(0);
        })
        .catch(error => {
          console.error('Staff rollback failed:', error);
          process.exit(1);
        });
      break;
      
    case 'validate':
      validateStaffMigration()
        .then(() => {
          console.log('Staff validation completed!');
          process.exit(0);
        })
        .catch(error => {
          console.error('Staff validation failed:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Usage: node migrate-staff-to-business.js [migrate|rollback|validate]');
      console.log('');
      console.log('Commands:');
      console.log('  migrate   - Migrate staff to business structure');
      console.log('  rollback  - Rollback the staff migration');
      console.log('  validate  - Validate the staff migration results');
      process.exit(1);
  }
}
