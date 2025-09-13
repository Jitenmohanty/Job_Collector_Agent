# 🚀 Deployment Guide - Job Scout Agent

This guide walks you through deploying your Job Scout Agent to Vercel with all necessary API integrations.

## 📋 Prerequisites Checklist

Before deployment, ensure you have:
- [ ] GitHub account
- [ ] Vercel account (free)
- [ ] Adzuna Developer account
- [ ] Google Account (for Sheets & AI)
- [ ] Google Cloud Project

## 🔧 Step-by-Step Setup

### 1. API Keys Setup

#### 🎯 Adzuna API
1. Go to [Adzuna Developer Portal](https://developer.adzuna.com/)
2. Click "Sign Up" → Create free account
3. Verify email and log in
4. Click "Create a new application"
5. Fill details:
   - **Name**: "Job Scout Agent"
   - **Description**: "Automated job fetching agent"
   - **Website**: Your GitHub repo URL
6. Copy `Application ID` and `Application Key`
7. **Free Tier**: 1000 requests/month

#### 🤖 Google Gemini AI
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Click "Get API key" → "Create API key"
3. Select existing project or create new one
4. Copy the generated API key
5. **Free Tier**: 15 RPM, 1500 requests/day

#### 📊 Google Sheets Setup

**Step A: Create Sheet**
1. Go to [Google Sheets](https://sheets.google.com/)
2. Create a new blank spreadsheet
3. Name it "Job Scout Tracker"
4. Copy Sheet ID from URL: 
   ```
   https://docs.google.com/spreadsheets/d/{COPY_THIS_PART}/edit
   ```

**Step B: Service Account**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing one
3. Enable APIs:
   - Go to "APIs & Services" → "Library"
   - Search and enable "Google Sheets API"
4. Create Service Account:
   - Go to "IAM & Admin" → "Service Accounts"
   - Click "Create Service Account"
   - Name: "job-scout-agent"
   - Role: "Editor" (or "Sheets Editor")
   - Click "Done"
5. Generate JSON Key:
   - Click on created service account
   - Go to "Keys" tab → "Add Key" → "Create new key"
   - Choose "JSON" → Download file
   - **Keep this file secure!**

**Step C: Share Sheet**
1. Open your Google Sheet
2. Click "Share" button
3. Add the service account email (from JSON file):
   ```
   job-scout-agent@your-project.iam.gserviceaccount.com
   ```
4. Give "Editor" permissions

### 2. Deploy to Vercel

#### Option A: GitHub Integration (Recommended)

**Step 1: Fork Repository**
1. Fork this repository to your GitHub account
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/job-scout-agent
   cd job-scout-agent
   ```

**Step 2: Deploy with Vercel**
1. Go to [Vercel Dashboard](https://vercel.com/)
2. Click "New Project"
3. Import your GitHub repository
4. Configure:
   - **Framework**: Other
   - **Build Command**: `npm run build`
   - **Output Directory**: Leave empty
5. Click "Deploy"

#### Option B: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### 3. Environment Variables

In Vercel Dashboard:
1. Go to your project → "Settings" → "Environment Variables"
2. Add each variable:

```bash
# Adzuna API
ADZUNA_APP_ID=your_app_id_here
ADZUNA_APP_KEY=your_app_key_here

# Gemini AI
GEMINI_API_KEY=your_gemini_key_here

# Google Sheets
GOOGLE_SHEET_ID=your_sheet_id_here
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account"...}
```

**⚠️ Important**: For `GOOGLE_SERVICE_ACCOUNT_JSON`, paste the entire JSON content as a single line (remove all line breaks).

### 4. Test Deployment

1. Get your Vercel URL: `https://your-app-name.vercel.app`
2. Test the API:
   ```bash
   curl https://your-app-name.vercel.app/api/jobs?action=stats
   ```
3. Expected response:
   ```json
   {
     "success": true,
     "stats": {
       "total": 0,
       "goodFit": 0,
       "maybeFit": 0,
       "ignore": 0,
       "applied": 0,
       "new": 0
     }
   }
   ```

4. Run full job fetch:
   ```bash
   curl -X POST https://your-app-name.vercel.app/api/jobs
   ```

### 5. Setup Automated Scheduling

#### Option A: GitHub Actions (Recommended)

1. In your GitHub repo, go to "Settings" → "Secrets and variables" → "Actions"
2. Add repository secrets:
   ```
   VERCEL_ENDPOINT=https://your-app-name.vercel.app
   GOOGLE_SHEET_ID=your_sheet_id_here
   ```
3. The workflow file (`.github/workflows/job-scout-daily.yml`) is already included
4. GitHub Actions will now run daily at 9 AM IST

#### Option B: Cron-job.org

1. Go to [cron-job.org](https://cron-job.org/)
2. Create free account
3. Add new cron job:
   - **Title**: "Job Scout Daily"
   - **Address**: `https://your-app-name.vercel.app/api/jobs`
   - **Schedule**: `0 9 * * *` (9 AM daily)
   - **Request method**: POST
   - **Request body**:
     ```json
     {
       "queries": ["mern developer", "node.js backend developer"],
       "maxJobs": 50
     }
     ```

## 🔍 Verification Checklist

After deployment, verify:

- [ ] **Vercel Deployment**: Function deploys without errors
- [ ] **Environment Variables**: All 5 variables are set correctly
- [ ] **Adzuna API**: Jobs are being fetched successfully
- [ ] **Gemini Classification**: Jobs are being classified
- [ ] **Google Sheets**: Data is being inserted with formatting
- [ ] **Scheduling**: Automated runs are working
- [ ] **Error Handling**: Failed requests don't crash the app

## 🚨 Troubleshooting

### Common Deployment Issues

**1. "Build failed" Error**
```bash
# Check package.json has correct dependencies
npm install
npm run build
```

**2. "Environment variable missing"**
- Double-check all 5 env vars are set in Vercel Dashboard
- Ensure no typos in variable names
- Verify JSON format for service account (single line)

**3. "Adzuna API 403 Forbidden"**
- Check App ID and App Key are correct
- Verify you haven't exceeded monthly quota (1000 requests)
- Try different search query

**4. "Google Sheets permission denied"**
- Ensure service account email is shared with Sheet
- Check service account has "Editor" role
- Verify Sheet ID is correct

**5. "Gemini API quota exceeded"**
- Free tier: 15 requests/minute, 1500/day
- Add delays between requests
- Check API key is valid

### Debug Commands

```bash
# Test individual components
curl "https://your-app.vercel.app/api/jobs?action=stats"

# Run with debug info
curl "https://your-app.vercel.app/api/jobs?include_jobs=true&max=5"

# Check Vercel logs
vercel logs --follow
```

## 📊 Monitoring & Maintenance

### Daily Monitoring
1. Check Google Sheet for new entries
2. Monitor GitHub Actions success/failure
3. Review Vercel function logs for errors

### Weekly Reviews
1. Analyze job classification accuracy
2. Update search queries if needed  
3. Check API quota usage

### Monthly Tasks
1. Review and update job criteria in Gemini prompt
2. Clean up old jobs from sheet
3. Optimize API usage for cost efficiency

## 🔧 Customization

### Modify Search Queries
Edit `api/jobs.js`:
```javascript
const queries = [
  'your custom query 1',
  'your custom query 2'
];
```

### Change Classification Criteria
Edit the prompt in `utils/gemini.js` to match your specific requirements.

### Add New Data Fields
Update `utils/sheets.js` to include additional columns like salary, company size, etc.

---

## 🎉 Success!

Once deployed, your Job Scout Agent will:
- ✅ Run automatically daily at 9 AM IST
- ✅ Fetch latest jobs from Adzuna
- ✅ Classify relevance with AI
- ✅ Store organized data in Google Sheets
- ✅ Provide beautiful visual indicators
- ✅ Skip duplicates automatically

**Your sheet URL**: `https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID`

Happy job hunting! 🚀