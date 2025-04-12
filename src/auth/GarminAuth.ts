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
    this.garminClient = new GarminConnect();
  }

  private async attemptLogin(email: string, password: string): Promise<void> {
    try {
      if (!email || !password) {
        throw new Error('Email and password are required for Garmin login');
      }

      console.log('Attempting to login with Garmin Connect...');
      console.log('Debug - Login attempt with:', {
        username: email,
        passwordLength: password?.length || 0,
        hasUsername: !!email,
        hasPassword: !!password
      });

      // Attempt login with explicit parameters
      await this.garminClient.login(email, password);
      console.log('✓ Login successful');
      
    } catch (error: unknown) {
      console.error('Detailed login error:', error);
      console.error('Debug - Error context:', {
        errorType: error?.constructor?.name,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      // Handle specific error cases
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

      // If we don't have a specific error case, wrap the error with more context
      throw new Error(`Failed to authenticate with Garmin: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public async authenticate(
    userId: string,
    email: string,
    password: string,
  ): Promise<GarminCredentials> {
    try {
      console.log('Starting authentication process...');
      await this.attemptLogin(email, password);

      const credentials: GarminCredentials = {
        userId,
        garminEmail: email,
        garminPassword: password,
        tokenExpiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour expiry
      };

      console.log('Storing credentials...');
      await this.storage.storeCredentials(credentials);
      this.isAuthenticated = true;
      console.log('Authentication completed successfully');
      return credentials;
    } catch (error) {
      console.error('Authentication failed:', error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error);
      throw error;
    }
  }

  public async refreshAuth(userId: string): Promise<void> {
    try {
      console.log('Refreshing authentication...');
      const credentials = await this.storage.getCredentials(userId);
      if (!credentials) {
        throw new Error('No credentials found for user');
      }

      await this.attemptLogin(credentials.garminEmail, credentials.garminPassword);

      await this.storage.storeCredentials({
        ...credentials,
        tokenExpiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour expiry
      });
      console.log('Authentication refresh completed successfully');
    } catch (error) {
      console.error('Failed to refresh authentication:', error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error);
      throw error;
    }
  }

  public async validateCredentials(userId: string): Promise<boolean> {
    try {
      console.log('Validating credentials...');
      const credentials = await this.storage.getCredentials(userId);
      if (!credentials) {
        console.log('No credentials found for user');
        return false;
      }
      await this.attemptLogin(credentials.garminEmail, credentials.garminPassword);
      console.log('Credentials validated successfully');
      return true;
    } catch (error) {
      console.error('Credential validation failed:', error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error);
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
