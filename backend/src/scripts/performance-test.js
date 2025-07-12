/**
 * Performance test script to compare Fuse.js vs SQLite FTS search methods
 * This script will test search performance and accuracy for both approaches
 */

const { searchProductClassification } = require('../services/tasnifApi');
const { searchProductClassification: searchProductClassificationSqlite } = require('../services/tasnifApiSqlite');

// Test queries to run
const testQueries = [
  'қант',
  'сол',
  'сӯт',
  'нон',
  'тухум',
  'гӯшт',
  'мева',
  'картошка',
  'сабзавот',
  'бринч',
  'узурук',
  'олма',
  'банана',
  'помидор',
  'кахам',
  'қатиқ',
  'панир',
  'макарон',
  'сӯп',
  'чой'
];

/**
 * Measure execution time of a function
 * @param {Function} func - Function to measure
 * @returns {Promise<{result: any, duration: number}>}
 */
async function measureTime(func) {
  const start = process.hrtime.bigint();
  const result = await func();
  const end = process.hrtime.bigint();
  const duration = Number(end - start) / 1000000; // Convert to milliseconds
  return { result, duration };
}

/**
 * Test search performance for a single query
 * @param {string} query - Search query
 * @returns {Promise<Object>} - Test results
 */
async function testQuery(query) {
  console.log(`\nTesting query: "${query}"`);
  
  const analysisResult = { product_name: query };
  
  // Test Fuse.js approach
  const fuseTest = await measureTime(async () => {
    return await searchProductClassification(analysisResult);
  });
  
  // Test SQLite approach
  const sqliteTest = await measureTime(async () => {
    return await searchProductClassificationSqlite(analysisResult);
  });
  
  // Compare results
  const fuseResults = fuseTest.result?.searches?.[0]?.dataCount || 0;
  const sqliteResults = sqliteTest.result?.searches?.[0]?.dataCount || 0;
  const fuseBestScore = fuseTest.result?.summary?.bestMatch?.similarity || 0;
  const sqliteBestScore = sqliteTest.result?.summary?.bestMatch?.similarity || 0;
  
  console.log(`  Fuse.js:  ${fuseTest.duration.toFixed(2)}ms, ${fuseResults} results, best: ${fuseBestScore}`);
  console.log(`  SQLite:   ${sqliteTest.duration.toFixed(2)}ms, ${sqliteResults} results, best: ${sqliteBestScore}`);
  console.log(`  Speedup:  ${(fuseTest.duration / sqliteTest.duration).toFixed(2)}x faster with SQLite`);
  
  return {
    query,
    fuse: {
      duration: fuseTest.duration,
      resultCount: fuseResults,
      bestScore: fuseBestScore,
      hasResults: fuseResults > 0
    },
    sqlite: {
      duration: sqliteTest.duration,
      resultCount: sqliteResults,
      bestScore: sqliteBestScore,
      hasResults: sqliteResults > 0
    },
    speedup: fuseTest.duration / sqliteTest.duration
  };
}

/**
 * Run comprehensive performance tests
 */
async function runPerformanceTests() {
  console.log('='.repeat(60));
  console.log('PRODUCT SEARCH PERFORMANCE COMPARISON');
  console.log('Fuse.js vs SQLite FTS');
  console.log('='.repeat(60));
  
  const results = [];
  let totalFuseDuration = 0;
  let totalSqliteDuration = 0;
  let fuseResultsFound = 0;
  let sqliteResultsFound = 0;
  
  // Run tests for each query
  for (const query of testQueries) {
    try {
      const testResult = await testQuery(query);
      results.push(testResult);
      
      totalFuseDuration += testResult.fuse.duration;
      totalSqliteDuration += testResult.sqlite.duration;
      
      if (testResult.fuse.hasResults) fuseResultsFound++;
      if (testResult.sqlite.hasResults) sqliteResultsFound++;
      
    } catch (error) {
      console.error(`Error testing query "${query}":`, error.message);
    }
  }
  
  // Calculate summary statistics
  const avgFuseDuration = totalFuseDuration / results.length;
  const avgSqliteDuration = totalSqliteDuration / results.length;
  const avgSpeedup = avgFuseDuration / avgSqliteDuration;
  
  console.log('\n' + '='.repeat(60));
  console.log('PERFORMANCE SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total queries tested: ${results.length}`);
  console.log(`\nFuse.js Results:`);
  console.log(`  Average duration: ${avgFuseDuration.toFixed(2)}ms`);
  console.log(`  Total duration: ${totalFuseDuration.toFixed(2)}ms`);
  console.log(`  Queries with results: ${fuseResultsFound}/${results.length} (${((fuseResultsFound/results.length)*100).toFixed(1)}%)`);
  console.log(`\nSQLite Results:`);
  console.log(`  Average duration: ${avgSqliteDuration.toFixed(2)}ms`);
  console.log(`  Total duration: ${totalSqliteDuration.toFixed(2)}ms`);
  console.log(`  Queries with results: ${sqliteResultsFound}/${results.length} (${((sqliteResultsFound/results.length)*100).toFixed(1)}%)`);
  console.log(`\nPerformance Improvement:`);
  console.log(`  SQLite is ${avgSpeedup.toFixed(2)}x faster on average`);
  console.log(`  Total time saved: ${(totalFuseDuration - totalSqliteDuration).toFixed(2)}ms`);
  
  // Find fastest and slowest queries
  const fastestQuery = results.reduce((prev, current) => 
    current.sqlite.duration < prev.sqlite.duration ? current : prev
  );
  const slowestQuery = results.reduce((prev, current) => 
    current.sqlite.duration > prev.sqlite.duration ? current : prev
  );
  
  console.log(`\nFastest SQLite query: "${fastestQuery.query}" (${fastestQuery.sqlite.duration.toFixed(2)}ms)`);
  console.log(`Slowest SQLite query: "${slowestQuery.query}" (${slowestQuery.sqlite.duration.toFixed(2)}ms)`);
  
  // Show detailed comparison for a few queries
  console.log('\n' + '='.repeat(60));
  console.log('DETAILED COMPARISON (First 5 queries)');
  console.log('='.repeat(60));
  console.table(results.slice(0, 5).map(r => ({
    Query: r.query,
    'Fuse.js (ms)': r.fuse.duration.toFixed(2),
    'SQLite (ms)': r.sqlite.duration.toFixed(2),
    'Speedup': r.speedup.toFixed(2) + 'x',
    'Fuse Results': r.fuse.resultCount,
    'SQLite Results': r.sqlite.resultCount,
    'Fuse Score': r.fuse.bestScore.toFixed(2),
    'SQLite Score': r.sqlite.bestScore.toFixed(2)
  })));
  
  return results;
}

// Run performance tests if script is executed directly
if (require.main === module) {
  runPerformanceTests().then(results => {
    console.log('\nPerformance test completed!');
    process.exit(0);
  }).catch(error => {
    console.error('Performance test failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runPerformanceTests,
  testQuery,
  testQueries
};
