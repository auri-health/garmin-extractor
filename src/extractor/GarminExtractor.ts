import { GarminConnect } from 'garmin-connect';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { GarminDevice, GarminActivity, GarminHeartRate, GarminSleep, GarminSteps } from '../types/garmin.js';
import { Forerunner235DataFilter } from '../devices/garminfr235';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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
    console.log('Initializing GarminExtractor...');
    this.client = client;
    if (!fs.existsSync(this.OUTPUT_DIR)) {
      console.log(`Creating output directory: ${this.OUTPUT_DIR}`);
      fs.mkdirSync(this.OUTPUT_DIR);
    }
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials. Please check SUPABASE_URL and SUPABASE_KEY environment variables.');
    }
    
    console.log('Initializing Supabase client...');
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  private async saveToFile(filename: string, data: unknown): Promise<void> {
    try {
      console.log(`Saving data to file: ${filename}`);
      const filePath = path.join(this.OUTPUT_DIR, filename);
      await fs.promises.writeFile(
        filePath,
        JSON.stringify(data, null, 2),
        'utf-8',
      );
      console.log(`Successfully saved data to: ${filePath}`);
    } catch (error) {
      console.error(`Failed to save file ${filename}:`, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  public async getUserDevices(): Promise<DeviceInfo[]> {
    try {
      console.log('Fetching user devices...');
      // Cast the client to any since getDeviceInfo is not in the type definitions
      const devices = await (this.client as any).getDeviceInfo() as GarminDevice[];
      console.log(`Found ${devices.length} devices`);
      return devices.map(device => ({
        deviceId: device.deviceId,
        deviceName: device.productDisplayName,
        deviceType: device.deviceType
      }));
    } catch (error) {
      console.error('Failed to get user devices:', error instanceof Error ? error.message : String(error));
      if (error instanceof Error) {
        console.error('Stack trace:', error.stack);
      }
      throw error;
    }
  }

  private async importToSupabase(tableName: string, data: Record<string, any> | Record<string, any>[]): Promise<void> {
    try {
      console.log(`Importing data to Supabase table: ${tableName}`);
      console.log('Data to import:', JSON.stringify(data, null, 2));
      
      const { error } = await this.supabase
        .from(tableName)
        .insert(data);

      if (error) {
        console.error(`Error importing to ${tableName}:`, error);
        throw error;
      }
      console.log(`Successfully imported data to ${tableName}`);
    } catch (error) {
      console.error(`Failed to import data to ${tableName}:`, error instanceof Error ? error.message : String(error));
      if (error instanceof Error) {
        console.error('Stack trace:', error.stack);
      }
      throw error;
    }
  }

  public async extractUserProfile(): Promise<void> {
    try {
      console.log('Extracting user profile...');
      const profile = await this.client.getUserProfile();
      console.log('User profile data:', JSON.stringify(profile, null, 2));
      
      await this.saveToFile('user-profile.json', profile);
      
      if (!process.env.USER_ID) {
        throw new Error('USER_ID environment variable is not set');
      }
      
      await this.importToSupabase('user_profiles', {
        user_id: process.env.USER_ID,
        ...profile
      });
      console.log('Successfully extracted and imported user profile');
    } catch (error) {
      console.error('Failed to extract user profile:', error instanceof Error ? error.message : String(error));
      if (error instanceof Error) {
        console.error('Stack trace:', error.stack);
      }
      throw error;
    }
  }

  public async extractRecentActivities(deviceId?: string): Promise<void> {
    try {
      console.log('Extracting recent activities...');
      const activities = await this.client.getActivities(0, 10) as GarminActivity[];
      console.log(`Found ${activities.length} recent activities`);
      
      const filteredActivities = deviceId 
        ? activities.filter(activity => activity.deviceId === deviceId)
        : activities;
      
      console.log(`After filtering for device ${deviceId}: ${filteredActivities.length} activities`);
      
      const filename = deviceId 
        ? `recent-activities-device-${deviceId}.json`
        : 'recent-activities.json';
      
      await this.saveToFile(filename, filteredActivities);

      if (!process.env.USER_ID) {
        throw new Error('USER_ID environment variable is not set');
      }

      const activitiesWithUserId = filteredActivities.map(activity => ({
        user_id: process.env.USER_ID,
        device_id: activity.deviceId,
        ...activity
      }));

      await this.importToSupabase('activities', activitiesWithUserId);
      console.log('Successfully extracted and imported recent activities');
    } catch (error) {
      console.error('Failed to extract recent activities:', error instanceof Error ? error.message : String(error));
      if (error instanceof Error) {
        console.error('Stack trace:', error.stack);
      }
      throw error;
    }
  }

  public async extractHeartRate(date: Date, deviceId?: string): Promise<void> {
    try {
      console.log(`Extracting heart rate data for date: ${date.toISOString()}`);
      const heartRate = await this.client.getHeartRate(date) as GarminHeartRate[];
      console.log(`Found ${heartRate.length} heart rate records`);
      
      let filteredData = deviceId
        ? heartRate.filter(hr => hr.deviceId === deviceId)
        : heartRate;
      
      console.log(`After filtering for device ${deviceId}: ${filteredData.length} records`);

      // Apply Forerunner 235 specific filtering if applicable
      if (deviceId) {
        console.log('Checking if device is Forerunner 235...');
        const device = await this.getUserDevices().then(devices => 
          devices.find(d => d.deviceId === deviceId)
        );
        
        if (device?.deviceName === 'Forerunner 235') {
          console.log('Applying Forerunner 235 specific filtering...');
          filteredData = filteredData.map(data => Forerunner235DataFilter.filterHeartRateData(data));
        }
      }

      const filename = deviceId
        ? `heart-rate-${date.toISOString().split('T')[0]}-device-${deviceId}.json`
        : `heart-rate-${date.toISOString().split('T')[0]}.json`;

      await this.saveToFile(filename, filteredData);

      if (!process.env.USER_ID) {
        throw new Error('USER_ID environment variable is not set');
      }

      const dataWithUserId = filteredData.map(hr => ({
        user_id: process.env.USER_ID,
        device_id: hr.deviceId,
        date: date.toISOString().split('T')[0],
        ...hr
      }));

      await this.importToSupabase('heart_rate', dataWithUserId);
      console.log('Successfully extracted and imported heart rate data');
    } catch (error) {
      console.error('Failed to extract heart rate data:', error instanceof Error ? error.message : String(error));
      if (error instanceof Error) {
        console.error('Stack trace:', error.stack);
      }
      throw error;
    }
  }

  public async extractSleep(date: Date, deviceId?: string): Promise<void> {
    try {
      console.log(`Extracting sleep data for date: ${date.toISOString()}`);
      const sleep = await this.client.getSleepData(date) as GarminSleep[];
      console.log(`Found ${sleep.length} sleep records`);
      
      let filteredData = deviceId
        ? sleep.filter(s => s.deviceId === deviceId)
        : sleep;
      
      console.log(`After filtering for device ${deviceId}: ${filteredData.length} records`);

      if (deviceId) {
        console.log('Checking if device is Forerunner 235...');
        const device = await this.getUserDevices().then(devices => 
          devices.find(d => d.deviceId === deviceId)
        );
        
        if (device?.deviceName === 'Forerunner 235') {
          console.log('Applying Forerunner 235 specific filtering...');
          filteredData = filteredData.map(data => Forerunner235DataFilter.filterSleepData(data));
        }
      }

      const filename = deviceId
        ? `sleep-${date.toISOString().split('T')[0]}-device-${deviceId}.json`
        : `sleep-${date.toISOString().split('T')[0]}.json`;

      await this.saveToFile(filename, filteredData);

      if (!process.env.USER_ID) {
        throw new Error('USER_ID environment variable is not set');
      }

      const dataWithUserId = filteredData.map(s => ({
        user_id: process.env.USER_ID,
        device_id: s.deviceId,
        date: date.toISOString().split('T')[0],
        ...s
      }));

      await this.importToSupabase('sleep', dataWithUserId);
      console.log('Successfully extracted and imported sleep data');
    } catch (error) {
      console.error('Failed to extract sleep data:', error instanceof Error ? error.message : String(error));
      if (error instanceof Error) {
        console.error('Stack trace:', error.stack);
      }
      throw error;
    }
  }

  public async extractSteps(date: Date, deviceId?: string): Promise<void> {
    try {
      console.log(`Extracting steps data for date: ${date.toISOString()}`);
      const stepsResponse = await this.client.getSteps(date);
      const steps = Array.isArray(stepsResponse) ? stepsResponse : [stepsResponse];
      const typedSteps = steps as unknown as GarminSteps[];
      console.log(`Found ${typedSteps.length} steps records`);
      
      let filteredData = deviceId
        ? typedSteps.filter(s => s.deviceId === deviceId)
        : typedSteps;
      
      console.log(`After filtering for device ${deviceId}: ${filteredData.length} records`);

      if (deviceId) {
        console.log('Checking if device is Forerunner 235...');
        const device = await this.getUserDevices().then(devices => 
          devices.find(d => d.deviceId === deviceId)
        );
        
        if (device?.deviceName === 'Forerunner 235') {
          console.log('Applying Forerunner 235 specific filtering...');
          filteredData = filteredData.map(data => Forerunner235DataFilter.filterStepsData(data));
        }
      }

      const filename = deviceId
        ? `steps-${date.toISOString().split('T')[0]}-device-${deviceId}.json`
        : `steps-${date.toISOString().split('T')[0]}.json`;

      await this.saveToFile(filename, filteredData);

      if (!process.env.USER_ID) {
        throw new Error('USER_ID environment variable is not set');
      }

      const dataWithUserId = filteredData.map(s => ({
        user_id: process.env.USER_ID,
        device_id: s.deviceId,
        date: date.toISOString().split('T')[0],
        ...s
      }));

      await this.importToSupabase('steps', dataWithUserId);
      console.log('Successfully extracted and imported steps data');
    } catch (error) {
      console.error('Failed to extract steps data:', error instanceof Error ? error.message : String(error));
      if (error instanceof Error) {
        console.error('Stack trace:', error.stack);
      }
      throw error;
    }
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
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise);
    if (reason instanceof Error) {
      console.error('Error:', {
        name: reason.name,
        message: reason.message,
        stack: reason.stack
      });
    } else {
      console.error('Non-Error rejection reason:', 
        typeof reason === 'object' ? JSON.stringify(reason, null, 2) : reason
      );
    }
    process.exit(1);
  });

  (async () => {
    const days = parseInt(process.argv[2] || '30', 10);
    console.log('Starting extraction for', days, 'days');

    // Check required environment variables
    const requiredEnvVars = ['GARMIN_USERNAME', 'GARMIN_PASSWORD', 'SUPABASE_URL', 'SUPABASE_KEY', 'USER_ID'];
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingEnvVars.length > 0) {
      console.error('Missing required environment variables:', missingEnvVars);
      process.exit(1);
    }

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
      console.error('Error during data extraction:');
      if (error instanceof Error) {
        console.error({
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      } else {
        console.error('Non-Error object thrown:', 
          typeof error === 'object' ? JSON.stringify(error, null, 2) : error
        );
      }
      process.exit(1);
    }
  })().catch(error => {
    console.error('Top level error:');
    if (error instanceof Error) {
      console.error({
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    } else {
      console.error('Non-Error object thrown:', 
        typeof error === 'object' ? JSON.stringify(error, null, 2) : error
      );
    }
    process.exit(1);
  });
}

