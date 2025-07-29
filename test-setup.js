#!/usr/bin/env node

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

console.log('🧪 Testing Azure DevOps Monitoring Agent Setup');
console.log('===============================================');

// Test backend startup
console.log('1. Testing backend startup...');

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

// Test health endpoint
console.log('2. Testing health endpoint...');
try {
  const response = await fetch('http://localhost:3001/health');
  if (response.ok) {
    const data = await response.json();
    console.log('✅ Backend health check passed:', data.status);
  } else {
    console.log('❌ Backend health check failed:', response.status);
  }
} catch (error) {
  console.log('❌ Backend health check failed:', error.message);
}

// Test webhook endpoint
console.log('3. Testing webhook endpoint...');
try {
  const response = await fetch('http://localhost:3001/api/webhooks/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventType: 'test', message: 'Hello World' })
  });
  
  if (response.ok) {
    const data = await response.json();
    console.log('✅ Webhook test passed:', data.message);
  } else {
    console.log('❌ Webhook test failed:', response.status);
  }
} catch (error) {
  console.log('❌ Webhook test failed:', error.message);
}

// Show backend output
console.log('\n📋 Backend Output:');
console.log(backendOutput);

// Cleanup
backend.kill();

console.log('\n🎉 Setup test completed!');
console.log('\n📝 Next steps:');
console.log('1. Configure your .env file with real Azure DevOps credentials');
console.log('2. Set up AI provider API key (OpenAI or Groq)');
console.log('3. Run: ./start-dev.sh to start both backend and frontend');
console.log('4. Open http://localhost:5173 in your browser');
