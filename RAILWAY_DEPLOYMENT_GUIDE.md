# Railway Deployment Guide for JDM Portal

## Quick Start (5 Minutes)

Deploy your JDM Portal to Railway in just a few clicks! Railway provides free hosting perfect for student projects.

---

## Prerequisites

- GitHub account (create at github.com if needed)
- Your JDM Portal code in a GitHub repository
- A web browser

---

## Step 1: Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Click **"Start a New Project"**
3. Sign in with GitHub (recommended for easy deployment)
4. Authorize Railway to access your GitHub repositories

---

## Step 2: Deploy from GitHub

### Option A: Deploy with One Click (Recommended)
1. In Railway dashboard, click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your JDM Portal repository
4. Railway will automatically detect the static site and start deployment

### Option B: Manual Setup
1. Click **"New Project"** → **"Empty Project"**
2. Click **"Add Service"** → **"GitHub Repo"**
3. Select your repository
4. Railway will use the `railway.json` and `nixpacks.toml` configurations

---

## Step 3: Monitor Deployment

1. Click on your project in the Railway dashboard
2. Watch the deployment logs in real-time
3. Green checkmark = Successfully deployed!
4. Railway provides a temporary URL: `your-app.up.railway.app`

---

## Step 4: Access Your Site

1. In your service settings, find the **"Deployment URL"**
2. Click the URL to view your live JDM Portal
3. Share this URL with others to showcase your work!

---

## Step 5: Custom Domain (Optional)

### Add Your Own Domain
1. Go to **Settings** → **Networking** → **Public Networking**
2. Click **"Add Custom Domain"**
3. Enter your domain (e.g., `jdm-portal.com`)
4. Add Railway's DNS records to your domain provider:
   ```
   Type: CNAME
   Name: @ or www
   Value: your-app.up.railway.app
   ```
5. Wait 5-30 minutes for DNS propagation

### Free Subdomain Option
Railway provides a free subdomain at `your-app.up.railway.app`

---

## Environment Variables

The deployment is pre-configured with:
- `NODE_ENV=production` - Optimizes performance
- `PORT=3000` - Railway automatically sets this

### Adding Custom Variables (if needed)
1. Go to **Variables** tab in your service
2. Click **"New Variable"**
3. Add key-value pairs
4. Railway automatically redeploys with new variables

---

## Monitoring & Metrics

### View Performance Metrics
1. Click **"Metrics"** tab in your service
2. Monitor:
   - **Memory Usage** - Should stay under 512MB for static sites
   - **CPU Usage** - Typically under 5% for static content
   - **Network** - Track visitor traffic
   - **Logs** - View server logs and errors

### Set Up Alerts
1. Go to **Settings** → **Notifications**
2. Enable alerts for:
   - Deployment failures
   - High resource usage
   - Downtime events

---

## Troubleshooting

### Common Issues & Solutions

#### Site Not Loading
- Check deployment logs for errors
- Verify `index.html` exists in root directory
- Ensure all file paths are relative

#### 404 Errors
- Check file names are case-sensitive
- Verify all linked files are committed to GitHub

#### Deployment Fails
```bash
# Check locally first
npx serve -s .
# Visit http://localhost:3000
```

#### Updates Not Showing
- Railway auto-deploys on every GitHub push
- Check Railway dashboard for deployment status
- Hard refresh browser (Ctrl+F5 or Cmd+Shift+R)

---

## Cost & Limits

### Railway Free Tier (Perfect for Students)
- **$5 free credits** monthly
- **500 hours** of usage
- **100GB bandwidth**
- **Automatic sleep** after 5 minutes of inactivity

### Estimated Costs for JDM Portal
- Static site hosting: ~$0-1/month
- Perfect for portfolio projects
- No credit card required to start

---

## Updating Your Site

1. Make changes to your code locally
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Update JDM Portal"
   git push origin main
   ```
3. Railway automatically redeploys within 1-2 minutes
4. Check deployment status in Railway dashboard

---

## Best Practices

### Performance Optimization
- Compress images before uploading
- Minify CSS and JavaScript files
- Use relative paths for all assets

### Security
- Never commit sensitive data
- Use environment variables for API keys
- Enable HTTPS (automatic with Railway)

### Monitoring
- Check metrics weekly
- Set up downtime alerts
- Review logs for errors

---

## Quick Commands Reference

```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/jdm-portal.git
cd jdm-portal

# Test locally before deploying
npx serve -s .

# Push changes to trigger deployment
git add .
git commit -m "Update content"
git push origin main
```

---

## Support Resources

- **Railway Documentation**: [docs.railway.app](https://docs.railway.app)
- **Railway Discord**: [discord.gg/railway](https://discord.gg/railway)
- **Status Page**: [status.railway.app](https://status.railway.app)
- **Community Forum**: [help.railway.app](https://help.railway.app)

---

## Project Structure

Your repository should have this structure:
```
jdm-portal/
├── index.html          # Main HTML file (required)
├── railway.json        # Railway configuration
├── nixpacks.toml       # Build configuration
├── css/               # Stylesheets (optional)
├── js/                # JavaScript files (optional)
├── images/            # Image assets (optional)
└── README.md          # Project documentation
```

---

## Success Checklist

- [ ] Created Railway account
- [ ] Connected GitHub repository
- [ ] Deployment successful (green status)
- [ ] Site accessible via Railway URL
- [ ] Tested all pages and links
- [ ] Configured custom domain (optional)
- [ ] Set up monitoring alerts
- [ ] Shared URL with instructor/peers

---

## Tips for Students

1. **Start Simple**: Deploy basic HTML first, then add features
2. **Use Free Tier**: Perfect for learning and portfolio projects
3. **Ask for Help**: Railway Discord has helpful community
4. **Document Everything**: Add comments to your code
5. **Test Locally First**: Always test before deploying
6. **Version Control**: Commit changes frequently
7. **Monitor Usage**: Check your free credits regularly

---

**Congratulations!** Your JDM Portal is now live on Railway. Share your deployment URL to showcase your work!