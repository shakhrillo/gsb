# Push Notifications Implementation

This document describes the complete push notification system implemented for your Node.js backend using Expo Push Notifications.

## Features

- ✅ Send individual push notifications
- ✅ Send bulk notifications to multiple users
- ✅ Custom notification messages with full control
- ✅ Order status notifications
- ✅ Delivery status notifications
- ✅ Promotional notifications with images
- ✅ Push token management (register, deactivate, cleanup)
- ✅ Push receipt checking for delivery confirmation
- ✅ Automatic retry logic and error handling
- ✅ Integration with existing order system
- ✅ Swagger API documentation

## Installation

The required package has already been installed:

```bash
npm install expo-server-sdk
```

## Configuration

1. **Environment Variables** (optional but recommended for production):

Add to your `.env` file:

```env
# Optional: Expo Access Token for enhanced security
EXPO_ACCESS_TOKEN=expo_secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Push notification settings
PUSH_NOTIFICATION_ENABLED=true
PUSH_RECEIPT_CHECK_INTERVAL=15
```

2. **Get Expo Access Token** (recommended for production):
   - Go to https://expo.dev/accounts/[your-account]/settings/access-tokens
   - Create a new access token
   - Add it to your environment variables

## API Endpoints

### Core Push Notification Endpoints

#### Send Single Notification
```http
POST /notifications/send
Content-Type: application/json

{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "title": "Hello World",
  "body": "This is a test notification",
  "data": {
    "userId": "123",
    "type": "general"
  },
  "options": {
    "sound": "default",
    "priority": "high"
  }
}
```

#### Send Bulk Notifications
```http
POST /notifications/send-bulk
Content-Type: application/json

{
  "pushTokens": [
    "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
    "ExponentPushToken[yyyyyyyyyyyyyyyyyyyyyy]"
  ],
  "title": "Special Offer",
  "body": "Get 20% off your next order!",
  "data": {
    "type": "promotion",
    "discount": 20
  }
}
```

#### Send Custom Notifications
```http
POST /notifications/send-custom
Content-Type: application/json

{
  "messages": [
    {
      "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
      "title": "Order Update",
      "body": "Your order is being prepared",
      "data": {
        "orderId": "12345",
        "status": "preparing"
      },
      "sound": "default",
      "priority": "high"
    }
  ]
}
```

#### Check Push Receipts
```http
POST /notifications/check-receipts
Content-Type: application/json

{
  "ticketIds": [
    "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
    "YYYYYYYY-YYYY-YYYY-YYYY-YYYYYYYYYYYY"
  ]
}
```

### Push Token Management

#### Register Push Token
```http
POST /notifications/register-token
Content-Type: application/json

{
  "userId": "user123",
  "pushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "deviceInfo": {
    "platform": "ios",
    "deviceId": "iPhone12",
    "deviceName": "John's iPhone",
    "osVersion": "14.5",
    "appVersion": "1.0.0"
  }
}
```

#### Get User's Push Tokens
```http
GET /notifications/user-tokens/user123
```

#### Remove Push Token
```http
DELETE /notifications/remove-token
Content-Type: application/json

{
  "userId": "user123",
  "pushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
}
```

### Specialized Notifications

#### Order Status Notification
```http
POST /notifications/order-update
Content-Type: application/json

{
  "pushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "orderId": "ORD-12345",
  "status": "preparing",
  "customerName": "John Doe",
  "data": {
    "estimatedTime": "20 minutes"
  }
}
```

#### Promotional Notification
```http
POST /notifications/promotion
Content-Type: application/json

{
  "pushTokens": [
    "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
  ],
  "title": "Flash Sale!",
  "body": "Get 30% off all items for the next 2 hours",
  "imageUrl": "https://example.com/promo-image.jpg",
  "promotionId": "FLASH30",
  "data": {
    "discount": 30,
    "validUntil": "2024-01-01T18:00:00Z"
  }
}
```

## Integration with Your App

### 1. Order System Integration

The push notification system is automatically integrated with your order system. When you:

- **Create an order**: Admins receive notifications
- **Update order status**: Customers receive status updates
- **Update delivery status**: Customers receive delivery updates
- **Cancel an order**: Customers receive cancellation notifications

### 2. User Registration Flow

When a user registers or logs in to your app:

```javascript
// In your mobile app (React Native/Expo)
import * as Notifications from 'expo-notifications';

// Get the push token
const token = (await Notifications.getExpoPushTokenAsync()).data;

// Register it with your backend
await fetch('/notifications/register-token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`
  },
  body: JSON.stringify({
    userId: user.id,
    pushToken: token,
    deviceInfo: {
      platform: Platform.OS,
      deviceName: Device.deviceName,
      osVersion: Device.osVersion,
      appVersion: Application.nativeApplicationVersion
    }
  })
});
```

### 3. Handling Notifications in Your Mobile App

```javascript
// Set up notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Listen for notifications
const notificationListener = Notifications.addNotificationReceivedListener(notification => {
  const data = notification.request.content.data;
  
  // Handle different notification types
  switch (data.type) {
    case 'order_status_update':
      // Navigate to order details
      navigation.navigate('OrderDetails', { orderId: data.orderId });
      break;
    case 'promotion':
      // Navigate to promotion details
      navigation.navigate('Promotion', { promotionId: data.promotionId });
      break;
    default:
      // Handle general notifications
      break;
  }
});
```

## Error Handling

The system includes comprehensive error handling:

- **Invalid push tokens**: Automatically filtered out
- **Network failures**: Retry logic with exponential backoff
- **Rate limiting**: Built-in throttling (max 600 notifications/second)
- **Receipt checking**: Automatic validation of delivery status
- **Token cleanup**: Automatic removal of inactive/invalid tokens

## Monitoring and Maintenance

### Receipt Checking

The system automatically checks push receipts every 15 minutes to ensure delivery and handle errors:

- **DeviceNotRegistered**: Tokens are automatically deactivated
- **MessageTooBig**: Logged for investigation
- **MessageRateExceeded**: Automatic backoff applied
- **InvalidCredentials**: Logged for admin attention

### Token Cleanup

Run periodic cleanup to remove old tokens:

```http
POST /notifications/cleanup-tokens
```

### Monitoring Push Notification Health

You can monitor the health of your push notification system by:

1. Checking server logs for errors
2. Monitoring receipt checking results
3. Tracking notification delivery rates
4. Setting up alerts for failed notifications

## Best Practices

1. **Always validate push tokens** before sending notifications
2. **Handle errors gracefully** - don't fail business operations if notifications fail
3. **Respect user preferences** - allow users to opt out of certain notification types
4. **Use appropriate priorities**:
   - `high`: Order updates, delivery notifications
   - `normal`: Promotions, general announcements
5. **Include relevant data** in notifications for deep linking
6. **Test thoroughly** on both iOS and Android devices
7. **Monitor delivery receipts** regularly
8. **Clean up old tokens** periodically

## Testing

You can test the push notification system using:

1. **Swagger UI**: Available at `/api-docs` endpoint
2. **Postman/cURL**: Use the example requests above
3. **Your mobile app**: Integrate the endpoints and test end-to-end

## Troubleshooting

### Common Issues

1. **"Invalid push token format"**
   - Ensure you're using a valid Expo push token
   - Check that the token starts with `ExponentPushToken[`

2. **"No notifications received"**
   - Verify the push token is registered correctly
   - Check that the device has notifications enabled
   - Ensure the app is configured for push notifications

3. **"Network errors"**
   - Check your internet connection
   - Verify Expo's push service is operational
   - Check for rate limiting

4. **"DeviceNotRegistered errors"**
   - This is normal when users uninstall the app
   - The system automatically deactivates these tokens

### Debug Mode

You can enable debug logging by setting:

```env
NODE_ENV=development
```

This will provide detailed logs for debugging push notification issues.

## Security Considerations

1. **Use access tokens** in production for enhanced security
2. **Validate user permissions** before sending notifications
3. **Sanitize notification content** to prevent injection attacks
4. **Rate limit** notification sending per user
5. **Audit notification logs** regularly

## Support

For questions or issues with the push notification system:

1. Check the server logs for error details
2. Review the Expo Push Notification documentation
3. Verify your push notification credentials
4. Test with a simple notification first

The system is designed to be robust and handle failures gracefully, so most issues are related to configuration or network connectivity.
