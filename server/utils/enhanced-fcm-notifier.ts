// Gelişmiş FCM bildirim sistemi - Konum tabanlı filtreleme
import { ensureAdmin } from './firebaseAdmin'

interface EarthquakeData {
  ID: string
  Date: string
  Magnitude: number
  Latitude: number
  Longitude: number
  Depth: number
  Region: {
    City: string
    District: string
  }
  Source: string
}

interface UserSettings {
  minMagnitude: number
  maxDistance: number
  cityFilter: string[]
  soundEnabled: boolean
  vibrationEnabled: boolean
  location?: { lat: number, lon: number }
}

// Mesafe hesaplama
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Deprem önem seviyesi
function getUrgencyLevel(magnitude: number, distance?: number): {
  level: 'low' | 'medium' | 'high' | 'critical'
  color: string
  priority: 'normal' | 'high'
  channelId: string
} {
  const isNear = distance && distance < 50;
  
  if (magnitude >= 6.0 || (magnitude >= 4.5 && isNear)) {
    return {
      level: 'critical',
      color: '#FF0000',
      priority: 'high',
      channelId: 'earthquake_critical'
    }
  } else if (magnitude >= 4.5 || (magnitude >= 3.5 && isNear)) {
    return {
      level: 'high',
      color: '#FF6600',
      priority: 'high',
      channelId: 'earthquake_high'
    }
  } else if (magnitude >= 3.0) {
    return {
      level: 'medium',
      color: '#FFAA00',
      priority: 'normal',
      channelId: 'earthquake_medium'
    }
  } else {
    return {
      level: 'low',
      color: '#00AA00',
      priority: 'normal',
      channelId: 'earthquake_low'
    }
  }
}

export async function sendEnhancedEarthquakeNotification(earthquake: EarthquakeData) {
  try {
    console.log('🚨 Gelişmiş deprem bildirimi gönderiliyor...')
    console.log(`📊 M${earthquake.Magnitude} - ${earthquake.Region.District}`)
    
    const { db, messaging } = ensureAdmin()
    
    // Tüm aktif token'ları al
    const tokensSnapshot = await db.collection('pushTokens')
      .where('active', '==', true)
      .get()
    
    if (tokensSnapshot.empty) {
      console.log('❌ Aktif token bulunamadı!')
      return { sent: 0, filtered: 0, errors: 0 }
    }
    
    let sentCount = 0
    let filteredCount = 0
    let errorCount = 0
    
    console.log(`📱 ${tokensSnapshot.size} cihaz kontrol ediliyor...`)
    
    // Her kullanıcı için filtreleme yap
    for (const doc of tokensSnapshot.docs) {
      const tokenData = doc.data()
      const userSettings: UserSettings = {
        minMagnitude: tokenData.userSettings?.minMag || 3.0,
        maxDistance: tokenData.userSettings?.maxDistance || 500,
        cityFilter: tokenData.userSettings?.cityFilter || [],
        soundEnabled: tokenData.userSettings?.soundEnabled !== false,
        vibrationEnabled: tokenData.userSettings?.vibrationEnabled !== false,
        location: tokenData.userSettings?.location
      }
      
      // Filtreleme kontrolü
      let shouldSend = true
      let filterReason = ''
      let distance: number | undefined
      
      // Büyüklük kontrolü
      if (earthquake.Magnitude < userSettings.minMagnitude) {
        shouldSend = false
        filterReason = `Büyüklük filtresi (${earthquake.Magnitude} < ${userSettings.minMagnitude})`
      }
      
      // Şehir filtresi
      if (shouldSend && userSettings.cityFilter.length > 0) {
        const earthquakeCity = earthquake.Region.City?.toLowerCase() || ''
        const earthquakeDistrict = earthquake.Region.District?.toLowerCase() || ''
        
        const matchesCity = userSettings.cityFilter.some(city => 
          earthquakeCity.includes(city.toLowerCase()) || 
          earthquakeDistrict.includes(city.toLowerCase())
        )
        
        if (!matchesCity) {
          shouldSend = false
          filterReason = `Şehir filtresi (${earthquake.Region.City})`
        }
      }
      
      // Mesafe kontrolü
      if (shouldSend && userSettings.location && userSettings.maxDistance > 0) {
        distance = calculateDistance(
          userSettings.location.lat,
          userSettings.location.lon,
          earthquake.Latitude,
          earthquake.Longitude
        )
        
        if (distance > userSettings.maxDistance) {
          shouldSend = false
          filterReason = `Mesafe filtresi (${Math.round(distance)}km > ${userSettings.maxDistance}km)`
        }
      }
      
      if (!shouldSend) {
        console.log(`⏭️ Filtrelendi: ${tokenData.deviceId} - ${filterReason}`)
        filteredCount++
        continue
      }
      
      // Önem seviyesi belirle
      const urgency = getUrgencyLevel(earthquake.Magnitude, distance)
      
      // Bildirim mesajı oluştur
      const distanceText = distance ? ` (${Math.round(distance)}km)` : ''
      const message = {
        token: tokenData.token,
        notification: {
          title: `🚨 ${urgency.level.toUpperCase()}: M${earthquake.Magnitude} DEPREM`,
          body: `📍 ${earthquake.Region.District}${distanceText}\n🏔️ ${earthquake.Depth}km derinlik\n⏰ ${earthquake.Date}`
        },
        data: {
          earthquakeId: earthquake.ID,
          magnitude: String(earthquake.Magnitude),
          city: earthquake.Region.City,
          district: earthquake.Region.District,
          depth: String(earthquake.Depth),
          latitude: String(earthquake.Latitude),
          longitude: String(earthquake.Longitude),
          source: earthquake.Source,
          date: earthquake.Date,
          urgencyLevel: urgency.level,
          distance: distance ? String(Math.round(distance)) : '0',
          type: 'enhanced_earthquake_alert'
        },
        android: {
          priority: urgency.priority,
          notification: {
            sound: userSettings.soundEnabled ? urgency.channelId : 'default',
            channelId: urgency.channelId,
            icon: 'ic_earthquake',
            color: urgency.color,
            tag: `earthquake_${earthquake.ID}`,
            importance: urgency.priority === 'high' ? 'high' : 'default',
            visibility: 'public' as const,
            sticky: urgency.level === 'critical',
            vibrate_timings: userSettings.vibrationEnabled ? 
              (urgency.level === 'critical' ? [500, 200, 500, 200, 500] : [300, 100, 300]) : 
              undefined
          }
        }
      }
      
      try {
        const response = await messaging.send(message)
        console.log(`✅ Gönderildi: ${tokenData.deviceId} (${urgency.level}${distanceText})`)
        sentCount++
        
      } catch (error: any) {
        console.log(`❌ Hata: ${tokenData.deviceId} - ${error.errorInfo?.code}`)
        errorCount++
        
        // Geçersiz token'ı deaktif et
        if (error.errorInfo?.code === 'messaging/registration-token-not-registered') {
          await doc.ref.update({ active: false })
          console.log('   🗑️ Geçersiz token deaktif edildi')
        }
      }
    }
    
    // Sonuç raporu
    console.log('\n📊 GELİŞMİŞ BİLDİRİM RAPORU:')
    console.log(`🎯 Toplam cihaz: ${tokensSnapshot.size}`)
    console.log(`✅ Gönderilen: ${sentCount}`)
    console.log(`⏭️ Filtrelenen: ${filteredCount}`)
    console.log(`❌ Hatalı: ${errorCount}`)
    console.log(`📈 Başarı oranı: ${Math.round((sentCount / tokensSnapshot.size) * 100)}%`)
    
    return {
      sent: sentCount,
      filtered: filteredCount,
      errors: errorCount,
      total: tokensSnapshot.size
    }
    
  } catch (error) {
    console.error('❌ Gelişmiş bildirim hatası:', error)
    throw error
  }
}
