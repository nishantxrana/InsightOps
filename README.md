# InsightOps

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-22+-green?style=for-the-badge&logo=node.js)
![React](https://img.shields.io/badge/React-18+-blue?style=for-the-badge&logo=react)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

**AI-powered DevOps intelligence platform with autonomous agents, real-time monitoring, and multi-provider AI integration for Azure DevOps.**

[Features](#-features) • [Quick Start](#-installation--quick-start) • [Tech Stack](#-tech-stack) • [API Reference](#-api-reference) • [Live Demo](#-live-demo)

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

- **Multi-Organization Support**: Manage multiple Azure DevOps organizations from one account
- **Multi-Project Support**: Switch between projects within an organization seamlessly
- **Work Items**: Real-time sprint tracking with AI-powered summaries
- **Pipelines**: Build monitoring, failure analysis, and automated diagnostics
- **Pull Requests**: Active PR tracking, idle detection, and review suggestions
- **Releases**: Deployment tracking and success rate monitoring
- **Webhooks**: Real-time event processing for instant notifications
- **Polling**: Configurable backup monitoring for webhook reliability
- **Production Filters**: Define production environments with configurable filters
  - Filter by branches (exact match or wildcards like `release/*`)
  - Filter by environments (e.g., `Production`, `E3`, `Prod-*`)
  - Filter by build definitions (pipeline names)
  - Generate production-only activity reports
  - Production deployment notifications via webhooks

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
│   │   ├── routes.js             # Main API routes
│   │   ├── dashboard.js          # Dashboard & reports
│   │   └── organizationRoutes.js # Organization management
│   ├── cache/                    # Caching layer
│   │   └── AzureDevOpsCache.js   # Project-aware cache
│   ├── config/                   # Configuration management
│   │   └── cache.js              # Cache TTL constants
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
│   ├── models/                   # MongoDB schemas
│   │   ├── Organization.js       # Organization with filters
│   │   ├── User.js               # User accounts
│   │   ├── UserSettings.js       # User preferences
│   │   └── ...                   # Other models
│   ├── notifications/            # Multi-platform alerts
│   │   └── googleChatService.js  # Google Chat integration
│   ├── polling/                  # Background monitoring
│   │   ├── userPollingManager.js # Per-user polling
│   │   ├── buildPoller.js        # Pipeline monitoring
│   │   ├── workItemPoller.js     # Work item tracking
│   │   └── pullRequestPoller.js  # PR monitoring
│   ├── services/                 # Business logic
│   │   ├── activityReportService.js    # Report generation
│   │   ├── organizationService.js      # Org management
│   │   ├── pdfService.js               # PDF generation
│   │   └── productionFilterService.js  # Filter matching
│   ├── templates/                # EJS templates
│   │   └── activityReport.ejs    # PDF report template
│   ├── utils/                    # Utility functions
│   │   └── organizationSettings.js # Org context helpers
│   ├── webhooks/                 # Real-time event handlers
│   │   ├── releaseWebhook.js     # Release notifications
│   │   └── ...                   # Other webhooks
│   ├── workflows/                # Workflow automation
│   │   ├── SimpleWorkflowEngine.js  # Workflow execution
│   │   ├── workflowLoader.js     # Load workflow definitions
│   │   └── definitions/          # Workflow JSON configs
│   └── main.js                   # Application entry point
│
├── frontend/                     # React/Vite Frontend
│   ├── src/
│   │   ├── components/           # React components
│   │   │   ├── ui/               # shadcn/ui primitives
│   │   │   │   ├── TagInput.jsx  # Tag input for filters
│   │   │   │   └── ...           # Other UI components
│   │   │   ├── Layout.jsx        # Main layout wrapper
│   │   │   ├── DevOpsAppSidebar.jsx  # Navigation sidebar
│   │   │   └── DevOpsActivityReport.jsx  # Activity report component
│   │   ├── pages/                # Route pages
│   │   │   ├── Dashboard.jsx     # Main dashboard
│   │   │   ├── WorkItems.jsx     # Sprint board
│   │   │   ├── Pipelines.jsx     # Build monitoring
│   │   │   ├── PullRequests.jsx  # PR management
│   │   │   ├── Releases.jsx      # Release tracking
│   │   │   ├── Settings.jsx      # Configuration
│   │   │   │   └── OrganizationsSection.jsx  # Org settings with filters
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

## 🔐 Authentication & Security

### Email-Based Authentication with OTP

InsightOps uses a **secure, passwordless-first authentication system** powered by **Brevo** (formerly Sendinblue):

#### **Sign Up Flow:**

1. User enters email, name, and password
2. System generates 6-digit OTP (valid for 10 minutes)
3. OTP sent via Brevo transactional email
4. User verifies OTP to complete registration
5. JWT token issued for session management

#### **Password Reset Flow:**

1. User requests password reset
2. System generates 6-digit OTP
3. OTP sent to registered email
4. User verifies OTP and sets new password

#### **Security Features:**

- **Bcrypt Password Hashing**: 12 rounds for strong protection
- **JWT Tokens**: Secure session management with configurable expiry
- **OTP Rate Limiting**: Prevents brute-force attacks (max 5 attempts)
- **Email Verification**: Ensures valid email addresses
- **Encryption**: Sensitive data encrypted with AES-256
- **CORS Protection**: Configurable allowed origins
- **Helmet.js**: Security headers for Express
- **Rate Limiting**: API endpoint protection

#### **Why Brevo?**

- **Free Tier**: 300 emails/day (sufficient for most use cases)
- **Reliable**: 99.9% uptime SLA
- **Fast**: Email delivery in seconds
- **Transactional**: Purpose-built for OTP/verification emails
- **Easy Setup**: Simple API integration

**Required Environment Variables:**

```env
BREVO_API_KEY=xkeysib-your-api-key-here
FROM_EMAIL=support@yourdomain.com
FROM_NAME=InsightOps
EMAIL_VERIFICATION_SECRET=your-secret-here
PASSWORD_RESET_SECRET=your-secret-here
```

---

## 🎨 Key Technical Features

### 1. **Multi-Organization & Multi-Project Support**

- **Per-User Organizations**: Each user can connect multiple Azure DevOps organizations
- **Organization Switching**: Seamless switching without page reload
- **Project Switching**: Switch between projects within an organization
- **Isolated Settings**: Each organization has independent AI, notification, and polling settings
- **Production Filters**: Define production environments per organization

### 2. **PDF Report Generation with Puppeteer**

- **Chromium-Based**: Uses Puppeteer for high-quality PDF rendering
- **EJS Templates**: Dynamic HTML templates with embedded charts
- **ChartJS Integration**: Beautiful pie charts and bar graphs
- **Production Filtering**: Generate reports for production deployments only
- **Containerized**: Requires Docker/Container Apps for Chromium dependencies

**Why Container Apps?**

- Azure App Service doesn't support Chromium system libraries
- Container Apps provide full control over runtime environment
- Puppeteer requires specific system packages (fonts, libraries)

### 3. **Smart Code Splitting (Vite)**

- **Manual Chunks**: Vendor libraries split by category (React, Framer Motion, Radix UI)
- **Route-Based Splitting**: Each page loaded on-demand
- **Optimized Caching**: Vendor chunks cached separately from app code
- **Performance**: Initial load reduced from 1.36 MB to ~500 KB (~150 KB gzipped)

**Configuration:**

```javascript
// vite.config.js
manualChunks: (id) => {
  if (id.includes("node_modules/react")) return "react-core";
  if (id.includes("node_modules/framer-motion")) return "framer-motion";
  if (id.includes("/src/pages/Dashboard.jsx")) return "page-dashboard";
  // ... more chunks
};
```

### 4. **Real-Time Organization Switching**

- **Context-Based**: Uses React Context for state management
- **No Page Reload**: Smooth transitions with Framer Motion animations
- **Toast Notifications**: User-friendly feedback ("Switching organization → Acme")
- **Automatic Refetch**: All pages refetch data when org/project changes
- **Mobile Optimized**: Responsive toast with text truncation

### 5. **Intelligent Caching**

- **Project-Aware Cache**: Separate cache per Azure DevOps project
- **TTL Configuration**: Configurable time-to-live per resource type
- **Cache Invalidation**: Automatic invalidation on org/project switch
- **Performance**: Reduces API calls to Azure DevOps by 70%

### 6. **Production Filters**

Define what constitutes "production" for your organization:

- **Branch Filters**: `main`, `master`, `release/*` (supports wildcards)
- **Environment Filters**: `Production`, `E3`, `Prod-*` (case-insensitive)
- **Build Definition Filters**: Filter by pipeline name
- **Report Filtering**: Generate production-only activity reports
- **Webhook Filtering**: Send notifications for production deployments only

**Use Cases:**

- Focus on production deployments in reports
- Reduce notification noise from dev/staging
- Track production success rates separately
- Compliance and audit requirements

---

## ⚡ Installation & Quick Start

### Prerequisites

Before getting started, ensure you have:

- **Node.js 22+** and npm installed
- **MongoDB** instance (local or Atlas cloud)
- **Brevo Account** for email service (free tier available)
- **Azure DevOps** organization and Personal Access Token (PAT) - Optional, can configure in UI
- **AI Provider API Key** (optional, can configure in UI):
  - OpenAI API Key, OR
  - Groq API Key (free tier), OR
  - Google Gemini API Key (free tier)

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
# Edit .env file with your credentials (see Configuration section below)

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

# Create environment file (optional)
cp .env.example .env

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

### 📁 Environment Files Overview

InsightOps uses three separate `.env` files:

1. **`backend/.env`** - Backend server configuration (Node.js/Express)
2. **`frontend/.env`** - Frontend build-time variables (React/Vite)
3. **`.env`** (root) - Docker deployment configuration

**All three have corresponding `.env.example` files with detailed documentation.**

---

### 🔧 Backend Configuration (`backend/.env`)

Create a `.env` file in the `backend/` directory. Copy from `backend/.env.example` and fill in your values.

#### ✅ Required Variables

These are **mandatory** for the application to run:

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/InsightOps?retryWrites=true&w=majority

# Security - Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your-64-character-jwt-secret-here

# Encryption - Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=your-64-character-encryption-key-here

# Application
NODE_ENV=development
PORT=3001
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3001

# Email Service (Brevo) - Required for signup/login with OTP
BREVO_API_KEY=xkeysib-your-api-key-here
FROM_EMAIL=support@yourdomain.com
FROM_NAME=InsightOps

# Email Secrets - Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
EMAIL_VERIFICATION_SECRET=your-64-character-secret-here
PASSWORD_RESET_SECRET=your-64-character-secret-here
```

#### 🔑 How to Get Required Keys

**MongoDB URI:**

1. Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Click "Connect" → "Connect your application"
4. Copy the connection string and replace `<password>` with your database password

**Brevo API Key (Email Service):**

1. Sign up at [Brevo](https://app.brevo.com) (free tier: 300 emails/day)
2. Go to **Settings** → **SMTP & API** → **API Keys**
3. Create new API key
4. Copy the key (starts with `xkeysib-`)

**Security Keys (JWT, Encryption, Email Secrets):**

```bash
# Generate all at once
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('EMAIL_VERIFICATION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('PASSWORD_RESET_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

### 🎨 Frontend Configuration (`frontend/.env`)

Create a `.env` file in the `frontend/` directory (optional):

```env
# Microsoft Clarity Analytics (optional)
VITE_CLARITY_PROJECT_ID=your_project_id_here

# Demo Video URL (optional)
VITE_DEMO_VIDEO_URL=https://yourdomain.blob.core.windows.net/videos/demo.mp4
```

**Note:** Frontend variables are **build-time only**. Changes require rebuilding the frontend.

---

### 🐳 Docker Configuration (`.env` in root)

For Docker deployment, create a `.env` file in the **project root**:

```env
# Application
PORT=8000

# Database
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/InsightOps

# Security
JWT_SECRET=your-64-character-jwt-secret-here
ENCRYPTION_KEY=your-64-character-encryption-key-here

# CORS
ALLOWED_ORIGINS=http://localhost:8000,https://yourdomain.com

# Email Service
BREVO_API_KEY=xkeysib-your-api-key-here
FROM_EMAIL=support@yourdomain.com
FROM_NAME=InsightOps
EMAIL_VERIFICATION_SECRET=your-64-character-secret-here
PASSWORD_RESET_SECRET=your-64-character-secret-here

# Frontend Build Args (optional)
VITE_CLARITY_PROJECT_ID=your_clarity_project_id_here
VITE_DEMO_VIDEO_URL=https://yourdomain.blob.core.windows.net/videos/demo.mp4
```

**Deploy with Docker:**

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
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

#### 5. Production Filters

Configure what constitutes "production" for your organization:

**Setup (in Settings → Organizations → Production Filters):**

- Enable production filters toggle
- Add branch patterns: `main`, `master`, `release/*`
- Add environment patterns: `Production`, `E3`, `Prod-*`
- Add build definition patterns (optional): `Prod-Deploy`, `Release-*`

**Usage (in Activity Reports):**

- Toggle "Production Only Report" to filter data
- PDF reports include "Filter: Production Only" indicator
- Filename includes `_PRODUCTION` suffix
- Webhook notifications respect production filters

**Pattern Matching:**

- **Exact match**: `main` matches only `main`
- **Wildcard match**: `release/*` matches `release/v1.0`, `release/hotfix`
- **Case-insensitive**: `Main` matches `main`, `MAIN`, `MaIn`

**Filter Logic:**

- **Builds**: Filtered by source branch OR build definition name
- **Releases**: Filtered by environment name
- **Pull Requests**: Filtered by target branch (where merging TO)

#### 6. Autonomous Workflows

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

### Activity Reports

- `GET /api/dashboard/activity-report/stream` - Stream activity report data (supports `?productionOnly=true`)
- `POST /api/dashboard/activity-report/pdf` - Generate PDF report with optional production filtering

### AI Configuration

- `GET /api/ai/providers` - List available AI providers
- `GET /api/ai/models/:provider` - Get models for specific provider
- `GET /api/ai/config` - Get current AI configuration

### Organizations

- `GET /api/organizations` - List user's organizations
- `POST /api/organizations` - Create new organization
- `PUT /api/organizations/:id` - Update organization (includes production filters)
- `DELETE /api/organizations/:id` - Delete organization
- `POST /api/organizations/:id/set-default` - Set default organization
- `GET /api/organizations/:id/projects` - List projects in organization

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

## 🚀 Running the Application

### 🐳 Using Docker (Recommended)

**Option 1: Docker Compose (Easiest)**

```bash
# 1. Clone and setup
git clone https://github.com/nishantxrana/InsightOps.git
cd InsightOps

# 2. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 3. Run
docker-compose up -d

# 4. View logs
docker-compose logs -f

# 5. Stop
docker-compose down
```

Application available at: `http://localhost:8000`

**Option 2: Using Dockerfile**

```bash
# 1. Build image
docker build -t insightops:latest .

# 2. Run container
docker run -p 8000:8000 --env-file .env insightops:latest

# 3. View logs
docker logs <container-id>
```

**Why Docker?**

- ✅ Chromium pre-installed (required for PDF generation)
- ✅ All dependencies included
- ✅ Consistent environment
- ✅ No manual setup needed

---

### 🖥️ Manual Setup (Without Docker)

**Requirements:**

- Node.js 22+
- Chromium browser (for PDF generation)
- MongoDB instance

**Install Chromium:**

```bash
# Ubuntu/Debian
sudo apt-get update && sudo apt-get install -y chromium-browser

# macOS
brew install chromium
```

**Run Application:**

```bash
# 1. Install dependencies
npm run install:all

# 2. Configure backend
cd backend
cp .env.example .env
# Edit .env with your credentials

# 3. Build frontend
cd ../frontend
cp .env.example .env
npm run dev

# 4. Copy frontend to backend
mkdir -p ../backend/public
cp -r dist/* ../backend/public/

# 5. Start server
cd ../backend
npm run dev
```

Application available at: `http://localhost:5173`

---

### 🌐 Production Deployment

For production deployment to Azure Container Apps or other cloud platforms, see the included GitHub Actions workflows in `.github/workflows/`:

- `deploy.yml` - Production deployment
- `deploy-stage.yml` - Staging deployment

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
3. **API Proxy**: Frontend dev server proxies `/api` requests to backend (port 3001)
4. **Environment Variables**: Keep `.env` files out of git with `.gitignore`
5. **PDF Generation**: Works locally if Chromium is installed (Puppeteer auto-downloads)

### Testing Docker Build Locally

```bash
# Build image
docker build -t insightops:test .

# Run container
docker run -p 8000:8000 --env-file .env insightops:test

# Test health check
curl http://localhost:8000/api/health

# View logs
docker logs <container-id>
```

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

**❌ Production Filters Not Working**

- Verify filters are enabled in Settings → Organizations → Production Filters
- Check pattern syntax (exact match or wildcard with `*`)
- Ensure "Production Only Report" toggle is ON when generating reports
- Review logs for filter matching: `[ActivityReport] Filtered X/Y (production only)`
- Empty filter arrays will include all items (not exclude all)

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

---
