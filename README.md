# Job Scout Agent 🤖

An automated job fetching and classification agent that finds relevant MERN/PERN stack jobs, classifies them using AI, and stores results in Google Sheets.

## 🎯 Features

- **Job Fetching**: Uses Adzuna API to search for developer jobs
- **AI Classification**: Leverages Gemini 2.0 Flash to classify job relevance
- **Google Sheets Integration**: Automatically stores and organizes job data
- **Duplicate Detection**: Prevents duplicate entries in your job tracking sheet
- **Conditional Formatting**: Visual indicators for job classifications
- **Vercel Deployment**: Serverless architecture for cost-effective operation

## 🏗️ Architecture

```
├── api/
│   └── jobs.js           # Main serverless function
├── utils/
│   ├── adzuna.js        # Adzuna API integration
│   ├── gemini.js        # Gemini AI classification
│   └── sheets.js        # Google Sheets operations
├── package.json
├── vercel.json
└── README.md
```

## 🚀 Quick Setup

### 1. Clone and Install
```bash
git clone <your-repo>
cd job-scout-agent
npm install
```

### 2. Environment Variables
Create a `.env.local` file with:

```env
# Adzuna API (free tier - 1000 requests/month)
ADZUNA_APP_ID=your_adzuna_app_id
ADZUNA_APP_KEY=your_adzuna_app_key

# Gemini AI API (free tier)
GEMINI_API_KEY=your_gemini_api_key

# Google Sheets
GOOGLE_SHEET_ID=your_google_sheet_id
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account"...}
```

### 3. Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Add environment variables in Vercel Dashboard
```

## 🔧 API Setup Guide

### Adzuna API Setup
1. Go to [Adzuna Developer Portal](https://developer.adzuna.com/)
2. Create free account (1000 requests/month)
3. Create new application
4. Copy App ID and App Key

### Gemini AI Setup
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Create API key for Gemini 2.0 Flash
3. Copy API key

### Google Sheets Setup
1. Create a new Google Sheet
2. Copy the Sheet ID from URL: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`
3. Go to [Google Cloud Console](https://console.cloud.google.com/)
4. Enable Google Sheets API
5. Create Service Account
6. Generate JSON key
7. Share your Google Sheet with the service account email

## 📋 Usage

### Manual Trigger
```bash
# Fetch and process jobs
curl https://your-vercel-app.vercel.app/api/jobs

# Get sheet statistics
curl https://your-vercel-app.vercel.app/api/jobs?action=stats

# Custom search queries
curl -X POST https://your-vercel-app.vercel.app/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "queries": ["react developer", "node.js backend"],
    "location": "india",
    "maxJobs": 30
  }'
```

### Automated Scheduling

#### Option 1: GitHub Actions
Create `.github/workflows/job-scout.yml`:

```yaml
name: Job Scout Daily Run
on:
  schedule:
    - cron: '0 9 * * *'  # 9 AM daily
  workflow_dispatch:

jobs:
  run-job-scout:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Job Scout
        run: |
          curl -X POST ${{ secrets.VERCEL_ENDPOINT }}/api/jobs
```

#### Option 2: Cron-job.org
1. Go to [cron-job.org](https://cron-job.org)
2. Create free account
3. Add new cron job:
   - URL: `https://your-app.vercel.app/api/jobs`
   - Schedule: Daily at 9 AM
   - Method: POST

## 📊 Classification Logic

The AI classifies jobs into three categories:

### ✅ GOOD_FIT
- MERN/PERN stack technologies
- Node.js, Express, React
- MongoDB, PostgreSQL
- Docker, AWS, TypeScript
- 0-2 years experience
- India/Remote location

### ⚠️ MAYBE_FIT
- Some relevant technologies
- Unclear experience requirements
- Partial stack match

### ❌ IGNORE
- Different tech stack (PHP, Java, .NET)
- Senior roles (3+ years)
- Non-tech positions
- Wrong location

## 📈 Google Sheet Structure

| Date | Company | Role | Location | Apply Link | AI Classification | AI Summary | Status |
|------|---------|------|----------|------------|-------------------|------------|--------|
| 2024-01-15 | TechCorp | MERN Developer | Mumbai | https://... | GOOD_FIT | Perfect match for MERN stack... | New |

## 🎛️ Configuration

### Search Queries
Default queries in `api/jobs.js`:
```javascript
const queries = [
  'mern developer',
  'node.js backend developer',
  'react node developer', 
  'javascript full stack developer',
  'typescript backend developer'
];
```

### Rate Limiting
- Adzuna: 1 second delay between requests
- Gemini: 1 second delay between classifications
- Vercel: 60 second max execution time

## 🔍 Monitoring

### Response Format
```json
{
  "success": true,
  "message": "Job Scout completed successfully",
  "processing": {
    "fetched": 45,
    "processed": 45,
    "inserted": 12,
    "duplicates": 33,
    "duration": 35000
  },
  "classification": {
    "goodFit": 8,
    "maybeFit": 15,
    "ignore": 22,
    "errors": 0
  },
  "sheets": {
    "success": true,
    "message": "Successfully inserted 12 jobs"
  },
  "timestamp": "2024-01-15T09:00:00.000Z"
}
```

### Error Handling
- Network failures: Automatic retries with fallback
- API rate limits: Built-in delays and error handling
- Invalid responses: Fallback classification logic
- Duplicate detection: Prevents sheet bloat

## 💰 Cost Breakdown (Free Tier)

- **Adzuna**: Free (1000 requests/month)
- **Gemini**: Free (15 requests/minute, 1500/day)
- **Google Sheets**: Free (100 requests/100 seconds)
- **Vercel**: Free (125k function invocations/month)
- **Total**: $0/month for moderate usage

## 🚨 Troubleshooting

### Common Issues

1. **"Missing environment variables"**
   - Check all 5 required env vars are set in Vercel Dashboard

2. **"Adzuna API error: 403"**
   - Verify App ID and App Key
   - Check monthly quota usage

3. **"Google Sheets API error"**
   - Ensure service account has edit access to sheet
   - Verify JSON credentials format

4. **"Gemini classification failed"**
   - Check API key validity
   - Verify rate limits not exceeded

### Debug Mode
Add `?include_jobs=true` to see full job data in response.

## 📝 Customization

### Modify Classification Criteria
Edit the prompt in `utils/gemini.js` to change job matching logic.

### Add New Data Sources
Extend `utils/adzuna.js` or create new utility files for other job APIs.

### Change Sheet Format
Update `utils/sheets.js` to modify columns or add new fields.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test with your API keys
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ for job seekers in the MERN/PERN ecosystem**