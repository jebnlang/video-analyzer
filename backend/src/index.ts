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

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173', // Local development
    'https://video-analyzer-sooty.vercel.app', // Production frontend
  ],
  methods: ['GET', 'POST'],
  credentials: true
}));
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
    const videoContent = req.file ? req.file.buffer : req.body.url;
    const result = await geminiAnalyzer.analyzeVideo(videoContent);
    res.json(result);
  } catch (error) {
    console.error('Error analyzing video with Gemini:', error);
    res.status(500).json({ error: 'Error analyzing video with Gemini' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 