const { GoogleGenerativeAI } = require('@google/generative-ai');
const { PDFExtract } = require('pdf.js-extract');
const pdfExtract = new PDFExtract();

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper function to parse PDF buffer using pdf.js-extract
async function extractTextFromPDF(pdfBuffer) {
  try {
    // Convert base64 to buffer
    const buffer = Buffer.from(pdfBuffer, 'base64');
    
    // Use pdf.js-extract with options to optimize performance
    const options = {
      pagerender: function pagerender(pageData) {
        return Promise.resolve('');
      }
    };
    
    const data = await pdfExtract.extractBuffer(buffer, options);
    
    // Combine text from all pages
    const text = data.pages
      .map(page => page.content
        .map(item => item.str)
        .join(' '))
      .join('\n\n');
    
    return text;
  } catch (error) {
    console.error('Error parsing PDF:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw new Error(`Failed to parse PDF file: ${error.message}`);
  }
}

// Helper function to analyze with Gemini
async function analyzeWithGemini(resumeText, jobDescriptionText) {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro",
      generationConfig: {
        temperature: 0.2,   // Lowered temperature for more consistent results
        topP: 1
      }
    });
    
    const prompt = `
    You are a professional resume analyzer. I will provide you with a job description and a resume.
    
    JOB DESCRIPTION:
    ${jobDescriptionText}
    
    RESUME:
    ${resumeText}
    
    Task: 
    1. Extract exactly 5 most frequently mentioned technical skills from the job description.
    2. For each skill, determine if the resume explicitly demonstrates this skill (YES or NO).
    3. Use only exact or similar keyword matches to determine presence.
    
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
  // Set CORS headers manually on all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  if (req.method === 'GET') {
    return res.status(200).json({ message: 'Analyze endpoint is working' });
  }

  // Handle the OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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
        error: 'Missing required field. Please provide either resumeText or resumePdfBase64, and jobDescription.' 
      });
    }

    // Extract text from PDF if provided
    let finalResumeText = resumeText;
    if (!resumeText && resumePdfBase64) {
      try {
        console.log("Processing PDF file...");
        finalResumeText = await extractTextFromPDF(resumePdfBase64);
        console.log("PDF processing complete. Extracted text length:", finalResumeText.length);
      } catch (pdfError) {
        console.error("PDF processing failed:", pdfError);
        return res.status(400).json({ 
          error: `PDF processing failed: ${pdfError.message}` 
        });
      }
    }

    // Analyze with Gemini
    const analysis = await analyzeWithGemini(finalResumeText, jobDescription);
    
    // Return the analysis
    return res.status(200).json(analysis);
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};