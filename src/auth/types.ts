export interface GarminCredentials {
  userId: string;
  garminEmail: string;
  garminPassword: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
}

export interface GarminAuthStorage {
  storeCredentials(credentials: GarminCredentials): Promise<void>;
  getCredentials(userId: string): Promise<GarminCredentials | null>;
}

export interface GarminTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}
