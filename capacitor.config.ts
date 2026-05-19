import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.plinkoisis',
  appName: 'Plinko ISIS',
  webDir: 'dist',
  server: {
    url: 'https://7763c2dc-9798-4c6d-92f5-39d829f93d3b.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;