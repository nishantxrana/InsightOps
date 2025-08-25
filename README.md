# Azure DevOps Monitoring Agent

An AI-powered monitoring and automation platform for Azure DevOps that provides intelligent insights, automated notifications, and enhanced development workflows through multiple AI providers.

## 🚀 Features

### Multi-Provider AI Integration
- **OpenAI GPT Models**: GPT-3.5-turbo, GPT-4, GPT-4-turbo
- **Groq Models**: Llama-3-8b-instant, Llama-3-70b-versatile, Mixtral-8x7b-32768  
- **Google Gemini**: Gemini-1.5-pro, Gemini-1.5-flash, Gemini-pro-vision
- Dynamic provider switching from frontend settings
- Runtime configuration without application restart

### Azure DevOps Integration
- **Work Items Monitoring**: Current sprint tracking and AI-powered summaries
- **Build Pipeline Monitoring**: Build status tracking and failure analysis
- **Pull Request Management**: Active PR monitoring and idle PR detection
- **Webhook Support**: Real-time notifications for builds, pull requests, and work items
- **Polling Mechanisms**: Configurable intervals for continuous monitoring

### Multi-Platform Notifications
- **Microsoft Teams**: Rich card notifications with build status and AI analysis
- **Google Chat**: Formatted notifications with specific markdown compatibility
- **Slack**: Comprehensive notification support
- **Configurable Intervals**: Customizable polling schedules for different resources

### Intelligent Analytics
- **Sprint Summaries**: AI-generated insights on current sprint progress
- **Work Item Analysis**: Automated categorization and progress tracking
- **Build Failure Analysis**: Intelligent analysis of pipeline failures
- **Pull Request Insights**: Idle PR detection and review recommendations

## 🏗️ Architecture

### Backend Components
```
backend/
├── ai/                     # AI service integration
│   └── aiService.js       # Multi-provider AI client management
├── api/                   # REST API endpoints
│   └── routes.js         # Main API routes
├── config/               # Configuration management
│   ├── settings.js       # Application settings and validation
│   ├── aiModels.js      # AI model configurations
│   └── env.js           # Environment configuration
├── devops/              # Azure DevOps integration
│   └── azureDevOpsClient.js
├── notifications/       # Multi-platform notifications
│   └── notificationService.js
├── polling/            # Resource monitoring
│   ├── buildPoller.js
│   ├── workItemPoller.js
│   ├── pullRequestPoller.js
│   └── index.js        # Polling orchestration
├── utils/              # Utility functions
│   ├── markdownFormatter.js
│   ├── logger.js
│   └── errorHandler.js
├── webhooks/           # Webhook handlers
│   ├── buildWebhook.js
│   ├── workItemWebhook.js
│   ├── pullRequestWebhook.js
│   └── routes.js       # Webhook routes
└── main.js            # Application entry point
```

### Frontend Components
```
frontend/
├── src/
│   ├── components/     # React components
│   ├── contexts/      # React contexts
│   ├── pages/         # Application pages
│   ├── api/          # API client functions
│   ├── styles/       # Tailwind CSS styling
│   ├── App.jsx       # Main application component
│   └── main.jsx      # Application entry point
├── dist/             # Production build
└── package.json      # Frontend dependencies
```

## 🛠️ Installation

### Prerequisites
- Node.js 16+ and npm
- Azure DevOps organization and Personal Access Token
- At least one AI provider API key (OpenAI, Groq, or Google Gemini)

### Quick Start with Development Script
1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd js-devops-agent
   ```

2. **Configure environment variables**:
   ```bash
   cp backend/.env.example backend/.env
   ```

3. **Edit `backend/.env` with your configuration**:
   ```env
   # Azure DevOps Configuration
   AZURE_DEVOPS_ORG=your-organization
   AZURE_DEVOPS_PROJECT=your-project
   AZURE_DEVOPS_PAT=your-personal-access-token
   AZURE_DEVOPS_BASE_URL=https://dev.azure.com

   # AI Configuration
   AI_PROVIDER=openai
   OPENAI_API_KEY=your-openai-api-key
   GROQ_API_KEY=your-groq-api-key
   GEMINI_API_KEY=your-gemini-api-key
   AI_MODEL=gpt-3.5-turbo

   # Notification Configuration
   TEAMS_WEBHOOK_URL=https://your-teams-webhook-url
   SLACK_WEBHOOK_URL=https://your-slack-webhook-url
   GOOGLE_CHAT_WEBHOOK_URL=https://chat.googleapis.com/v1/spaces/SPACE_ID/messages
   NOTIFICATIONS_ENABLED=true

   # Polling Configuration (cron expressions)
   WORK_ITEMS_POLL_INTERVAL=*/15 * * * *
   PIPELINE_POLL_INTERVAL=*/10 * * * *
   PR_POLL_INTERVAL=0 */2 * * *
   OVERDUE_CHECK_INTERVAL=0 9 * * *

   # Application Configuration
   PORT=3001
   NODE_ENV=development
   LOG_LEVEL=info
   FRONTEND_URL=http://localhost:5173
   ```

4. **Install dependencies and start the application**:
   ```bash
   # Install backend dependencies
   cd backend && npm install && cd ..
   
   # Install frontend dependencies
   cd frontend && npm install && cd ..
   
   # Start both backend and frontend
   ./start-dev.sh
   ```

### Manual Setup
If you prefer to start services manually:

#### Backend Setup
```bash
cd backend
npm install
npm run dev  # Development mode with hot reload
# or
npm start    # Production mode
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev  # Development server
# or
npm run build && npm run preview  # Production build
```

## 🔧 Configuration

### AI Provider Setup

#### OpenAI
1. Get API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Add to `.env`: `OPENAI_API_KEY=sk-...`

#### Groq
1. Get API key from [Groq Console](https://console.groq.com/keys)
2. Add to `.env`: `GROQ_API_KEY=gsk_...`

#### Google Gemini
1. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add to `.env`: `GEMINI_API_KEY=AI...`

### Azure DevOps Webhooks
1. **Navigate to Project Settings** → Service Hooks
2. **Create webhook subscriptions** for:
   - Build completed events
   - Pull request events
   - Work item events
3. **Set webhook URL**: `http://your-server:3000/api/webhooks/azure-devops`

### Notification Channels

#### Microsoft Teams
1. Create incoming webhook in Teams channel
2. Add URL to `TEAMS_WEBHOOK_URL` in `.env`

#### Google Chat
1. Create webhook in Google Chat space
2. Add URL to `GOOGLE_CHAT_WEBHOOK_URL` in `.env`

#### Slack
1. Create incoming webhook in Slack workspace
2. Add URL to `SLACK_WEBHOOK_URL` in `.env`

## 📊 API Endpoints

### Health & Status
- `GET /api/health` - Application health check

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

### AI Configuration
- `GET /api/ai/providers` - List available AI providers
- `GET /api/ai/models/:provider` - Get models for specific provider
- `GET /api/ai/config` - Get current AI configuration

### Settings Management
- `GET /api/settings` - Get application settings
- `PUT /api/settings` - Update application settings
- `POST /api/settings/test-connection` - Test Azure DevOps connection

### Webhooks
- `POST /api/webhooks/azure-devops` - Webhook endpoint for Azure DevOps events

### Logs
- `GET /api/logs` - Get application logs

## 🤖 AI Analysis Features

### Build Failure Analysis
The system provides intelligent analysis of build failures by:

1. **Detecting Pipeline Type**: Automatically identifies Classic vs YAML pipelines
2. **Extracting Error Context**: Processes timeline data to identify failed jobs and error messages
3. **Retrieving Configuration**: Fetches YAML pipeline configuration when available
4. **Generating Solutions**: Provides specific fixes for YAML pipelines or general guidance for Classic pipelines

### Supported Analysis Types
- **Compilation Errors**: Code syntax and dependency issues
- **Test Failures**: Unit test and integration test problems
- **Deployment Issues**: Infrastructure and configuration problems
- **Pipeline Configuration**: YAML syntax and structure issues

## 🔄 Workflow Integration

### Automated Notifications
1. **Build Completion**: Automatic notifications sent to configured channels
2. **Failure Analysis**: AI analysis triggered for failed builds
3. **Pull Request Updates**: Notifications for PR status changes
4. **Work Item Changes**: Updates on work item modifications

### Polling vs Webhooks
- **Webhooks**: Real-time notifications (recommended)
- **Polling**: Fallback mechanism for environments without webhook support

## 🚀 Development

### Running in Development Mode
```bash
# Backend with hot reload
cd backend && npm run dev

# Frontend with hot reload
cd frontend && npm run dev

# Or use the development script
./start-dev.sh
```

### Testing
```bash
# Run backend tests
cd backend && npm test

# Run frontend tests
cd frontend && npm test
```

### Building for Production
```bash
# Build frontend
cd frontend && npm run build

# Start production server
cd backend && npm start
```

## 🔒 Security Considerations

- **API Keys**: Store securely in environment variables
- **Webhooks**: Validate incoming webhook signatures
- **Rate Limiting**: Built-in protection against API abuse
- **CORS**: Configured for secure cross-origin requests

## 📝 Logging and Monitoring

### Log Files
- `backend/logs/combined.log` - All application logs
- `backend/logs/error.log` - Error-specific logs
- `backend/logs/exceptions.log` - Unhandled exceptions

### Monitoring Endpoints
- `GET /api/health` - Application health check
- `GET /api/status` - Detailed system status

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check the logs in `backend/logs/`
2. Verify environment configuration
3. Test API endpoints manually
4. Review Azure DevOps webhook configuration

## 🔮 Roadmap

- [ ] Additional AI provider integrations
- [ ] Advanced analytics dashboard
- [ ] Custom notification templates
- [ ] Multi-tenant support
- [ ] Enhanced security features
- [ ] Performance optimization
- [ ] Mobile application support
