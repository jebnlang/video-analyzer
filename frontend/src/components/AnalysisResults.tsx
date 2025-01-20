import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  styled
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import BuildIcon from '@mui/icons-material/Build';

const ScoreProgress = styled(LinearProgress)({
  height: 10,
  borderRadius: 5,
});

const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
}));

interface CategoryScore {
  score: number;
  details: string[];
  goodPoints: string[];
  improvementPoints: string[];
}

interface VideoAnalysisResult {
  clarity: CategoryScore;
  engagement: CategoryScore;
  relevance: CategoryScore;
  informativeContent: CategoryScore;
  visualsAndAudio: CategoryScore;
  presentation: CategoryScore;
  overallScore: number;
  suggestions: string[];
}

interface AnalysisResultsProps {
  results: VideoAnalysisResult;
}

const formatCategoryName = (name: string): string => {
  switch (name) {
    case 'informativeContent':
      return 'Informative Content';
    case 'visualsAndAudio':
      return 'Visuals & Audio';
    default:
      return name.charAt(0).toUpperCase() + name.slice(1);
  }
};

const AnalysisResults: React.FC<AnalysisResultsProps> = ({ results }) => {
  const categories = [
    'clarity',
    'engagement',
    'relevance',
    'informativeContent',
    'visualsAndAudio',
    'presentation'
  ];

  return (
    <Box sx={{ mt: 4 }}>
      <StyledCard>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Overall Score: {results.overallScore.toFixed(1)}/10
          </Typography>
          <ScoreProgress
            variant="determinate"
            value={results.overallScore * 10}
            color={results.overallScore >= 7 ? 'success' : results.overallScore >= 5 ? 'warning' : 'error'}
          />
        </CardContent>
      </StyledCard>

      {categories.map((category) => {
        const categoryData = results[category as keyof VideoAnalysisResult] as CategoryScore;
        const score = categoryData.score;

        return (
          <Accordion key={category} defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Grid container alignItems="center" spacing={2}>
                <Grid item xs={8}>
                  <Typography variant="h6">
                    {formatCategoryName(category)}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="h6">
                      {score.toFixed(1)}/10
                    </Typography>
                    <ScoreProgress
                      variant="determinate"
                      value={score * 10}
                      color={score >= 7 ? 'success' : score >= 5 ? 'warning' : 'error'}
                      sx={{ width: '100px' }}
                    />
                  </Stack>
                </Grid>
              </Grid>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                {categoryData.goodPoints.length > 0 && (
                  <Box>
                    <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                      <ThumbUpIcon color="success" />
                      <Typography variant="subtitle1" color="success.main">
                        Good Points
                      </Typography>
                    </Stack>
                    <Stack spacing={1}>
                      {categoryData.goodPoints.map((point, index) => (
                        <Chip
                          key={`good-${index}`}
                          label={point}
                          color="success"
                          variant="outlined"
                          sx={{ height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', py: 1 } }}
                        />
                      ))}
                    </Stack>
                  </Box>
                )}

                {categoryData.improvementPoints.length > 0 && (
                  <Box>
                    <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                      <BuildIcon color="warning" />
                      <Typography variant="subtitle1" color="warning.main">
                        Areas for Improvement
                      </Typography>
                    </Stack>
                    <Stack spacing={1}>
                      {categoryData.improvementPoints.map((point, index) => (
                        <Chip
                          key={`improvement-${index}`}
                          label={point}
                          color="warning"
                          variant="outlined"
                          sx={{ height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', py: 1 } }}
                        />
                      ))}
                    </Stack>
                  </Box>
                )}
              </Stack>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
};

export default AnalysisResults; 