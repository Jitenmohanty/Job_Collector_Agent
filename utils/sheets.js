/**
 * Google Sheets API utility functions
 * Handles job data insertion and management
 */

import { google } from 'googleapis';

// Initialize Google Sheets API
function getGoogleSheetsClient() {
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  
  if (!serviceAccountJson) {
    throw new Error('Missing Google Service Account JSON');
  }
  
  try {
    const credentials = JSON.parse(serviceAccountJson);
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    return google.sheets({ version: 'v4', auth });
  } catch (error) {
    throw new Error(`Failed to initialize Google Sheets client: ${error.message}`);
  }
}

export async function initializeSheet() {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  
  if (!spreadsheetId) {
    throw new Error('Missing Google Sheet ID');
  }
  
  try {
    // Check if sheet exists and has headers
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'A1:H1'
    });
    
    const headers = [
      'Date',
      'Company', 
      'Role',
      'Location',
      'Apply Link',
      'AI Classification',
      'AI Summary',
      'Status'
    ];
    
    // If no headers exist, add them
    if (!response.data.values || response.data.values.length === 0) {
      console.log('Adding headers to sheet...');
      
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'A1:H1',
        valueInputOption: 'RAW',
        resource: {
          values: [headers]
        }
      });
      
      // Format headers
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [{
            repeatCell: {
              range: {
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 8
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.2, green: 0.2, blue: 0.2 },
                  textFormat: { 
                    foregroundColor: { red: 1, green: 1, blue: 1 },
                    bold: true 
                  }
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)'
            }
          }]
        }
      });
    }
    
    return { success: true, message: 'Sheet initialized successfully' };
    
  } catch (error) {
    console.error('Error initializing sheet:', error);
    return { success: false, error: error.message };
  }
}

export async function insertJobs(jobs) {
  if (!jobs || jobs.length === 0) {
    return { success: true, inserted: 0, message: 'No jobs to insert' };
  }
  
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  
  try {
    // Initialize sheet if needed
    await initializeSheet();
    
    // Get existing data to avoid duplicates
    const existingData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'E:E' // Apply Link column
    });
    
    const existingLinks = new Set(
      (existingData.data.values || [])
        .flat()
        .filter(link => link && link !== 'Apply Link')
    );
    
    // Filter out duplicate jobs
    const newJobs = jobs.filter(job => !existingLinks.has(job.applyLink));
    
    if (newJobs.length === 0) {
      return { 
        success: true, 
        inserted: 0, 
        duplicates: jobs.length,
        message: 'All jobs already exist in sheet' 
      };
    }
    
    // Prepare rows for insertion
    const rows = newJobs.map(job => [
      new Date().toLocaleDateString('en-IN'), // Date
      job.company || 'N/A',                   // Company
      job.title || 'N/A',                     // Role
      job.location || 'N/A',                  // Location  
      job.applyLink || 'N/A',                 // Apply Link
      job.aiClassification || 'UNPROCESSED',  // AI Classification
      job.aiSummary || 'Not processed',       // AI Summary
      'New'                                    // Status
    ]);
    
    // Insert rows
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'A:H',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: rows
      }
    });
    
    console.log(`Inserted ${rows.length} new jobs into sheet`);
    
    // Apply conditional formatting for classifications
    await applyConditionalFormatting(spreadsheetId, sheets);
    
    return {
      success: true,
      inserted: rows.length,
      duplicates: jobs.length - newJobs.length,
      range: response.data.updates.updatedRange,
      message: `Successfully inserted ${rows.length} jobs`
    };
    
  } catch (error) {
    console.error('Error inserting jobs into sheet:', error);
    return {
      success: false,
      error: error.message,
      inserted: 0
    };
  }
}

async function applyConditionalFormatting(spreadsheetId, sheets) {
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          // Good Fit - Green background
          {
            addConditionalFormatRule: {
              rule: {
                ranges: [{ startColumnIndex: 5, endColumnIndex: 6 }], // Column F (AI Classification)
                booleanRule: {
                  condition: {
                    type: 'TEXT_EQ',
                    values: [{ userEnteredValue: 'GOOD_FIT' }]
                  },
                  format: {
                    backgroundColor: { red: 0.8, green: 1, blue: 0.8 },
                    textFormat: { foregroundColor: { red: 0, green: 0.5, blue: 0 } }
                  }
                }
              },
              index: 0
            }
          },
          // Maybe Fit - Yellow background  
          {
            addConditionalFormatRule: {
              rule: {
                ranges: [{ startColumnIndex: 5, endColumnIndex: 6 }],
                booleanRule: {
                  condition: {
                    type: 'TEXT_EQ', 
                    values: [{ userEnteredValue: 'MAYBE_FIT' }]
                  },
                  format: {
                    backgroundColor: { red: 1, green: 1, blue: 0.8 },
                    textFormat: { foregroundColor: { red: 0.8, green: 0.6, blue: 0 } }
                  }
                }
              },
              index: 1
            }
          },
          // Ignore - Light red background
          {
            addConditionalFormatRule: {
              rule: {
                ranges: [{ startColumnIndex: 5, endColumnIndex: 6 }],
                booleanRule: {
                  condition: {
                    type: 'TEXT_EQ',
                    values: [{ userEnteredValue: 'IGNORE' }]
                  },
                  format: {
                    backgroundColor: { red: 1, green: 0.8, blue: 0.8 },
                    textFormat: { foregroundColor: { red: 0.8, green: 0, blue: 0 } }
                  }
                }
              },
              index: 2
            }
          }
        ]
      }
    });
  } catch (error) {
    console.log('Warning: Could not apply conditional formatting:', error.message);
  }
}

export async function updateJobStatus(applyLink, newStatus) {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  
  try {
    // Find the row with the matching apply link
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'A:H'
    });
    
    const rows = response.data.values || [];
    
    for (let i = 1; i < rows.length; i++) { // Skip header row
      if (rows[i][4] === applyLink) { // Apply Link is column E (index 4)
        // Update the status in column H (index 7)
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `H${i + 1}`,
          valueInputOption: 'RAW',
          resource: {
            values: [[newStatus]]
          }
        });
        
        return { success: true, message: `Updated status to ${newStatus}` };
      }
    }
    
    return { success: false, message: 'Job not found' };
    
  } catch (error) {
    console.error('Error updating job status:', error);
    return { success: false, error: error.message };
  }
}

export async function getSheetStats() {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'F:H' // Classification, Summary, Status columns
    });
    
    const rows = response.data.values || [];
    
    if (rows.length <= 1) {
      return {
        success: true,
        stats: {
          total: 0,
          goodFit: 0,
          maybeFit: 0,
          ignore: 0,
          applied: 0,
          new: 0
        }
      };
    }
    
    const dataRows = rows.slice(1); // Skip header
    
    const stats = {
      total: dataRows.length,
      goodFit: dataRows.filter(row => row[0] === 'GOOD_FIT').length,
      maybeFit: dataRows.filter(row => row[0] === 'MAYBE_FIT').length,
      ignore: dataRows.filter(row => row[0] === 'IGNORE').length,
      applied: dataRows.filter(row => row[2] === 'Applied').length,
      new: dataRows.filter(row => row[2] === 'New').length
    };
    
    return { success: true, stats };
    
  } catch (error) {
    console.error('Error getting sheet stats:', error);
    return { success: false, error: error.message };
  }
}