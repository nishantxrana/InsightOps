import express from 'express';
console.log('Express imported');

import { logger } from './utils/logger.js';
console.log('Logger imported');

import { apiRoutes } from './api/routes.js';
console.log('API routes imported');

console.log('All imports successful');
