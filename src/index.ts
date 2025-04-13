// Main entry point for Garmin data extraction
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { GarminAuth } from './auth/GarminAuth.js';
import { SupabaseGarminAuthStorage } from './auth/SupabaseGarminAuthStorage.js';
import { GarminExtractor } from './extractor/GarminExtractor.js';

dotenv.config();

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

    const extractor = new GarminExtractor(auth.getClient(), supabase);
    await extractor.extractAll();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
