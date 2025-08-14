const EnhancedMXIKFetcher = require('./enhanced-mxics.js');

async function runFullFetch() {
    const fetcher = new EnhancedMXIKFetcher();
    
    console.log('🚀 Starting complete MXIK data fetch...');
    console.log('This process will fetch ALL MXIK codes from the Uzbekistan tax classification API');
    console.log('The process supports resume - you can stop and restart anytime');
    console.log('Progress is saved every 10 entries\n');
    
    try {
        // Fetch all data with resume capability
        await fetcher.fetchAllDataWithResume();
        
        // Show final statistics
        fetcher.getStats();
        
        // Save final results
        await fetcher.saveFinalResults();
        
        console.log('\n🎉 =====================================');
        console.log('✅ COMPLETE SUCCESS!');
        console.log('=====================================');
        console.log('📁 Files generated:');
        console.log('  - mxik_codes_complete.json (Full data)');
        console.log('  - mxik_codes_complete.csv (CSV format)');
        console.log('  - mxik_summary.json (Statistics)');
        console.log('  - mxik_progress.json (Resume data)');
        console.log('=====================================\n');
        
    } catch (error) {
        console.error('\n❌ =====================================');
        console.error('PROCESS FAILED');
        console.error('=====================================');
        console.error('Error:', error.message);
        console.log('\n💡 You can restart the process and it will resume from where it left off');
        console.log('Progress has been saved to mxik_progress.json');
        console.error('=====================================\n');
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n\n🛑 Process interrupted by user');
    console.log('💾 Progress has been saved');
    console.log('▶️  Restart the script to resume from where you left off');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n\n🛑 Process terminated');
    console.log('💾 Progress has been saved');
    process.exit(0);
});

// Run the fetcher
if (require.main === module) {
    runFullFetch();
}
