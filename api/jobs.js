/**
 * Main API endpoint for Job Scout Agent
 * Handles job fetching, classification, and storage
 */

import { fetchMultipleQueries } from '../utils/adzuna.js';
import { classifyAndInsertInBatches } from '../utils/gemini.js'; // 👈 new batch function
import { getSheetStats } from '../utils/sheets.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Validate env vars
  const requiredEnvVars = [
    'ADZUNA_APP_ID',
    'ADZUNA_APP_KEY', 
    'GEMINI_API_KEY',
    'GOOGLE_SHEET_ID',
    'GOOGLE_SERVICE_ACCOUNT_JSON'
  ];
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  if (missingVars.length > 0) {
    return res.status(500).json({
      success: false,
      error: `Missing env vars: ${missingVars.join(', ')}`,
      timestamp: new Date().toISOString()
    });
  }
  
  const startTime = Date.now();
  
  try {
    console.log('🚀 Starting Job Scout Agent...');
    
    // Stats endpoint
    if (req.method === 'GET' && req.query.action === 'stats') {
      const stats = await getSheetStats();
      return res.status(200).json({
        success: true,
        ...stats,
        timestamp: new Date().toISOString()
      });
    }
    
    // Main queries
    const queries = req.method === 'POST' && req.body?.queries 
      ? req.body.queries 
      : [
          'mern developer',
          'node.js backend developer', 
          'react node developer',
          'javascript full stack developer',
          'typescript backend developer'
        ];
    
    const location = req.query.location || req.body?.location || 'india';
    const maxJobs = parseInt(req.query.max) || parseInt(req.body?.maxJobs) || 25;
    
    console.log(`📋 Queries: ${queries.join(', ')}`);
    console.log(`📍 Location: ${location}`);
    console.log(`🔢 Max jobs: ${maxJobs}`);
    
    // Step 1: Fetch jobs
    console.log('📡 Step 1: Fetching jobs from Adzuna...');
    const jobsResult = await fetchMultipleQueries(queries, location);
    if (!jobsResult.success || jobsResult.jobs.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No jobs found from Adzuna',
        jobs: [],
        processing: { fetched: 0, processed: 0, duration: Date.now() - startTime },
        timestamp: new Date().toISOString()
      });
    }
    
    // Limit jobs
    const jobsToProcess = jobsResult.jobs.slice(0, maxJobs);
    console.log(`📊 Found ${jobsResult.jobs.length}, processing ${jobsToProcess.length}`);
    
    // Step 2 + 3 combined: classify & insert in batches
    console.log('🤖 Step 2 + 3: Classify + Insert in batches...');
    const classifiedJobs = await classifyAndInsertInBatches(jobsToProcess, 15);
    
    // Classification summary
    const classificationStats = {
      goodFit: classifiedJobs.filter(j => j.aiClassification === 'GOOD_FIT').length,
      maybeFit: classifiedJobs.filter(j => j.aiClassification === 'MAYBE_FIT').length,
      ignore: classifiedJobs.filter(j => j.aiClassification === 'IGNORE').length,
      errors: classifiedJobs.filter(j => !j.processed).length
    };
    
    console.log('📈 Classification:', classificationStats);
    
    // Final response
    const duration = Date.now() - startTime;
    return res.status(200).json({
      success: true,
      message: 'Job Scout completed successfully',
      processing: {
        fetched: jobsResult.jobs.length,
        processed: classifiedJobs.length,
        duration
      },
      classification: classificationStats,
      jobs: req.query.include_jobs === 'true' ? classifiedJobs : undefined,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('❌ Job Scout Agent failed:', err);
    return res.status(500).json({
      success: false,
      error: err.message,
      processing: { duration: Date.now() - startTime },
      timestamp: new Date().toISOString()
    });
  }
}
