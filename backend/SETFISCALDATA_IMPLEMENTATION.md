# SetFiscalData Implementation Guide

## Overview

The `SetFiscalData` method has been implemented to handle fiscal data from Payme for receipt fiscalization. This method allows merchants to receive and store fiscal receipt data after a transaction has moved to a successful status.

## Implementation Details

### 1. Enum Updates

Added `SetFiscalData` to the `PaymeMethod` enum in `/backend/src/enum/transaction.enum.js`:

```javascript
exports.PaymeMethod = {
    CheckPerformTransaction: 'CheckPerformTransaction',
    CheckTransaction: 'CheckTransaction',
    CreateTransaction: 'CreateTransaction',
    PerformTransaction: 'PerformTransaction',
    CancelTransaction: 'CancelTransaction',
    SetFiscalData: 'SetFiscalData',  // ← New method added
    GetStatement: 'GetStatement',
}
```

### 2. Controller Implementation

Added case handling in `/backend/src/controllers/transaction.controller.js`:

```javascript
case PaymeMethod.SetFiscalData: {
    const result = await transactionService.SetFiscalData(params, id)
    return res.json({ result, id })
}
```

### 3. Service Implementation

Implemented the main business logic in `/backend/src/services/transaction.service.js`:

#### Key Features:

- **Transaction Validation**: Checks if the transaction exists in the database
- **Type Validation**: Supports both "PERFORM" and "CANCEL" fiscal data types
- **Data Storage**: Stores fiscal data in the transaction document with proper structure
- **Error Handling**: Implements proper Payme error codes for various scenarios

#### Data Structure:

The fiscal data is stored in the transaction document with the following structure:

```javascript
{
    fiscal: {
        perform_data: {
            receipt_id: 121,
            status_code: 0,
            message: "accepted",
            terminal_id: "EP000000000025",
            fiscal_sign: "800031554082",
            qr_code_url: "fiscal receipt url",
            date: "20220706221021",
            timestamp: 1658876421000
        },
        cancel_data: {
            receipt_id: 123,
            status_code: 0,
            message: "accepted",
            terminal_id: "EP000000000025",
            fiscal_sign: "900031555055",
            qr_code_url: "fiscal receipt url",
            date: "20220706231125",
            timestamp: 1658880685000
        }
    },
    last_fiscal_update: 1658880685000
}
```

## Request Examples

### PERFORM Type Request:

```json
{
    "method": "SetFiscalData",
    "params": {
        "id": "61396aaed8b87a4c215ae556",
        "type": "PERFORM",
        "fiscal_data": {
            "receipt_id": 121,
            "status_code": 0,
            "message": "accepted",
            "terminal_id": "EP000000000025",
            "fiscal_sign": "800031554082",
            "qr_code_url": "fiscal receipt url",
            "date": "20220706221021"
        }
    }
}
```

### CANCEL Type Request:

```json
{
    "method": "SetFiscalData",
    "params": {
        "id": "61396aaed8b87a4c215ae556",
        "type": "CANCEL",
        "fiscal_data": {
            "receipt_id": 123,
            "status_code": 0,
            "message": "accepted",
            "terminal_id": "EP000000000025",
            "fiscal_sign": "800031554082",
            "qr_code_url": "fiscal receipt url",
            "date": "20220706221021"
        }
    }
}
```

## Response Examples

### Success Response:

```json
{
    "result": {
        "success": true
    }
}
```

### Error Responses:

#### Transaction Not Found:
```json
{
    "error": {
        "code": -32001,
        "message": "Чек с таким id не найден"
    }
}
```

#### Invalid Parameters:
```json
{
    "error": {
        "code": -32602,
        "message": "Не валидные параметры"
    }
}
```

#### Invalid JSON:
```json
{
    "error": {
        "code": -32700,
        "message": "Отправлен не валидный JSON объект"
    }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| -32001 | Transaction with this ID not found |
| -32700 | Invalid JSON object sent |
| -32602 | Invalid parameters |

## Usage Notes

1. **Optional Implementation**: This method is not mandatory to implement
2. **Dual Storage**: The method supports storing both PERFORM and CANCEL fiscal data separately
3. **Timestamp Tracking**: Each fiscal data entry includes a timestamp for tracking
4. **Validation**: All required parameters are validated before processing
5. **Error Handling**: Comprehensive error handling with proper Payme error codes

## Testing

A test file has been created at `/backend/test-setfiscaldata.js` that demonstrates the usage of the SetFiscalData method. The test includes examples for both PERFORM and CANCEL types.

To run the test (requires valid Firebase configuration):

```bash
cd backend
node test-setfiscaldata.js
```

## Integration

The SetFiscalData method is now fully integrated into the existing Payme payment flow and will automatically handle fiscal data requests from Payme's system after successful transactions.
