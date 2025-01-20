import { GoogleGenerativeAI } from '@google/generative-ai';
import { VideoAnalysisResult } from './videoAnalyzer';

export class GeminiAnalyzer {
  private model: any;

  constructor() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  }

  async analyzeVideo(videoContent: Buffer | string): Promise<VideoAnalysisResult> {
    try {
      console.log('\n=== Starting Gemini Video Analysis ===');
      
      // Check file size
      if (Buffer.isBuffer(videoContent)) {
        const sizeInMB = videoContent.length / (1024 * 1024);
        console.log(`Video size: ${sizeInMB.toFixed(2)} MB`);
        
        if (sizeInMB > 19) {
          throw new Error('Video file is too large. Please use a video smaller than 19MB or provide a URL.');
        }
      }

      console.log('\nPreparing video data for Gemini API...');
      const mimeType = 'video/mp4';
      const videoData = {
        inlineData: {
          data: Buffer.isBuffer(videoContent) ? videoContent.toString('base64') : videoContent,
          mimeType
        }
      };

      console.log('Preparing prompt for Gemini...');
      const prompt = `You are analyzing video reviews for a product manager at a company that gathers video reviews for its customers. The goal is to determine if each review is effective, regardless of whether it's positive or negative. A good review is one that provides value to the merchant - even a 1-star review can be excellent if it offers clear, actionable feedback.

Please analyze the video review based on the following criteria. For each section, provide your analysis in this exact format:

**[Section Name] (X/10)**
Good Points:
- [Point 1]
- [Point 2]
- [Point 3]

Improvement Points:
- [Point 1]
- [Point 2]
- [Point 3]

Overall Assessment: [Brief assessment]

Sections to analyze:

1. Clarity
- How well is the main message communicated?
- Is the content easy to follow?
- Are key points clearly explained?

2. Engagement
- How well does it maintain viewer attention?
- Is the presentation style compelling?
- Does it keep viewers interested?

3. Relevance
- How well does it address the product/service?
- Is all content relevant to the review?
- Does it meet merchant needs?

4. Informative Content
- What valuable insights are provided?
- Are claims well supported?
- Is key information included?

5. Visuals and Audio Quality
- How professional is the production?
- Are technical aspects well executed?
- Is the quality consistent?

6. Presentation
- How well does the review flow?
- Is the structure effective?
- Is the style appropriate for the audience?

Remember: A review's value to the merchant is based on how well it helps potential customers make informed decisions or provides actionable feedback for improvement.

Please ensure each section follows the exact format specified above, with clear bullet points for both good points and improvement points.`;

      console.log('\nSending request to Gemini API...');
      const result = await this.model.generateContent([prompt, videoData]);
      const response = await result.response;
      const text = response.text();
      
      console.log('\n=== Gemini API Response ===');
      console.log('Response length:', text.length, 'characters');
      console.log('\nFirst 200 characters of response:');
      console.log(text.substring(0, 200) + '...');

      console.log('\nProcessing Gemini response...');
      const analysisResult = this.processGeminiResponse(text);

      console.log('\n=== Gemini Analysis Results ===');
      console.log(`Overall Score: ${analysisResult.overallScore.toFixed(2)}`);
      console.log('\nCategory Scores:');
      Object.entries(analysisResult).forEach(([key, value]) => {
        if (typeof value === 'object' && value.score !== undefined) {
          console.log(`- ${key}: ${value.score.toFixed(2)}`);
        }
      });

      if (analysisResult.suggestions.length > 0) {
        console.log('\nSuggestions:');
        analysisResult.suggestions.forEach((suggestion, index) => {
          console.log(`${index + 1}. ${suggestion}`);
        });
      }

      return analysisResult;
    } catch (error) {
      console.error('\n=== Gemini Analysis Error ===');
      console.error('Error details:', error);
      throw error;
    }
  }

  private processGeminiResponse(analysis: string): VideoAnalysisResult {
    console.log('\n=== Processing Gemini Response ===');
    console.log('Raw response:', analysis); // Log the full response for debugging
    
    // Initialize default result structure with new fields
    const result: VideoAnalysisResult = {
      clarity: { score: 0, details: [], goodPoints: [], improvementPoints: [] },
      engagement: { score: 0, details: [], goodPoints: [], improvementPoints: [] },
      relevance: { score: 0, details: [], goodPoints: [], improvementPoints: [] },
      informativeContent: { score: 0, details: [], goodPoints: [], improvementPoints: [] },
      visualsAndAudio: { score: 0, details: [], goodPoints: [], improvementPoints: [] },
      presentation: { score: 0, details: [], goodPoints: [], improvementPoints: [] },
      overallScore: 0,
      suggestions: [],
      metadata: {
        fileSize: '',
        duration: ''
      },
      rawData: {
        geminiResponse: analysis,
        labels: [],
        transcript: '',
        shots: [],
        textDetection: [],
        objectDetection: []
      }
    };

    try {
      const lines = analysis.split('\n').map(line => line.trim());
      let currentSection: string | null = null;
      let currentSubsection: 'good' | 'improvement' | null = null;
      let collectingPoints = false;

      console.log('\nProcessing response line by line:');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Log each line for debugging
        console.log(`Processing line: "${line}"`);

        // Check for main section headers with numbers
        const sectionMatch = line.match(/^\*?\*?\d*\.*\s*(Clarity|Engagement|Relevance|Informative Content|Visuals and Audio Quality|Presentation).*?(\d+)\/10\*?\*?/i);
        if (sectionMatch) {
          currentSection = sectionMatch[1].toLowerCase();
          if (currentSection === 'visuals and audio quality') {
            currentSection = 'visualsAndAudio';
          }
          if (currentSection === 'informative content') {
            currentSection = 'informativeContent';
          }

          const score = parseInt(sectionMatch[2]);
          const section = result[currentSection as keyof typeof result] as any;
          if (section) {
            section.score = score;
            console.log(`Found section: ${currentSection} with score: ${score}`);
          }
          
          currentSubsection = null;
          collectingPoints = false;
          continue;
        }

        // Check for good points sections
        if (line.toLowerCase().includes('good points:')) {
          currentSubsection = 'good';
          collectingPoints = true;
          console.log(`Started collecting good points for ${currentSection}`);
          continue;
        }
        
        // Check for improvement points sections
        if (line.toLowerCase().includes('improvement points:')) {
          currentSubsection = 'improvement';
          collectingPoints = true;
          console.log(`Started collecting improvement points for ${currentSection}`);
          continue;
        }

        // Process points
        if (collectingPoints && currentSection && currentSubsection && line.startsWith('-')) {
          const point = line.substring(1).trim();
          if (point && !point.toLowerCase().includes('overall assessment')) {
            const section = result[currentSection as keyof typeof result] as any;
            
            if (currentSubsection === 'good') {
              section.goodPoints.push(point);
              console.log(`Added good point to ${currentSection}: "${point}"`);
            } else {
              section.improvementPoints.push(point);
              console.log(`Added improvement point to ${currentSection}: "${point}"`);
            }
          }
        }

        // Check for overall assessment to reset collection
        if (line.toLowerCase().includes('overall assessment:')) {
          collectingPoints = false;
          currentSubsection = null;
          console.log('Reset point collection due to assessment');
        }
      }

      // Calculate overall score
      let totalScore = 0;
      let sectionCount = 0;
      
      Object.entries(result).forEach(([key, value]) => {
        if (typeof value === 'object' && 'score' in value && value.score > 0) {
          totalScore += value.score;
          sectionCount++;
        }
      });
      
      result.overallScore = sectionCount > 0 ? Math.round((totalScore / sectionCount) * 10) / 10 : 0;

      // Log the final processed results
      console.log('\n=== Final Results ===');
      Object.entries(result).forEach(([key, value]) => {
        if (typeof value === 'object' && 'score' in value) {
          console.log(`\n${key}:`);
          console.log(`Score: ${value.score}`);
          console.log('Good Points:', value.goodPoints);
          console.log('Improvement Points:', value.improvementPoints);
        }
      });
      console.log('\nOverall Score:', result.overallScore);

      return result;
    } catch (error) {
      console.error('Error processing Gemini response:', error);
      throw error;
    }
  }
} 