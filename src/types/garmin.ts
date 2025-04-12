export interface GarminDevice {
  deviceId: string;
  productDisplayName: string;
  deviceType: string;
  [key: string]: any;
}

export interface GarminActivity {
  deviceId: string;
  activityId: string;
  startTimeLocal: string;
  endTimeLocal?: string;
  duration?: number;
  distance?: number;
  calories?: number;
  averageHR?: number;
  maxHR?: number;
  steps?: number;
  averageSpeed?: number;
  maxSpeed?: number;
  elevationGain?: number;
  elevationLoss?: number;
  averageRunningCadenceInStepsPerMinute?: number;
  maxRunningCadenceInStepsPerMinute?: number;
  groundContactTime?: number;
  groundContactBalanceLeft?: number;
  verticalOscillation?: number;
  runningPower?: number;
  trainingEffect?: number;
  trainingEffectAnaerobic?: number;
  recoveryTime?: number;
  performanceCondition?: number;
  strideLength?: number;
  [key: string]: any;
}

export interface GarminHeartRate {
  deviceId: string;
  timestamp: string;
  value: number;
  hrvStatus?: string;
  hrvValueInMs?: number;
  stressLevel?: number;
  bodyBattery?: number;
  pulseOx?: number;
  [key: string]: any;
}

export interface GarminSleep {
  deviceId: string;
  deepSleepSeconds?: number;
  lightSleepSeconds?: number;
  awakeSleepSeconds?: number;
  sleepMovement?: number;
  remSleepSeconds?: number;
  sleepQualityTypePK?: string | null;
  sleepResultTypePK?: string | null;
  respirationRate?: number | null;
  pulseOx?: number | null;
  sleepScore?: number | null;
  stressLevel?: number | null;
  [key: string]: any;
}

export interface GarminSteps {
  deviceId: string;
  timestamp: string;
  value: number;
  [key: string]: any;
} 