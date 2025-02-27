# Resume Match Analyzer

This project provides a serverless function that analyzes resumes against job descriptions using Google's Gemini AI. It identifies key skills from the job description and determines if they are present in the resume.

## Project Structure

- `index.html`: Frontend code to be embedded in Kajabi as a code block
- `api/analyze.js`: Serverless function that processes resume and job description texts
- `vercel.json`: Configuration for Vercel deployment
- `package.json`: Project dependencies

## How It Works

1. The frontend collects resume text (either directly typed or uploaded as PDF) and job description text
2. When the user clicks "Scan", the data is sent to the serverless API
3. The API uses Google Gemini to analyze the texts and identify key skills
4. Results are returned to the frontend and displayed in a styled list

## Setup and Deployment

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later)
- [Vercel CLI](https://vercel.com/cli) (for local development and deployment)
- A Vercel account
- Google Gemini API key (already configured in vercel.json)

### Local Development

1. Install dependencies:
   ```
   npm install
   ```

2. Run the development server:
   ```
   npm run dev
   ```

3. Test the application at the local URL provided by Vercel (typically http://localhost:3000)

### Deployment to Vercel

1. Make sure you're logged in to Vercel CLI:
   ```
   vercel login
   ```

2. Deploy to Vercel:
   ```
   npm run deploy
   ```

3. After deployment, Vercel will provide a URL for your API (e.g., https://your-project.vercel.app)

### Integrating with Kajabi

1. In your Kajabi site, add a code block to a section where you want the Resume Match tool to appear
2. Copy the contents of `index.html` into the code block
3. Update the API endpoint in the JavaScript code to point to your Vercel deployment:

   Find this line in the JavaScript:
   ```javascript
   const response = await fetch('/api/analyze', {
   ```

   And replace it with:
   ```javascript
   const response = await fetch('https://your-project.vercel.app/api/analyze', {
   ```

4. Save and publish your Kajabi page

## Security Considerations

- The API key is stored in the Vercel environment and not exposed to clients
- CORS is configured to allow requests from any origin for development, but should be restricted to your Kajabi domain in production
- PDF parsing is handled server-side to reduce client-side processing

## Customization

- Styling: The frontend uses inline styles that match the existing design. You can modify these in the `index.html` file.
- Analysis parameters: You can adjust the Gemini prompt in `api/analyze.js` to change how skills are identified and analyzed.
