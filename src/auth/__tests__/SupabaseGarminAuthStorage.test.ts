import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseGarminAuthStorage } from '../SupabaseGarminAuthStorage';
import { GarminCredentials } from '../types';

// Mock SupabaseClient
const mockSupabase = {
  from: jest.fn(() => ({
    upsert: jest.fn(),
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
  })),
} as unknown as jest.Mocked<SupabaseClient>;

describe('SupabaseGarminAuthStorage', () => {
  let storage: SupabaseGarminAuthStorage;

  beforeEach(() => {
    storage = new SupabaseGarminAuthStorage(mockSupabase);
    jest.clearAllMocks();
  });

  describe('storeCredentials', () => {
    const mockCredentials: GarminCredentials = {
      userId: 'test-user',
      garminEmail: 'test@example.com',
      garminPassword: 'password123',
      tokenExpiresAt: new Date('2024-04-13T00:00:00Z'),
    };

    it('should store credentials successfully', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({ upsert: mockUpsert } as any);

      await expect(storage.storeCredentials(mockCredentials)).resolves.not.toThrow();

      expect(mockSupabase.from).toHaveBeenCalledWith('garmin_auth');
      expect(mockUpsert).toHaveBeenCalledWith({
        user_id: mockCredentials.userId,
        garmin_email: mockCredentials.garminEmail,
        garmin_password: mockCredentials.garminPassword,
        token_expires_at: mockCredentials.tokenExpiresAt?.toISOString(),
      });
    });

    it('should throw error when storage fails', async () => {
      const error = new Error('Storage failed');
      const mockUpsert = jest.fn().mockResolvedValue({ error });
      mockSupabase.from.mockReturnValue({ upsert: mockUpsert } as any);

      await expect(storage.storeCredentials(mockCredentials)).rejects.toThrow(
        'Failed to store credentials: Storage failed'
      );
    });
  });

  describe('getCredentials', () => {
    const userId = 'test-user';
    const mockData = {
      user_id: userId,
      garmin_email: 'test@example.com',
      garmin_password: 'password123',
      token_expires_at: '2024-04-13T00:00:00Z',
    };

    it('should retrieve credentials successfully', async () => {
      const mockSingle = jest.fn().mockResolvedValue({ data: mockData, error: null });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect } as any);

      const result = await storage.getCredentials(userId);

      expect(result).toEqual({
        userId: mockData.user_id,
        garminEmail: mockData.garmin_email,
        garminPassword: mockData.garmin_password,
        tokenExpiresAt: new Date(mockData.token_expires_at),
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('garmin_auth');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('user_id', userId);
    });

    it('should return null when no credentials found', async () => {
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect } as any);

      const result = await storage.getCredentials(userId);

      expect(result).toBeNull();
    });

    it('should throw error when retrieval fails', async () => {
      const error = new Error('Retrieval failed');
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect } as any);

      await expect(storage.getCredentials(userId)).rejects.toThrow(
        'Failed to get credentials: Retrieval failed'
      );
    });
  });
}); 