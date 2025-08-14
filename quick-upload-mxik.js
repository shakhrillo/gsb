#!/usr/bin/env node

/**
 * Quick MXIK Upload Script
 * Simple script to upload MXIK data to Firebase
 */

const MxikFirebaseUploader = require('./upload-mxik-to-firebase');

async function main() {
  console.log('🚀 Starting MXIK data upload to Firebase...\n');
  
  const uploader = new MxikFirebaseUploader();
  
  try {
    // Check if we want to overwrite existing data
    const args = process.argv.slice(2);
    const forceOverwrite = args.includes('--force') || args.includes('-f');
    
    if (forceOverwrite) {
      console.log('⚠️  Force overwrite mode enabled\n');
    }
    
    const result = await uploader.uploadMxikData({ 
      overwrite: forceOverwrite 
    });
    
    if (result.success) {
      console.log('\n🎉 Success!');
      console.log(`📊 Statistics:`);
      console.log(`   - Total processed: ${result.total}`);
      console.log(`   - Successfully uploaded: ${result.uploaded}`);
      console.log(`   - Skipped (invalid): ${result.skipped}`);
      console.log(`   - Collection: mxik_groups (hierarchical)`);
      console.log(`   - Structure: groups > classes > positions > subpositions`);
      
      // Show Firestore console link
      console.log('\n🔗 View your data in Firebase Console:');
      console.log(`   https://console.firebase.google.com/project/${process.env.PROJECT_ID}/firestore/data/mxik_groups`);
    } else {
      console.log('\n❌ Upload failed:', result.error);
      if (result.existingCount > 0) {
        console.log(`\n💡 The collection already has ${result.existingCount} documents.`);
        console.log('   Use --force flag to overwrite existing data:');
        console.log('   node quick-upload-mxik.js --force');
      }
    }
    
  } catch (error) {
    console.error('\n💥 Unexpected error:', error.message);
    process.exit(1);
  }
}

// Show usage help
function showHelp() {
  console.log(`
📚 MXIK Firebase Upload Tool

Usage:
  node quick-upload-mxik.js [options]

Options:
  --force, -f    Force upload even if collection has existing data
  --help, -h     Show this help message

Examples:
  node quick-upload-mxik.js                 # Upload data (fails if collection exists)
  node quick-upload-mxik.js --force         # Upload data (overwrites existing)
  
Collection: Data will be uploaded to 'mxik_groups' collection in hierarchical structure:
  - mxik_groups/{groupCode}
    - classes/{classCode}
      - positions/{positionCode}
        - subpositions/{subpositionCode}
`);
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

// Run the upload
main();
