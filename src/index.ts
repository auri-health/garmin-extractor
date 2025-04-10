import { GarminAuth } from './auth/GarminAuth';
import { GarminExtractor } from './extractor/GarminExtractor';
import { SupabaseGarminAuthStorage } from './auth/SupabaseGarminAuthStorage';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
    console.log('Starting Garmin data extraction...');

    const storage = new SupabaseGarminAuthStorage(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_KEY!
    );

    const auth = new GarminAuth(storage);
    const userId = process.env.USER_ID!;

    try {
        // Initialize auth for existing user
        await auth.initializeForUser(userId);

        // Authenticate with Garmin
        const client = await auth.authenticate();

        // Extract data
        const extractor = new GarminExtractor(client);
        await extractor.extractUserProfile();
        await extractor.extractRecentActivities();
        await extractor.extractLastNDays(7);

        console.log('Data extraction complete!');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main(); 