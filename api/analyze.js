// api/analyze.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Function to directly process PDF with Gemini multimodal
async function analyzeWithGeminiMultimodal(pdfBuffer, jobDescriptionText) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    // Create parts for multimodal input
    const pdfPart = {
      inlineData: {
        data: pdfBuffer,
        mimeType: "application/pdf"
      }
    };
    
    const textPart = {
      text: `
      You are a professional resume analyzer. I will provide you with a job description and a resume PDF.

      JOB DESCRIPTION:
      ${jobDescriptionText}

      RESUME:
      The resume is provided as a PDF file. Please analyze its entire content carefully.

      Task: 
      1. Be consistent in your analysis.
      2. Extract exactly 10 most frequently mentioned skills from the job description.
      3. For each skill, determine if the resume explicitly demonstrates this skill (YES or NO).
      4. Use only exact or similar keyword matches to determine presence.

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
      `
    };
    
    // Generate content with multimodal input
    const result = await model.generateContent([pdfPart, textPart]);
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
    console.error('Error analyzing with Gemini multimodal:', error);
    throw new Error('Failed to analyze with Gemini multimodal: ' + error.message);
  }
}

// Main handler function
module.exports = async (req, res) => {
  if (req.method === 'GET') {
    return res.status(200).json({ message: 'Analyze endpoint is working' });
  }
  
  // Set CORS headers manually on all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  // Handle the OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { resumePdfBase64, jobDescription } = req.body;

    // Validate inputs
    if (!resumePdfBase64 || !jobDescription) {
      return res.status(400).json({ 
        error: 'Missing required field. Please provide both resumePdfBase64 and jobDescription.' 
      });
    }

    // Analyze with Gemini multimodal
    const analysis = await analyzeWithGeminiMultimodal(resumePdfBase64, jobDescription);

    // Return the analysis
    return res.status(200).json(analysis);
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};