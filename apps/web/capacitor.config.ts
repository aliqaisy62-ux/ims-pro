import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.etana.app',
  appName: 'Etana',
  webDir: 'out',
  server: {
    // Set CAPACITOR_SERVER_URL in your local environment for device testing.
    // Production builds point to the production domain — never a raw IP.
    // Example: https://your-app-domain.com
    url: process.env.CAPACITOR_SERVER_URL || 'https://your-production-domain.com',
    cleartext: process.env.NODE_ENV !== 'production',
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: process.env.NODE_ENV !== 'production',
  },
};

export default config;
