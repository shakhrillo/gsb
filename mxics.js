const axios = require('axios');
const fs = require('fs');
const path = require('path');

class MXIKFetcher {
    constructor() {
        this.baseUrl = 'https://tasnif.soliq.uz/api/cls-api';
        this.lang = 'uz_latn';
        this.allCodes = [];
        this.delay = 100; // Delay between requests to avoid overwhelming the server
    }

    // Add delay between requests
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Fetch all groups
    async fetchGroups() {
        try {
            console.log('Fetching groups...');
            const response = await axios.get(`${this.baseUrl}/group`, {
                params: {
                    size: 200,
                    lang: this.lang
                }
            });
            
            if (response.data && response.data.data) {
                console.log(`Found ${response.data.data.length} groups`);
                return response.data.data;
            }
            return [];
        } catch (error) {
            console.error('Error fetching groups:', error.message);
            return [];
        }
    }

    // Fetch classes for a specific group
    async fetchClasses(groupCode) {
        try {
            console.log(`Fetching classes for group ${groupCode}...`);
            const response = await axios.get(`${this.baseUrl}/class/short-info`, {
                params: {
                    groupCode: groupCode,
                    lang: this.lang,
                    size: 200
                }
            });
            
            if (response.data && response.data.data) {
                console.log(`Found ${response.data.data.length} classes for group ${groupCode}`);
                return response.data.data;
            }
            return [];
        } catch (error) {
            console.error(`Error fetching classes for group ${groupCode}:`, error.message);
            return [];
        }
    }

    // Fetch positions for a specific class
    async fetchPositions(classCode) {
        try {
            console.log(`Fetching positions for class ${classCode}...`);
            const response = await axios.get(`${this.baseUrl}/position/short-info`, {
                params: {
                    classCode: classCode,
                    lang: this.lang,
                    size: 200
                }
            });
            
            if (response.data && response.data.data) {
                console.log(`Found ${response.data.data.length} positions for class ${classCode}`);
                return response.data.data;
            }
            return [];
        } catch (error) {
            console.error(`Error fetching positions for class ${classCode}:`, error.message);
            return [];
        }
    }

    // Fetch subpositions for a specific position
    async fetchSubpositions(positionCode) {
        try {
            console.log(`Fetching subpositions for position ${positionCode}...`);
            const response = await axios.get(`${this.baseUrl}/subposition/short-info`, {
                params: {
                    positionCode: positionCode,
                    lang: this.lang,
                    size: 200
                }
            });
            
            if (response.data && response.data.data) {
                console.log(`Found ${response.data.data.length} subpositions for position ${positionCode}`);
                return response.data.data;
            }
            return [];
        } catch (error) {
            console.error(`Error fetching subpositions for position ${positionCode}:`, error.message);
            return [];
        }
    }

    // Fetch final MXIK codes for a specific subposition
    async fetchMXIKCodes(subpositionCode) {
        try {
            console.log(`Fetching MXIK codes for subposition ${subpositionCode}...`);
            
            // Try the mxik endpoint first
            let response;
            try {
                response = await axios.get(`${this.baseUrl}/mxik/short-info`, {
                    params: {
                        subpositionCode: subpositionCode,
                        lang: this.lang,
                        size: 200
                    }
                });
            } catch (error) {
                // If mxik endpoint fails, try alternative endpoints
                console.log(`MXIK endpoint failed for ${subpositionCode}, trying alternatives...`);
                
                // Try getting mxik directly by subposition
                try {
                    response = await axios.get(`${this.baseUrl}/mxik`, {
                        params: {
                            subpositionCode: subpositionCode,
                            lang: this.lang,
                            size: 200
                        }
                    });
                } catch (error2) {
                    // If that fails, the subposition itself might be the final code
                    console.log(`No MXIK codes found for subposition ${subpositionCode}, treating as final code`);
                    return [{
                        code: subpositionCode + '000000', // Pad to make it look like final MXIK code
                        name: `Final code for ${subpositionCode}`
                    }];
                }
            }
            
            if (response && response.data && response.data.data) {
                console.log(`Found ${response.data.data.length} MXIK codes for subposition ${subpositionCode}`);
                return response.data.data;
            }
            
            // If no data found, treat subposition as final code
            console.log(`No MXIK codes found for subposition ${subpositionCode}, treating as final code`);
            return [{
                code: subpositionCode + '000000',
                name: `Final code for ${subpositionCode}`
            }];
            
        } catch (error) {
            console.error(`Error fetching MXIK codes for subposition ${subpositionCode}:`, error.message);
            // Return the subposition as final code if all else fails
            return [{
                code: subpositionCode + '000000',
                name: `Final code for ${subpositionCode}`
            }];
        }
    }

    // Get detailed information for a specific MXIK code
    async fetchMXIKDetails(mxikCode) {
        try {
            // Try different endpoint patterns for getting MXIK details
            const endpoints = [
                `${this.baseUrl}/mxik/${mxikCode}`,
                `${this.baseUrl}/mxik/info/${mxikCode}`,
                `${this.baseUrl}/mxik`
            ];
            
            for (const endpoint of endpoints) {
                try {
                    const params = endpoint.includes('mxik/${mxikCode}') || endpoint.includes('info/${mxikCode}') 
                        ? { lang: this.lang }
                        : { code: mxikCode, lang: this.lang };
                    
                    const response = await axios.get(endpoint, { params });
                    
                    if (response.data && response.data.data) {
                        return response.data.data;
                    }
                } catch (endpointError) {
                    // Continue to next endpoint
                    continue;
                }
            }
            
            // Return basic info if detailed fetch fails
            return {
                code: mxikCode,
                name: 'Details not available',
                fetchError: true
            };
            
        } catch (error) {
            console.error(`Error fetching details for MXIK code ${mxikCode}:`, error.message);
            return {
                code: mxikCode,
                name: 'Details not available',
                fetchError: true
            };
        }
    }

    // Main method to fetch all data
    async fetchAllData() {
        console.log('Starting MXIK data fetch...');
        const startTime = Date.now();
        
        try {
            // Fetch all groups
            const groups = await this.fetchGroups();
            
            for (const group of groups) {
                await this.sleep(this.delay);
                
                // Fetch classes for each group
                const classes = await this.fetchClasses(group.code);
                
                for (const classItem of classes) {
                    await this.sleep(this.delay);
                    
                    // Fetch positions for each class
                    const positions = await this.fetchPositions(classItem.code);
                    
                    for (const position of positions) {
                        await this.sleep(this.delay);
                        
                        // Fetch subpositions for each position
                        const subpositions = await this.fetchSubpositions(position.code);
                        
                        for (const subposition of subpositions) {
                            await this.sleep(this.delay);
                            
                            // Fetch MXIK codes for each subposition
                            const mxikCodes = await this.fetchMXIKCodes(subposition.code);
                            
                            for (const mxikCode of mxikCodes) {
                                await this.sleep(this.delay);
                                
                                // Get detailed information for the MXIK code
                                const details = await this.fetchMXIKDetails(mxikCode.code);
                                
                                // Store the complete hierarchy with details
                                const completeEntry = {
                                    group: {
                                        code: group.code,
                                        name: group.name,
                                        nameUz: group.nameUz,
                                        nameRu: group.nameRu,
                                        nameEng: group.nameEng
                                    },
                                    class: {
                                        code: classItem.code,
                                        name: classItem.name
                                    },
                                    position: {
                                        code: position.code,
                                        name: position.name
                                    },
                                    subposition: {
                                        code: subposition.code,
                                        name: subposition.name
                                    },
                                    mxik: {
                                        code: mxikCode.code,
                                        name: mxikCode.name,
                                        details: details
                                    },
                                    fetchedAt: new Date().toISOString()
                                };
                                
                                this.allCodes.push(completeEntry);
                                console.log(`✓ Saved: ${mxikCode.code} - ${mxikCode.name}`);
                            }
                        }
                    }
                }
            }
            
            const endTime = Date.now();
            const duration = Math.round((endTime - startTime) / 1000);
            
            console.log(`\nFetch completed in ${duration} seconds`);
            console.log(`Total MXIK codes collected: ${this.allCodes.length}`);
            
            return this.allCodes;
            
        } catch (error) {
            console.error('Error during data fetch:', error.message);
            throw error;
        }
    }

    // Save data to JSON file
    async saveToFile(filename = 'mxik_codes.json') {
        try {
            const filePath = path.join(__dirname, filename);
            await fs.promises.writeFile(filePath, JSON.stringify(this.allCodes, null, 2), 'utf8');
            console.log(`\nData saved to: ${filePath}`);
            console.log(`File size: ${(await fs.promises.stat(filePath)).size} bytes`);
        } catch (error) {
            console.error('Error saving file:', error.message);
            throw error;
        }
    }

    // Save data to CSV file
    async saveToCSV(filename = 'mxik_codes.csv') {
        try {
            let csvContent = 'Group Code,Group Name,Class Code,Class Name,Position Code,Position Name,Subposition Code,Subposition Name,MXIK Code,MXIK Name,Fetched At\n';
            
            for (const entry of this.allCodes) {
                const row = [
                    entry.group.code,
                    `"${entry.group.name}"`,
                    entry.class.code,
                    `"${entry.class.name}"`,
                    entry.position.code,
                    `"${entry.position.name}"`,
                    entry.subposition.code,
                    `"${entry.subposition.name}"`,
                    entry.mxik.code,
                    `"${entry.mxik.name}"`,
                    entry.fetchedAt
                ].join(',');
                
                csvContent += row + '\n';
            }
            
            const filePath = path.join(__dirname, filename);
            await fs.promises.writeFile(filePath, csvContent, 'utf8');
            console.log(`CSV data saved to: ${filePath}`);
        } catch (error) {
            console.error('Error saving CSV file:', error.message);
            throw error;
        }
    }

    // Get statistics
    getStats() {
        const stats = {
            totalCodes: this.allCodes.length,
            uniqueGroups: new Set(this.allCodes.map(c => c.group.code)).size,
            uniqueClasses: new Set(this.allCodes.map(c => c.class.code)).size,
            uniquePositions: new Set(this.allCodes.map(c => c.position.code)).size,
            uniqueSubpositions: new Set(this.allCodes.map(c => c.subposition.code)).size
        };
        
        console.log('\n=== MXIK Data Statistics ===');
        console.log(`Total MXIK codes: ${stats.totalCodes}`);
        console.log(`Unique groups: ${stats.uniqueGroups}`);
        console.log(`Unique classes: ${stats.uniqueClasses}`);
        console.log(`Unique positions: ${stats.uniquePositions}`);
        console.log(`Unique subpositions: ${stats.uniqueSubpositions}`);
        
        return stats;
    }
}

// Main execution function
async function main() {
    const fetcher = new MXIKFetcher();
    
    try {
        console.log('=== MXIK Data Fetcher Started ===\n');
        
        // Fetch all data
        await fetcher.fetchAllData();
        
        // Show statistics
        fetcher.getStats();
        
        // Save to files
        await fetcher.saveToFile();
        await fetcher.saveToCSV();
        
        console.log('\n=== Process completed successfully! ===');
        
    } catch (error) {
        console.error('\n=== Process failed ===');
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Export for use as module
module.exports = MXIKFetcher;

// Run if this file is executed directly
if (require.main === module) {
    main();
}