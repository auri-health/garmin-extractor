import { GarminConnect } from 'garmin-connect';
import * as fs from 'fs';
import * as path from 'path';

export class GarminExtractor {
  private readonly OUTPUT_DIR = 'data';
  private client: GarminConnect;

  constructor(client: GarminConnect) {
    this.client = client;
    if (!fs.existsSync(this.OUTPUT_DIR)) {
      fs.mkdirSync(this.OUTPUT_DIR);
    }
  }

  private async saveToFile(filename: string, data: unknown): Promise<void> {
    await fs.promises.writeFile(
      path.join(this.OUTPUT_DIR, filename),
      JSON.stringify(data, null, 2),
      'utf-8',
    );
  }

  public async extractUserProfile(): Promise<void> {
    const profile = await this.client.getUserProfile();
    await this.saveToFile('user-profile.json', profile);
  }

  public async extractRecentActivities(): Promise<void> {
    const activities = await this.client.getActivities(0, 10);
    await this.saveToFile('recent-activities.json', activities);
  }

  public async extractHeartRate(date: Date): Promise<void> {
    const heartRate = await this.client.getHeartRate(date);
    await this.saveToFile(`heart-rate-${date.toISOString().split('T')[0]}.json`, heartRate);
  }

  public async extractSleep(date: Date): Promise<void> {
    const sleep = await this.client.getSleepData(date);
    await this.saveToFile(`sleep-${date.toISOString().split('T')[0]}.json`, sleep);
  }

  public async extractSteps(date: Date): Promise<void> {
    const steps = await this.client.getSteps(date);
    await this.saveToFile(`steps-${date.toISOString().split('T')[0]}.json`, steps);
  }

  public async extractDailyActivities(date: Date): Promise<void> {
    const activities = await this.client.getActivities(0, 100);
    const dailyActivities = activities.filter((activity) => {
      const activityDate = new Date(activity.startTimeLocal).toISOString().split('T')[0];
      return activityDate === date.toISOString().split('T')[0];
    });
    await this.saveToFile(`activities-${date.toISOString().split('T')[0]}.json`, dailyActivities);
  }

  public async extractLastNDays(days: number): Promise<void> {
    const dates = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date;
    });

    for (const date of dates) {
      await this.extractHeartRate(date);
      await this.extractSleep(date);
      await this.extractSteps(date);
      await this.extractDailyActivities(date);
    }
  }

  public async extractAll(): Promise<void> {
    await this.extractUserProfile();
    await this.extractRecentActivities();
    await this.extractLastNDays(7); // Extract last 7 days of data
  }
}
