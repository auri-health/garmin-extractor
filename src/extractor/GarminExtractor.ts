import { GarminConnect } from 'garmin-connect';
import * as fs from 'fs';
import * as path from 'path';
import { SupabaseClient } from '@supabase/supabase-js';

export class GarminExtractor {
  private readonly OUTPUT_DIR = 'data';
  private client: GarminConnect;
  private supabase: SupabaseClient;
  private userId: string;

  constructor(client: GarminConnect, supabase: SupabaseClient, userId: string) {
    this.client = client;
    this.supabase = supabase;
    this.userId = userId;
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

  private async saveToSupabaseBucket(filename: string, data: unknown): Promise<void> {
    const jsonString = JSON.stringify(data, null, 2);
    // Organize files by user ID to prevent conflicts and manage permissions
    const filePath = `${this.userId}/${filename}`;
    const { error } = await this.supabase.storage.from('garmin-data').upload(filePath, jsonString, {
      contentType: 'application/json',
      upsert: true,
    });

    if (error) {
      throw new Error(`Failed to save to Supabase storage: ${error.message}`);
    }
  }

  private async saveData(filename: string, data: unknown): Promise<void> {
    await Promise.all([this.saveToFile(filename, data), this.saveToSupabaseBucket(filename, data)]);
  }

  public async extractUserProfile(): Promise<void> {
    const profile = await this.client.getUserProfile();
    await this.saveData('user-profile.json', profile);
  }

  public async extractRecentActivities(): Promise<void> {
    const activities = await this.client.getActivities(0, 10);
    await this.saveData('recent-activities.json', activities);
  }

  public async extractHeartRate(date: Date): Promise<void> {
    const heartRate = await this.client.getHeartRate(date);
    await this.saveData(`heart-rate-${date.toISOString().split('T')[0]}.json`, heartRate);
  }

  public async extractSleep(date: Date): Promise<void> {
    const sleep = await this.client.getSleepData(date);
    await this.saveData(`sleep-${date.toISOString().split('T')[0]}.json`, sleep);
  }

  public async extractSteps(date: Date): Promise<void> {
    const steps = await this.client.getSteps(date);
    await this.saveData(`steps-${date.toISOString().split('T')[0]}.json`, steps);
  }

  public async extractDailyActivities(date: Date): Promise<void> {
    const activities = await this.client.getActivities(0, 100);
    const dailyActivities = activities.filter((activity) => {
      const activityDate = new Date(activity.startTimeLocal).toISOString().split('T')[0];
      return activityDate === date.toISOString().split('T')[0];
    });
    await this.saveData(`activities-${date.toISOString().split('T')[0]}.json`, dailyActivities);
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

  public async extractRecentDays(): Promise<void> {
    const dates = [new Date(), new Date(Date.now() - 86400000)]; // today and yesterday
    for (const date of dates) {
      await this.extractHeartRate(date);
      await this.extractSleep(date);
      await this.extractSteps(date);
      await this.extractDailyActivities(date);
    }
  }

  public async extractDateRange(startDate: Date, endDate: Date): Promise<void> {
    const dates: Date[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (const d = start; d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }

    for (const date of dates) {
      await this.extractHeartRate(date);
      await this.extractSleep(date);
      await this.extractSteps(date);
      await this.extractDailyActivities(date);
    }
  }

  public async extractAll(mode: 'historic' | 'recent' | 'default' = 'default'): Promise<void> {
    await this.extractUserProfile();
    await this.extractRecentActivities();

    if (mode === 'historic' && process.env.START_DATE && process.env.END_DATE) {
      const startDate = new Date(process.env.START_DATE);
      const endDate = new Date(process.env.END_DATE);
      await this.extractDateRange(startDate, endDate);
    } else if (mode === 'recent') {
      await this.extractRecentDays();
    } else {
      await this.extractLastNDays(30); // default behavior
    }
  }
}
