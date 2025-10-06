// Konum tabanlı deprem filtreleme sistemi
export function useLocationFilter() {
  
  // Kullanıcının konumu ile deprem merkezi arasındaki mesafeyi hesapla
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Dünya'nın yarıçapı (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
  
  // Depremi kullanıcı ayarlarına göre filtrele
  function shouldNotifyUser(earthquake: any, userSettings: {
    minMagnitude: number
    maxDistance: number
    cityFilter: string[]
    userLocation?: { lat: number, lon: number }
  }): { shouldNotify: boolean, reason: string, distance?: number } {
    
    // Büyüklük kontrolü
    if (earthquake.Magnitude < userSettings.minMagnitude) {
      return {
        shouldNotify: false,
        reason: `Büyüklük çok küçük (${earthquake.Magnitude} < ${userSettings.minMagnitude})`
      }
    }
    
    // Şehir filtresi kontrolü
    if (userSettings.cityFilter.length > 0) {
      const earthquakeCity = earthquake.Region?.City?.toLowerCase() || '';
      const earthquakeDistrict = earthquake.Region?.District?.toLowerCase() || '';
      
      const matchesCity = userSettings.cityFilter.some(city => 
        earthquakeCity.includes(city.toLowerCase()) || 
        earthquakeDistrict.includes(city.toLowerCase())
      );
      
      if (!matchesCity) {
        return {
          shouldNotify: false,
          reason: `Şehir filtresine uymuyor (${earthquake.Region?.City})`
        }
      }
    }
    
    // Mesafe kontrolü (kullanıcı konumu varsa)
    if (userSettings.userLocation && userSettings.maxDistance > 0) {
      const distance = calculateDistance(
        userSettings.userLocation.lat,
        userSettings.userLocation.lon,
        earthquake.Latitude,
        earthquake.Longitude
      );
      
      if (distance > userSettings.maxDistance) {
        return {
          shouldNotify: false,
          reason: `Çok uzak (${Math.round(distance)}km > ${userSettings.maxDistance}km)`,
          distance: Math.round(distance)
        }
      }
      
      return {
        shouldNotify: true,
        reason: `Yakın deprem (${Math.round(distance)}km)`,
        distance: Math.round(distance)
      }
    }
    
    return {
      shouldNotify: true,
      reason: 'Filtreleri geçti'
    }
  }
  
  // Deprem önem seviyesini belirle
  function getEarthquakeUrgency(earthquake: any, distance?: number): {
    level: 'low' | 'medium' | 'high' | 'critical'
    color: string
    sound: string
    vibration: number[]
  } {
    const magnitude = earthquake.Magnitude;
    const isNear = distance && distance < 50;
    
    if (magnitude >= 6.0 || (magnitude >= 4.5 && isNear)) {
      return {
        level: 'critical',
        color: '#FF0000',
        sound: 'earthquake_critical',
        vibration: [500, 200, 500, 200, 500]
      }
    } else if (magnitude >= 4.5 || (magnitude >= 3.5 && isNear)) {
      return {
        level: 'high',
        color: '#FF6600',
        sound: 'earthquake_high',
        vibration: [300, 100, 300]
      }
    } else if (magnitude >= 3.0) {
      return {
        level: 'medium',
        color: '#FFAA00',
        sound: 'earthquake_medium',
        vibration: [200, 100, 200]
      }
    } else {
      return {
        level: 'low',
        color: '#00AA00',
        sound: 'default',
        vibration: [100]
      }
    }
  }
  
  // Türkiye şehirleri listesi
  const turkishCities = [
    'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Amasya', 'Ankara', 'Antalya',
    'Artvin', 'Aydın', 'Balıkesir', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu',
    'Burdur', 'Bursa', 'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır',
    'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun',
    'Gümüşhane', 'Hakkari', 'Hatay', 'Isparta', 'Mersin', 'İstanbul', 'İzmir',
    'Kars', 'Kastamonu', 'Kayseri', 'Kırklareli', 'Kırşehir', 'Kocaeli', 'Konya',
    'Kütahya', 'Malatya', 'Manisa', 'Kahramanmaraş', 'Mardin', 'Muğla', 'Muş',
    'Nevşehir', 'Niğde', 'Ordu', 'Rize', 'Sakarya', 'Samsun', 'Siirt', 'Sinop',
    'Sivas', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Şanlıurfa', 'Uşak',
    'Van', 'Yozgat', 'Zonguldak', 'Aksaray', 'Bayburt', 'Karaman', 'Kırıkkale',
    'Batman', 'Şırnak', 'Bartın', 'Ardahan', 'Iğdır', 'Yalova', 'Karabük', 'Kilis',
    'Osmaniye', 'Düzce'
  ];
  
  return {
    calculateDistance,
    shouldNotifyUser,
    getEarthquakeUrgency,
    turkishCities
  }
}
