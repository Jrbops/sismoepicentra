// Direkt API çağrıları - Backend'e ihtiyaç yok
import type { EarthquakeInterface } from '~~/interfaces/earthquake.interface';

export const useDirectAPI = () => {
  
  // Orhan Aydoğdu API - Tüm depremler
  async function fetchAll() {
    try {
      const response = await fetch('https://api.orhanaydogdu.com.tr/deprem/kandilli/live');
      const data = await response.json();
      
      console.log('[DirectAPI] Kandilli response:', data);
      
      if (data.status && Array.isArray(data.result)) {
        const parsed = parseOrhanaydogduData(data.result);
        console.log('[DirectAPI] Parsed earthquakes:', parsed.length);
        return parsed;
      }
      return [];
    } catch (error) {
      console.error('[DirectAPI] API error:', error);
      return [];
    }
  }

  // AFAD API
  async function fetchAFAD() {
    try {
      const response = await fetch('https://api.orhanaydogdu.com.tr/deprem/live');
      const data = await response.json();
      
      if (data.success && Array.isArray(data.result)) {
        return parseOrhanaydogduData(data.result);
      }
      return [];
    } catch (error) {
      console.error('AFAD API error:', error);
      return [];
    }
  }

  // KOERI/Kandilli API
  async function fetchKOERI() {
    try {
      const response = await fetch('https://api.orhanaydogdu.com.tr/deprem/kandilli/live');
      const data = await response.json();
      
      if (data.success && Array.isArray(data.result)) {
        return parseOrhanaydogduData(data.result);
      }
      return [];
    } catch (error) {
      console.error('KOERI API error:', error);
      return [];
    }
  }

  // Orhan Aydoğdu API veri parse
  function parseOrhanaydogduData(data: any[]): EarthquakeInterface[] {
    if (!Array.isArray(data)) return [];
    
    return data.map((item: any): EarthquakeInterface => {
      // Tarihi ISO formatına çevir (Türkiye saati UTC+3)
      let isoDate = item.date_time || item.date || new Date().toISOString();
      if (!isoDate.includes('T')) {
        // "2025-09-30 19:47:27" -> "2025-09-30T19:47:27+03:00" (Türkiye saati)
        isoDate = isoDate.replace(' ', 'T') + '+03:00';
      } else if (isoDate.endsWith('Z')) {
        // Zaten UTC ise bırak
      } else if (!isoDate.includes('+') && !isoDate.includes('-', 10)) {
        // Timezone yoksa Türkiye saati ekle
        isoDate = isoDate + '+03:00';
      }
      
      // Koordinatları al
      const lat = item.geojson?.coordinates?.[1] || item.lat || item.latitude || 0;
      const lng = item.geojson?.coordinates?.[0] || item.lng || item.longitude || 0;
      
      // Şehir bilgisini al
      const cityName = item.location_properties?.epiCenter?.name || 
                       item.location_properties?.closestCity?.name || 
                       item.title?.split('-')?.[1]?.split('(')?.[1]?.replace(')', '') || '';
      
      return {
        ID: `eq-${item.earthquake_id}`,
        Date: isoDate,
        Magnitude: parseFloat(item.mag || 0),
        Type: 'ML',
        Latitude: parseFloat(lat),
        Longitude: parseFloat(lng),
        Depth: parseFloat(item.depth || 0),
        Region: {
          City: cityName.trim(),
          District: item.title || ''
        },
        Source: item.provider === 'kandilli' ? 'KOERI' : 'AFAD',
        ProviderURL: item.provider === 'kandilli' ? 'http://www.koeri.boun.edu.tr' : 'https://deprem.afad.gov.tr'
      };
    });
  }

  return {
    fetchAFAD,
    fetchKOERI,
    fetchAll
  };
};
