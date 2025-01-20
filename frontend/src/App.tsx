import { useState } from 'react'
import './App.css'
import AnalysisResults from './components/AnalysisResults'
import { 
  Box,
  Container,
  Paper,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Stack,
  IconButton,
  InputAdornment,
  Tooltip,
  CardContent,
  LinearProgress
} from '@mui/material'
import { 
  CloudUpload as CloudUploadIcon,
  Link as LinkIcon,
  Clear as ClearIcon,
  FileCopy as FileCopyIcon,
  Timer as TimerIcon
} from '@mui/icons-material'
import { styled } from '@mui/material/styles'

// Styled components
const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
})

const ScoreProgress = styled(LinearProgress)({
  height: 10,
  borderRadius: 5,
  '& .MuiLinearProgress-bar': {
    transition: 'transform 0.5s ease-in-out',
  },
});

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  borderRadius: theme.spacing(2),
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  backdropFilter: 'blur(10px)',
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
  },
}))

interface ResultSection {
  score: number;
  details: string[];
  goodPoints: string[];
  improvementPoints: string[];
}

interface VideoAnalysisResult {
  clarity: ResultSection;
  engagement: ResultSection;
  relevance: ResultSection;
  informativeContent: ResultSection;
  visualsAndAudio: ResultSection;
  presentation: ResultSection;
  overallScore: number;
  suggestions: string[];
  metadata: {
    fileSize: string;
    duration: string;
  };
  rawData?: {
    geminiResponse: string;
    labels: string[];
    transcript: string;
    shots: any[];
    textDetection: any[];
    objectDetection: any[];
  };
}

// Add size constants
const MAX_FILE_SIZE = 19.9 * 1024 * 1024; // 19.9MB in bytes

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<VideoAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Check file size
      if (selectedFile.size > MAX_FILE_SIZE) {
        setError(`File size exceeds 19.9MB limit. Your file is ${formatFileSize(selectedFile.size)}`);
        return;
      }

      setFile(selectedFile);
      setUrl('');
      setError(null);
    }
  }

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value)
    setFile(null)
    setError(null)
  }

  const clearFile = () => {
    setFile(null)
  }

  const clearUrl = () => {
    setUrl('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const apiUrl = `${import.meta.env.VITE_API_URL}/api/analyze/gemini`.replace(/\/\//g, '/').replace('https:/', 'https://');
      console.log('Sending request to:', apiUrl); // Debug log

      const formData = new FormData()
      if (file) {
        formData.append('video', file)
        console.log('Sending file:', file.name, file.type); // Debug log
      } else if (url) {
        formData.append('url', url)
        console.log('Sending URL:', url); // Debug log
      } else {
        throw new Error('Please provide a video file or URL')
      }

      console.log('Request headers:', file ? 'multipart/form-data' : 'application/json'); // Debug log

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: file ? formData : JSON.stringify({ url }),
        headers: file ? undefined : {
          'Content-Type': 'application/json',
        },
      })

      console.log('Response status:', response.status); // Debug log
      console.log('Response headers:', Object.fromEntries(response.headers.entries())); // Debug log

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText); // Debug log
        throw new Error(`Failed to analyze video: ${response.status} ${errorText}`);
      }

      const data = await response.json()
      setResults(data)
    } catch (err) {
      console.error('Full error:', err); // Debug log
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Stack spacing={4}>
        <StyledPaper elevation={3}>
          <Stack spacing={3}>
            <Typography variant="h4" component="h1" align="center" gutterBottom>
              Video Review Analyzer
            </Typography>
            
            <form onSubmit={handleSubmit}>
              <Stack spacing={3}>
                {/* File Upload Section */}
                <Box>
                  <Button
                    component="label"
                    variant="outlined"
                    startIcon={<CloudUploadIcon />}
                    sx={{ 
                      width: '100%',
                      height: '100px',
                      border: '2px dashed',
                      borderRadius: 2,
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        backgroundColor: 'rgba(25, 118, 210, 0.04)',
                        border: '2px dashed #1976d2',
                      }
                    }}
                  >
                    {file ? (
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="body1" color="primary">
                          {file.name}
                        </Typography>
                        <IconButton size="small" onClick={clearFile}>
                          <ClearIcon />
                        </IconButton>
                      </Stack>
                    ) : (
                      <Typography variant="body1" color="text.secondary">
                        Drop your video file here or click to browse
                      </Typography>
                    )}
                    <VisuallyHiddenInput
                      type="file"
                      accept="video/*"
                      onChange={handleFileChange}
                    />
                  </Button>
                </Box>

                {/* URL Input Section */}
                <Typography variant="body1" align="center" color="text.secondary">
                  - OR -
                </Typography>

                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Enter video URL here"
                  value={url}
                  onChange={handleUrlChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LinkIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: url && (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={clearUrl}>
                          <ClearIcon />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading || (!file && !url)}
                  sx={{
                    py: 1.5,
                    backgroundColor: 'primary.main',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                    '&:disabled': {
                      backgroundColor: 'action.disabledBackground',
                    },
                  }}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'Analyze Video'
                  )}
                </Button>
              </Stack>
            </form>
          </Stack>
        </StyledPaper>

        {/* Results Display */}
        {results && (
          <Box sx={{ mt: 4 }}>
            <StyledPaper elevation={3}>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h5" gutterBottom>
                    Overall Score: {results.overallScore.toFixed(1)}/10
                  </Typography>
                  <ScoreProgress
                    variant="determinate"
                    value={results.overallScore * 10}
                    color={results.overallScore >= 7 ? 'success' : results.overallScore >= 5 ? 'warning' : 'error'}
                  />
                  {/* File Information */}
                  {results.metadata && (
                    <Stack direction="row" spacing={2} justifyContent="center" mt={2}>
                      <Tooltip title="File Size" arrow>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <FileCopyIcon color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {results.metadata.fileSize}
                          </Typography>
                        </Stack>
                      </Tooltip>
                      <Tooltip title="Duration" arrow>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <TimerIcon color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {results.metadata.duration}
                          </Typography>
                        </Stack>
                      </Tooltip>
                    </Stack>
                  )}
                </Stack>
              </CardContent>
            </StyledPaper>
            <AnalysisResults results={results} />
          </Box>
        )}

        {/* Error Display */}
        {error && (
          <Alert severity="error" variant="filled">
            {error}
          </Alert>
        )}
      </Stack>
    </Container>
  )
}

export default App
