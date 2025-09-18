import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { modernTheme } from './theme';
import Layout from './components/Layout';
import OrderBook from './components/OrderBook';
import TradeHistory from './components/TradeHistory';
import PlaceOrder from './components/PlaceOrder';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  return (
    <ThemeProvider theme={modernTheme}>
      <CssBaseline />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/order-book/:ticker" element={<OrderBook />} />
            <Route path="/trade-history" element={<TradeHistory />} />
            <Route path="/place-order" element={<PlaceOrder />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App; 