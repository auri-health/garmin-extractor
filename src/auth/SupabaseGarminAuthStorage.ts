import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GarminAuthStorage, GarminUserAuth } from './types';

export class SupabaseGarminAuthStorage implements GarminAuthStorage {
  private client: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    // Using service role key for admin access
    this.client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      }
    });
  }

  async saveUserAuth(auth: GarminUserAuth): Promise<void> {
    const { error } = await this.client
      .from('garmin_auth')
      .upsert([{
        user_id: auth.user_id,
        garmin_email: auth.garmin_email,
        garmin_password: auth.garmin_password,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }], {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('Database error:', error);
      throw error;
    }
  }

  async getUserAuth(userId: string): Promise<GarminUserAuth | null> {
    const { data, error } = await this.client
      .from('garmin_auth')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }
    return data;
  }

  async updateTokens(userId: string, tokens: {
    access_token: string;
    refresh_token: string;
    expires_at: Date;
  }): Promise<void> {
    const { error } = await this.client
      .from('garmin_auth')
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: tokens.expires_at.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Database error:', error);
      throw error;
    }
  }
} 