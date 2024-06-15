// src/App.js

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link as RouterLink } from 'react-router-dom';
import Chat from './Chat';
import { Container, Typography, Button, Paper, Box, Badge, CssBaseline, ThemeProvider, createTheme, Grid } from '@mui/material';
import axios from 'axios';

const API_URL = 'http://localhost:5001';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
    background: {
      default: '#121212',
      paper: '#1d1d1d',
    },
  },
  typography: {
    h4: {
      fontSize: '1.5rem',
      '@media (min-width:600px)': {
        fontSize: '2rem',
      },
    },
  },
});

const App = () => {
  const [jeremyUnreadCount, setJeremyUnreadCount] = useState(0);
  const [kaseyUnreadCount, setKaseyUnreadCount] = useState(0);

  const fetchUnreadCounts = async () => {
    try {
      const response = await axios.get(`${API_URL}/unread-counts`);
      setJeremyUnreadCount(response.data.Jeremy);
      setKaseyUnreadCount(response.data.Kasey);
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  };

  useEffect(() => {
    fetchUnreadCounts();
    const interval = setInterval(fetchUnreadCounts, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Router>
        <Container maxWidth="lg" style={{ height: '100vh', display: 'flex', flexDirection: 'column', paddingRight: '0px', paddingLeft: '0px'}}>
          <Paper elevation={4} style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', backgroundColor: darkTheme.palette.background.paper }}>
            <Routes>
              <Route path="/jeremy" element={<Chat user="Jeremy" />} />
              <Route path="/kasey" element={<Chat user="Kasey" />} />
              <Route path="/" element={
                <Grid container style={{ flexGrow: 1 }} alignItems="center" justifyContent="center">
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography variant="h4" align="center" gutterBottom>
                      Secret Message App
                    </Typography>
                    <Typography variant="h4" align="center" gutterBottom>
                      Select Your Name
                      </Typography>
                    <br/>
                    <Box display="flex" justifyContent="center" gap={2} mt={2} flexDirection="column" alignItems="center">
                      {jeremyUnreadCount > 0 ? (
                        <Badge badgeContent={jeremyUnreadCount} color="primary">
                          <Button component={RouterLink} to="/jeremy" variant="contained" color="primary">
                            Jeremy
                          </Button>
                        </Badge>
                      ) : (
                        <Button component={RouterLink} to="/jeremy" variant="contained" color="primary">
                          Jeremy
                        </Button>
                      )}
                      <br/>
                      {kaseyUnreadCount > 0 ? (
                        <Badge badgeContent={kaseyUnreadCount} color="secondary">
                          <Button component={RouterLink} to="/kasey" variant="contained" color="secondary">
                            Kasey
                          </Button>
                        </Badge>
                      ) : (
                        <Button component={RouterLink} to="/kasey" variant="contained" color="secondary">
                          Kasey
                        </Button>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              } />
            </Routes>
          </Paper>
        </Container>
      </Router>
    </ThemeProvider>
  );
};

export default App;
