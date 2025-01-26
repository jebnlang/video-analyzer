import { VideoIntelligenceServiceClient, protos } from '@google-cloud/video-intelligence';

const { Feature } = protos.google.cloud.videointelligence.v1;

interface CategoryAnalysis {
  score: number;
  details: string[];
  goodPoints: string[];
  improvementPoints: string[];
}

export interface VideoAnalysisResult {
  clarity: CategoryAnalysis;
  engagement: CategoryAnalysis;
  relevance: CategoryAnalysis;
  informativeContent: CategoryAnalysis;
  visualsAndAudio: CategoryAnalysis;
  presentation: CategoryAnalysis;
  overallScore: number;
  suggestions: string[];
  metadata: {
    fileSize: string;
    duration: string;
  };
  rawData: {
    geminiResponse: string;
    prompt?: string;
    labels: string[];
    transcript: string;
    shots: any[];
    textDetection: any[];
    objectDetection: any[];
  };
}

export class VideoAnalyzer {
  private client: VideoIntelligenceServiceClient;

  constructor() {
    // Use environment variable if available, otherwise fallback to file
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
      ? JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
      : undefined;

    this.client = new VideoIntelligenceServiceClient({
      credentials,
      keyFilename: credentials ? undefined : './service-account-key.json',
    });
  }

  private async validateVideo(videoContent: Buffer | string): Promise<void> {
    console.log('\n=== Video Validation ===');
    
    if (Buffer.isBuffer(videoContent)) {
      // Check file signature for common video formats
      const signature = videoContent.slice(0, 4).toString('hex');
      console.log('File signature:', signature);
      console.log('First 32 bytes:', videoContent.slice(0, 32).toString('hex'));
      
      // Common video format signatures
      const validSignatures: { [key: string]: string } = {
        '66747970': 'MP4',
        '1a45dfa3': 'WebM',
        '52494646': 'AVI',
        '0000001c': 'MOV',
        '00000020': 'MP4 (alternate)',
      };
      
      const format = validSignatures[signature] || 'Unknown';
      console.log('Detected format:', format);
      
      // Log file size and check for minimum size
      const sizeMB = videoContent.length / (1024 * 1024);
      console.log('File size:', sizeMB.toFixed(2), 'MB');
      
      if (sizeMB < 0.1) {
        console.warn('Warning: File size is very small, might be corrupted');
      }
      if (sizeMB > 100) {
        console.warn('Warning: Large file size may increase processing time');
      }

      // Check for minimum length (assuming video)
      if (videoContent.length < 1024 * 100) { // Less than 100KB
        console.warn('Warning: File seems too small for a video with audio');
      }
    } else {
      console.log('Using video URL:', videoContent);
      if (!videoContent.startsWith('http')) {
        console.warn('Warning: URL should start with http:// or https://');
      }
      if (!videoContent.match(/\.(mp4|webm|avi|mov)$/i)) {
        console.warn('Warning: URL does not end with a common video extension');
      }
    }
  }

  async analyzeVideo(videoContent: Buffer | string): Promise<VideoAnalysisResult> {
    try {
      console.log('\n=== Starting Video Intelligence API Analysis ===');
      await this.validateVideo(videoContent);

      console.log('Preparing API request with features:');
      const features = [
        Feature.LABEL_DETECTION,
        Feature.SHOT_CHANGE_DETECTION,
        Feature.SPEECH_TRANSCRIPTION,
        Feature.TEXT_DETECTION,
        Feature.OBJECT_TRACKING,
        Feature.PERSON_DETECTION,
      ];
      features.forEach(feature => console.log(`- ${Feature[feature]}`));

      const request = {
        inputContent: Buffer.isBuffer(videoContent) ? videoContent.toString('base64') : videoContent,
        features,
        videoContext: {
          speechTranscriptionConfig: {
            languageCode: 'en-US',
            enableAutomaticPunctuation: true,
          },
        },
      };

      console.log('\nSending request to Video Intelligence API...');
      const [operation] = await this.client.annotateVideo(request);
      console.log('Waiting for the API response...');
      
      const [response] = await operation.promise();
      console.log('\nReceived API response. Processing results...');

      const result = this.processAnalysisResults(response, videoContent);
      
      console.log('\n=== Analysis Results Summary ===');
      console.log(`Overall Score: ${result.overallScore.toFixed(2)}`);
      console.log('\nCategory Scores:');
      Object.entries(result).forEach(([key, value]) => {
        if (typeof value === 'object' && value.score !== undefined) {
          console.log(`- ${key}: ${value.score.toFixed(2)}`);
        }
      });

      console.log('\nRaw Data Statistics:');
      if (result.rawData) {
        console.log(`- Labels detected: ${result.rawData.labels.length}`);
        console.log(`- Transcript length: ${result.rawData.transcript.length} characters`);
        console.log(`- Text detections: ${result.rawData.textDetection.length}`);
        console.log(`- Objects detected: ${result.rawData.objectDetection.length}`);
        console.log(`- Shot changes: ${result.rawData.shots.length}`);
      }

      this.calculateApiUsage(response);
      return result;
    } catch (error) {
      console.error('\n=== Video Analysis Error ===');
      console.error('Error details:', error);
      throw error;
    }
  }

  private processAnalysisResults(
    response: protos.google.cloud.videointelligence.v1.IAnnotateVideoResponse,
    videoContent: Buffer | string
  ): VideoAnalysisResult {
    console.log('\n=== Processing Analysis Results ===');
    
    const transcript = this.getTranscription(response);
    console.log('\nTranscript Analysis:');
    console.log(`- Length: ${transcript.length} characters`);
    console.log(`- Word count: ${transcript.split(/\s+/).length}`);

    const shots = this.getShotChanges(response);
    console.log('\nShot Analysis:');
    console.log(`- Total shots detected: ${shots.length}`);

    const labels = this.getLabels(response);
    console.log('\nLabel Detection:');
    console.log(`- Total labels: ${labels.length}`);
    console.log('- Top 5 labels:', labels.slice(0, 5));

    const textDetections = this.getTextDetections(response);
    console.log('\nText Detection:');
    console.log(`- Total text segments: ${textDetections.length}`);

    const objects = this.getObjects(response);
    console.log('\nObject Detection:');
    console.log(`- Total objects: ${objects.length}`);

    const persons = this.getPersons(response);
    console.log('\nPerson Detection:');
    console.log(`- Total person tracks: ${persons.length}`);

    // Get video duration
    const lastShot = response.annotationResults?.[0]?.shotAnnotations?.slice(-1)[0];
    const durationSeconds = Number(lastShot?.endTimeOffset?.seconds || 0);
    const durationStr = `${Math.floor(durationSeconds / 60)}:${String(durationSeconds % 60).padStart(2, '0')}`;

    // Initialize result object
    const result: VideoAnalysisResult = {
      clarity: this.analyzeClarity(transcript, textDetections),
      engagement: this.analyzeEngagement(transcript, textDetections),
      relevance: this.analyzeRelevance(transcript, labels),
      informativeContent: this.analyzeInformativeContent(transcript, labels),
      visualsAndAudio: this.analyzeVisualsAndAudio(shots, transcript, persons),
      presentation: this.analyzePresentation(shots, transcript, persons),
      overallScore: 0,
      suggestions: [],
      metadata: {
        fileSize: Buffer.isBuffer(videoContent) ? `${(videoContent.length / (1024 * 1024)).toFixed(2)} MB` : 'N/A',
        duration: durationStr
      },
      rawData: {
        geminiResponse: '',
        prompt: '',
        labels: labels.map(l => l.entity?.description || '').filter(Boolean),
        transcript: transcript,
        shots,
        textDetection: textDetections,
        objectDetection: objects.map(o => o.entity?.description || '').filter(Boolean),
      }
    };

    result.overallScore = this.calculateOverallScore(result);
    result.suggestions = this.generateSuggestions(result);

    console.log('\n=== Final Scores ===');
    console.log('Clarity:', result.clarity.score);
    console.log('Engagement:', result.engagement.score);
    console.log('Relevance:', result.relevance.score);
    console.log('Informative Content:', result.informativeContent.score);
    console.log('Visuals and Audio:', result.visualsAndAudio.score);
    console.log('Presentation:', result.presentation.score);
    console.log('Overall Score:', result.overallScore);
    
    console.log('\n=== Suggestions ===');
    result.suggestions.forEach(suggestion => console.log('-', suggestion));

    return result;
  }

  private getTranscription(response: protos.google.cloud.videointelligence.v1.IAnnotateVideoResponse): string {
    console.log('\n--- Speech Transcription Debug ---');
    const speechTranscriptions = response.annotationResults?.[0]?.speechTranscriptions;
    console.log('Number of speech transcriptions:', speechTranscriptions?.length || 0);
    
    if (speechTranscriptions && speechTranscriptions.length > 0) {
      console.log('Found speech transcriptions, checking alternatives...');
      const alternatives = speechTranscriptions[0].alternatives;
      console.log('Number of alternatives:', alternatives?.length || 0);
      
      if (alternatives && alternatives.length > 0) {
        const transcript = alternatives[0].transcript || '';
        const confidence = alternatives[0].confidence || 0;
        console.log('Transcript confidence:', confidence);
        
        // Log word-level information if available
        if (alternatives[0].words && alternatives[0].words.length > 0) {
          console.log('\nWord-level information:');
          alternatives[0].words.slice(0, 5).forEach(word => {
            const startTime = word.startTime?.seconds || 0;
            const endTime = word.endTime?.seconds || 0;
            console.log(`  ${word.word}: ${startTime}s - ${endTime}s (confidence: ${word.confidence})`);
          });
        }
        
        return transcript;
      } else {
        console.log('No alternatives found in the transcription');
      }
    }
    
    console.log('No transcription found');
    return '';
  }

  private getShotChanges(response: protos.google.cloud.videointelligence.v1.IAnnotateVideoResponse): any[] {
    return response.annotationResults?.[0]?.shotAnnotations || [];
  }

  private getLabels(response: protos.google.cloud.videointelligence.v1.IAnnotateVideoResponse): any[] {
    return response.annotationResults?.[0]?.shotLabelAnnotations || [];
  }

  private getTextDetections(response: protos.google.cloud.videointelligence.v1.IAnnotateVideoResponse): string[] {
    const textAnnotations = response.annotationResults?.[0]?.textAnnotations || [];
    return textAnnotations.map(text => text.text || '').filter(Boolean);
  }

  private getObjects(response: protos.google.cloud.videointelligence.v1.IAnnotateVideoResponse): any[] {
    return response.annotationResults?.[0]?.objectAnnotations || [];
  }

  private getPersons(response: protos.google.cloud.videointelligence.v1.IAnnotateVideoResponse): any[] {
    return response.annotationResults?.[0]?.personDetectionAnnotations || [];
  }

  private analyzeClarity(transcript: string, textDetections: string[]): CategoryAnalysis {
    console.log('\n--- Analyzing Clarity ---');
    const details: string[] = [];
    let score = 0;

    // Check for subject mention in first 20% of transcript
    const firstPart = transcript.slice(0, transcript.length * 0.2);
    console.log('First 20% of transcript:', firstPart);
    if (firstPart.length > 0) {
      score += 3;
      details.push('Subject introduced early in the video');
      console.log('✓ Early subject introduction detected (+3 points)');
    }

    // Check for title or product name in text detections
    console.log('Text detections found:', textDetections);
    if (textDetections.length > 0) {
      score += 2;
      details.push('Product name or title shown');
      console.log('✓ Product name/title detected (+2 points)');
    }

    console.log('Clarity final score:', score);
    return { score: Math.min(score, 5), details, goodPoints: [], improvementPoints: [] };
  }

  private analyzeEngagement(transcript: string, textDetections: string[]): CategoryAnalysis {
    console.log('\n--- Analyzing Engagement ---');
    const details: string[] = [];
    let score = 0;

    // Check for engagement markers in speech
    const engagementMarkers = [
      'you can see', 'let me show', 'as you can see', 'check this out',
      'take a look', 'notice how', 'what you\'ll find', 'interesting'
    ];
    const engagementCount = engagementMarkers.filter(marker => 
      transcript.toLowerCase().includes(marker)
    ).length;

    if (engagementCount >= 3) {
      score += 2;
      details.push('Strong viewer engagement through verbal cues');
    } else if (engagementCount > 0) {
      score += 1;
      details.push('Basic viewer engagement detected');
    }

    // Check for engagement in text detections
    const engagementInText = textDetections.filter(text => 
      engagementMarkers.some(marker => 
        text.toLowerCase().includes(marker)
      )
    ).length;

    if (engagementInText > 0) {
      score += 1;
      details.push('Engagement detected in text');
    }

    console.log('Engagement final score:', score);
    return { score: Math.min(score, 5), details, goodPoints: [], improvementPoints: [] };
  }

  private analyzeRelevance(transcript: string, labels: any[]): CategoryAnalysis {
    console.log('\n--- Analyzing Relevance ---');
    const details: string[] = [];
    let score = 0;

    // Check for relevant topics in text
    const relevantTopics = ['product', 'review', 'recommendation', 'features', 'quality', 'experience', 'opinion'];
    const relevantCount = relevantTopics.filter(topic => 
      transcript.toLowerCase().includes(topic)
    ).length;

    if (relevantCount > 0) {
      score += 2;
      details.push('Relevant topics covered');
    }

    // Check for feature/topic coverage
    const uniqueTopics = new Set(labels.map(label => label.entity?.description));
    console.log('Unique topics detected:', Array.from(uniqueTopics));
    
    if (uniqueTopics.size >= 5) {
      score += 2;
      details.push('Comprehensive feature coverage detected');
      console.log('✓ Comprehensive feature coverage (+2 points)');
    }

    console.log('Relevance final score:', score);
    return { score: Math.min(score, 5), details, goodPoints: [], improvementPoints: [] };
  }

  private analyzeInformativeContent(transcript: string, labels: any[]): CategoryAnalysis {
    console.log('\n--- Analyzing Informative Content ---');
    const details: string[] = [];
    let score = 0;

    // Check for informative content in text
    const informativeMarkers = ['product', 'review', 'recommendation', 'features', 'quality', 'experience', 'opinion'];
    const informativeCount = informativeMarkers.filter(marker => 
      transcript.toLowerCase().includes(marker)
    ).length;

    if (informativeCount > 0) {
      score += 2;
      details.push('Informative content present');
    }

    // Check for feature/topic coverage
    const uniqueTopics = new Set(labels.map(label => label.entity?.description));
    console.log('Unique topics detected:', Array.from(uniqueTopics));
    
    if (uniqueTopics.size >= 5) {
      score += 2;
      details.push('Comprehensive feature coverage detected');
      console.log('✓ Comprehensive feature coverage (+2 points)');
    }

    console.log('Informative Content final score:', score);
    return { score: Math.min(score, 5), details, goodPoints: [], improvementPoints: [] };
  }

  private analyzeVisualsAndAudio(shots: any[], transcript: string, persons: any[]): CategoryAnalysis {
    const details: string[] = [];
    let score = 0;

    // Analyze shot variety
    if (shots.length >= 10) {
      score += 2;
      details.push('Excellent visual variety with multiple camera angles');
    } else if (shots.length >= 5) {
      score += 1;
      details.push('Good visual variety');
    }

    // Analyze audio quality
    const audioQuality = this.analyzeAudioQuality(transcript);
    if (audioQuality > 0) {
      score += audioQuality;
      details.push(`Good audio quality (${audioQuality} points)`);
    }

    // Analyze presenter presence and gestures
    if (persons.length > 0) {
      const hasGestures = persons.some((person: any) => 
        person.attributes?.some((attr: any) => 
          attr.name === 'gesture' && attr.confidence > 0.7
        )
      );

      if (hasGestures) {
        score += 1;
        details.push('Effective use of gestures and body language');
      }
    }

    return { score: Math.min(score, 5), details, goodPoints: [], improvementPoints: [] };
  }

  private analyzePresentation(shots: any[], transcript: string, persons: any[]): CategoryAnalysis {
    const details: string[] = [];
    let score = 0;

    // Analyze shot variety
    if (shots.length >= 10) {
      score += 2;
      details.push('Excellent visual variety with multiple camera angles');
    } else if (shots.length >= 5) {
      score += 1;
      details.push('Good visual variety');
    }

    // Check for engagement markers in speech
    const engagementMarkers = [
      'you can see', 'let me show', 'as you can see', 'check this out',
      'take a look', 'notice how', 'what you\'ll find', 'interesting'
    ];
    const engagementCount = engagementMarkers.filter(marker => 
      transcript.toLowerCase().includes(marker)
    ).length;

    if (engagementCount >= 3) {
      score += 2;
      details.push('Strong viewer engagement through verbal cues');
    } else if (engagementCount > 0) {
      score += 1;
      details.push('Basic viewer engagement detected');
    }

    // Analyze presenter presence and gestures
    if (persons.length > 0) {
      const hasGestures = persons.some((person: any) => 
        person.attributes?.some((attr: any) => 
          attr.name === 'gesture' && attr.confidence > 0.7
        )
      );

      if (hasGestures) {
        score += 1;
        details.push('Effective use of gestures and body language');
      }
    }

    return { score: Math.min(score, 5), details, goodPoints: [], improvementPoints: [] };
  }

  private analyzeAudioQuality(transcript: string): number {
    // Check for clear audio indicators
    const wordCount = transcript.split(/\s+/).length;
    const avgWordLength = transcript.length / wordCount;

    // If we have a reasonable transcript with normal word lengths
    if (wordCount > 10 && avgWordLength > 3 && avgWordLength < 10) {
      return 2; // Good audio quality
    } else if (wordCount > 0) {
      return 1; // Basic audio quality
    }
    return 0; // Poor or no audio
  }

  private calculateOverallScore(result: VideoAnalysisResult): number {
    const weights = {
      clarity: 1.0,
      engagement: 1.5,
      relevance: 1.5,
      informativeContent: 1.5,
      visualsAndAudio: 2.0,
      presentation: 1.5,
    };

    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    const weightedSum = Object.entries(weights).reduce((sum, [key, weight]) => {
      return sum + (result[key as keyof typeof weights].score * weight);
    }, 0);

    return Math.round((weightedSum / totalWeight) * 10) / 10;
  }

  private generateSuggestions(result: VideoAnalysisResult): string[] {
    const suggestions: string[] = [];

    if (result.clarity.score < 4) {
      suggestions.push('Enhance the introduction with a clear purpose statement and product overview');
    }
    if (result.engagement.score < 4) {
      suggestions.push('Enhance viewer engagement with more visual variety and verbal cues');
    }
    if (result.relevance.score < 4) {
      suggestions.push('Provide more relevant and targeted content');
    }
    if (result.informativeContent.score < 4) {
      suggestions.push('Include more specific data points and technical details');
    }
    if (result.visualsAndAudio.score < 4) {
      suggestions.push('Improve visuals and audio quality');
    }
    if (result.presentation.score < 4) {
      suggestions.push('Enhance presentation with better visual variety and verbal cues');
    }

    return suggestions;
  }

  private calculateApiUsage(response: protos.google.cloud.videointelligence.v1.IAnnotateVideoResponse): void {
    console.log('\n=== API Usage Analysis ===');
    
    // Get video duration in minutes (rounded up)
    const lastShot = response.annotationResults?.[0]?.shotAnnotations?.slice(-1)[0];
    const durationSeconds = Number(lastShot?.endTimeOffset?.seconds || 0);
    const durationMinutes = Math.ceil(durationSeconds / 60);
    
    console.log(`Video Duration: ${durationMinutes} minute(s)`);
    
    // Calculate costs for each feature (first 1000 minutes free)
    const costs = {
      'Label Detection': { rate: 0.10, minutes: durationMinutes },
      'Shot Detection': { rate: 0.05, minutes: durationMinutes },
      'Speech Transcription': { rate: 0.048, minutes: durationMinutes },
      'Object Tracking': { rate: 0.15, minutes: durationMinutes },
      'Text Detection': { rate: 0.15, minutes: durationMinutes },
      'Logo Detection': { rate: 0.15, minutes: durationMinutes },
      'Person Detection': { rate: 0.10, minutes: durationMinutes }
    };

    console.log('\nFeature Usage:');
    let totalCost = 0;
    
    Object.entries(costs).forEach(([feature, { rate, minutes }]) => {
      const cost = minutes <= 1000 ? 0 : (minutes - 1000) * rate;
      totalCost += cost;
      console.log(`${feature}:`);
      console.log(`  Minutes: ${minutes}`);
      console.log(`  Rate: $${rate}/minute after first 1000 minutes`);
      console.log(`  Estimated Cost: $${cost.toFixed(2)}`);
    });

    console.log(`\nTotal Estimated Cost: $${totalCost.toFixed(2)}`);
    console.log('Note: First 1000 minutes per feature per month are free');
  }
} 