import { storage, StorageKeys } from './storage';

export const getDeviceId = (): string => {
  let deviceId = storage.get<string | null>(StorageKeys.DEVICE_ID, null);
  if (!deviceId) {
    deviceId = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : 'device-' + Math.random().toString(36).substring(2, 15);
    storage.set(StorageKeys.DEVICE_ID, deviceId);
  }
  return deviceId;
};

export const getDeviceInfo = () => {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
  return {
    deviceId: getDeviceId(),
    deviceType: /TV|SMART-TV|SmartTV/i.test(userAgent) ? 'tv' : 
                /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated/i.test(userAgent) ? 'mobile' : 
                /iPad|Tablet/i.test(userAgent) ? 'tablet' : 'desktop',
    appVersion: '2.0.0',
    platform: typeof navigator !== 'undefined' ? navigator.platform : 'Unknown'
  };
};
