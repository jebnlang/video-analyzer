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
  InputAdornment
} from '@mui/material'
import { 
  CloudUpload as CloudUploadIcon,
  Link as LinkIcon,
  Clear as ClearIcon 
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

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<VideoAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setUrl('')
      setError(null)
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
      const formData = new FormData()
      if (file) {
        formData.append('video', file)
      } else if (url) {
        formData.append('url', url)
      } else {
        throw new Error('Please provide a video file or URL')
      }

      const response = await fetch('http://localhost:3001/api/analyze/gemini', {
        method: 'POST',
        body: file ? formData : JSON.stringify({ url }),
        headers: file ? undefined : {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to analyze video')
      }

      const data = await response.json()
      setResults(data)
    } catch (err) {
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

        {/* Error Display */}
        {error && (
          <Alert severity="error" variant="filled">
            {error}
          </Alert>
        )}

        {/* Results Display */}
        {results && (
          <Box sx={{ mt: 4 }}>
            <AnalysisResults results={results} />
          </Box>
        )}
      </Stack>
    </Container>
  )
}

export default App
