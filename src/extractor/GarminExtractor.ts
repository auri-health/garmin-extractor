import { GarminConnect } from 'garmin-connect';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { GarminDevice, GarminActivity, GarminHeartRate, GarminSleep, GarminSteps } from '../types/garmin.js';
import { Forerunner235DataFilter } from '../devices/garminfr235';
import { fileURLToPath } from 'url';

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: string;
}

export class GarminExtractor {
  private readonly OUTPUT_DIR = 'data';
  private client: GarminConnect;
  private supabase: SupabaseClient;

  constructor(client: GarminConnect) {
    this.client = client;
    if (!fs.existsSync(this.OUTPUT_DIR)) {
      fs.mkdirSync(this.OUTPUT_DIR);
    }
    
    // Initialize Supabase client
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!
    );
  }

  private async saveToFile(filename: string, data: unknown): Promise<void> {
    await fs.promises.writeFile(
      path.join(this.OUTPUT_DIR, filename),
      JSON.stringify(data, null, 2),
      'utf-8',
    );
  }

  public async getUserDevices(): Promise<DeviceInfo[]> {
    // Cast the client to any since getDeviceInfo is not in the type definitions
    const devices = await (this.client as any).getDeviceInfo() as GarminDevice[];
    return devices.map(device => ({
      deviceId: device.deviceId,
      deviceName: device.productDisplayName,
      deviceType: device.deviceType
    }));
  }

  private async importToSupabase(tableName: string, data: Record<string, any> | Record<string, any>[]): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(tableName)
        .insert(data);

      if (error) {
        console.error(`Error importing to ${tableName}:`, error);
        throw error;
      }
    } catch (error) {
      console.error(`Failed to import data to ${tableName}:`, error);
      throw error;
    }
  }

  public async extractUserProfile(): Promise<void> {
    const profile = await this.client.getUserProfile();
    await this.saveToFile('user-profile.json', profile);
    await this.importToSupabase('user_profiles', {
      user_id: process.env.USER_ID,
      ...profile
    });
  }

  public async extractRecentActivities(deviceId?: string): Promise<void> {
    const activities = await this.client.getActivities(0, 10) as GarminActivity[];
    const filteredActivities = deviceId 
      ? activities.filter(activity => activity.deviceId === deviceId)
      : activities;
    
    await this.saveToFile(
      deviceId 
        ? `recent-activities-device-${deviceId}.json`
        : 'recent-activities.json',
      filteredActivities
    );

    await this.importToSupabase('activities', filteredActivities.map(activity => ({
      user_id: process.env.USER_ID,
      device_id: activity.deviceId,
      ...activity
    })));
  }

  public async extractHeartRate(date: Date, deviceId?: string): Promise<void> {
    const heartRate = await this.client.getHeartRate(date) as GarminHeartRate[];
    let filteredData = deviceId
      ? heartRate.filter(hr => hr.deviceId === deviceId)
      : heartRate;

    // Apply Forerunner 235 specific filtering if applicable
    if (deviceId) {
      const device = await this.getUserDevices().then(devices => 
        devices.find(d => d.deviceId === deviceId)
      );
      
      if (device?.deviceName === 'Forerunner 235') {
        filteredData = filteredData.map(data => Forerunner235DataFilter.filterHeartRateData(data));
      }
    }

    await this.saveToFile(
      deviceId
        ? `heart-rate-${date.toISOString().split('T')[0]}-device-${deviceId}.json`
        : `heart-rate-${date.toISOString().split('T')[0]}.json`,
      filteredData
    );

    await this.importToSupabase('heart_rate', filteredData.map(hr => ({
      user_id: process.env.USER_ID,
      device_id: hr.deviceId,
      date: date.toISOString().split('T')[0],
      ...hr
    })));
  }

  public async extractSleep(date: Date, deviceId?: string): Promise<void> {
    const sleep = await this.client.getSleepData(date) as GarminSleep[];
    let filteredData = deviceId
      ? sleep.filter(s => s.deviceId === deviceId)
      : sleep;

    // Apply Forerunner 235 specific filtering if applicable
    if (deviceId) {
      const device = await this.getUserDevices().then(devices => 
        devices.find(d => d.deviceId === deviceId)
      );
      
      if (device?.deviceName === 'Forerunner 235') {
        filteredData = filteredData.map(data => Forerunner235DataFilter.filterSleepData(data));
      }
    }

    await this.saveToFile(
      deviceId
        ? `sleep-${date.toISOString().split('T')[0]}-device-${deviceId}.json`
        : `sleep-${date.toISOString().split('T')[0]}.json`,
      filteredData
    );

    await this.importToSupabase('sleep', filteredData.map(s => ({
      user_id: process.env.USER_ID,
      device_id: s.deviceId,
      date: date.toISOString().split('T')[0],
      ...s
    })));
  }

  public async extractSteps(date: Date, deviceId?: string): Promise<void> {
    const stepsResponse = await this.client.getSteps(date);
    const steps = Array.isArray(stepsResponse) ? stepsResponse : [stepsResponse];
    const typedSteps = steps as unknown as GarminSteps[];
    
    let filteredData = deviceId
      ? typedSteps.filter(s => s.deviceId === deviceId)
      : typedSteps;

    // Apply Forerunner 235 specific filtering if applicable
    if (deviceId) {
      const device = await this.getUserDevices().then(devices => 
        devices.find(d => d.deviceId === deviceId)
      );
      
      if (device?.deviceName === 'Forerunner 235') {
        filteredData = filteredData.map(data => Forerunner235DataFilter.filterStepsData(data));
      }
    }

    await this.saveToFile(
      deviceId
        ? `steps-${date.toISOString().split('T')[0]}-device-${deviceId}.json`
        : `steps-${date.toISOString().split('T')[0]}.json`,
      filteredData
    );

    await this.importToSupabase('steps', filteredData.map(s => ({
      user_id: process.env.USER_ID,
      device_id: s.deviceId,
      date: date.toISOString().split('T')[0],
      ...s
    })));
  }

  public async extractDailyActivities(date: Date, deviceId?: string): Promise<void> {
    const activities = await this.client.getActivities(0, 100) as GarminActivity[];
    let dailyActivities = activities.filter((activity) => {
      const activityDate = new Date(activity.startTimeLocal).toISOString().split('T')[0];
      return activityDate === date.toISOString().split('T')[0] &&
        (!deviceId || activity.deviceId === deviceId);
    });

    // Apply Forerunner 235 specific filtering if applicable
    if (deviceId) {
      const device = await this.getUserDevices().then(devices => 
        devices.find(d => d.deviceId === deviceId)
      );
      
      if (device?.deviceName === 'Forerunner 235') {
        dailyActivities = dailyActivities.map(data => Forerunner235DataFilter.filterActivityData(data));
      }
    }

    await this.saveToFile(
      deviceId
        ? `activities-${date.toISOString().split('T')[0]}-device-${deviceId}.json`
        : `activities-${date.toISOString().split('T')[0]}.json`,
      dailyActivities
    );

    await this.importToSupabase('daily_activities', dailyActivities.map(activity => ({
      user_id: process.env.USER_ID,
      device_id: activity.deviceId,
      date: date.toISOString().split('T')[0],
      ...activity
    })));
  }

  public async extractLastNDays(days: number, deviceId?: string): Promise<void> {
    const dates = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date;
    });

    for (const date of dates) {
      await this.extractHeartRate(date, deviceId);
      await this.extractSleep(date, deviceId);
      await this.extractSteps(date, deviceId);
      await this.extractDailyActivities(date, deviceId);
    }
  }

  public async extractAll(deviceId?: string): Promise<void> {
    const devices = await this.getUserDevices();
    console.log('Available devices:', devices);

    if (deviceId) {
      const device = devices.find(d => d.deviceId === deviceId);
      if (!device) {
        throw new Error(`Device with ID ${deviceId} not found`);
      }
      console.log(`Extracting data for device: ${device.deviceName} (${deviceId})`);
    }

    await this.extractUserProfile();
    await this.extractRecentActivities(deviceId);
    await this.extractLastNDays(7, deviceId); // Extract last 7 days of data
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  (async () => {
    const days = parseInt(process.argv[2] || '30', 10);
    console.log('Starting extraction for', days, 'days');
    console.log('Environment variables present:', {
      GARMIN_USERNAME: !!process.env.GARMIN_USERNAME,
      GARMIN_PASSWORD: !!process.env.GARMIN_PASSWORD,
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_KEY: !!process.env.SUPABASE_KEY,
      USER_ID: !!process.env.USER_ID
    });

    try {
      console.log('Initializing Garmin client...');
      const client = new GarminConnect({
        username: process.env.GARMIN_USERNAME!,
        password: process.env.GARMIN_PASSWORD!
      });

      console.log('Attempting Garmin login...');
      await client.login();
      console.log('Successfully logged in to Garmin Connect');

      console.log('Initializing extractor...');
      const extractor = new GarminExtractor(client);

      console.log('Starting data extraction...');
      await extractor.extractLastNDays(days);
      
      console.log('Data extraction completed successfully');
    } catch (error) {
      console.error('Error during data extraction:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      } else {
        console.error('Non-Error object thrown:', error);
      }
      process.exit(1);
    }
  })().catch(error => {
    console.error('Top level error:', error);
    process.exit(1);
  });
}

