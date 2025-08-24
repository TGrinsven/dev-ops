# JDM Portal

A modern web portal application built with Node.js and Express, designed for efficient data management and user interaction.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running Locally](#running-locally)
- [Testing](#testing)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)

## Overview

JDM Portal is a full-stack web application that provides a comprehensive platform for data management and visualization. Built with modern web technologies, it offers a responsive user interface, robust backend services, and seamless integration with Azure cloud services.

### Key Technologies

- **Backend**: Node.js, Express.js
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Database**: MongoDB/Azure Cosmos DB
- **Cloud**: Microsoft Azure
- **Monitoring**: Azure Application Insights
- **Testing**: Jest, Playwright
- **Code Quality**: ESLint, Prettier

## Features

- User authentication and authorization
- RESTful API endpoints
- Real-time data synchronization
- Responsive web interface
- Performance monitoring and analytics
- Automated testing suite
- Docker containerization support
- CI/CD pipeline ready

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

- **Node.js**: v18.0.0 or higher ([Download](https://nodejs.org/))
- **npm**: v9.0.0 or higher (comes with Node.js)
- **Git**: v2.30.0 or higher ([Download](https://git-scm.com/))

### Optional Software

- **Docker**: v20.10.0 or higher ([Download](https://www.docker.com/))
- **Azure CLI**: v2.40.0 or higher ([Download](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli))
- **MongoDB**: v5.0.0 or higher (for local development) ([Download](https://www.mongodb.com/try/download/community))

### Azure Account Requirements

- Active Azure subscription ([Free trial available](https://azure.microsoft.com/free/))
- Azure Resource Group
- Azure App Service (for deployment)
- Azure Application Insights (for monitoring)
- Azure Key Vault (for secrets management)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-organization/jdm-portal.git
cd jdm-portal
```

### 2. Install Dependencies

```bash
# Install all dependencies
npm install

# Install global tools (optional)
npm install -g nodemon
npm install -g pm2
```

### 3. Environment Setup

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

### 4. Database Setup

#### Local MongoDB

```bash
# Start MongoDB service
mongod --dbpath ./data/db

# Create database and collections
npm run db:setup
```

#### Azure Cosmos DB

1. Create a Cosmos DB account in Azure Portal
2. Copy connection string
3. Update `.env` file with connection details

## Configuration

### Environment Variables

Configure the following environment variables in your `.env` file:

```env
# Application Settings
NODE_ENV=development
PORT=3000
APP_NAME=JDM Portal
APP_VERSION=1.0.0

# Database Configuration
DB_CONNECTION_STRING=mongodb://localhost:27017/jdm_portal
DB_NAME=jdm_portal
DB_USER=admin
DB_PASSWORD=your_password

# Azure Configuration
AZURE_SUBSCRIPTION_ID=your_subscription_id
AZURE_RESOURCE_GROUP=jdm-portal-rg
AZURE_APP_SERVICE_NAME=jdm-portal-app

# Application Insights
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=your_key
APPLICATIONINSIGHTS_ROLE_NAME=jdm-portal

# Authentication
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRATION=24h
SESSION_SECRET=your_session_secret

# Email Service
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your_sendgrid_api_key
EMAIL_FROM=noreply@jdmportal.com

# API Keys
API_KEY=your_api_key
EXTERNAL_SERVICE_URL=https://api.example.com

# Feature Flags
ENABLE_CACHE=true
ENABLE_LOGGING=true
ENABLE_METRICS=true
```

### Application Configuration

Edit `config/default.json` for application-specific settings:

```json
{
  "server": {
    "port": 3000,
    "host": "0.0.0.0"
  },
  "database": {
    "poolSize": 10,
    "timeout": 30000
  },
  "cache": {
    "ttl": 3600,
    "maxSize": 100
  },
  "logging": {
    "level": "info",
    "format": "json"
  }
}
```

## Running Locally

### Development Mode

```bash
# Start with nodemon (auto-restart on changes)
npm run dev

# Or use standard start
npm start
```

### Production Mode

```bash
# Build the application
npm run build

# Start in production mode
npm run start:prod

# Or use PM2 for process management
pm2 start ecosystem.config.js
```

### Docker Mode

```bash
# Build Docker image
docker build -t jdm-portal:latest .

# Run Docker container
docker run -p 3000:3000 --env-file .env jdm-portal:latest

# Using Docker Compose
docker-compose up -d
```

### Accessing the Application

Once running, access the application at:
- **Local**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **API Documentation**: http://localhost:3000/api-docs

## Testing

### Unit Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Integration Tests

```bash
# Run integration tests
npm run test:integration

# Run specific test suite
npm run test:integration -- --testNamePattern="API"
```

### End-to-End Tests

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in headed mode
npm run test:e2e:headed
```

### Linting and Code Quality

```bash
# Run ESLint
npm run lint

# Fix ESLint issues automatically
npm run lint:fix

# Format code with Prettier
npm run format

# Check code formatting
npm run format:check
```

### Security Audit

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities automatically
npm audit fix

# Run security scan
npm run security:check
```

## Deployment

### Azure App Service Deployment

#### Using Azure CLI

```bash
# Login to Azure
az login

# Create resource group
az group create --name jdm-portal-rg --location eastus

# Create App Service plan
az appservice plan create \
  --name jdm-portal-plan \
  --resource-group jdm-portal-rg \
  --sku B2 \
  --is-linux

# Create web app
az webapp create \
  --name jdm-portal-app \
  --resource-group jdm-portal-rg \
  --plan jdm-portal-plan \
  --runtime "NODE|18-lts"

# Configure environment variables
az webapp config appsettings set \
  --name jdm-portal-app \
  --resource-group jdm-portal-rg \
  --settings @appsettings.json

# Deploy code
npm run deploy:azure
```

#### Using GitHub Actions

1. Set up GitHub secrets:
   - `AZURE_CREDENTIALS`
   - `AZURE_WEBAPP_NAME`
   - `AZURE_WEBAPP_PACKAGE_PATH`

2. Push to main branch to trigger deployment:
```bash
git push origin main
```

### Docker Deployment

```bash
# Build and tag image
docker build -t jdmportal.azurecr.io/jdm-portal:latest .

# Push to Azure Container Registry
az acr login --name jdmportal
docker push jdmportal.azurecr.io/jdm-portal:latest

# Deploy to Azure Container Instances
az container create \
  --resource-group jdm-portal-rg \
  --name jdm-portal-container \
  --image jdmportal.azurecr.io/jdm-portal:latest \
  --dns-name-label jdm-portal \
  --ports 3000
```

### Manual Deployment

```bash
# Build production assets
npm run build

# Create deployment package
npm run package

# Deploy using FTP/SFTP
npm run deploy:ftp
```

## Project Structure

```
jdm-portal/
├── src/                      # Source code
│   ├── controllers/          # Route controllers
│   ├── models/              # Database models
│   ├── routes/              # API routes
│   ├── services/            # Business logic
│   ├── middleware/          # Custom middleware
│   ├── utils/               # Utility functions
│   └── app.js               # Express application
├── public/                  # Static files
│   ├── css/                 # Stylesheets
│   ├── js/                  # Client-side JavaScript
│   └── images/              # Images and assets
├── config/                  # Configuration files
│   ├── default.json         # Default configuration
│   ├── production.json      # Production configuration
│   └── test.json           # Test configuration
├── tests/                   # Test files
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── e2e/                # End-to-end tests
├── scripts/                 # Utility scripts
│   ├── deploy.sh           # Deployment script
│   ├── setup.js            # Setup script
│   └── migrate.js          # Database migration
├── docs/                    # Documentation
│   ├── api/                # API documentation
│   └── guides/             # User guides
├── .github/                 # GitHub configuration
│   └── workflows/          # GitHub Actions workflows
├── .env.example            # Environment variables example
├── .eslintrc.json          # ESLint configuration
├── .prettierrc             # Prettier configuration
├── .dockerignore           # Docker ignore file
├── Dockerfile              # Docker configuration
├── docker-compose.yml      # Docker Compose configuration
├── package.json            # Node.js dependencies
├── package-lock.json       # Locked dependencies
└── README.md               # Project documentation
```

## API Documentation

### Authentication Endpoints

```http
POST   /api/auth/register     # User registration
POST   /api/auth/login        # User login
POST   /api/auth/logout       # User logout
POST   /api/auth/refresh      # Refresh token
POST   /api/auth/forgot       # Password reset request
POST   /api/auth/reset        # Password reset
```

### Resource Endpoints

```http
GET    /api/users            # Get all users
GET    /api/users/:id        # Get user by ID
POST   /api/users            # Create new user
PUT    /api/users/:id        # Update user
DELETE /api/users/:id        # Delete user

GET    /api/data             # Get all data
GET    /api/data/:id         # Get data by ID
POST   /api/data             # Create new data
PUT    /api/data/:id         # Update data
DELETE /api/data/:id         # Delete data
```

### Health and Monitoring

```http
GET    /health               # Health check
GET    /metrics              # Application metrics
GET    /api/status           # API status
```

## Troubleshooting

### Common Issues and Solutions

#### Port Already in Use

**Error**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 npm start
```

#### Database Connection Failed

**Error**: `MongoNetworkError: failed to connect to server`

**Solution**:
1. Check if MongoDB is running: `mongod --version`
2. Verify connection string in `.env`
3. Check network connectivity
4. Ensure database user has proper permissions

#### Module Not Found

**Error**: `Error: Cannot find module 'express'`

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules
rm -rf node_modules package-lock.json

# Reinstall dependencies
npm install
```

#### Azure Deployment Issues

**Error**: `Deployment failed with error code WEBSITE_CONTENTAZUREFILECONNECTIONSTRING`

**Solution**:
1. Check Azure credentials: `az account show`
2. Verify resource group exists
3. Check App Service configuration
4. Review deployment logs: `az webapp log tail --name jdm-portal-app`

#### Application Insights Not Working

**Error**: `Application Insights SDK not initialized`

**Solution**:
1. Verify connection string in `.env`
2. Check network access to Azure
3. Ensure Application Insights resource exists
4. Review initialization code in `app.js`

### Debugging Tips

1. **Enable Debug Mode**:
```bash
DEBUG=* npm start
```

2. **Check Logs**:
```bash
# Application logs
tail -f logs/app.log

# Error logs
tail -f logs/error.log
```

3. **Use Node Inspector**:
```bash
node --inspect src/app.js
```

4. **Environment Variables**:
```bash
# Check loaded environment variables
node -e "console.log(process.env)"
```

## Contributing

We welcome contributions! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m 'Add your feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Submit a pull request

### Code Style

- Follow ESLint configuration
- Use Prettier for formatting
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

### Pull Request Process

1. Update README.md with details of changes
2. Increase version numbers in package.json
3. Ensure all tests pass
4. Request review from maintainers

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Jose Kaanene Torres van Grinsven**  
Student ID: 2204077  
Email: j.torres@student.com  
GitHub: [@josetorres](https://github.com/josetorres)

---

© 2024 JDM Portal. All rights reserved.