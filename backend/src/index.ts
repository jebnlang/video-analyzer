import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { VideoAnalyzer } from './services/videoAnalyzer';
import { GeminiAnalyzer } from './services/geminiAnalyzer';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const port = process.env.PORT || 3001;

// Configure multer for file uploads
const upload = multer();

// Initialize Video Analyzer
const videoAnalyzer = new VideoAnalyzer();
const geminiAnalyzer = new GeminiAnalyzer();

// Middleware for logging
app.use((req, res, next) => {
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
    console.log('Request origin:', origin);
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('Origin not allowed:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

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
    console.log('File:', req.file ? 'Present' : 'Not present');
    console.log('Body:', req.body);

    const videoContent = req.file ? req.file.buffer : req.body.url;
    console.log('Processing video content type:', req.file ? 'buffer' : 'url');

    const result = await geminiAnalyzer.analyzeVideo(videoContent);
    console.log('Analysis completed successfully');
    
    res.json(result);
  } catch (error) {
    console.error('Detailed error in Gemini analysis:', error);
    res.status(500).json({ 
      error: 'Error analyzing video with Gemini',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 