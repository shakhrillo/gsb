#!/usr/bin/env node

console.log('🇺🇿 MXIK Data Fetcher for Uzbekistan Tax Classification');
console.log('====================================================\n');

console.log('📝 AVAILABLE COMMANDS:');
console.log('');
console.log('1. Test the connection and API:');
console.log('   node test-mxics.js');
console.log('');
console.log('2. Fetch a small sample (first 2 groups):');
console.log('   node sample-mxik-fetch.js');
console.log('');
console.log('3. Fetch ALL MXIK codes (full database):');
console.log('   node run-mxik-fetch.js');
console.log('');
console.log('4. View this help:');
console.log('   node help.js');
console.log('');

console.log('📊 API STRUCTURE:');
console.log('The MXIK classification has the following hierarchy:');
console.log('Group → Class → Position → Subposition → MXIK Code');
console.log('');
console.log('Example: 001 → 00101 → 00101001 → 00101001001 → 00101001001000000');
console.log('');

console.log('📁 OUTPUT FILES:');
console.log('- mxik_sample.json/csv - Sample data (first 2 groups)');
console.log('- mxik_codes_complete.json/csv - Full dataset');
console.log('- mxik_progress.json - Resume information');
console.log('- mxik_summary.json - Statistics');
console.log('');

console.log('🌐 API SOURCE:');
console.log('https://tasnif.soliq.uz/api/cls-api/');
console.log('');

console.log('⚡ FEATURES:');
console.log('✅ Resume capability - can stop and restart');
console.log('✅ Progress saving every 10 entries');
console.log('✅ Multiple output formats (JSON, CSV)');
console.log('✅ Complete hierarchy preservation');
console.log('✅ Error handling and retry logic');
console.log('✅ Rate limiting to avoid overwhelming server');
console.log('');

console.log('🚀 QUICK START:');
console.log('1. Run: node sample-mxik-fetch.js');
console.log('2. Check the generated mxik_sample.json file');
console.log('3. If satisfied, run: node run-mxik-fetch.js for full data');
console.log('');

const fs = require('fs');

// Check if sample files exist
if (fs.existsSync('mxik_sample.json')) {
    const stats = fs.statSync('mxik_sample.json');
    const sample = JSON.parse(fs.readFileSync('mxik_sample.json', 'utf8'));
    console.log(`📊 Sample Data Available: ${sample.length} codes (${Math.round(stats.size/1024)}KB)`);
}

if (fs.existsSync('mxik_codes_complete.json')) {
    const stats = fs.statSync('mxik_codes_complete.json');
    const complete = JSON.parse(fs.readFileSync('mxik_codes_complete.json', 'utf8'));
    console.log(`📋 Complete Data Available: ${complete.length} codes (${Math.round(stats.size/1024)}KB)`);
}

if (fs.existsSync('mxik_progress.json')) {
    const progress = JSON.parse(fs.readFileSync('mxik_progress.json', 'utf8'));
    console.log(`💾 Progress File Found: ${progress.totalCodes} codes saved`);
    console.log(`📅 Last updated: ${progress.timestamp}`);
}

console.log('');
