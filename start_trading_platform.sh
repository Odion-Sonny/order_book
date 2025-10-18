#!/bin/bash

# Trading Engine Quick Start Script
# This script starts both the Django backend and React frontend

echo "========================================"
echo "  Trading Engine - Quick Start"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$SCRIPT_DIR/trading_engine"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# Function to check if a port is in use
check_port() {
    lsof -i :$1 > /dev/null 2>&1
    return $?
}

# Check if backend port is available
if check_port 8000; then
    echo -e "${YELLOW}Warning: Port 8000 is already in use. Django backend may already be running.${NC}"
    echo ""
fi

# Check if frontend port is available
if check_port 3000; then
    echo -e "${YELLOW}Warning: Port 3000 is already in use. React frontend may already be running.${NC}"
    echo ""
fi

# Start Django backend
echo -e "${BLUE}[1/2] Starting Django Backend...${NC}"
cd "$BACKEND_DIR"

if [ ! -f "db.sqlite3" ]; then
    echo -e "${YELLOW}Database not found. Running migrations...${NC}"
    python3 manage.py migrate
fi

# Start backend in background
echo -e "${GREEN}Starting Django server on http://localhost:8000${NC}"
python3 manage.py runserver > /dev/null 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
echo ""

# Wait for backend to start
sleep 3

# Start React frontend
echo -e "${BLUE}[2/2] Starting React Frontend...${NC}"
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install
fi

echo -e "${GREEN}Starting React development server on http://localhost:3000${NC}"
npm start > /dev/null 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
echo ""

echo "========================================"
echo -e "${GREEN}✓ Trading Platform Started Successfully!${NC}"
echo "========================================"
echo ""
echo -e "${BLUE}Access Points:${NC}"
echo "  • Frontend:  http://localhost:3000"
echo "  • Backend:   http://localhost:8000"
echo "  • API Docs:  http://localhost:8000/swagger/"
echo ""
echo -e "${BLUE}Demo Credentials:${NC}"
echo "  • Username:  testuser"
echo "  • Password:  testpass123"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"
echo ""

# Wait for Ctrl+C
trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT

# Keep script running
wait
