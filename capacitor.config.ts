
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lovable.claphuemagic',
  appName: 'Clap Hue Magic',
  webDir: 'dist',
  server: {
    url: 'https://7cdda800-cfad-49be-adb8-0686275039ff.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    // Plugin configurations
    CapacitorHttp: {
      enabled: true
    }
  },
  android: {
    // Android specific configurations
    allowMixedContent: true
  }
};

export default config;
