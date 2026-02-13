import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.nself.family',
  appName: 'ɳFamily',
  webDir: '../../.next',
  server: {
    url: process.env.CAPACITOR_DEV_URL ?? 'http://localhost:3000',
    cleartext: process.env.NODE_ENV === 'development',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Camera: {
      allowEditing: true,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#2563EB',
    },
  },
  ios: {
    scheme: 'nFamily',
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
