# Azure DevOps Monitoring Agent - Complete Routes Documentation

## 📋 Table of Contents
1. [Overview](#overview)
2. [Route Architecture](#route-architecture)
3. [Health Check Routes](#health-check-routes)
4. [API Routes](#api-routes)
5. [Webhook Routes](#webhook-routes)
6. [Error Handling](#error-handling)
7. [Middleware Chain](#middleware-chain)
8. [Request/Response Examples](#requestresponse-examples)

---

## 🏗️ Overview

The Azure DevOps Monitoring Agent has **23 total routes** organized into three main categories:
- **1 Health Check Route** - Application status
- **12 API Routes** - Data retrieval and management
- **10 Webhook Routes** - Real-time event processing

**Base URL**: `http://localhost:3001`

---

## 🔧 Route Architecture

### Route Mounting Structure
```javascript
// main.js - Route mounting order
app.get('/health', healthHandler)           // Health check
app.use('/api/webhooks', webhookRoutes)     // Webhook routes
app.use('/api', apiRoutes)                  // API routes
app.use('*', notFoundHandler)               // 404 handler
```

### File Structure
```
backend/
├── main.js                    # Route mounting & health check
├── api/routes.js             # API endpoints (12 routes)
├── webhooks/index.js         # Webhook routing (10 routes)
├── webhooks/workItemWebhook.js    # Work item handlers
├── webhooks/buildWebhook.js       # Build handlers
└── webhooks/pullRequestWebhook.js # PR handlers
```

---

## 🏥 Health Check Routes

### 1. Application Health Check
**Route**: `GET /health`  
**File**: `backend/main.js:52-58`  
**Purpose**: Check application status and uptime

#### Request
```http
GET /health HTTP/1.1
Host: localhost:3001
```

#### Response
```json
{
  "status": "healthy",
  "timestamp": "2025-08-01T08:00:00.000Z",
  "uptime": 3600.123
}
```

#### Flow
1. **Start**: Direct route handler in main.js
2. **Process**: Get current timestamp and process uptime
3. **End**: Return JSON response with status

---

## 🔌 API Routes

**Base Path**: `/api`  
**File**: `backend/api/routes.js`  
**Middleware**: Request logging, error handling

### Work Items Routes (4 routes)

#### 1. Get Current Sprint Work Items
**Route**: `GET /api/work-items`  
**Line**: `backend/api/routes.js:8-24`

##### Request
```http
GET /api/work-items HTTP/1.1
Host: localhost:3001
```

##### Response Success (200)
```json
{
  "count": 3,
  "value": [
    {
      "id": 123,
      "fields": {
        "System.Title": "Implement user authentication",
        "System.State": "Active",
        "System.WorkItemType": "User Story",
        "System.AssignedTo": {
          "displayName": "John Doe"
        }
      }
    }
  ]
}
```

##### Response Error (401/404/500)
```json
{
  "error": "Failed to fetch work items",
  "details": "Unauthorized access",
  "suggestion": "Please check your Azure DevOps credentials"
}
```

##### Flow
1. **Start**: Express router handler
2. **Process**: `azureDevOpsClient.getCurrentSprintWorkItems()`
3. **Azure DevOps API**: `GET /{org}/{project}/_apis/wit/wiql`
4. **End**: Return work items or error response

---

#### 2. Get Sprint Summary with AI Analysis
**Route**: `GET /api/work-items/sprint-summary`  
**Line**: `backend/api/routes.js:26-48`

##### Request
```http
GET /api/work-items/sprint-summary HTTP/1.1
Host: localhost:3001
```

##### Response Success (200)
```json
{
  "total": 3,
  "active": 2,
  "completed": 1,
  "summary": "Sprint is progressing well with 2 active items...",
  "workItemsByState": {
    "Active": [
      {"id": 123, "title": "Implement authentication"}
    ],
    "Done": [
      {"id": 124, "title": "Setup database"}
    ]
  },
  "workItemsByAssignee": {
    "John Doe": [
      {"id": 123, "title": "Implement authentication"}
    ],
    "Unassigned": [
      {"id": 125, "title": "Write documentation"}
    ]
  }
}
```

##### Flow
1. **Start**: Express router handler
2. **Process**: 
   - `azureDevOpsClient.getCurrentSprintWorkItems()`
   - `aiService.summarizeSprintWorkItems(workItems)`
   - `groupWorkItemsByState(workItems)`
   - `groupWorkItemsByAssignee(workItems)`
3. **Azure DevOps API**: Work items query
4. **AI Service**: Generate summary using Groq/OpenAI
5. **End**: Return comprehensive sprint analysis

---

#### 3. Get Overdue Work Items
**Route**: `GET /api/work-items/overdue`  
**Line**: `backend/api/routes.js:50-66`

##### Request
```http
GET /api/work-items/overdue HTTP/1.1
Host: localhost:3001
```

##### Response Success (200)
```json
{
  "count": 1,
  "value": [
    {
      "id": 126,
      "fields": {
        "System.Title": "Fix critical bug",
        "System.DueDate": "2025-07-30T00:00:00Z",
        "System.State": "Active",
        "System.AssignedTo": {
          "displayName": "Jane Smith"
        }
      },
      "daysOverdue": 2
    }
  ]
}
```

##### Flow
1. **Start**: Express router handler
2. **Process**: `azureDevOpsClient.getOverdueWorkItems()`
3. **Azure DevOps API**: Query work items with due date filter
4. **End**: Return overdue items with calculated days overdue

---

### Builds/Pipelines Routes (2 routes)

#### 4. Get Recent Builds
**Route**: `GET /api/builds/recent`  
**Line**: `backend/api/routes.js:69-78`

##### Request
```http
GET /api/builds/recent HTTP/1.1
Host: localhost:3001
```

##### Response Success (200)
```json
{
  "count": 20,
  "value": [
    {
      "id": 456,
      "buildNumber": "20250801.1",
      "status": "completed",
      "result": "succeeded",
      "definition": {
        "name": "CI Pipeline"
      },
      "requestedBy": {
        "displayName": "John Doe"
      },
      "startTime": "2025-08-01T07:00:00Z",
      "finishTime": "2025-08-01T07:05:00Z"
    }
  ]
}
```

##### Flow
1. **Start**: Express router handler
2. **Process**: `azureDevOpsClient.getRecentBuilds(20)`
3. **Azure DevOps API**: `GET /{org}/{project}/_apis/build/builds?$top=20`
4. **End**: Return recent builds list

---

#### 5. Get Build Details
**Route**: `GET /api/builds/:buildId`  
**Line**: `backend/api/routes.js:80-89`

##### Request
```http
GET /api/builds/456 HTTP/1.1
Host: localhost:3001
```

##### Response Success (200)
```json
{
  "id": 456,
  "buildNumber": "20250801.1",
  "status": "completed",
  "result": "succeeded",
  "definition": {
    "name": "CI Pipeline"
  },
  "logs": [
    {
      "id": 1,
      "type": "Container",
      "url": "https://dev.azure.com/.../logs/1"
    }
  ],
  "timeline": {
    "records": [
      {
        "id": "job1",
        "name": "Build",
        "state": "completed",
        "result": "succeeded"
      }
    ]
  }
}
```

##### Flow
1. **Start**: Express router handler with buildId parameter
2. **Process**: `azureDevOpsClient.getBuild(buildId)`
3. **Azure DevOps API**: `GET /{org}/{project}/_apis/build/builds/{buildId}`
4. **End**: Return detailed build information

---

### Pull Requests Routes (2 routes)

#### 6. Get Active Pull Requests
**Route**: `GET /api/pull-requests`  
**Line**: `backend/api/routes.js:92-101`

##### Request
```http
GET /api/pull-requests HTTP/1.1
Host: localhost:3001
```

##### Response Success (200)
```json
{
  "count": 2,
  "value": [
    {
      "pullRequestId": 789,
      "title": "Add new feature",
      "status": "active",
      "createdBy": {
        "displayName": "Alice Johnson"
      },
      "sourceRefName": "refs/heads/feature/new-feature",
      "targetRefName": "refs/heads/main",
      "reviewers": [
        {
          "displayName": "Bob Wilson",
          "vote": 0
        }
      ]
    }
  ]
}
```

##### Flow
1. **Start**: Express router handler
2. **Process**: `azureDevOpsClient.getPullRequests('active')`
3. **Azure DevOps API**: `GET /{org}/{project}/_apis/git/pullrequests?searchCriteria.status=active`
4. **End**: Return active pull requests

---

#### 7. Get Idle Pull Requests
**Route**: `GET /api/pull-requests/idle`  
**Line**: `backend/api/routes.js:103-112`

##### Request
```http
GET /api/pull-requests/idle HTTP/1.1
Host: localhost:3001
```

##### Response Success (200)
```json
{
  "count": 1,
  "value": [
    {
      "pullRequestId": 790,
      "title": "Fix bug in authentication",
      "status": "active",
      "lastActivityDate": "2025-07-29T10:00:00Z",
      "hoursIdle": 50,
      "reviewers": [
        {
          "displayName": "Charlie Brown",
          "vote": 0
        }
      ]
    }
  ]
}
```

##### Flow
1. **Start**: Express router handler
2. **Process**: `azureDevOpsClient.getIdlePullRequests(48)`
3. **Azure DevOps API**: Query PRs and filter by last activity > 48 hours
4. **End**: Return idle pull requests with calculated idle time

---

### System Routes (4 routes)

#### 8. Get Application Logs
**Route**: `GET /api/logs`  
**Line**: `backend/api/routes.js:115-131`

##### Request
```http
GET /api/logs?limit=50 HTTP/1.1
Host: localhost:3001
```

##### Query Parameters
- `limit` (optional): Number of log entries to return (default: 100)

##### Response Success (200)
```json
{
  "logs": [
    {
      "timestamp": "2025-08-01T08:00:00.000Z",
      "level": "info",
      "service": "system",
      "message": "Application started successfully"
    },
    {
      "timestamp": "2025-08-01T07:59:00.000Z",
      "level": "error",
      "service": "azure-devops",
      "message": "Failed to fetch work items",
      "error": "Network timeout"
    }
  ]
}
```

##### Flow
1. **Start**: Express router handler with query parameters
2. **Process**: Parse limit parameter, read log files (mock implementation)
3. **End**: Return formatted log entries

---

#### 9. Get Application Settings
**Route**: `GET /api/settings`  
**Line**: `backend/api/routes.js:134-167`

##### Request
```http
GET /api/settings HTTP/1.1
Host: localhost:3001
```

##### Response Success (200)
```json
{
  "azureDevOps": {
    "organization": "nishantxrana",
    "project": "Release Team",
    "personalAccessToken": "***",
    "baseUrl": "https://dev.azure.com"
  },
  "ai": {
    "provider": "groq",
    "openaiApiKey": "",
    "groqApiKey": "***",
    "model": "llama3-8b-8192"
  },
  "notifications": {
    "teamsWebhookUrl": "",
    "slackWebhookUrl": "",
    "enabled": false
  },
  "polling": {
    "workItemsInterval": "*/15 * * * *",
    "pipelineInterval": "*/10 * * * *",
    "pullRequestInterval": "0 */2 * * *",
    "overdueCheckInterval": "0 9 * * *"
  }
}
```

##### Flow
1. **Start**: Express router handler
2. **Process**: `configLoader.get()` for each configuration section
3. **Security**: Mask sensitive values (API keys, tokens)
4. **End**: Return sanitized configuration

---

#### 10. Update Application Settings
**Route**: `PUT /api/settings`  
**Line**: `backend/api/routes.js:169-178`

##### Request
```http
PUT /api/settings HTTP/1.1
Host: localhost:3001
Content-Type: application/json

{
  "azureDevOps": {
    "organization": "new-org",
    "project": "new-project"
  },
  "ai": {
    "provider": "openai",
    "model": "gpt-4"
  }
}
```

##### Response Success (200)
```json
{
  "message": "Settings updated successfully"
}
```

##### Flow
1. **Start**: Express router handler with request body
2. **Process**: Validate and update configuration (mock implementation)
3. **End**: Return success confirmation

---

#### 11. Test Azure DevOps Connection
**Route**: `POST /api/settings/test-connection`  
**Line**: `backend/api/routes.js:180-194`

##### Request
```http
POST /api/settings/test-connection HTTP/1.1
Host: localhost:3001
```

##### Response Success (200)
```json
{
  "success": true,
  "message": "Connection test successful",
  "details": "Successfully connected to Azure DevOps"
}
```

##### Response Error (500)
```json
{
  "success": false,
  "message": "Connection test failed: Unauthorized access"
}
```

##### Flow
1. **Start**: Express router handler
2. **Process**: `azureDevOpsClient.testConnection()`
3. **Azure DevOps API**: Test API call to verify credentials
4. **End**: Return connection test results

---

## 🔗 Webhook Routes

**Base Path**: `/api/webhooks`  
**File**: `backend/webhooks/index.js`  
**Middleware**: Webhook authentication, event logging

### Middleware Chain
1. **webhookAuth**: Validates webhook signature if configured
2. **logWebhookEvent**: Logs all incoming webhook events

### Work Item Webhooks (2 routes)

#### 12. Work Item Created Webhook
**Route**: `POST /api/webhooks/workitem/created`  
**Handler**: `backend/webhooks/workItemWebhook.js:handleCreated`

##### Request
```http
POST /api/webhooks/workitem/created HTTP/1.1
Host: localhost:3001
Content-Type: application/json
X-VSS-Signature: sha256=...

{
  "eventType": "workitem.created",
  "resource": {
    "id": 123,
    "fields": {
      "System.Title": "New user story",
      "System.WorkItemType": "User Story",
      "System.State": "New",
      "System.AssignedTo": {
        "displayName": "John Doe"
      },
      "System.Description": "As a user, I want to..."
    }
  },
  "subscriptionId": "sub-123"
}
```

##### Response Success (200)
```json
{
  "message": "Work item created webhook processed successfully",
  "workItemId": 123,
  "timestamp": "2025-08-01T08:00:00.000Z"
}
```

##### Flow
1. **Start**: Webhook middleware chain
2. **Authentication**: Validate webhook signature
3. **Logging**: Log webhook event details
4. **Process**: 
   - Extract work item details
   - `aiService.summarizeWorkItem(resource)`
   - `markdownFormatter.formatWorkItemCreated(resource, aiSummary)`
   - `notificationService.sendNotification(message, 'work-item-created')`
5. **End**: Return success response

---

#### 13. Work Item Updated Webhook
**Route**: `POST /api/webhooks/workitem/updated`  
**Handler**: `backend/webhooks/workItemWebhook.js:handleUpdated`

##### Request
```http
POST /api/webhooks/workitem/updated HTTP/1.1
Host: localhost:3001
Content-Type: application/json

{
  "eventType": "workitem.updated",
  "resource": {
    "id": 123,
    "fields": {
      "System.Title": "Updated user story",
      "System.State": "Active",
      "System.ChangedBy": {
        "displayName": "Jane Smith"
      }
    }
  }
}
```

##### Response Success (200)
```json
{
  "message": "Work item updated webhook processed successfully",
  "workItemId": 123,
  "timestamp": "2025-08-01T08:00:00.000Z"
}
```

##### Flow
1. **Start**: Webhook middleware chain
2. **Process**:
   - Extract update details
   - `markdownFormatter.formatWorkItemUpdated(resource)`
   - `notificationService.sendNotification(message, 'work-item-updated')`
3. **End**: Return success response

---

### Build/Pipeline Webhooks (1 route)

#### 14. Build Completed Webhook
**Route**: `POST /api/webhooks/build/completed`  
**Handler**: `backend/webhooks/buildWebhook.js:handleCompleted`

##### Request
```http
POST /api/webhooks/build/completed HTTP/1.1
Host: localhost:3001
Content-Type: application/json

{
  "eventType": "build.complete",
  "resource": {
    "id": 456,
    "buildNumber": "20250801.1",
    "status": "completed",
    "result": "failed",
    "definition": {
      "name": "CI Pipeline"
    },
    "requestedBy": {
      "displayName": "John Doe"
    }
  }
}
```

##### Response Success (200)
```json
{
  "message": "Build completed webhook processed successfully",
  "buildId": 456,
  "result": "failed",
  "timestamp": "2025-08-01T08:00:00.000Z"
}
```

##### Flow
1. **Start**: Webhook middleware chain
2. **Process**:
   - Extract build details
   - If build failed:
     - `azureDevOpsClient.getBuildTimeline(buildId)`
     - `azureDevOpsClient.getBuildLogs(buildId)`
     - `aiService.summarizeBuildFailure(resource, timeline, logs)`
     - `markdownFormatter.formatBuildFailed(resource, aiSummary)`
   - If build succeeded:
     - `markdownFormatter.formatBuildCompleted(resource)`
   - `notificationService.sendNotification(message, notificationType)`
3. **End**: Return success response

---

### Pull Request Webhooks (2 routes)

#### 15. Pull Request Created Webhook
**Route**: `POST /api/webhooks/pullrequest/created`  
**Handler**: `backend/webhooks/pullRequestWebhook.js:handleCreated`

##### Request
```http
POST /api/webhooks/pullrequest/created HTTP/1.1
Host: localhost:3001
Content-Type: application/json

{
  "eventType": "git.pullrequest.created",
  "resource": {
    "pullRequestId": 789,
    "title": "Add new feature",
    "createdBy": {
      "displayName": "Alice Johnson"
    },
    "sourceRefName": "refs/heads/feature/new-feature",
    "targetRefName": "refs/heads/main",
    "reviewers": [
      {
        "displayName": "Bob Wilson"
      }
    ]
  }
}
```

##### Response Success (200)
```json
{
  "message": "Pull request created webhook processed successfully",
  "pullRequestId": 789,
  "timestamp": "2025-08-01T08:00:00.000Z"
}
```

##### Flow
1. **Start**: Webhook middleware chain
2. **Process**:
   - Extract PR details
   - `azureDevOpsClient.getPullRequestDetails(pullRequestId)`
   - `aiService.summarizePullRequest(prDetails)`
   - `markdownFormatter.formatPullRequestCreated(resource, aiSummary)`
   - `notificationService.sendNotification(message, 'pull-request-created')`
3. **End**: Return success response

---

#### 16. Pull Request Updated Webhook
**Route**: `POST /api/webhooks/pullrequest/updated`  
**Handler**: `backend/webhooks/pullRequestWebhook.js:handleUpdated`

##### Request
```http
POST /api/webhooks/pullrequest/updated HTTP/1.1
Host: localhost:3001
Content-Type: application/json

{
  "eventType": "git.pullrequest.updated",
  "resource": {
    "pullRequestId": 789,
    "title": "Add new feature",
    "status": "active",
    "reviewers": [
      {
        "displayName": "Charlie Brown"
      }
    ]
  }
}
```

##### Response Success (200)
```json
{
  "message": "Pull request updated webhook processed successfully",
  "pullRequestId": 789,
  "timestamp": "2025-08-01T08:00:00.000Z"
}
```

##### Flow
1. **Start**: Webhook middleware chain
2. **Process**:
   - Check if reviewer assignment: `isReviewerAssignment(req.body)`
   - If reviewer assignment:
     - `getNewReviewers(req.body)`
     - `markdownFormatter.formatPullRequestReviewerAssigned(resource, newReviewers)`
     - Send notification with type 'pull-request-reviewer-assigned'
   - Else:
     - `markdownFormatter.formatPullRequestUpdated(resource)`
     - Send notification with type 'pull-request-updated'
3. **End**: Return success response

---

### Utility Webhooks (2 routes)

#### 17. Test Webhook
**Route**: `POST /api/webhooks/test`  
**Handler**: `backend/webhooks/index.js:45-55`

##### Request
```http
POST /api/webhooks/test HTTP/1.1
Host: localhost:3001
Content-Type: application/json

{
  "eventType": "test",
  "message": "Hello World"
}
```

##### Response Success (200)
```json
{
  "message": "Test webhook received successfully",
  "timestamp": "2025-08-01T08:00:00.000Z",
  "eventType": "test"
}
```

##### Flow
1. **Start**: Webhook middleware chain
2. **Process**: Log webhook details
3. **End**: Return test confirmation

---

#### 18. Webhook Health Check
**Route**: `GET /api/webhooks/health`  
**Handler**: `backend/webhooks/index.js:58-64`

##### Request
```http
GET /api/webhooks/health HTTP/1.1
Host: localhost:3001
```

##### Response Success (200)
```json
{
  "status": "healthy",
  "service": "webhooks",
  "timestamp": "2025-08-01T08:00:00.000Z"
}
```

##### Flow
1. **Start**: Direct route handler
2. **Process**: Return webhook service status
3. **End**: Return health status

---

## ❌ Error Handling

### Global Error Handler
**File**: `backend/utils/errorHandler.js`  
**Applied**: After all routes in main.js

### 404 Not Found Handler
**Route**: `* (all unmatched routes)`  
**Handler**: `backend/main.js:75-81`

##### Response (404)
```json
{
  "error": "Route not found",
  "path": "/api/nonexistent"
}
```

---

## 🔄 Middleware Chain

### Global Middleware (Applied to all routes)
1. **CORS**: Cross-origin resource sharing
2. **Rate Limiting**: 100 requests per 15 minutes per IP
3. **Body Parsing**: JSON and URL-encoded data
4. **Request Logging**: Log all incoming requests

### Webhook-Specific Middleware
1. **webhookAuth**: Validate webhook signatures
2. **logWebhookEvent**: Log webhook event details

### API-Specific Middleware
1. **Request Logging**: Additional API request logging
2. **Error Handling**: Catch and format API errors

---

## 📊 Request/Response Flow Summary

### API Routes Flow
```
Client Request → CORS → Rate Limit → Body Parser → Request Logger → API Route Handler → Azure DevOps API → AI Service (optional) → Response → Error Handler
```

### Webhook Routes Flow
```
Azure DevOps Webhook → CORS → Rate Limit → Body Parser → Request Logger → Webhook Auth → Event Logger → Webhook Handler → AI Service → Notification Service → Response → Error Handler
```

### Health Check Flow
```
Client Request → CORS → Rate Limit → Health Handler → Response
```

---

## 🔍 Route Dependencies

### External Services
- **Azure DevOps REST API**: All work items, builds, and PR data
- **AI Services**: OpenAI/Groq for summaries and analysis
- **Notification Services**: Teams/Slack for alerts

### Internal Services
- **Configuration Loader**: Environment variables and settings
- **Logger**: Winston logging service
- **Markdown Formatter**: Message formatting for notifications
- **Error Handler**: Centralized error processing

---

## 📈 Performance Considerations

### Caching
- No caching implemented (opportunity for enhancement)
- All requests hit Azure DevOps API directly

### Rate Limiting
- Global: 100 requests per 15 minutes per IP
- Azure DevOps API: Subject to their rate limits

### Timeouts
- HTTP requests: 30 seconds timeout
- No request queuing implemented

---

## 🔒 Security Features

### Authentication
- Azure DevOps: Personal Access Token (PAT)
- Webhooks: Optional signature validation
- API: Optional bearer token (not fully implemented)

### Input Validation
- JSON payload validation
- Parameter sanitization
- Error message sanitization

### Security Headers
- CORS configuration
- Rate limiting
- Helmet security headers (commented out)

---

This documentation covers all **23 routes** in the Azure DevOps Monitoring Agent, providing complete details about request/response formats, processing flows, dependencies, and error handling for each endpoint.
