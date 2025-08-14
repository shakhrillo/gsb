# MXIK Firebase Upload Guide

This guide explains how to upload your MXIK (Товарная номенклатура внешнеэкономической деятельности) data to Firebase Firestore.

## Files Created

1. **`upload-mxik-to-firebase.js`** - Main upload script with full functionality
2. **`quick-upload-mxik.js`** - Simple script for quick uploads
3. **Updated `package.json`** - Added convenient npm scripts

## Quick Start

### Option 1: Using npm scripts (Recommended)

```bash
# Upload MXIK data to Firebase (will fail if collection already has data)
npm run upload-mxik

# Force upload (overwrites existing data)
npm run upload-mxik-force

# Clear all MXIK data from Firebase
npm run clear-mxik
```

### Option 2: Using Node.js directly

```bash
# Basic upload
node quick-upload-mxik.js

# Force upload (overwrites existing data)
node quick-upload-mxik.js --force

# Clear collection
node upload-mxik-to-firebase.js --clear
```

## What Gets Uploaded

The script reads your `mxik_progress.json` file and uploads the data to a Firestore collection called `mxik_codes`. Each document includes:

- **Group data**: code, name, nameUz, nameRu, nameEng
- **Class data**: code, name
- **Position data**: code, name
- **Subposition data**: code, name
- **MXIK data**: code, name, details (with fetchError flag)
- **Timestamps**: fetchedAt, createdAt, updatedAt

## Data Cleaning

The script automatically:
- ✅ Filters out incomplete entries
- ✅ Validates data structure
- ✅ Adds timestamps
- ✅ Handles missing fields gracefully
- ✅ Skips entries without critical data

## Firebase Collection Structure

```
mxik_codes/
├── {auto-generated-id}/
│   ├── group: { code, name, nameUz, nameRu, nameEng }
│   ├── class: { code, name }
│   ├── position: { code, name }
│   ├── subposition: { code, name }
│   ├── mxik: { code, name, details: { code, name, fetchError } }
│   ├── fetchedAt: "2025-08-13T20:28:29.732Z"
│   ├── createdAt: "2025-08-14T..."
│   └── updatedAt: "2025-08-14T..."
```

## Environment Setup

Make sure you have your Firebase environment variables set up in your `.env` file:

```env
APP_FIREBASE_PROJECT_ID=your-project-id
TYPE=service_account
PROJECT_ID=your-project-id
PRIVATE_KEY_ID=your-private-key-id
PRIVATE_KEY=your-private-key
CLIENT_EMAIL=your-client-email
CLIENT_ID=your-client-id
AUTH_URI=https://accounts.google.com/o/oauth2/auth
TOKEN_URI=https://oauth2.googleapis.com/token
AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
CLIENT_X509_CERT_URL=your-cert-url
UNIVERSE_DOMAIN=googleapis.com
```

## Example Output

```bash
$ npm run upload-mxik

🚀 Starting MXIK data upload to Firebase...

=== MXIK Firebase Upload Started ===

Collection 'mxik_codes' status:
- Exists: false
- Document count: 0

Loading MXIK data from file...
Found 591 MXIK codes to upload
Starting upload to Firestore...
Processing batch 1/6
Batch committed: 100 documents uploaded so far
Processing batch 2/6
Batch committed: 200 documents uploaded so far
...

=== Upload Summary ===
Total entries processed: 591
Successfully uploaded: 525
Skipped (invalid): 66
Collection: mxik_codes

✅ MXIK upload completed successfully!

🎉 Success!
📊 Statistics:
   - Total processed: 591
   - Successfully uploaded: 525
   - Skipped (invalid): 66
   - Collection: mxik_codes

🔗 View your data in Firebase Console:
   https://console.firebase.google.com/project/your-project-id/firestore/data/mxik_codes
```

## Troubleshooting

### Error: Collection already contains data

If you see this error, it means the `mxik_codes` collection already has documents. You have two options:

1. **Force overwrite**: Use `npm run upload-mxik-force`
2. **Clear first**: Use `npm run clear-mxik` then `npm run upload-mxik`

### Error: Firebase connection issues

Make sure:
- Your `.env` file has correct Firebase credentials
- Your Firebase project has Firestore enabled
- Your service account has proper permissions

### Error: File not found

Make sure `mxik_progress.json` exists in the root directory of your project.

## Advanced Usage

### Using the MxikFirebaseUploader class directly

```javascript
const MxikFirebaseUploader = require('./upload-mxik-to-firebase');

const uploader = new MxikFirebaseUploader();

// Upload with custom options
uploader.uploadMxikData({ overwrite: true })
  .then(result => {
    console.log('Upload result:', result);
  })
  .catch(error => {
    console.error('Upload error:', error);
  });

// Clear collection
uploader.clearCollection()
  .then(result => {
    console.log('Clear result:', result);
  });

// Get collection info
uploader.getCollectionInfo()
  .then(info => {
    console.log('Collection info:', info);
  });
```

## Security Notes

- The script uses your Firebase admin credentials
- Data is uploaded to Firestore with your service account permissions
- Make sure your Firestore security rules are properly configured
- Consider the costs of Firestore reads/writes for large datasets

## Next Steps

After uploading the data, you can:
1. View it in the Firebase Console
2. Query it from your applications
3. Set up indexes for better query performance
4. Create API endpoints to serve the MXIK data
5. Implement search functionality

Happy coding! 🚀
