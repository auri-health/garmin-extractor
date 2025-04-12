import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { GarminAuth } from './auth/GarminAuth';
import { SupabaseGarminAuthStorage } from './auth/SupabaseGarminAuthStorage';
import { GarminExtractor } from './extractor/GarminExtractor';

// Set up global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise);
  console.error('Reason:', reason instanceof Error ? {
    name: reason.name,
    message: reason.message,
    stack: reason.stack
  } : reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', {
    name: error.name,
    message: error.message,
    stack: error.stack
  });
  process.exit(1);
});

// Load environment variables
dotenv.config();

// Parse command line arguments
const args = process.argv.slice(2);
const deviceArg = args.find(arg => arg.startsWith('--device='));
const daysArg = args.find(arg => arg.startsWith('--days='));

let _deviceId: string | undefined;
if (deviceArg) {
  _deviceId = deviceArg.split('=')[1];
}

const days = daysArg 
  ? Math.max(1, parseInt(daysArg.split('=')[1], 10)) 
  : 1; // Default to 1 day if not specified

// Validate required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_KEY',
  'USER_ID',
  'GARMIN_USERNAME',
  'GARMIN_PASSWORD'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Clean and validate USER_ID
const userId = process.env.USER_ID!.trim().replace(/['"]/g, '');
if (!userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
  throw new Error('Invalid USER_ID format. Must be a valid UUID.');
}

// Debug log environment variables
console.log('Environment variables loaded:', {
  hasSupabaseUrl: !!process.env.SUPABASE_URL,
  hasSupabaseKey: !!process.env.SUPABASE_KEY,
  userId: userId,
  garminUsername: process.env.GARMIN_USERNAME,
  hasGarminPassword: !!process.env.GARMIN_PASSWORD
});

async function main(): Promise<void> {
  try {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

    const storage = new SupabaseGarminAuthStorage(supabase);
    const auth = new GarminAuth(storage);

    console.log('Authenticating with Garmin...');
    await auth.authenticate(
      userId,
      process.env.GARMIN_USERNAME!,
      process.env.GARMIN_PASSWORD!,
    );

    const extractor = new GarminExtractor(auth.getClient());

    // First, get the user's devices to find the Forerunner 235
    console.log('Fetching user devices...');
    const devices = await extractor.getUserDevices();
    console.log('Available devices:', devices);

    const forerunner235 = devices.find(device => device.deviceName === 'Forerunner 235');

    if (!forerunner235) {
      throw new Error('Forerunner 235 device not found in user devices');
    }

    console.log('Found Forerunner 235:', forerunner235);

    // Extract data for the specified number of days with device-specific filtering
    await extractor.extractLastNDays(days, forerunner235.deviceId);
    console.log('Data extraction completed successfully');
  } catch (error) {
    console.error('Error in main process:', error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error);
    process.exit(1);
  }
}

// Execute main function with proper error handling
main().catch(error => {
  console.error('Fatal error:', error instanceof Error ? {
    name: error.name,
    message: error.message,
    stack: error.stack
  } : error);
  process.exit(1);
});
