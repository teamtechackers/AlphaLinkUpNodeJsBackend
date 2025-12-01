# 🚀 AWS EC2 Deployment Guide - AlphaLinkup Backend & Frontend

## 📋 Overview
Yeh guide aapko AWS EC2 par Node.js backend aur React frontend deploy karne mein help karega.

**Server Details:**
- **IP:** 52.66.224.22
- **SSH Key:** `alpha_prod.pem`
- **User:** ubuntu
- **Region:** ap-south-1 (Mumbai)

---

## 🔧 Prerequisites Checklist

- [x] AWS EC2 instance running (Ubuntu)
- [x] Node.js installed
- [x] MySQL installed
- [x] SSH access configured
- [ ] Database created
- [ ] Environment variables configured
- [ ] PM2 installed (process manager)
- [ ] Nginx installed (reverse proxy)
- [ ] SSL certificate (Let's Encrypt)

---

## 📝 Step 1: SSH Connection Setup

### Local Machine Par:

```bash
# 1. SSH key permissions set karein
chmod 400 alpha_prod.pem

# 2. SSH connect karein
ssh -i "alpha_prod.pem" ubuntu@ec2-52-66-224-22.ap-south-1.compute.amazonaws.com

# Ya direct IP se:
ssh -i "alpha_prod.pem" ubuntu@52.66.224.22
```

---

## 🗄️ Step 2: MySQL Database Setup

### Server Par Connect Hone Ke Baad:

```bash
# 1. MySQL login karein
sudo mysql -u root -p

# 2. Database create karein
CREATE DATABASE alphalinkup CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 3. Database user create karein (recommended)
CREATE USER 'alphalinkup_user'@'localhost' IDENTIFIED BY 'your_strong_password_here';
GRANT ALL PRIVILEGES ON alphalinkup.* TO 'alphalinkup_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# 4. Database import karein (agar existing database hai)
# Local se database dump leke server par import karein:
# mysql -u alphalinkup_user -p alphalinkup < database_dump.sql
```

**Note:** Agar aapka existing database hai (PHP backend se), to usko import karein.

---

## 📦 Step 3: Project Setup on Server

### 3.1 Git Clone Ya Upload

**Option A: Git Se Clone (Recommended)**
```bash
# Server par
cd /home/ubuntu
git clone <your-repository-url> AlphaLinkup_Backend
cd AlphaLinkup_Backend/AlphaLinkup_NodeJS_Backend
```

**Option B: SCP Se Upload (Agar Git nahi hai)**
```bash
# Local machine se
scp -i "alpha_prod.pem" -r AlphaLinkup_NodeJS_Backend ubuntu@52.66.224.22:/home/ubuntu/
```

### 3.2 Dependencies Install

```bash
cd /home/ubuntu/AlphaLinkup_Backend/AlphaLinkup_NodeJS_Backend

# Node.js version check
node -v  # Should be 18+ or 20+

# Dependencies install
npm install --production
```

---

## ⚙️ Step 4: Environment Variables Setup

### 4.1 .env File Create Karein

```bash
cd /home/ubuntu/AlphaLinkup_Backend/AlphaLinkup_NodeJS_Backend
nano .env
```

### 4.2 Required Environment Variables

```env
# ============================================
# SERVER CONFIGURATION
# ============================================
NODE_ENV=production
PORT=3000
BASE_URL=http://52.66.224.22
# Ya domain name agar setup hai:
# BASE_URL=https://api.yourdomain.com

# ============================================
# DATABASE CONFIGURATION
# ============================================
DB_HOST=localhost
DB_PORT=3306
DB_USER=alphalinkup_user
DB_PASS=your_strong_password_here
DB_NAME=alphalinkup
DB_TIMEZONE_UTC=true

# ============================================
# JWT AUTHENTICATION
# ============================================
JWT_SECRET=your_very_secure_random_secret_key_min_32_chars
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# ============================================
# TWILIO SMS/OTP (Required)
# ============================================
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_VERIFY_SERVICE_SID=your_twilio_verify_service_sid
TWILIO_PHONE_NUMBER=+1234567890

# ============================================
# FIREBASE PUSH NOTIFICATIONS (Required)
# ============================================
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email@project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"
# Ya Base64 encoded:
# FIREBASE_PRIVATE_KEY_BASE64=your_base64_encoded_private_key

# ============================================
# EMAIL/SMTP CONFIGURATION (Optional but Recommended)
# ============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
EMAIL_FROM_NAME=AlphaLinkup

# ============================================
# REDIS (Optional - for caching)
# ============================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# ============================================
# SECURITY & RATE LIMITING
# ============================================
MAX_PAYLOAD_SIZE=10mb
GLOBAL_RATE_LIMIT=1000
ALLOWED_ORIGINS=http://52.66.224.22,https://yourdomain.com
```

**Important Notes:**
- `JWT_SECRET` ko strong random string banayein (minimum 32 characters)
- `FIREBASE_PRIVATE_KEY` mein `\n` characters include karein
- `DB_PASS` ko strong password use karein
- File save karein: `Ctrl+O`, `Enter`, `Ctrl+X`

### 4.3 .env File Permissions

```bash
# Security ke liye permissions restrict karein
chmod 600 .env
```

---

## 🔄 Step 5: PM2 Process Manager Setup

### 5.1 PM2 Install

```bash
# Global install
sudo npm install -g pm2

# PM2 startup script (server restart par auto-start)
pm2 startup
# Command output mein jo command aayega, use run karein (usually sudo command)
```

### 5.2 Application Start with PM2

```bash
cd /home/ubuntu/AlphaLinkup_Backend/AlphaLinkup_NodeJS_Backend

# PM2 se start karein
pm2 start src/server.js --name alphalinkup-backend

# Ya npm start se:
pm2 start npm --name alphalinkup-backend -- start

# PM2 status check
pm2 status

# Logs dekhne ke liye
pm2 logs alphalinkup-backend

# PM2 save (auto-start ke liye)
pm2 save
```

### 5.3 PM2 Useful Commands

```bash
# Status check
pm2 status

# Logs
pm2 logs alphalinkup-backend
pm2 logs alphalinkup-backend --lines 100  # Last 100 lines

# Restart
pm2 restart alphalinkup-backend

# Stop
pm2 stop alphalinkup-backend

# Delete
pm2 delete alphalinkup-backend

# Monitor
pm2 monit
```

---

## 🌐 Step 6: Nginx Reverse Proxy Setup

### 6.1 Nginx Install

```bash
sudo apt update
sudo apt install nginx -y

# Nginx status check
sudo systemctl status nginx
```

### 6.2 Nginx Configuration

```bash
# Configuration file create/edit karein
sudo nano /etc/nginx/sites-available/alphalinkup-backend
```

**Configuration Content:**

```nginx
server {
    listen 80;
    server_name 52.66.224.22;  # Ya aapka domain name
    
    # Logs
    access_log /var/log/nginx/alphalinkup-backend-access.log;
    error_log /var/log/nginx/alphalinkup-backend-error.log;

    # Client max body size (file uploads ke liye)
    client_max_body_size 10M;

    # Backend API
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files (uploads) - agar direct serve karna hai
    location /uploads/ {
        alias /home/ubuntu/AlphaLinkup_Backend/AlphaLinkup_NodeJS_Backend/src/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

**Enable Configuration:**

```bash
# Symlink create karein
sudo ln -s /etc/nginx/sites-available/alphalinkup-backend /etc/nginx/sites-enabled/

# Default configuration disable (agar conflict ho)
sudo rm /etc/nginx/sites-enabled/default

# Nginx config test
sudo nginx -t

# Nginx restart
sudo systemctl restart nginx

# Nginx status
sudo systemctl status nginx
```

---

## 🔒 Step 7: SSL Certificate (Let's Encrypt) - Optional but Recommended

**Note:** SSL ke liye domain name required hai. Agar domain name nahi hai, to skip karein.

```bash
# Certbot install
sudo apt install certbot python3-certbot-nginx -y

# SSL certificate generate (domain name ke sath)
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal test
sudo certbot renew --dry-run
```

---

## 🔥 Step 8: Firewall Configuration (UFW)

```bash
# UFW enable
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS (agar SSL setup hai)
sudo ufw allow 443/tcp

# Allow Node.js directly (agar Nginx use nahi kar rahe)
sudo ufw allow 3000/tcp

# Status check
sudo ufw status
```

---

## 📱 Step 9: React Frontend Deployment

### 9.1 Frontend Build (Local Machine Par)

```bash
# React project directory mein
cd /path/to/react-frontend

# Dependencies install
npm install

# Production build
npm run build

# Build folder ko server par upload
scp -i "alpha_prod.pem" -r build ubuntu@52.66.224.22:/home/ubuntu/
```

### 9.2 Nginx Configuration for Frontend

```bash
sudo nano /etc/nginx/sites-available/alphalinkup-frontend
```

**Configuration:**

```nginx
server {
    listen 80;
    server_name 52.66.224.22;  # Ya aapka domain name

    root /home/ubuntu/build;
    index index.html;

    # SPA routing support
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API requests backend ko forward
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Enable:**

```bash
sudo ln -s /etc/nginx/sites-available/alphalinkup-frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## ✅ Step 10: Testing & Verification

### 10.1 Backend Health Check

```bash
# Server par
curl http://localhost:3000/health

# Ya browser se
http://52.66.224.22/health
```

### 10.2 Database Connection Test

```bash
# PM2 logs check
pm2 logs alphalinkup-backend --lines 50

# Database connection successful message dekhna chahiye
```

### 10.3 API Endpoint Test

```bash
# Example API call
curl http://52.66.224.22/Api-Version
```

---

## 🔧 Step 11: Maintenance & Updates

### 11.1 Code Update Process

```bash
# SSH connect
ssh -i "alpha_prod.pem" ubuntu@52.66.224.22

# Project directory
cd /home/ubuntu/AlphaLinkup_Backend/AlphaLinkup_NodeJS_Backend

# Git pull (agar Git use kar rahe ho)
git pull origin main  # Ya aapka branch name

# Dependencies update (agar package.json change hua)
npm install --production

# PM2 restart
pm2 restart alphalinkup-backend

# Logs check
pm2 logs alphalinkup-backend --lines 50
```

### 11.2 Database Backup

```bash
# Backup script create karein
nano /home/ubuntu/backup-db.sh
```

**Backup Script:**

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"
DB_NAME="alphalinkup"
DB_USER="alphalinkup_user"
DB_PASS="your_password"

mkdir -p $BACKUP_DIR
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_DIR/alphalinkup_$DATE.sql

# Purane backups delete (7 days se zyada)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete

echo "Backup completed: alphalinkup_$DATE.sql"
```

**Cron Job Setup (Daily Backup):**

```bash
# Crontab edit
crontab -e

# Add this line (daily at 2 AM)
0 2 * * * /home/ubuntu/backup-db.sh >> /home/ubuntu/backup.log 2>&1
```

---

## 🐛 Troubleshooting

### Issue 1: PM2 App Not Starting

```bash
# Check logs
pm2 logs alphalinkup-backend

# Check .env file
cat .env

# Manual start test
node src/server.js
```

### Issue 2: Database Connection Error

```bash
# MySQL connection test
mysql -u alphalinkup_user -p alphalinkup

# Check MySQL status
sudo systemctl status mysql

# Check .env DB credentials
grep DB_ .env
```

### Issue 3: Port Already in Use

```bash
# Check port usage
sudo lsof -i :3000

# Kill process
sudo kill -9 <PID>
```

### Issue 4: Nginx 502 Bad Gateway

```bash
# Check Nginx error logs
sudo tail -f /var/log/nginx/alphalinkup-backend-error.log

# Check if Node.js app running
pm2 status

# Check if port 3000 accessible
curl http://localhost:3000/health
```

### Issue 5: File Upload Issues

```bash
# Check uploads directory permissions
ls -la /home/ubuntu/AlphaLinkup_Backend/AlphaLinkup_NodeJS_Backend/src/uploads/

# Fix permissions
chmod -R 755 /home/ubuntu/AlphaLinkup_Backend/AlphaLinkup_NodeJS_Backend/src/uploads/
```

---

## 📊 Monitoring

### PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# Process info
pm2 info alphalinkup-backend

# Memory/CPU usage
pm2 list
```

### System Resources

```bash
# CPU & Memory
htop

# Disk usage
df -h

# Network
netstat -tulpn
```

---

## 🔐 Security Best Practices

1. **SSH Key Security:**
   - `.pem` file ko secure rakhein
   - Password-based SSH disable karein

2. **Firewall:**
   - UFW enable karein
   - Sirf zaroori ports open karein

3. **Database:**
   - Strong passwords use karein
   - Root user se direct access avoid karein

4. **Environment Variables:**
   - `.env` file ko Git mein commit na karein
   - File permissions restrict karein (600)

5. **Updates:**
   - Regular system updates:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

---

## 📞 Quick Reference Commands

```bash
# PM2
pm2 start src/server.js --name alphalinkup-backend
pm2 restart alphalinkup-backend
pm2 logs alphalinkup-backend
pm2 status

# Nginx
sudo nginx -t
sudo systemctl restart nginx
sudo tail -f /var/log/nginx/alphalinkup-backend-error.log

# MySQL
sudo systemctl status mysql
mysql -u alphalinkup_user -p alphalinkup

# System
sudo systemctl status nginx
sudo ufw status
df -h
```

---

## ✅ Deployment Checklist

- [ ] SSH connection successful
- [ ] MySQL database created
- [ ] Database user created with permissions
- [ ] Project code uploaded/cloned
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file created with all variables
- [ ] PM2 installed and app started
- [ ] PM2 startup script configured
- [ ] Nginx installed and configured
- [ ] Nginx configuration tested
- [ ] Firewall configured (UFW)
- [ ] Backend health check successful
- [ ] API endpoints tested
- [ ] Frontend deployed (if applicable)
- [ ] SSL certificate installed (if domain available)
- [ ] Database backup script configured
- [ ] Monitoring setup

---

## 🎉 Success!

Agar sab kuch sahi se setup ho gaya hai, to:

1. ✅ Backend API: `http://52.66.224.22` (ya aapka domain)
2. ✅ Health Check: `http://52.66.224.22/health`
3. ✅ Frontend: `http://52.66.224.22` (agar frontend bhi same server par hai)

**Next Steps:**
- Domain name configure karein (agar available hai)
- SSL certificate install karein
- Monitoring tools setup karein
- Regular backups configure karein

---

**Need Help?** Agar koi issue aaye, to PM2 logs, Nginx logs, aur system logs check karein.


