import { createTheme } from '@mui/material';

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#0a1929',
      paper: '#132f4c',
    },
    primary: {
      main: '#2196f3',
    },
    secondary: {
      main: '#f50057',
    },
    success: {
      main: '#66bb6a',
    },
    error: {
      main: '#f44336',
    },
  },
  typography: {
    fontFamily: '"Roboto Mono", monospace',
  },
  components: {
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(81, 81, 81, 1)',
        },
      },
    },
  },
}); 