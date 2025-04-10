import { GarminConnect } from 'garmin-connect';
import * as dotenv from 'dotenv';
import { GarminAuthStorage, GarminCredentials, GarminTokens } from './types';

dotenv.config();

export interface GarminCredentials {
  username: string;
  password: string;
}

export class GarminAuth {
  private garminClient: GarminConnect;
  private storage: GarminAuthStorage;
  private isAuthenticated: boolean = false;
  private userId?: string;

  constructor(storage: GarminAuthStorage) {
    this.storage = storage;
    this.garminClient = new GarminConnect({});
  }

  private async attemptLogin(client: InstanceType<typeof GarminConnect>): Promise<void> {
    try {
      console.log('Attempting to login with Garmin Connect...');
      await client.login();
      console.log('✓ Login successful');
    } catch (error: any) {
      console.error('Detailed login error:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });

      if (error.message?.includes('CSRF token')) {
        throw new Error('CSRF token validation failed. Please try again.');
      } else if (error.message?.includes('rate limit')) {
        throw new Error('Rate limit reached. Please wait before trying again.');
      } else if (error.message?.includes('credentials')) {
        throw new Error('Invalid username or password. Please check your credentials.');
      }

      throw error;
    }
  }

  async initializeForUser(userId: string): Promise<void> {
    this.userId = userId;
    const auth = await this.storage.getUserAuth(userId);
    if (!auth) {
      throw new Error(`No Garmin authentication found for user ${userId}`);
    }

    this.garminClient = new GarminConnect({
      username: auth.garmin_email,
      password: auth.garmin_password,
    });
  }

  async registerUser(userId: string, credentials: GarminCredentials): Promise<void> {
    console.log(`Registering user ${userId} with Garmin Connect...`);

    // Create a temporary client for registration
    const tempClient = new GarminConnect({
      username: credentials.username,
      password: credentials.password,
    });

    try {
      // Attempt login with detailed error handling
      await this.attemptLogin(tempClient);

      // If login successful, save to database
      console.log('Saving credentials to database...');
      await this.storage.saveUserAuth({
        user_id: userId,
        garmin_email: credentials.username,
        garmin_password: credentials.password,
        created_at: new Date(),
        updated_at: new Date(),
      });

      this.userId = userId;
      this.garminClient = tempClient;
      this.isAuthenticated = true;
      console.log('✓ User registration complete');
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  async authenticate(): Promise<InstanceType<typeof GarminConnect>> {
    if (!this.userId) {
      throw new Error('No user initialized. Call initializeForUser() first.');
    }

    if (!this.isAuthenticated) {
      await this.attemptLogin(this.garminClient);
      this.isAuthenticated = true;
    }
    return this.garminClient;
  }

  async validateCredentials(): Promise<boolean> {
    try {
      await this.authenticate();
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

  public async authenticate(
    userId: string,
    email: string,
    password: string,
  ): Promise<GarminCredentials> {
    try {
      await this.garminClient.login(email, password);
      const tokens = (await this.garminClient.oauth2Token()) as GarminTokens;

      const credentials: GarminCredentials = {
        userId,
        garminEmail: email,
        garminPassword: password,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      };

      await this.storage.storeCredentials(credentials);
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

      await this.garminClient.login(credentials.garminEmail, credentials.garminPassword);
      const tokens = (await this.garminClient.oauth2Token()) as GarminTokens;

      await this.storage.storeCredentials({
        ...credentials,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      });
    } catch (error) {
      console.error('Error refreshing Garmin auth:', error);
      throw error;
    }
  }
}
