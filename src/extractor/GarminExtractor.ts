import { GarminConnect } from 'garmin-connect';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export class GarminExtractor {
  private readonly OUTPUT_DIR: string;

  constructor(
    private client: InstanceType<typeof GarminConnect>,
    outputDir: string = './data'
  ) {
    this.OUTPUT_DIR = outputDir;
  }

  private async ensureOutputDir(): Promise<void> {
    if (!existsSync(this.OUTPUT_DIR)) {
      await mkdir(this.OUTPUT_DIR, { recursive: true });
    }
  }

  private async saveDataToFile(filename: string, data: any): Promise<void> {
    await writeFile(
      join(this.OUTPUT_DIR, filename),
      JSON.stringify(data, null, 2),
      'utf-8'
    );
  }

  async extractDailyData(date: Date): Promise<void> {
    const dateStr = date.toISOString().split('T')[0];
    console.log(`Fetching data for ${dateStr}...`);

    try {
      // Fetch heart rate data
      const heartRate = await this.client.getHeartRate(date);
      await this.saveDataToFile(`heart-rate-${dateStr}.json`, heartRate);
      console.log('✓ Heart rate data saved');

      // Fetch sleep data
      const sleep = await this.client.getSleepData(date);
      await this.saveDataToFile(`sleep-${dateStr}.json`, sleep);
      console.log('✓ Sleep data saved');

      // Fetch steps data
      const steps = await this.client.getSteps(date);
      await this.saveDataToFile(`steps-${dateStr}.json`, steps);
      console.log('✓ Steps data saved');

      // Get activities for the day
      const activities = await this.client.getActivities(0, 100);
      const dailyActivities = activities.filter(activity => {
        const activityDate = new Date(activity.startTimeLocal).toISOString().split('T')[0];
        return activityDate === dateStr;
      });
      await this.saveDataToFile(`activities-${dateStr}.json`, dailyActivities);
      console.log('✓ Activities saved');
    } catch (error) {
      console.error(`Error fetching data for ${dateStr}:`, error);
      throw error;
    }
  }

  async extractUserProfile(): Promise<void> {
    try {
      await this.ensureOutputDir();
      const userProfile = await this.client.getUserProfile();
      await this.saveDataToFile('user-profile.json', userProfile);
      console.log('✓ User profile saved');
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  async extractRecentActivities(limit: number = 10): Promise<void> {
    try {
      await this.ensureOutputDir();
      const recentActivities = await this.client.getActivities(0, limit);
      await this.saveDataToFile('recent-activities.json', recentActivities);
      console.log('✓ Recent activities saved');
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      throw error;
    }
  }

  async extractLastNDays(days: number = 7): Promise<void> {
    const dates = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date;
    });

    await this.ensureOutputDir();
    for (const date of dates) {
      await this.extractDailyData(date);
    }
  }
} 