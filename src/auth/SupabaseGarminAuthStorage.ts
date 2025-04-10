import { SupabaseClient } from '@supabase/supabase-js';
import { GarminAuthStorage, GarminCredentials } from './types';

export class SupabaseGarminAuthStorage implements GarminAuthStorage {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  private cleanUserId(userId: string): string {
    // Remove any whitespace and quotes
    return userId.trim().replace(/['"]/g, '');
  }

  public async storeCredentials(credentials: GarminCredentials): Promise<void> {
    const cleanUserId = this.cleanUserId(credentials.userId);
    console.log('Storing credentials for user:', cleanUserId);

    const { error } = await this.supabase
      .from('garmin_auth')
      .upsert([
        {
          user_id: cleanUserId,
          garmin_email: credentials.garminEmail,
          garmin_password: credentials.garminPassword,
          token_expires_at: credentials.tokenExpiresAt,
          updated_at: new Date().toISOString(),
        },
      ])
      .single();

    if (error) {
      console.error('Error storing credentials:', error);
      throw error;
    }
  }

  public async getCredentials(userId: string): Promise<GarminCredentials | null> {
    const cleanUserId = this.cleanUserId(userId);
    console.log('Getting credentials for user:', cleanUserId);

    const { data, error } = await this.supabase
      .from('garmin_auth')
      .select()
      .eq('user_id', cleanUserId)
      .single();

    if (error) {
      console.error('Error getting credentials:', error);
      throw error;
    }

    if (!data) {
      return null;
    }

    return {
      userId: data.user_id,
      garminEmail: data.garmin_email,
      garminPassword: data.garmin_password,
      tokenExpiresAt: data.token_expires_at ? new Date(data.token_expires_at) : undefined,
    };
  }
}
