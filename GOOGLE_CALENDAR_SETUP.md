# Google Calendar API Setup for Google Meet Links

## Overview
This guide explains how to enable Google Calendar API so that admin can automatically generate Google Meet links when scheduling investor meetings.

---

## 🎯 Feature
When admin schedules a meeting (sets date + time), the system will:
- ✅ Automatically create Google Meet link
- ✅ Add meeting to Google Calendar
- ✅ Send calendar invite to user's email
- ✅ Save Meet link in `meeting_url` field
- ✅ User can join meeting by clicking the link

---

## 📋 Setup Steps

### Step 1: Enable Google Calendar API

1. Go to **Google Cloud Console**: https://console.cloud.google.com
2. Select your project: **alphalinkup-2ea1e** (same as Firebase)
3. Click **"APIs & Services"** → **"Library"**
4. Search for **"Google Calendar API"**
5. Click **"Enable"**

### Step 2: Grant Calendar Access to Service Account

1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts
2. Find your service account: `firebase-adminsdk-fbsvc@alphalinkup-2ea1e.iam.gserviceaccount.com`
3. Copy the email address

4. Open **Google Calendar**: https://calendar.google.com
5. Settings → **"Add calendar"** → **"Create new calendar"**
   - Name: "AlphaLinkup Investor Meetings"
   - Create

6. Calendar Settings → **"Share with specific people"**
   - Add email: `firebase-adminsdk-fbsvc@alphalinkup-2ea1e.iam.gserviceaccount.com`
   - Permission: **"Make changes to events"**
   - Save

### Step 3: Verify Credentials (Already Done ✅)

Your `.env` file already has Firebase credentials which are used for Calendar API:
```
FIREBASE_PROJECT_ID=alphalinkup-2ea1e
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@alphalinkup-2ea1e.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY_BASE64=<your_base64_key>
```

**OR on Render:**
```
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL  
FIREBASE_PRIVATE_KEY_BASE64
```

---

## 🧪 Testing

### Test Locally:

```bash
# Admin login
curl -X POST 'http://localhost:3000/admin-login' \
  -H 'Content-Type: application/json' \
  -d '{"username": "superadmin", "password": "superadmin"}'

# Response: Get user_id and token

# Schedule meeting with date and time
curl -X POST 'http://localhost:3000/Api-Admin-Update-Meeting-Request' \
  -H 'Content-Type: application/json' \
  -d '{
    "user_id": "MQ==",
    "token": "YOUR_TOKEN",
    "request_id": "1",
    "meeting_date": "2025-11-10",
    "meeting_time": "14:00:00",
    "request_status": "Scheduled"
  }'

# Response will include:
{
  "meeting_url": "https://meet.google.com/xxx-yyyy-zzz"  ✅
}
```

---

## 📊 How It Works

### Automatic Google Meet Creation:

```javascript
if (meeting_date && meeting_time) {
  // 1. Create Google Calendar event
  const event = await GoogleCalendarService.createMeetingWithGoogleMeet({
    summary: "Investor Meeting: John - Sarah",
    startDateTime: "2025-11-10 14:00:00",
    durationMinutes: 60,
    attendeeEmail: "user@example.com"
  });
  
  // 2. Get Google Meet link
  meeting_url = event.meetLink; // "https://meet.google.com/abc-defg-hij"
  
  // 3. Save in database
  UPDATE user_investors_unlocked SET meeting_url = ?
}
```

---

## 🔧 Features

### Included:
- ✅ Google Meet link generation
- ✅ Calendar event creation
- ✅ Email invites to attendees
- ✅ Automatic reminders (1 day + 30 min before)
- ✅ Calendar sync (mobile app, Gmail, etc.)

### API Response:
```json
{
  "status": true,
  "message": "Meeting request updated successfully",
  "updated_meeting_request": {
    "request_id": "1",
    "meeting_date": "2025-11-10",
    "meeting_time": "14:00:00",
    "meeting_url": "https://meet.google.com/abc-defg-hij",  ← Google Meet link
    "request_status": "Scheduled"
  }
}
```

---

## ⚠️ Important Notes

### 1. Service Account Limitations
- Service account creates events in its own calendar
- Events are NOT visible in admin's personal calendar by default
- Solution: Use the shared calendar created in Step 2

### 2. Email Invites
- User will receive Google Calendar invite email
- Email contains:
  - Meeting details
  - Google Meet join link
  - Add to Calendar button
  - Reminders

### 3. Fallback
If Google Calendar API fails:
- Meeting still gets scheduled ✅
- But without Google Meet link
- Admin can manually add meeting_url if needed

---

## 🐛 Troubleshooting

### Issue: "Calendar service not initialized"
**Solution:** 
1. Check `.env` file has all Firebase credentials
2. Restart server
3. Check logs for "Google Calendar service initialized"

### Issue: "Insufficient permissions"
**Solution:**
1. Verify Calendar API is enabled in Google Cloud
2. Check service account has calendar access
3. Make sure calendar is shared with service account email

### Issue: "No Google Meet link generated"
**Solution:**
1. Check Google Calendar API is enabled
2. Verify service account has proper scopes
3. Check server logs for detailed error

---

## 📝 Code Files

### Created/Modified:
1. `src/services/GoogleCalendarService.js` - Google Calendar integration
2. `src/controllers/apiController.js` - Auto Google Meet link generation in `updateAdminMeetingRequest`

### Environment Variables Used:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` or `FIREBASE_PRIVATE_KEY_BASE64`

---

## ✅ Success Indicators

After setup, you should see in logs:
```
✅ Google Calendar service initialized successfully
🔗 Creating Google Meet link for scheduled meeting...
✅ Google Meet link created: https://meet.google.com/xxx-yyyy-zzz
```

---

## 🚀 Next Steps

1. Enable Google Calendar API in Google Cloud Console
2. Share calendar with service account
3. Deploy to Render
4. Test meeting scheduling
5. Verify Google Meet links are generated
6. Check user receives calendar invite email

**After enabling Calendar API, restart server and test!** 🎉

