import { createTheme, alpha, Shadows } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface TypeBackground {
    neutral: string;
  }

  interface Palette {
    neutral: Palette['primary'];
  }

  interface PaletteOptions {
    neutral?: PaletteOptions['primary'];
  }

  interface PaletteColor {
    lighter: string;
    darker: string;
  }

  interface SimplePaletteColorOptions {
    lighter?: string;
    darker?: string;
  }
}

const theme = createTheme({
  palette: {
    primary: {
      main: '#2065D1',
      light: '#5B8DEE',
      dark: '#103996',
      lighter: alpha('#2065D1', 0.1),
      darker: '#061B64',
    },
    secondary: {
      main: '#3366FF',
      light: '#84A9FF',
      dark: '#1939B7',
      lighter: alpha('#3366FF', 0.1),
      darker: '#091A7A',
    },
    success: {
      main: '#36B37E',
      light: '#86E8AB',
      dark: '#1B806A',
      lighter: alpha('#36B37E', 0.1),
      darker: '#0A5554',
    },
    warning: {
      main: '#FFC107',
      light: '#FFE16A',
      dark: '#B78103',
      lighter: alpha('#FFC107', 0.1),
      darker: '#7A4F01',
    },
    error: {
      main: '#FF4842',
      light: '#FFA48D',
      dark: '#B72136',
      lighter: alpha('#FF4842', 0.1),
      darker: '#7A0C2E',
    },
    neutral: {
      main: '#637381',
      light: '#919EAB',
      dark: '#454F5B',
      lighter: alpha('#637381', 0.1),
      darker: '#212B36',
    },
    background: {
      default: '#F9FAFB',
      paper: '#FFFFFF',
      neutral: alpha('#919EAB', 0.08),
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontWeight: 700,
      lineHeight: 1.3,
    },
    h3: {
      fontWeight: 700,
      lineHeight: 1.4,
    },
    h4: {
      fontWeight: 700,
      lineHeight: 1.4,
    },
    h5: {
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontWeight: 600,
      lineHeight: 1.6,
    },
    subtitle1: {
      fontWeight: 600,
      lineHeight: 1.5,
    },
    subtitle2: {
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      lineHeight: 1.5,
    },
    body2: {
      lineHeight: 1.6,
    },
    button: {
      fontWeight: 600,
      lineHeight: 24 / 14,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    '0px 1px 2px rgba(145, 158, 171, 0.16)',
    '0px 2px 4px rgba(145, 158, 171, 0.16)',
    '0px 4px 8px rgba(145, 158, 171, 0.16)',
    '0px 8px 16px rgba(145, 158, 171, 0.16)',
    '0px 12px 24px -4px rgba(145, 158, 171, 0.16)',
    '0px 16px 32px -4px rgba(145, 158, 171, 0.16)',
    '0px 20px 40px -4px rgba(145, 158, 171, 0.16)',
    '0px 24px 48px rgba(145, 158, 171, 0.16)',
    ...Array(16).fill('none'),
  ] as unknown as Shadows,
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0px 8px 16px rgba(145, 158, 171, 0.16)',
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

export default theme; 