#!/bin/bash

# AI-Powered Azure DevOps Monitoring Agent - Development Startup Script

echo "🚀 Starting Azure DevOps Monitoring Agent"
echo "=========================================="

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
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  Port $1 is already in use. Stopping existing process..."
        lsof -ti:$1 | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# Check and free up required ports
echo "🔍 Checking ports..."
check_port 3001
check_port 5173

echo "✅ Ports are ready"
echo ""

# Start backend
echo "🔧 Starting Backend (Node.js + Express)..."
cd backend
node main.js > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start and test it
echo "   Waiting for backend to start..."
sleep 3

# Test backend health
BACKEND_HEALTH=$(curl -s http://localhost:3001/health 2>/dev/null | grep -o '"status":"healthy"' || echo "")
if [ -n "$BACKEND_HEALTH" ]; then
    echo "✅ Backend started successfully on http://localhost:3001"
else
    echo "❌ Backend failed to start. Check logs/backend.log"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Test Azure DevOps connection
echo "   Testing Azure DevOps connection..."
CONNECTION_TEST=$(curl -s -X POST http://localhost:3001/api/settings/test-connection 2>/dev/null | grep -o '"success":true' || echo "")
if [ -n "$CONNECTION_TEST" ]; then
    echo "✅ Azure DevOps connection successful"
else
    echo "⚠️  Azure DevOps connection failed - check your configuration"
fi

# Start frontend
echo ""
echo "🎨 Starting Frontend (React + Vite)..."
cd frontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
echo "   Waiting for frontend to start..."
sleep 5

# Test frontend
FRONTEND_TEST=$(curl -s http://localhost:5173 2>/dev/null | grep -o '<title>' || echo "")
if [ -n "$FRONTEND_TEST" ]; then
    echo "✅ Frontend started successfully on http://localhost:5173"
else
    echo "⚠️  Frontend may still be starting..."
fi

echo ""
echo "🎉 Application Started Successfully!"
echo "===================================="
echo "📊 Frontend Dashboard: http://localhost:5173"
echo "🔧 Backend API:        http://localhost:3001"
echo "📋 API Health Check:   http://localhost:3001/health"
echo ""
echo "📝 Current Status:"
echo "- Work Items: Available"
echo "- Builds: Available" 
echo "- Pull Requests: Available"
echo "- AI Summaries: $([ -n "$CONNECTION_TEST" ] && echo "Ready" || echo "Configure AI provider")"
echo ""
echo "📁 Logs:"
echo "- Backend: logs/backend.log"
echo "- Frontend: logs/frontend.log"
echo ""
echo "🛑 To stop the application, press Ctrl+C"

# Create logs directory if it doesn't exist
mkdir -p logs

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping application..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    # Kill any remaining processes on our ports
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true
    lsof -ti:5173 | xargs kill -9 2>/dev/null || true
    echo "✅ Application stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for processes and show live status
while true; do
    sleep 10
    # Check if processes are still running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo "❌ Backend process died. Check logs/backend.log"
        cleanup
    fi
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "❌ Frontend process died. Check logs/frontend.log"
        cleanup
    fi
done
