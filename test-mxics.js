const MXIKFetcher = require('./mxics.js');

// Test script to fetch a small sample
async function testFetch() {
    const fetcher = new MXIKFetcher();
    
    try {
        console.log('Testing MXIK fetcher with a small sample...\n');
        
        // Test fetching groups first
        const groups = await fetcher.fetchGroups();
        console.log(`Found ${groups.length} groups`);
        
        if (groups.length > 0) {
            // Test with first group only
            const firstGroup = groups[0];
            console.log(`\nTesting with group: ${firstGroup.code} - ${firstGroup.name}`);
            
            const classes = await fetcher.fetchClasses(firstGroup.code);
            console.log(`Found ${classes.length} classes`);
            
            if (classes.length > 0) {
                const firstClass = classes[0];
                console.log(`Testing with class: ${firstClass.code} - ${firstClass.name}`);
                
                const positions = await fetcher.fetchPositions(firstClass.code);
                console.log(`Found ${positions.length} positions`);
                
                if (positions.length > 0) {
                    const firstPosition = positions[0];
                    console.log(`Testing with position: ${firstPosition.code} - ${firstPosition.name}`);
                    
                    const subpositions = await fetcher.fetchSubpositions(firstPosition.code);
                    console.log(`Found ${subpositions.length} subpositions`);
                    
                    if (subpositions.length > 0) {
                        const firstSubposition = subpositions[0];
                        console.log(`Testing with subposition: ${firstSubposition.code} - ${firstSubposition.name}`);
                        
                        const mxikCodes = await fetcher.fetchMXIKCodes(firstSubposition.code);
                        console.log(`Found ${mxikCodes.length} MXIK codes`);
                        
                        if (mxikCodes.length > 0) {
                            const firstMxik = mxikCodes[0];
                            console.log(`Final MXIK code: ${firstMxik.code} - ${firstMxik.name}`);
                            
                            // Get details for the MXIK code
                            const details = await fetcher.fetchMXIKDetails(firstMxik.code);
                            if (details) {
                                console.log(`MXIK details fetched successfully`);
                                console.log(`Full hierarchy: ${firstGroup.code} → ${firstClass.code} → ${firstPosition.code} → ${firstSubposition.code} → ${firstMxik.code}`);
                            }
                        }
                    }
                }
            }
        }
        
        console.log('\n✅ Test completed successfully!');
        console.log('The script is ready to fetch all MXIK codes.');
        console.log('Run: node mxics.js to start the full fetch process');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testFetch();
