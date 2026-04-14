#!/bin/bash

# ============================================
# AlphaLinkup Backend - AWS EC2 Deployment Script
# ============================================
# Usage: ./deploy-ec2.sh
# Make sure to run this script on the EC2 server after SSH connection

set -e  # Exit on error

echo "🚀 AlphaLinkup Backend - EC2 Deployment Script"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}❌ Please do not run as root. Use ubuntu user.${NC}"
   exit 1
fi

# Variables
PROJECT_DIR="/home/ubuntu/AlphaLinkup_Backend"
NODE_VERSION="18"

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check Node.js version
echo ""
echo "📦 Checking Node.js installation..."
if command -v node &> /dev/null; then
    NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VER" -ge "$NODE_VERSION" ]; then
        print_status "Node.js $(node -v) is installed"
    else
        print_error "Node.js version should be $NODE_VERSION or higher. Current: $(node -v)"
        exit 1
    fi
else
    print_error "Node.js is not installed. Please install Node.js $NODE_VERSION+ first."
    exit 1
fi

# Check if project directory exists
echo ""
echo "📁 Checking project directory..."
if [ ! -d "$PROJECT_DIR" ]; then
    print_error "Project directory not found: $PROJECT_DIR"
    print_warning "Please clone or upload the project first."
    exit 1
fi
print_status "Project directory found"

# Navigate to project directory
cd "$PROJECT_DIR"

# Check if .env file exists
echo ""
echo "⚙️  Checking environment configuration..."
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating template..."
    cat > .env << 'EOF'
# ============================================
# SERVER CONFIGURATION
# ============================================
NODE_ENV=production
PORT=3000
BASE_URL=http://52.66.224.22

# ============================================
# DATABASE CONFIGURATION
# ============================================
DB_HOST=localhost
DB_PORT=3306
DB_USER=alphalinkup_user
DB_PASS=CHANGE_THIS_PASSWORD
DB_NAME=alphalinkup
DB_TIMEZONE_UTC=true

# ============================================
# JWT AUTHENTICATION
# ============================================
JWT_SECRET=CHANGE_THIS_TO_RANDOM_32_CHAR_STRING
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# ============================================
# TWILIO SMS/OTP
# ============================================
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_VERIFY_SERVICE_SID=your_twilio_verify_service_sid
TWILIO_PHONE_NUMBER=+1234567890

# ============================================
# FIREBASE PUSH NOTIFICATIONS
# ============================================
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email@project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"

# ============================================
# EMAIL/SMTP CONFIGURATION
# ============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
EMAIL_FROM_NAME=AlphaLinkup

# ============================================
# SECURITY & RATE LIMITING
# ============================================
MAX_PAYLOAD_SIZE=10mb
GLOBAL_RATE_LIMIT=1000
EOF
    print_warning "Please edit .env file and add your actual credentials!"
    print_warning "Run: nano $PROJECT_DIR/.env"
    read -p "Press Enter after you've updated .env file..."
else
    print_status ".env file exists"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
if [ ! -d "node_modules" ]; then
    npm install --production
    print_status "Dependencies installed"
else
    print_status "Dependencies already installed (node_modules exists)"
    read -p "Reinstall dependencies? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npm install --production
        print_status "Dependencies reinstalled"
    fi
fi

# Check PM2 installation
echo ""
echo "🔄 Checking PM2 installation..."
if command -v pm2 &> /dev/null; then
    print_status "PM2 is installed"
else
    print_warning "PM2 is not installed. Installing..."
    sudo npm install -g pm2
    print_status "PM2 installed"
fi

# Setup PM2 startup script
echo ""
echo "🔄 Setting up PM2 startup..."
pm2 startup | grep -v "PM2" | grep -v "command" | bash || true
print_status "PM2 startup configured"

# Stop existing PM2 process if running
echo ""
echo "🛑 Stopping existing PM2 processes..."
pm2 delete alphalinkup-backend 2>/dev/null || true
print_status "Cleaned up existing processes"

# Start application with PM2
echo ""
echo "🚀 Starting application with PM2..."
pm2 start src/server.js --name alphalinkup-backend || pm2 start npm --name alphalinkup-backend -- start
pm2 save
print_status "Application started with PM2"

# Show PM2 status
echo ""
echo "📊 PM2 Status:"
pm2 status

# Show logs
echo ""
echo "📋 Recent logs (last 20 lines):"
pm2 logs alphalinkup-backend --lines 20 --nostream

# Check if application is running
echo ""
echo "🔍 Checking application health..."
sleep 3
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    print_status "Application is running and healthy!"
    echo ""
    echo "✅ Deployment completed successfully!"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Check logs: pm2 logs alphalinkup-backend"
    echo "   2. Setup Nginx: See AWS_EC2_DEPLOYMENT_GUIDE.md"
    echo "   3. Configure firewall: sudo ufw allow 3000/tcp"
    echo "   4. Test API: curl http://localhost:3000/health"
else
    print_warning "Application might not be running. Check logs:"
    echo "   pm2 logs alphalinkup-backend"
    echo ""
    print_warning "Please check:"
    echo "   1. .env file has correct database credentials"
    echo "   2. MySQL is running: sudo systemctl status mysql"
    echo "   3. Database exists and user has permissions"
fi

echo ""
echo "================================================"
echo "🎉 Deployment script completed!"
echo "================================================"





