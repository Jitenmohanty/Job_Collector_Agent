/**
 * Adzuna API utility functions
 * Free tier: 1000 requests/month
 */

const ADZUNA_BASE_URL = 'https://api.adzuna.com/v1/api';

// ✅ Mapping country names to ISO codes
const COUNTRY_MAP = {
  india: 'in',
  uk: 'gb',
  unitedkingdom: 'gb',
  usa: 'us',
  us: 'us',
  unitedstates: 'us',
  canada: 'ca',
  germany: 'de',
  france: 'fr'
};

function normalizeLocation(location) {
  if (!location) return 'in'; // default
  const key = location.toLowerCase().replace(/\s+/g, '');
  return COUNTRY_MAP[key] || location.toLowerCase();
}

export async function fetchJobs(query, location = 'in', page = 1) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  
  if (!appId || !appKey) {
    throw new Error('Missing Adzuna API credentials');
  }

  // normalize location
  const countryCode = normalizeLocation(location);

  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: '20',
    what: query,
    'content-type': 'application/json'  // 🔥 fix underscore → dash
  });

  const url = `${ADZUNA_BASE_URL}/jobs/${countryCode}/search/${page}?${params}`;
  
  try {
    console.log(`🔍 Fetching jobs from Adzuna: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'JobScoutAgent/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Adzuna API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log(`✅ Found ${data.results?.length || 0} jobs`);
    
    return {
      success: true,
      jobs: data.results?.map(job => ({
        id: job.id,
        title: job.title?.trim() || 'N/A',
        company: job.company?.display_name?.trim() || 'N/A',
        location: job.location?.display_name?.trim() || 'N/A',
        description: job.description?.trim() || 'N/A',
        applyLink: job.redirect_url || job.url || 'N/A',
        salary: job.salary_max ? `${job.salary_min || 0} - ${job.salary_max}` : 'N/A',
        postedDate: job.created || new Date().toISOString()
      })) || [],
      total: data.count || 0
    };
  } catch (error) {
    console.error('❌ Error fetching jobs from Adzuna:', error);
    return {
      success: false,
      error: error.message,
      jobs: []
    };
  }
}

export async function fetchMultipleQueries(queries, location = 'in') {
  const allJobs = [];
  const countryCode = normalizeLocation(location);
  
  for (const query of queries) {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
      const result = await fetchJobs(query, countryCode);
      
      if (result.success) {
        const jobsWithQuery = result.jobs.map(job => ({
          ...job,
          searchQuery: query
        }));
        allJobs.push(...jobsWithQuery);
      }
    } catch (error) {
      console.error(`❌ Failed to fetch jobs for query: ${query}`, error);
    }
  }
  
  // Remove duplicates based on apply link
  const uniqueJobs = allJobs.filter((job, index, self) => 
    index === self.findIndex(j => j.applyLink === job.applyLink)
  );
  
  return {
    success: true,
    jobs: uniqueJobs,
    total: uniqueJobs.length
  };
}
