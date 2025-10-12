// utils/queryGenerator.js
export function generateSearchQueries(resumeData) {
  const { skills, preferredRoles, techStack } = resumeData;
  
  const queries = [
    ...preferredRoles.map(role => role.toLowerCase()),
    ...techStack.map(tech => `${tech} developer`),
    `${techStack.join(' ')} developer`,
    `${resumeData.experienceYears} year ${techStack[0]} developer`
  ];
  
  return [...new Set(queries)].slice(0, 5); // unique, max 5
}