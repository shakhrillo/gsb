# MXIK Data Fetcher

This folder contains scripts to fetch data from the MXIK (Товарная номенклатура внешнеэкономической деятельности) API.

## Scripts

### 1. `fetchMxikData.js` (Simple Version)
Basic script using Node.js built-in `https` module.

**Features:**
- Fetches data from groups 1-118
- Basic error handling
- Saves data as JSON files
- Simple progress logging

**Usage:**
```bash
npm run fetch-mxik-simple
# or
node src/scripts/fetchMxikData.js
```

### 2. `fetchMxikDataAdvanced.js` (Advanced Version)
Enhanced script using axios with advanced features.

**Features:**
- ✅ Retry logic with exponential backoff
- ✅ Progress bar with percentage
- ✅ Configurable timeouts and delays
- ✅ Detailed error logging
- ✅ Resume capability for failed groups
- ✅ Multiple execution modes
- ✅ Metadata inclusion in saved files
- ✅ Summary reports

**Usage:**

1. **Fetch all groups (1-118):**
   ```bash
   npm run fetch-mxik
   # or
   node src/scripts/fetchMxikDataAdvanced.js
   ```

2. **Fetch specific range:**
   ```bash
   node src/scripts/fetchMxikDataAdvanced.js --range 1 10
   ```

3. **Fetch specific groups:**
   ```bash
   node src/scripts/fetchMxikDataAdvanced.js --groups 1,5,10,15
   ```

4. **Get help:**
   ```bash
   node src/scripts/fetchMxikDataAdvanced.js --help
   ```

## Configuration

The advanced script includes configurable options in the `CONFIG` object:

```javascript
const CONFIG = {
  baseUrl: 'https://tasnif.soliq.uz/api/cl-api/integration-mxik/references/group/code?group=',
  maxRetries: 3,          // Maximum retry attempts
  retryDelay: 1000,       // Base delay between retries (ms)
  requestDelay: 500,      // Delay between requests (ms)
  timeout: 10000,         // Request timeout (ms)
  totalGroups: 118        // Total number of groups
};
```

## Output Structure

### Data Directory
```
backend/data/mxik/
├── group_001.json      # Group 1 data
├── group_002.json      # Group 2 data
├── ...
├── group_118.json      # Group 118 data
├── fetch_summary.json  # Execution summary
├── errors_timestamp.json    # Error log (if any failures)
└── retry_timestamp.js       # Retry script for failed groups
```

### File Format
Each group file contains:
```json
{
  "metadata": {
    "groupId": 1,
    "fetchedAt": "2025-07-12T10:30:00.000Z",
    "source": "https://tasnif.soliq.uz/api/cl-api/integration-mxik/references/group/code?group=1"
  },
  "data": {
    // Original API response data
  }
}
```

## API Information

**Base URL:** `https://tasnif.soliq.uz/api/cl-api/integration-mxik/references/group/code?group={groupId}`

**Method:** GET  
**Groups:** 1-118  
**Response:** JSON format with classification data

## Error Handling

The advanced script includes comprehensive error handling:

- **Network timeouts:** Configurable timeout with retries
- **HTTP errors:** Status code validation with detailed logging
- **Parse errors:** JSON validation with error reporting
- **Rate limiting:** Respectful delays between requests
- **Resume capability:** Failed groups can be retried separately

## Performance Notes

- **Request delay:** 500ms between requests (configurable)
- **Timeout:** 10 seconds per request (configurable)
- **Retries:** Up to 3 attempts with exponential backoff
- **Memory usage:** Files are written immediately, not stored in memory
- **Estimated time:** ~1-2 minutes for all 118 groups (depending on network)

## Troubleshooting

1. **Network issues:** Check internet connection and API availability
2. **Permission errors:** Ensure write permissions in the data directory
3. **Timeout errors:** Increase timeout value in CONFIG
4. **Rate limiting:** Increase requestDelay value in CONFIG

## Example Usage in Code

```javascript
const { fetchAllGroups, fetchSpecificGroups } = require('./fetchMxikDataAdvanced');

// Fetch all groups
await fetchAllGroups();

// Fetch specific groups
await fetchSpecificGroups([1, 5, 10]);

// Fetch custom range
await fetchAllGroups(1, 10);
```
