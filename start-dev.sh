#!/bin/bash

# AI-Powered Azure DevOps Monitoring Agent - Development Startup Script

echo "🚀 Starting Azure DevOps Monitoring Agent"
echo "=========================================="

# Create logs directory first
mkdir -p logs

# Check if .env file exists
if [ ! -f "backend/.env" ]; then
    echo "⚠️  Warning: backend/.env file not found!"
    echo "   Please copy backend/.env.example to backend/.env and configure it."
    echo "   Example: cp backend/.env.example backend/.env"
    echo ""
    exit 1
fi

# Function to check if port is in use
check_port() {
    local port=$1
    if command -v lsof >/dev/null 2>&1; then
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo "⚠️  Port $port is already in use. Stopping existing process..."
            lsof -ti:$port | xargs kill -9 2>/dev/null || true
            sleep 2
        fi
    elif command -v netstat >/dev/null 2>&1; then
        if netstat -tuln | grep ":$port " >/dev/null 2>&1; then
            echo "⚠️  Port $port appears to be in use"
        fi
    else
        echo "⚠️  Cannot check port $port (lsof/netstat not available)"
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    echo "   Waiting for $service_name to start..."
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            echo "✅ $service_name is ready"
            return 0
        fi
        echo "   Attempt $attempt/$max_attempts - waiting..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ $service_name failed to start after $max_attempts attempts"
    return 1
}

# Check and free up required ports
echo "🔍 Checking ports..."
check_port 3001
check_port 5173
echo "✅ Port check completed"
echo ""

# Start backend
echo "🔧 Starting Backend (Node.js + Express)..."
cd backend || exit 1

# Start backend in background and capture PID
nohup node main.js > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

cd .. || exit 1

# Wait for backend to be ready
if wait_for_service "http://localhost:3001/health" "Backend"; then
    echo "✅ Backend started successfully on http://localhost:3001"
else
    echo "❌ Backend failed to start. Check logs/backend.log for details:"
    tail -n 10 logs/backend.log 2>/dev/null || echo "   No log file found"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Test Azure DevOps connection (optional - don't fail if it doesn't work)
echo "   Testing Azure DevOps connection..."
if curl -s -X GET "http://localhost:3001/api/settings" >/dev/null 2>&1; then
    echo "✅ Backend API is responding"
else
    echo "⚠️  Backend API test failed - but continuing..."
fi

# Start frontend
echo ""
echo "🎨 Starting Frontend (React + Vite)..."
cd frontend || exit 1

# Start frontend in background and capture PID
nohup npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

cd .. || exit 1

# Wait for frontend to be ready (Vite takes longer to start)
echo "   Waiting for frontend to start (this may take a moment)..."
sleep 8

# Check if frontend is accessible
if curl -s "http://localhost:5173" >/dev/null 2>&1; then
    echo "✅ Frontend started successfully on http://localhost:5173"
else
    echo "⚠️  Frontend may still be starting - check http://localhost:5173 in a moment"
fi

echo ""
echo "🎉 Application Started Successfully!"
echo "===================================="
echo "📊 Frontend Dashboard: http://localhost:5173"
echo "🔧 Backend API:        http://localhost:3001"
echo "📋 API Health Check:   http://localhost:3001/health"
echo ""
echo "📝 Process Information:"
echo "- Backend PID: $BACKEND_PID"
echo "- Frontend PID: $FRONTEND_PID"
echo ""
echo "📁 Logs:"
echo "- Backend: logs/backend.log"
echo "- Frontend: logs/frontend.log"
echo ""
echo "💡 Tips:"
echo "- Use 'tail -f logs/backend.log' to monitor backend logs"
echo "- Use 'tail -f logs/frontend.log' to monitor frontend logs"
echo "- Visit http://localhost:5173/settings to configure Azure DevOps"
echo ""
echo "🛑 To stop the application, press Ctrl+C"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping application..."
    
    # Kill our processes
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo "   Stopped backend (PID: $BACKEND_PID)"
    fi
    
    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        echo "   Stopped frontend (PID: $FRONTEND_PID)"
    fi
    
    # Kill any remaining processes on our ports (if lsof is available)
    if command -v lsof >/dev/null 2>&1; then
        lsof -ti:3001 | xargs kill -9 2>/dev/null || true
        lsof -ti:5173 | xargs kill -9 2>/dev/null || true
    fi
    
    echo "✅ Application stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM EXIT

# Wait for processes and show live status
while true; do
    sleep 10
    
    # Check if processes are still running
    if [ -n "$BACKEND_PID" ] && ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo "❌ Backend process died. Check logs/backend.log for details:"
        tail -n 5 logs/backend.log 2>/dev/null || echo "   No log file found"
        cleanup
    fi
    
    if [ -n "$FRONTEND_PID" ] && ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "❌ Frontend process died. Check logs/frontend.log for details:"
        tail -n 5 logs/frontend.log 2>/dev/null || echo "   No log file found"
        cleanup
    fi
    
    # Optional: Show a status message every minute
    echo "📊 Status: Backend (PID: $BACKEND_PID) and Frontend (PID: $FRONTEND_PID) running..."
done
