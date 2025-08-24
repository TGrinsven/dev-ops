#!/bin/bash

echo "Enter your GitHub Personal Access Token:"
read -s TOKEN

echo "Pushing to GitHub..."
git push https://TGrinsven:${TOKEN}@github.com/TGrinsven/dev-ops.git main

if [ $? -eq 0 ]; then
    echo "✅ Successfully pushed!"
    echo "🚀 Check Railway dashboard for automatic deployment"
else
    echo "❌ Push failed"
fi