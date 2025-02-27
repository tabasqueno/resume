const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
const pdfParse = require('pdf-parse');

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Simplified direct CORS handling - more reliable than middleware
function handleCors(req, res) {
  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Origin, X-Requested-With, Accept');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true; // Indicate that the request has been handled
  }
  return false; // Continue with normal request handling
}

// Helper function to parse PDF buffer
async function extractTextFromPDF(pdfBuffer) {
  try {
    const data = await pdfParse(Buffer.from(pdfBuffer, 'base64'));
    return data.text;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF file');
  }
}

// Helper function to analyze with Gemini
async function analyzeWithGemini(resumeText, jobDescriptionText) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const prompt = `
    You are a professional resume analyzer. I will provide you with a job description and a resume.
    
    JOB DESCRIPTION:
    ${jobDescriptionText}
    
    RESUME:
    ${resumeText}
    
    Task: 
    1. Identify the top 5-7 most important skills or qualifications from the job description.
    2. For each skill, determine if the resume demonstrates this skill (YES or NO).
    3. For each skill, provide a brief explanation of why you determined YES or NO.
    
    Return your analysis in the following JSON format only, with no additional text:
    {
      "skills": [
        {
          "skill": "Skill name",
          "present": true/false,
          "explanation": "Brief explanation"
        },
        ...
      ]
    }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Failed to parse Gemini response');
    }
  } catch (error) {
    console.error('Error analyzing with Gemini:', error);
    throw new Error('Failed to analyze with Gemini');
  }
}

// Main handler function
module.exports = async (req, res) => {
  // Handle CORS - if it's an OPTIONS request, it will end the response
  if (handleCors(req, res)) {
    return; // Response already sent for OPTIONS request
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { resumeText, resumePdfBase64, jobDescription } = req.body;

    // Validate inputs
    if ((!resumeText && !resumePdfBase64) || !jobDescription) {
      return res.status(400).json({ 
        error: 'Missing required fields. Please provide either resumeText or resumePdfBase64, and jobDescription.' 
      });
    }

    // Extract text from PDF if provided
    let finalResumeText = resumeText;
    if (!resumeText && resumePdfBase64) {
      finalResumeText = await extractTextFromPDF(resumePdfBase64);
    }

    // Analyze with Gemini
    const analysis = await analyzeWithGemini(finalResumeText, jobDescription);
    
    // Return the analysis
    return res.status(200).json(analysis);
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
