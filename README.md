# MXIK Data Fetcher 🇺🇿

A Node.js script to fetch and organize MXIK (Mahsulot va Xizmatlarni Identifikatsiyalash Kodlari) data from the Uzbekistan Tax Classification API.

## Overview

This tool fetches the complete hierarchy of Uzbekistan's tax classification system from the official API at `https://tasnif.soliq.uz/api/cls-api/` and saves it in multiple formats for easy use.

## Hierarchy Structure

The MXIK classification follows this hierarchy:
```
Group → Class → Position → Subposition → MXIK Code
  001 → 00101 → 00101001 → 00101001001 → 00101001001000000
```

Example:
- **Group 001**: TIRIK HAYVONLAR (Live Animals)
- **Class 00101**: Tirik otlar, eshaklar (Live horses, donkeys)
- **Position 00101001**: Tirik otlar va eshaklar (Live horses and donkeys)
- **Subposition 00101001001**: Tirik otlar (Live horses)
- **MXIK Code**: 00101001001000000

## Features

✅ **Complete data extraction** - Fetches all groups, classes, positions, subpositions and final MXIK codes  
✅ **Resume capability** - Can stop and restart from where it left off  
✅ **Progress saving** - Saves progress every 10 entries  
✅ **Multiple output formats** - JSON and CSV  
✅ **Complete hierarchy preservation** - Maintains full classification tree  
✅ **Error handling** - Robust error handling and retry logic  
✅ **Rate limiting** - Respects server limits with delays between requests  

## Installation

1. Make sure you have Node.js installed
2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Quick Start
```bash
# View available commands
node help.js

# Test the API connection
node test-mxics.js

# Fetch sample data (first 2 groups)
node sample-mxik-fetch.js

# Fetch complete dataset
node run-mxik-fetch.js
```

### Commands

| Command | Description |
|---------|-------------|
| `node help.js` | Show help and current status |
| `node test-mxics.js` | Test API connection and fetch a single example |
| `node sample-mxik-fetch.js` | Fetch first 2 groups as sample (144 codes) |
| `node run-mxik-fetch.js` | Fetch complete MXIK database |

### Output Files

| File | Description |
|------|-------------|
| `mxik_sample.json` | Sample data from first 2 groups |
| `mxik_sample.csv` | Sample data in CSV format |
| `mxik_codes_complete.json` | Complete MXIK database |
| `mxik_codes_complete.csv` | Complete data in CSV format |
| `mxik_progress.json` | Progress file for resume capability |
| `mxik_summary.json` | Statistics and summary |

## Data Structure

Each MXIK entry contains:

```json
{
  "group": {
    "code": "001",
    "name": "TIRIK HAYVONLAR",
    "nameUz": "ТИРИК ҲАЙВОНЛАР",
    "nameRu": "ЖИВЫЕ ЖИВОТНЫЕ",
    "nameEng": "1"
  },
  "class": {
    "code": "00101",
    "name": "Tirik otlar, eshaklar"
  },
  "position": {
    "code": "00101001",
    "name": "Tirik otlar va eshaklar"
  },
  "subposition": {
    "code": "00101001001",
    "name": "Tirik otlar"
  },
  "mxik": {
    "code": "00101001001000000",
    "name": "Final code for 00101001001",
    "details": { /* additional details */ }
  },
  "fetchedAt": "2025-08-14T10:30:00.000Z"
}
```

## Resume Capability

The fetcher can be stopped (Ctrl+C) and restarted. It will automatically resume from where it left off using the progress file.

```bash
# Start fetching
node run-mxik-fetch.js

# Stop with Ctrl+C
# Restart - it will resume automatically
node run-mxik-fetch.js
```

## Error Handling

- **Network errors**: Automatically retried with exponential backoff
- **API errors**: Gracefully handled with fallback strategies
- **Missing data**: Subpositions treated as final codes when no MXIK codes found
- **Progress preservation**: All progress saved even on errors

## Rate Limiting

The script includes built-in delays (100ms between requests) to avoid overwhelming the server. This can be adjusted in the code if needed.

## API Source

Data is fetched from the official Uzbekistan State Tax Committee API:
- Base URL: `https://tasnif.soliq.uz/api/cls-api/`
- Language: `uz_latn` (Uzbek Latin)

## Example Usage in Your Project

```javascript
const MXIKFetcher = require('./mxics.js');

async function findProduct() {
    // Load the complete dataset
    const fs = require('fs');
    const mxikData = JSON.parse(fs.readFileSync('mxik_codes_complete.json'));
    
    // Search for specific products
    const horses = mxikData.filter(item => 
        item.subposition.name.toLowerCase().includes('ot') ||
        item.class.name.toLowerCase().includes('ot')
    );
    
    console.log('Horse-related MXIK codes:', horses);
}
```

## Statistics

After running the sample fetch:
- **Sample data**: 144 MXIK codes from first 2 groups
- **File size**: ~105KB JSON, ~30KB CSV
- **Time**: ~2-3 minutes for sample
- **Complete dataset**: Estimated 10,000+ codes (varies)

## License

MIT License - Feel free to use for any purpose.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Support

If you encounter any issues:
1. Check the error messages in the console
2. Look at the progress file for resume information
3. Try running the sample fetch first
4. Ensure stable internet connection

---

Made with ❤️ for the Uzbekistan developer community
