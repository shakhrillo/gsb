# Staff Management Migration Guide

## Overview

Staff management has been moved from the merchant-based system to a business-based system. This provides better organization and supports the new multi-business structure.

## Key Changes

### Old Structure (Deprecated)
```
POST   /merchants/:uid/staff      - Add staff to merchant
GET    /merchants/:uid/staff      - Get merchant staff
PUT    /merchants/:uid/staff/:id  - Update staff
DELETE /merchants/:uid/staff/:id  - Remove staff
```

### New Structure (Recommended)
```
POST   /businesses/:businessId/staff/:staffId - Add staff to business
GET    /businesses/:businessId/staff         - Get business staff
PUT    /businesses/:businessId/staff/:staffId - Update staff
DELETE /businesses/:businessId/staff/:staffId - Remove staff
```

## Migration Steps

### 1. Run Staff Migration
```bash
cd backend/src/scripts
node migrate-staff-to-business.js migrate
```

### 2. Update Client Code

#### Before (Old merchant-based)
```javascript
// Add staff to merchant
const response = await fetch(`/merchants/${merchantUid}/staff`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phone: '+1234567890',
    name: 'John Doe',
    role: 'seller'
  })
});
```

#### After (New business-based)
```javascript
// Add staff to specific business
const response = await fetch(`/businesses/${businessId}/staff`, {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}` // Authentication required
  },
  body: JSON.stringify({
    phone: '+1234567890',
    name: 'John Doe',
    role: 'seller'
  })
});
```

## Database Structure Changes

### Staff User Document (Updated)
```javascript
{
  uid: "staff123",
  name: "John Doe",
  phone: "+1234567890",
  role: "seller", // seller, manager, cashier, cook, delivery
  
  // New business-based fields
  businessId: "business123",
  businessName: "My Restaurant",
  ownerId: "owner123",
  
  // Legacy fields (kept for backward compatibility)
  merchantUid: "owner123",
  
  // Standard fields
  isStaff: true,
  isActive: true,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## Benefits of New Structure

### 1. Multi-Business Support
- Staff can be associated with specific businesses
- Better organization for merchants with multiple businesses
- Clearer permission boundaries

### 2. Enhanced Security
- Staff can only access their assigned business
- Business owners can only manage their own staff
- Authentication required for all operations

### 3. Better Role Management
- Expanded role options: seller, manager, cashier, cook, delivery
- Role-based permissions can be implemented per business
- Future support for custom roles

### 4. Improved Analytics
- Track staff performance per business
- Better reporting and insights
- Business-specific staff metrics

## API Examples

### Add Staff Member
```bash
curl -X POST /businesses/business123/staff \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "phone": "+1234567890",
    "name": "John Doe",
    "role": "seller"
  }'
```

### Get Staff Members
```bash
curl -X GET /businesses/business123/staff \
  -H "Authorization: Bearer your-token"
```

### Update Staff Member
```bash
curl -X PUT /businesses/business123/staff/staff123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "name": "John Smith",
    "role": "manager",
    "isActive": true
  }'
```

### Remove Staff Member
```bash
curl -X DELETE /businesses/business123/staff/staff123 \
  -H "Authorization: Bearer your-token"
```

## Error Handling

The new API provides better error messages:

```javascript
// Unauthorized access
{
  "error": "Unauthorized: You can only add staff to your own businesses"
}

// Invalid role
{
  "error": "Invalid role. Valid roles: seller, manager, cashier, cook, delivery"
}

// Business not found
{
  "error": "Business not found"
}

// Staff already exists
{
  "error": "User is already staff for this business"
}
```

## Rollback Plan

If you need to rollback the migration:

```bash
node migrate-staff-to-business.js rollback
```

This will remove the business associations and revert to the old structure.

## Testing

### Validate Migration
```bash
node migrate-staff-to-business.js validate
```

### Test New Endpoints
Use the API examples above to test that staff management works correctly with the new business structure.

## Support

For any issues during migration, check:
1. Staff members have valid `merchantUid` values
2. Corresponding businesses exist for each merchant
3. Business status is `active` (preferred) or any other valid status
4. Authentication tokens are valid for API calls
