declare module 'garmin-connect' {
  interface GCCredentials {
    username: string;
    password: string;
  }

  interface Activity {
    activityId: string;
    startTimeLocal: string;
    [key: string]: any;
  }

  export class GarminConnect {
    constructor(credentials?: GCCredentials);
    login(username?: string, password?: string): Promise<void>;
    getActivities(start: number, limit: number): Promise<Activity[]>;
    getUserProfile(): Promise<{ userName: string; [key: string]: any }>;
    getHeartRate(date: Date): Promise<any>;
    getSleepData(date: Date): Promise<any>;
    getSteps(date: Date): Promise<number>;
    getActivitiesForDate(date: Date): Promise<any>;
    getUserSummary(date: Date): Promise<any>;
    getDailySummary(date: Date): Promise<any>;
  }
}
