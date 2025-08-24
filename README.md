# 🚀 AlphaLinkup NodeJS Backend

A comprehensive, enterprise-grade NodeJS backend application that provides feature parity with the existing PHP backend while offering modern architecture, enhanced security, and superior performance.

## ✨ Features

### 🎯 Core Functionality
- **Authentication System**: OTP-based authentication with Twilio integration and QR code generation
- **User Management**: Complete user registration, authentication, and profile management
- **Business Cards**: Digital business card creation, activation, sharing, and analytics
- **Service/Investor Unlock System**: Monetization through premium content unlocking
- **Contact Management**: Complete contact and visiting card system with organization
- **Master Data Management**: Comprehensive lookup tables and reference data
- **Job Management**: Job postings, applications, and recruitment system
- **Event Management**: Event creation, registration, and management
- **Chat System**: Real-time messaging with group chat support
- **Admin Functions**: Comprehensive administrative tools and content moderation
- **Advanced Search**: Global search with relevance scoring and faceted search
- **Analytics & Reporting**: Business intelligence and comprehensive reporting
- **Payment Processing**: Multi-provider payment and subscription management

### 🛡️ Security Features
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Granular permissions and authorization
- **Rate Limiting**: Comprehensive rate limiting and DDoS protection
- **Input Validation**: Robust input validation and sanitization
- **Security Headers**: Helmet.js security middleware
- **CORS Protection**: Configurable cross-origin resource sharing

### 🚀 Performance Features
- **Compression**: Response compression for improved performance
- **Caching**: Redis-based caching system
- **Database Optimization**: Efficient queries and connection pooling
- **Background Jobs**: Scheduled tasks and background processing
- **Real-time Features**: WebSocket-ready endpoints for live updates

## 🏗️ Architecture

### 📁 Project Structure
```
src/
├── config/          # Configuration files
├── controllers/     # API controllers
├── middlewares/     # Express middlewares
├── models/          # Database models
├── routes/          # API route definitions
├── services/        # Business logic services
├── utils/           # Utility functions
├── validations/     # Input validation schemas
├── app.js          # Express application setup
└── server.js       # Server startup and management
```

### 🔧 Technology Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MySQL with connection pooling
- **Authentication**: JWT with bcrypt
- **Validation**: Joi schema validation
- **Logging**: Winston logger
- **Scheduling**: Node-cron for background tasks
- **File Processing**: Multer + Sharp for image handling
- **Email**: Nodemailer for email services
- **SMS**: Twilio integration
- **Caching**: Redis for performance optimization

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MySQL 8.0+
- Redis (optional, for caching)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd AlphaLinkup_NodeJS_Backend
   ```

2. **Install dependencies**
   ```bash
npm install
```

3. **Environment setup**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Database setup**
   ```bash
   # Create database and run migrations
   npm run migrate
   ```

5. **Start the server**
   ```bash
   # Development mode
npm run dev
   
   # Production mode
   npm start
   
   # Using startup script
   node start.js
   ```

### Environment Variables

```env
# Server Configuration
NODE_ENV=development
PORT=3000
APP_VERSION=1.0.0

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=your_database
DB_POOL_SIZE=10

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# File Upload Configuration
MAX_PAYLOAD_SIZE=10mb
UPLOAD_PATH=./uploads

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number

# Redis Configuration (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Security Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
GLOBAL_RATE_LIMIT=1000
```

## 📚 API Documentation

### 🔗 Base URL
```
http://localhost:3000/api/v1
```

### 📋 Available Endpoints

#### 👥 User Management (`/users`)
- `POST /register` - User registration
- `POST /login` - User authentication
- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile
- `GET /connections` - Get user connections
- `POST /connections/:userId/send` - Send connection request

#### 💼 Job Management (`/jobs`)
- `POST /` - Create job posting
- `GET /` - Get all jobs
- `GET /:jobId` - Get specific job
- `POST /:jobId/apply` - Apply for job
- `GET /search` - Search jobs
- `GET /recommendations` - Get job recommendations

#### 🎉 Event Management (`/events`)
- `POST /` - Create event
- `GET /` - Get all events
- `POST /:eventId/register` - Register for event
- `PUT /:eventId/cancel` - Cancel event
- `GET /search` - Search events

#### 💬 Chat System (`/chat`)
- `POST /messages/:receiverId` - Send message
- `GET /conversations` - Get conversations
- `POST /groups` - Create group chat
- `GET /groups/:groupId/messages` - Get group messages

#### 🔐 Admin Functions (`/admin`)
- `POST /login` - Admin authentication
- `GET /dashboard` - Admin dashboard
- `GET /users` - User management
- `GET /moderation` - Content moderation
- `GET /analytics` - System analytics

#### 🔍 Search System (`/search`)
- `GET /global` - Global search across all entities
- `GET /users` - User search
- `GET /jobs` - Job search
- `GET /suggestions` - Search suggestions

#### 📊 Analytics (`/analytics`)
- `GET /overview` - Platform overview
- `GET /users` - User analytics
- `GET /business` - Business metrics
- `GET /performance` - Performance metrics

#### 💳 Payment Processing (`/payments`)
- `POST /process` - Process payment
- `POST /subscriptions` - Create subscription
- `GET /plans` - Get subscription plans
- `POST /payments/:paymentId/refund` - Process refund

#### 🔓 Service/Investor Unlocks (`/unlocks`)
- `POST /services` - Unlock service for user
- `POST /investors` - Unlock investor profile for user
- `GET /services/user` - Get user's unlocked services
- `GET /investors/user` - Get user's unlocked investors
- `GET /investors/meeting-request` - Request investor meeting
- `GET /investors/:investor_id/desk` - Get investor desk information

#### 📱 Contact Management (`/contacts`)
- `POST /` - Add new contact
- `GET /` - Get user's contacts with filtering and search
- `GET /search` - Search contacts
- `GET /stats` - Get contact statistics
- `POST /categories` - Add contact category
- `POST /import` - Import contacts from file
- `GET /export` - Export contacts to various formats
- `POST /sync` - Sync contacts with external services

#### 📊 Master Data Management (`/master-data`)
- `GET /categories` - Get all master data categories
- `GET /categories/:category` - Get master data by category
- `GET /location-hierarchy` - Get location hierarchy data
- `GET /search` - Search master data
- `GET /suggestions` - Get master data suggestions
- `GET /export` - Export master data
- `GET /validate` - Validate master data integrity

### 🔐 Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

```bash
Authorization: Bearer <your_jwt_token>
```

### 📝 Request/Response Format

All API responses follow a consistent format:

```json
{
  "status": "success",
  "message": "Operation completed successfully",
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test files
npm test -- --grep "User"
```

### Test Environment
```bash
# Set test environment
NODE_ENV=test npm test
```

## 🚀 Deployment

### Production Build
```bash
# Build the application
npm run build

# Start production server
npm start
```

### Docker Deployment
```bash
# Build Docker image
docker build -t alphalinkup-backend .

# Run container
docker run -p 3000:3000 alphalinkup-backend
```

### Environment-Specific Configurations
- **Development**: `NODE_ENV=development`
- **Staging**: `NODE_ENV=staging`
- **Production**: `NODE_ENV=production`

## 📊 Monitoring & Logging

### Logging
- **Winston Logger**: Structured logging with multiple transports
- **Log Levels**: error, warn, info, debug
- **Log Rotation**: Automatic log file rotation
- **Request Logging**: All HTTP requests are logged

### Health Checks
- **Health Endpoint**: `/health` - System status
- **Database Health**: Connection status monitoring
- **Service Health**: External service availability

### Performance Monitoring
- **Response Times**: Request/response timing
- **Error Rates**: Error tracking and alerting
- **Resource Usage**: Memory and CPU monitoring

## 🔧 Development

### Code Quality
```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Database Migrations
```bash
# Run migrations
npm run migrate

# Rollback migrations
npm run migrate:rollback

# Seed database
npm run seed
```

### Background Tasks
The application includes scheduled background tasks:
- Database cleanup (daily)
- Email queue processing (every 5 minutes)
- Analytics aggregation (hourly)
- System health checks (every 15 minutes)
- Cache cleanup (every 6 hours)
- Backup creation (daily)
- User activity cleanup (weekly)
- Payment reconciliation (daily)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards
- Follow ESLint configuration
- Use meaningful commit messages
- Include tests for new features
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [API Reference](./docs/API.md)
- [Database Schema](./docs/DATABASE.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)

### Issues
- [GitHub Issues](https://github.com/your-repo/issues)
- [Bug Reports](https://github.com/your-repo/issues/new?template=bug_report.md)
- [Feature Requests](https://github.com/your-repo/issues/new?template=feature_request.md)

### Contact
- **Email**: support@alphalinkup.com
- **Discord**: [Join our community](https://discord.gg/alphalinkup)
- **Documentation**: [docs.alphalinkup.com](https://docs.alphalinkup.com)

## 🎯 Roadmap

### 🚀 Upcoming Features
- [ ] GraphQL API support
- [ ] WebSocket real-time features
- [ ] Advanced caching strategies
- [ ] Microservices architecture
- [ ] Kubernetes deployment
- [ ] Advanced analytics dashboard
- [ ] Machine learning integration
- [ ] Multi-language support

### 🔄 Current Development
- [x] Core API endpoints
- [x] Authentication system (OTP + Twilio)
- [x] QR code generation system
- [x] Business card management
- [x] Service/Investor unlock system
- [x] Contact management system
- [x] Master data management
- [x] Database models
- [x] Business logic services
- [x] Admin functions
- [x] Search system
- [x] Analytics platform
- [x] Payment processing

---

**Built with ❤️ by the AlphaLinkup Team**

*This backend provides complete feature parity with the PHP version while offering modern architecture, enhanced security, and superior performance.*
