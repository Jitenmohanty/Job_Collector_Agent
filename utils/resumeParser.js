// utils/resumeParser.js
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function extractSkillsFromResume(resumeText) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0 flash" });

  const prompt = `
Extract skills, experience level, and job preferences from this resume:

${resumeText}

Return JSON:
{
  "skills": ["skill1", "skill2"],
  "experienceYears": 2,
  "preferredRoles": ["Backend Developer", "Full Stack"],
  "techStack": ["Node.js", "React"],
  "location": "Remote/Bangalore"
}
`;

  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}