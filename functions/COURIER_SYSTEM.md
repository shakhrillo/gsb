# Courier Order Assignment System

This Firebase Functions implementation handles automatic courier assignment when new orders are created.

## How it works

1. **Order Creation Trigger**: When a new document is added to the `/orders` collection, the `onOrderCreated` function is triggered.

2. **Courier Notification Flow**:
   - Finds all users with `isCourier: true`
   - Gets their active push tokens from `push_tokens` collection
   - Sends notification to the first available courier
   - Sets order status to `pending_courier_acceptance`

3. **Response Handling**:
   - Courier has 2 minutes to respond
   - If courier accepts: order status → `accepted_by_courier`, `courierId` is set
   - If courier declines or timeout: moves to next courier
   - If no couriers accept: order status → `dismissed`

## API Endpoints

### Local Development
```
POST http://127.0.0.1:5001/yulda24uz/us-central1/courierOrderResponse
```

### Production (after deployment)
```
POST https://us-central1-yulda24uz.cloudfunctions.net/courierOrderResponse
```

### Courier Response Endpoint
```
POST /courierOrderResponse
Content-Type: application/json

{
  "orderId": "order_document_id",
  "courierId": "courier_user_id", 
  "action": "accept" | "decline"
}
```

### Response Format
```json
{
  "success": true,
  "message": "Order accepted successfully",
  "orderId": "order_document_id"
}
```

## Database Structure

### Orders Collection
```json
{
  "id": "order_doc_id",
  "status": "pending_courier_acceptance" | "accepted_by_courier" | "dismissed",
  "courierId": "courier_user_id", // set when accepted
  "currentCourierIndex": 0,
  "availableCouriers": ["courier1_uid", "courier2_uid"],
  "courierNotificationSentAt": "timestamp",
  "acceptedAt": "timestamp",
  "dismissedReason": "string"
}
```

### Users Collection (Couriers)
```json
{
  "uid": "user_id",
  "isCourier": true,
  "name": "Courier Name"
}
```

### Push Tokens Collection
```json
{
  "userId": "user_id",
  "pushToken": "ExponentPushToken[...]",
  "isActive": true
}
```

## Notification Payload

Couriers receive notifications with this data:
```json
{
  "type": "new_order_for_courier",
  "orderId": "order_document_id",
  "customerName": "Customer Name",
  "total": "25.99",
  "address": "Delivery Address",
  "action": "accept_decline"
}
```

## Mobile App Integration

In your mobile app, when a courier receives a notification:

1. Show order details with Accept/Decline buttons
2. On Accept/Decline, call the `courierOrderResponse` endpoint
3. Handle the response accordingly

## Testing

### Local Testing
1. Start the Firebase Functions emulator:
   ```bash
   firebase emulators:start --only functions
   ```

2. Run the test suite:
   ```bash
   cd functions
   node test-courier-system.js
   ```

### Manual Testing
You can test by:
1. Creating a new order in the `/orders` collection using Firestore console
2. Ensure you have users with `isCourier: true` and active push tokens
3. Monitor the logs to see the notification flow

## Deployment

Deploy the functions using:
```bash
firebase deploy --only functions
```

Note: If you encounter authentication issues, make sure:
1. Your Firebase project has proper billing enabled
2. All required APIs are enabled
3. Service accounts have proper permissions

## Current Status

✅ Functions are implemented and tested locally
⚠️ Deployment pending (authentication issues with Firebase project)
✅ Local emulator running successfully at http://127.0.0.1:5001
