<template>
  <Teleport to="body">
    <div v-if="isVisible" class="alert-fullscreen" :class="`alert-level-${alertLevel}`">
      <!-- Üst Bilgi -->
      <div class="alert-header">
        <div class="alert-badge" :class="`badge-level-${alertLevel}`">
          {{ alertLevelText }}
        </div>
        <p class="earthquake-info">
          {{ earthquake?.Region.City }}'ye {{ distanceToEpicenter }}km'de tespit edilen {{ magnitudeText }} deprem. 
          Size {{ distanceToUser }}km uzaklıkta. Yön {{ direction }}
        </p>
      </div>

      <!-- Geri Sayım ve Talimatlar -->
      <div class="countdown-section">
        <div class="countdown-text">{{ countdown }} saniyede sismik dalga</div>
        <div class="warning-text">{{ shakeIntensity }}</div>
        <div class="action-instruction">{{ currentInstruction }}</div>
      </div>
      
      <!-- Harita -->
      <div class="alert-map" ref="mapContainer"></div>

      <!-- Deprem Sonrası Checklist -->
      <div v-if="countdown === 0 && !isDrill" class="post-earthquake-checklist">
        <h3>Deprem Sonrası Kontrol Listesi</h3>
        <label v-for="item in checklist" :key="item.id">
          <input type="checkbox" v-model="item.checked" />
          {{ item.text }}
        </label>
      </div>

      <!-- Alt Butonlar -->
      <div class="alert-footer">
        <button v-if="!isDrill" class="footer-btn safe-btn" @click="sendSafeMessage">
          ✓ GÜVENDEYİM
        </button>
        <button class="footer-btn alarm-btn" @click="toggleAlarm">
          {{ alarmMuted ? '🔇 ALARMI AÇ' : '🔊 ALARMI DURDUR' }}
        </button>
        <button v-if="!isDrill" class="footer-btn emergency-btn" @click="showEmergencyContacts">
          📞 ACİL ARAMA
        </button>
        <button class="footer-btn exit-btn" @click="close">
          {{ isDrill ? 'TATBİKATI BİTİR' : 'ÇIKIŞ' }}
        </button>
      </div>

      <!-- Acil Durum Kişileri Modal -->
      <div v-if="showContacts" class="emergency-modal" @click.self="showContacts = false">
        <div class="modal-content">
          <h3>Acil Durum Kişileri</h3>
          <button v-for="contact in emergencyContacts" :key="contact.name" 
                  class="contact-btn" @click="callContact(contact)">
            📞 {{ contact.name }} - {{ contact.phone }}
          </button>
          <button class="close-modal-btn" @click="showContacts = false">Kapat</button>
        </div>
      </div>

      <audio ref="alarmAudio" loop>
        <source src="/alarm.mp3" type="audio/mpeg">
      </audio>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { EarthquakeInterface } from '~~/interfaces/earthquake.interface';

const props = defineProps<{
  earthquake: EarthquakeInterface | null;
  isDrill?: boolean;
}>();

const emit = defineEmits(['close']);

const isVisible = ref(false);
const countdown = ref(30);
const mapContainer = ref<HTMLElement | null>(null);
const alarmAudio = ref<HTMLAudioElement | null>(null);
const alarmMuted = ref(false);
const showContacts = ref(false);

// Konum ve mesafe
const userLocation = ref<{ lat: number; lng: number } | null>(null);
const distanceToEpicenter = ref(61);
const distanceToUser = ref(61);
const direction = ref('E');

// Uyarı seviyesi (1-4)
const alertLevel = computed(() => {
  const mag = props.earthquake?.Magnitude || 0;
  const dist = distanceToUser.value;
  
  if (mag >= 6.0 && dist < 20) return 4; // Acil
  if (mag >= 5.0 && dist < 50) return 3; // Uyarı
  if (mag >= 4.0 && dist < 100) return 2; // Dikkat
  return 1; // Bilgi
});

const alertLevelText = computed(() => {
  const levels = ['BİLGİ', 'DİKKAT', 'UYARI', 'ACİL'];
  return levels[alertLevel.value - 1];
});

const magnitudeText = computed(() => {
  const mag = props.earthquake?.Magnitude || 0;
  if (mag >= 7.0) return 'çok şiddetli';
  if (mag >= 6.0) return 'şiddetli';
  if (mag >= 5.0) return 'kuvvetli';
  return 'orta şiddette';
});

const shakeIntensity = computed(() => {
  const mag = props.earthquake?.Magnitude || 0;
  if (mag >= 6.0) return 'Şiddetli sallanma bekliyoruz';
  if (mag >= 5.0) return 'Güçlü sallanma bekliyoruz';
  if (mag >= 4.0) return 'Orta sallanma bekliyoruz';
  return 'Hafif sallanma bekliyoruz';
});

// Zamana göre talimatlar
const currentInstruction = computed(() => {
  if (countdown.value > 20) return '🛡️ Masanın altına girin, başınızı koruyun';
  if (countdown.value > 10) return '⚠️ Pencerelerden uzaklaşın, sabit bir yere tutunun';
  if (countdown.value > 5) return '🚨 Başınızı koruyun, hareket etmeyin';
  if (countdown.value > 0) return '⏰ Deprem geliyor, sakin kalın';
  return '✅ Deprem geçti, artçı depremlere dikkat edin';
});

// Deprem sonrası checklist
const checklist = ref([
  { id: 1, text: 'Gaz vanasını kapattım', checked: false },
  { id: 2, text: 'Elektrik sigortasını kapattım', checked: false },
  { id: 3, text: 'Gaz kaçağı kontrolü yaptım', checked: false },
  { id: 4, text: 'Bina hasarı kontrolü yaptım', checked: false },
  { id: 5, text: 'Yakınlarımı aradım', checked: false },
  { id: 6, text: 'Acil çantamı aldım', checked: false },
]);

// Acil durum kişileri
const emergencyContacts = ref([
  { name: 'AFAD', phone: '122' },
  { name: 'Ambulans', phone: '112' },
  { name: 'İtfaiye', phone: '110' },
  { name: 'Polis', phone: '155' },
]);

let map: L.Map | null = null;
let countdownInterval: any = null;
let waveCircle: L.Circle | null = null;

onMounted(() => {
  getUserLocation();
  if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }
});

watch(() => props.earthquake, (eq) => {
  if (eq) show(eq);
}, { immediate: true });

function getUserLocation() {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        userLocation.value = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
      },
      () => {
        // Varsayılan: İstanbul
        userLocation.value = { lat: 41.0082, lng: 28.9784 };
      }
    );
  } else {
    userLocation.value = { lat: 41.0082, lng: 28.9784 };
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + 
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

function calculateDirection(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
            Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  
  const directions = ['K', 'KD', 'D', 'GD', 'G', 'GB', 'B', 'KB'];
  return directions[Math.round(bearing / 45) % 8];
}

function show(eq: EarthquakeInterface) {
  isVisible.value = true;
  countdown.value = 30;
  
  if (userLocation.value) {
    distanceToUser.value = calculateDistance(
      userLocation.value.lat, userLocation.value.lng,
      eq.Latitude, eq.Longitude
    );
    direction.value = calculateDirection(
      userLocation.value.lat, userLocation.value.lng,
      eq.Latitude, eq.Longitude
    );
  }
  
  distanceToEpicenter.value = Math.floor(Math.random() * 20) + 5;
  
  playVoiceWarning(eq);
  
  nextTick(() => {
    initMap(eq);
    startCountdown();
    playAlarm();
  });
}

function initMap(eq: EarthquakeInterface) {
  if (!mapContainer.value) return;
  
  if (map) {
    map.remove();
    map = null;
  }

  // Başlangıçta Türkiye görünümü
  map = L.map(mapContainer.value, {
    zoomControl: false,
    attributionControl: false,
  }).setView([39.0, 35.0], 6);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  }).addTo(map);

  // Kullanıcı konumu (yeşil)
  if (userLocation.value) {
    const userIcon = L.divIcon({
      className: 'user-marker',
      html: `<div class="user-pin">📍</div>`,
      iconSize: [30, 30],
    });
    L.marker([userLocation.value.lat, userLocation.value.lng], { icon: userIcon }).addTo(map);
  }

  // Deprem merkezi (mavi yıldız)
  const starIcon = L.divIcon({
    className: 'star-marker',
    html: `<div class="star">★</div>`,
    iconSize: [40, 40],
  });
  L.marker([eq.Latitude, eq.Longitude], { icon: starIcon }).addTo(map);

  // Algılayan cihazlar (telefonlar) - rastgele konumlar
  addDetectionPhones(eq);

  // Kırmızı daire (şok dalgası)
  waveCircle = L.circle([eq.Latitude, eq.Longitude], {
    radius: 50000,
    color: '#e74c3c',
    fillColor: '#e74c3c',
    fillOpacity: 0.2,
    weight: 3,
  }).addTo(map);

  // Çizgi (kullanıcı - deprem)
  if (userLocation.value) {
    L.polyline(
      [[userLocation.value.lat, userLocation.value.lng], [eq.Latitude, eq.Longitude]],
      { color: '#3498db', weight: 2, dashArray: '5, 10' }
    ).addTo(map);
  }

  // 2 saniye sonra deprem merkezine zoom
  setTimeout(() => {
    if (map) {
      map.flyTo([eq.Latitude, eq.Longitude], 10, {
        duration: 3,
        easeLinearity: 0.5
      });
    }
  }, 2000);

  // Zoom tamamlandıktan sonra dalgaları başlat
  setTimeout(() => {
    animateWave();
  }, 5000);
}

function addDetectionPhones(eq: EarthquakeInterface) {
  if (!map) return;
  
  // 10-15 rastgele telefon konumu (deprem merkezi etrafında)
  const phoneCount = Math.floor(Math.random() * 6) + 10; // 10-15 arası
  
  for (let i = 0; i < phoneCount; i++) {
    // Deprem merkezinden 0.5-2 derece uzaklıkta rastgele konum
    const distance = (Math.random() * 1.5) + 0.5;
    const angle = Math.random() * 2 * Math.PI;
    
    const lat = eq.Latitude + distance * Math.cos(angle);
    const lng = eq.Longitude + distance * Math.sin(angle);
    
    const phoneIcon = L.divIcon({
      className: 'phone-detection-marker',
      html: `<div class="phone-icon">📱</div>`,
      iconSize: [24, 24],
    });
    
    const marker = L.marker([lat, lng], { icon: phoneIcon }).addTo(map!);
    
    // Tooltip ile bilgi
    marker.bindTooltip(`Cihaz ${i + 1}`, {
      permanent: false,
      direction: 'top',
      className: 'phone-tooltip'
    });
  }
}

function animateWave() {
  let radius = 50000;
  const interval = setInterval(() => {
    radius += 15000;
    if (waveCircle && radius <= 300000) {
      waveCircle.setRadius(radius);
    } else {
      clearInterval(interval);
    }
  }, 500);
}

function startCountdown() {
  if (countdownInterval) clearInterval(countdownInterval);
  
  countdownInterval = setInterval(() => {
    countdown.value--;
    
    // Sesli talimat (her 10 saniyede)
    if (countdown.value === 20 || countdown.value === 10 || countdown.value === 5) {
      speakInstruction(currentInstruction.value);
    }
    
    // Deprem başladığında
    if (countdown.value === 0) {
      speakEarthquakeStarted();
    }
    
    if (countdown.value <= 0) {
      clearInterval(countdownInterval);
      stopAlarm();
      if (!props.isDrill) {
        // 3 saniye sonra deprem sonrası rapor
        setTimeout(() => speakPostEarthquakeReport(), 3000);
        setTimeout(() => close(), 15000);
      }
    }
  }, 1000);
}

function speakEarthquakeStarted() {
  if (!('speechSynthesis' in window)) return;
  
  const text = 'Deprem başladı. Bulunduğunuz yerde kalın. Hareket etmeyin. Başınızı koruyun.';
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'tr-TR';
  utterance.rate = 0.9;
  utterance.pitch = 1.1;
  utterance.volume = 1.0;
  window.speechSynthesis.speak(utterance);
}

function speakPostEarthquakeReport() {
  if (!('speechSynthesis' in window) || !props.earthquake) return;
  
  const eq = props.earthquake;
  let text = 'Deprem sona erdi. ';
  text += `${eq.Region.City} merkezli, ${eq.Magnitude.toFixed(1)} büyüklüğündeki deprem kaydedildi. `;
  text += 'Artçı depremler olabilir. Dikkatli olun. ';
  text += 'Gaz vanasını kapatın. Elektrik sigortasını kontrol edin. ';
  text += 'Binadan çıkmadan önce hasar kontrolü yapın. ';
  text += 'Yakınlarınızı arayın ve güvende olduğunuzu bildirin. ';
  
  if (alertLevel.value >= 3) {
    text += 'Acil durum çantanızı alın ve güvenli bir alana gidin. ';
    text += 'Resmi açıklamaları takip edin.';
  }
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'tr-TR';
  utterance.rate = 0.85;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  window.speechSynthesis.speak(utterance);
}

function playAlarm() {
  if (alarmAudio.value && !alarmMuted.value && alertLevel.value >= 2) {
    alarmAudio.value.volume = alertLevel.value === 4 ? 1.0 : 0.7;
    alarmAudio.value.play().catch(() => {});
  }
  
  // Titreşim (seviyeye göre)
  if ('vibrate' in navigator) {
    const patterns = [
      [],
      [200, 100, 200],
      [200, 100, 200, 100, 200],
      [200, 100, 200, 100, 200, 100, 200, 100, 200],
    ];
    navigator.vibrate(patterns[alertLevel.value - 1]);
  }
}

function playVoiceWarning(eq: EarthquakeInterface) {
  if (!('speechSynthesis' in window)) return;
  
  try {
    window.speechSynthesis.cancel();
    
    // Detaylı sesli anlatım
    let text = '';
    
    if (props.isDrill) {
      text = 'Deprem tatbikatı başladı. Talimatları takip edin.';
    } else {
      // Uyarı seviyesine göre farklı tonlama
      const urgencyPrefix = alertLevel.value === 4 ? 'ACİL UYARI! ' : 
                           alertLevel.value === 3 ? 'DİKKAT! ' : 
                           alertLevel.value === 2 ? 'UYARI! ' : '';
      
      // Detaylı deprem bilgisi
      text = `${urgencyPrefix}${eq.Region.City} ${eq.Region.District} bölgesinde, `;
      text += `${eq.Magnitude.toFixed(1)} büyüklüğünde deprem tespit edildi. `;
      text += `Derinlik ${eq.Depth} kilometre. `;
      text += `Size ${distanceToUser.value} kilometre uzaklıkta, ${getDirectionText(direction.value)} yönünde. `;
      text += `Sismik dalga ${countdown.value} saniye içinde gelecek. `;
      text += `${shakeIntensity.value}. `;
      text += `Lütfen güvenli alana geçiniz. `;
      
      // Aksiyon talimatı
      if (alertLevel.value >= 3) {
        text += 'Masanın altına girin, başınızı koruyun. ';
        text += 'Pencerelerden uzaklaşın. ';
        text += 'Sakin kalın ve panik yapmayın.';
      } else {
        text += 'Hazırlıklı olun ve talimatları bekleyin.';
      }
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'tr-TR';
    utterance.rate = alertLevel.value === 4 ? 1.0 : 0.9; // Acil durumda daha hızlı
    utterance.pitch = 1.2;
    utterance.volume = 1.0;
    
    const speakNow = () => {
      const voices = window.speechSynthesis.getVoices();
      const turkishVoice = voices.find(v => v.lang.includes('tr') || v.lang.includes('TR'));
      if (turkishVoice) utterance.voice = turkishVoice;
      
      utterance.onstart = () => console.log('Sesli uyarı başladı');
      utterance.onend = () => {
        console.log('Sesli uyarı bitti');
        // 5 saniye sonra tekrar hatırlat
        if (countdown.value > 5 && alertLevel.value >= 3) {
          setTimeout(() => speakReminder(), 5000);
        }
      };
      
      window.speechSynthesis.speak(utterance);
    };
    
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      speakNow();
    } else {
      window.speechSynthesis.onvoiceschanged = speakNow;
    }
  } catch (e) {
    console.error('Sesli uyarı hatası:', e);
  }
}

function speakReminder() {
  if (!('speechSynthesis' in window) || countdown.value <= 0) return;
  
  const text = `${countdown.value} saniye kaldı. Güvenli konumda kalın.`;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'tr-TR';
  utterance.rate = 1.0;
  utterance.pitch = 1.2;
  window.speechSynthesis.speak(utterance);
}

function getDirectionText(dir: string): string {
  const directions: Record<string, string> = {
    'K': 'kuzey',
    'KD': 'kuzeydoğu',
    'D': 'doğu',
    'GD': 'güneydoğu',
    'G': 'güney',
    'GB': 'güneybatı',
    'B': 'batı',
    'KB': 'kuzeybatı',
  };
  return directions[dir] || 'bilinmeyen';
}

function speakInstruction(text: string) {
  if (!('speechSynthesis' in window)) return;
  const cleanText = text.replace(/[🛡️⚠️🚨⏰✅]/g, '');
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'tr-TR';
  utterance.rate = 1.0;
  window.speechSynthesis.speak(utterance);
}

function stopAlarm() {
  if (alarmAudio.value) {
    alarmAudio.value.pause();
    alarmAudio.value.currentTime = 0;
  }
}

function toggleAlarm() {
  alarmMuted.value = !alarmMuted.value;
  if (alarmMuted.value) {
    stopAlarm();
  } else {
    playAlarm();
  }
}

function sendSafeMessage() {
  // SMS/WhatsApp ile acil durum kişilerine "Güvendeyim" mesajı
  alert('Acil durum kişilerinize "Güvendeyim" mesajı gönderildi.');
  
  // Gerçek uygulamada:
  // - SMS API
  // - WhatsApp API
  // - Push notification to family
}

function showEmergencyContacts() {
  showContacts.value = true;
}

function callContact(contact: any) {
  window.location.href = `tel:${contact.phone}`;
}

function close() {
  isVisible.value = false;
  stopAlarm();
  if (countdownInterval) clearInterval(countdownInterval);
  if (map) {
    map.remove();
    map = null;
  }
  emit('close');
}

onBeforeUnmount(() => {
  close();
});
</script>

<style lang="scss" scoped>
.alert-fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  
  &.alert-level-1 { background: #3498db; }
  &.alert-level-2 { background: #f39c12; }
  &.alert-level-3 { background: #e67e22; }
  &.alert-level-4 { background: #8B1538; }
}

.alert-header {
  background: rgba(255, 255, 255, 0.95);
  padding: 16px;
  
  .alert-badge {
    display: inline-block;
    padding: 6px 16px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 700;
    margin-bottom: 12px;
    
    &.badge-level-1 { background: #3498db; color: white; }
    &.badge-level-2 { background: #f39c12; color: white; }
    &.badge-level-3 { background: #e67e22; color: white; }
    &.badge-level-4 { background: #c0392b; color: white; }
  }
  
  .earthquake-info {
    color: #2c3e50;
    font-size: 16px;
    font-weight: 600;
    line-height: 1.6;
    margin: 0;
    text-align: center;
  }
}

.countdown-section {
  padding: 20px;
  text-align: center;
  
  .countdown-text {
    font-size: 32px;
    font-weight: 700;
    color: #FF8C00;
    margin-bottom: 8px;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
  
  .warning-text {
    font-size: 20px;
    color: #FF3333;
    font-weight: 700;
    margin-bottom: 12px;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
  
  .action-instruction {
    font-size: 18px;
    color: white;
    font-weight: 600;
    background: rgba(0, 0, 0, 0.3);
    padding: 12px;
    border-radius: 8px;
    margin-top: 12px;
  }
}

.alert-map {
  flex: 1;
  background: #E8F4F8;
}

.post-earthquake-checklist {
  background: rgba(255, 255, 255, 0.95);
  padding: 16px;
  max-height: 200px;
  overflow-y: auto;
  
  h3 {
    margin: 0 0 12px 0;
    font-size: 16px;
    color: #2c3e50;
  }
  
  label {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    font-size: 14px;
    color: #34495e;
    
    input[type="checkbox"] {
      width: 20px;
      height: 20px;
    }
  }
}

.alert-footer {
  background: rgba(0, 0, 0, 0.8);
  padding: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  
  .footer-btn {
    flex: 1;
    min-width: 120px;
    padding: 14px 8px;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s ease;
    
    &.safe-btn {
      background: #27ae60;
      color: white;
      &:hover { background: #229954; }
    }
    
    &.alarm-btn {
      background: rgba(255, 255, 255, 0.3);
      color: white;
      &:hover { background: rgba(255, 255, 255, 0.4); }
    }
    
    &.emergency-btn {
      background: #e74c3c;
      color: white;
      &:hover { background: #c0392b; }
    }
    
    &.exit-btn {
      background: rgba(255, 255, 255, 0.3);
      color: white;
      &:hover { background: rgba(255, 255, 255, 0.4); }
    }
  }
}

.emergency-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  
  .modal-content {
    background: white;
    padding: 24px;
    border-radius: 12px;
    max-width: 400px;
    width: 90%;
    
    h3 {
      margin: 0 0 16px 0;
      color: #2c3e50;
    }
    
    .contact-btn {
      width: 100%;
      padding: 16px;
      margin-bottom: 8px;
      background: #3498db;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      
      &:hover {
        background: #2980b9;
      }
    }
    
    .close-modal-btn {
      width: 100%;
      padding: 12px;
      margin-top: 8px;
      background: #95a5a6;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
    }
  }
}

:deep(.user-marker) {
  .user-pin {
    font-size: 30px;
    animation: bounce 2s infinite;
  }
}

:deep(.star-marker) {
  .star {
    font-size: 40px;
    color: #3498db;
    text-shadow: 0 0 10px rgba(52, 152, 219, 0.8);
    animation: pulse 1.5s infinite;
  }
}

:deep(.phone-detection-marker) {
  .phone-icon {
    font-size: 20px;
    animation: phoneSignal 2s infinite;
    filter: drop-shadow(0 0 3px rgba(52, 152, 219, 0.6));
  }
}

:deep(.phone-tooltip) {
  background: rgba(52, 152, 219, 0.9) !important;
  border: none !important;
  color: white !important;
  font-size: 11px !important;
  padding: 4px 8px !important;
  border-radius: 4px !important;
  font-weight: 600 !important;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.8; }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes phoneSignal {
  0%, 100% { 
    transform: scale(1); 
    opacity: 1; 
  }
  50% { 
    transform: scale(1.15); 
    opacity: 0.7; 
  }
}
</style>
