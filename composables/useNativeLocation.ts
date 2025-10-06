// Native Geolocation - Capacitor Plugin
import { Geolocation } from '@capacitor/geolocation';

export const useNativeLocation = () => {
  
  // İzin kontrolü
  async function checkPermissions() {
    try {
      const permission = await Geolocation.checkPermissions();
      console.log('[NativeLocation] Permission status:', permission);
      return permission.location;
    } catch (error) {
      console.error('[NativeLocation] Permission check error:', error);
      return 'denied';
    }
  }

  // İzin iste
  async function requestPermissions() {
    try {
      const permission = await Geolocation.requestPermissions();
      console.log('[NativeLocation] Permission requested:', permission);
      return permission.location;
    } catch (error) {
      console.error('[NativeLocation] Permission request error:', error);
      return 'denied';
    }
  }

  // Mevcut konumu al
  async function getCurrentPosition() {
    try {
      console.log('[NativeLocation] Getting current position...');
      
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
      
      console.log('[NativeLocation] Position:', position);
      
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp
      };
    } catch (error) {
      console.error('[NativeLocation] Get position error:', error);
      throw error;
    }
  }

  // Konum takibi başlat
  async function watchPosition(callback: (position: any) => void) {
    try {
      const watchId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        },
        (position, err) => {
          if (err) {
            console.error('[NativeLocation] Watch error:', err);
            return;
          }
          if (position) {
            callback({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp
            });
          }
        }
      );
      
      return watchId;
    } catch (error) {
      console.error('[NativeLocation] Watch position error:', error);
      throw error;
    }
  }

  // Konum takibini durdur
  async function clearWatch(watchId: string) {
    try {
      await Geolocation.clearWatch({ id: watchId });
    } catch (error) {
      console.error('[NativeLocation] Clear watch error:', error);
    }
  }

  return {
    checkPermissions,
    requestPermissions,
    getCurrentPosition,
    watchPosition,
    clearWatch
  };
};
