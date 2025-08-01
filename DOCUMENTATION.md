# AI-Powered Azure DevOps Monitoring Agent - Complete Documentation

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Components Deep Dive](#components-deep-dive)
4. [Data Flow](#data-flow)
5. [Setup & Installation](#setup--installation)
6. [Configuration](#configuration)
7. [API Reference](#api-reference)
8. [Frontend Guide](#frontend-guide)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)
11. [Development Guide](#development-guide)

---

## 🎯 Project Overview

The AI-Powered Azure DevOps Monitoring Agent is a comprehensive monitoring solution that provides real-time insights into your Azure DevOps projects. It combines webhook-based real-time monitoring with intelligent AI analysis to deliver actionable insights about work items, builds, and pull requests.

### Key Features

- **Real-time Monitoring**: Webhook-based instant notifications for Azure DevOps events
- **AI-Powered Insights**: Intelligent summaries and analysis using OpenAI/Groq
- **Multi-channel Notifications**: Teams and Slack integration
- **Comprehensive Dashboard**: React-based frontend for monitoring and configuration
- **Background Polling**: Scheduled jobs for overdue items and periodic checks
- **Secure & Scalable**: Production-ready with security best practices

### Technology Stack

**Backend:**
- Node.js 18+ with Express.js
- Azure DevOps REST APIs & Webhooks
- OpenAI / Groq SDK for AI features
- Winston for structured logging
- Node-cron for scheduled tasks
- Joi for configuration validation

**Frontend:**
- React 18 with Vite build tool
- React Router for navigation
- Tailwind CSS for styling
- Axios for API communication
- Lucide React for icons

---

## 🏗️ Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Azure DevOps  │    │  Monitoring     │    │   Frontend      │
│                 │    │  Agent          │    │   Dashboard     │
│  - Work Items   │◄──►│                 │◄──►│                 │
│  - Pipelines    │    │  - Webhooks     │    │  - React App    │
│  - Pull Requests│    │  - Polling      │    │  - Settings     │
│  - Repositories │    │  - AI Service   │    │  - Logs View    │
└─────────────────┘    │  - Notifications│    │  - Monitoring   │
                       └─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐
                       │   External      │
                       │   Services      │
                       │                 │
                       │  - OpenAI/Groq  │
                       │  - Teams/Slack  │
                       └─────────────────┘
```

### Component Architecture

```
Backend (Node.js/Express)
├── main.js                    # Application entry point
├── config/
│   ├── settings.js           # Configuration management
│   └── env.js               # Environment variables
├── webhooks/
│   ├── index.js             # Webhook router
│   ├── workItemWebhook.js   # Work item event handlers
│   ├── buildWebhook.js      # Build event handlers
│   └── pullRequestWebhook.js # PR event handlers
├── polling/
│   ├── index.js             # Polling job manager
│   ├── workItemPoller.js    # Work item polling
│   ├── buildPoller.js       # Build polling
│   └── pullRequestPoller.js # PR polling
├── devops/
│   └── azureDevOpsClient.js # Azure DevOps API client
├── ai/
│   └── aiService.js         # AI integration service
├── notifications/
│   └── notificationService.js # Teams/Slack notifications
├── api/
│   └── routes.js            # REST API endpoints
└── utils/
    ├── logger.js            # Winston logging
    ├── errorHandler.js      # Error handling
    ├── markdownFormatter.js # Message formatting
    └── webhookValidator.js  # Webhook security

Frontend (React/Vite)
├── src/
│   ├── main.jsx             # React entry point
│   ├── App.jsx              # Main app component
│   ├── components/
│   │   ├── Layout.jsx       # App layout with navigation
│   │   ├── LoadingSpinner.jsx
│   │   └── ErrorMessage.jsx
│   ├── pages/
│   │   ├── Dashboard.jsx    # Main dashboard
│   │   ├── Settings.jsx     # Configuration page
│   │   ├── Logs.jsx         # Logs viewer
│   │   ├── WorkItems.jsx    # Work items page
│   │   ├── Pipelines.jsx    # Pipelines page
│   │   └── PullRequests.jsx # PR page
│   ├── api/
│   │   └── apiService.js    # Backend API client
│   └── styles/
│       └── index.css        # Tailwind CSS
```

---

## 🔧 Components Deep Dive

### Backend Components

#### 1. Main Application (`main.js`)
- **Purpose**: Express server setup and initialization
- **Key Features**:
  - Security middleware (Helmet, CORS, Rate limiting)
  - Request logging and error handling
  - Health check endpoint
  - Graceful shutdown handling
  - Configuration validation
  - Polling jobs initialization

#### 2. Configuration System (`config/`)
- **settings.js**: Joi-based configuration validation and management
- **env.js**: Environment variable loading
- **Features**:
  - Type-safe configuration
  - Environment-specific settings
  - Validation with detailed error messages
  - Centralized configuration access

#### 3. Azure DevOps Client (`devops/azureDevOpsClient.js`)
- **Purpose**: Centralized Azure DevOps API integration
- **Key Methods**:
  - `testConnection()`: Validates Azure DevOps connectivity
  - `getWorkItems()`: Fetches work items by IDs
  - `queryWorkItems()`: Executes WIQL queries
  - `getCurrentSprintWorkItems()`: Gets current sprint items
  - `getOverdueWorkItems()`: Finds overdue items
  - `getBuild()`, `getBuildTimeline()`, `getBuildLogs()`: Build operations
  - `getPullRequests()`, `getIdlePullRequests()`: PR operations

#### 4. AI Service (`ai/aiService.js`)
- **Purpose**: AI-powered analysis and summarization
- **Providers**: OpenAI and Groq support
- **Key Methods**:
  - `summarizeWorkItem()`: Creates work item summaries
  - `summarizeBuildFailure()`: Analyzes build failures
  - `summarizePullRequest()`: Generates PR changelogs
  - `summarizeSprintWorkItems()`: Sprint progress insights

#### 5. Webhook System (`webhooks/`)
- **Purpose**: Real-time event processing from Azure DevOps
- **Security**: Signature validation and request logging
- **Event Types**:
  - Work item created/updated
  - Build completed
  - Pull request created/updated

#### 6. Polling System (`polling/`)
- **Purpose**: Background monitoring and scheduled tasks
- **Jobs**:
  - Work items polling (every 15 minutes)
  - Build polling (every 10 minutes)
  - PR polling (every 2 hours)
  - Overdue check (daily at 9 AM)

#### 7. Notification Service (`notifications/notificationService.js`)
- **Purpose**: Multi-channel notification delivery
- **Channels**: Microsoft Teams and Slack
- **Features**:
  - Markdown formatting
  - Color-coded messages by event type
  - Retry logic and error handling

### Frontend Components

#### 1. Layout System (`components/Layout.jsx`)
- **Purpose**: Main application layout with navigation
- **Features**:
  - Responsive sidebar navigation
  - Active route highlighting
  - Mobile-friendly design

#### 2. Dashboard (`pages/Dashboard.jsx`)
- **Purpose**: Main monitoring overview
- **Features**:
  - Real-time status cards
  - Recent activity feed
  - Quick action buttons
  - System health indicators

#### 3. Settings Page (`pages/Settings.jsx`)
- **Purpose**: Configuration management interface
- **Features**:
  - Azure DevOps configuration
  - AI provider settings
  - Notification channel setup
  - Connection testing
  - Secure credential storage

#### 4. Monitoring Pages
- **Work Items**: Current sprint view, overdue tracking
- **Pipelines**: Build status, failure analysis
- **Pull Requests**: Active PRs, idle detection
- **Logs**: Real-time log viewer with filtering

---

## 🔄 Data Flow

### 1. Real-time Webhook Flow

```
Azure DevOps Event → Webhook Endpoint → Event Processing → AI Analysis → Notification
```

**Detailed Steps:**
1. Azure DevOps triggers webhook on event (work item update, build completion, etc.)
2. Webhook endpoint receives and validates the request
3. Event-specific handler processes the payload
4. AI service analyzes the event (if applicable)
5. Notification service sends formatted message to Teams/Slack
6. Event is logged for audit trail

### 2. Polling Flow

```
Cron Schedule → API Query → Data Processing → Change Detection → Notification
```

**Detailed Steps:**
1. Cron job triggers at scheduled interval
2. Azure DevOps API is queried for latest data
3. Data is processed and compared with previous state
4. Changes are detected and categorized
5. AI analysis is performed on significant changes
6. Notifications are sent for important updates

### 3. Frontend Data Flow

```
User Action → API Request → Backend Processing → Response → UI Update
```

**Detailed Steps:**
1. User interacts with frontend (settings change, data request)
2. Frontend makes API call to backend
3. Backend processes request (validation, Azure DevOps API calls)
4. Response is formatted and returned
5. Frontend updates UI with new data

---

## 🚀 Setup & Installation

### Prerequisites

- Node.js 18+ and npm
- Azure DevOps organization and project access
- Azure DevOps Personal Access Token (PAT)
- OpenAI API key or Groq API key (optional)
- Microsoft Teams or Slack webhook URL (optional)

### Step 1: Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd js-devops-agent

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
cd ..
```

### Step 2: Backend Configuration

```bash
# Copy environment template
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your configuration:

```env
# Azure DevOps Configuration
AZURE_DEVOPS_ORG=your-organization
AZURE_DEVOPS_PROJECT=your-project
AZURE_DEVOPS_PAT=your-personal-access-token
AZURE_DEVOPS_BASE_URL=https://dev.azure.com

# AI Configuration (choose one provider)
AI_PROVIDER=openai
OPENAI_API_KEY=your-openai-api-key
# OR
# AI_PROVIDER=groq
# GROQ_API_KEY=your-groq-api-key
AI_MODEL=gpt-3.5-turbo

# Notification Configuration
TEAMS_WEBHOOK_URL=https://your-teams-webhook-url
SLACK_WEBHOOK_URL=https://your-slack-webhook-url
NOTIFICATIONS_ENABLED=true

# Polling Configuration (cron expressions)
WORK_ITEMS_POLL_INTERVAL=*/15 * * * *
PIPELINE_POLL_INTERVAL=*/10 * * * *
PR_POLL_INTERVAL=0 */2 * * *
OVERDUE_CHECK_INTERVAL=0 9 * * *

# Security Configuration
WEBHOOK_SECRET=your-webhook-secret
API_TOKEN=your-api-token

# Application Configuration
PORT=3001
NODE_ENV=development
LOG_LEVEL=info
FRONTEND_URL=http://localhost:5173
```

### Step 3: Start the Application

**Option 1: Using the start script (Recommended)**
```bash
./start-dev.sh
```

**Option 2: Manual start**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Step 4: Access the Application

- **Frontend Dashboard**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

### Step 5: Configure Azure DevOps Webhooks

1. Go to your Azure DevOps project
2. Navigate to Project Settings → Service hooks
3. Create webhooks for the following events:

| Event Type | URL | Description |
|------------|-----|-------------|
| Work item created | `http://your-domain:3001/api/webhooks/workitem/created` | New work items |
| Work item updated | `http://your-domain:3001/api/webhooks/workitem/updated` | Work item changes |
| Build completed | `http://your-domain:3001/api/webhooks/build/completed` | Build results |
| Pull request created | `http://your-domain:3001/api/webhooks/pullrequest/created` | New PRs |
| Pull request updated | `http://your-domain:3001/api/webhooks/pullrequest/updated` | PR changes |

---

## ⚙️ Configuration

### Environment Variables Reference

#### Azure DevOps Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `AZURE_DEVOPS_ORG` | Yes | Azure DevOps organization name | `mycompany` |
| `AZURE_DEVOPS_PROJECT` | Yes | Project name | `MyProject` |
| `AZURE_DEVOPS_PAT` | Yes | Personal Access Token | `abcd1234...` |
| `AZURE_DEVOPS_BASE_URL` | No | Base URL for Azure DevOps | `https://dev.azure.com` |

#### AI Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `AI_PROVIDER` | No | AI provider (`openai` or `groq`) | `openai` |
| `OPENAI_API_KEY` | Conditional | OpenAI API key (if using OpenAI) | `sk-...` |
| `GROQ_API_KEY` | Conditional | Groq API key (if using Groq) | `gsk_...` |
| `AI_MODEL` | No | AI model to use | `gpt-3.5-turbo` |

#### Notification Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `TEAMS_WEBHOOK_URL` | No | Microsoft Teams webhook URL | `https://outlook.office.com/webhook/...` |
| `SLACK_WEBHOOK_URL` | No | Slack webhook URL | `https://hooks.slack.com/services/...` |
| `NOTIFICATIONS_ENABLED` | No | Enable/disable notifications | `true` |

#### Polling Configuration

| Variable | Default | Description | Format |
|----------|---------|-------------|--------|
| `WORK_ITEMS_POLL_INTERVAL` | `*/15 * * * *` | Work items polling frequency | Cron expression |
| `PIPELINE_POLL_INTERVAL` | `*/10 * * * *` | Pipeline polling frequency | Cron expression |
| `PR_POLL_INTERVAL` | `0 */2 * * *` | Pull request polling frequency | Cron expression |
| `OVERDUE_CHECK_INTERVAL` | `0 9 * * *` | Overdue items check frequency | Cron expression |

#### Security Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `WEBHOOK_SECRET` | No | Secret for webhook signature validation | `your-secret-key` |
| `API_TOKEN` | No | API authentication token | `your-api-token` |

#### Application Configuration

| Variable | Default | Description | Example |
|----------|---------|-------------|---------|
| `PORT` | `3001` | Backend server port | `3001` |
| `NODE_ENV` | `development` | Environment mode | `production` |
| `LOG_LEVEL` | `info` | Logging level | `debug` |
| `FRONTEND_URL` | `http://localhost:5173` | Frontend URL for CORS | `https://your-domain.com` |

### Azure DevOps Personal Access Token Setup

1. Go to Azure DevOps → User Settings → Personal Access Tokens
2. Click "New Token"
3. Configure the token with these scopes:
   - **Work Items**: Read & Write
   - **Build**: Read
   - **Code**: Read
   - **Pull Request**: Read
4. Copy the generated token to your `.env` file

### AI Provider Setup

#### OpenAI Setup
1. Visit https://platform.openai.com/api-keys
2. Create a new API key
3. Set `AI_PROVIDER=openai` and `OPENAI_API_KEY=your-key`

#### Groq Setup
1. Visit https://console.groq.com/keys
2. Create a new API key
3. Set `AI_PROVIDER=groq` and `GROQ_API_KEY=your-key`

### Notification Channel Setup

#### Microsoft Teams
1. Go to your Teams channel
2. Click "..." → Connectors → Incoming Webhook
3. Configure the webhook and copy the URL
4. Set `TEAMS_WEBHOOK_URL=your-webhook-url`

#### Slack
1. Go to your Slack workspace
2. Create an Incoming Webhook app
3. Configure the webhook and copy the URL
4. Set `SLACK_WEBHOOK_URL=your-webhook-url`

---

## 📚 API Reference

### Authentication

All API endpoints require authentication via the `Authorization` header:

```bash
Authorization: Bearer your-api-token
```

### Health Check

#### GET /health
Returns application health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600
}
```

### Settings API

#### GET /api/settings
Get current configuration settings.

**Response:**
```json
{
  "azureDevOps": {
    "organization": "myorg",
    "project": "myproject",
    "configured": true
  },
  "ai": {
    "provider": "openai",
    "model": "gpt-3.5-turbo",
    "configured": true
  },
  "notifications": {
    "enabled": true,
    "teams": true,
    "slack": false
  }
}
```

#### POST /api/settings
Update configuration settings.

**Request Body:**
```json
{
  "azureDevOps": {
    "organization": "myorg",
    "project": "myproject",
    "personalAccessToken": "your-pat"
  },
  "ai": {
    "provider": "openai",
    "apiKey": "your-api-key",
    "model": "gpt-3.5-turbo"
  }
}
```

#### POST /api/settings/test-connection
Test Azure DevOps connection.

**Response:**
```json
{
  "success": true,
  "message": "Connection successful",
  "projectCount": 5
}
```

### Work Items API

#### GET /api/work-items/current-sprint
Get work items in the current sprint.

**Response:**
```json
{
  "count": 10,
  "value": [
    {
      "id": 123,
      "fields": {
        "System.Title": "Implement feature X",
        "System.State": "Active",
        "System.AssignedTo": {
          "displayName": "John Doe"
        }
      }
    }
  ]
}
```

#### GET /api/work-items/overdue
Get overdue work items.

#### POST /api/work-items/sprint-summary
Generate AI-powered sprint summary.

### Builds API

#### GET /api/builds/recent
Get recent builds.

**Query Parameters:**
- `top` (optional): Number of builds to return (default: 10)

#### GET /api/builds/:buildId
Get specific build details.

#### GET /api/builds/:buildId/timeline
Get build timeline.

#### GET /api/builds/:buildId/logs
Get build logs.

### Pull Requests API

#### GET /api/pull-requests
Get active pull requests.

#### GET /api/pull-requests/idle
Get idle pull requests (>48 hours without activity).

#### GET /api/pull-requests/:prId
Get specific pull request details.

### Logs API

#### GET /api/logs
Get application logs.

**Query Parameters:**
- `level` (optional): Filter by log level
- `limit` (optional): Number of logs to return
- `since` (optional): ISO timestamp to get logs since

**Response:**
```json
{
  "logs": [
    {
      "timestamp": "2024-01-01T12:00:00.000Z",
      "level": "info",
      "message": "Work item updated",
      "meta": {
        "workItemId": 123
      }
    }
  ]
}
```

### Polling API

#### GET /api/polling/status
Get polling jobs status.

**Response:**
```json
{
  "workItems": {
    "running": true,
    "scheduled": true
  },
  "builds": {
    "running": true,
    "scheduled": true
  }
}
```

#### POST /api/polling/start
Start polling jobs.

#### POST /api/polling/stop
Stop polling jobs.

### Webhook Endpoints

#### POST /api/webhooks/workitem/created
Handle work item created events.

#### POST /api/webhooks/workitem/updated
Handle work item updated events.

#### POST /api/webhooks/build/completed
Handle build completed events.

#### POST /api/webhooks/pullrequest/created
Handle pull request created events.

#### POST /api/webhooks/pullrequest/updated
Handle pull request updated events.

#### POST /api/webhooks/test
Test webhook endpoint.

**Request Body:**
```json
{
  "eventType": "test",
  "message": "Test webhook"
}
```

---
