# Paypack Integration Guide

## Overview

This guide covers the complete Paypack payment integration for your e-commerce platform. Paypack enables mobile money payments through MTN Mobile Money and Airtel Money in Rwanda.

## Environment Setup

### Required Environment Variables

Add these to your `.env` file:

```bash
# Paypack Configuration
PAYPACK_ENVIRONMENT=sandbox  # 'sandbox' for testing, 'production' for live
PAYPACK_CLIENT_ID=your_paypack_client_id_here
PAYPACK_CLIENT_SECRET=your_paypack_client_secret_here
PAYPACK_CALLBACK_URL=https://your-domain.com/api/payments/webhook/paypack
```

### Getting Paypack Credentials

1. Visit [Paypack Dashboard](https://dashboard.paypack.rw)
2. Create an account or sign in
3. Navigate to API Settings
4. Generate your Client ID and Client Secret
5. Configure your webhook URL

## API Integration

### 1. Process Payment

**Endpoint**: `POST /api/payments/process`

**Request Body**:
```json
{
  "orderId": "order_123456",
  "phoneNumber": "250781234567",
  "paymentMethod": "PAYPACK"
}
```

**Response**:
```json
{
  "status": "success",
  "message": "Payment initiated successfully",
  "data": {
    "success": true,
    "transactionId": "TXN-123456789",
    "reference": "uuid-reference",
    "status": "PENDING",
    "message": "Customer will receive a prompt to approve the payment"
  }
}
```

### 2. Verify Payment

**Endpoint**: `GET /api/payments/verify/:transactionId`

**Response**:
```json
{
  "status": "success",
  "data": {
    "isValid": true,
    "status": "SUCCESSFUL",
    "amount": 5000,
    "currency": "RWF",
    "transactionId": "TXN-123456789",
    "completedAt": "2024-01-15T10:30:00Z"
  }
}
```

### 3. Get Payment Methods

**Endpoint**: `GET /api/payments/methods`

**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "id": "PAYPACK",
      "name": "Paypack",
      "description": "Pay with MTN Mobile Money or Airtel Money through Paypack",
      "requiresPhone": true,
      "currencies": ["RWF"],
      "supportedNetworks": ["MTN Mobile Money", "Airtel Money"],
      "isActive": true
    }
  ]
}
```

## Supported Phone Number Formats

The system automatically formats and validates phone numbers for:

### MTN Mobile Money
- `250781234567` (international format)
- `0781234567` (local format) 
- `781234567` (short format)
- `250791234567` (079 prefix)

### Airtel Money
- `250721234567` (072 prefix)
- `250731234567` (073 prefix)

## Webhook Integration

Paypack will send payment status updates to your webhook endpoint:

**Endpoint**: `POST /api/payments/webhook/paypack`

**Webhook Payload**:
```json
{
  "ref": "TXN-123456789",
  "status": "successful",
  "kind": "CASHIN",
  "phone": "250781234567",
  "amount": 5000,
  "currency": "RWF",
  "fee": 50,
  "created_at": "2024-01-15T10:30:00Z"
}
```

## Testing Guide

### 1. Test Environment Setup

Ensure you're using sandbox credentials:
```bash
PAYPACK_ENVIRONMENT=sandbox
```

### 2. Test Payment Flow

1. **Create a test order** through your order management system
2. **Initiate payment** using the process payment endpoint
3. **Check payment status** using the verify endpoint
4. **Monitor webhooks** for status updates

### 3. Test Phone Numbers

Use these test phone numbers in sandbox:
- `250781234567` (MTN test number)
- `250721234567` (Airtel test number)

### 4. Test Payment Amounts

Sandbox typically supports:
- Minimum: 100 RWF
- Maximum: 10,000,000 RWF

### 5. Connection Test

Test provider connectivity:

**Endpoint**: `GET /api/payments/test-providers`

This will check if Paypack API is reachable and credentials are valid.

## Error Handling

### Common Error Scenarios

1. **Invalid Phone Number**
   ```json
   {
     "status": "error",
     "message": "Invalid phone number format for Paypack payment"
   }
   ```

2. **Insufficient Funds**
   ```json
   {
     "status": "error", 
     "message": "Insufficient funds in mobile money account"
   }
   ```

3. **Authentication Error**
   ```json
   {
     "status": "error",
     "message": "Payment service authentication failed"
   }
   ```

### Troubleshooting Steps

1. **Check Environment Variables**: Ensure all Paypack credentials are set
2. **Verify Phone Format**: Phone numbers must be valid Rwanda mobile numbers
3. **Check Network Status**: Ensure Paypack API is accessible
4. **Review Logs**: Check server logs for detailed error messages
5. **Test Credentials**: Use the test-providers endpoint

## Security Considerations

### Webhook Security

1. **HTTPS Only**: Ensure webhook URL uses HTTPS
2. **Validate Signatures**: Implement webhook signature validation
3. **IP Whitelisting**: Whitelist Paypack's webhook IPs if possible

### API Security

1. **Secure Credentials**: Store API credentials in environment variables
2. **Rate Limiting**: Implement rate limiting on payment endpoints
3. **Request Validation**: Validate all incoming request parameters

## Production Deployment

### Pre-Launch Checklist

- [ ] Update `PAYPACK_ENVIRONMENT` to `production`
- [ ] Use production Paypack credentials
- [ ] Update webhook URL to production domain
- [ ] Test with real phone numbers and small amounts
- [ ] Monitor payment success rates
- [ ] Set up alerting for failed payments

### Monitoring

Monitor these metrics:
- Payment success rate
- Average payment processing time
- Webhook delivery success rate
- Error frequency by type

## Support and Documentation

- **Paypack Documentation**: [https://docs.paypack.rw](https://docs.paypack.rw)
- **Paypack Dashboard**: [https://dashboard.paypack.rw](https://dashboard.paypack.rw)
- **Technical Support**: Contact Paypack support for API issues

## Implementation Notes

### Key Features Implemented

1. **Automatic Phone Formatting**: Handles various phone number formats
2. **Multi-Network Support**: Works with MTN and Airtel
3. **Webhook Processing**: Automatic payment status updates
4. **Error Handling**: Comprehensive error messages and logging
5. **Retry Logic**: Built-in payment retry functionality
6. **Status Mapping**: Maps Paypack statuses to internal payment statuses

### Architecture Benefits

1. **Provider Pattern**: Easy to add new payment providers
2. **Clean Separation**: Business logic separated from API integration
3. **Comprehensive Logging**: Full audit trail of payment operations
4. **Database Integration**: Automatic order and payment status updates
5. **Notification System**: Integrated with existing notification system

This integration provides a robust, production-ready payment solution with Paypack while maintaining consistency with your existing payment architecture. 