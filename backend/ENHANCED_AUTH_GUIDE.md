# Enhanced Authentication System Documentation

## Overview

The authentication system has been significantly improved with enhanced security features, token management, and better error handling.

## Key Improvements Made

### 1. Enhanced `/refresh-token` Endpoint

#### Features Added:
- **User Existence Validation**: Checks if user still exists in database before issuing new token
- **User Status Checking**: Validates user account status (active/inactive/banned)
- **Fresh User Data**: Retrieves latest user data from database
- **Activity Tracking**: Updates last activity and token refresh timestamps
- **Dual Token Generation**: Issues both JWT and Firebase tokens
- **Enhanced Error Handling**: Specific error messages for different JWT error types
- **Response Standardization**: Consistent response format with status and detailed information

#### Security Enhancements:
- Validates user existence and status before token refresh
- Updates user activity tracking
- Provides detailed expiration information
- Handles specific JWT errors (expired, invalid, etc.)

### 2. Improved Token Generation

#### Enhanced `generateRefreshToken` Method:
- **Unique Token IDs (JTI)**: Each token gets a unique identifier for tracking/revocation
- **Enhanced Payload**: Includes token type, issued time, and unique identifier
- **Issuer/Audience Claims**: Adds JWT standard claims for better validation
- **Configurable Options**: Supports custom expiration times and additional claims

#### Token Structure:
```javascript
{
  uid: "user_id",
  type: "access",
  iat: 1692000000,
  jti: "1692000000-abc123def",
  iss: "gsb-app",
  aud: "gsb-users",
  exp: 1692086400
}
```

### 3. Token Blacklist Service

#### New Features:
- **Token Revocation**: Ability to blacklist specific tokens
- **User-wide Invalidation**: Invalidate all tokens for a user
- **Automatic Cleanup**: Removes expired blacklisted tokens
- **Reason Tracking**: Logs reasons for token blacklisting

#### Use Cases:
- Individual device logout
- Logout from all devices
- Security incidents
- Account compromise response

### 4. New Authentication Endpoints

#### `/logout` - Single Device Logout
```http
POST /auth/logout
Authorization: Bearer <token>
```
- Blacklists the current token
- Updates user's last logout time
- Prevents token reuse

#### `/logout-all` - Multi-Device Logout
```http
POST /auth/logout-all
Authorization: Bearer <token>
```
- Invalidates all user's tokens
- Forces re-authentication on all devices
- Updates user's token version

### 5. Enhanced Token Validation Middleware

#### New Security Checks:
- **Blacklist Verification**: Checks if token is in blacklist
- **Token Version Check**: Validates against user's token version
- **User Existence Check**: Ensures user still exists
- **Detailed Error Responses**: Specific error messages for different scenarios

#### Error Types Handled:
- `TokenExpiredError`: Token has expired
- `JsonWebTokenError`: Invalid token format
- `BlacklistedToken`: Token has been revoked
- `InvalidatedToken`: User's tokens have been invalidated

## API Usage Examples

### Refresh Token
```javascript
// Request
POST /auth/refresh-token
Authorization: Bearer <current_token>

// Response
{
  "status": "success",
  "message": "Token refreshed successfully",
  "token": "new_jwt_token",
  "firebaseToken": "new_firebase_token",
  "user": { /* user data */ },
  "expiresIn": 86400
}
```

### Logout
```javascript
// Single device logout
POST /auth/logout
Authorization: Bearer <token>

// All devices logout
POST /auth/logout-all
Authorization: Bearer <token>

// Response
{
  "status": "success",
  "message": "Logged out successfully"
}
```

## Security Benefits

### 1. **Token Revocation**
- Immediate token invalidation capability
- Prevents token reuse after logout
- Security incident response capability

### 2. **Session Management**
- Track user activity and login status
- Multi-device session control
- Forced re-authentication capability

### 3. **Enhanced Validation**
- Multiple layers of token validation
- User status and existence checks
- Automatic cleanup of expired data

### 4. **Audit Trail**
- Track token generation and revocation
- Log user authentication activities
- Monitor for suspicious patterns

## Configuration

### Environment Variables
```bash
JWT_SECRET_KEY=your_secure_secret_key
APP_ENVIRONMENT=production
```

### Token Expiration Settings
```javascript
// JWT Token: 24 hours (configurable)
// Firebase Token: As configured in Firebase
// OTP: 5 minutes
// Token Blacklist Cleanup: 1 hour intervals
```

## Database Schema Updates

### Users Collection
```javascript
{
  // ... existing fields
  lastActivity: Date,
  lastTokenRefresh: Date,
  lastLogout: Date,
  tokenVersion: Number, // For invalidating all tokens
  status: String // active, inactive, banned
}
```

### Blacklisted Tokens Collection
```javascript
{
  jti: String, // Token ID (document ID)
  blacklistedAt: Date,
  expiresAt: Date,
  reason: String
}
```

## Migration Notes

### Backward Compatibility
- Existing tokens will continue to work
- New features are additive, not breaking
- Gradual migration possible

### Recommended Steps
1. Deploy the updated code
2. Monitor token refresh patterns
3. Implement logout endpoints in client apps
4. Add token blacklist monitoring

## Best Practices

### Client Implementation
1. **Handle Token Refresh**: Implement automatic token refresh before expiration
2. **Logout Handling**: Call logout endpoint when user logs out
3. **Error Handling**: Handle specific authentication error types
4. **Token Storage**: Securely store tokens (encrypted storage, keychain)

### Server Monitoring
1. **Monitor Blacklist Size**: Track blacklisted tokens growth
2. **Failed Authentication**: Monitor suspicious authentication patterns
3. **Token Refresh Patterns**: Track normal vs. suspicious refresh patterns
4. **Cleanup Efficiency**: Monitor automatic cleanup effectiveness

## Troubleshooting

### Common Issues
1. **"Token has been revoked"**: User logged out, need to re-authenticate
2. **"Token has been invalidated"**: All user tokens invalidated, re-authenticate
3. **"User not found"**: User account may have been deleted
4. **"Account is inactive"**: User account has been deactivated

### Debug Steps
1. Check token format and signature
2. Verify user exists in database
3. Check token blacklist status
4. Validate user account status
5. Review token version mismatch
