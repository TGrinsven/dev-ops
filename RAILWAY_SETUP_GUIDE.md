# Railway Deployment Setup Guide for Students

## Quick Start Guide

This guide will help you deploy your application to Railway using GitHub Actions.

### Prerequisites
- GitHub account with your code repository
- Railway account (free tier available)
- Basic understanding of Git and GitHub

### Step 1: Create a Railway Account
1. Go to [Railway.app](https://railway.app)
2. Sign up with your GitHub account (recommended)
3. Create a new project by clicking "New Project"
4. Choose "Deploy from GitHub repo"
5. Select your repository

### Step 2: Get Your Railway Token
1. In Railway, click on your profile (top right)
2. Go to "Account Settings"
3. Navigate to "Tokens"
4. Click "Create Token"
5. Give it a name like "GitHub Actions Deploy"
6. Copy the token (you won't see it again!)

### Step 3: Add Token to GitHub
1. Go to your GitHub repository
2. Click "Settings" (in the repo, not your profile)
3. Navigate to "Secrets and variables" → "Actions"
4. Click "New repository secret"
5. Name: `RAILWAY_TOKEN`
6. Value: Paste your Railway token
7. Click "Add secret"

### Step 4: Configure Your Deployment

#### For Node.js Applications:
Your `package.json` should have:
```json
{
  "scripts": {
    "start": "node server.js",
    "test": "jest"
  }
}
```

#### For Static Sites:
The `static.json` file is already configured. Adjust these if needed:
- Change `"root": "./"` to your build directory
- For React: `"root": "./build"`
- For Vue/Vite: `"root": "./dist"`

### Step 5: Deploy
1. Push your code to the main branch:
```bash
git add .
git commit -m "Add Railway deployment"
git push origin main
```

2. Check the deployment:
   - Go to GitHub → Actions tab
   - Watch your workflow run
   - Green checkmark = Success!

3. Find your app URL:
   - Go to Railway dashboard
   - Click on your project
   - Find the deployment URL

### Troubleshooting

#### Deployment Failed?
- Check GitHub Actions logs for errors
- Verify RAILWAY_TOKEN is set correctly
- Ensure tests are passing locally first

#### Tests Failing?
- Run `npm test` locally
- Fix any failing tests
- Make sure all dependencies are in package.json

#### App Not Loading?
- Check Railway logs in the dashboard
- Verify your start script is correct
- Check environment variables in Railway

### Common Commands

```bash
# Run tests locally
npm test

# Check workflow syntax
# (No command needed - GitHub validates automatically)

# Manual deployment (if needed)
npm install -g @railway/cli
railway login
railway up
```

### Environment Variables

Add environment variables in Railway:
1. Go to your Railway project
2. Click on your service
3. Go to "Variables" tab
4. Add your variables
5. They'll be available in your app automatically

### Tips for Students

1. **Start Simple**: Deploy a basic "Hello World" first
2. **Test Locally**: Always test before pushing
3. **Read Logs**: Error messages are your friends
4. **Use Free Tier**: Railway's free tier is perfect for learning
5. **Ask for Help**: Use Railway's Discord or your class forum

### Learning Resources

- [Railway Documentation](https://docs.railway.app)
- [GitHub Actions Tutorial](https://docs.github.com/en/actions/learn-github-actions)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

### Security Notes

⚠️ **Never commit tokens or secrets to your code!**
- Use GitHub Secrets for sensitive data
- Use environment variables for configuration
- Review code before pushing

---

## Files Created

1. **`.github/workflows/railway-deploy.yml`** - GitHub Actions workflow
2. **`static.json`** - Railway static site configuration
3. **`RAILWAY_SETUP_GUIDE.md`** - This guide

## Next Steps

1. Follow the setup steps above
2. Push to main branch
3. Watch your first deployment
4. Celebrate! 🎉

---

*Created for educational purposes - Perfect for DevOps learning!*