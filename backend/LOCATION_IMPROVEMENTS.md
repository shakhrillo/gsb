# Business Location Query Improvements

## Overview

This update fixes the business location sorting and filtering issues by implementing proper support for Firestore's geospatial data types and providing multiple coordinate format compatibility.

## Problem Solved

The original issue was that business location data was stored as:
```javascript
businessLocation: {
  latitude: 40.02422651108488,
  longitude: 64.51420448720457
}
```

But the code was trying to access:
```javascript
business.location.lat
business.location.lng
```

## Changes Made

### 1. Enhanced Business Service (`business.service.js`)

#### New Methods Added:
- `getBusinessesNearLocation()` - Optimized location-based search using bounding box queries
- `createGeoPoint()` - Helper to create Firestore GeoPoint objects
- `migrateLocationDataToGeoPoint()` - Migrate existing data to GeoPoint format

#### Updated Methods:
- `getAllBusinesses()` - Now supports multiple coordinate formats
- Location filtering now handles:
  - `business.geoLocation` (Firestore GeoPoint)
  - `business.businessLocation` (current format)
  - `business.location` (legacy format)

### 2. Updated User Service (`user.service.js`)

#### Enhanced Business Registration:
- Now stores both original format and GeoPoint when registering businesses
- Backward compatibility maintained
- Future-proof for better performance

### 3. New API Endpoints (`routes/businesses.js`)

#### GET `/api/businesses/nearby`
Optimized endpoint for location-based searches:

**Parameters:**
- `lat` (required) - Center latitude
- `lng` (required) - Center longitude  
- `radius` (optional, default: 10) - Search radius in km
- `status`, `businessType`, `category`, `city`, `isVerified` - Additional filters
- `page`, `limit` - Pagination

**Example Request:**
```bash
GET /api/businesses/nearby?lat=40.024&lng=64.514&radius=5&status=active&limit=20
```

**Example Response:**
```json
{
  "businesses": [
    {
      "id": "business123",
      "businessName": "Sample Restaurant",
      "distance": 1.25,
      "businessLocation": {
        "latitude": 40.025,
        "longitude": 64.515
      },
      "status": "active"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 2,
    "totalItems": 15,
    "itemsPerPage": 10
  },
  "searchParams": {
    "center": { "latitude": 40.024, "longitude": 64.514 },
    "radius": 5,
    "filters": { "status": "active" }
  }
}
```

#### POST `/api/businesses/migrate-location`
Migration endpoint to convert existing location data to GeoPoint format for better performance.

## Technical Improvements

### 1. Multiple Coordinate Format Support
The system now supports three coordinate formats:

1. **GeoPoint (Recommended)**: `business.geoLocation`
   ```javascript
   geoLocation: new admin.firestore.GeoPoint(40.024, 64.514)
   ```

2. **Current Format**: `business.businessLocation`
   ```javascript
   businessLocation: { latitude: 40.024, longitude: 64.514 }
   ```

3. **Legacy Format**: `business.location`
   ```javascript
   location: { lat: 40.024, lng: 64.514 }
   ```

### 2. Performance Optimization
- Uses bounding box queries to reduce data transfer
- Implements client-side distance calculation for precise results
- Sorts results by distance automatically

### 3. Enhanced Distance Calculation
- Improved Haversine formula implementation
- Better handling of edge cases
- Distance included in response for transparency

## Usage Examples

### 1. Find Nearby Businesses
```javascript
// Using the new service method
const result = await businessService.getBusinessesNearLocation(
  40.024, 64.514, // lat, lng
  10,             // radius in km
  { status: 'active', businessType: 'restaurant' }, // filters
  { page: 1, limit: 20 } // pagination
);
```

### 2. Enhanced Search with Location
```javascript
// Using the enhanced getAllBusinesses method
const result = await businessService.getAllBusinesses(
  {
    circlecenter: '40.024,64.514',
    radius: 15,
    status: 'active'
  },
  { page: 1, limit: 10 },
  { sortBy: 'distance', sortOrder: 'asc' }
);
```

### 3. Register Business with GeoPoint
```javascript
// The system now automatically creates GeoPoint when registering
const businessData = {
  businessName: 'My Restaurant',
  businessLocation: {
    latitude: 40.024,
    longitude: 64.514
  }
  // ... other fields
};

// This will create both businessLocation and geoLocation fields
const result = await userService.registerBusiness(uid, businessData);
```

## Migration

### For Existing Data
Run the migration endpoint to convert existing location data:

```bash
POST /api/businesses/migrate-location
```

This will:
1. Find all businesses with `businessLocation` but no `geoLocation`
2. Create GeoPoint objects from the latitude/longitude values
3. Store them in the `geoLocation` field
4. Maintain backward compatibility

### For New Applications
New business registrations automatically create both formats, ensuring optimal performance and compatibility.

## Testing

Use the provided test script to verify functionality:

```bash
cd /path/to/backend
node src/scripts/test-location.js
```

The test script will:
1. Test the new `getBusinessesNearLocation` method
2. Test the enhanced `getAllBusinesses` method
3. Run location data migration
4. Demonstrate coordinate format compatibility

## Benefits

1. **Fixed Location Sorting**: Businesses now sort correctly by distance
2. **Better Performance**: Optimized queries reduce response times
3. **Multiple Format Support**: Backward compatible with existing data
4. **Future-Proof**: Ready for Firestore's advanced geospatial features
5. **Enhanced API**: New dedicated endpoint for location-based searches
6. **Accurate Distance**: Precise distance calculations included in results

## Notes

- All existing code continues to work without changes
- New GeoPoint format provides better performance for location queries
- Distance calculations use the Haversine formula for accuracy
- Bounding box optimization reduces unnecessary distance calculations
- Migration is safe and can be run multiple times
