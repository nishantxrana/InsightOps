# InsightOps

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-22+-green?style=for-the-badge&logo=node.js)
![React](https://img.shields.io/badge/React-18+-blue?style=for-the-badge&logo=react)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

**AI-powered DevOps intelligence platform with autonomous agents, real-time monitoring, and multi-provider AI integration for Azure DevOps.**

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [API](#-api-reference) • [Live Demo](#-live-demo)

</div>

---

## 📖 About

InsightOps is a comprehensive DevOps intelligence platform that bridges the gap between Azure DevOps and AI-powered automation. It provides **real-time monitoring**, **autonomous agentic workflows**, and **intelligent insights** to help development teams work more efficiently.

### 💡 What Problem Does It Solve?

- **Manual Build Analysis**: Automatically diagnoses pipeline failures and suggests fixes using AI
- **Sprint Visibility**: Provides AI-generated summaries of sprint progress and blockers
- **Notification Fatigue**: Routes intelligent alerts to Slack, Teams, or Google Chat with actionable context
- **Work Item Tracking**: Monitors work items, pull requests, and releases with automated status updates
- **DevOps Insights**: Centralizes metrics, logs, and real-time status in a unified dashboard

### 🌟 What Makes It Unique?

- **Autonomous Agent System**: Self-learning agents that monitor, analyze, and execute workflows
- **Multi-Provider AI**: Seamlessly switch between OpenAI, Groq, and Google Gemini models
- **Intelligent Memory**: Context-aware system with vector storage for historical pattern recognition
- **Free Model Fallback**: Automatically routes to free AI models when primary providers are unavailable
- **Learning System**: Pattern tracking and rule generation that improves over time

---

## 🚀 Features

### 🤖 Autonomous Agent System
- **Monitor Agents**: Continuously watch Azure DevOps for changes and anomalies
- **Analyze Agents**: Process events and extract meaningful insights using AI
- **Execute Agents**: Take automated actions based on rules and workflows
- **Lightweight Agents**: Efficient task execution with minimal resource usage
- **Rule Engine**: Dynamic rule generation based on learned patterns

### 🧠 Multi-Provider AI Integration
- **OpenAI Models**: GPT-3.5-turbo, GPT-4, GPT-4o-mini
- **Groq Models**: Llama-3-8b-instant, Llama-3-70b-versatile, Mixtral-8x7b-32768  
- **Google Gemini**: Gemini-1.5-pro, Gemini-1.5-flash, Gemini-2.0-flash
- **Smart Routing**: Automatic fallback to free models when quota is exhausted
- **Runtime Switching**: Change AI providers from settings without restart

### 🔄 Azure DevOps Integration
- **Work Items**: Real-time sprint tracking with AI-powered summaries
- **Pipelines**: Build monitoring, failure analysis, and automated diagnostics
- **Pull Requests**: Active PR tracking, idle detection, and review suggestions
- **Releases**: Deployment tracking and success rate monitoring
- **Webhooks**: Real-time event processing for instant notifications
- **Polling**: Configurable backup monitoring for webhook reliability

### 📢 Smart Notifications
- **Google Chat**: Formatted alerts with markdown compatibility
- **Context-Aware**: AI-enhanced messages with actionable insights
- **Configurable**: Customizable notification rules and schedules

### 🎯 Intelligent Workflows
- **Build Failure Workflow**: Auto-analyze failed builds and notify teams
- **PR Monitoring Workflow**: Track idle pull requests and send reminders
- **Sprint Monitoring Workflow**: Generate daily sprint summaries
- **Event-Driven**: Trigger workflows from webhooks or scheduled jobs


### 🎨 Modern React UI
- **Dashboard**: Real-time overview of work items, builds, PRs, and releases
- **Work Items View**: Interactive sprint board with filtering and search
- **Pipelines**: Build history with AI-powered failure analysis
- **Pull Requests**: PR dashboard with idle detection and status tracking
- **Settings**: Configure Azure DevOps, AI providers, and notifications
- **Logs**: Real-time application logs with filtering and search
- **Dark Mode**: Beautiful dark/light theme with smooth transitions
- **Responsive**: Mobile-friendly design with shadcn/ui components

---

## 🏗️ Tech Stack

### Backend
- **Runtime**: Node.js 22+ with ES Modules
- **Framework**: Express.js with async middleware
- **Database**: MongoDB with Mongoose ODM
- **AI Integration**: OpenAI SDK, Groq SDK, Google Generative AI
- **Security**: Helmet, bcryptjs, JWT, rate limiting
- **Scheduling**: node-cron for polling jobs
- **Logging**: Winston for structured logs

### Frontend
- **Framework**: React 18 with React Router DOM
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with custom configuration
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Icons**: Lucide React
- **Animations**: Motion (Framer Motion)
- **State Management**: React Context API

### DevOps & Deployment
- **CI/CD**: GitHub Actions workflows
- **Hosting**: Azure App Service
- **Environment**: Production and Staging configurations
- **Monitoring**: Microsoft Clarity for analytics

---

## 🗂️ Project Structure

```
InsightOps/
├── backend/                      # Node.js/Express Backend
│   ├── agents/                   # Autonomous agent system
│   │   ├── AgentRegistry.js      # Central agent management
│   │   ├── MonitorAgent.js       # Event monitoring
│   │   ├── AnalyzeAgent.js       # AI-powered analysis
│   │   ├── ExecuteAgent.js       # Action execution
│   │   ├── LightweightAgent.js   # Efficient task agents
│   │   └── RuleEngine.js         # Dynamic rule processing
│   ├── ai/                       # AI integration layer
│   │   ├── aiService.js          # Multi-provider AI service
│   │   └── FreeModelRouter.js    # Smart model routing
│   ├── api/                      # REST API endpoints
│   ├── config/                   # Configuration management
│   ├── devops/                   # Azure DevOps client
│   │   ├── azureDevOpsClient.js  # Main DevOps API client
│   │   └── releaseClient.js      # Release management
│   ├── learning/                 # Machine learning system
│   │   ├── LearningScheduler.js  # Scheduled learning jobs
│   │   ├── PatternTracker.js     # Pattern recognition
│   │   └── RuleGenerator.js      # Auto-generate rules
│   ├── memory/                   # Context and memory
│   │   ├── ContextManager.js     # Conversation context
│   │   └── MongoVectorStore.js   # Vector storage
│   ├── notifications/            # Multi-platform alerts
│   ├── polling/                  # Background monitoring
│   │   ├── userPollingManager.js # Per-user polling
│   │   ├── buildPoller.js        # Pipeline monitoring
│   │   ├── workItemPoller.js     # Work item tracking
│   │   └── pullRequestPoller.js  # PR monitoring
│   ├── workflows/                # Workflow automation
│   │   ├── SimpleWorkflowEngine.js  # Workflow execution
│   │   ├── workflowLoader.js     # Load workflow definitions
│   │   └── definitions/          # Workflow JSON configs
│   ├── webhooks/                 # Real-time event handlers
│   ├── utils/                    # Utility functions
│   └── main.js                   # Application entry point
│
├── frontend/                     # React/Vite Frontend
│   ├── src/
│   │   ├── components/           # React components
│   │   │   ├── ui/               # shadcn/ui primitives
│   │   │   ├── Layout.jsx        # Main layout wrapper
│   │   │   └── DevOpsAppSidebar.jsx  # Navigation sidebar
│   │   ├── pages/                # Route pages
│   │   │   ├── Dashboard.jsx     # Main dashboard
│   │   │   ├── WorkItems.jsx     # Sprint board
│   │   │   ├── Pipelines.jsx     # Build monitoring
│   │   │   ├── PullRequests.jsx  # PR management
│   │   │   ├── Releases.jsx      # Release tracking
│   │   │   ├── Settings.jsx      # Configuration
│   │   │   ├── Logs.jsx          # Application logs
│   │   │   └── LandingPage.jsx   # Marketing page
│   │   ├── contexts/             # React Context providers
│   │   ├── hooks/                # Custom React hooks
│   │   ├── api/                  # API client functions
│   │   └── utils/                # Frontend utilities
│   ├── public/                   # Static assets
│   └── dist/                     # Production build output
│
└── .github/workflows/            # CI/CD pipelines
    ├── deploy.yml                # Production deployment
    └── deploy-stage.yml          # Staging deployment
```

---

## ⚡ Installation & Quick Start

### Prerequisites

Before getting started, ensure you have:

- **Node.js 22+** and npm installed
- **MongoDB** instance (local or Atlas cloud)
- **Azure DevOps** organization and Personal Access Token (PAT)
- **AI Provider API Key** (choose one):
  - OpenAI API Key, OR
  - Groq API Key, OR
  - Google Gemini API Key

### 🚀 Quick Setup (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/nishantxrana/InsightOps.git
cd InsightOps

# 2. Install all dependencies (backend + frontend)
npm run install:all

# 3. Configure environment variables
cd backend
cp .env.example .env
# Edit .env file with your credentials (see Configuration section)

# 4. Start both backend and frontend in development mode
cd ..
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

### 📋 Manual Setup (Step-by-Step)

#### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your credentials
nano .env  # or use your preferred editor

# Start backend server (development mode with hot reload)
npm run dev

# Or start in production mode
npm start
```

#### 2. Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Or build for production
npm run build
```

#### 3. Production Deployment

```bash
# Build frontend
cd frontend && npm run build

# Copy frontend build to backend public folder
cd ..
mkdir -p backend/public
cp -r frontend/dist/* backend/public/

# Start production server
cd backend && npm start
```

---

## ⚙️ Configuration

### Required Environment Variables

Create a `.env` file in the `backend/` directory with the following configuration:

#### Database Configuration (Required)
```env
# MongoDB connection string
MONGODB_URI=mongodb+srv://username:password@cluster0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
```

#### Security Configuration (Required)
```env
# JWT secret for authentication (64 characters recommended)
JWT_SECRET=your-jwt-secret-key-here-64-characters-long-random-string-example

# Encryption key for sensitive data (32 bytes hex = 64 characters)
ENCRYPTION_KEY=your-32-byte-hex-encryption-key-here-64-characters-total-example
```

### Azure DevOps Configuration (Optional)

If you want to connect to your Azure DevOps organization:

```env
AZURE_DEVOPS_ORG=your-organization
AZURE_DEVOPS_PROJECT=your-project
AZURE_DEVOPS_PAT=your-personal-access-token
AZURE_DEVOPS_BASE_URL=https://dev.azure.com
```

**Note**: InsightOps supports multi-user configuration where each user can connect their own Azure DevOps instance through the Settings page.

### AI Provider Configuration (Optional)

Choose one or more AI providers:

```env
# OpenAI
OPENAI_API_KEY=sk-...

# Groq (Free tier available)
GROQ_API_KEY=gsk_...

# Google Gemini (Free tier available)
GEMINI_API_KEY=AI...
```

### Notification Webhooks (Optional)

Configure notification destinations:

```env
# Microsoft Teams
TEAMS_WEBHOOK_URL=https://your-teams-webhook-url

# Slack
SLACK_WEBHOOK_URL=https://your-slack-webhook-url

# Google Chat
GOOGLE_CHAT_WEBHOOK_URL=https://chat.googleapis.com/v1/spaces/...
```

---

## 📚 Usage Guide

### Getting Started

1. **Sign Up**: Create an account at the landing page
2. **Sign In**: Authenticate with your credentials
3. **Configure Settings**: Navigate to Settings page and:
   - Connect your Azure DevOps organization (enter PAT, org, project)
   - Select your preferred AI provider and model
   - Configure notification webhooks (optional)
   - Test your connection to verify setup

### Dashboard Overview

The main dashboard provides:
- **Work Items Summary**: Active, completed, and overdue items
- **Build Status**: Recent builds with success/failure metrics
- **Pull Requests**: Active and idle PR tracking
- **Releases**: Deployment history and success rates
- **Live Uptime**: Real-time server health monitoring

### Key Features in Action

#### 1. Work Items Monitoring
- View current sprint items with AI-generated summaries
- Track progress, blockers, and team velocity
- Get insights on work distribution and completion trends

#### 2. Pipeline Analysis
- Monitor build pipelines in real-time
- AI-powered failure analysis with specific fix recommendations
- View build logs and timeline data
- Track build duration and success rates

#### 3. Pull Request Management
- Track active pull requests and their status
- Detect idle PRs (>48 hours without updates)
- Review PR details, reviewers, and changes
- Get AI-suggested review priorities

#### 4. Release Tracking
- Monitor deployment pipelines and stages
- Track success rates and deployment frequency
- View release history and artifacts

#### 5. Autonomous Workflows
- Build failure detection → AI analysis → Team notification
- Idle PR detection → Reminder notification
- Sprint progress → Daily summary generation

### How It Works

```
┌─────────────────────┐
│  Azure DevOps       │
│  (Your Organization)│
└──────┬──────────────┘
       │ Webhooks + Polling
       ▼
┌─────────────────────┐
│  InsightOps Backend │
│  • Event Processing │
│  • AI Analysis      │
│  • Agent Execution  │
└──────┬──────────────┘
       │
       ├──► MongoDB (Data Storage)
       │
       ├──► AI Providers (OpenAI/Groq/Gemini)
       │
       └──► Notifications (Teams/Slack/Chat)
```

---

## 🔧 Setup Guides

### Get Azure DevOps Personal Access Token

1. Go to **Azure DevOps** → **User Settings** → **Personal Access Tokens**
2. Click **New Token** and configure:
   - Name: InsightOps
   - Organization: Your organization
   - Expiration: Custom (1 year recommended)
   - Scopes:
     - ✅ Work Items (Read)
     - ✅ Build (Read)
     - ✅ Code (Read)
     - ✅ Pull Request (Read & Write for advanced features)
     - ✅ Release (Read)
3. Copy the generated token and save it securely

### Setup AI Providers

**OpenAI** (Recommended for best quality)
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create new API key
3. Add billing information (pay-as-you-go)
4. Recommended models: `gpt-4o-mini`, `gpt-4`

**Groq** (Recommended for speed and free tier)
1. Visit [Groq Console](https://console.groq.com/keys)
2. Create new API key (free tier available)
3. Recommended models: `llama-3-8b-instant`, `mixtral-8x7b-32768`

**Google Gemini** (Recommended for free tier)
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create new API key (generous free tier)
3. Recommended models: `gemini-2.0-flash`, `gemini-1.5-pro`

### Configure Webhooks (Optional)

**Microsoft Teams**
1. Open Teams channel → ⋯ → **Connectors**
2. Search "Incoming Webhook" → Configure
3. Copy webhook URL to InsightOps settings

**Slack**
1. Create Slack App → **Incoming Webhooks**
2. Activate and add to workspace
3. Copy webhook URL to InsightOps settings

**Google Chat**
1. Open Chat space → ⋮ → **Manage webhooks**
2. Add new webhook
3. Copy webhook URL to InsightOps settings

---

## 📊 API Reference

### Authentication
All API endpoints (except health) require JWT authentication.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

### Health & Status
- `GET /api/health` - Application health check (no auth required)
- `GET /api/status` - Detailed system status

### Work Items
- `GET /api/work-items` - List current sprint work items
- `GET /api/work-items/sprint-summary` - AI-generated sprint summary

### Builds
- `GET /api/builds` - List recent builds
- `GET /api/builds/:buildId` - Get specific build details
- `POST /api/builds/:buildId/analyze` - AI analysis of build failures

### Pull Requests
- `GET /api/pull-requests` - List active pull requests
- `GET /api/pull-requests/idle` - Get idle pull requests (>48 hours)

### Releases
- `GET /api/releases` - List recent releases
- `GET /api/releases/:releaseId` - Get specific release details

### AI Configuration
- `GET /api/ai/providers` - List available AI providers
- `GET /api/ai/models/:provider` - Get models for specific provider
- `GET /api/ai/config` - Get current AI configuration

### Settings Management
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update user settings
- `POST /api/settings/test-connection` - Test Azure DevOps connection

### Agent Dashboard
- `GET /api/agent-dashboard` - Get autonomous agent status and metrics
- `GET /api/cache-stats` - View cache performance statistics
- `GET /api/queue-status` - Check background job queue status

### Notifications
- `GET /api/notification-history` - Retrieve notification history
- `POST /api/notifications/test` - Send test notification

### Logs
- `GET /api/logs` - Recent application logs
- `GET /api/logs/export` - Export logs (CSV/JSON)

---



## 🚀 Deployment

### Azure App Service (Current Production)

The project is configured for automated deployment to Azure App Service via GitHub Actions.

**Deployment Workflow:**
1. Push to `main` branch triggers production deployment
2. Frontend is built with Vite
3. Frontend build is copied to `backend/public/`
4. Backend is deployed to Azure App Service
5. Environment variables are injected from Azure secrets

**GitHub Secrets Required:**
- `AZURE_WEBAPP_NAME` - Azure App Service name
- `AZURE_WEBAPP_PUBLISH_PROFILE` - Publishing profile from Azure
- `VITE_CLARITY_PROJECT_ID` - Microsoft Clarity tracking ID

### Manual Deployment

```bash
# Build frontend
cd frontend && npm run build

# Copy frontend to backend public folder
mkdir -p ../backend/public
cp -r dist/* ../backend/public/

# Start production server
cd ../backend && npm start
```

### Docker Deployment (Optional)

```dockerfile
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm ci && \
    cd backend && npm ci --only=production && \
    cd ../frontend && npm ci

# Copy application code
COPY . .

# Build frontend
RUN cd frontend && npm run build && \
    mkdir -p ../backend/public && \
    cp -r dist/* ../backend/public/

# Expose port
EXPOSE 3001

# Start backend server
CMD ["node", "backend/main.js"]
```

---

## 🧪 Development

### Available Scripts

```bash
# Root directory scripts
npm run install:all      # Install all dependencies
npm run dev             # Start backend + frontend in dev mode
npm run build           # Build frontend for production
npm run simulate:production  # Test production build locally

# Backend scripts
cd backend
npm run dev             # Start with nodemon (hot reload)
npm start               # Start production server
npm test                # Run backend tests

# Frontend scripts
cd frontend
npm run dev             # Start Vite dev server
npm run build           # Build for production
npm run preview         # Preview production build
npm run lint            # Lint code with ESLint
```

### Local Development Tips

1. **Backend Hot Reload**: Uses nodemon to automatically restart on file changes
2. **Frontend Hot Module Replacement**: Vite provides instant HMR for React components
3. **API Proxy**: Frontend dev server proxies `/api` requests to backend
4. **Environment Variables**: Keep `.env` files out of git with `.gitignore`

---





## 🆘 Troubleshooting

### Common Issues

**❌ MongoDB Connection Failed**
- Verify `MONGODB_URI` is correct in `.env`
- Check MongoDB Atlas IP whitelist (allow 0.0.0.0/0 for development)
- Ensure database user has read/write permissions

**❌ Azure DevOps API Errors**
- Verify PAT has correct scopes (Work Items, Build, Code, PR, Release)
- Check organization and project names are correct
- Ensure PAT hasn't expired (default: 90 days)

**❌ AI Provider Errors**
- Verify API key is valid and not expired
- Check if you have remaining quota/credits
- Try switching to a different provider (Groq/Gemini for free tiers)

**❌ Frontend Not Loading**
- Check if backend is running on port 3001
- Verify CORS configuration in backend
- Clear browser cache and reload

**❌ Webhooks Not Working**
- Verify webhook URL is publicly accessible
- Check webhook secret matches configuration
- Review Azure DevOps Service Hook logs

### Debug Mode

Enable detailed logging:
```env
LOG_LEVEL=debug
NODE_ENV=development
```

Then check logs at:
- `backend/logs/combined.log` - All logs
- `backend/logs/error.log` - Errors only






## 🌟 Live Demo

🚀 **Try InsightOps**: [https://stginsightops.azurewebsites.net/]

**Demo Credentials:**
```
Email: demo@insightops.dev
Password: W6%Q5=?!;f4f
```

*Note: Demo resets every 24 hours. Your data will not be persisted.*

---

## 📸 Screenshots

### Dashboard
![Dashboard](https://insightopssa.blob.core.windows.net/insightops-demo/Assets/Dashboard.png)
*Real-time overview of work items, builds, PRs, and releases*

### Pipeline Analysis
![Pipeline Analysis](https://insightopssa.blob.core.windows.net/insightops-demo/Assets/Release.png)
*AI-powered build failure analysis with actionable insights*

### Settings
![Settings](https://insightopssa.blob.core.windows.net/insightops-demo/Assets/Settings.png)
*Configure Azure DevOps, AI providers, and notifications*

---
