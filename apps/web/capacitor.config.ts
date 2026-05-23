import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.etana.app',
  appName: 'Etana',
  webDir: 'out',
  server: {
    url: 'https://ims-pro.vercel.app',
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
