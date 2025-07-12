const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, '../../data/mxik');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Configuration
const CONFIG = {
  baseUrl: 'https://tasnif.soliq.uz/api/cl-api/integration-mxik/references/group/code?group=',
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  requestDelay: 500, // 500ms between requests
  timeout: 10000, // 10 seconds timeout
  totalGroups: 118
};

// Configure axios defaults
axios.defaults.timeout = CONFIG.timeout;
axios.defaults.headers.common['User-Agent'] = 'Mozilla/5.0 (compatible; DataFetcher/1.0)';

// Function to make HTTP GET request with retry logic
async function fetchDataWithRetry(url, retries = CONFIG.maxRetries) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`  📡 Attempt ${attempt}/${retries}...`);
      
      const response = await axios.get(url, {
        timeout: CONFIG.timeout,
        validateStatus: (status) => status === 200
      });
      
      return response.data;
      
    } catch (error) {
      const isLastAttempt = attempt === retries;
      
      if (error.code === 'ECONNABORTED') {
        console.log(`  ⏱️  Timeout on attempt ${attempt}`);
      } else if (error.response) {
        console.log(`  ❌ HTTP ${error.response.status}: ${error.response.statusText} (attempt ${attempt})`);
      } else {
        console.log(`  🔗 Network error on attempt ${attempt}: ${error.message}`);
      }
      
      if (isLastAttempt) {
        throw error;
      }
      
      // Wait before retrying
      await delay(CONFIG.retryDelay * attempt);
    }
  }
}

// Function to save data to file
function saveToFile(groupId, data) {
  const fileName = `group_${String(groupId).padStart(3, '0')}.json`;
  const filePath = path.join(dataDir, fileName);
  
  try {
    // Add metadata
    const dataWithMetadata = {
      metadata: {
        groupId,
        fetchedAt: new Date().toISOString(),
        source: `${CONFIG.baseUrl}${groupId}`
      },
      data: data
    };
    
    fs.writeFileSync(filePath, JSON.stringify(dataWithMetadata, null, 2), 'utf8');
    
    // Log data summary
    const dataSize = Array.isArray(data) ? data.length : (typeof data === 'object' ? Object.keys(data).length : 1);
    console.log(`  ✅ Saved ${dataSize} items to ${fileName}`);
    
    return true;
  } catch (error) {
    console.error(`  ❌ Failed to save file:`, error.message);
    return false;
  }
}

// Function to add delay between requests
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to create progress bar
function getProgressBar(current, total, width = 30) {
  const percentage = Math.round((current / total) * 100);
  const filled = Math.round((current / total) * width);
  const empty = width - filled;
  
  return `[${'█'.repeat(filled)}${' '.repeat(empty)}] ${percentage}%`;
}

// Function to format duration
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// Main function to iterate through groups 1-118
async function fetchAllGroups(startGroup = 1, endGroup = CONFIG.totalGroups) {
  console.log(`🚀 Starting to fetch MXIK data for groups ${startGroup}-${endGroup}`);
  console.log(`📁 Data will be saved to: ${dataDir}`);
  console.log(`⚙️  Configuration:`);
  console.log(`   - Request timeout: ${CONFIG.timeout}ms`);
  console.log(`   - Max retries: ${CONFIG.maxRetries}`);
  console.log(`   - Delay between requests: ${CONFIG.requestDelay}ms`);
  console.log(`   - Retry delay: ${CONFIG.retryDelay}ms\n`);
  
  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  const totalGroups = endGroup - startGroup + 1;
  
  for (let groupId = startGroup; groupId <= endGroup; groupId++) {
    const current = groupId - startGroup + 1;
    const progressBar = getProgressBar(current - 1, totalGroups);
    
    console.log(`\n${progressBar} Group ${groupId}/${endGroup}`);
    
    try {
      const url = `${CONFIG.baseUrl}${groupId}`;
      const data = await fetchDataWithRetry(url);
      
      if (saveToFile(groupId, data)) {
        successCount++;
      } else {
        errorCount++;
      }
      
    } catch (error) {
      console.log(`  ❌ Failed after all retries: ${error.message}`);
      errors.push({ 
        groupId, 
        error: error.message,
        status: error.response?.status || 'Network Error',
        timestamp: new Date().toISOString()
      });
      errorCount++;
    }
    
    // Add delay between requests (except for the last one)
    if (groupId < endGroup) {
      await delay(CONFIG.requestDelay);
    }
  }
  
  const endTime = Date.now();
  const duration = formatDuration(endTime - startTime);
  
  // Final progress bar
  const finalProgressBar = getProgressBar(totalGroups, totalGroups);
  console.log(`\n${finalProgressBar} Completed!\n`);
  
  // Summary
  console.log('📊 SUMMARY:');
  console.log(`⏱️  Total time: ${duration}`);
  console.log(`✅ Successfully processed: ${successCount}/${totalGroups} groups`);
  console.log(`❌ Errors: ${errorCount}/${totalGroups} groups`);
  
  if (errors.length > 0) {
    console.log('\n❌ FAILED GROUPS:');
    errors.forEach(({ groupId, error, status }) => {
      console.log(`  - Group ${groupId} [${status}]: ${error}`);
    });
    
    // Save error log with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const errorLogPath = path.join(dataDir, `errors_${timestamp}.json`);
    fs.writeFileSync(errorLogPath, JSON.stringify(errors, null, 2));
    console.log(`\n📝 Error log saved to: ${path.basename(errorLogPath)}`);
    
    // Create retry script for failed groups
    if (errors.length > 0) {
      const retryGroups = errors.map(e => e.groupId);
      const retryScript = `// Retry script for failed groups
const { fetchSpecificGroups } = require('./fetchMxikData');

// Failed groups: [${retryGroups.join(', ')}]
fetchSpecificGroups([${retryGroups.join(', ')}]);
`;
      const retryScriptPath = path.join(dataDir, `retry_${timestamp}.js`);
      fs.writeFileSync(retryScriptPath, retryScript);
      console.log(`🔄 Retry script created: ${path.basename(retryScriptPath)}`);
    }
  }
  
  // Create summary file
  const summary = {
    timestamp: new Date().toISOString(),
    duration: duration,
    totalGroups,
    successCount,
    errorCount,
    errors: errors.length > 0 ? errors : undefined,
    dataDirectory: dataDir
  };
  
  const summaryPath = path.join(dataDir, 'fetch_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  
  console.log(`\n🎉 Process completed! Data saved to: ${dataDir}`);
  console.log(`📄 Summary saved to: ${path.basename(summaryPath)}`);
  
  return summary;
}

// Function to fetch specific groups (useful for retrying failed ones)
async function fetchSpecificGroups(groupIds) {
  console.log(`🎯 Fetching specific groups: [${groupIds.join(', ')}]`);
  
  for (const groupId of groupIds) {
    console.log(`\n📥 Fetching group ${groupId}...`);
    
    try {
      const url = `${CONFIG.baseUrl}${groupId}`;
      const data = await fetchDataWithRetry(url);
      saveToFile(groupId, data);
      
      // Add delay between requests
      if (groupIds.indexOf(groupId) < groupIds.length - 1) {
        await delay(CONFIG.requestDelay);
      }
      
    } catch (error) {
      console.log(`❌ Failed to fetch group ${groupId}: ${error.message}`);
    }
  }
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

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Fetch all groups
    fetchAllGroups().catch((error) => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
  } else if (args[0] === '--range' && args.length === 3) {
    // Fetch specific range: node fetchMxikData.js --range 1 10
    const start = parseInt(args[1]);
    const end = parseInt(args[2]);
    
    if (isNaN(start) || isNaN(end) || start < 1 || end > CONFIG.totalGroups || start > end) {
      console.error('❌ Invalid range. Use: node fetchMxikData.js --range <start> <end>');
      console.error(`   Valid range: 1-${CONFIG.totalGroups}`);
      process.exit(1);
    }
    
    fetchAllGroups(start, end).catch((error) => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
  } else if (args[0] === '--groups') {
    // Fetch specific groups: node fetchMxikData.js --groups 1,5,10,15
    const groupIds = args[1].split(',').map(id => parseInt(id.trim()));
    
    if (groupIds.some(id => isNaN(id) || id < 1 || id > CONFIG.totalGroups)) {
      console.error('❌ Invalid group IDs. All IDs must be numbers between 1 and ' + CONFIG.totalGroups);
      process.exit(1);
    }
    
    fetchSpecificGroups(groupIds).catch((error) => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
  } else {
    console.log('📖 Usage:');
    console.log('  node fetchMxikData.js                    # Fetch all groups (1-118)');
    console.log('  node fetchMxikData.js --range 1 10       # Fetch groups 1-10');
    console.log('  node fetchMxikData.js --groups 1,5,10    # Fetch specific groups');
    process.exit(0);
  }
}

module.exports = { 
  fetchAllGroups, 
  fetchSpecificGroups, 
  fetchDataWithRetry, 
  saveToFile,
  CONFIG 
};
