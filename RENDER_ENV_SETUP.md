# Render Environment Variables Setup Guide

## 🔴 CRITICAL - Database Configuration (Fix Current Error)

The deployment is failing because `DB_PASS` is not set. You **MUST** add these:

```
DB_HOST=your-mysql-host.example.com
DB_PORT=3306
DB_USER=avnadmin
DB_PASS=your-database-password-here   ⚠️ THIS IS MISSING!
DB_NAME=alphalinkup
```

## Required Environment Variables

### 1. Database (MySQL) - **REQUIRED**
```
DB_HOST=your-mysql-host
DB_PORT=3306
DB_USER=avnadmin
DB_PASS=your-secure-password
DB_NAME=alphalinkup
```

### 2. JWT Authentication - **REQUIRED**
```
JWT_SECRET=your-very-secure-random-secret-key
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
```

### 3. Twilio SMS/OTP - **REQUIRED**
```
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_VERIFY_SERVICE_SID=your-twilio-verify-service-sid
```

### 4. Firebase Push Notifications - **REQUIRED**
Currently the app tries to load `serviceAccountKey.json` which causes this error:
```
Firebase Admin initialization error: Failed to parse private key: Error: Invalid PEM formatted message.
```

**You need to:**
1. Convert your Firebase service account JSON to environment variables, OR
2. Fix the Firebase initialization to read from environment variables

For now, you can add:
```
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY=your-private-key-here
FIREBASE_CLIENT_EMAIL=your-service-account-email
```

### 5. Email (SMTP) - Optional but Recommended
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 6. Application Settings - Optional
```
PORT=3000
NODE_ENV=production
```

## How to Add Environment Variables in Render

1. Go to your **Render Dashboard**
2. Select your **Web Service**
3. Click **Environment** in the left sidebar
4. Click **Add Environment Variable**
5. Add each variable (Key = Value)
6. Click **Save Changes**
7. Render will automatically redeploy

## Priority Actions (Do These First!)

1. ✅ Add `DB_PASS` - This is causing the current failure
2. ✅ Add `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_NAME`
3. ✅ Add `JWT_SECRET` - Use a strong random string
4. ✅ Add Twilio credentials (if using SMS OTP)
5. ⚠️ Fix Firebase configuration (see below)

## Fixing Firebase Error

The current code at `src/notification/NotificationService.js` line 5 loads a JSON file:
```javascript
const serviceAccount = require('../../../serviceAccountKey.json');
```

This file doesn't exist on Render. You need to either:

### Option A: Use Environment Variables (Recommended)
Modify the Firebase initialization code to read from environment variables.

### Option B: Add as Secret File
Upload your `serviceAccountKey.json` as a secret file in Render.

## Testing After Deployment

Once you add the environment variables:
1. Render will automatically redeploy
2. Check the logs for "Database connection established" ✅
3. The error "Access denied (using password: NO)" should be gone ✅

## Security Notes

- **Never commit** `.env` files or `serviceAccountKey.json` to Git
- Use strong, random values for `JWT_SECRET`
- Keep your database password secure
- Use App Passwords for Gmail SMTP (not your main password)

