# 🚀 Deploy via GitHub - VPS Guide

## Latest Commit Pushed ✅

```
Commit: e487d09e
Message: Add ModernLogin UI with premium animations and deployment scripts
Status: Pushed to main branch ✅
```

---

## 📥 Deploy on VPS (3 Steps)

### Step 1: SSH into VPS
```bash
ssh -i ~/.ssh/workgrid_vps root@152.42.229.212
```

### Step 2: Download & Run Deployment Script

**Option A: Using curl (Recommended)**
```bash
curl -sSL https://raw.githubusercontent.com/nicolasandri/Aplikasi-Discord-Clone/main/vps-deploy.sh | bash
```

**Option B: Manual Clone & Deploy**
```bash
# Clone repository
git clone https://github.com/nicolasandri/Aplikasi-Discord-Clone.git /app/workgrid
cd /app/workgrid/app

# Install & build
npm install
npm run build

# Deploy
rm -rf /app/frontend
cp -r dist /app/frontend

# Reload nginx
systemctl reload nginx
```

### Step 3: Verify Deployment
```bash
# Check if files are there
ls -la /app/frontend/

# Check nginx status
systemctl status nginx

# Exit
exit
```

---

## ✅ Verification

### In Browser:
1. Visit: https://workgrid.homeku.net
2. Visit: https://152.42.229.212
3. Should see the new ModernLogin landing page

### On VPS (Check Logs):
```bash
ssh -i ~/.ssh/workgrid_vps root@152.42.229.212

# View nginx access log
tail -50 /var/log/nginx/access.log

# View nginx error log
tail -50 /var/log/nginx/error.log

# Check file count
ls -la /app/frontend/assets/ | wc -l
```

---

## 📦 What's Being Deployed

From Latest GitHub Commit:

✨ **New Components:**
- ModernLogin - Premium landing page
- ModernHero - Animated hero section
- AnimatedNavbar - Scroll glassmorphism
- FeatureShowcase - 3D card effects

🔧 **Code Changes:**
- App.tsx - Updated routing
- MagneticButton - Form submission support
- Multiple animation components

📚 **Documentation:**
- DEPLOYMENT_GUIDE.md
- DEPLOY_NOW.txt
- COMPLETION_REPORT.txt

✅ **Build Output:**
- app/dist/ - Production build (ready to deploy)

---

## 🔄 Update Workflow

The VPS deployment script automatically:

1. ✅ Creates backup of current frontend
2. ✅ Pulls latest code from GitHub
3. ✅ Installs dependencies (if needed)
4. ✅ Builds the application
5. ✅ Deploys to /app/frontend
6. ✅ Reloads nginx
7. ✅ Verifies deployment

---

## 📋 Rollback (if needed)

If something goes wrong:

```bash
ssh -i ~/.ssh/workgrid_vps root@152.42.229.212

# List backups
ls -la /backup/

# Restore previous version
cp -r /backup/frontend_backup_YYYYMMDD_HHMMSS /app/frontend

# Reload nginx
systemctl reload nginx
```

---

## 🚀 Recommended Deployment Method

### For Production (Most Reliable):

```bash
# SSH into VPS
ssh -i ~/.ssh/workgrid_vps root@152.42.229.212

# Create backup
cp -r /app/frontend /backup/frontend_backup_$(date +%Y%m%d_%H%M%S)

# Clone latest code
cd /tmp
git clone https://github.com/nicolasandri/Aplikasi-Discord-Clone.git
cd Aplikasi-Discord-Clone/app

# Build
npm install
npm run build

# Deploy
rm -rf /app/frontend
cp -r dist /app/frontend

# Reload
systemctl reload nginx

# Verify
curl -s https://localhost/ -k | head -20

# Exit
exit
```

---

## 📊 Repository Info

- **Repository:** https://github.com/nicolasandri/Aplikasi-Discord-Clone
- **Branch:** main
- **Latest Commit:** e487d09e
- **Last Updated:** 2026-03-17

---

## 🔐 Security Notes

- SSH key must have 600 permissions: `chmod 600 ~/.ssh/workgrid_vps`
- Only SSH from trusted machines
- Backups are stored in /backup/ on VPS
- SSL certificates are configured

---

## ⏱️ Deployment Time

Total deployment time:
- Backup: ~30 seconds
- Git pull: ~10 seconds
- Install dependencies: ~30 seconds (first time only)
- Build: ~8 seconds
- Deploy: ~5 seconds
- Nginx reload: ~2 seconds

**Total: ~2-3 minutes** (first time with dependencies)
**Total: ~30 seconds** (subsequent updates)

---

## 🎯 Quick Commands

```bash
# Quick test - no build needed
curl https://workgrid.homeku.net -k

# Full deployment
ssh -i ~/.ssh/workgrid_vps root@152.42.229.212 'curl -sSL https://raw.githubusercontent.com/nicolasandri/Aplikasi-Discord-Clone/main/vps-deploy.sh | bash'

# Check status
ssh -i ~/.ssh/workgrid_vps root@152.42.229.212 'ls -la /app/frontend/'

# View logs
ssh -i ~/.ssh/workgrid_vps root@152.42.229.212 'tail -50 /var/log/nginx/error.log'
```

---

## 📞 Issues?

1. **SSH Connection Failed**
   - Check: `ping 152.42.229.212`
   - Verify key: `ls ~/.ssh/workgrid_vps`
   - Permissions: `chmod 600 ~/.ssh/workgrid_vps`

2. **Build Failed**
   - Check Node version: `node --version` (need v16+)
   - Clear cache: `rm -rf /app/workgrid/app/node_modules`
   - Reinstall: `npm install`

3. **Website Not Loading**
   - Check files: `ls -la /app/frontend/`
   - Reload nginx: `systemctl reload nginx`
   - Check logs: `tail -100 /var/log/nginx/error.log`

4. **Assets (CSS/JS) Not Loading**
   - Clear browser cache: Ctrl+Shift+Delete
   - Check assets folder: `ls /app/frontend/assets/`
   - Verify nginx config: `nginx -t`

---

**Status:** ✅ Ready for Deployment via GitHub
**Last Commit:** e487d09e (2026-03-17)
**VPS:** 152.42.229.212
**Domain:** workgrid.homeku.net
