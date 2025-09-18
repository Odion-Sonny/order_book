/// <reference types="node" />

const isDevelopment = process.env.NODE_ENV === 'development';

export const API_BASE_URL = isDevelopment 
  ? 'https://localhost:8443' 
  : process.env.REACT_APP_API_URL;

export const WS_BASE_URL = isDevelopment 
  ? 'wss://localhost:8443' 
  : process.env.REACT_APP_WS_URL; 