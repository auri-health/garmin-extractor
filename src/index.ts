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

// Debug log environment variables
console.log('Environment variables loaded:', {
  hasSupabaseUrl: !!process.env.SUPABASE_URL,
  hasSupabaseKey: !!process.env.SUPABASE_KEY,
  hasUserId: !!process.env.USER_ID,
  garminUsername: process.env.GARMIN_USERNAME,
  hasGarminPassword: !!process.env.GARMIN_PASSWORD
});

async function main(): Promise<void> {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

  const storage = new SupabaseGarminAuthStorage(supabase);
  const auth = new GarminAuth(storage);

  try {
    await auth.authenticate(
      process.env.USER_ID!,
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
