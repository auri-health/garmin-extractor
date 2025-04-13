declare module 'garmin-connect' {
  interface GarminConnectConfig {
    username: string;
    password: string;
  }

  interface Activity {
    activityId: string;
    startTimeLocal: string;
    [key: string]: string | number | boolean | null | undefined;
  }

  interface HeartRateData {
    heartRateValues: Array<{ timestamp: string; value: number }>;
    maxHeartRate: number;
    minHeartRate: number;
    restingHeartRate: number;
  }

  interface SleepData {
    dailySleepDTO: {
      sleepStartTimestamp: string;
      sleepEndTimestamp: string;
      deepSleepSeconds: number;
      lightSleepSeconds: number;
      remSleepSeconds: number;
      awakeSleepSeconds: number;
      sleepQualityTypePK: number;
    };
  }

  interface DailyActivity {
    steps: number;
    calories: number;
    distance: number;
    activeMinutes: number;
    floorsClimbed: number;
  }

  interface UserProfile {
    userName: string;
    emailAddress: string;
    location: string;
    [key: string]: string | number | boolean | null | undefined;
  }

  export class GarminConnect {
    constructor(config: GarminConnectConfig);
    login(): Promise<void>;
    getActivities(start: number, limit: number): Promise<Activity[]>;
    getUserProfile(): Promise<UserProfile>;
    getHeartRate(date: Date): Promise<HeartRateData>;
    getSleepData(date: Date): Promise<SleepData>;
    getSteps(date: Date): Promise<number>;
    getActivitiesForDate(date: Date): Promise<Activity[]>;
    getUserSummary(date: Date): Promise<DailyActivity>;
    getDailySummary(date: Date): Promise<DailyActivity>;
  }
}
