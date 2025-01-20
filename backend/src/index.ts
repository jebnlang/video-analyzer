import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { VideoAnalyzer } from './services/videoAnalyzer';
import { GeminiAnalyzer } from './services/geminiAnalyzer';
import { put, getToken } from '@vercel/blob';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB in bytes
    files: 1
  }
});

// Initialize Video Analyzer
const videoAnalyzer = new VideoAnalyzer();
const geminiAnalyzer = new GeminiAnalyzer();

// Middleware for logging
app.use((req, res, next) => {
  // Set higher limit for express json body parser
  app.use(express.json({ limit: '20mb' }));
  // Set higher limit for url-encoded bodies
  app.use(express.urlencoded({ limit: '20mb', extended: true }));
  
  console.log(`${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  next();
});

// CORS configuration
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    const allowedOrigins = [
      'http://localhost:5173',
      'https://video-analyzer-frontend.vercel.app'
    ];
    
    console.log('Incoming request origin:', origin);
    console.log('Allowed origins:', allowedOrigins);
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('No origin provided, allowing request');
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      console.log('Origin allowed:', origin);
      return callback(null, true);
    }
    
    console.log('Origin not allowed:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Origin'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Add OPTIONS handler for preflight requests
app.options('*', cors(corsOptions));

// Apply CORS to all routes
app.use(cors(corsOptions));

// Add error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Error:', err);
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File Too Large',
      message: 'The uploaded file exceeds the 20MB limit',
      details: err.message
    });
  }
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS Error',
      message: 'Origin not allowed',
      origin: req.headers.origin
    });
  }
  
  // Handle other errors
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'Something went wrong',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Routes
app.post('/api/analyze', upload.single('video'), async (req, res) => {
  try {
    const videoContent = req.file ? req.file.buffer : req.body.url;
    const result = await videoAnalyzer.analyzeVideo(videoContent);
    res.json(result);
  } catch (error) {
    console.error('Error analyzing video:', error);
    res.status(500).json({ error: 'Error analyzing video' });
  }
});

// New route using Gemini API
app.post('/api/analyze/gemini', upload.single('video'), async (req, res) => {
  try {
    console.log('Received request for Gemini analysis');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);

    let videoContent;
    
    if (req.file) {
      if (req.file.size > 20 * 1024 * 1024) {
        return res.status(413).json({
          error: 'File Too Large',
          message: 'The uploaded file exceeds the 20MB limit'
        });
      }
      videoContent = req.file.buffer;
    } else if (req.body.url) {
      // Handle both direct URLs and Blob URLs
      const response = await fetch(req.body.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch video from URL: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      videoContent = Buffer.from(arrayBuffer);
    } else {
      return res.status(400).json({ error: 'No video content provided' });
    }

    console.log('Processing video content');
    const result = await geminiAnalyzer.analyzeVideo(videoContent);
    console.log('Analysis completed successfully');
    
    // If metadata was provided, include it in the response
    if (req.body.metadata) {
      result.metadata = req.body.metadata;
    }
    
    res.json(result);
  } catch (error) {
    console.error('Detailed error in Gemini analysis:', error);
    res.status(500).json({ 
      error: 'Error analyzing video with Gemini',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update Blob upload endpoint for token generation
app.post('/api/upload', async (req, res) => {
  try {
    console.log('Received upload request');
    console.log('Query parameters:', req.query);
    console.log('Headers:', req.headers);
    console.log('Environment variables:', {
      BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN ? 'Present' : 'Missing',
      BLOB_READ_WRITE_TOKEN_GENERATED_AT: process.env.BLOB_READ_WRITE_TOKEN_GENERATED_AT ? 'Present' : 'Missing'
    });

    const { filename, contentType } = req.query;
    
    if (!filename || !contentType) {
      console.log('Missing parameters:', { filename, contentType });
      return res.status(400).json({ 
        error: 'Missing required parameters',
        message: 'filename and contentType are required query parameters',
        received: { filename, contentType }
      });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('BLOB_READ_WRITE_TOKEN is not set');
      return res.status(500).json({
        error: 'Configuration Error',
        message: 'Blob storage is not properly configured'
      });
    }

    console.log('Attempting to generate token for:', { filename, contentType });
    const token = await getToken({
      pathname: filename as string,
      contentType: contentType as string,
    });

    console.log('Token generated successfully');
    res.json(token);
  } catch (error) {
    console.error('Detailed error in token generation:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({ 
      error: 'Failed to generate upload token',
      details: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.constructor.name : typeof error
    });
  }
});

// Export the Express app for Vercel
export default app; 