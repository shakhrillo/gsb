/**
 * Migration script to convert CSV catalog to SQLite database
 * This will create a local SQLite database for faster product classification searches
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

/**
 * Parse a CSV line handling quoted fields with commas
 * @param {string} line - CSV line to parse
 * @returns {Array} - Array of field values
 */
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  fields.push(current); // Add the last field
  return fields;
}

/**
 * Migrate CSV data to SQLite database
 */
async function migrateCsvToSqlite() {
  try {
    console.log('Starting CSV to SQLite migration...');
    
    // Paths
    const csvPath = path.join(__dirname, '../../assets/catalog-excel.csv');
    const dbPath = path.join(__dirname, '../../data/catalog.db');
    
    // Ensure data directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    // Remove existing database
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log('Removed existing database');
    }
    
    // Initialize SQLite database
    const db = new Database(dbPath);
    
    // Create products table with optimized schema
    db.exec(`
      CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_name TEXT NOT NULL,
        class_name TEXT NOT NULL,
        position_name TEXT,
        sub_position_name TEXT,
        brand_name TEXT,
        attribute_name TEXT,
        mxik_code TEXT,
        mxik_name TEXT,
        international_code TEXT,
        search_text TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create indexes for fast searching
    db.exec(`
      CREATE INDEX idx_products_mxik_name ON products(mxik_name);
      CREATE INDEX idx_products_attribute_name ON products(attribute_name);
      CREATE INDEX idx_products_brand_name ON products(brand_name);
      CREATE INDEX idx_products_position_name ON products(position_name);
      CREATE INDEX idx_products_search_text ON products(search_text);
      CREATE INDEX idx_products_mxik_code ON products(mxik_code);
    `);
    
    // Enable FTS (Full-Text Search) for better text searching
    db.exec(`
      CREATE VIRTUAL TABLE products_fts USING fts5(
        mxik_name,
        attribute_name,
        brand_name,
        position_name,
        sub_position_name,
        class_name,
        group_name,
        content='products',
        content_rowid='id'
      );
    `);
    
    // Create triggers to keep FTS table in sync
    db.exec(`
      CREATE TRIGGER products_fts_insert AFTER INSERT ON products BEGIN
        INSERT INTO products_fts(
          rowid, mxik_name, attribute_name, brand_name, position_name,
          sub_position_name, class_name, group_name
        ) VALUES (
          new.id, new.mxik_name, new.attribute_name, new.brand_name,
          new.position_name, new.sub_position_name, new.class_name, new.group_name
        );
      END;
      
      CREATE TRIGGER products_fts_delete AFTER DELETE ON products BEGIN
        INSERT INTO products_fts(products_fts, rowid, mxik_name, attribute_name, brand_name, position_name, sub_position_name, class_name, group_name) 
        VALUES('delete', old.id, old.mxik_name, old.attribute_name, old.brand_name, old.position_name, old.sub_position_name, old.class_name, old.group_name);
      END;
      
      CREATE TRIGGER products_fts_update AFTER UPDATE ON products BEGIN
        INSERT INTO products_fts(products_fts, rowid, mxik_name, attribute_name, brand_name, position_name, sub_position_name, class_name, group_name) 
        VALUES('delete', old.id, old.mxik_name, old.attribute_name, old.brand_name, old.position_name, old.sub_position_name, old.class_name, old.group_name);
        INSERT INTO products_fts(
          rowid, mxik_name, attribute_name, brand_name, position_name,
          sub_position_name, class_name, group_name
        ) VALUES (
          new.id, new.mxik_name, new.attribute_name, new.brand_name,
          new.position_name, new.sub_position_name, new.class_name, new.group_name
        );
      END;
    `);
    
    // Prepare insert statement
    const insertProduct = db.prepare(`
      INSERT INTO products (
        group_name, class_name, position_name, sub_position_name,
        brand_name, attribute_name, mxik_code, mxik_name,
        international_code, search_text
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    // Read and parse CSV file
    console.log('Reading CSV file...');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n');
    
    let insertedCount = 0;
    let skippedCount = 0;
    
    // Start transaction for better performance
    const insertMany = db.transaction((items) => {
      for (const item of items) {
        insertProduct.run(item);
      }
    });
    
    const items = [];
    
    // Process CSV lines (skip header and subheader)
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      try {
        // Parse CSV line
        const fields = parseCSVLine(line);
        if (fields.length < 7) {
          skippedCount++;
          continue;
        }
        
        const groupName = fields[0]?.replace(/"/g, '').trim();
        const className = fields[1]?.replace(/"/g, '').trim();
        const positionName = fields[2]?.replace(/"/g, '').trim();
        const subPositionName = fields[3]?.replace(/"/g, '').trim();
        const brandName = fields[4]?.replace(/"/g, '').trim();
        const attributeName = fields[5]?.replace(/"/g, '').trim();
        const mxikCode = fields[6]?.replace(/"/g, '').trim();
        const mxikName = fields[7]?.replace(/"/g, '').trim();
        const internationalCode = fields[8]?.replace(/"/g, '').trim();
        
        // Only process items with valid data
        if (!groupName || !className) {
          skippedCount++;
          continue;
        }
        
        // Create search text for efficient searching (combining all searchable fields)
        const searchText = [
          mxikName,
          attributeName,
          brandName,
          positionName,
          subPositionName,
          className,
          groupName
        ].filter(text => text && text.trim()).join(' ').toLowerCase();
        
        items.push([
          groupName,
          className,
          positionName || null,
          subPositionName || null,
          brandName || null,
          attributeName || null,
          mxikCode || null,
          mxikName || null,
          internationalCode || null,
          searchText
        ]);
        
        insertedCount++;
        
        // Process in batches of 1000 for better performance
        if (items.length >= 1000) {
          insertMany(items);
          items.length = 0; // Clear the array
          console.log(`Processed ${insertedCount} items...`);
        }
        
      } catch (error) {
        console.error(`Error processing line ${i + 1}:`, error.message);
        skippedCount++;
      }
    }
    
    // Process remaining items
    if (items.length > 0) {
      insertMany(items);
    }
    
    // Close database connection
    db.close();
    
    console.log('Migration completed successfully!');
    console.log(`- Inserted: ${insertedCount} products`);
    console.log(`- Skipped: ${skippedCount} invalid records`);
    console.log(`- Database saved to: ${dbPath}`);
    console.log('- Indexes and FTS enabled for fast searching');
    
    return {
      success: true,
      insertedCount,
      skippedCount,
      dbPath
    };
    
  } catch (error) {
    console.error('Migration failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run migration if script is executed directly
if (require.main === module) {
  migrateCsvToSqlite().then(result => {
    console.log('\nMigration result:', result);
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = {
  migrateCsvToSqlite
};
