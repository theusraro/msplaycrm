import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.msplay.crm',
  appName: 'MSPLAY CRM',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0a0a0a',
      showSpinner: true,
      spinnerColor: '#ef4444'
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a0a'
    }
  }
};

export default config;
