# GitHub CI/CD Pipeline Setup Guide
## JDM Portal - Jose Kaanene Torres van Grinsven (2204077)

This guide provides step-by-step instructions to set up a complete CI/CD pipeline using GitHub Actions and Azure deployment for the JDM portal project.

---

## Prerequisites
- GitHub account with repository creation permissions
- Azure subscription with appropriate deployment permissions
- Git installed locally
- Azure CLI installed (optional but recommended)
- Existing JDM portal codebase with `ci-cd-workflow.yml` file

---

## 1. Creating GitHub Repository

### Step 1.1: Create New Repository
1. Navigate to https://github.com
2. Click the **"+"** icon in top-right corner → **"New repository"**
3. Configure repository:
   - **Repository name:** `jdm-portal`
   - **Description:** "JDM Portal - Enterprise Job Data Management System"
   - **Visibility:** Private (recommended for initial setup)
   - **DO NOT** initialize with README, .gitignore, or license (since you have existing code)
4. Click **"Create repository"**

### Step 1.2: Note Repository URL
Copy the repository URL (HTTPS or SSH):
```
https://github.com/[your-username]/jdm-portal.git
```
or
```
git@github.com:[your-username]/jdm-portal.git
```

---

## 2. Initial Commit and Push

### Step 2.1: Initialize Local Repository
Navigate to your JDM portal project directory:
```bash
cd /path/to/jdm-portal
```

### Step 2.2: Initialize Git and Configure
```bash
# Initialize git repository if not already done
git init

# Add GitHub repository as remote
git remote add origin https://github.com/[your-username]/jdm-portal.git

# Verify remote was added
git remote -v
```

### Step 2.3: Prepare Initial Commit
```bash
# Add all files to staging
git add .

# Create initial commit
git commit -m "Initial commit: JDM Portal with CI/CD pipeline"

# Set main branch (GitHub default)
git branch -M main
```

### Step 2.4: Push to GitHub
```bash
# Push code to GitHub
git push -u origin main
```

### Step 2.5: Verify Upload
1. Navigate to your GitHub repository in browser
2. Confirm all files are visible, especially:
   - `.github/workflows/ci-cd-workflow.yml`
   - Application source code
   - Configuration files

---

## 3. Setting Up GitHub Secrets for Azure Deployment

### Step 3.1: Required Azure Credentials
You'll need the following Azure information:
- Azure Subscription ID
- Azure Service Principal credentials (for GitHub to authenticate with Azure)
- Azure Web App name(s)
- Azure Resource Group name
- Azure Container Registry credentials (if using containers)

### Step 3.2: Create Azure Service Principal
Run this Azure CLI command to create a service principal:
```bash
az ad sp create-for-rbac --name "github-jdm-portal" \
  --role contributor \
  --scopes /subscriptions/{subscription-id}/resourceGroups/{resource-group} \
  --sdk-auth
```

This will output JSON credentials like:
```json
{
  "clientId": "xxxx-xxxx-xxxx-xxxx",
  "clientSecret": "xxxx-xxxx-xxxx-xxxx",
  "subscriptionId": "xxxx-xxxx-xxxx-xxxx",
  "tenantId": "xxxx-xxxx-xxxx-xxxx",
  ...
}
```

### Step 3.3: Add Secrets to GitHub
1. Navigate to your GitHub repository
2. Go to **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"** for each secret:

#### Essential Secrets:
| Secret Name | Value | Description |
|------------|--------|-------------|
| `AZURE_CREDENTIALS` | Entire JSON output from Step 3.2 | Azure service principal credentials |
| `AZURE_SUBSCRIPTION_ID` | Your Azure subscription ID | Azure subscription identifier |
| `AZURE_WEBAPP_NAME` | Your web app name | Name of Azure Web App |
| `AZURE_RESOURCE_GROUP` | Your resource group name | Azure resource group |

#### Additional Secrets (if applicable):
| Secret Name | Value | Description |
|------------|--------|-------------|
| `AZURE_WEBAPP_PUBLISH_PROFILE` | Download from Azure Portal | Alternative to service principal |
| `DATABASE_CONNECTION_STRING` | Your DB connection string | Database connectivity |
| `API_KEY` | Your API key | External service keys |
| `AZURE_STORAGE_CONNECTION` | Storage connection string | For blob storage |
| `CONTAINER_REGISTRY_USERNAME` | ACR username | If using containers |
| `CONTAINER_REGISTRY_PASSWORD` | ACR password | If using containers |

### Step 3.4: Verify Secrets
After adding all secrets, you should see them listed (values hidden) under:
**Settings** → **Secrets and variables** → **Actions** → **Repository secrets**

---

## 4. Enabling GitHub Actions

### Step 4.1: Check Workflow File
Ensure `.github/workflows/ci-cd-workflow.yml` exists in your repository with proper configuration.

### Step 4.2: Enable Actions
1. Go to repository **Settings** → **Actions** → **General**
2. Under "Actions permissions", select:
   - **"Allow all actions and reusable workflows"** (for initial testing)
   - Later, restrict to: **"Allow [your-org] actions and reusable workflows"**
3. Under "Workflow permissions", select:
   - **"Read and write permissions"**
   - ✓ **"Allow GitHub Actions to create and approve pull requests"**
4. Click **"Save"**

### Step 4.3: Verify Actions Tab
1. Navigate to the **"Actions"** tab in your repository
2. You should see your workflow listed (ci-cd-workflow)
3. If the workflow ran automatically on push, check its status

---

## 5. Configuring Branch Protection Rules

### Step 5.1: Navigate to Branch Settings
1. Go to **Settings** → **Branches**
2. Click **"Add branch protection rule"**

### Step 5.2: Configure Main Branch Protection
**Branch name pattern:** `main`

**Protection Settings:**
- ✓ **Require a pull request before merging**
  - ✓ Require approvals: 1
  - ✓ Dismiss stale pull request approvals
  - ✓ Require review from CODEOWNERS (if applicable)
- ✓ **Require status checks to pass before merging**
  - ✓ Require branches to be up to date
  - **Required status checks:** Select your CI workflow jobs:
    - `build`
    - `test`
    - `security-scan` (if configured)
- ✓ **Require conversation resolution before merging**
- ✓ **Require signed commits** (optional but recommended)
- ✓ **Include administrators** (enforce for everyone)
- ✓ **Restrict who can push to matching branches** (optional)
  - Add specific users/teams if needed

### Step 5.3: Create Development Branch Rule (Optional)
**Branch name pattern:** `develop` or `dev`

**Lighter Protection:**
- ✓ Require pull request before merging
- ✓ Require status checks to pass
- No administrator enforcement

### Step 5.4: Save Rules
Click **"Create"** or **"Save changes"** for each rule.

---

## 6. Setting Up Environments

### Step 6.1: Navigate to Environments
Go to **Settings** → **Environments**

### Step 6.2: Create Staging Environment
1. Click **"New environment"**
2. Name: `staging`
3. Click **"Configure environment"**

**Configuration:**
- **Environment protection rules:**
  - ✓ Required reviewers: Add yourself or team members
  - Deployment branches: `develop`, `release/*`
- **Environment secrets:** (staging-specific)
  - `AZURE_WEBAPP_NAME`: `jdm-portal-staging`
  - `DATABASE_CONNECTION_STRING`: Staging DB connection
  - `API_ENDPOINT`: Staging API URL
- **Environment variables:**
  - `ENVIRONMENT`: `staging`
  - `DEBUG`: `true`

### Step 6.3: Create Production Environment
1. Click **"New environment"**
2. Name: `production`
3. Click **"Configure environment"**

**Configuration:**
- **Environment protection rules:**
  - ✓ Required reviewers: Add 2+ reviewers
  - ✓ Wait timer: 5 minutes (allows cancellation)
  - Deployment branches: `main` only
- **Environment secrets:** (production-specific)
  - `AZURE_WEBAPP_NAME`: `jdm-portal-prod`
  - `DATABASE_CONNECTION_STRING`: Production DB connection
  - `API_ENDPOINT`: Production API URL
- **Environment variables:**
  - `ENVIRONMENT`: `production`
  - `DEBUG`: `false`
  - `LOG_LEVEL`: `error`

### Step 6.4: Update Workflow to Use Environments
Ensure your `ci-cd-workflow.yml` references environments:
```yaml
jobs:
  deploy-staging:
    environment: staging
    # ... deployment steps

  deploy-production:
    environment: production
    needs: deploy-staging
    # ... deployment steps
```

---

## 7. Testing the Pipeline

### Step 7.1: Test Initial Workflow Run
1. Make a small change to any file (e.g., update README)
2. Commit and push:
```bash
git add .
git commit -m "test: Trigger CI/CD pipeline"
git push origin main
```

### Step 7.2: Monitor Workflow Execution
1. Go to **Actions** tab
2. Click on the running workflow
3. Monitor each job:
   - ✓ Checkout code
   - ✓ Build application
   - ✓ Run tests
   - ✓ Deploy to Azure

### Step 7.3: Verify Deployment
**Azure Portal Verification:**
1. Log into Azure Portal
2. Navigate to your Web App
3. Check:
   - Deployment Center → Logs
   - Overview → URL (test application)
   - Application Insights (if configured)

**Application Testing:**
```bash
# Test staging environment
curl https://jdm-portal-staging.azurewebsites.net/health

# Test production (after approval)
curl https://jdm-portal-prod.azurewebsites.net/health
```

### Step 7.4: Test Pull Request Flow
1. Create new branch:
```bash
git checkout -b feature/test-pipeline
```

2. Make changes and push:
```bash
# Make changes
git add .
git commit -m "feat: Test PR pipeline"
git push origin feature/test-pipeline
```

3. Create Pull Request on GitHub:
   - Base: `main`
   - Compare: `feature/test-pipeline`
   - Verify status checks run
   - Verify branch protection blocks merge until checks pass

### Step 7.5: Common Issues and Solutions

**Issue: Workflow doesn't trigger**
- Check: Is Actions enabled in repository settings?
- Check: Does workflow file have correct trigger events?
- Check: Is workflow file in `.github/workflows/` directory?

**Issue: Azure deployment fails**
- Check: Are all Azure secrets correctly set?
- Check: Does service principal have correct permissions?
- Check: Is Azure Web App name correct?
- Verify: Azure subscription is active

**Issue: Status checks not appearing**
- Check: Is workflow job name matching branch protection rule?
- Check: Did workflow complete at least once successfully?
- Try: Re-run workflow manually from Actions tab

**Issue: Environment approval not working**
- Check: Are required reviewers added to environment?
- Check: Is workflow referencing correct environment name?
- Verify: Reviewers have repository access

---

## 8. Validation Checklist

### Repository Setup
- [ ] Repository created on GitHub
- [ ] Code pushed to main branch
- [ ] `.github/workflows/ci-cd-workflow.yml` present

### Secrets Configuration
- [ ] `AZURE_CREDENTIALS` secret added
- [ ] `AZURE_WEBAPP_NAME` secret added
- [ ] `AZURE_RESOURCE_GROUP` secret added
- [ ] All required secrets visible in Settings

### GitHub Actions
- [ ] Actions enabled in repository
- [ ] Workflow appears in Actions tab
- [ ] Initial workflow run successful

### Branch Protection
- [ ] Main branch protection rule created
- [ ] Required status checks configured
- [ ] Pull request requirement enabled

### Environments
- [ ] Staging environment created
- [ ] Production environment created
- [ ] Environment-specific secrets configured
- [ ] Required reviewers assigned

### Pipeline Testing
- [ ] Manual workflow trigger successful
- [ ] Staging deployment successful
- [ ] Production deployment successful (with approval)
- [ ] Pull request checks working

---

## 9. Next Steps

1. **Monitor Pipeline Performance**
   - Set up GitHub Actions notifications
   - Configure Azure Application Insights
   - Review deployment metrics

2. **Optimize Pipeline**
   - Add caching for dependencies
   - Parallelize test execution
   - Implement incremental builds

3. **Enhance Security**
   - Enable Dependabot alerts
   - Add security scanning (SAST/DAST)
   - Implement secret rotation

4. **Documentation**
   - Document deployment procedures
   - Create runbooks for common issues
   - Maintain architecture diagrams

---

## Support Resources

- **GitHub Actions Documentation:** https://docs.github.com/actions
- **Azure Web Apps Documentation:** https://docs.microsoft.com/azure/app-service
- **GitHub Environments:** https://docs.github.com/actions/deployment/targeting-different-environments
- **Azure Service Principal:** https://docs.microsoft.com/cli/azure/create-an-azure-service-principal-azure-cli

---

*Document created for Jose Kaanene Torres van Grinsven (2204077)*
*Last updated: 2025*