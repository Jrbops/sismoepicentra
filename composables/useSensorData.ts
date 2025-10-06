// Telefon sensör verilerini toplayan composable
import { ref, onMounted, onUnmounted } from 'vue'

interface SensorData {
  timestamp: number
  acceleration: {
    x: number
    y: number
    z: number
    magnitude: number
  }
  gyroscope: {
    alpha: number  // Z ekseni rotasyonu
    beta: number   // X ekseni rotasyonu
    gamma: number  // Y ekseni rotasyonu
  }
  deviceMotion: {
    accelerationIncludingGravity: {
      x: number
      y: number
      z: number
    }
    rotationRate: {
      alpha: number
      beta: number
      gamma: number
    }
  }
}

interface SeismicEvent {
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

export function useSensorData() {
  const isActive = ref(false)
  const currentData = ref<SensorData | null>(null)
  const seismicEvents = ref<SeismicEvent[]>([])
  const isSeismicDetected = ref(false)
  
  let accelerationHistory: number[] = []
  let gyroscopeHistory: number[] = []
  let sensorInterval: number | null = null
  let deviceMotionListener: ((event: DeviceMotionEvent) => void) | null = null
  let deviceOrientationListener: ((event: DeviceOrientationEvent) => void) | null = null
  
  // Sismik aktivite tespit parametreleri
  const SEISMIC_THRESHOLD = 2.0 // m/s² - sismik aktivite eşiği
  const SEISMIC_DURATION_MIN = 1000 // ms - minimum sismik süre
  const HISTORY_SIZE = 100 // Son 100 ölçüm
  
  // Sensör izinlerini al
  async function requestSensorPermissions() {
    try {
      // iOS Safari için izin iste
      if (typeof DeviceMotionEvent !== 'undefined' && 
          typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        const motionPermission = await (DeviceMotionEvent as any).requestPermission()
        const orientationPermission = await (DeviceOrientationEvent as any).requestPermission()
        
        return motionPermission === 'granted' && orientationPermission === 'granted'
      }
      
      // Android ve diğer tarayıcılar için otomatik izin
      // Mikrofon izni de iste (sensör verisi için)
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true })
        } catch (e) {
          console.warn('[Sensor] Audio permission not granted, continuing without it')
        }
      }
      
      return true
    } catch (error) {
      console.error('[Sensor] Permission error:', error)
      return false
    }
  }
  
  // Ivme büyüklüğünü hesapla
  function calculateMagnitude(x: number, y: number, z: number): number {
    return Math.sqrt(x * x + y * y + z * z)
  }
  
  // Sismik aktivite tespit et
  function detectSeismicActivity(magnitude: number): boolean {
    accelerationHistory.push(magnitude)
    if (accelerationHistory.length > HISTORY_SIZE) {
      accelerationHistory.shift()
    }
    
    // Son 10 ölçümün ortalaması
    const recentReadings = accelerationHistory.slice(-10)
    const average = recentReadings.reduce((sum, val) => sum + val, 0) / recentReadings.length
    
    // Eşik değerini aş ve süreklilik göster
    return average > SEISMIC_THRESHOLD && recentReadings.length >= 5
  }
  
  // Sismik olay kaydet
  async function recordSeismicEvent(maxAcceleration: number, duration: number) {
    try {
      const position = await getCurrentPosition()
      const deviceId = getDeviceId()
      
      const event: SeismicEvent = {
        timestamp: Date.now(),
        magnitude: maxAcceleration,
        duration,
        maxAcceleration,
        location: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        },
        deviceId
      }
      
      seismicEvents.value.push(event)
      
      // Server'a gönder
      await sendSeismicDataToServer(event)
      
      console.log('[Sensor] Seismic event recorded:', event)
    } catch (error) {
      console.error('[Sensor] Error recording seismic event:', error)
    }
  }
  
  // Konum al
  function getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'))
        return
      }
      
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 60000
      })
    })
  }
  
  // Cihaz ID'si oluştur
  function getDeviceId(): string {
    let deviceId = localStorage.getItem('deviceId')
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now()
      localStorage.setItem('deviceId', deviceId)
    }
    return deviceId
  }
  
  // Server'a sismik veri gönder
  async function sendSeismicDataToServer(event: SeismicEvent) {
    try {
      await $fetch('/api/seismic/report', {
        method: 'POST',
        body: event
      })
    } catch (error) {
      console.error('[Sensor] Error sending seismic data:', error)
    }
  }
  
  // Sensör verilerini işle
  function processSensorData(acceleration: any, gyroscope: any, deviceMotion: any) {
    const timestamp = Date.now()
    
    // Gravitasyonu çıkar (yaklaşık)
    const gravity = 9.81
    const netAcceleration = {
      x: acceleration.x,
      y: acceleration.y,
      z: acceleration.z - gravity
    }
    
    const magnitude = calculateMagnitude(netAcceleration.x, netAcceleration.y, netAcceleration.z)
    
    currentData.value = {
      timestamp,
      acceleration: {
        ...netAcceleration,
        magnitude
      },
      gyroscope,
      deviceMotion
    }
    
    // Sismik aktivite kontrolü
    const wasSeismic = isSeismicDetected.value
    isSeismicDetected.value = detectSeismicActivity(magnitude)
    
    // Yeni sismik olay başladı
    if (isSeismicDetected.value && !wasSeismic) {
      console.log('[Sensor] Seismic activity detected!')
      // Sismik olay kaydını başlat
      setTimeout(() => {
        if (accelerationHistory.length > 0) {
          const maxAccel = Math.max(...accelerationHistory.slice(-20))
          recordSeismicEvent(maxAccel, 2000) // 2 saniye süre varsayımı
        }
      }, 2000)
    }
  }
  
  // Sensör dinlemeyi başlat
  async function startSensorMonitoring() {
    if (isActive.value) return
    
    const hasPermission = await requestSensorPermissions()
    if (!hasPermission) {
      throw new Error('Sensor permissions denied')
    }
    
    isActive.value = true
    
    // DeviceMotion event listener
    deviceMotionListener = (event: DeviceMotionEvent) => {
      if (!event.accelerationIncludingGravity) return
      
      const acceleration = {
        x: event.accelerationIncludingGravity.x || 0,
        y: event.accelerationIncludingGravity.y || 0,
        z: event.accelerationIncludingGravity.z || 0
      }
      
      const gyroscope = {
        alpha: event.rotationRate?.alpha || 0,
        beta: event.rotationRate?.beta || 0,
        gamma: event.rotationRate?.gamma || 0
      }
      
      processSensorData(acceleration, gyroscope, {
        accelerationIncludingGravity: acceleration,
        rotationRate: gyroscope
      })
    }
    
    // Event listener'ları ekle
    window.addEventListener('devicemotion', deviceMotionListener, { passive: true })
    
    console.log('[Sensor] Monitoring started - 1 second interval')
  }
  
  // Sensör dinlemeyi durdur
  function stopSensorMonitoring() {
    isActive.value = false
    
    if (deviceMotionListener) {
      window.removeEventListener('devicemotion', deviceMotionListener)
      deviceMotionListener = null
    }
    
    if (sensorInterval) {
      clearInterval(sensorInterval)
      sensorInterval = null
    }
    
    console.log('[Sensor] Monitoring stopped')
  }
  
  // Sensör verilerini temizle
  function clearSensorData() {
    accelerationHistory = []
    gyroscopeHistory = []
    seismicEvents.value = []
    currentData.value = null
    isSeismicDetected.value = false
  }
  
  // Otomatik başlatma (component mount'ta)
  onMounted(() => {
    // Erken uyarı sistemi aktifse sensörleri başlat
    const ewSettings = localStorage.getItem('zelzele.ew-settings')
    if (ewSettings) {
      const settings = JSON.parse(ewSettings)
      if (settings.active !== false) { // Default true
        startSensorMonitoring().catch(console.error)
      }
    } else {
      // Varsayılan olarak başlat
      startSensorMonitoring().catch(console.error)
    }
  })
  
  onUnmounted(() => {
    stopSensorMonitoring()
  })
  
  return {
    isActive: readonly(isActive),
    currentData: readonly(currentData),
    seismicEvents: readonly(seismicEvents),
    isSeismicDetected: readonly(isSeismicDetected),
    startSensorMonitoring,
    stopSensorMonitoring,
    clearSensorData,
    requestSensorPermissions
  }
}
