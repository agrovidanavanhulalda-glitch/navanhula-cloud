import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.96bf4b017d5a4048be5b3c9cc612c7be',
  appName: 'navanhula-pos-sync',
  webDir: 'dist',
  server: {
    url: 'https://96bf4b01-7d5a-4048-be5b-3c9cc612c7be.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    BluetoothPrinter: {},
  },
};

export default config;
