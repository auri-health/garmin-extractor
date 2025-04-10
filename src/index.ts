import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { GarminAuth } from './auth/GarminAuth';
import { SupabaseGarminAuthStorage } from './auth/SupabaseGarminAuthStorage';
import { GarminExtractor } from './extractor/GarminExtractor';

// Load environment variables
dotenv.config();

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
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

  const storage = new SupabaseGarminAuthStorage(supabase);
  const auth = new GarminAuth(storage);

  try {
    await auth.authenticate(
      userId,
      process.env.GARMIN_USERNAME!,
      process.env.GARMIN_PASSWORD!,
    );

    const extractor = new GarminExtractor(auth.getClient());
    await extractor.extractAll();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
