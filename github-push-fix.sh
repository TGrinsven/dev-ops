#!/bin/bash

echo "🔧 GitHub Push Helper for JDM Portal"
echo "===================================="
echo ""
echo "Step 1: Create repository on GitHub.com"
echo "----------------------------------------"
echo "1. Go to: https://github.com/new"
echo "2. Repository name: dev-ops"
echo "3. Set as Public"
echo "4. DO NOT initialize with README"
echo "5. Click 'Create repository'"
echo ""
echo "Press ENTER when you've created the repository..."
read

echo ""
echo "Step 2: Pushing to GitHub"
echo "-------------------------"

# Remove old remote
git remote remove origin 2>/dev/null

# Add correct remote
echo "Adding remote origin..."
git remote add origin https://github.com/TGrinsven/dev-ops.git

# Set branch to main
git branch -M main

# Push with authentication prompt
echo "Pushing to GitHub (you may need to enter your credentials)..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Success! Your code is now on GitHub!"
    echo "🔗 Repository: https://github.com/TGrinsven/dev-ops"
    echo "🚀 Railway should start deploying automatically!"
else
    echo ""
    echo "❌ Push failed. Try these solutions:"
    echo ""
    echo "1. Use Personal Access Token (PAT):"
    echo "   - Go to: https://github.com/settings/tokens"
    echo "   - Generate new token with 'repo' scope"
    echo "   - Use token as password when prompted"
    echo ""
    echo "2. Or use SSH instead:"
    echo "   git remote set-url origin git@github.com:TGrinsven/dev-ops.git"
    echo "   git push -u origin main"
fi