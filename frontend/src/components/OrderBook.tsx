import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Grid,
  CircularProgress,
  Chip,
  Card,
  CardContent,
  useTheme,
  alpha,
  IconButton,
} from '@mui/material';
import { 
  TrendingUp, 
  TrendingDown, 
  Timeline, 
  Speed,
  ArrowUpward,
  ArrowDownward,
  Refresh
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Box as ThreeBox, Sphere } from '@react-three/drei';
import * as THREE from 'three';

interface OrderLevel {
  price: number;
  size: number;
  total: number;
}

interface OrderBookData {
  bids: OrderLevel[];
  asks: OrderLevel[];
  last_price: number;
  ticker: string;
}

// 3D Order Visualization Component
const OrderVisualizer3D = ({ bids, asks }: { bids: OrderLevel[], asks: OrderLevel[] }) => {
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <group ref={meshRef}>
      {/* Bid visualization */}
      {bids.slice(0, 10).map((bid, index) => (
        <ThreeBox
          key={`bid-${index}`}
          position={[-2, index * 0.3 - 1.5, 0]}
          args={[0.2, bid.size * 0.01, 0.2]}
        >
          <meshStandardMaterial color="#00e676" transparent opacity={0.7} />
        </ThreeBox>
      ))}
      
      {/* Ask visualization */}
      {asks.slice(0, 10).map((ask, index) => (
        <ThreeBox
          key={`ask-${index}`}
          position={[2, index * 0.3 - 1.5, 0]}
          args={[0.2, ask.size * 0.01, 0.2]}
        >
          <meshStandardMaterial color="#ff1744" transparent opacity={0.7} />
        </ThreeBox>
      ))}
      
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
    </group>
  );
};

const GradientTableRow = styled(TableRow)<{ depth: number; side: 'bid' | 'ask'; isNew?: boolean }>(
  ({ theme, depth, side, isNew }) => ({
    position: 'relative',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    '&::after': {
      content: '""',
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      width: `${depth}%`,
      background: side === 'bid'
        ? `linear-gradient(90deg, transparent 0%, ${alpha(theme.palette.success.main, 0.2)} 100%)`
        : `linear-gradient(90deg, transparent 0%, ${alpha(theme.palette.error.main, 0.2)} 100%)`,
      zIndex: 0,
      transition: 'width 0.5s ease-out',
    },
    '&::before': isNew ? {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: side === 'bid' 
        ? alpha(theme.palette.success.main, 0.3)
        : alpha(theme.palette.error.main, 0.3),
      zIndex: 0,
      animation: 'flash 1s ease-out',
    } : {},
    '& > td': {
      position: 'relative',
      zIndex: 1,
      borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    },
    '&:hover': {
      backgroundColor: alpha(
        side === 'bid' ? theme.palette.success.main : theme.palette.error.main, 
        0.05
      ),
      transform: 'translateX(4px)',
    },
    '@keyframes flash': {
      '0%': { opacity: 0.8 },
      '100%': { opacity: 0 },
    },
  })
);


// Animated Metric Card Component
interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  color: 'primary' | 'success' | 'error' | 'warning';
  icon: React.ReactNode;
  trend?: number;
  index: number;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  color, 
  icon, 
  trend,
  index 
}) => {
  const theme = useTheme();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.5, 
        delay: index * 0.1,
        type: "spring",
        stiffness: 100
      }}
      whileHover={{ y: -4, scale: 1.02 }}
    >
      <Card
        sx={{
          background: `linear-gradient(135deg, 
            ${alpha(theme.palette.background.paper, 0.9)} 0%, 
            ${alpha(theme.palette[color].main, 0.05)} 100%)`,
          border: `1px solid ${alpha(theme.palette[color].main, 0.2)}`,
          borderRadius: '16px',
          overflow: 'hidden',
          position: 'relative',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            border: `1px solid ${alpha(theme.palette[color].main, 0.4)}`,
            boxShadow: `0 12px 32px ${alpha(theme.palette[color].main, 0.2)}`,
          },
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              {title}
            </Typography>
            <motion.div
              whileHover={{ rotate: 360, scale: 1.2 }}
              transition={{ duration: 0.5 }}
            >
              <div style={{ 
                color: theme.palette[color].main,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: alpha(theme.palette[color].main, 0.1),
              }}>
                {icon}
              </div>
            </motion.div>
          </div>
          
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.1 + 0.2 }}
          >
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 700,
                color: theme.palette[color].main,
                mb: subtitle ? 1 : 0,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              {value}
              {trend !== undefined && (
                <motion.div
                  animate={{ 
                    y: trend > 0 ? [-2, 2, -2] : [2, -2, 2],
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  {trend > 0 ? (
                    <ArrowUpward sx={{ fontSize: '1rem', color: theme.palette.success.main }} />
                  ) : trend < 0 ? (
                    <ArrowDownward sx={{ fontSize: '1rem', color: theme.palette.error.main }} />
                  ) : null}
                </motion.div>
              )}
            </Typography>
          </motion.div>
          
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
              {subtitle}
            </Typography>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

const OrderBook: React.FC = () => {
  const theme = useTheme();
  const { ticker } = useParams<{ ticker: string }>();
  const [orderBookData, setOrderBookData] = useState<OrderBookData | null>(null);
  const [prevOrderBookData, setPrevOrderBookData] = useState<OrderBookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchOrderBook = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    }
    
    try {
      console.log(`Fetching order book for ${ticker} at:`, new Date().toLocaleTimeString());
      const response = await fetch(
        `http://localhost:8001/api/orderbooks/by_ticker/?ticker=${ticker}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setPrevOrderBookData(orderBookData);
        setOrderBookData(data);
        setError(null);
        setLastUpdate(new Date());
      } else {
        throw new Error('Failed to fetch order book');
      }
    } catch (err) {
      setError('Failed to load order book');
      console.error('Error fetching order book:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (ticker) {
      // Initial fetch
      fetchOrderBook();
      
      // Setup interval for real-time updates every 5 seconds
      const interval = setInterval(() => fetchOrderBook(), 5000);
      
      return () => {
        clearInterval(interval);
      };
    }
  }, [ticker]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh',
        position: 'relative' 
      }}>
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
              <Timeline sx={{ fontSize: 32, color: theme.palette.primary.main }} />
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
            Loading {ticker} order book...
          </Typography>
        </motion.div>
      </div>
    );
  }

  if (error || !orderBookData) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div style={{ padding: '32px', textAlign: 'center' }}>
          <Typography 
            variant="h3" 
            sx={{ 
              mb: 2,
              fontWeight: 700,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {ticker} Order Book
          </Typography>
          <Paper
            sx={{
              p: 3,
              background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)} 0%, ${alpha(theme.palette.error.main, 0.05)} 100%)`,
              border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
              borderRadius: '16px',
              maxWidth: 400,
              mx: 'auto'
            }}
          >
            <Typography color="error" variant="h6" sx={{ fontWeight: 500 }}>
              {error || 'No data available'}
            </Typography>
          </Paper>
        </div>
      </motion.div>
    );
  }

  const { bids, asks, last_price } = orderBookData;

  const maxTotal = Math.max(
    ...bids.map((bid) => bid.total),
    ...asks.map((ask) => ask.total)
  );

  const bestBid = bids.length > 0 ? bids[0].price : 0;
  const bestAsk = asks.length > 0 ? asks[0].price : 0;
  const spread = bestAsk && bestBid ? bestAsk - bestBid : 0;
  const spreadPercent = bestAsk && bestBid ? (spread / bestBid) * 100 : 0;

  const prevPrice = prevOrderBookData?.last_price || last_price;
  const priceChange = last_price - prevPrice;

  return (
    <div style={{ position: 'relative' }}>
      {/* Header */}
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
            marginBottom: '32px',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '16px' : '0'
          }}
        >
          <div>
            <Typography 
              variant="h3" 
              sx={{ 
                fontWeight: 800,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                mb: 1
              }}
            >
              {ticker} Order Book
            </Typography>
            <Typography 
              variant="h6" 
              color="text.secondary" 
              sx={{ fontWeight: 400, opacity: 0.8 }}
            >
              Real-time market depth visualization
            </Typography>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                opacity: [1, 0.7, 1]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Chip 
                label="LIVE" 
                color="success"
                size="medium"
                variant="filled"
                sx={{
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  px: 2,
                  py: 1,
                  background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.light} 100%)`,
                  boxShadow: `0 4px 12px ${alpha(theme.palette.success.main, 0.3)}`
                }}
              />
            </motion.div>
            
            <motion.div
              animate={{ rotate: isRefreshing ? 360 : 0 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            >
              <IconButton
                onClick={() => fetchOrderBook(true)}
                disabled={isRefreshing}
                sx={{
                  color: theme.palette.primary.main,
                  background: alpha(theme.palette.primary.main, 0.1),
                  '&:hover': {
                    background: alpha(theme.palette.primary.main, 0.2),
                  },
                }}
              >
                <Refresh />
              </IconButton>
            </motion.div>
            
            {lastUpdate && (
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                Updated: {lastUpdate.toLocaleTimeString()}
              </Typography>
            )}
          </div>
        </div>
      </motion.div>

      {/* Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Last Price"
            value={`$${last_price?.toFixed(2) || '--'}`}
            color="primary"
            icon={<Timeline />}
            trend={priceChange}
            index={0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Best Bid"
            value={`$${bestBid?.toFixed(2) || '--'}`}
            color="success"
            icon={<TrendingUp />}
            index={1}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Best Ask"
            value={`$${bestAsk?.toFixed(2) || '--'}`}
            color="error"
            icon={<TrendingDown />}
            index={2}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Spread"
            value={`$${spread?.toFixed(2) || '--'}`}
            subtitle={`(${spreadPercent?.toFixed(2) || '--'}%)`}
            color="warning"
            icon={<Speed />}
            index={3}
          />
        </Grid>
      </Grid>

      {/* 3D Visualization */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
      >
        <Paper
          sx={{
            height: '300px',
            mb: 4,
            background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            borderRadius: '20px',
            overflow: 'hidden',
          }}
        >
          <Canvas camera={{ position: [0, 0, 10], fov: 75 }}>
            <OrderVisualizer3D bids={bids} asks={asks} />
          </Canvas>
          <div
            style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              background: alpha(theme.palette.background.paper, 0.9),
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
              padding: '8px 16px',
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              3D Order Depth Visualization
            </Typography>
          </div>
        </Paper>
      </motion.div>

      {/* Order Book Tables */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={6}>
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Paper
              sx={{
                background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.error.main, 0.02)} 100%)`,
                border: `1px solid ${alpha(theme.palette.error.main, 0.1)}`,
                borderRadius: '20px',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '24px', borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: theme.palette.error.main,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  <ArrowUpward />
                  Asks (Sell Orders)
                </Typography>
              </div>
              <TableContainer sx={{ maxHeight: '500px' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Price</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary' }}>Size</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary' }}>Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <AnimatePresence>
                      {asks.slice().reverse().map((ask, index) => (
                        <GradientTableRow
                          key={`ask-${ask.price}-${index}`}
                          depth={(ask.total / maxTotal) * 100}
                          side="ask"
                          sx={{
                            opacity: 0,
                            animation: `fadeInUp 0.3s ease-out ${index * 0.05}s forwards`,
                            '@keyframes fadeInUp': {
                              from: { opacity: 0, transform: 'translateY(-10px)' },
                              to: { opacity: 1, transform: 'translateY(0)' },
                            },
                          }}
                        >
                          <TableCell sx={{ color: theme.palette.error.main, fontWeight: 600 }}>
                            ${ask.price.toFixed(2)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 500 }}>{ask.size}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 500 }}>${ask.total.toFixed(2)}</TableCell>
                        </GradientTableRow>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </motion.div>
        </Grid>
        
        <Grid item xs={12} lg={6}>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Paper
              sx={{
                background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.success.main, 0.02)} 100%)`,
                border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
                borderRadius: '20px',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '24px', borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: theme.palette.success.main,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  <ArrowDownward />
                  Bids (Buy Orders)
                </Typography>
              </div>
              <TableContainer sx={{ maxHeight: '500px' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Price</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary' }}>Size</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary' }}>Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <AnimatePresence>
                      {bids.map((bid, index) => (
                        <GradientTableRow
                          key={`bid-${bid.price}-${index}`}
                          depth={(bid.total / maxTotal) * 100}
                          side="bid"
                          sx={{
                            opacity: 0,
                            animation: `fadeInUp 0.3s ease-out ${index * 0.05}s forwards`,
                            '@keyframes fadeInUp': {
                              from: { opacity: 0, transform: 'translateY(-10px)' },
                              to: { opacity: 1, transform: 'translateY(0)' },
                            },
                          }}
                        >
                          <TableCell sx={{ color: theme.palette.success.main, fontWeight: 600 }}>
                            ${bid.price.toFixed(2)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 500 }}>{bid.size}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 500 }}>${bid.total.toFixed(2)}</TableCell>
                        </GradientTableRow>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </motion.div>
        </Grid>
      </Grid>
    </div>
  );
};

export default OrderBook; 