import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#4f46e5', // Modern Indigo-600
      light: '#818cf8',
      dark: '#3730a3',
    },
    secondary: {
      main: '#06b6d4', // Modern Cyan-500
      light: '#22d3ee',
      dark: '#0891b2',
    },
    background: {
      default: '#f8fafc', // Beautiful slate-50 background
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a', // Slate-900 for modern readability
      secondary: '#475569', // Slate-600
    },
    divider: '#cbd5e1', // Faint slate-300
  },
  typography: {
    fontFamily: '"Inter", "Outfit", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 800,
      letterSpacing: '-0.04em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 800,
      letterSpacing: '-0.03em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    body1: {
      fontSize: '0.9375rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    caption: {
      fontSize: '0.75rem',
      letterSpacing: '0.02em',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 10,
          fontWeight: 600,
          padding: '6px 16px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.15)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.05), 0px 10px 40px rgba(0, 0, 0, 0.03)',
          border: '1px solid #e2e8f0',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #e2e8f0',
          padding: '10px 16px',
        },
        head: {
          fontWeight: 700,
          fontSize: '0.8125rem',
          letterSpacing: '0.04em',
        },
      },
    },
  },
});

export default theme;
