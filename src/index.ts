// Main entry point for Garmin data extraction
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { GarminAuth } from './auth/GarminAuth.js';
import { SupabaseGarminAuthStorage } from './auth/SupabaseGarminAuthStorage.js';
import { GarminExtractor } from './extractor/GarminExtractor.js';

dotenv.config();

async function main(): Promise<void> {
  // Use service role key in GitHub Actions, otherwise use anon key
  const key = process.env.CI ? process.env.SUPABASE_SERVICE_ROLE_KEY! : process.env.SUPABASE_KEY!;
  const supabase = createClient(process.env.SUPABASE_URL!, key);

  const storage = new SupabaseGarminAuthStorage(supabase);
  const auth = new GarminAuth(storage);

  try {
    await auth.authenticate(
      process.env.USER_ID!,
      process.env.GARMIN_USERNAME!,
      process.env.GARMIN_PASSWORD!,
    );

    const extractor = new GarminExtractor(auth.getClient(), supabase, process.env.USER_ID!);
    
    // Get the extraction mode from environment variable, default to 'default'
    const mode = (process.env.EXTRACT_MODE || 'default') as 'historic' | 'recent' | 'default';
    
    await extractor.extractAll(mode);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
