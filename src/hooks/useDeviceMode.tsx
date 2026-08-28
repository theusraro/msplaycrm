import React, { useEffect, useState, createContext, useContext } from 'react';

type DeviceMode = 'tv' | 'mobile' | 'tablet' | 'desktop';

interface DeviceModeValue {
  deviceMode: DeviceMode;
  isTv: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

const DeviceModeContext = createContext<DeviceModeValue>({
  deviceMode: 'desktop',
  isTv: false,
  isMobile: false,
  isTablet: false,
  isDesktop: true,
});

export const DeviceModeProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setMode] = useState<DeviceMode>('desktop');

  useEffect(() => {
    const checkDevice = () => {
      // Check URL query param for device simulation
      const params = new URLSearchParams(window.location.search);
      const deviceParam = params.get('device') as DeviceMode | null;

      let detectedMode: DeviceMode = 'desktop';

      if (deviceParam && ['tv', 'mobile', 'tablet', 'desktop'].includes(deviceParam)) {
        detectedMode = deviceParam;
      } else {
        const userAgent = navigator.userAgent || (navigator as Record<string, string>).vendor || '';
        const width = window.innerWidth;
        const hasPointer = window.matchMedia('(pointer: fine)').matches;
        const hasHover = window.matchMedia('(hover: hover)').matches;

        if (/Android TV|SMART-TV|SmartTV|AppleTV|Roku/i.test(userAgent)) {
          detectedMode = 'tv';
        } else if (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) && width < 768) {
          detectedMode = 'mobile';
        } else if (/iPad|Tablet/i.test(userAgent) || (width >= 768 && width <= 1024 && !hasPointer)) {
          detectedMode = 'tablet';
        } else if (width < 768 && !hasPointer) {
          detectedMode = 'mobile';
        } else if (width >= 768 && width <= 1024 && (!hasHover || !hasPointer)) {
          detectedMode = 'tablet';
        } else {
          detectedMode = 'desktop';
        }
      }

      setMode(detectedMode);
      document.documentElement.setAttribute('data-device', detectedMode);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  const value: DeviceModeValue = {
    deviceMode: mode,
    isTv: mode === 'tv',
    isMobile: mode === 'mobile',
    isTablet: mode === 'tablet',
    isDesktop: mode === 'desktop',
  };

  return (
    <DeviceModeContext.Provider value={value}>
      {children}
    </DeviceModeContext.Provider>
  );
};

export const useDeviceMode = () => {
  const context = useContext(DeviceModeContext);
  if (!context) {
    throw new Error('useDeviceMode must be used within a DeviceModeProvider');
  }
  return context;
};