import React from 'react';
import { Box, AppBar, Toolbar, Typography, Container } from '@mui/material';
import { Link } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component={Link} to="/" sx={{ 
            textDecoration: 'none', 
            color: 'inherit',
            flexGrow: 1 
          }}>
            Order Book
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Typography component={Link} to="/place-order" sx={{ 
              textDecoration: 'none', 
              color: 'inherit' 
            }}>
              Place Order
            </Typography>
            <Typography component={Link} to="/trade-history" sx={{ 
              textDecoration: 'none', 
              color: 'inherit' 
            }}>
              Trade History
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>
      <Container component="main" sx={{ flexGrow: 1, py: 3 }}>
        {children}
      </Container>
    </Box>
  );
};

export default Layout; 