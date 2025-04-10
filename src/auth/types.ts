export interface GarminUserAuth {
  user_id: string;
  garmin_email: string;
  garmin_password: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface GarminAuthStorage {
  saveUserAuth(auth: GarminUserAuth): Promise<void>;
  getUserAuth(userId: string): Promise<GarminUserAuth | null>;
  updateTokens(userId: string, tokens: {
    access_token: string;
    refresh_token: string;
    expires_at: Date;
  }): Promise<void>;
} 