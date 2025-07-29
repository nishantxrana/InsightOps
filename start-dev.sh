#!/bin/bash

# AI-Powered Azure DevOps Monitoring Agent - Development Startup Script

echo "🚀 Starting Azure DevOps Monitoring Agent in Development Mode"
echo "============================================================"

# Check if .env file exists
if [ ! -f "backend/.env" ]; then
    echo "⚠️  Warning: backend/.env file not found!"
    echo "   Please copy backend/.env.example to backend/.env and configure it."
    echo "   Example: cp backend/.env.example backend/.env"
    echo ""
fi

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port $1 is already in use. Please stop the process or use a different port."
        return 1
    fi
    return 0
}

# Check if required ports are available
echo "🔍 Checking if required ports are available..."
check_port 3001 || exit 1
check_port 5175 || exit 1

echo "✅ Ports are available"
echo ""

# Start backend in background
echo "🔧 Starting Backend (Node.js + Express) on port 3001..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend in background
echo "🎨 Starting Frontend (React + Vite) on port 5173..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "🎉 Application started successfully!"
echo "=================================="
echo "📊 Frontend Dashboard: http://localhost:5173"
echo "🔧 Backend API:        http://localhost:3001"
echo "📋 API Health Check:   http://localhost:3001/health"
echo "🔗 Webhook Test:       http://localhost:3001/api/webhooks/test"
echo ""
echo "📝 Next Steps:"
echo "1. Configure your .env file with Azure DevOps credentials"
echo "2. Set up AI provider (OpenAI or Groq) API key"
echo "3. Configure notification webhooks (Teams/Slack)"
echo "4. Set up Azure DevOps webhooks pointing to your endpoints"
echo ""
echo "🛑 To stop the application, press Ctrl+C"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping application..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ Application stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for processes
wait
