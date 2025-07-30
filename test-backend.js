#!/usr/bin/env node

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

console.log('🧪 Testing Azure DevOps Monitoring Agent Backend');
console.log('================================================');

// Start backend
console.log('1. Starting backend...');
const backend = spawn('node', ['main.js'], {
  cwd: './backend',
  stdio: ['pipe', 'pipe', 'pipe']
});

let backendOutput = '';
backend.stdout.on('data', (data) => {
  backendOutput += data.toString();
});

backend.stderr.on('data', (data) => {
  backendOutput += data.toString();
});

// Wait for backend to start
await setTimeout(3000);

console.log('2. Testing endpoints...');

// Test health endpoint
try {
  const healthResponse = await fetch('http://localhost:3001/health');
  if (healthResponse.ok) {
    const data = await healthResponse.json();
    console.log('✅ Health check passed:', data.status);
  } else {
    console.log('❌ Health check failed:', healthResponse.status);
  }
} catch (error) {
  console.log('❌ Health check failed:', error.message);
}

// Test webhook endpoint
try {
  const webhookResponse = await fetch('http://localhost:3001/api/webhooks/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventType: 'test', message: 'Hello World' })
  });
  
  if (webhookResponse.ok) {
    const data = await webhookResponse.json();
    console.log('✅ Webhook test passed:', data.message);
  } else {
    console.log('❌ Webhook test failed:', webhookResponse.status);
  }
} catch (error) {
  console.log('❌ Webhook test failed:', error.message);
}

// Test Azure DevOps connection
try {
  const connectionResponse = await fetch('http://localhost:3001/api/settings/test-connection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (connectionResponse.ok) {
    const data = await connectionResponse.json();
    console.log('✅ Azure DevOps connection test passed:', data.message);
  } else {
    const errorData = await connectionResponse.json();
    console.log('❌ Azure DevOps connection test failed:', errorData.message);
  }
} catch (error) {
  console.log('❌ Azure DevOps connection test failed:', error.message);
}

// Test work items endpoint
try {
  const workItemsResponse = await fetch('http://localhost:3001/api/work-items');
  
  if (workItemsResponse.ok) {
    const data = await workItemsResponse.json();
    console.log('✅ Work items endpoint passed, found:', data.count || 0, 'items');
  } else {
    const errorData = await workItemsResponse.json();
    console.log('❌ Work items endpoint failed:', errorData.error);
    if (errorData.suggestion) {
      console.log('💡 Suggestion:', errorData.suggestion);
    }
  }
} catch (error) {
  console.log('❌ Work items endpoint failed:', error.message);
}

// Test builds endpoint
try {
  const buildsResponse = await fetch('http://localhost:3001/api/builds/recent');
  
  if (buildsResponse.ok) {
    const data = await buildsResponse.json();
    console.log('✅ Builds endpoint passed, found:', data.count || 0, 'builds');
  } else {
    const errorData = await buildsResponse.json();
    console.log('❌ Builds endpoint failed:', errorData.error);
  }
} catch (error) {
  console.log('❌ Builds endpoint failed:', error.message);
}

// Test pull requests endpoint
try {
  const prResponse = await fetch('http://localhost:3001/api/pull-requests');
  
  if (prResponse.ok) {
    const data = await prResponse.json();
    console.log('✅ Pull requests endpoint passed, found:', data.count || 0, 'PRs');
  } else {
    const errorData = await prResponse.json();
    console.log('❌ Pull requests endpoint failed:', errorData.error);
  }
} catch (error) {
  console.log('❌ Pull requests endpoint failed:', error.message);
}

console.log('\n📋 Backend Output:');
console.log('==================');
console.log(backendOutput);

// Cleanup
backend.kill();

console.log('\n🎉 Backend test completed!');
console.log('\n📝 If you see connection errors:');
console.log('1. Check your .env file configuration');
console.log('2. Verify your Azure DevOps PAT has correct permissions');
console.log('3. Ensure your organization and project names are correct');
console.log('4. Test your PAT manually at: https://dev.azure.com/{org}/{project}/_apis/projects?api-version=7.0');
