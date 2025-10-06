import { ref, onMounted, onBeforeUnmount } from 'vue';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  address?: {
    city: string;
    district: string;
    neighborhood: string;
    street: string;
    fullAddress: string;
  };
}

export const useLocationTracking = () => {
  const currentLocation = ref<LocationData | null>(null);
  const isTracking = ref(false);
  const error = ref<string | null>(null);
  let watchId: number | null = null;
  let updateInterval: any = null;

  // Reverse geocoding - Koordinatları adrese çevir
  async function reverseGeocode(lat: number, lng: number) {
    try {
      // Nominatim API (OpenStreetMap) - Rate limiting için delay ekle
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'Epicentra-App/1.0 (https://epicentra.io)',
            'Accept': 'application/json',
            'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data && data.address) {
        return {
          city: data.address.city || data.address.town || data.address.province || data.address.state || '',
          district: data.address.county || data.address.suburb || data.address.district || data.address.municipality || '',
          neighborhood: data.address.neighbourhood || data.address.quarter || data.address.hamlet || '',
          street: data.address.road || data.address.street || data.address.pedestrian || '',
          fullAddress: data.display_name || ''
        };
      }
    } catch (e) {
      console.error('Reverse geocoding error:', e);
      // Fallback: Basit koordinat bilgisi
      return {
        city: 'Bilinmeyen',
        district: 'Bilinmeyen',
        neighborhood: 'Bilinmeyen',
        street: 'Bilinmeyen',
        fullAddress: `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      };
    }
    
    return null;
  }

  // Konumu güncelle
  async function updateLocation(position: GeolocationPosition) {
    const { latitude, longitude, accuracy } = position.coords;
    
    // Adres bilgisini al
    const address = await reverseGeocode(latitude, longitude);
    
    currentLocation.value = {
      latitude,
      longitude,
      accuracy,
      timestamp: Date.now(),
      address: address || undefined
    };
    
    console.log('[Location] Updated:', currentLocation.value);
  }

  // Konum hata mesajlarını çevir
  function getErrorMessage(error: GeolocationPositionError): string {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Konum izni reddedildi. Lütfen tarayıcı ayarlarından konum iznini etkinleştirin.';
      case error.POSITION_UNAVAILABLE:
        return 'Konum bilgisi alınamadı. GPS veya internet bağlantınızı kontrol edin.';
      case error.TIMEOUT:
        return 'Konum alma zaman aşımına uğradı. Lütfen tekrar deneyin.';
      default:
        return 'Konum alınırken bilinmeyen bir hata oluştu.';
    }
  }

  // Konum takibini başlat
  async function startTracking() {
    // Client-side kontrolü
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return;
    }
    
    if (!('geolocation' in navigator)) {
      error.value = 'Tarayıcınız konum servislerini desteklemiyor';
      return;
    }

    // Önce izin durumunu kontrol et
    try {
      if ('permissions' in navigator) {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        
        if (permissionStatus.state === 'denied') {
          error.value = 'Konum izni reddedildi. Lütfen tarayıcı ayarlarından konum iznini etkinleştirin.';
          return;
        }
        
        console.log('[Location] Permission status:', permissionStatus.state);
      }
    } catch (e) {
      console.warn('[Location] Permission API not supported');
    }

    isTracking.value = true;
    error.value = null;

    // İlk konumu al
    navigator.geolocation.getCurrentPosition(
      updateLocation,
      (err) => {
        error.value = getErrorMessage(err);
        console.error('[Location] Error:', err);
        isTracking.value = false;
      },
      {
        enableHighAccuracy: false, // Daha hızlı sonuç için false
        timeout: 15000, // 15 saniye timeout
        maximumAge: 30000 // 30 saniye cache
      }
    );

    // Sürekli takip (her hareket)
    watchId = navigator.geolocation.watchPosition(
      updateLocation,
      (err) => {
        error.value = getErrorMessage(err);
        console.error('[Location] Watch error:', err);
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 30000
      }
    );

    // Her 10 saniyede bir güncelle (arka planda)
    updateInterval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        updateLocation,
        (err) => {
          console.error('[Location] Interval update error:', err);
          // Interval hatalarını sessizce logla
        },
        {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 30000
        }
      );
    }, 10000); // 10 saniye

    console.log('[Location] Tracking started');
  }

  // Konum takibini durdur
  function stopTracking() {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    
    if (updateInterval) {
      clearInterval(updateInterval);
      updateInterval = null;
    }
    
    isTracking.value = false;
    console.log('[Location] Tracking stopped');
  }

  // Otomatik başlat
  onMounted(() => {
    startTracking();
  });

  // Temizlik
  onBeforeUnmount(() => {
    stopTracking();
  });

  return {
    currentLocation,
    isTracking,
    error,
    startTracking,
    stopTracking
  };
};
