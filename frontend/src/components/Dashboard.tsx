import React, { useState, useEffect } from 'react';
import { 
  Grid, 
  Paper, 
  Typography, 
  Box, 
  CircularProgress, 
  Chip
} from '@mui/material';
import { Link } from 'react-router-dom';

interface AssetData {
  id: number;
  name: string;
  ticker: string;
  description: string;
  quote: {
    bid_price: number;
    ask_price: number;
    timestamp: string;
  };
  chart_data: Array<{
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  price_change: number;
  price_change_percent: number;
  current_price: number;
  market_snapshot: any;
}

const Dashboard: React.FC = () => {
  const [assets, setAssets] = useState<AssetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealTime, setIsRealTime] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchMarketData = async () => {
    try {
      console.log('Fetching market data at:', new Date().toLocaleTimeString());
      const response = await fetch('http://localhost:8001/api/assets/market_data/');
      
      if (response.ok) {
        const data = await response.json();
        setAssets(data);
        setError(null);
        setLastUpdate(new Date());
        setIsRealTime(true);
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to fetch market data: ${response.status} ${errorText}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to load market data: ${errorMessage}`);
      console.error('Error fetching market data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchMarketData();
    
    // Setup interval for real-time updates every 5 seconds
    const interval = setInterval(() => {
      fetchMarketData();
    }, 5000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);


  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">
          Available Markets
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Chip 
            label={isRealTime ? 'LIVE' : 'OFFLINE'} 
            color={isRealTime ? 'success' : 'default'}
            size="small"
            variant={isRealTime ? 'filled' : 'outlined'}
          />
          {lastUpdate && (
            <Typography variant="caption" color="text.secondary">
              Last update: {lastUpdate.toLocaleTimeString()}
            </Typography>
          )}
        </Box>
      </Box>
      {error && (
        <Box mb={2}>
          <Chip label={error} color="error" />
        </Box>
      )}
      <Grid container spacing={3}>
        {assets.map((asset) => {
          const displayPrice = asset.current_price || 
            (asset.quote?.bid_price && asset.quote?.ask_price 
              ? (asset.quote.bid_price + asset.quote.ask_price) / 2 
              : 0);
          
          const priceChange = asset.price_change || 0;
          const priceChangePercent = asset.price_change_percent || 0;
          const isPositive = priceChange >= 0;

          return (
            <Grid item xs={12} sm={6} md={4} key={asset.ticker}>
              <Paper
                component={Link}
                to={`/order-book/${asset.ticker}`}
                sx={{
                  p: 3,
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'all 0.2s',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                <Box mb={2}>
                  <Typography variant="h6" fontWeight="bold">
                    {asset.ticker}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {asset.name}
                  </Typography>
                </Box>

                {displayPrice > 0 && (
                  <Box mb={2}>
                    <Typography variant="h5" color="primary.main" fontWeight="bold">
                      ${displayPrice.toFixed(2)}
                    </Typography>
                    {(priceChange !== 0 || priceChangePercent !== 0) && (
                      <Box display="flex" alignItems="center" gap={1} mt={1}>
                        <Typography 
                          variant="body2" 
                          color={isPositive ? 'success.main' : 'error.main'}
                          fontWeight="bold"
                        >
                          {isPositive ? '+' : ''}${priceChange.toFixed(2)}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          color={isPositive ? 'success.main' : 'error.main'}
                          fontWeight="bold"
                        >
                          ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Bid: ${asset.quote?.bid_price?.toFixed(2) || '--'} | 
                    Ask: ${asset.quote?.ask_price?.toFixed(2) || '--'}
                  </Typography>
                  {asset.market_snapshot?.daily_bar?.volume && (
                    <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                      Volume: {asset.market_snapshot.daily_bar.volume.toLocaleString()}
                    </Typography>
                  )}
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default Dashboard; 