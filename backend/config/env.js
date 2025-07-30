import { config } from 'dotenv';

// Load environment variables immediately when this module is imported
config();

export const env = process.env;
