// src/App.jsx
import { AuthProvider, useAuth } from './hooks/useAuth';
import LoginPage from './components/auth/LoginPage';
import Dashboard from './components/dashboard/Dashboard';
import './styles/globals.css';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';

const theme = createTheme({
  typography: {
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  palette: {
    primary: { main: '#1e2d5a' },
  },
  components: {
    // MuiCssBaseline @import moved to globals.css for v7 compatibility
    MuiButton:     { defaultProps: { disableElevation: true } },
    MuiMenuItem:   { styleOverrides: { root: { fontSize: 13, borderRadius: '6px' } } },
  },
});

function AppRoutes() {
  const { session } = useAuth();
  return session ? <Dashboard /> : <LoginPage />;
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}
