#!/bin/bash

# Replace YOUR_USERNAME with your actual GitHub username
GITHUB_USERNAME="YOUR_USERNAME"
REPO_NAME="jdm-portal"

echo "🚀 Pushing JDM Portal to GitHub..."
echo "================================================"

# Add remote origin
git remote add origin "https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git"

# Create main branch and push
git branch -M main
git push -u origin main

echo "================================================"
echo "✅ Successfully pushed to GitHub!"
echo "🔗 Repository: https://github.com/${GITHUB_USERNAME}/${REPO_NAME}"
echo ""
echo "📦 Railway will automatically deploy from this push!"
echo "Check your Railway dashboard at: https://railway.app/dashboard"