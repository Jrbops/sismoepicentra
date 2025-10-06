<template>
  <ClientOnly>
    <div class="live-location-map">
      <div class="map-header">
      <h3>📍 Canlı Konum Takibi</h3>
      <div class="tracking-status" :class="{ active: isTracking }">
        <span class="status-dot"></span>
        {{ isTracking ? 'Aktif' : 'Pasif' }}
      </div>
    </div>
    
    <div ref="mapContainer" class="map-container"></div>
    
    <div v-if="currentLocation" class="location-info">
      <div class="info-row">
        <span class="label">🏙️ Şehir:</span>
        <span class="value">{{ currentLocation.address?.city || 'Alınıyor...' }}</span>
      </div>
      <div class="info-row">
        <span class="label">🏘️ İlçe:</span>
        <span class="value">{{ currentLocation.address?.district || 'Alınıyor...' }}</span>
      </div>
      <div class="info-row">
        <span class="label">🏠 Mahalle:</span>
        <span class="value">{{ currentLocation.address?.neighborhood || 'Alınıyor...' }}</span>
      </div>
      <div class="info-row">
        <span class="label">🛣️ Sokak:</span>
        <span class="value">{{ currentLocation.address?.street || 'Alınıyor...' }}</span>
      </div>
      <div class="info-row">
        <span class="label">📊 Hassasiyet:</span>
        <span class="value">±{{ Math.round(currentLocation.accuracy) }}m</span>
      </div>
      <div class="info-row">
        <span class="label">🕐 Son Güncelleme:</span>
        <span class="value">{{ formatTime(currentLocation.timestamp) }}</span>
      </div>
    </div>
    
    <div v-if="error" class="error-message">
      ⚠️ {{ error }}
    </div>
  </div>
  <template #fallback>
    <div class="loading-map">Harita yükleniyor...</div>
  </template>
  </ClientOnly>
</template>

<script setup lang="ts">
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLocationTracking } from '~~/composables/useLocationTracking';

const { currentLocation, isTracking, error } = useLocationTracking();
const mapContainer = ref<HTMLElement | null>(null);

let map: L.Map | null = null;
let marker: L.Marker | null = null;
let accuracyCircle: L.Circle | null = null;

onMounted(() => {
  initMap();
});

watch(currentLocation, (newLocation) => {
  if (newLocation && map) {
    updateMarker(newLocation);
  }
}, { deep: true });

function initMap() {
  if (!mapContainer.value) return;
  
  map = L.map(mapContainer.value).setView([39.0, 35.0], 13);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  }).addTo(map);
}

function updateMarker(location: any) {
  if (!map) return;
  
  const { latitude, longitude, accuracy } = location;
  
  // Haritayı merkeze al (ilk güncelleme)
  if (!marker) {
    map.setView([latitude, longitude], 15);
  }
  
  // Eski marker'ı temizle
  if (marker) map.removeLayer(marker);
  if (accuracyCircle) map.removeLayer(accuracyCircle);
  
  // Hassasiyet çemberi
  accuracyCircle = L.circle([latitude, longitude], {
    radius: accuracy,
    color: '#3498db',
    fillColor: '#3498db',
    fillOpacity: 0.15,
    weight: 2
  }).addTo(map);
  
  // Animasyonlu marker
  const icon = L.divIcon({
    className: 'live-location-marker',
    html: `
      <div class="marker-pulse">
        <div class="marker-dot"></div>
      </div>
    `,
    iconSize: [40, 40]
  });
  
  marker = L.marker([latitude, longitude], { icon }).addTo(map);
  
  // Popup
  const popupContent = `
    <strong>📍 Konumunuz</strong><br>
    ${location.address?.fullAddress || 'Adres alınıyor...'}<br>
    <small>Hassasiyet: ±${Math.round(accuracy)}m</small>
  `;
  
  marker.bindPopup(popupContent).openPopup();
}

function formatTime(timestamp: number): string {
  const now = Date.now();
  const diff = Math.floor((now - timestamp) / 1000);
  
  if (diff < 10) return 'Az önce';
  if (diff < 60) return `${diff} saniye önce`;
  
  const minutes = Math.floor(diff / 60);
  return `${minutes} dakika önce`;
}
</script>

<style lang="scss" scoped>
.live-location-map {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  
  h3 {
    margin: 0;
    font-size: 18px;
    color: #2c3e50;
  }
  
  .tracking-status {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
    background: #e9ecef;
    color: #7f8c8d;
    
    &.active {
      background: #d4edda;
      color: #155724;
      
      .status-dot {
        background: #28a745;
        animation: pulse 2s infinite;
      }
    }
    
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #6c757d;
    }
  }
}

.map-container {
  height: 400px;
  width: 100%;
}

.location-info {
  padding: 16px;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
  
  .info-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #e9ecef;
    
    &:last-child {
      border-bottom: none;
    }
    
    .label {
      font-weight: 600;
      color: #495057;
      font-size: 14px;
    }
    
    .value {
      color: #212529;
      font-size: 14px;
      text-align: right;
      max-width: 60%;
      word-break: break-word;
    }
  }
}

.error-message {
  padding: 16px;
  background: #f8d7da;
  color: #721c24;
  border-top: 1px solid #f5c6cb;
  font-size: 14px;
}

:deep(.live-location-marker) {
  .marker-pulse {
    position: relative;
    width: 40px;
    height: 40px;
    
    &::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(52, 152, 219, 0.3);
      animation: pulse 2s infinite;
    }
    
    .marker-dot {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #3498db;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }
  }
}

@keyframes pulse {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(2);
  }
}

.loading-map {
  padding: 100px 20px;
  text-align: center;
  color: #6c757d;
  font-size: 16px;
}
</style>
