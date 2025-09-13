/**
 * Gemini AI utility functions for job classification
 * Using Gemini 2.0 Flash free tier
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

export async function classifyJob(jobTitle, jobDescription, company) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Missing Gemini API key');
  }

  const prompt = `
You are a job classification assistant. Analyze this job posting and classify it based on these criteria:

**TARGET PROFILE:**
- MERN/PERN Stack (MongoDB/PostgreSQL, Express, React, Node.js)
- Backend Technologies: Node.js, Express, REST APIs, GraphQL
- Cloud & DevOps: Docker, AWS, Azure, GCP
- Languages: JavaScript, TypeScript
- Experience: 0-2 years (Junior/Entry level)
- Location: India or Remote work allowed

**JOB TO ANALYZE:**
Title: ${jobTitle}
Company: ${company}
Description: ${jobDescription.substring(0, 2000)}

**CLASSIFICATION RULES:**
✅ **GOOD_FIT**: Perfect match - MERN/PERN stack, Node.js backend, 0-2 YOE, India/Remote, mentions specific tech stack
⚠️ **MAYBE_FIT**: Partial match - some relevant technologies but missing key requirements or unclear experience level
❌ **IGNORE**: Not relevant - different tech stack (PHP, Java, .NET), senior roles (3+ years), non-tech roles, wrong location

**RESPONSE FORMAT (JSON only):**
{
  "classification": "GOOD_FIT|MAYBE_FIT|IGNORE",
  "summary": "Brief 2-3 sentence explanation of why this job fits/doesn't fit the criteria",
  "matchedSkills": ["skill1", "skill2"],
  "concerns": ["concern1", "concern2"],
  "experienceLevel": "entry|junior|mid|senior|unclear"
}

Respond only with valid JSON.
`;

  try {
    console.log(`Classifying job: ${jobTitle} at ${company}`);
    
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 1,
          maxOutputTokens: 500,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH", 
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response from Gemini API');
    }

    const aiResponse = data.candidates[0].content.parts[0].text.trim();
    
    // Try to parse JSON response
    try {
      // Clean the response - remove markdown code blocks if present
      const cleanedResponse = aiResponse
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      const result = JSON.parse(cleanedResponse);
      
      // Validate required fields
      if (!result.classification || !result.summary) {
        throw new Error('Missing required fields in AI response');
      }
      
      // Ensure valid classification
      const validClassifications = ['GOOD_FIT', 'MAYBE_FIT', 'IGNORE'];
      if (!validClassifications.includes(result.classification)) {
        result.classification = 'MAYBE_FIT';
      }
      
      console.log(`Job classified as: ${result.classification}`);
      
      return {
        success: true,
        classification: result.classification,
        summary: result.summary,
        matchedSkills: result.matchedSkills || [],
        concerns: result.concerns || [],
        experienceLevel: result.experienceLevel || 'unclear'
      };
      
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', aiResponse);
      
      // Fallback classification based on keywords
      const fallbackResult = performFallbackClassification(jobTitle, jobDescription);
      return fallbackResult;
    }
    
  } catch (error) {
    console.error('Error classifying job with Gemini:', error);
    
    // Return fallback classification
    const fallbackResult = performFallbackClassification(jobTitle, jobDescription);
    return {
      ...fallbackResult,
      error: error.message
    };
  }
}

function performFallbackClassification(jobTitle, jobDescription) {
  const text = `${jobTitle} ${jobDescription}`.toLowerCase();
  
  const goodFitKeywords = [
    'node.js', 'nodejs', 'express', 'react', 'mongodb', 'postgresql', 
    'mern', 'pern', 'javascript', 'typescript', 'docker', 'aws'
  ];
  
  const badKeywords = [
    'php', 'java', 'spring', '.net', 'c#', 'python', 'django', 
    'senior', '3+ years', '4+ years', '5+ years'
  ];
  
  const goodMatches = goodFitKeywords.filter(keyword => text.includes(keyword));
  const badMatches = badKeywords.filter(keyword => text.includes(keyword));
  
  let classification = 'IGNORE';
  let summary = 'Fallback classification - unable to process with AI';
  
  if (goodMatches.length >= 2 && badMatches.length === 0) {
    classification = 'GOOD_FIT';
    summary = `Matches key technologies: ${goodMatches.join(', ')}`;
  } else if (goodMatches.length >= 1) {
    classification = 'MAYBE_FIT';
    summary = `Partial match with some relevant skills: ${goodMatches.join(', ')}`;
  }
  
  return {
    success: true,
    classification,
    summary,
    matchedSkills: goodMatches,
    concerns: badMatches,
    experienceLevel: 'unclear',
    fallback: true
  };
}

export async function classifyJobsBatch(jobs) {
  const classifiedJobs = [];
  
  for (let i = 0; i < jobs.length; i++) {
    try {
      // Rate limiting - Gemini free tier has limits
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const job = jobs[i];
      const result = await classifyJob(job.title, job.description, job.company);
      
      classifiedJobs.push({
        ...job,
        aiClassification: result.classification,
        aiSummary: result.summary,
        matchedSkills: result.matchedSkills,
        concerns: result.concerns,
        experienceLevel: result.experienceLevel,
        processed: true
      });
      
    } catch (error) {
      console.error(`Failed to classify job ${jobs[i]?.title}:`, error);
      
      // Add unprocessed job with error
      classifiedJobs.push({
        ...jobs[i],
        aiClassification: 'IGNORE',
        aiSummary: 'Classification failed - ' + error.message,
        matchedSkills: [],
        concerns: ['Processing error'],
        experienceLevel: 'unclear',
        processed: false,
        error: error.message
      });
    }
  }
  
  return classifiedJobs;
}