import { Component, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from './store';
import MainLayout from './components/Layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import { Box, Typography, Button } from '@mui/material';

// ── Error boundary to catch and display runtime crashes ──────────────────────
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(e: Error) { return { error: e }; }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <Box sx={{ p: 4 }}>
          <Typography variant="h5" color="error" gutterBottom>
            Something went wrong
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: '#fee', p: 2, borderRadius: 1, mb: 2 }}>
            {err.message}
          </Typography>
          <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', whiteSpace: 'pre-wrap', color: 'text.secondary', mb: 2 }}>
            {err.stack}
          </Typography>
          <Button variant="outlined" onClick={() => { this.setState({ error: null }); window.location.reload(); }}>
            Reload
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}

const App = () => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  return (
    <Router>
      <ErrorBoundary>
        <Routes>
          <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
          <Route path="/" element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" />}>
            <Route index element={<Dashboard />} />
          </Route>
        </Routes>
      </ErrorBoundary>
    </Router>
  );
};

export default App;
