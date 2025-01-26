import { GoogleGenerativeAI } from '@google/generative-ai';
import { VideoAnalysisResult } from './videoAnalyzer';
import fetch from 'node-fetch';

export class GeminiAnalyzer {
  private model: any;

  constructor() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  }

  private async fetchVideoContent(url: string): Promise<Buffer> {
    console.log('\nFetching video content from URL:', url);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async analyzeVideo(videoContent: Buffer | string, productDescription?: string): Promise<VideoAnalysisResult> {
    try {
      console.log('\n=== Starting Gemini Video Analysis ===');
      
      let processedContent: Buffer;
      
      if (typeof videoContent === 'string') {
        // If it's a URL, fetch the content first
        processedContent = await this.fetchVideoContent(videoContent);
      } else {
        processedContent = videoContent;
      }

      // Check file size
      const sizeInMB = processedContent.length / (1024 * 1024);
      console.log(`Video size: ${sizeInMB.toFixed(2)} MB`);
      
      if (sizeInMB > 19) {
        throw new Error('Video file is too large. Please use a video smaller than 19MB.');
      }

      console.log('\nPreparing video data for Gemini API...');
      const mimeType = 'video/mp4';
      const videoData = {
        inlineData: {
          data: processedContent.toString('base64'),
          mimeType
        }
      };

      console.log('Preparing prompt for Gemini...');
      const contextPrefix = productDescription 
        ? `You are analyzing video reviews for a product manager at a company that gathers video reviews for its customers. The video you are about to analyze is reviewing the following product/service:\n\n${productDescription}\n\nKeep this product context in mind while analyzing the review. The goal is to determine if each review is effective, regardless of whether it's positive or negative.`
        : `You are analyzing video reviews for a product manager at a company that gathers video reviews for its customers. The goal is to determine if each review is effective, regardless of whether it's positive or negative.`;

      const prompt = `${contextPrefix} A good review is one that provides value to the merchant - even a 1-star review can be excellent if it offers clear, actionable feedback. Remember, these are amateur reviews. Do not penalize reviewers for minor technical issues, lack of professional editing, or less polished presentation styles. Focus on the substance of their feedback and its potential value to the merchant. Prioritize actionable feedback that the merchant can use to improve their product or service.

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

**1. Clarity (X/10)**

*   How well is the main message communicated?
*   Is the content easy to follow?
*   Are key points clearly explained?
*   Are specific examples or demonstrations used to illustrate points?

**Amateur Review Considerations:** Even if the reviewer doesn't use professional terminology or perfectly structure their sentences, consider if the core message is understandable. Minor stumbles or pauses are acceptable. Focus on whether the viewer can grasp the essential information.

**Output Format:**

**Clarity (X/10)**
Good Points:
- [Point 1]
- [Point 2]
- [Point 3]
Improvement Points:
- [Point 1]
- [Point 2]
- [Point 3]
Overall Assessment: [Brief assessment]

**2. Engagement (X/10)**

*   How well does it maintain viewer attention?
*   Does the reviewer convey their message with sufficient enthusiasm or clarity to hold the viewer's attention, considering they are likely not a professional presenter?
*   Does it keep viewers interested?
* Does the reviewer appear enthusiastic and/or credible (keeping in mind they are likely an amateur)?

**Amateur Review Considerations:** It's unlikely an amateur reviewer will have the charisma of a professional presenter. Look for genuine enthusiasm and a clear attempt to connect with the viewer. Minor nervousness or awkwardness should not be heavily penalized.

**Output Format:**

**Engagement (X/10)**
Good Points:
- [Point 1]
- [Point 2]
- [Point 3]
Improvement Points:
- [Point 1]
- [Point 2]
- [Point 3]
Overall Assessment: [Brief assessment]

**3. Relevance (X/10)**

*   How well does it address the product/service?
*   Is all content relevant to the review?
*   Does it meet merchant needs by providing useful information?
*   Does the review focus on specific features or aspects of the product/service?

**Amateur Review Considerations:** A rambling or slightly off-topic review can still contain valuable insights. Focus on whether the reviewer ultimately provides information that is relevant to the product or service, even if they take a less direct approach.

**Output Format:**

**Relevance (X/10)**
Good Points:
- [Point 1]
- [Point 2]
- [Point 3]
Improvement Points:
- [Point 1]
- [Point 2]
- [Point 3]
Overall Assessment: [Brief assessment]

**4. Informative Content (X/10)**

*   What valuable insights are provided?
*   Are claims well supported (even if not with formal evidence)?
*   Is key information included?
* If applicable, is there a balanced presentation of positive and negative aspects?

**Amateur Review Considerations:** Amateur reviewers may not have access to technical data or conduct rigorous testing. Focus on whether their claims are based on their personal experience and whether they provide sufficient context for their opinions. A balanced review is always preferred, but even a strongly positive or negative review can be valuable if it provides clear reasoning.

**Output Format:**

**Informative Content (X/10)**
Good Points:
- [Point 1]
- [Point 2]
- [Point 3]
Improvement Points:
- [Point 1]
- [Point 2]
- [Point 3]
Overall Assessment: [Brief assessment]

**5. Visuals and Audio Quality (X/10)**

*   Is the visual and audio quality adequate for understanding the review's content?
*   Are there any significant distractions (e.g., excessive noise, poor lighting) that hinder comprehension?

**Amateur Review Considerations:** These are amateur reviews. Expecting professional lighting, sound, or editing is unrealistic. Focus on whether the video and audio are clear enough to understand the reviewer's message. Minor background noise or slightly shaky camera work should not be heavily penalized unless they significantly detract from the review's clarity. If the content is valuable, give the reviewer credit even with basic technical imperfections.

**Output Format:**

**Visuals and Audio Quality (X/10)**
Good Points:
- [Point 1]
- [Point 2]
- [Point 3]
Improvement Points:
- [Point 1]
- [Point 2]
- [Point 3]
Overall Assessment: [Brief assessment]

**6. Presentation (X/10)**

*   Does the review have a clear beginning, middle, and end?
*   Is the flow logical, even if it's not perfectly polished?
*   Is the style appropriate for the target audience (keeping in mind the likely amateur nature of both the reviewer and the viewers)?
* Are visual aids or on-screen text used effectively?

**Amateur Review Considerations:** A perfectly structured presentation is unlikely. Look for a basic attempt to organize the review logically. Minor digressions or a less-than-perfect conclusion are acceptable.

**Output Format:**

**Presentation (X/10)**
Good Points:
- [Point 1]
- [Point 2]
- [Point 3]
Improvement Points:
- [Point 1]
- [Point 2]
- [Point 3]
Overall Assessment: [Brief assessment]

Remember: A review's value to the merchant is based on how well it helps potential customers make informed decisions or provides actionable feedback for improvement.`;

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