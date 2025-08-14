const MXIKFetcher = require('./mxics.js');
const fs = require('fs');
const path = require('path');

// Enhanced fetcher with resume capability
class EnhancedMXIKFetcher extends MXIKFetcher {
    constructor() {
        super();
        this.progressFile = 'mxik_progress.json';
        this.outputFile = 'mxik_codes_complete.json';
        this.batchSize = 10; // Save progress every N entries
        this.currentBatch = [];
    }

    // Load existing progress
    async loadProgress() {
        try {
            if (fs.existsSync(this.progressFile)) {
                const data = await fs.promises.readFile(this.progressFile, 'utf8');
                const progress = JSON.parse(data);
                this.allCodes = progress.codes || [];
                return progress.lastProcessed || {};
            }
        } catch (error) {
        }
        return {};
    }

    // Save progress incrementally
    async saveProgress(lastProcessed = {}) {
        try {
            const progress = {
                codes: this.allCodes,
                lastProcessed: lastProcessed,
                timestamp: new Date().toISOString(),
                totalCodes: this.allCodes.length
            };

            await fs.promises.writeFile(this.progressFile, JSON.stringify(progress, null, 2));
        } catch (error) {
            console.error('Error saving progress:', error.message);
        }
    }

    // Check if we should skip based on progress
    shouldSkip(groupCode, classCode, positionCode, subpositionCode, lastProcessed) {
        if (!lastProcessed.groupCode) return false;
        
        if (groupCode < lastProcessed.groupCode) return true;
        if (groupCode > lastProcessed.groupCode) return false;
        
        if (classCode && lastProcessed.classCode) {
            if (classCode < lastProcessed.classCode) return true;
            if (classCode > lastProcessed.classCode) return false;
        }
        
        if (positionCode && lastProcessed.positionCode) {
            if (positionCode < lastProcessed.positionCode) return true;
            if (positionCode > lastProcessed.positionCode) return false;
        }
        
        if (subpositionCode && lastProcessed.subpositionCode) {
            if (subpositionCode <= lastProcessed.subpositionCode) return true;
        }
        
        return false;
    }

    // Enhanced main method with resume capability
    async fetchAllDataWithResume() {
        const startTime = Date.now();
        
        // Load existing progress
        const lastProcessed = await this.loadProgress();
        
        try {
            const groups = await this.fetchGroups();
            
            for (const group of groups) {
                if (this.shouldSkip(group.code, null, null, null, lastProcessed)) {
                    continue;
                }
                
                await this.sleep(this.delay);
                
                const classes = await this.fetchClasses(group.code);
                
                for (const classItem of classes) {
                    if (this.shouldSkip(group.code, classItem.code, null, null, lastProcessed)) {
                        continue;
                    }
                    
                    await this.sleep(this.delay);
                    
                    const positions = await this.fetchPositions(classItem.code);
                    
                    for (const position of positions) {
                        if (this.shouldSkip(group.code, classItem.code, position.code, null, lastProcessed)) {
                            continue;
                        }
                        
                        await this.sleep(this.delay);
                        
                        const subpositions = await this.fetchSubpositions(position.code);
                        
                        for (const subposition of subpositions) {
                            if (this.shouldSkip(group.code, classItem.code, position.code, subposition.code, lastProcessed)) {
                                continue;
                            }
                            
                            await this.sleep(this.delay);
                            
                            const mxikCodes = await this.fetchMXIKCodes(subposition.code);
                            
                            for (const mxikCode of mxikCodes) {
                                await this.sleep(this.delay);
                                
                                const details = await this.fetchMXIKDetails(mxikCode.code);
                                
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
                                
                                // Save progress every batch
                                if (this.allCodes.length % this.batchSize === 0) {
                                    await this.saveProgress({
                                        groupCode: group.code,
                                        classCode: classItem.code,
                                        positionCode: position.code,
                                        subpositionCode: subposition.code
                                    });
                                }
                            }
                        }
                    }
                }
            }
            
            // Final save
            await this.saveProgress();
            
            const endTime = Date.now();
            const duration = Math.round((endTime - startTime) / 1000);
            
            
            return this.allCodes;
            
        } catch (error) {
            console.error('❌ Error during data fetch:', error.message);
            await this.saveProgress(); // Save progress even on error
            throw error;
        }
    }

    // Save final results
    async saveFinalResults() {
        try {
            // Save JSON
            await fs.promises.writeFile(this.outputFile, JSON.stringify(this.allCodes, null, 2));
            
            // Save CSV
            await this.saveToCSV('mxik_codes_complete.csv');
            
            // Save summary
            const summary = {
                totalCodes: this.allCodes.length,
                uniqueGroups: new Set(this.allCodes.map(c => c.group.code)).size,
                uniqueClasses: new Set(this.allCodes.map(c => c.class.code)).size,
                uniquePositions: new Set(this.allCodes.map(c => c.position.code)).size,
                uniqueSubpositions: new Set(this.allCodes.map(c => c.subposition.code)).size,
                generatedAt: new Date().toISOString()
            };
            
            await fs.promises.writeFile('mxik_summary.json', JSON.stringify(summary, null, 2));
            
        } catch (error) {
            console.error('Error saving final results:', error.message);
        }
    }
}

module.exports = EnhancedMXIKFetcher;
