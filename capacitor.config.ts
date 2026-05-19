import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.plinkoisis',
  appName: 'Plinko ISIS',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
  },
};

export default config;