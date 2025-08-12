# Multi-Business Support Implementation

## Overview

This implementation refactors the merchant system to sup### 4. Business-Based Staff Ma### 3. Validate Migrations
```bash
# Validate business migration
node migrate-merchants-to-businesses.js validate

# Validate staff migration
node migrate-staff-to-business.js validate
```

### 4. Update Client Applicationsnt
- Staff members are now associated with specific businesses
- Better role management and permissions
- Support for staff working in multiple businesses (if needed)
- Improved staff analytics per business

### 5. Enhanced Admin Controlort multiple businesses per user. Instead of storing business data directly on user documents, we now use a separate `businesses` collection where each business is its own document.

## Key Changes

### 1. New Database Structure

#### Users Collection
```javascript
{
  uid: "user123",
  name: "John Doe",
  email: "john@example.com",
  phone: "+1234567890",
  hasBusiness: true, // New field indicating user has at least one business
  createdAt: timestamp,
  updatedAt: timestamp,
  // Legacy fields kept for backward compatibility (can be removed later)
  isMerchant: true,
  merchantRequestStatus: "active"
}
```

#### Businesses Collection (New)
```javascript
{
  businessId: "business123",
  ownerId: "user123", // Reference to user
  businessName: "My Business",
  businessType: "restaurant",
  businessLocation: {
    latitude: 40.7128,
    longitude: -74.0060
  },
  innPinfl: "123456789",
  bankAccount: "20208000000000000000",
  mfoCode: "00014",
  businessLicenseUrl: "https://example.com/license.pdf",
  directorPassportUrl: "https://example.com/passport.pdf",
  businessLogoUrl: "https://example.com/logo.png",
  status: "active", // pending, active, rejected, inactive
  requestDate: timestamp,
  approvedAt: timestamp, // When approved
  rejectedAt: timestamp, // When rejected
  rejectionReason: "Incomplete documents", // If rejected
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 2. New API Endpoints

#### Business Management
- `POST /businesses` - Register a new business
- `GET /businesses` - Get all businesses (admin) with filtering
- `GET /businesses/my` - Get current user's businesses
- `GET /businesses/:businessId` - Get business by ID
- `PUT /businesses/:businessId` - Update business (owner only)
- `DELETE /businesses/:businessId` - Deactivate business (owner only)
- `PUT /businesses/:businessId/approve` - Approve business (admin)
- `PUT /businesses/:businessId/reject` - Reject business (admin)

#### Staff Management (New)
- `POST /businesses/:businessId/staff` - Add staff member to business
- `GET /businesses/:businessId/staff` - Get staff members for business
- `PUT /businesses/:businessId/staff/:staffId` - Update staff member
- `DELETE /businesses/:businessId/staff/:staffId` - Remove staff member
- `GET /businesses/staff/all` - Get all staff members (admin)

#### Backward Compatibility
The existing `/merchants` endpoints continue to work but now use the new business structure internally. **Note**: Staff management endpoints have been moved from `/merchants/:uid/staff` to `/businesses/:businessId/staff` for better organization and multi-business support.

### 3. Service Layer Updates

#### UserService
- `registerBusiness(uid, businessData)` - Register new business
- `getUserBusinesses(uid, status?)` - Get user's businesses
- `updateBusinessStatus(businessId, status, reason?)` - Admin approval/rejection
- `checkMerchantStatus(uid)` - Check if user has active businesses
- `requestMerchantStatus(uid, merchantData)` - Backward compatibility wrapper

#### BusinessService (New)
- `getAllBusinesses(filters, pagination)` - Get businesses with filtering
- `getBusinessById(businessId)` - Get business details
- `updateBusiness(businessId, updates, ownerId)` - Update business info
- `deleteBusiness(businessId, ownerId)` - Deactivate business
- `getBusinessesByOwner(ownerId)` - Get user's businesses with stats

#### StaffService (New)
- `addStaffMember(businessId, ownerId, staffData)` - Add staff to business
- `getStaffMembers(businessId, ownerId)` - Get business staff
- `updateStaffMember(businessId, staffId, ownerId, updates)` - Update staff
- `removeStaffMember(businessId, staffId, ownerId)` - Remove staff
- `getAllStaffMembers(filters, pagination)` - Get all staff (admin)

## Benefits

### 1. Multiple Businesses Support
- Users can now register and manage multiple businesses
- Each business has its own approval workflow
- Independent business status management

### 2. Better Data Organization
- Cleaner separation of user and business data
- More scalable database structure
- Easier to query and filter businesses

### 3. Enhanced Admin Control
- Approve/reject individual businesses
- Better filtering and search capabilities
- Detailed business analytics

### 4. Backward Compatibility
- Existing merchant endpoints still work
- Legacy fields preserved during transition
- Gradual migration path

## Migration Process

### 1. Run Migration Script
```bash
cd backend/src/scripts
node migrate-merchants-to-businesses.js migrate
```

### 2. Migrate Staff to Business Structure
```bash
cd backend/src/scripts
node migrate-staff-to-business.js migrate
```

### 3. Validate Migrations
```bash
node migrate-merchants-to-businesses.js validate
```

### 3. Update Client Applications
Update your frontend/mobile apps to use the new business endpoints for better functionality.

### 4. Clean Up (Optional)
After all clients are updated, you can remove legacy fields from the user documents.

## Example Usage

### Register a New Business
```javascript
// POST /businesses
{
  "businessName": "My Restaurant",
  "businessType": "restaurant",
  "businessLocation": {
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "innPinfl": "123456789",
  "bankAccount": "20208000000000000000",
  "mfoCode": "00014",
  "businessLicenseUrl": "https://example.com/license.pdf",
  "directorPassportUrl": "https://example.com/passport.pdf",
  "businessLogoUrl": "https://example.com/logo.png"
}
```

### Get User's Businesses
```javascript
// GET /businesses/my
{
  "businesses": [
    {
      "id": "business123",
      "businessName": "My Restaurant",
      "status": "active",
      // ... other fields
    }
  ],
  "stats": {
    "total": 2,
    "active": 1,
    "pending": 1,
    "rejected": 0,
    "inactive": 0
  }
}
```

### Add Staff to Business
```javascript
// POST /businesses/:businessId/staff
{
  "phone": "+1234567890",
  "name": "John Doe",
  "role": "seller"
}

// Response
{
  "message": "Staff member added successfully",
  "staff": {
    "uid": "1234567890",
    "name": "John Doe",
    "role": "seller",
    "businessId": "business123",
    "businessName": "My Restaurant",
    "isStaff": true,
    "isActive": true
  }
}
```

### Get Business Staff
```javascript
// GET /businesses/:businessId/staff
{
  "staffMembers": [
    {
      "uid": "1234567890",
      "name": "John Doe",
      "role": "seller",
      "businessId": "business123",
      "isStaff": true,
      "isActive": true
    }
  ],
  "count": 1
}
```

### Update Staff Member
```javascript
// PUT /businesses/:businessId/staff/:staffId
{
  "name": "John Smith",
  "role": "manager",
  "isActive": true
}
```
```javascript
### Admin Business Management
```javascript
// GET /businesses?status=pending&page=1&limit=10
{
  "businesses": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 50,
    "itemsPerPage": 10,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}

// PUT /businesses/:businessId/approve
{
  "message": "Business approved successfully"
}

// PUT /businesses/:businessId/reject
{
  "reason": "Incomplete documentation"
}
```
```

## Security Considerations

1. **Authorization**: Users can only modify their own businesses
2. **Validation**: Strict validation of business data
3. **Unique Constraints**: INN/PINFL uniqueness enforced
4. **Admin Controls**: Separate endpoints for admin actions

## Future Enhancements

1. **Business Categories**: More detailed business categorization
2. **Business Verification**: Multi-step verification process
3. **Business Analytics**: Detailed business performance metrics
4. **Business Relationships**: Support for business partnerships/chains
5. **Role-Based Access**: Different permission levels within businesses

## Rollback Plan

If issues arise, you can rollback using:
```bash
node migrate-merchants-to-businesses.js rollback
```

This will remove migrated businesses and restore the original merchant structure.
