const EnhancedMXIKFetcher = require('./enhanced-mxics.js');

async function runSampleFetch() {
    const fetcher = new EnhancedMXIKFetcher();
    
    console.log('🧪 Running sample MXIK fetch (first 2 groups only)...\n');
    
    try {
        const groups = await fetcher.fetchGroups();
        console.log(`Found ${groups.length} total groups, processing first 2...\n`);
        
        // Process only first 2 groups for testing
        const sampleGroups = groups.slice(0, 2);
        
        for (const group of sampleGroups) {
            console.log(`🔄 Processing group: ${group.code} - ${group.name}`);
            await fetcher.sleep(fetcher.delay);
            
            const classes = await fetcher.fetchClasses(group.code);
            console.log(`  Found ${classes.length} classes`);
            
            for (const classItem of classes) {
                console.log(`  📂 Processing class: ${classItem.code} - ${classItem.name}`);
                await fetcher.sleep(fetcher.delay);
                
                const positions = await fetcher.fetchPositions(classItem.code);
                console.log(`    Found ${positions.length} positions`);
                
                for (const position of positions) {
                    console.log(`    📄 Processing position: ${position.code} - ${position.name}`);
                    await fetcher.sleep(fetcher.delay);
                    
                    const subpositions = await fetcher.fetchSubpositions(position.code);
                    console.log(`      Found ${subpositions.length} subpositions`);
                    
                    for (const subposition of subpositions) {
                        console.log(`      📝 Processing subposition: ${subposition.code} - ${subposition.name}`);
                        await fetcher.sleep(fetcher.delay);
                        
                        const mxikCodes = await fetcher.fetchMXIKCodes(subposition.code);
                        console.log(`        Found ${mxikCodes.length} MXIK codes`);
                        
                        for (const mxikCode of mxikCodes) {
                            const details = await fetcher.fetchMXIKDetails(mxikCode.code);
                            
                            const completeEntry = {
                                group: { code: group.code, name: group.name },
                                class: { code: classItem.code, name: classItem.name },
                                position: { code: position.code, name: position.name },
                                subposition: { code: subposition.code, name: subposition.name },
                                mxik: { code: mxikCode.code, name: mxikCode.name, details: details },
                                fetchedAt: new Date().toISOString()
                            };
                            
                            fetcher.allCodes.push(completeEntry);
                            console.log(`        ✅ ${mxikCode.code} - ${mxikCode.name}`);
                            
                            await fetcher.sleep(fetcher.delay);
                        }
                    }
                }
            }
            console.log(`Completed group ${group.code}\n`);
        }
        
        console.log(`\n📊 Sample completed!`);
        console.log(`Total codes collected: ${fetcher.allCodes.length}`);
        
        // Save sample data
        await fetcher.saveToFile('mxik_sample.json');
        await fetcher.saveToCSV('mxik_sample.csv');
        
        console.log('\n📁 Sample files created:');
        console.log('  - mxik_sample.json');
        console.log('  - mxik_sample.csv');
        
        // Show some example codes
        console.log('\n🔍 Example MXIK codes found:');
        fetcher.allCodes.slice(0, 5).forEach(entry => {
            console.log(`  ${entry.mxik.code} - ${entry.mxik.name}`);
        });
        
        console.log('\n✅ Sample fetch completed successfully!');
        console.log('📝 To fetch ALL data, run: node run-mxik-fetch.js');
        
    } catch (error) {
        console.error('❌ Sample fetch failed:', error.message);
    }
}

runSampleFetch();
