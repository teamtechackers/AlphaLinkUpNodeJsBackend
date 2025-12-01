# 🚀 Quick Deployment Commands - AWS EC2

## 🔐 SSH Connection

```bash
# Local machine se
chmod 400 alpha_prod.pem
ssh -i "alpha_prod.pem" ubuntu@52.66.224.22
```

---

## 📦 Initial Setup (First Time Only)

### 1. Database Setup
```bash
sudo mysql -u root -p
CREATE DATABASE alphalinkup CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'alphalinkup_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON alphalinkup.* TO 'alphalinkup_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 2. Project Setup
```bash
cd /home/ubuntu
git clone <repo-url> AlphaLinkup_Backend
cd AlphaLinkup_Backend/AlphaLinkup_NodeJS_Backend
```

### 3. Environment Variables
```bash
nano .env
# Copy all variables from AWS_EC2_DEPLOYMENT_GUIDE.md
chmod 600 .env
```

### 4. Run Deployment Script
```bash
chmod +x deploy-ec2.sh
./deploy-ec2.sh
```

---

## 🔄 Daily Operations

### PM2 Commands
```bash
# Status check
pm2 status

# Logs
pm2 logs alphalinkup-backend
pm2 logs alphalinkup-backend --lines 100

# Restart
pm2 restart alphalinkup-backend

# Stop
pm2 stop alphalinkup-backend

# Start
pm2 start alphalinkup-backend
```

### Code Update
```bash
cd /home/ubuntu/AlphaLinkup_Backend/AlphaLinkup_NodeJS_Backend
git pull
npm install --production
pm2 restart alphalinkup-backend
pm2 logs alphalinkup-backend --lines 50
```

---

## 🌐 Nginx Commands

```bash
# Test configuration
sudo nginx -t

# Restart
sudo systemctl restart nginx

# Status
sudo systemctl status nginx

# Error logs
sudo tail -f /var/log/nginx/alphalinkup-backend-error.log
```

---

## 🗄️ Database Commands

```bash
# Connect
mysql -u alphalinkup_user -p alphalinkup

# Backup
mysqldump -u alphalinkup_user -p alphalinkup > backup_$(date +%Y%m%d).sql

# Restore
mysql -u alphalinkup_user -p alphalinkup < backup_file.sql
```

---

## 🔍 Troubleshooting

```bash
# Check if app is running
curl http://localhost:3000/health

# Check port usage
sudo lsof -i :3000

# Check MySQL status
sudo systemctl status mysql

# Check disk space
df -h

# Check system resources
htop
```

---

## 🔥 Firewall

```bash
# Status
sudo ufw status

# Allow ports
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
```

---

## 📊 Monitoring

```bash
# PM2 monitoring
pm2 monit

# System resources
htop
free -h
df -h
```

---

## 🔐 Security

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Check .env permissions
ls -la .env  # Should be 600

# Check SSH access
sudo nano /etc/ssh/sshd_config
```

---

## ✅ Health Checks

```bash
# Backend health
curl http://localhost:3000/health

# API version
curl http://localhost:3000/Api-Version

# Through Nginx (if configured)
curl http://52.66.224.22/health
```

---

## 📝 Quick Reference

| Task | Command |
|------|---------|
| SSH Connect | `ssh -i "alpha_prod.pem" ubuntu@52.66.224.22` |
| PM2 Status | `pm2 status` |
| PM2 Logs | `pm2 logs alphalinkup-backend` |
| PM2 Restart | `pm2 restart alphalinkup-backend` |
| Nginx Restart | `sudo systemctl restart nginx` |
| MySQL Connect | `mysql -u alphalinkup_user -p alphalinkup` |
| Check Health | `curl http://localhost:3000/health` |
| View Logs | `pm2 logs alphalinkup-backend --lines 50` |

---

**For detailed instructions, see:** `AWS_EC2_DEPLOYMENT_GUIDE.md`


