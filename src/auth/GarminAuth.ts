import { GarminConnect } from 'garmin-connect';
import * as dotenv from 'dotenv';
import { GarminAuthStorage, GarminCredentials } from './types';

dotenv.config();

export class GarminAuth {
  private garminClient: GarminConnect;
  private storage: GarminAuthStorage;
  private isAuthenticated: boolean = false;

  constructor(storage: GarminAuthStorage) {
    this.storage = storage;
    this.garminClient = new GarminConnect({
      username: process.env.GARMIN_EMAIL || '',
      password: process.env.GARMIN_PASSWORD || ''
    });
  }

  private async attemptLogin(email: string, password: string): Promise<void> {
    try {
      console.log('Attempting to login with Garmin Connect...');
      
      // Create a new client instance with provided credentials
      this.garminClient = new GarminConnect({
        username: email,
        password: password
      });

      // Attempt login
      await this.garminClient.login();
      console.log('✓ Login successful');
      
    } catch (error: unknown) {
      console.error('Detailed login error:', error);

      if (error instanceof Error) {
        if (error.message?.includes('CSRF token')) {
          throw new Error('CSRF token validation failed. Please try again.');
        } else if (error.message?.includes('rate limit')) {
          throw new Error('Rate limit reached. Please wait before trying again.');
        } else if (error.message?.includes('credentials')) {
          throw new Error('Invalid username or password. Please check your credentials.');
        } else if (error.message?.includes('MFA') || error.message?.includes('Ticket not found')) {
          throw new Error('MFA is enabled. Please disable MFA in your Garmin Connect account settings for automated access.');
        }
      }

      throw error;
    }
  }

  public async authenticate(
    userId: string,
    email: string,
    password: string,
  ): Promise<GarminCredentials> {
    try {
      await this.attemptLogin(email, password);

      const credentials: GarminCredentials = {
        userId,
        garminEmail: email,
        garminPassword: password,
        tokenExpiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour expiry
      };

      await this.storage.storeCredentials(credentials);
      this.isAuthenticated = true;
      return credentials;
    } catch (error) {
      console.error('Error authenticating with Garmin:', error);
      throw error;
    }
  }

  public async refreshAuth(userId: string): Promise<void> {
    try {
      const credentials = await this.storage.getCredentials(userId);
      if (!credentials) {
        throw new Error('No credentials found for user');
      }

      await this.attemptLogin(credentials.garminEmail, credentials.garminPassword);

      await this.storage.storeCredentials({
        ...credentials,
        tokenExpiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour expiry
      });
    } catch (error) {
      console.error('Error refreshing Garmin auth:', error);
      throw error;
    }
  }

  public async validateCredentials(userId: string): Promise<boolean> {
    try {
      const credentials = await this.storage.getCredentials(userId);
      if (!credentials) {
        return false;
      }
      await this.attemptLogin(credentials.garminEmail, credentials.garminPassword);
      return true;
    } catch (error) {
      return false;
    }
  }

  public getClient(): GarminConnect {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }
    return this.garminClient;
  }
}
