# Firebase Setup on Render

## ❌ Current Issue

Error on Render:
```
error:1E08010C:DECODER routines::unsupported
```

This happens when `FIREBASE_PRIVATE_KEY` is not properly formatted in Render environment variables.

---

## ✅ How to Fix on Render

### Step 1: Go to Render Dashboard
1. Open your service: **alphalinkupnodejsbackend**
2. Go to **Environment** tab
3. Find `FIREBASE_PRIVATE_KEY` variable

### Step 2: Update FIREBASE_PRIVATE_KEY

**IMPORTANT:** The private key must be entered as a **SINGLE LINE** with `\n` as **LITERAL characters**.

#### ✅ CORRECT FORMAT (Copy this exactly):

```
-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCjCwKPpjaQho+e\n5FS06VVh4zNwlbT1ClrdgZR95M1thJS5O/ycIu4egcvH8VSRzZFpRcwS62f2Isa4\nSQOFwELz8LCY9g/P0Dn5qlXfVtlKhWxnPThov3Dw2WiKy++YarDf+SBhft91P4EY\n1YuZKsfrgU7O6+IN+t8gCWUGbDQXn7HHwYET9Q6ro0CFDmzuk9R6Hsqnr4EVI3rk\nMXTKUTA6md440DyRkG8DobcMeZuhiNqQJGpDaTK/9efSmHxe867gZImVYdwIt0G7\nHz7IoQ4jiWQqxYOw+BLHHelOf64YTPZBXV4fU3fp4CiFQl+KGHpO6NulJBIfxM4D\nNIzmnO+LAgMBAAECggEASpr8oofPmwV/zZi0rA3DPKYOwTs30RLablZfgNYELFOJ\nDFPHLRkMtdf1y/mBlbAnlDDUh2nBqg7SuLvsSTUnTeF6pZues5yYEsbfQXHHv0Jb\nTshkOgYz43nQTQaxjaBwbCRerU41aTzUUW1R0hYR4hFK4wNr7rK3i7zQxgYYNiBo\nedzC84DtfAmd4nG661yP+C5g9y7afO2Wi6GHCO08KBt9QYQJiRKV9pLaqzjuRm7K\nDOVHQZaqjUiErL+6UtCn4fKuT0+uqI9PUWhRAu/nGyMu1QyXLrcYaRj92RBUebXe\nyGtHUPQDC+WrZ/RVCvMNjCv+kUVrDYsVIr7LguANeQKBgQDh6N4WwOF3eKiYWSil\n2n1hA5HSWyEZDO7N+xaYMfQrwkRPYsW/XHOvPMMf19QpDAIFPPu/uy8Yj6nSqCY8\n53ywhVRe3rj9fnGW8XpD1ZleWML7sutyakY+iKz1cco44jgexM+FKYZkWbW1JyTB\nYMMGI8MUSOa0I/YW+cH6kuxBOQKBgQC4wn9x2f6NYMkjARGFN7/g5Eo/HkJxIknp\nFDbTgiLQbZBktlECciTLaS6K3G6ytlUS1XIsbjdyOztjw6qX2Zw/+cih1Vgz8Umz\npH3znCZCmrLcCOXgOxHW1l9O0bdnY+CaH3mFE9auGzrECrGmr+dvHOqsa7iRpKom\ns5Hj5Inq4wKBgAZGDUTcfmZu91+jujlA5BJ5oucQmM61STx3KJ15ZaqBbpw1xgAW\ndS/8o/6SY9Xv+25hzyv36srn0nODL+ypERFl4n3v+Xsws77ZXefcWrIADQooYdl/\nkgvSh9sZGeCSh7RzCsBL8ut+gklRmPe11DSrcZNyotWF2iOxM+3dfqohAoGAUTem\noFysqmdWY53PntkP7wNLpA1gNa1WAjCRnU6CkU7of20plUKp7ATzobUesE64fQv5\nIZDdrMhe5g8YSaIuLm1WBdXr7QFvXZm8iD8nDnZEk7cRng05XVBlGxfTYI6mJ/oY\nCCjdYTG1FoKA73455T03581+l/9jkJm1UxGekvMCgYBNsEpScddVx/UliY+3vFLC\nbe9QDcLeZSkQlU+ZWsmA57Uuwfati0DMkf2il2AaADEvSKDyxdvA6LcqeQMplpYD\n4yQVuxbM9VJyCj/MB/sSLpsWnMKT5xlWAv4rTxdtcJwHkCwNboEOs6OZMlBTv0OP\nbk8JWnYiIJUHr0Hmx0mEDw==\n-----END PRIVATE KEY-----
```

**Notes:**
- Single line (no actual line breaks)
- `\n` as **literal two characters** (backslash + n)
- No quotes around it in Render (Render adds them)
- Remove the `\n` at the very end after `-----END PRIVATE KEY-----`

---

### Step 3: Update Other Firebase Variables

Make sure these are also set:

```
FIREBASE_PROJECT_ID=alphalinkup-2ea1e
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@alphalinkup-2ea1e.iam.gserviceaccount.com
```

---

### Step 4: Restart Render Service

After updating environment variables:
1. Click **Manual Deploy** → **Clear build cache & deploy**
2. Or just **Restart**

---

## 🔍 Alternative Solution (Simpler)

If the above doesn't work, use **Base64 encoding**:

### Encode the private key:
```bash
echo 'YOUR_PRIVATE_KEY_HERE' | base64
```

Then in Render, add a new variable:
```
FIREBASE_PRIVATE_KEY_BASE64=<base64_encoded_value>
```

And update the code to decode it.

---

## ✅ Verification

After restart, check logs for:
```
Firebase initialized from environment variables
```

NOT:
```
Firebase initialized from serviceAccountKey.json
```




