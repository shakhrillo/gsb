require('dotenv').config({ path: './backend/.env' });
const { db } = require('./backend/src/services/firebase');
const fs = require('fs').promises;
const path = require('path');

/**
 * Upload MXIK data to Firebase Firestore
 * This script reads the mxik_progress.json file and uploads the data to Firestore
 */
class MxikFirebaseUploader {
  constructor() {
    this.batchSize = 100; // Firestore batch limit is 500, using 100 for safety
    this.rootCollectionName = 'mxik_groups';
  }

  /**
   * Read and parse the MXIK data from JSON file
   */
  async loadMxikData() {
    try {
      console.log('Loading MXIK data from file...');
      const filePath = path.join(__dirname, 'mxik_progress.json');
      const data = await fs.readFile(filePath, 'utf8');
      const jsonData = JSON.parse(data);
      
      if (!jsonData.codes || !Array.isArray(jsonData.codes)) {
        throw new Error('Invalid data format: expected codes array');
      }

      console.log(`Found ${jsonData.codes.length} MXIK codes to upload`);
      return jsonData.codes;
    } catch (error) {
      console.error('Error loading MXIK data:', error);
      throw error;
    }
  }

  /**
   * Clean and validate MXIK entry
   */
  cleanMxikEntry(entry, index) {
    // Filter out incomplete entries
    if (!entry || typeof entry !== 'object') {
      console.warn(`Skipping invalid entry at index ${index}: not an object`);
      return null;
    }

    // Skip entries with missing critical data
    if (!entry.fetchedAt) {
      console.warn(`Skipping entry at index ${index}: missing fetchedAt`);
      return null;
    }

    // Create clean entry with only valid data
    const cleanEntry = {
      fetchedAt: entry.fetchedAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Add group data if available and valid
    if (entry.group && typeof entry.group === 'object') {
      const group = {};
      if (entry.group.code) group.code = entry.group.code;
      if (entry.group.name) group.name = entry.group.name;
      if (entry.group.nameUz) group.nameUz = entry.group.nameUz;
      if (entry.group.nameRu) group.nameRu = entry.group.nameRu;
      if (entry.group.nameEng) group.nameEng = entry.group.nameEng;
      
      if (Object.keys(group).length > 0) {
        cleanEntry.group = group;
      }
    }

    // Add class data if available and valid
    if (entry.class && typeof entry.class === 'object') {
      const classData = {};
      if (entry.class.code) classData.code = entry.class.code;
      if (entry.class.name) classData.name = entry.class.name;
      
      if (Object.keys(classData).length > 0) {
        cleanEntry.class = classData;
      }
    }

    // Add position data if available and valid
    if (entry.position && typeof entry.position === 'object') {
      const position = {};
      if (entry.position.code) position.code = entry.position.code;
      if (entry.position.name) position.name = entry.position.name;
      
      if (Object.keys(position).length > 0) {
        cleanEntry.position = position;
      }
    }

    // Add subposition data if available and valid
    if (entry.subposition && typeof entry.subposition === 'object') {
      const subposition = {};
      if (entry.subposition.code) subposition.code = entry.subposition.code;
      if (entry.subposition.name) subposition.name = entry.subposition.name;
      
      if (Object.keys(subposition).length > 0) {
        cleanEntry.subposition = subposition;
      }
    }

    // Add mxik data if available and valid
    if (entry.mxik && typeof entry.mxik === 'object') {
      const mxik = {};
      if (entry.mxik.code) mxik.code = entry.mxik.code;
      if (entry.mxik.name) mxik.name = entry.mxik.name;
      
      // Add details if available
      if (entry.mxik.details && typeof entry.mxik.details === 'object') {
        const details = {};
        if (entry.mxik.details.code) details.code = entry.mxik.details.code;
        if (entry.mxik.details.name) details.name = entry.mxik.details.name;
        if (typeof entry.mxik.details.fetchError === 'boolean') {
          details.fetchError = entry.mxik.details.fetchError;
        }
        
        if (Object.keys(details).length > 0) {
          mxik.details = details;
        }
      }
      
      if (Object.keys(mxik).length > 0) {
        cleanEntry.mxik = mxik;
      }
    }

    return cleanEntry;
  }

  /**
   * Upload data to Firestore in hierarchical structure: groups > classes > positions > subpositions
   */
  async uploadToFirestore(data) {
    try {
      console.log('Starting hierarchical upload to Firestore...');
      console.log('Structure: groups > classes > positions > subpositions');
      
      let uploadedCount = 0;
      let skippedCount = 0;
      
      // Group data by hierarchy
      const hierarchy = this.organizeDataHierarchy(data);
      
      console.log(`Found ${Object.keys(hierarchy).length} groups to process`);
      
      // Process each group
      for (const [groupCode, groupData] of Object.entries(hierarchy)) {
        console.log(`\nProcessing group: ${groupCode} - ${groupData.info.name}`);
        
        // Create or get group document
        const groupRef = db.collection(this.rootCollectionName).doc(groupCode);
        const groupDoc = this.cleanFirestoreData({
          code: groupData.info.code,
          name: groupData.info.name,
          nameUz: groupData.info.nameUz,
          nameRu: groupData.info.nameRu,
          nameEng: groupData.info.nameEng,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        await groupRef.set(groupDoc);
        
        // Process classes within this group
        for (const [classCode, classData] of Object.entries(groupData.classes)) {
          console.log(`  Processing class: ${classCode} - ${classData.info.name}`);
          
          const classRef = groupRef.collection('classes').doc(classCode);
          const classDoc = this.cleanFirestoreData({
            code: classData.info.code,
            name: classData.info.name,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          await classRef.set(classDoc);
          
          // Process positions within this class
          for (const [positionCode, positionData] of Object.entries(classData.positions)) {
            console.log(`    Processing position: ${positionCode} - ${positionData.info.name}`);
            
            const positionRef = classRef.collection('positions').doc(positionCode);
            const positionDoc = this.cleanFirestoreData({
              code: positionData.info.code,
              name: positionData.info.name,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            await positionRef.set(positionDoc);
            
            // Process subpositions within this position
            let batch = db.batch();
            let batchCount = 0;
            
            for (const [subpositionCode, subpositionData] of Object.entries(positionData.subpositions)) {
              console.log(`      Processing subposition: ${subpositionCode} - ${subpositionData.info.name}`);
              
              const subpositionRef = positionRef.collection('subpositions').doc(subpositionCode);
              
              const subpositionDoc = this.cleanFirestoreData({
                code: subpositionData.info.code,
                name: subpositionData.info.name,
                mxik: subpositionData.mxik,
                entries: subpositionData.entries, // All original entries for this subposition
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
              
              batch.set(subpositionRef, subpositionDoc);
              batchCount++;
              uploadedCount++;
              
              // Commit batch if it reaches the limit
              if (batchCount >= this.batchSize) {
                await batch.commit();
                console.log(`      Committed batch of ${batchCount} subpositions`);
                batch = db.batch();
                batchCount = 0;
              }
            }
            
            // Commit remaining batch
            if (batchCount > 0) {
              await batch.commit();
              console.log(`      Committed final batch of ${batchCount} subpositions`);
            }
          }
        }
      }
      
      console.log('\n=== Hierarchical Upload Summary ===');
      console.log(`Total subpositions uploaded: ${uploadedCount}`);
      console.log(`Skipped (invalid): ${skippedCount}`);
      console.log(`Root collection: ${this.rootCollectionName}`);
      console.log(`Structure: groups > classes > positions > subpositions`);
      
      return {
        success: true,
        uploaded: uploadedCount,
        skipped: skippedCount,
        total: data.length
      };
      
    } catch (error) {
      console.error('Error uploading to Firestore:', error);
      throw error;
    }
  }

  /**
   * Organize flat data into hierarchical structure
   */
  organizeDataHierarchy(data) {
    const hierarchy = {};
    
    for (let i = 0; i < data.length; i++) {
      const entry = this.cleanMxikEntry(data[i], i);
      if (!entry) continue;
      
      // Extract hierarchy levels
      const groupCode = entry.group?.code;
      const classCode = entry.class?.code;
      const positionCode = entry.position?.code;
      const subpositionCode = entry.subposition?.code;
      
      // Skip if missing essential hierarchy data
      if (!groupCode || !classCode || !positionCode || !subpositionCode) {
        console.warn(`Skipping entry ${i}: missing hierarchy data`);
        continue;
      }
      
      // Initialize group
      if (!hierarchy[groupCode]) {
        hierarchy[groupCode] = {
          info: entry.group,
          classes: {}
        };
      }
      
      // Initialize class
      if (!hierarchy[groupCode].classes[classCode]) {
        hierarchy[groupCode].classes[classCode] = {
          info: entry.class,
          positions: {}
        };
      }
      
      // Initialize position
      if (!hierarchy[groupCode].classes[classCode].positions[positionCode]) {
        hierarchy[groupCode].classes[classCode].positions[positionCode] = {
          info: entry.position,
          subpositions: {}
        };
      }
      
      // Initialize subposition
      if (!hierarchy[groupCode].classes[classCode].positions[positionCode].subpositions[subpositionCode]) {
        hierarchy[groupCode].classes[classCode].positions[positionCode].subpositions[subpositionCode] = {
          info: entry.subposition,
          mxik: entry.mxik,
          entries: []
        };
      }
      
      // Add entry to subposition
      hierarchy[groupCode].classes[classCode].positions[positionCode].subpositions[subpositionCode].entries.push({
        ...entry,
        originalIndex: i
      });
    }
    
    return hierarchy;
  }

  /**
   * Clean data for Firestore by removing undefined values
   */
  cleanFirestoreData(obj) {
    if (obj === null || obj === undefined) {
      return null;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanFirestoreData(item)).filter(item => item !== null && item !== undefined);
    }
    
    if (typeof obj === 'object') {
      const cleaned = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined && value !== null) {
          if (typeof value === 'object') {
            const cleanedValue = this.cleanFirestoreData(value);
            if (cleanedValue !== null && (Array.isArray(cleanedValue) ? cleanedValue.length > 0 : Object.keys(cleanedValue).length > 0)) {
              cleaned[key] = cleanedValue;
            }
          } else {
            cleaned[key] = value;
          }
        }
      }
      return cleaned;
    }
    
    return obj;
  }

  /**
   * Check if collection exists and get document count
   */
  async getCollectionInfo() {
    try {
      const snapshot = await db.collection(this.rootCollectionName).limit(1).get();
      const countSnapshot = await db.collection(this.rootCollectionName).count().get();
      
      return {
        exists: !snapshot.empty,
        count: countSnapshot.data().count
      };
    } catch (error) {
      console.error('Error getting collection info:', error);
      return { exists: false, count: 0 };
    }
  }

  /**
   * Main upload method
   */
  async uploadMxikData(options = {}) {
    try {
      const { overwrite = false } = options;
      
      console.log('=== MXIK Firebase Upload Started ===\n');
      
      // Check existing data
      const collectionInfo = await this.getCollectionInfo();
      console.log(`Collection '${this.rootCollectionName}' status:`);
      console.log(`- Exists: ${collectionInfo.exists}`);
      console.log(`- Document count: ${collectionInfo.count}\n`);
      
      if (collectionInfo.exists && collectionInfo.count > 0 && !overwrite) {
        console.warn('⚠️  Collection already contains data!');
        console.warn('Use { overwrite: true } option to proceed anyway');
        console.warn('Or delete the collection manually first');
        return {
          success: false,
          error: 'Collection already contains data',
          existingCount: collectionInfo.count
        };
      }
      
      // Load data
      const data = await this.loadMxikData();
      
      // Upload data
      const result = await this.uploadToFirestore(data);
      
      console.log('\n✅ MXIK upload completed successfully!');
      return result;
      
    } catch (error) {
      console.error('\n❌ MXIK upload failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete all documents in the collection (for cleanup)
   */
  async clearCollection() {
    try {
      console.log(`Clearing hierarchical collection '${this.rootCollectionName}'...`);
      
      const collection = db.collection(this.rootCollectionName);
      const snapshot = await collection.get();
      
      if (snapshot.empty) {
        console.log('Collection is already empty');
        return { success: true, deleted: 0 };
      }
      
      console.log(`Found ${snapshot.size} groups to delete`);
      
      // Delete groups and all subcollections
      let deletedCount = 0;
      for (const groupDoc of snapshot.docs) {
        console.log(`Deleting group: ${groupDoc.id}`);
        
        // Delete all subcollections recursively
        await this.deleteDocumentRecursive(groupDoc.ref);
        deletedCount++;
        
        console.log(`Deleted group ${deletedCount}/${snapshot.size}`);
      }
      
      console.log(`✅ Successfully deleted ${deletedCount} groups and all subcollections`);
      return { success: true, deleted: deletedCount };
      
    } catch (error) {
      console.error('Error clearing collection:', error);
      throw error;
    }
  }

  /**
   * Recursively delete a document and all its subcollections
   */
  async deleteDocumentRecursive(docRef) {
    try {
      // Get all subcollections
      const subcollections = await docRef.listCollections();
      
      // Delete all documents in each subcollection
      for (const subcollection of subcollections) {
        const subcollectionSnapshot = await subcollection.get();
        
        for (const subdoc of subcollectionSnapshot.docs) {
          await this.deleteDocumentRecursive(subdoc.ref);
        }
      }
      
      // Delete the document itself
      await docRef.delete();
    } catch (error) {
      console.error('Error deleting document recursively:', error);
      throw error;
    }
  }
}

// Export for use in other scripts
module.exports = MxikFirebaseUploader;

// Run if called directly
if (require.main === module) {
  const uploader = new MxikFirebaseUploader();
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const overwrite = args.includes('--overwrite') || args.includes('-f');
  const clear = args.includes('--clear');
  
  if (clear) {
    // Clear collection
    uploader.clearCollection()
      .then(result => {
        console.log('Clear operation completed:', result);
        process.exit(0);
      })
      .catch(error => {
        console.error('Clear operation failed:', error);
        process.exit(1);
      });
  } else {
    // Upload data
    uploader.uploadMxikData({ overwrite })
      .then(result => {
        if (result.success) {
          console.log('\n🎉 Upload completed successfully!');
          console.log(`📊 Uploaded ${result.uploaded} documents`);
          process.exit(0);
        } else {
          console.error('\n💥 Upload failed:', result.error);
          process.exit(1);
        }
      })
      .catch(error => {
        console.error('\n💥 Upload error:', error);
        process.exit(1);
      });
  }
}
