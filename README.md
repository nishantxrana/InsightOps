# Azure DevOps Monitoring Agent

<div align="center">

![Azure DevOps Agent](https://img.shields.io/badge/Azure%20DevOps-Agent-blue?style=for-the-badge&logo=azure-devops)
![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js)
![React](https://img.shields.io/badge/React-18+-blue?style=for-the-badge&logo=react)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

**An AI-powered monitoring and automation platform for Azure DevOps with intelligent insights, automated notifications, and enhanced development workflows.**

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [API](#-api-reference) • [Contributing](#-contributing)

</div>

---

## 🚀 Features

### 🤖 Multi-Provider AI Integration
- **OpenAI GPT Models**: GPT-3.5-turbo, GPT-4, GPT-4o-mini
- **Groq Models**: Llama-3-8b-instant, Llama-3-70b-versatile, Mixtral-8x7b-32768  
- **Google Gemini**: Gemini-1.5-pro, Gemini-1.5-flash, Gemini-2.0-flash
- Dynamic provider switching from frontend settings
- Runtime configuration without application restart

### 🔧 Azure DevOps Integration
- **Work Items Monitoring**: Current sprint tracking and AI-powered summaries
- **Build Pipeline Monitoring**: Build status tracking and failure analysis
- **Pull Request Management**: Active PR monitoring and idle PR detection
- **Webhook Support**: Real-time notifications for builds, pull requests, and work items
- **Polling Mechanisms**: Configurable intervals for continuous monitoring

### 📢 Multi-Platform Notifications
- **Microsoft Teams**: Rich card notifications with build status and AI analysis
- **Google Chat**: Formatted notifications with specific markdown compatibility
- **Slack**: Comprehensive notification support
- **Configurable Intervals**: Customizable polling schedules for different resources

### 🧠 Intelligent Analytics
- **Sprint Summaries**: AI-generated insights on current sprint progress
- **Work Item Analysis**: Automated categorization and progress tracking
- **Build Failure Analysis**: Intelligent analysis of pipeline failures with specific fixes
- **Pull Request Insights**: Idle PR detection and review recommendations

### 🎨 Modern UI/UX
- **Responsive Design**: Built with React, Tailwind CSS, and shadcn/ui components
- **Collapsible Sidebar**: Professional navigation with smooth animations
- **Real-time Status**: Live connection indicators and health monitoring
- **Dark/Light Mode**: Adaptive theming support

---

## 🏗️ Architecture

```
├── backend/                    # Node.js/Express API Server
│   ├── ai/                    # Multi-provider AI integration
│   ├── api/                   # REST API endpoints
│   ├── config/                # Configuration management
│   ├── devops/                # Azure DevOps client
│   ├── notifications/         # Multi-platform notifications
│   ├── polling/               # Background monitoring jobs
│   ├── utils/                 # Utility functions
│   ├── webhooks/              # Real-time event handlers
│   └── main.js               # Application entry point
│
├── frontend/                   # React/Vite Frontend
│   ├── src/
│   │   ├── components/        # React components (shadcn/ui)
│   │   ├── pages/            # Application pages
│   │   ├── contexts/         # React contexts
│   │   ├── hooks/            # Custom React hooks
│   │   └── api/              # API client functions
│   └── dist/                 # Production build
│
└── docs/                      # Documentation
```

---

## ⚡ Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Azure DevOps** organization and Personal Access Token
- **AI Provider API Key** (OpenAI, Groq, or Google Gemini)

### 🚀 One-Command Setup

```bash
# Clone the repository
git clone https://github.com/your-username/azure-devops-monitoring-agent.git
cd azure-devops-monitoring-agent

# Install dependencies for both backend and frontend
npm run install:all

# Configure environment variables
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration

# Start development servers
npm run dev
```

### 📋 Manual Setup

#### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Configure your .env file (see Configuration section)
npm run dev  # Development with hot reload
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev  # Development server on http://localhost:5173
```

#### 3. Production Build
```bash
# Build frontend for production
cd frontend && npm run build

# Start production server
cd backend && npm start
```

---

## ⚙️ Configuration

### Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure:

#### Azure DevOps (Required)
```env
AZURE_DEVOPS_ORG=your-organization
AZURE_DEVOPS_PROJECT=your-project
AZURE_DEVOPS_PAT=your-personal-access-token
AZURE_DEVOPS_BASE_URL=https://dev.azure.com
```

#### AI Configuration (Required - Choose One)
```env
# OpenAI
OPENAI_API_KEY=sk-...
AI_MODEL=gpt-4o-mini

# Groq
GROQ_API_KEY=gsk_...
AI_MODEL=llama-3-8b-instant

# Google Gemini
GEMINI_API_KEY=AI...
AI_MODEL=gemini-2.0-flash
```

#### Notifications (Optional)
```env
TEAMS_WEBHOOK_URL=https://your-teams-webhook-url
SLACK_WEBHOOK_URL=https://your-slack-webhook-url
GOOGLE_CHAT_WEBHOOK_URL=https://chat.googleapis.com/v1/spaces/...
NOTIFICATIONS_ENABLED=true
```

#### Polling Configuration
```env
# Cron expressions for monitoring intervals
WORK_ITEMS_POLL_INTERVAL=0 */10 * * *    # Every 10 hours
PIPELINE_POLL_INTERVAL=0 */10 * * *       # Every 10 hours
PR_POLL_INTERVAL=0 */10 * * *             # Every 10 hours
```

### 🔐 Security Configuration
```env
WEBHOOK_SECRET=change-me-in-production
API_TOKEN=change-me-in-production
ENCRYPTION_KEY=your-32-character-encryption-key
```

---

## 🔧 Setup Guides

### Azure DevOps Personal Access Token

1. Go to **Azure DevOps** → **User Settings** → **Personal Access Tokens**
2. Click **New Token**
3. Set **Scopes**:
   - ✅ Work Items (Read)
   - ✅ Build (Read)
   - ✅ Code (Read)
   - ✅ Pull Request (Read)
4. Copy the generated token to `AZURE_DEVOPS_PAT`

### AI Provider Setup

#### OpenAI
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create new API key
3. Add to `.env`: `OPENAI_API_KEY=sk-...`

#### Groq
1. Visit [Groq Console](https://console.groq.com/keys)
2. Create new API key
3. Add to `.env`: `GROQ_API_KEY=gsk_...`

#### Google Gemini
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create new API key
3. Add to `.env`: `GEMINI_API_KEY=AI...`

### Webhook Configuration

#### Azure DevOps Webhooks
1. **Project Settings** → **Service Hooks**
2. **Create Subscription** for:
   - Build completed events
   - Pull request events  
   - Work item events
3. **Webhook URL**: `https://your-domain.com/api/webhooks/azure-devops`

#### Notification Webhooks

**Microsoft Teams:**
1. Teams Channel → **Connectors** → **Incoming Webhook**
2. Copy webhook URL to `TEAMS_WEBHOOK_URL`

**Google Chat:**
1. Chat Space → **Manage webhooks** → **Add webhook**
2. Copy webhook URL to `GOOGLE_CHAT_WEBHOOK_URL`

**Slack:**
1. Slack App → **Incoming Webhooks** → **Add to Slack**
2. Copy webhook URL to `SLACK_WEBHOOK_URL`

---

## 📊 API Reference

### Health & Status
- `GET /api/health` - Application health check
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

### AI Configuration
- `GET /api/ai/providers` - List available AI providers
- `GET /api/ai/models/:provider` - Get models for specific provider
- `GET /api/ai/config` - Get current AI configuration

### Settings Management
- `GET /api/settings` - Get application settings
- `PUT /api/settings` - Update application settings
- `POST /api/settings/test-connection` - Test Azure DevOps connection

---

## 🤖 AI Analysis Features

### Build Failure Analysis
The system provides intelligent analysis of build failures:

- **Pipeline Type Detection**: Automatically identifies Classic vs YAML pipelines
- **Error Context Extraction**: Processes timeline data to identify failed jobs
- **Configuration Retrieval**: Fetches YAML pipeline configuration when available
- **Solution Generation**: Provides specific fixes for common issues

### Supported Analysis Types
- **Compilation Errors**: Code syntax and dependency issues
- **Test Failures**: Unit test and integration test problems
- **Deployment Issues**: Infrastructure and configuration problems
- **Pipeline Configuration**: YAML syntax and structure issues

---

## 🔄 Workflow Integration

### Automated Notifications
- **Build Completion**: Automatic notifications to configured channels
- **Failure Analysis**: AI analysis triggered for failed builds
- **Pull Request Updates**: Notifications for PR status changes
- **Work Item Changes**: Updates on work item modifications

### Monitoring Options
- **Webhooks**: Real-time notifications (recommended)
- **Polling**: Fallback mechanism with configurable intervals

---

## 🚀 Deployment

### Docker Deployment

```dockerfile
# Dockerfile example
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001
CMD ["npm", "start"]
```

### Environment Variables for Production
```env
NODE_ENV=production
PORT=3001
LOG_LEVEL=warn
WEBHOOK_SECRET=secure-random-string
API_TOKEN=secure-api-token
ENCRYPTION_KEY=32-character-encryption-key
```

---

## 🧪 Development

### Running Tests
```bash
# Backend tests
cd backend && npm test

# Frontend tests  
cd frontend && npm test

# Run all tests
npm run test:all
```

### Development Scripts
```bash
# Install all dependencies
npm run install:all

# Start both backend and frontend in development
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Format code
npm run format
```

### Project Structure
```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── Layout.jsx       # Main layout with sidebar
│   ├── DevOpsAppSidebar.jsx  # Custom sidebar
│   └── ...
├── pages/               # Route components
├── contexts/            # React contexts
├── hooks/               # Custom hooks
└── api/                 # API client functions
```

---

## 🔒 Security

### Best Practices
- **Environment Variables**: Store sensitive data in `.env` files
- **API Keys**: Never commit API keys to version control
- **Webhooks**: Validate incoming webhook signatures
- **Rate Limiting**: Built-in protection against API abuse
- **CORS**: Configured for secure cross-origin requests

### Security Headers
```javascript
// Helmet.js security headers
app.use(helmet({
  contentSecurityPolicy: false, // Configure as needed
  crossOriginEmbedderPolicy: false
}))
```

---

## 📝 Logging and Monitoring

### Log Files
- `backend/logs/combined.log` - All application logs
- `backend/logs/error.log` - Error-specific logs
- `backend/logs/exceptions.log` - Unhandled exceptions

### Monitoring Endpoints
- `GET /api/health` - Application health check
- `GET /api/logs` - Recent application logs
- Connection status indicator in UI

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests for new functionality
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Style
- ESLint configuration for JavaScript/React
- Prettier for code formatting
- Conventional commits for commit messages

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support & Troubleshooting

### Common Issues

**Connection Issues:**
1. Verify Azure DevOps PAT has correct permissions
2. Check organization and project names
3. Ensure network connectivity to Azure DevOps

**AI Provider Issues:**
1. Verify API key is valid and has credits
2. Check model name matches provider's available models
3. Review rate limiting and quota restrictions

**Build Analysis Issues:**
1. Ensure build has failed status
2. Check pipeline permissions for timeline access
3. Verify YAML pipeline configuration access

### Getting Help
- 📖 Check the [Documentation](docs/)
- 🐛 Report bugs via [GitHub Issues](https://github.com/your-username/azure-devops-monitoring-agent/issues)
- 💬 Join our [Discord Community](https://discord.gg/your-invite)
- 📧 Email support: support@your-domain.com

### Debug Mode
```env
LOG_LEVEL=debug
NODE_ENV=development
```

---

## 🔮 Roadmap

- [ ] **Enhanced AI Providers**: Claude, Cohere integration
- [ ] **Advanced Analytics**: Custom dashboards and metrics
- [ ] **Multi-tenant Support**: Organization-level isolation
- [ ] **Mobile App**: React Native companion app
- [ ] **Plugin System**: Extensible architecture for custom integrations
- [ ] **Advanced Security**: SSO, RBAC, audit logging
- [ ] **Performance Optimization**: Caching, database optimization
- [ ] **Kubernetes Deployment**: Helm charts and operators

---

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- [Azure DevOps REST API](https://docs.microsoft.com/en-us/rest/api/azure/devops/) for comprehensive integration
- [OpenAI](https://openai.com/), [Groq](https://groq.com/), and [Google](https://ai.google.dev/) for AI capabilities
- The open-source community for inspiration and contributions

---

<div align="center">

**Made with ❤️ by the DevOps Agent Team**

[⭐ Star this repo](https://github.com/your-username/azure-devops-monitoring-agent) • [🐛 Report Bug](https://github.com/your-username/azure-devops-monitoring-agent/issues) • [✨ Request Feature](https://github.com/your-username/azure-devops-monitoring-agent/issues)

</div>
