
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.7cdda800cfad49beadb80686275039ff',
  appName: 'clap-hue-magic',
  webDir: 'dist',
  server: {
    url: 'https://7cdda800-cfad-49be-adb8-0686275039ff.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    // Here we can add plugin-specific configurations
  }
};

export default config;
