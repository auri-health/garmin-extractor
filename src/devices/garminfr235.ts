import { GarminActivity, GarminHeartRate, GarminSleep, GarminSteps } from '../types/garmin';

interface SleepFields {
  deepSleepSeconds: boolean;
  lightSleepSeconds: boolean;
  awakeSleepSeconds: boolean;
  sleepMovement: boolean;
  remSleepSeconds: boolean;
  sleepQualityTypePK: boolean;
  sleepResultTypePK: boolean;
  respirationRate: boolean;
  pulseOx: boolean;
  sleepScore: boolean;
  stressLevel: boolean;
  [key: string]: boolean;
}

interface ActivityFields {
  activityId: boolean | 'partial';
  activityName: boolean | 'partial';
  startTimeLocal: boolean | 'partial';
  startTimeGMT: boolean | 'partial';
  distance: boolean | 'partial';
  duration: boolean | 'partial';
  averageHR: boolean | 'partial';
  maxHR: boolean | 'partial';
  calories: boolean | 'partial';
  steps: boolean | 'partial';
  averageSpeed: boolean | 'partial';
  maxSpeed: boolean | 'partial';
  elevationGain: boolean | 'partial';
  elevationLoss: boolean | 'partial';
  averageRunningCadenceInStepsPerMinute: boolean | 'partial';
  maxRunningCadenceInStepsPerMinute: boolean | 'partial';
  groundContactTime: boolean | 'partial';
  groundContactBalanceLeft: boolean | 'partial';
  verticalOscillation: boolean | 'partial';
  runningPower: boolean | 'partial';
  trainingEffect: boolean | 'partial';
  trainingEffectAnaerobic: boolean | 'partial';
  recoveryTime: boolean | 'partial';
  performanceCondition: boolean | 'partial';
  strideLength: boolean | 'partial';
  [key: string]: boolean | 'partial';
}

interface HeartRateFields {
  heartRate: boolean;
  timestamp: boolean;
  hrvStatus: boolean;
  hrvValueInMs: boolean;
  stressLevel: boolean;
  bodyBattery: boolean;
  pulseOx: boolean;
  [key: string]: boolean;
}

interface StepsFields {
  steps: boolean;
  timestamp: boolean;
  [key: string]: boolean;
}

interface DeviceConfig {
  deviceModel: string;
  supportedFeatures: {
    sleep: {
      supported: boolean;
      fields: SleepFields;
    };
    activities: {
      supported: boolean;
      fields: ActivityFields;
    };
    heartRate: {
      supported: boolean;
      fields: HeartRateFields;
    };
    steps: {
      supported: boolean;
      fields: StepsFields;
    };
  };
}

export const FORERUNNER_235_CONFIG: DeviceConfig = {
  deviceModel: 'Forerunner 235',
  supportedFeatures: {
    sleep: {
      supported: true,
      fields: {
        deepSleepSeconds: true,
        lightSleepSeconds: true,
        awakeSleepSeconds: true,
        sleepMovement: true,
        // Unsupported fields marked as false
        remSleepSeconds: false,
        sleepQualityTypePK: false,
        sleepResultTypePK: false,
        respirationRate: false,
        pulseOx: false,
        sleepScore: false,
        stressLevel: false
      }
    },
    activities: {
      supported: true,
      fields: {
        activityId: true,
        activityName: true,
        startTimeLocal: true,
        startTimeGMT: true,
        distance: true,
        duration: true,
        averageHR: true,
        maxHR: true,
        calories: true,
        steps: true,
        averageSpeed: true,
        maxSpeed: true,
        // Partially supported fields
        elevationGain: 'partial',
        elevationLoss: 'partial',
        averageRunningCadenceInStepsPerMinute: true,
        maxRunningCadenceInStepsPerMinute: true,
        // Unsupported fields
        groundContactTime: false,
        groundContactBalanceLeft: false,
        verticalOscillation: false,
        runningPower: false,
        trainingEffect: false,
        trainingEffectAnaerobic: false,
        recoveryTime: false,
        performanceCondition: false,
        strideLength: 'partial'
      }
    },
    heartRate: {
      supported: true,
      fields: {
        heartRate: true,
        timestamp: true,
        // Unsupported fields
        hrvStatus: false,
        hrvValueInMs: false,
        stressLevel: false,
        bodyBattery: false,
        pulseOx: false
      }
    },
    steps: {
      supported: true,
      fields: {
        steps: true,
        timestamp: true
      }
    }
  }
};

export class Forerunner235DataFilter {
  static filterSleepData(data: GarminSleep): GarminSleep {
    const { supportedFeatures } = FORERUNNER_235_CONFIG;
    const filtered: GarminSleep = {
      ...data, // Include all fields first
      deviceId: data.deviceId // Ensure required field is set
    };

    // Then remove unsupported fields
    Object.entries(data).forEach(([key, value]) => {
      if (!supportedFeatures.sleep.fields[key]) {
        delete filtered[key];
      }
    });

    return filtered;
  }

  static filterActivityData(data: GarminActivity): GarminActivity {
    const { supportedFeatures } = FORERUNNER_235_CONFIG;
    const filtered: GarminActivity = {
      ...data, // Include all fields first
      deviceId: data.deviceId,
      activityId: data.activityId,
      startTimeLocal: data.startTimeLocal
    };

    // Then remove unsupported fields
    Object.entries(data).forEach(([key, value]) => {
      if (!supportedFeatures.activities.fields[key]) {
        delete filtered[key];
      }
    });

    return filtered;
  }

  static filterHeartRateData(data: GarminHeartRate): GarminHeartRate {
    const { supportedFeatures } = FORERUNNER_235_CONFIG;
    const filtered: GarminHeartRate = {
      ...data, // Include all fields first
      deviceId: data.deviceId,
      timestamp: data.timestamp,
      value: data.value
    };

    // Then remove unsupported fields
    Object.entries(data).forEach(([key, value]) => {
      if (!supportedFeatures.heartRate.fields[key]) {
        delete filtered[key];
      }
    });

    return filtered;
  }

  static filterStepsData(data: GarminSteps): GarminSteps {
    const { supportedFeatures } = FORERUNNER_235_CONFIG;
    const filtered: GarminSteps = {
      ...data, // Include all fields first
      deviceId: data.deviceId,
      timestamp: data.timestamp,
      value: data.value
    };

    // Then remove unsupported fields
    Object.entries(data).forEach(([key, value]) => {
      if (!supportedFeatures.steps.fields[key]) {
        delete filtered[key];
      }
    });

    return filtered;
  }

  static validateDeviceId(deviceId: string): boolean {
    // Add any Forerunner 235-specific device ID validation if needed
    return true;
  }
} 