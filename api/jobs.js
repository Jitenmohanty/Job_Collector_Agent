/**
 * Main API endpoint for Job Scout Agent
 * Handles job fetching, classification, and storage
 */

import { fetchMultipleQueries } from '../utils/adzuna.js';
import { classifyJobsBatch } from '../utils/gemini.js';
import { insertJobs, getSheetStats } from '../utils/sheets.js';

// Vercel serverless function
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Validate environment variables
  const requiredEnvVars = [
    'ADZUNA_APP_ID',
    'ADZUNA_APP_KEY', 
    'GEMINI_API_KEY',
    'GOOGLE_SHEET_ID',
    'GOOGLE_SERVICE_ACCOUNT_JSON'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    return res.status(500).json({
      success: false,
      error: `Missing environment variables: ${missingVars.join(', ')}`,
      timestamp: new Date().toISOString()
    });
  }
  
  const startTime = Date.now();
  
  try {
    console.log('🚀 Starting Job Scout Agent...');
    
    // Handle different endpoints
    if (req.method === 'GET' && req.query.action === 'stats') {
      const stats = await getSheetStats();
      return res.status(200).json({
        success: true,
        ...stats,
        timestamp: new Date().toISOString()
      });
    }
    
    // Main job processing logic
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
    const maxJobs = parseInt(req.query.max) || parseInt(req.body?.maxJobs) || 50;
    
    console.log(`📋 Processing queries: ${queries.join(', ')}`);
    console.log(`📍 Location: ${location}`);
    console.log(`🔢 Max jobs: ${maxJobs}`);
    
    // Step 1: Fetch jobs from Adzuna
    console.log('📡 Step 1: Fetching jobs from Adzuna...');
    const jobsResult = await fetchMultipleQueries(queries, location);
    
    if (!jobsResult.success || jobsResult.jobs.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No jobs found from Adzuna',
        jobs: [],
        processing: {
          fetched: 0,
          classified: 0,
          inserted: 0,
          duration: Date.now() - startTime
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Limit number of jobs to process (cost control)
    const jobsToProcess = jobsResult.jobs.slice(0, maxJobs);
    console.log(`📊 Found ${jobsResult.jobs.length} jobs, processing ${jobsToProcess.length}`);
    
    // Step 2: Classify jobs with Gemini AI
    console.log('🤖 Step 2: Classifying jobs with Gemini AI...');
    const classifiedJobs = await classifyJobsBatch(jobsToProcess);
    
    console.log('📈 Classification Results:');
    const classificationStats = {
      goodFit: classifiedJobs.filter(job => job.aiClassification === 'GOOD_FIT').length,
      maybeFit: classifiedJobs.filter(job => job.aiClassification === 'MAYBE_FIT').length,
      ignore: classifiedJobs.filter(job => job.aiClassification === 'IGNORE').length,
      errors: classifiedJobs.filter(job => !job.processed).length
    };
    
    console.log(`✅ Good Fit: ${classificationStats.goodFit}`);
    console.log(`⚠️ Maybe Fit: ${classificationStats.maybeFit}`);  
    console.log(`❌ Ignore: ${classificationStats.ignore}`);
    console.log(`💥 Errors: ${classificationStats.errors}`);
    
    // Step 3: Store results in Google Sheets
    console.log('📝 Step 3: Storing results in Google Sheets...');
    const insertResult = await insertJobs(classifiedJobs);
    
    if (!insertResult.success) {
      console.error('Failed to insert jobs into sheet:', insertResult.error);
    } else {
      console.log(`✨ Inserted ${insertResult.inserted} new jobs (${insertResult.duplicates} duplicates skipped)`);
    }
    
    // Calculate processing duration
    const duration = Date.now() - startTime;
    console.log(`⏱️ Total processing time: ${duration}ms`);
    
    // Prepare response with summary
    const response = {
      success: true,
      message: `Job Scout completed successfully`,
      processing: {
        fetched: jobsResult.jobs.length,
        processed: classifiedJobs.length,
        inserted: insertResult.inserted || 0,
        duplicates: insertResult.duplicates || 0,
        duration: duration
      },
      classification: classificationStats,
      sheets: {
        success: insertResult.success,
        message: insertResult.message,
        error: insertResult.error
      },
      jobs: req.query.include_jobs === 'true' ? classifiedJobs : undefined,
      timestamp: new Date().toISOString()
    };
    
    // Return appropriate status code
    const statusCode = insertResult.success ? 200 : 207; // 207 = Multi-Status
    return res.status(statusCode).json(response);
    
  } catch (error) {
    console.error('❌ Job Scout Agent failed:', error);
    
    const duration = Date.now() - startTime;
    
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      processing: {
        duration: duration,
        failed_at: 'unknown'
      },
      timestamp: new Date().toISOString()
    });
  }
}

// Helper function to validate request
function validateRequest(req) {
  const errors = [];
  
  if (req.method === 'POST' && req.body?.queries) {
    if (!Array.isArray(req.body.queries)) {
      errors.push('queries must be an array');
    } else if (req.body.queries.length === 0) {
      errors.push('queries array cannot be empty');
    } else if (req.body.queries.some(q => typeof q !== 'string' || q.trim().length === 0)) {
      errors.push('all queries must be non-empty strings');
    }
  }
  
  if (req.query.max && (isNaN(parseInt(req.query.max)) || parseInt(req.query.max) < 1)) {
    errors.push('max parameter must be a positive integer');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}