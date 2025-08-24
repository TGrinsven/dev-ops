# Azure Deployment Plan - JDM Portal
**Student:** Jose Kaanene Torres van Grinsven (2204077)  
**Date:** 2025-08-24  
**Budget:** $100 Azure Student Credit  
**Application:** JDM Portal - Node.js Express Application

---

## Table of Contents
1. [Prerequisites & Azure Account Setup](#1-prerequisites--azure-account-setup)
2. [Azure CLI Installation & Configuration](#2-azure-cli-installation--configuration)
3. [Resource Group & Initial Setup](#3-resource-group--initial-setup)
4. [Deploy Infrastructure with ARM Template](#4-deploy-infrastructure-with-arm-template)
5. [Application Deployment](#5-application-deployment)
6. [Application Insights Configuration](#6-application-insights-configuration)
7. [GitHub Secrets & CI/CD Setup](#7-github-secrets--cicd-setup)
8. [Cost Management & Optimization](#8-cost-management--optimization)
9. [Monitoring & Alerts](#9-monitoring--alerts)
10. [Verification & Testing](#10-verification--testing)
11. [Troubleshooting Guide](#11-troubleshooting-guide)

---

## 1. Prerequisites & Azure Account Setup

### 1.1 Azure Student Account
1. Navigate to [Azure for Students](https://azure.microsoft.com/en-us/free/students/)
2. Sign in with your school email (@student.inholland.nl or similar)
3. Verify your student status
4. Activate $100 credit (valid for 12 months)

### 1.2 Required Tools
```bash
# Check if these are installed
node --version          # Should be >= 18.0.0
npm --version          # Should be >= 9.0.0
git --version          # Any recent version
```

### 1.3 Project Requirements
- MongoDB connection string (Azure Cosmos DB or external MongoDB)
- Redis connection (optional, for caching)
- GitHub repository with the JDM Portal code

---

## 2. Azure CLI Installation & Configuration

### 2.1 Install Azure CLI on macOS
```bash
# Install Azure CLI using Homebrew
brew update && brew install azure-cli

# Verify installation
az --version
```

### 2.2 Login to Azure
```bash
# Login to Azure
az login

# Set your subscription (use student subscription)
az account list --output table
az account set --subscription "Azure for Students"

# Verify current subscription
az account show --output table
```

---

## 3. Resource Group & Initial Setup

### 3.1 Set Environment Variables
```bash
# Set deployment variables
export STUDENT_ID="2204077"
export RESOURCE_GROUP="rg-jdm-portal-${STUDENT_ID}"
export LOCATION="westeurope"  # Amsterdam region, lowest latency
export APP_NAME="jdm-portal-${STUDENT_ID}"
export ENVIRONMENT="production"
export TIMESTAMP=$(date +%Y%m%d%H%M%S)
```

### 3.2 Create Resource Group
```bash
# Create resource group
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION \
  --tags "Student=Jose_Torres_van_Grinsven" "StudentID=${STUDENT_ID}" "Project=JDM-Portal" "Environment=${ENVIRONMENT}"

# Verify resource group creation
az group show --name $RESOURCE_GROUP --output table
```

---

## 4. Deploy Infrastructure with ARM Template

### 4.1 Validate ARM Template
```bash
# Navigate to project directory
cd "/Users/josetorresvangrinsven/dev ops"

# Validate the ARM template
az deployment group validate \
  --resource-group $RESOURCE_GROUP \
  --template-file azuredeploy.json \
  --parameters \
    environment="${ENVIRONMENT}" \
    appServicePlanSku="F1" \
    enableAutoScale=false \
    minCapacity=1 \
    maxCapacity=1
```

### 4.2 Deploy ARM Template (Cost-Optimized for Student)
```bash
# Deploy with student-budget-friendly parameters
az deployment group create \
  --name "deploy-${TIMESTAMP}" \
  --resource-group $RESOURCE_GROUP \
  --template-file azuredeploy.json \
  --parameters \
    environment="${ENVIRONMENT}" \
    location="${LOCATION}" \
    appServicePlanSku="F1" \
    appInsightsLocation="${LOCATION}" \
    enableAutoScale=false \
    minCapacity=1 \
    maxCapacity=1 \
    targetCpuPercentage=70 \
  --verbose

# Save deployment outputs
az deployment group show \
  --name "deploy-${TIMESTAMP}" \
  --resource-group $RESOURCE_GROUP \
  --query properties.outputs > deployment-outputs.json
```

### 4.3 Extract Deployment Outputs
```bash
# Extract important values
export WEBSITE_URL=$(az deployment group show \
  --name "deploy-${TIMESTAMP}" \
  --resource-group $RESOURCE_GROUP \
  --query properties.outputs.websiteUrl.value -o tsv)

export APP_INSIGHTS_KEY=$(az deployment group show \
  --name "deploy-${TIMESTAMP}" \
  --resource-group $RESOURCE_GROUP \
  --query properties.outputs.appInsightsInstrumentationKey.value -o tsv)

export STORAGE_ACCOUNT=$(az deployment group show \
  --name "deploy-${TIMESTAMP}" \
  --resource-group $RESOURCE_GROUP \
  --query properties.outputs.storageAccountName.value -o tsv)

echo "Website URL: $WEBSITE_URL"
echo "App Insights Key: $APP_INSIGHTS_KEY"
```

---

## 5. Application Deployment

### 5.1 Prepare Application for Deployment
```bash
# Build the application
npm ci --production
npm run build

# Create deployment package
zip -r deploy.zip . \
  -x "*.git*" \
  -x "node_modules/*" \
  -x "tests/*" \
  -x "*.md" \
  -x ".env*"
```

### 5.2 Configure App Service
```bash
# Configure Node.js version
az webapp config set \
  --resource-group $RESOURCE_GROUP \
  --name "jdm-portal-${ENVIRONMENT}" \
  --linux-fx-version "NODE|18-lts"

# Set startup command
az webapp config set \
  --resource-group $RESOURCE_GROUP \
  --name "jdm-portal-${ENVIRONMENT}" \
  --startup-file "npm start"

# Configure app settings
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name "jdm-portal-${ENVIRONMENT}" \
  --settings \
    NODE_ENV="${ENVIRONMENT}" \
    PORT=8080 \
    WEBSITE_NODE_DEFAULT_VERSION="~18" \
    APPINSIGHTS_INSTRUMENTATIONKEY="${APP_INSIGHTS_KEY}"
```

### 5.3 Deploy Application Code
```bash
# Deploy using ZIP deployment
az webapp deployment source config-zip \
  --resource-group $RESOURCE_GROUP \
  --name "jdm-portal-${ENVIRONMENT}" \
  --src deploy.zip

# Alternative: Deploy from local Git
az webapp deployment source config-local-git \
  --resource-group $RESOURCE_GROUP \
  --name "jdm-portal-${ENVIRONMENT}" \
  --output tsv

# Get deployment credentials
az webapp deployment list-publishing-credentials \
  --resource-group $RESOURCE_GROUP \
  --name "jdm-portal-${ENVIRONMENT}" \
  --query "{username:publishingUserName, password:publishingPassword}"
```

### 5.4 Configure MongoDB Connection
```bash
# If using Azure Cosmos DB (MongoDB API)
az cosmosdb create \
  --name "cosmos-jdm-${STUDENT_ID}" \
  --resource-group $RESOURCE_GROUP \
  --kind MongoDB \
  --locations regionName="${LOCATION}" \
  --default-consistency-level "Session" \
  --enable-free-tier true

# Get connection string
MONGO_CONNECTION=$(az cosmosdb keys list \
  --name "cosmos-jdm-${STUDENT_ID}" \
  --resource-group $RESOURCE_GROUP \
  --type connection-strings \
  --query connectionStrings[0].connectionString -o tsv)

# Set MongoDB connection in App Service
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name "jdm-portal-${ENVIRONMENT}" \
  --settings MONGODB_URI="${MONGO_CONNECTION}"
```

---

## 6. Application Insights Configuration

### 6.1 Enable Application Insights
```bash
# Enable Application Insights integration
az monitor app-insights component connect-webapp \
  --resource-group $RESOURCE_GROUP \
  --app "jdm-portal-${ENVIRONMENT}" \
  --component "appi-jdm-portal-${ENVIRONMENT}" \
  --enable-profiler \
  --enable-snapshot-debugger
```

### 6.2 Configure Custom Metrics
```bash
# Create custom dashboard
az portal dashboard create \
  --name "JDM-Portal-Dashboard" \
  --resource-group $RESOURCE_GROUP \
  --input-path dashboard-template.json \
  --location $LOCATION
```

---

## 7. GitHub Secrets & CI/CD Setup

### 7.1 Create Service Principal
```bash
# Create service principal for GitHub Actions
az ad sp create-for-rbac \
  --name "github-actions-jdm-portal" \
  --role contributor \
  --scopes /subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP \
  --sdk-auth > azure-credentials.json

# Display credentials (save these securely)
cat azure-credentials.json
```

### 7.2 Configure GitHub Secrets
Add these secrets to your GitHub repository (Settings → Secrets → Actions):

```bash
# Required GitHub Secrets:
AZURE_CREDENTIALS        # Content of azure-credentials.json
AZURE_SUBSCRIPTION_ID    # Your subscription ID
AZURE_WEBAPP_NAME        # jdm-portal-production
RESOURCE_GROUP           # rg-jdm-portal-2204077
AZURE_REGION            # westeurope

# Application Secrets:
MONGODB_URI             # MongoDB connection string
APP_INSIGHTS_KEY        # Application Insights key
NODE_ENV               # production

# Optional:
SLACK_WEBHOOK          # For notifications
SONAR_TOKEN           # For code quality
```

### 7.3 Setup GitHub Actions Workflow
```bash
# Copy workflow to .github/workflows/
mkdir -p .github/workflows
cp ci-cd-workflow.yml .github/workflows/azure-deploy.yml

# Commit and push
git add .github/workflows/azure-deploy.yml
git commit -m "feat: add Azure deployment workflow"
git push origin main
```

---

## 8. Cost Management & Optimization

### 8.1 Enable Cost Alerts
```bash
# Create budget alert for $25 (25% of student credit)
az consumption budget create \
  --budget-name "JDM-Portal-Budget" \
  --resource-group $RESOURCE_GROUP \
  --amount 25 \
  --time-grain Monthly \
  --start-date $(date +%Y-%m-01) \
  --end-date $(date -d "+11 months" +%Y-%m-01) \
  --category Cost \
  --notifications "{
    'Actual_GreaterThan_80_Percent': {
      'enabled': true,
      'operator': 'GreaterThan',
      'threshold': 80,
      'contactEmails': ['j.torres@student.inholland.nl'],
      'contactRoles': ['Owner']
    }
  }"
```

### 8.2 Cost Optimization Settings
```bash
# Use Free Tier resources where possible
# 1. App Service: F1 (Free tier)
az webapp update \
  --resource-group $RESOURCE_GROUP \
  --name "jdm-portal-${ENVIRONMENT}" \
  --set kind="app,linux" \
  --sku F1

# 2. Configure auto-shutdown for non-production hours
az webapp config set \
  --resource-group $RESOURCE_GROUP \
  --name "jdm-portal-${ENVIRONMENT}" \
  --always-on false

# 3. Set Log Analytics workspace daily cap
az monitor log-analytics workspace update \
  --resource-group $RESOURCE_GROUP \
  --workspace-name "log-jdm-portal-${ENVIRONMENT}" \
  --quota 0.5  # 500MB per day
```

### 8.3 Monthly Cost Breakdown (Estimated)
```
Service                    | SKU/Tier    | Monthly Cost
--------------------------|-------------|-------------
App Service Plan          | F1 (Free)   | $0.00
Application Insights      | Basic       | ~$2.30 (1GB/month)
Storage Account          | Standard    | ~$2.00
Key Vault                | Standard    | ~$0.50
Cosmos DB                | Free Tier   | $0.00
Log Analytics            | Pay-as-go   | ~$2.50 (capped)
--------------------------|-------------|-------------
TOTAL ESTIMATED          |             | ~$7.30/month
```

---

## 9. Monitoring & Alerts

### 9.1 Configure Health Check
```bash
# Enable health check endpoint
az webapp config set \
  --resource-group $RESOURCE_GROUP \
  --name "jdm-portal-${ENVIRONMENT}" \
  --health-check-path "/health"

# Create availability test
az monitor app-insights web-test create \
  --resource-group $RESOURCE_GROUP \
  --name "health-check-test" \
  --defined-web-test-name "JDM Portal Health Check" \
  --frequency 300 \
  --timeout 30 \
  --web-test-kind "ping" \
  --synthetic-monitor-id "health-monitor-1" \
  --locations "West Europe" \
  --uri "${WEBSITE_URL}/health"
```

### 9.2 Setup Critical Alerts
```bash
# Create action group for alerts
az monitor action-group create \
  --resource-group $RESOURCE_GROUP \
  --name "ag-jdm-critical" \
  --short-name "JDMAlert" \
  --email "jose-admin" "j.torres@student.inholland.nl"

# Alert for high response time
az monitor metrics alert create \
  --resource-group $RESOURCE_GROUP \
  --name "alert-response-time" \
  --description "Alert when response time > 3 seconds" \
  --target "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/jdm-portal-${ENVIRONMENT}" \
  --condition "avg HttpResponseTime > 3" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action "ag-jdm-critical"

# Alert for application errors
az monitor metrics alert create \
  --resource-group $RESOURCE_GROUP \
  --name "alert-http-errors" \
  --description "Alert when HTTP 5xx errors > 10" \
  --target "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/jdm-portal-${ENVIRONMENT}" \
  --condition "total Http5xx > 10" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action "ag-jdm-critical"
```

### 9.3 Application Insights Queries
```bash
# View recent errors
az monitor app-insights query \
  --app "appi-jdm-portal-${ENVIRONMENT}" \
  --resource-group $RESOURCE_GROUP \
  --analytics-query "exceptions | where timestamp > ago(1h) | order by timestamp desc | take 20"

# View performance metrics
az monitor app-insights query \
  --app "appi-jdm-portal-${ENVIRONMENT}" \
  --resource-group $RESOURCE_GROUP \
  --analytics-query "requests | summarize avg(duration), percentile(duration, 95), count() by bin(timestamp, 5m)"
```

---

## 10. Verification & Testing

### 10.1 Deployment Verification
```bash
# Check application status
az webapp show \
  --resource-group $RESOURCE_GROUP \
  --name "jdm-portal-${ENVIRONMENT}" \
  --query state -o tsv

# Test application endpoint
curl -I ${WEBSITE_URL}
curl ${WEBSITE_URL}/health

# View application logs
az webapp log tail \
  --resource-group $RESOURCE_GROUP \
  --name "jdm-portal-${ENVIRONMENT}"
```

### 10.2 Performance Testing
```bash
# Basic load test
ab -n 100 -c 10 ${WEBSITE_URL}/

# Monitor metrics during test
az monitor metrics list \
  --resource "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/jdm-portal-${ENVIRONMENT}" \
  --metric "CpuPercentage" "MemoryWorkingSet" "HttpResponseTime" \
  --interval PT1M \
  --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S)Z
```

---

## 11. Troubleshooting Guide

### 11.1 Common Issues & Solutions

#### Application Won't Start
```bash
# Check application logs
az webapp log download \
  --resource-group $RESOURCE_GROUP \
  --name "jdm-portal-${ENVIRONMENT}" \
  --log-file app-logs.zip

# SSH into container (if Linux)
az webapp ssh \
  --resource-group $RESOURCE_GROUP \
  --name "jdm-portal-${ENVIRONMENT}"

# Check environment variables
az webapp config appsettings list \
  --resource-group $RESOURCE_GROUP \
  --name "jdm-portal-${ENVIRONMENT}" \
  --output table
```

#### High Costs
```bash
# Review cost analysis
az consumption usage list \
  --start-date $(date -d '30 days ago' +%Y-%m-%d) \
  --end-date $(date +%Y-%m-%d) \
  --query "[?resourceGroup=='$RESOURCE_GROUP'].{Resource:instanceName, Cost:pretaxCost, Currency:currency}" \
  --output table

# Identify expensive resources
az resource list \
  --resource-group $RESOURCE_GROUP \
  --query "[].{Name:name, Type:type, SKU:sku.name}" \
  --output table
```

#### Deployment Failures
```bash
# Check deployment history
az webapp deployment list \
  --resource-group $RESOURCE_GROUP \
  --name "jdm-portal-${ENVIRONMENT}" \
  --output table

# Get deployment logs
az webapp log deployment show \
  --resource-group $RESOURCE_GROUP \
  --name "jdm-portal-${ENVIRONMENT}" \
  --deployment-id <deployment-id>

# Restart application
az webapp restart \
  --resource-group $RESOURCE_GROUP \
  --name "jdm-portal-${ENVIRONMENT}"
```

### 11.2 Cleanup Commands (End of Project)
```bash
# Delete entire resource group (WARNING: This deletes everything!)
az group delete \
  --name $RESOURCE_GROUP \
  --yes \
  --no-wait

# Remove service principal
az ad sp delete --id $(az ad sp list --display-name "github-actions-jdm-portal" --query [0].appId -o tsv)
```

---

## Quick Reference Commands

```bash
# View all resources
az resource list --resource-group $RESOURCE_GROUP --output table

# Get application URL
echo ${WEBSITE_URL}

# Stream live logs
az webapp log tail --resource-group $RESOURCE_GROUP --name "jdm-portal-${ENVIRONMENT}"

# Check costs
az consumption usage list --query "[?resourceGroup=='$RESOURCE_GROUP'] | [0:5]" --output table

# Application status
az webapp show --resource-group $RESOURCE_GROUP --name "jdm-portal-${ENVIRONMENT}" --query "{Status:state, URL:defaultHostName}" --output table
```

---

## Important Notes for Student Budget

1. **Free Tier First**: Always use free tiers where available (F1 App Service, Free Cosmos DB)
2. **Monitor Daily**: Check Azure Cost Management daily to avoid surprises
3. **Auto-Shutdown**: Configure resources to shut down during non-use hours
4. **Clean Up**: Delete unused resources immediately
5. **Use Alerts**: Set up budget alerts at 25%, 50%, and 75% thresholds
6. **Development vs Production**: Use local development as much as possible
7. **Resource Tags**: Tag all resources for easy cost tracking

---

## Support & Resources

- [Azure Documentation](https://docs.microsoft.com/azure)
- [Azure for Students Portal](https://portal.azure.com/#blade/Microsoft_Azure_Education/EducationMenuBlade/overview)
- [Azure Cost Management](https://portal.azure.com/#blade/Microsoft_Azure_CostManagement/Menu/overview)
- [JDM Portal Repository](https://github.com/your-organization/jdm-portal)

---

**Document Version:** 1.0.0  
**Last Updated:** 2025-08-24  
**Author:** Jose Kaanene Torres van Grinsven (2204077)