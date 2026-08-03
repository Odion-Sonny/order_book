#!/bin/bash

# Trading Engine Quick Start Script
# Starts Redis, the Django ASGI backend (Daphne) and the Next.js frontend.

set -u

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
LOG_DIR="$SCRIPT_DIR/.logs"
mkdir -p "$LOG_DIR"

BACKEND_PID=""
FRONTEND_PID=""

# Locate the Python interpreter that has the project dependencies installed.
# Override with VENV_PYTHON=/path/to/python if your virtualenv lives elsewhere.
find_python() {
    local candidates=(
        "${VENV_PYTHON:-}"
        "$SCRIPT_DIR/.venv/bin/python"
        "$SCRIPT_DIR/venv/bin/python"
        "$BACKEND_DIR/.venv/bin/python"
        "$BACKEND_DIR/venv/bin/python"
        "$HOME/.venvs/order_book/bin/python"
    )
    for c in "${candidates[@]}"; do
        if [ -n "$c" ] && [ -x "$c" ]; then
            echo "$c"
            return 0
        fi
    done
    # Fall back to whatever python3 is on PATH, if it can import Django.
    if command -v python3 > /dev/null 2>&1 && python3 -c "import django" > /dev/null 2>&1; then
        command -v python3
        return 0
    fi
    return 1
}

PYTHON="$(find_python)" || {
    echo -e "${RED}Error: no Python environment with Django installed was found.${NC}"
    echo ""
    echo "Create one and install the dependencies:"
    echo "  python3 -m venv ~/.venvs/order_book"
    echo "  ~/.venvs/order_book/bin/pip install -r trading_engine/requirements.txt"
    echo ""
    echo "Or point the script at an existing environment:"
    echo "  VENV_PYTHON=/path/to/venv/bin/python ./start_trading_platform.sh"
    exit 1
}
echo -e "${BLUE}Using Python: ${PYTHON}${NC}"

if ! "$PYTHON" -c "import daphne" > /dev/null 2>&1; then
    echo -e "${RED}Error: daphne is not installed in ${PYTHON}.${NC}"
    echo "Install the dependencies: ${PYTHON} -m pip install -r trading_engine/requirements.txt"
    exit 1
fi

# Function to check if a port is in use
check_port() {
    if command -v lsof > /dev/null 2>&1; then
        lsof -i ":$1" > /dev/null 2>&1
        return $?
    fi
    # lsof is not always present; fall back to a connect attempt.
    (exec 3<>"/dev/tcp/127.0.0.1/$1") > /dev/null 2>&1
    return $?
}

# Start Redis (channel layer backend for WebSockets)
echo -e "${BLUE}[1/3] Starting Redis...${NC}"
if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis already running${NC}"
elif command -v redis-server > /dev/null 2>&1; then
    redis-server --daemonize yes
    sleep 1
    if redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Redis started${NC}"
    else
        echo -e "${RED}Error: Redis failed to start. WebSocket streams will not work.${NC}"
        exit 1
    fi
else
    echo -e "${RED}Error: redis-server not found. Install Redis, then re-run this script.${NC}"
    exit 1
fi
echo ""

# Start Django backend on Daphne (ASGI - required for WebSockets)
echo -e "${BLUE}[2/3] Starting Django Backend (Daphne/ASGI)...${NC}"
if check_port 8000; then
    echo -e "${YELLOW}Warning: Port 8000 is already in use. Django backend may already be running.${NC}"
    echo ""
fi

cd "$BACKEND_DIR" || exit 1

if [ ! -f "db.sqlite3" ]; then
    echo -e "${YELLOW}Database not found. Running migrations...${NC}"
    "$PYTHON" manage.py migrate
fi

echo -e "${GREEN}Starting Daphne on http://localhost:8000${NC}"
"$PYTHON" -m daphne -b 0.0.0.0 -p 8000 trading_engine.asgi:application > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID, log: .logs/backend.log)${NC}"
echo ""

# Wait for the backend to accept connections
for _ in $(seq 1 30); do
    check_port 8000 && break
    sleep 1
done
if ! kill -0 "$BACKEND_PID" > /dev/null 2>&1; then
    echo -e "${RED}Error: backend exited during startup. Last lines of .logs/backend.log:${NC}"
    tail -n 20 "$LOG_DIR/backend.log"
    exit 1
fi

# Start Next.js frontend
echo -e "${BLUE}[3/3] Starting Next.js Frontend...${NC}"
if check_port 3000; then
    echo -e "${YELLOW}Warning: Port 3000 is already in use. Frontend may already be running.${NC}"
    echo ""
fi

cd "$FRONTEND_DIR" || exit 1

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install
fi

echo -e "${GREEN}Starting Next.js development server on http://localhost:3000${NC}"
npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID, log: .logs/frontend.log)${NC}"
echo ""

echo "========================================"
echo -e "${GREEN}✓ Trading Platform Started Successfully!${NC}"
echo "========================================"
echo ""
echo -e "${BLUE}Access Points:${NC}"
echo "  • Frontend:     http://localhost:3000"
echo "  • Backend:      http://localhost:8000"
echo "  • Market clock: http://localhost:8000/api/market-clock/"
echo "  • API Docs:     http://localhost:8000/swagger/"
echo "  • WebSocket:    ws://localhost:8000/ws/orderbook/<TICKER>/"
echo ""
echo -e "${BLUE}Demo Credentials:${NC}"
echo "  • Username:  testuser"
echo "  • Password:  testpass123"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"
echo ""

# Stop the child processes on exit (Redis is left running - it is a shared daemon)
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
    wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
    exit 0
}
trap cleanup INT TERM

# Keep script running
wait
