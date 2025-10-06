<template>
  <div class="settings" vertical-center>
    <div class="settings__title" horizontal-center>
      <h2>Ayarlar</h2>
    </div>
    <br />
    <div class="settings__section">
      <h4>Görünüm</h4>
      <div class="row" horizontal-center>
        <label class="label" for="theme">Tema</label>
        <select id="theme" v-model="theme">
          <option value="system">Sistem Varsayılanı</option>
          <option value="light">Açık</option>
          <option value="dark">Koyu</option>
        </select>
      </div>
      <div class="row" horizontal-center>
        <label class="label" for="baseLayer">Harita Baz Katmanı</label>
        <select id="baseLayer" v-model="baseLayer">
          <option value="Carto Light">Carto Light</option>
          <option value="OSM">OSM</option>
          <option value="Stamen Toner">Stamen Toner</option>
        </select>
      </div>
    </div>

    <!-- 🔔 Gelişmiş Bildirim Sistemi -->
    <div class="settings__section">
      <h4>🔔 Bildirim Sistemi</h4>
      
      <!-- FCM Token Durumu -->
      <div class="row" horizontal-center>
        <label class="label">FCM Token Durumu</label>
        <div class="status-indicator" :class="fcmTokenStatus">
          <span v-if="fcmTokenStatus === 'active'">✅ Aktif</span>
          <span v-else-if="fcmTokenStatus === 'pending'">⏳ Bekleniyor</span>
          <span v-else>❌ İnaktif</span>
        </div>
      </div>
      
      <!-- Minimum Büyüklük -->
      <div class="row" horizontal-center>
        <label class="label" for="minMagnitude">Minimum Büyüklük</label>
        <select id="minMagnitude" v-model="notificationSettings.minMagnitude">
          <option value="2.0">2.0+</option>
          <option value="2.5">2.5+</option>
          <option value="3.0">3.0+</option>
          <option value="3.5">3.5+</option>
          <option value="4.0">4.0+</option>
          <option value="4.5">4.5+</option>
          <option value="5.0">5.0+</option>
        </select>
      </div>
      
      <!-- Maksimum Mesafe -->
      <div class="row" horizontal-center>
        <label class="label" for="maxDistance">Maksimum Mesafe (km)</label>
        <select id="maxDistance" v-model="notificationSettings.maxDistance">
          <option value="0">Sınırsız</option>
          <option value="50">50 km</option>
          <option value="100">100 km</option>
          <option value="200">200 km</option>
          <option value="500">500 km</option>
        </select>
      </div>
      
      <!-- Şehir Filtresi -->
      <div class="row" horizontal-center>
        <label class="label" for="cityFilter">Takip Edilen Şehirler</label>
        <div class="city-filter">
          <input 
            type="text" 
            v-model="newCity" 
            placeholder="Şehir adı girin..."
            @keyup.enter="addCity"
          />
          <button @click="addCity" class="add-btn">Ekle</button>
        </div>
      </div>
      
      <!-- Seçili Şehirler -->
      <div v-if="notificationSettings.cityFilter.length > 0" class="selected-cities">
        <div v-for="city in notificationSettings.cityFilter" :key="city" class="city-tag">
          {{ city }}
          <button @click="removeCity(city)" class="remove-btn">×</button>
        </div>
      </div>
      
      <!-- Ses ve Titreşim -->
      <div class="row" horizontal-center>
        <label class="label" for="soundEnabled">Sesli Uyarı</label>
        <input id="soundEnabled" type="checkbox" v-model="notificationSettings.soundEnabled" />
      </div>
      
      <div class="row" horizontal-center>
        <label class="label" for="vibrationEnabled">Titreşim</label>
        <input id="vibrationEnabled" type="checkbox" v-model="notificationSettings.vibrationEnabled" />
      </div>
      
      <!-- Konum Tabanlı Uyarı -->
      <div class="row" horizontal-center>
        <label class="label" for="locationBased">Konum Tabanlı Uyarı</label>
        <input id="locationBased" type="checkbox" v-model="notificationSettings.locationBased" @change="handleLocationToggle" />
      </div>
      
      <div v-if="notificationSettings.locationBased && userLocation" class="location-info">
        <small>📍 Konum: {{ userLocation.lat.toFixed(4) }}, {{ userLocation.lon.toFixed(4) }}</small>
      </div>
      
      <!-- Test Bildirimi -->
      <div class="row" horizontal-center>
        <button @click="sendTestNotification" class="test-btn" :disabled="fcmTokenStatus !== 'active'">
          🔔 Test Bildirimi Gönder
        </button>
        <button @click="checkNotificationStatus" class="test-btn" style="background-color: #17a2b8;">
          📊 Bildirim Durumu Kontrol Et
        </button>
        <button @click="openTestPage" class="test-btn" style="background-color: #6f42c1;">
          🧪 Detaylı Test Sayfası
        </button>
      </div>
    </div>

    <div class="settings__section">
      <h4>Harita</h4>
      <div class="row" horizontal-center>
        <label class="label" for="dataSource">Veri Kaynağı</label>
        <select id="dataSource" v-model="dataSource">
          <option value="afad">AFAD</option>
          <option value="koeri">Kandilli</option>
          <option value="both">Her ikisi</option>
        </select>
      </div>
      <div class="row" horizontal-center>
        <label class="label" for="cluster">Kümeleme</label>
        <input id="cluster" type="checkbox" v-model="useCluster" />
      </div>
      <div class="row" horizontal-center>
        <label class="label" for="heatmap">Isı Haritası</label>
        <input id="heatmap" type="checkbox" v-model="heatmap" />
      </div>
      <div class="row" horizontal-center>
        <label class="label" for="fitTurkey">Sadece Türkiye Sınırları</label>
        <input id="fitTurkey" type="checkbox" v-model="fitTurkey" />
      </div>
      <div class="row" horizontal-center>
        <label class="label" for="showLocation">Konumumu Göster</label>
        <input id="showLocation" type="checkbox" v-model="showLocation" />
      </div>
      <div class="row" horizontal-center>
        <label class="label" for="liveTracking">Canlı Takip (Konum)</label>
        <input id="liveTracking" type="checkbox" v-model="liveTracking" />
      </div>
      <div class="row" horizontal-center>
        <label class="label" for="refreshInterval">Otomatik Yenileme (sn)</label>
        <input id="refreshInterval" type="number" min="5" max="300" step="1" v-model.number="refreshIntervalSec" />
      </div>
    </div>

    <div class="settings__section">
      <h4>Bildirimler</h4>
      <div class="row" horizontal-center>
        <label class="label" for="pushNotifications">Deprem Bildirimi Al</label>
        <input id="pushNotifications" type="checkbox" v-model="pushNotifications" />
      </div>
      <div class="row" horizontal-center>
        <label class="label" for="publicTopic">Genel Uyarılar (topic: public)</label>
        <input id="publicTopic" type="checkbox" v-model="publicTopic" @change="onPublicTopicChange" />
      </div>
      <div class="row" horizontal-center>
        <label class="label" for="alertRadius">Uyarı Yarıçapı (km)</label>
        <select id="alertRadius" v-model.number="alertRadiusKm">
          <option :value="10">10 km</option>
          <option :value="25">25 km</option>
          <option :value="50">50 km</option>
          <option :value="100">100 km</option>
        </select>
      </div>
    </div>

    <div class="settings__section">
      <h4>Konum bazlı veriler</h4>
      <div class="row" horizontal-center>
        <label class="label" for="ewMinMag">Minimum Büyüklük</label>
        <input id="ewMinMag" type="number" step="0.1" v-model.number="ewMinMag" />
      </div>
      <div class="row" horizontal-center>
        <label class="label" for="ewMaxKm">Maksimum Mesafe (km)</label>
        <input id="ewMaxKm" type="number" step="1" v-model.number="ewMaxKm" />
      </div>
      <div class="row" horizontal-center>
        <label class="label" for="ewWithinMinutes">Son X dakika</label>
        <input id="ewWithinMinutes" type="number" step="1" v-model.number="ewWithinMinutes" />
      </div>
    </div>

    <div class="settings__section early-warning-always-on">
      <h4>🚨 Erken Uyarı Sistemi</h4>
      <div class="ew-status">
        <div class="ew-indicator">
          <div class="ew-pulse"></div>
          <span class="ew-text">DAİMA AKTİF</span>
        </div>
        <p class="ew-description">Erken uyarı sistemi güvenliğiniz için sürekli çalışır ve kapatılamaz.</p>
      </div>
      <div class="row" horizontal-center>
        <label class="label" for="ewMinMag">Minimum Büyüklük</label>
        <input id="ewMinMag" type="number" step="0.1" v-model.number="ewMinMagSetting" />
      </div>
      <div class="row" horizontal-center>
        <label class="label" for="ewCity">Şehir Filtresi</label>
        <input id="ewCity" type="text" v-model="ewCityFilter" placeholder="Tümü" />
      </div>
    </div>

    <div class="settings__section">
      <h4>Tatbikat</h4>
      <div class="row" horizontal-center>
        <button class="drill-btn" @click="startDrill">🚨 Deprem Tatbikatı Başlat</button>
      </div>
      <p class="drill-info">Gerçek bir deprem simülasyonu yaparak hazırlığınızı test edin.</p>
    </div>

    <!-- Canlı Konum Takibi -->
    <div class="settings__section location-section">
      <h4>📍 Canlı Konum Takibi</h4>
      <LiveLocationPanel />
    </div>

    <!-- Sismik Sensör Sistemi -->
    <div class="settings__section seismic-section">
      <SeismicSensorPanel />
    </div>

    <!-- FCM Token Bilgisi (Sadece geliştirici modu) -->
    <div class="settings__section" v-if="showDevMode">
      <h4>🔑 FCM Token Bilgisi (Geliştirici)</h4>
      <div class="token-container">
        <div class="token-display">
          <span class="token-label">Token:</span>
          <code class="token-value">{{ fcmToken || 'Token bulunamadı' }}</code>
        </div>
        <button class="copy-btn" @click="copyToken" v-if="fcmToken">📋 Kopyala</button>
      </div>
      <p class="token-info">Bu token push bildirimleri için kullanılır. Güvenlik nedeniyle paylaşmayın.</p>
    </div>

    <!-- Push Bildirim Durumu (Kullanıcı dostu) -->
    <div class="settings__section push-status-section">
      <h4>🔔 Bildirim Sistemi</h4>
      <div class="push-status">
        <div class="status-indicator" :class="{ active: pushNotifications }">
          <div class="status-dot"></div>
          <span class="status-text">{{ pushNotifications ? 'Bildirimler Aktif' : 'Bildirimler Kapalı' }}</span>
        </div>
        <p class="status-description">
          {{ pushNotifications ? 'Deprem bildirimleri otomatik olarak telefonunuza gönderilecek.' : 'Deprem bildirimlerini almak için aktif edin.' }}
        </p>
      </div>
    </div>

    <!-- Yönetim Paneli -->
    <div class="settings__section admin-section" v-if="showAdminPanel">
      <h4>⚙️ Yönetim Paneli</h4>
      <div class="admin-grid">
        <div class="admin-card" @click="openMonitoring">
          <div class="admin-icon">📊</div>
          <div class="admin-title">Server Monitoring</div>
          <div class="admin-desc">Sistem durumu ve loglar</div>
        </div>
        <div class="admin-card" @click="sendTestNotification">
          <div class="admin-icon">🔔</div>
          <div class="admin-title">Test Bildirimi</div>
          <div class="admin-desc">Push notification test</div>
        </div>
        <div class="admin-card" @click="viewLogs">
          <div class="admin-icon">📋</div>
          <div class="admin-title">Sistem Logları</div>
          <div class="admin-desc">Server ve hata logları</div>
        </div>
        <div class="admin-card" @click="manageUsers">
          <div class="admin-icon">👥</div>
          <div class="admin-title">Kullanıcı Yönetimi</div>
          <div class="admin-desc">Aktif kullanıcılar</div>
        </div>
      </div>
      <button class="close-admin" @click="showAdminPanel = false">❌ Paneli Kapat</button>
    </div>

    <div class="settings__section">
      <h4>🎤 Yönetim Sesli Komut</h4>
      <div class="row" horizontal-center>
        <button class="mic" @click="toggleVoice">{{ listening ? 'Dinleniyor…' : 'Mikrofonu Başlat' }}</button>
        <span v-if="lastHeard" class="mic__heard">“{{ lastHeard }}”</span>
      </div>
      <p class="help">"panel aç" deyin: gizli yönetim panelini açar. "panel kapat" deyin: paneli kapatır.</p>
    </div>

    <div class="settings__actions" horizontal-center>
      <button class="save" @click="save">Kaydet</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const theme = ref<'system' | 'light' | 'dark'>('system')
const baseLayer = ref<'Carto Light' | 'OSM' | 'Stamen Toner'>('Carto Light')
const dataSource = ref<'afad' | 'koeri' | 'both'>('both')
const useCluster = ref(true)
const heatmap = ref(false)
const fitTurkey = ref(true)
const showLocation = ref(false)
const liveTracking = ref(false)
const ewMinMag = ref<number>(3)
const ewMaxKm = ref<number>(500)
const ewWithinMinutes = ref<number>(120)
const refreshIntervalSec = ref<number>(10)
const pushNotifications = ref(false)
const publicTopic = ref(false)
const alertRadiusKm = ref<number>(25)
const ewActive = ref(true) // Daima aktif - kapatılamaz
const ewMinMagSetting = ref(3)
const ewCityFilter = ref('')

// FCM Token ve Yönetim Paneli
const fcmToken = ref('')
const showAdminPanel = ref(false)
const showDevMode = ref(false) // Geliştirici modu (gizli)

// Gelişmiş Bildirim Sistemi
const fcmTokenStatus = ref<'active' | 'pending' | 'inactive'>('pending')
const notificationSettings = ref({
  minMagnitude: 3.0,
  maxDistance: 0, // 0 = sınırsız
  cityFilter: [] as string[],
  soundEnabled: true,
  vibrationEnabled: true,
  locationBased: false
})
// FCM Token durumunu kontrol et
async function checkFcmTokenStatus() {
  try {
    // localStorage'dan token'ı al
    const localToken = localStorage.getItem('fcmToken') || (window as any).__FCM_TOKEN__
    
    if (localToken) {
      // Firestore'da token var mı kontrol et
      const { $db } = useNuxtApp()
      if ($db) {
        const { getDoc, doc } = await import('firebase/firestore')
        const tokenRef = doc($db, 'pushTokens', fcmToken.value.split('_')[2] || 'unknown')
        const tokenDoc = await getDoc(tokenRef)
        
        if (tokenDoc.exists()) {
          fcmTokenStatus.value = 'active'
          return
        }
      }
      // Sadece local'da varsa pending
      fcmTokenStatus.value = 'pending'
    } else {
      fcmTokenStatus.value = 'inactive'
    }
  } catch (error) {
    console.error('Token durum kontrolü hatası:', error)
    fcmTokenStatus.value = 'inactive'
  }
}

// Sayfa yüklendiğinde token durumunu kontrol et
onMounted(async () => {
  await checkFcmTokenStatus()
  
  // Token değişikliklerini dinle
  const checkInterval = setInterval(checkFcmTokenStatus, 5000)
  
  onUnmounted(() => {
    clearInterval(checkInterval)
  })
})

function isCordovaSpeechAvailable() {
  return !!((window as any).cordova && (window as any).plugins && (window as any).plugins.speechRecognition)
}

async function startCordovaListening() {
  const sr = (window as any).plugins.speechRecognition
  try {
    const has = await new Promise<boolean>((resolve) => sr.hasPermission((v: boolean) => resolve(v)))
    if (!has) {
      await new Promise<void>((resolve, reject) => sr.requestPermission(() => resolve(), (e: any) => reject(e)))
    }
    listening.value = true
    sr.startListening((matches: string[]) => {
      const text = (matches?.[0] || '').toLowerCase().trim()
      lastHeard.value = text
      handleCommand(text)
      listening.value = false
    }, (err: any) => {
      console.error('[speech] error', err)
      listening.value = false
    }, { language: 'tr-TR', showPartial: false, matches: 1 })
  } catch (e) {
    console.error('[speech] start error', e)
    alert('Mikrofon izni veya ses tanıma başlatılamadı.')
    listening.value = false
  }
}

function stopCordovaListening() {
  try {
    const sr = (window as any).plugins.speechRecognition
    sr.stopListening(() => { listening.value = false }, () => { listening.value = false })
  } catch {}
}

function handleCommand(text: string) {
  if (!text) return
  if (text.includes('panel aç')) {
    showAdminPanel.value = true
  } else if (text.includes('panel kapat')) {
    showAdminPanel.value = false
  } else if (text.includes('geliştirici modu')) {
    showDevMode.value = !showDevMode.value
    console.log('[Settings] Geliştirici modu:', showDevMode.value ? 'Açık' : 'Kapalı')
  }
}

// FCM Token fonksiyonları
function copyToken() {
  if (fcmToken.value) {
    navigator.clipboard.writeText(fcmToken.value)
    alert('FCM Token kopyalandı!')
  }
}

// Gelişmiş Bildirim Sistemi Fonksiyonları
function addCity() {
  if (newCity.value.trim() && !notificationSettings.value.cityFilter.includes(newCity.value.trim())) {
    notificationSettings.value.cityFilter.push(newCity.value.trim())
    newCity.value = ''
  }
}

function removeCity(city: string) {
  const index = notificationSettings.value.cityFilter.indexOf(city)
  if (index > -1) {
    notificationSettings.value.cityFilter.splice(index, 1)
  }
}

async function handleLocationToggle() {
  if (notificationSettings.value.locationBased) {
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            userLocation.value = {
              lat: position.coords.latitude,
              lon: position.coords.longitude
            }
            console.log('Konum alındı:', userLocation.value)
          },
          (error) => {
            console.error('Konum alınamadı:', error)
            alert('Konum izni verilmedi veya konum alınamadı.')
            notificationSettings.value.locationBased = false
          }
        )
      } else {
        alert('Bu cihaz konum hizmetlerini desteklemiyor.')
        notificationSettings.value.locationBased = false
      }
    } catch (error) {
      console.error('Konum hatası:', error)
      notificationSettings.value.locationBased = false
    }
  } else {
    userLocation.value = null
  }
}

// Yönetim paneli fonksiyonları
function openMonitoring() {
  window.open('http://localhost:9615', '_blank')
}

async function sendTestNotification() {
  try {
    const result = await $fetch('/api/push/test-notification', {
      method: 'POST',
      body: { magnitude: 4.5, city: 'Test', district: 'Yönetim', depth: 10 }
    })
    alert(`Test bildirimi gönderildi!\nDeprem: M${result.earthquake.Magnitude} - ${result.earthquake.Region.City}`)
  } catch (e) {
    alert('Test bildirimi gönderilemedi: ' + e)
  }
}

async function checkNotificationStatus() {
  try {
    const status = await $fetch('/api/push/status')
    
    let message = `📊 Bildirim Sistemi Durumu:\n\n`
    message += `🔑 Toplam Token: ${status.status.totalTokens}\n`
    message += `✅ Aktif Token: ${status.status.activeTokens}\n`
    message += `📝 Son 24 Saat Log: ${status.status.recentLogs}\n`
    message += `✅ Başarılı: ${status.status.successCount}\n`
    message += `❌ Hatalı: ${status.status.errorCount}\n\n`
    
    message += `🔧 Sistem Durumu:\n`
    message += `Firebase: ${status.systemHealth.firebase ? '✅' : '❌'}\n`
    message += `Messaging: ${status.systemHealth.messaging ? '✅' : '❌'}\n`
    message += `Database: ${status.systemHealth.database ? '✅' : '❌'}\n`
    
    if (status.recentLogs.length > 0) {
      message += `\n📋 Son Bildirimler:\n`
      status.recentLogs.forEach((log, index) => {
        const time = new Date(log.createdAt).toLocaleTimeString('tr-TR')
        const status = log.status === 'success' ? '✅' : '❌'
        message += `${index + 1}. ${status} ${time} - ${log.title}\n`
      })
    }
    
    alert(message)
  } catch (e) {
    alert('Bildirim durumu alınamadı: ' + e)
  }
}

function openTestPage() {
  window.open('/browser-test-notification.html', '_blank')
}

function viewLogs() {
  window.open('http://localhost:9615', '_blank')
}

function manageUsers() {
  alert('Kullanıcı yönetimi yakında aktif olacak!')
}

// Web API yedek (geliştirici/test amaçlı)
function ensureWebRecognition() {
  if (recognition) return recognition
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SpeechRecognition) return null
  recognition = new SpeechRecognition()
  recognition.lang = 'tr-TR'
  recognition.continuous = false
  recognition.interimResults = false
  recognition.onresult = (event: any) => {
    try {
      const text: string = (event.results?.[0]?.[0]?.transcript || '').toLowerCase().trim()
      lastHeard.value = text
      handleCommand(text)
    } catch {}
  }
  recognition.onend = () => { listening.value = false }
  recognition.onerror = () => { listening.value = false }
  return recognition
}

function toggleVoice() {
  if (isCordovaSpeechAvailable()) {
    if (!listening.value) startCordovaListening(); else stopCordovaListening()
    return
  }
  const rec = ensureWebRecognition()
  if (!rec) {
    // Web Speech API desteklenmiyorsa alternatif çözüm
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          alert('Mikrofon izni verildi! Sesli komut özelliği aktif.')
        })
        .catch(() => {
          alert('Mikrofon izni gerekli. Lütfen tarayıcı ayarlarından izin verin.')
        })
    } else {
      alert('Bu tarayıcı sesli komut özelliğini desteklemiyor.')
    }
    return
  }
  try {
    if (!listening.value) {
      rec.start(); listening.value = true
    } else {
      rec.stop(); listening.value = false
    }
  } catch (error) {
    console.error('Sesli komut hatası:', error)
    alert('Sesli komut başlatılamadı. Lütfen mikrofon iznini kontrol edin.')
  }
}

// Gelecekte: Bu değerler localStorage veya store'a yazılabilir.
const save = () => {
  try {
    const data = {
      theme: theme.value,
      baseLayer: baseLayer.value,
      dataSource: dataSource.value,
      useCluster: useCluster.value,
      heatmap: heatmap.value,
      fitTurkey: fitTurkey.value,
      showLocation: showLocation.value,
      liveTracking: liveTracking.value,
      ewMinMag: ewMinMag.value,
      ewMaxKm: ewMaxKm.value,
      ewWithinMinutes: ewWithinMinutes.value,
      refreshIntervalSec: refreshIntervalSec.value,
      pushNotifications: pushNotifications.value,
      ewActive: ewActive.value,
      ewMinMagSetting: ewMinMagSetting.value,
      ewCityFilter: ewCityFilter.value,
    }

async function onPublicTopicChange() {
  try {
    const token = localStorage.getItem('fcmToken') || (window as any).__FCM_TOKEN__
    if (!token) {
      alert('FCM token bulunamadı. Uygulamayı yeniden açın ve bildirime izin verin.')
      publicTopic.value = false
      return
    }
    if (publicTopic.value) {
      await $fetch('/api/push.topic.subscribe', { method: 'POST', body: { token, topic: 'public' } })
      persistPublicTopic(true)
      alert('Genel uyarılara abone olundu.')
    } else {
      await $fetch('/api/push.topic.unsubscribe', { method: 'POST', body: { token, topic: 'public' } })
      persistPublicTopic(false)
      alert('Genel uyarı aboneliği kapatıldı.')
    }
  } catch (e) {
    console.error('[topic] toggle error', e)
    alert('Abonelik işlemi sırasında hata oluştu.')
  }
}

function persistPublicTopic(val: boolean) {
  try {
    const raw = localStorage.getItem('zelzele.settings')
    const obj = raw ? JSON.parse(raw) : {}
    obj.publicTopic = val
    localStorage.setItem('zelzele.settings', JSON.stringify(obj))
  } catch {}
}
    localStorage.setItem('zelzele.settings', JSON.stringify(data))
    localStorage.setItem('zelzele.ew-settings', JSON.stringify({ minMag: ewMinMagSetting.value, cityFilter: ewCityFilter.value, active: ewActive.value }))
    alert('Ayarlar kaydedildi')
    if (pushNotifications.value) {
      registerPush();
    }
  } catch (e) {
    console.error(e)
  }
}

onMounted(() => {
  try {
    const raw = localStorage.getItem('zelzele.settings')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.theme) theme.value = parsed.theme
      if (parsed.baseLayer) baseLayer.value = parsed.baseLayer
      if (parsed.dataSource) dataSource.value = parsed.dataSource
      if (typeof parsed.useCluster === 'boolean') useCluster.value = parsed.useCluster
      if (typeof parsed.heatmap === 'boolean') heatmap.value = parsed.heatmap
      if (typeof parsed.fitTurkey === 'boolean') fitTurkey.value = parsed.fitTurkey
      if (typeof parsed.showLocation === 'boolean') showLocation.value = parsed.showLocation
      if (typeof parsed.liveTracking === 'boolean') liveTracking.value = parsed.liveTracking
      if (typeof parsed.ewMinMag === 'number') ewMinMag.value = parsed.ewMinMag
      if (typeof parsed.ewMaxKm === 'number') ewMaxKm.value = parsed.ewMaxKm
      if (typeof parsed.ewWithinMinutes === 'number') ewWithinMinutes.value = parsed.ewWithinMinutes
      if (typeof parsed.refreshIntervalSec === 'number') refreshIntervalSec.value = parsed.refreshIntervalSec
      if (typeof parsed.pushNotifications === 'boolean') pushNotifications.value = parsed.pushNotifications
      if (typeof parsed.ewActive === 'boolean') ewActive.value = parsed.ewActive
      if (typeof parsed.ewMinMagSetting === 'number') ewMinMagSetting.value = parsed.ewMinMagSetting
      if (typeof parsed.ewCityFilter === 'string') ewCityFilter.value = parsed.ewCityFilter
    }
  } catch {}
  
  // FCM Token'ı al
  try {
    fcmToken.value = localStorage.getItem('fcmToken') || (window as any).__FCM_TOKEN__ || ''
  } catch {}
  
  applyTheme(theme.value);
})

watch(theme, (val) => {
  applyTheme(val);
});

function applyTheme(val: string) {
  if (val === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
  } else if (val === 'light') {
    document.body.setAttribute('data-theme', 'light');
  } else {
    // Sistem varsayılanı
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.body.setAttribute('data-theme', 'light');
    }
  }
}

async function onPublicTopicChange() {
  try {
    const token = localStorage.getItem('fcmToken') || (window as any).__FCM_TOKEN__
    if (!token) {
      alert('FCM token bulunamadı. Uygulamayı yeniden açın ve bildirime izin verin.')
      publicTopic.value = false
      return
    }
    if (publicTopic.value) {
      await $fetch('/api/push.topic.subscribe', { method: 'POST', body: { token, topic: 'public' } })
      persistPublicTopic(true)
      // sessiz
    } else {
      await $fetch('/api/push.topic.unsubscribe', { method: 'POST', body: { token, topic: 'public' } })
      persistPublicTopic(false)
    }
  } catch (e) {
    console.error('[topic] toggle error', e)
    alert('Abonelik işlemi sırasında hata oluştu.')
  }
}

function persistPublicTopic(val: boolean) {
  try {
    const raw = localStorage.getItem('zelzele.settings')
    const obj = raw ? JSON.parse(raw) : {}
    obj.publicTopic = val
    localStorage.setItem('zelzele.settings', JSON.stringify(obj))
  } catch {}
}

async function registerPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert('Bu tarayıcı push bildirimleri desteklemiyor.');
    return;
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      alert('Bildirim izni reddedildi.');
      return;
    }
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    const vapidRes = await fetch('/api/push/vapid-public-key');
    const { publicKey } = await vapidRes.json();
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    const userSettings = {
      minMag: ewMinMagSetting.value,
      cityFilter: ewCityFilter.value,
      active: ewActive.value,
    };
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription, userSettings }),
    });
    alert('Push bildirimleri başarıyla kaydedildi!');
  } catch (e) {
    console.error('[push] registration error:', e);
    alert('Push kaydı sırasında hata oluştu.');
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function startDrill() {
  // Tatbikat depremi oluştur
  const drillEarthquake = {
    magnitude: 5.5,
    city: 'Tatbikat',
    district: 'Simülasyon',
    depth: 10
  };
  
  fetch('/api/push/test-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(drillEarthquake)
  }).then(() => {
    alert('Deprem tatbikatı başlatıldı! Talimatları takip edin.');
  });
}
</script>

<style lang="scss" scoped>
.settings {
  padding: 0 $padding-one;
  width: 100%;
  margin-top: 40px;
  max-width: $max-width-one;
  margin-inline: auto;

  h2, h4 { color: $dark; }

  &__title {
    width: 100%;
    justify-content: flex-start;
  }

  &__section {
    width: 100%;
    margin-top: 24px;
    padding: 16px;
    border: 1px solid $gray-one;
    border-radius: 8px;
    background-color: $white;

    .row {
      width: 100%;
      justify-content: space-between;
      margin-top: 12px;
      .label {
        min-width: 180px;
        font-weight: 600;
      }
      select {
        width: 220px;
        height: 36px;
        border: 2px solid $gray-one;
        border-radius: 4px;
        padding: 4px 8px;
        background: $white;
      }
      input[type='checkbox'] {
        width: 18px;
        height: 18px;
        accent-color: $dark;
      }
    }
  }

  &__actions {
    width: 100%;
    justify-content: flex-end;
    margin-top: 16px;
    .save {
      border: none;
      background-color: $dark;
      padding: 7px 24px;
      color: $white;
      border-radius: 3px;
      cursor: pointer;
    }
  }
  
  .drill-btn {
    width: 100%;
    padding: 14px 24px;
    background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:hover {
      transform: scale(1.02);
      box-shadow: 0 4px 12px rgba(231, 76, 60, 0.4);
    }
  }
  
  .drill-info {
    margin-top: 8px;
    font-size: 13px;
    color: $gray-three;
    text-align: center;
  }

  .mic {
    border: none;
    background-color: $dark;
    padding: 8px 16px;
    color: $white;
    border-radius: 6px;
    cursor: pointer;
  }
  .mic__heard { margin-left: 10px; color: $gray-three; font-size: 13px; }
  .help { margin-top: 8px; font-size: 12px; color: $gray-three; }

  // FCM Token Styles
  .token-container {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }
  
  .token-display {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .token-label {
    font-weight: 600;
    color: $dark;
    min-width: 50px;
  }
  
  .token-value {
    background: #f8f9fa;
    padding: 8px 12px;
    border-radius: 6px;
    border: 1px solid $gray-one;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    color: #333;
    word-break: break-all;
    flex: 1;
  }
  
  .copy-btn {
    background: $dark;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    
    &:hover {
      background: darken($dark, 10%);
    }
  }
  
  .token-info {
    font-size: 12px;
    color: $gray-three;
    margin-top: 8px;
  }

  // Admin Panel Styles
  .admin-section {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    
    h4 {
      color: white;
    }
  }
  
  .admin-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 20px;
  }
  
  .admin-card {
    background: rgba(255, 255, 255, 0.1);
    padding: 20px;
    border-radius: 12px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    border: 1px solid rgba(255, 255, 255, 0.2);
    
    &:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
  }
  
  .admin-icon {
    font-size: 32px;
    margin-bottom: 12px;
  }
  
  .admin-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 8px;
    color: white;
  }
  
  .admin-desc {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.8);
  }
  
  .close-admin {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
    padding: 10px 20px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    
    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }

  // Voice Status Animation
  .voice-status {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 12px;
    padding: 12px;
    background: #f0f8ff;
    border-radius: 8px;
    border-left: 4px solid #667eea;
  }
  
  .pulse-animation {
    width: 12px;
    height: 12px;
    background: #667eea;
    border-radius: 50%;
    animation: pulse 1.5s ease-in-out infinite;
  }
  
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.5;
      transform: scale(1.2);
    }
  }

  // Early Warning Always On Styles
  .early-warning-always-on {
    background: linear-gradient(135deg, #ff4444 0%, #cc0000 100%);
    color: white;
    border: 2px solid #ff6666;
    
    h4 {
      color: white;
      font-size: 1.2em;
      margin-bottom: 15px;
    }
    
    .label {
      color: rgba(255, 255, 255, 0.9);
    }
    
    input {
      background: rgba(255, 255, 255, 0.1);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      
      &::placeholder {
        color: rgba(255, 255, 255, 0.6);
      }
    }
  }
  
  .ew-status {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 20px;
    padding: 15px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  
  .ew-indicator {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
  }
  
  .ew-pulse {
    width: 16px;
    height: 16px;
    background: #00ff00;
    border-radius: 50%;
    box-shadow: 0 0 10px #00ff00;
    animation: ewPulse 1.5s ease-in-out infinite;
  }
  
  @keyframes ewPulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
      box-shadow: 0 0 10px #00ff00;
    }
    50% {
      opacity: 0.7;
      transform: scale(1.3);
      box-shadow: 0 0 20px #00ff00, 0 0 30px rgba(0, 255, 0, 0.5);
    }
  }
  
  .ew-text {
    font-size: 1.1em;
    font-weight: bold;
    color: #00ff00;
    text-shadow: 0 0 5px rgba(0, 255, 0, 0.5);
  }
  
  .ew-description {
    text-align: center;
    font-size: 0.9em;
    color: rgba(255, 255, 255, 0.8);
    line-height: 1.4;
  }

  // Push Status Section
  .push-status-section {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    border: 2px solid #34d399;
  }
  
  .push-status-section h4 {
    color: white;
  }
  
  .push-status {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
  
  .status-indicator {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 15px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  
  .status-indicator.active {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.4);
  }
  
  .status-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #ef4444;
  }
  
  .status-indicator.active .status-dot {
    background: #00ff00;
    animation: pulse 2s ease-in-out infinite;
  }
  
  .status-text {
    font-size: 1.1em;
    font-weight: 600;
    color: white;
  }
  
  .status-description {
    font-size: 0.9em;
    color: rgba(255, 255, 255, 0.8);
    line-height: 1.4;
    margin: 0;
  }
}

/* Gelişmiş Bildirim Sistemi Stilleri */
.status-indicator {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
}

.status-indicator.active {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.status-indicator.pending {
  background-color: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
}

.status-indicator.inactive {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.city-filter {
  display: flex;
  gap: 8px;
  align-items: center;
}

.city-filter input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.add-btn {
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.add-btn:hover {
  background-color: #0056b3;
}

.selected-cities {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.city-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background-color: #e9ecef;
  border-radius: 16px;
  font-size: 12px;
}

.remove-btn {
  background: none;
  border: none;
  color: #dc3545;
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-btn:hover {
  background-color: #dc3545;
  color: white;
  border-radius: 50%;
}

.location-info {
  margin-top: 8px;
  padding: 8px;
  background-color: #f8f9fa;
  border-radius: 4px;
  font-size: 12px;
  color: #6c757d;
}

.test-btn {
  padding: 10px 20px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.test-btn:hover:not(:disabled) {
  background-color: #218838;
}

.test-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}
</style>
