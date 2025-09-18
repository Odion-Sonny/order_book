import React, { useState, useEffect } from 'react';
import { 
  Grid, 
  Paper, 
  Typography, 
  Box, 
  CircularProgress, 
  Chip,
  Card,
  CardContent,
  useTheme,
  alpha,
  IconButton
} from '@mui/material';
import { 
  TrendingUp, 
  TrendingDown, 
  ShowChart, 
  Speed,
  Visibility,
  TouchApp
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { Sphere, Box as ThreeBox, Text } from '@react-three/drei';
import * as THREE from 'three';

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

// 3D Card Component
interface Animated3DCardProps {
  asset: AssetData;
  index: number;
}

const Animated3DCard: React.FC<Animated3DCardProps> = ({ asset, index }) => {
  const theme = useTheme();
  const displayPrice = asset.current_price || 
    (asset.quote?.bid_price && asset.quote?.ask_price 
      ? (asset.quote.bid_price + asset.quote.ask_price) / 2 
      : 0);
  
  const priceChange = asset.price_change || 0;
  const priceChangePercent = asset.price_change_percent || 0;
  const isPositive = priceChange >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 60, rotateX: -15 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ 
        duration: 0.8, 
        delay: index * 0.1,
        type: "spring",
        stiffness: 100
      }}
      whileHover={{ 
        y: -12, 
        rotateX: 5,
        rotateY: 5,
        scale: 1.02,
        transition: { duration: 0.3 }
      }}
      style={{
        perspective: '1000px',
        transformStyle: 'preserve-3d',
      }}
    >
      <Card
        component={Link}
        to={`/order-book/${asset.ticker}`}
        sx={{
          height: '280px',
          background: `linear-gradient(135deg, 
            ${alpha(theme.palette.background.paper, 0.9)} 0%, 
            ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          borderRadius: '24px',
          overflow: 'hidden',
          position: 'relative',
          textDecoration: 'none',
          color: 'inherit',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            border: `1px solid ${alpha(theme.palette.primary.main, 0.4)}`,
            boxShadow: `0 20px 60px ${alpha(theme.palette.primary.main, 0.2)}`,
          },
          '&:before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(45deg, 
              ${alpha(theme.palette.primary.main, 0.1)} 0%, 
              transparent 50%, 
              ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
            opacity: 0,
            transition: 'opacity 0.3s ease',
          },
          '&:hover:before': {
            opacity: 1,
          },
        }}
      >
        <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
          {/* Header with 3D Icon */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                {asset.ticker}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                {asset.name}
              </Typography>
            </div>
            <motion.div
              whileHover={{ rotate: 180, scale: 1.2 }}
              transition={{ duration: 0.5 }}
            >
              <ShowChart sx={{ 
                fontSize: 28, 
                color: isPositive ? theme.palette.success.main : theme.palette.error.main,
                filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))'
              }} />
            </motion.div>
          </div>

          {/* Price Display with 3D Effect */}
          {displayPrice > 0 && (
            <div style={{ marginBottom: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 800,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                    mb: 1
                  }}
                >
                  ${displayPrice.toFixed(2)}
                </Typography>
              </motion.div>
              
              {(priceChange !== 0 || priceChangePercent !== 0) && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isPositive ? <TrendingUp /> : <TrendingDown />}
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        color: isPositive ? theme.palette.success.main : theme.palette.error.main,
                        fontWeight: 600
                      }}
                    >
                      {isPositive ? '+' : ''}${priceChange.toFixed(2)}
                    </Typography>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        color: isPositive ? theme.palette.success.main : theme.palette.error.main,
                        fontWeight: 600
                      }}
                    >
                      ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                    </Typography>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Market Data */}
          <div style={{ marginTop: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <Typography variant="caption" color="text.secondary">
                Bid: <span style={{ color: theme.palette.success.main, fontWeight: 600 }}>
                  ${asset.quote?.bid_price?.toFixed(2) || '--'}
                </span>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Ask: <span style={{ color: theme.palette.error.main, fontWeight: 600 }}>
                  ${asset.quote?.ask_price?.toFixed(2) || '--'}
                </span>
              </Typography>
            </div>
            {asset.market_snapshot?.daily_bar?.volume && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                Volume: {asset.market_snapshot.daily_bar.volume.toLocaleString()}
              </Typography>
            )}
          </div>

          {/* Hover overlay */}
          <motion.div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: alpha(theme.palette.primary.main, 0.05),
              borderRadius: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0,
            }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              whileHover={{ scale: 1.2 }}
              transition={{ duration: 0.2 }}
            >
              <TouchApp sx={{ fontSize: 40, color: theme.palette.primary.main }} />
            </motion.div>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const Dashboard: React.FC = () => {
  const theme = useTheme();
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
      <div 
        style={{
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '60vh',
          position: 'relative'
        }}
      >
        <motion.div
          initial={{ scale: 0, rotate: 0 }}
          animate={{ scale: 1, rotate: 360 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <CircularProgress 
              size={80} 
              thickness={4}
              sx={{ 
                color: theme.palette.primary.main,
                animationDuration: '2s',
              }} 
            />
            <div
              style={{
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Speed sx={{ fontSize: 32, color: theme.palette.primary.main }} />
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Typography 
            variant="h6" 
            color="text.secondary" 
            sx={{ mt: 3, fontWeight: 500 }}
          >
            Loading quantum trading data...
          </Typography>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '48px',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          <div>
            <Typography 
              variant="h2" 
              sx={{ 
                fontWeight: 800,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                mb: 1
              }}
            >
              Quantum Markets
            </Typography>
            <Typography 
              variant="h6" 
              color="text.secondary" 
              sx={{ fontWeight: 400, opacity: 0.8 }}
            >
              Advanced trading with real-time market data
            </Typography>
          </div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <motion.div
                animate={{ 
                  scale: isRealTime ? [1, 1.1, 1] : 1,
                  opacity: isRealTime ? [1, 0.7, 1] : 0.7
                }}
                transition={{ 
                  duration: 2, 
                  repeat: isRealTime ? Infinity : 0,
                  ease: "easeInOut"
                }}
              >
                <Chip 
                  label={isRealTime ? 'LIVE' : 'OFFLINE'} 
                  color={isRealTime ? 'success' : 'default'}
                  size="medium"
                  variant="filled"
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    px: 2,
                    py: 1,
                    background: isRealTime 
                      ? `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.light} 100%)`
                      : 'default',
                    boxShadow: isRealTime 
                      ? `0 4px 12px ${alpha(theme.palette.success.main, 0.3)}`
                      : 'none'
                  }}
                />
              </motion.div>
              {lastUpdate && (
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Updated: {lastUpdate.toLocaleTimeString()}
                </Typography>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div style={{ marginBottom: '32px' }}>
              <Paper
                sx={{
                  p: 3,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)} 0%, ${alpha(theme.palette.error.main, 0.05)} 100%)`,
                  border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                  borderRadius: '16px',
                }}
              >
                <Typography color="error" variant="body1" sx={{ fontWeight: 500 }}>
                  {error}
                </Typography>
              </Paper>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assets Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Grid container spacing={4}>
          {assets.map((asset, index) => (
            <Grid item xs={12} sm={6} lg={4} key={asset.ticker}>
              <Animated3DCard asset={asset} index={index} />
            </Grid>
          ))}
        </Grid>
      </motion.div>

      {/* Empty State */}
      {assets.length === 0 && !loading && !error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div 
            style={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center',
              minHeight: '40vh',
              textAlign: 'center'
            }}
          >
            <motion.div
              animate={{ 
                y: [0, -10, 0],
                rotateY: [0, 180, 360]
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            >
              <ShowChart sx={{ fontSize: 80, color: theme.palette.primary.main, mb: 2 }} />
            </motion.div>
            <Typography variant="h5" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
              No Markets Available
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ opacity: 0.7 }}>
              Market data will appear here once available
            </Typography>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Dashboard; 