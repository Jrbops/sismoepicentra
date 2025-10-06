import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.epicentra.app',
  appName: 'Epicentra Io',
  // Web assets dir
  webDir: '.output/public',
  // Server URL kapalı - APK kendi dosyalarını kullanır
  // Ama API çağrıları Vercel'e gider
  // server: {
  //   url: 'https://epicentra-c38yv5e9d-toprak-ayvazs-projects.vercel.app',
  //   cleartext: false,
  // },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
    appendUserAgent: 'EpicentraApp/1.0.0',
    overrideUserAgent: 'EpicentraApp/1.0.0',
    backgroundColor: '#000000',
    initialFocus: true,
    mixedContentMode: 'compatibility',
    useOnLoadResource: true,
    hardwareAccelerated: true,
  },
};

export default config;