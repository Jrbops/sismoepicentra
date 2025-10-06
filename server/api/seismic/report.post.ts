// Telefon sensörlerinden gelen sismik verileri toplayan API
import { ensureAdmin } from '../../utils/firebaseAdmin'

interface SeismicReport {
  timestamp: number
  magnitude: number
  duration: number
  maxAcceleration: number
  location: {
    latitude: number
    longitude: number
  }
  deviceId: string
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) as SeismicReport
    
    // Veri doğrulama
    if (!body.timestamp || !body.magnitude || !body.location || !body.deviceId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      })
    }
    
    console.log(`[Seismic] Report from ${body.deviceId}: M${body.magnitude.toFixed(2)} at ${body.location.latitude},${body.location.longitude}`)
    
    // Firestore'a kaydet
    const { db } = ensureAdmin()
    
    const seismicData = {
      ...body,
      receivedAt: new Date(),
      processed: false,
      alertSent: false
    }
    
    await db.collection('seismicReports').add(seismicData)
    
    // Eğer büyüklük kritik seviyedeyse (>3.0) diğer kullanıcılara uyarı gönder
    if (body.magnitude > 3.0) {
      await processSeismicAlert(body)
    }
    
    // Yakın cihazları kontrol et (crowd-sourced detection)
    await checkNearbyDevices(body)
    
    return {
      success: true,
      message: 'Seismic data recorded',
      magnitude: body.magnitude,
      location: body.location
    }
    
  } catch (error) {
    console.error('[Seismic] Error processing report:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to process seismic report'
    })
  }
})

// Sismik uyarı işle
async function processSeismicAlert(report: SeismicReport) {
  try {
    console.log(`[Seismic] Processing alert for magnitude ${report.magnitude}`)
    
    // FCM bildirimi gönder
    const { messaging, db } = ensureAdmin()
    
    // Yakın kullanıcıları bul (50km içinde)
    const nearbyTokens = await findNearbyTokens(report.location, 50)
    
    if (nearbyTokens.length === 0) {
      console.log('[Seismic] No nearby users found')
      return
    }
    
    const message = {
      notification: {
        title: `🚨 Sismik Aktivite Tespit Edildi!`,
        body: `Büyüklük: ${report.magnitude.toFixed(1)} - Yakınınızda telefon sensörleri sismik aktivite tespit etti. Dikkatli olun!`
      },
      data: {
        type: 'seismic_alert',
        magnitude: String(report.magnitude),
        latitude: String(report.location.latitude),
        longitude: String(report.location.longitude),
        timestamp: String(report.timestamp),
        source: 'crowd_sensor'
      },
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default',
          channelId: 'earthquake_alerts',
          color: '#FF5722'
        }
      }
    }
    
    // Toplu bildirim gönder
    const batchSize = 500
    for (let i = 0; i < nearbyTokens.length; i += batchSize) {
      const batch = nearbyTokens.slice(i, i + batchSize)
      const response = await messaging.sendEachForMulticast({
        tokens: batch,
        ...message
      })
      
      console.log(`[Seismic] Alert sent to ${response.successCount}/${batch.length} devices`)
    }
    
    // Alert gönderildi olarak işaretle
    await db.collection('seismicReports')
      .where('deviceId', '==', report.deviceId)
      .where('timestamp', '==', report.timestamp)
      .get()
      .then(snapshot => {
        snapshot.forEach(doc => {
          doc.ref.update({ alertSent: true })
        })
      })
      
  } catch (error) {
    console.error('[Seismic] Error processing alert:', error)
  }
}

// Yakın cihazları kontrol et (crowd-sourced detection)
async function checkNearbyDevices(report: SeismicReport) {
  try {
    const { db } = ensureAdmin()
    
    // Son 30 saniyede aynı bölgeden (10km) gelen raporları kontrol et
    const thirtySecondsAgo = new Date(Date.now() - 30000)
    
    const nearbyReports = await db.collection('seismicReports')
      .where('receivedAt', '>', thirtySecondsAgo)
      .get()
    
    let nearbyCount = 0
    let totalMagnitude = report.magnitude
    
    nearbyReports.forEach(doc => {
      const data = doc.data()
      const distance = calculateDistance(
        report.location.latitude,
        report.location.longitude,
        data.location.latitude,
        data.location.longitude
      )
      
      // 10km içindeki raporlar
      if (distance <= 10 && data.deviceId !== report.deviceId) {
        nearbyCount++
        totalMagnitude += data.magnitude
      }
    })
    
    // 3+ cihaz aynı bölgede sismik aktivite tespit ettiyse
    if (nearbyCount >= 2) {
      const averageMagnitude = totalMagnitude / (nearbyCount + 1)
      console.log(`[Seismic] Crowd-sourced detection: ${nearbyCount + 1} devices, avg magnitude: ${averageMagnitude.toFixed(2)}`)
      
      // Güçlü crowd-sourced uyarı gönder
      if (averageMagnitude > 2.0) {
        await sendCrowdSourcedAlert(report.location, averageMagnitude, nearbyCount + 1)
      }
    }
    
  } catch (error) {
    console.error('[Seismic] Error checking nearby devices:', error)
  }
}

// Crowd-sourced uyarı gönder
async function sendCrowdSourcedAlert(location: any, magnitude: number, deviceCount: number) {
  try {
    const { messaging } = ensureAdmin()
    const nearbyTokens = await findNearbyTokens(location, 100) // 100km çevre
    
    const message = {
      notification: {
        title: `⚠️ Çoklu Cihaz Sismik Uyarısı`,
        body: `${deviceCount} cihaz sismik aktivite tespit etti! Ortalama büyüklük: ${magnitude.toFixed(1)} - Hazırlıklı olun!`
      },
      data: {
        type: 'crowd_seismic_alert',
        magnitude: String(magnitude),
        deviceCount: String(deviceCount),
        latitude: String(location.latitude),
        longitude: String(location.longitude),
        source: 'crowd_detection'
      },
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default',
          channelId: 'earthquake_alerts',
          color: '#FF0000'
        }
      }
    }
    
    const batchSize = 500
    for (let i = 0; i < nearbyTokens.length; i += batchSize) {
      const batch = nearbyTokens.slice(i, i + batchSize)
      await messaging.sendEachForMulticast({
        tokens: batch,
        ...message
      })
    }
    
    console.log(`[Seismic] Crowd-sourced alert sent to ${nearbyTokens.length} devices`)
    
  } catch (error) {
    console.error('[Seismic] Error sending crowd-sourced alert:', error)
  }
}

// Yakın token'ları bul
async function findNearbyTokens(location: any, radiusKm: number): Promise<string[]> {
  try {
    const { db } = ensureAdmin()
    
    // Basit yaklaşım: tüm token'ları al ve mesafeyi hesapla
    // Gerçek uygulamada geo-query kullanılmalı
    const tokensSnapshot = await db.collection('pushTokens').get()
    const nearbyTokens: string[] = []
    
    tokensSnapshot.forEach(doc => {
      const data = doc.data()
      if (data.token && data.location) {
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          data.location.latitude,
          data.location.longitude
        )
        
        if (distance <= radiusKm) {
          nearbyTokens.push(data.token)
        }
      }
    })
    
    return nearbyTokens
    
  } catch (error) {
    console.error('[Seismic] Error finding nearby tokens:', error)
    return []
  }
}

// İki nokta arası mesafe hesapla (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Dünya yarıçapı (km)
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}
