import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.etana.app',
  appName: 'Etana',
  webDir: 'out',
  server: {
    // For public-IP testing: replace YOUR_PUBLIC_IP with your actual IP (e.g. 203.x.x.x)
    // Switch back to 'https://ims-pro.vercel.app' for production builds
    url: 'http://212.95.151.51:3001',
    cleartext: true,
    androidScheme: 'http',
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
