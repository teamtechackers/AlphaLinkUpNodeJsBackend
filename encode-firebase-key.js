#!/usr/bin/env node

/**
 * Firebase Private Key Base64 Encoder for Render
 * 
 * This script converts your Firebase private key to Base64 format
 * which is easier to set in Render environment variables.
 * 
 * Usage:
 *   node encode-firebase-key.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔑 Firebase Private Key Base64 Encoder\n');

// Read the private key from .env or provide it directly
const privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCjCwKPpjaQho+e
5FS06VVh4zNwlbT1ClrdgZR95M1thJS5O/ycIu4egcvH8VSRzZFpRcwS62f2Isa4
SQOFwELz8LCY9g/P0Dn5qlXfVtlKhWxnPThov3Dw2WiKy++YarDf+SBhft91P4EY
1YuZKsfrgU7O6+IN+t8gCWUGbDQXn7HHwYET9Q6ro0CFDmzuk9R6Hsqnr4EVI3rk
MXTKUTA6md440DyRkG8DobcMeZuhiNqQJGpDaTK/9efSmHxe867gZImVYdwIt0G7
Hz7IoQ4jiWQqxYOw+BLHHelOf64YTPZBXV4fU3fp4CiFQl+KGHpO6NulJBIfxM4D
NIzmnO+LAgMBAAECggEASpr8oofPmwV/zZi0rA3DPKYOwTs30RLablZfgNYELFOJ
DFPHLRkMtdf1y/mBlbAnlDDUh2nBqg7SuLvsSTUnTeF6pZues5yYEsbfQXHHv0Jb
TshkOgYz43nQTQaxjaBwbCRerU41aTzUUW1R0hYR4hFK4wNr7rK3i7zQxgYYNiBo
edzC84DtfAmd4nG661yP+C5g9y7afO2Wi6GHCO08KBt9QYQJiRKV9pLaqzjuRm7K
DOVHQZaqjUiErL+6UtCn4fKuT0+uqI9PUWhRAu/nGyMu1QyXLrcYaRj92RBUebXe
yGtHUPQDC+WrZ/RVCvMNjCv+kUVrDYsVIr7LguANeQKBgQDh6N4WwOF3eKiYWSil
2n1hA5HSWyEZDO7N+xaYMfQrwkRPYsW/XHOvPMMf19QpDAIFPPu/uy8Yj6nSqCY8
53ywhVRe3rj9fnGW8XpD1ZleWML7sutyakY+iKz1cco44jgexM+FKYZkWbW1JyTB
YMMGI8MUSOa0I/YW+cH6kuxBOQKBgQC4wn9x2f6NYMkjARGFN7/g5Eo/HkJxIknp
FDbTgiLQbZBktlECciTLaS6K3G6ytlUS1XIsbjdyOztjw6qX2Zw/+cih1Vgz8Umz
pH3znCZCmrLcCOXgOxHW1l9O0bdnY+CaH3mFE9auGzrECrGmr+dvHOqsa7iRpKom
s5Hj5Inq4wKBgAZGDUTcfmZu91+jujlA5BJ5oucQmM61STx3KJ15ZaqBbpw1xgAW
dS/8o/6SY9Xv+25hzyv36srn0nODL+ypERFl4n3v+Xsws77ZXefcWrIADQooYdl/
kgvSh9sZGeCSh7RzCsBL8ut+gklRmPe11DSrcZNyotWF2iOxM+3dfqohAoGAUTem
oFysqmdWY53PntkP7wNLpA1gNa1WAjCRnU6CkU7of20plUKp7ATzobUesE64fQv5
IZDdrMhe5g8YSaIuLm1WBdXr7QFvXZm8iD8nDnZEk7cRng05XVBlGxfTYI6mJ/oY
CCjdYTG1FoKA73455T03581+l/9jkJm1UxGekvMCgYBNsEpScddVx/UliY+3vFLC
be9QDcLeZSkQlU+ZWsmA57Uuwfati0DMkf2il2AaADEvSKDyxdvA6LcqeQMplpYD
4yQVuxbM9VJyCj/MB/sSLpsWnMKT5xlWAv4rTxdtcJwHkCwNboEOs6OZMlBTv0OP
bk8JWnYiIJUHr0Hmx0mEDw==
-----END PRIVATE KEY-----`;

const base64Encoded = Buffer.from(privateKey).toString('base64');

console.log('📋 Your Firebase Private Key (Base64 encoded):\n');
console.log('─'.repeat(80));
console.log(base64Encoded);
console.log('─'.repeat(80));
console.log('\n✅ Copy the above Base64 string\n');
console.log('📝 On Render, set this environment variable:\n');
console.log('   Variable Name: FIREBASE_PRIVATE_KEY_BASE64');
console.log('   Value: <paste the Base64 string above>\n');
console.log('💡 Then remove the old FIREBASE_PRIVATE_KEY variable\n');
console.log('🔄 Restart your Render service\n');










