# Test Numbers for OTP Testing

This document lists the test phone numbers that can be used for testing OTP functionality without actually sending SMS via Twilio.

## Test Numbers Configuration

The following test numbers are configured with a fixed OTP code. These numbers will bypass the Twilio API and always accept the OTP: **`123456`**

### Test Numbers List:

| # | Phone Number     | OTP Code | Country |
|---|-----------------|----------|---------|
| 1 | +923001234567   | 123456   | Pakistan |
| 2 | +923007654321   | 123456   | Pakistan |
| 3 | +923009876543   | 123456   | Pakistan |
| 4 | +923111234567   | 123456   | Pakistan |
| 5 | +923451234567   | 123456   | Pakistan |

## How It Works

1. **Sending OTP**: When you request an OTP for any of these test numbers, the system will:
   - Skip the actual Twilio API call
   - Return a successful response immediately
   - Log the test OTP in the server logs
   - No SMS will be sent

2. **Verifying OTP**: When you verify the OTP:
   - The system checks if it's a test number
   - Accepts only the OTP: `123456`
   - Returns success/failure based on OTP match
   - No Twilio API call is made

## Usage Example

### Send OTP Request
```json
POST /Api-SendOtp
{
  "mobile": "+923001234567"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "OTP sent successfully",
  "data": {
    "verificationSid": "TEST_1234567890",
    "status": "pending",
    "isTestNumber": true
  }
}
```

### Verify OTP Request
```json
POST /Api-VerifyOtp
{
  "mobile": "+923001234567",
  "otp": "123456",
  "verification_sid": "TEST_1234567890",
  "user_id": "encoded_user_id",
  "token": "user_token",
  "fcm_token": "your_fcm_token"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "OTP verified successfully",
  "data": {
    "success": true,
    "status": "approved",
    "isTestNumber": true
  }
}
```

## Benefits

✅ **No SMS Costs**: Test without consuming Twilio credits
✅ **Faster Testing**: No need to wait for SMS delivery
✅ **Reliable**: Always works, no SMS delivery failures
✅ **Development Friendly**: Perfect for local development and staging
✅ **CI/CD Compatible**: Automated tests can use these numbers

## Important Notes

⚠️ **Security**: These test numbers should only be enabled in development and staging environments.

⚠️ **Production**: Consider disabling or removing test numbers in production, or restrict them by IP/environment.

⚠️ **Fixed OTP**: All test numbers use the same OTP: `123456`

## Adding More Test Numbers

To add more test numbers, edit `src/services/TwilioService.js`:

```javascript
this.testNumbers = {
  '+923001234567': '123456',  // Test Number 1
  '+923007654321': '123456',  // Test Number 2
  // Add more here...
  '+92XXXXXXXXXX': '123456'   // Your new test number
};
```

## For You (5 Test Numbers)

Here are your 5 test numbers you can use immediately:

1. **+923001234567** - OTP: 123456
2. **+923007654321** - OTP: 123456
3. **+923009876543** - OTP: 123456
4. **+923111234567** - OTP: 123456
5. **+923451234567** - OTP: 123456

Use any of these numbers in your app and always enter OTP as **123456** to login successfully! 🎉

