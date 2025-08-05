const fs = require('fs');
const path = require('path');
const https = require('https');

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, '../../data/mxik');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Function to make HTTP GET request
function fetchData(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (error) {
            reject(new Error(`Failed to parse JSON: ${error.message}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// Function to save data to file
function saveToFile(groupId, data) {
  const fileName = `group_${groupId}.json`;
  const filePath = path.join(dataDir, fileName);
  
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✅ Saved group ${groupId} data to ${fileName}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to save group ${groupId}:`, error.message);
    return false;
  }
}

// Function to add delay between requests
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main function to iterate through groups 1-118
async function fetchAllGroups() {
  const baseUrl = 'https://tasnif.soliq.uz/api/cl-api/integration-mxik/references/group/code?group=';
  const totalGroups = 118;
  const delayMs = 500; // 500ms delay between requests to be respectful to the API
  
  console.log(`🚀 Starting to fetch data for groups 1-${totalGroups}`);
  console.log(`📁 Data will be saved to: ${dataDir}`);
  
  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  
  for (let groupId = 1; groupId <= totalGroups; groupId++) {
    try {
      console.log(`📥 Fetching group ${groupId}/${totalGroups}...`);
      
      const url = `${baseUrl}${groupId}`;
      const data = await fetchData(url);
      
      if (saveToFile(groupId, data)) {
        successCount++;
      } else {
        errorCount++;
      }
      
      // Add delay between requests (except for the last one)
      if (groupId < totalGroups) {
        await delay(delayMs);
      }
      
    } catch (error) {
      console.error(`❌ Error fetching group ${groupId}:`, error.message);
      errors.push({ groupId, error: error.message });
      errorCount++;
      
      // Still add delay even on error
      if (groupId < totalGroups) {
        await delay(delayMs);
      }
    }
  }
  
  // Summary
  console.log('\n📊 Summary:');
  console.log(`✅ Successfully processed: ${successCount} groups`);
  console.log(`❌ Errors: ${errorCount} groups`);
  
  if (errors.length > 0) {
    console.log('\n❌ Failed groups:');
    errors.forEach(({ groupId, error }) => {
      console.log(`  - Group ${groupId}: ${error}`);
    });
    
    // Save error log
    const errorLogPath = path.join(dataDir, 'errors.json');
    fs.writeFileSync(errorLogPath, JSON.stringify(errors, null, 2));
    console.log(`\n📝 Error log saved to: ${errorLogPath}`);
  }
  
  console.log(`\n🎉 Process completed! Data saved to: ${dataDir}`);
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n⚠️  Process interrupted by user');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

// Run the script
if (require.main === module) {
  fetchAllGroups().catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { fetchAllGroups, fetchData, saveToFile };
