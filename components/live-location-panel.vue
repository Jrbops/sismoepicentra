<template>
  <ClientOnly>
  <div class="live-location-panel">
    <div class="panel-header">
      <div class="status-indicator" :class="{ active: isTracking }">
        <span class="pulse-dot"></span>
        <span class="status-text">
          {{ isTracking ? 'Konum Takibi Aktif' : 'Konum Takibi Pasif' }}
        </span>
      </div>
      <button class="toggle-btn" @click="toggleTracking">
        {{ isTracking ? '⏸️ Durdur' : '▶️ Başlat' }}
      </button>
    </div>

    <div v-if="currentLocation" class="location-details">
      <!-- Adres Bilgileri -->
      <div class="detail-card">
        <div class="card-icon">🏙️</div>
        <div class="card-content">
          <div class="card-label">Şehir</div>
          <div class="card-value">
            {{ currentLocation.address?.city || 'Alınıyor...' }}
          </div>
        </div>
      </div>

      <div class="detail-card">
        <div class="card-icon">🏘️</div>
        <div class="card-content">
          <div class="card-label">İlçe</div>
          <div class="card-value">
            {{ currentLocation.address?.district || 'Alınıyor...' }}
          </div>
        </div>
      </div>

      <div class="detail-card">
        <div class="card-icon">🏠</div>
        <div class="card-content">
          <div class="card-label">Mahalle</div>
          <div class="card-value">
            {{ currentLocation.address?.neighborhood || 'Alınıyor...' }}
          </div>
        </div>
      </div>

      <div class="detail-card">
        <div class="card-icon">🛣️</div>
        <div class="card-content">
          <div class="card-label">Sokak</div>
          <div class="card-value">
            {{ currentLocation.address?.street || 'Alınıyor...' }}
          </div>
        </div>
      </div>

      <!-- Koordinatlar -->
      <div class="coordinates-section">
        <h5>📐 Koordinatlar</h5>
        <div class="coord-row">
          <span class="coord-label">Enlem:</span>
          <span class="coord-value">{{ currentLocation.latitude.toFixed(6) }}°</span>
        </div>
        <div class="coord-row">
          <span class="coord-label">Boylam:</span>
          <span class="coord-value">{{ currentLocation.longitude.toFixed(6) }}°</span>
        </div>
        <div class="coord-row">
          <span class="coord-label">Hassasiyet:</span>
          <span class="coord-value">±{{ Math.round(currentLocation.accuracy) }}m</span>
        </div>
      </div>

      <!-- Güncelleme Bilgisi -->
      <div class="update-info">
        <div class="update-row">
          <span>🕐 Son Güncelleme:</span>
          <span class="time-value">{{ formatTime(currentLocation.timestamp) }}</span>
        </div>
        <div class="update-row">
          <span>🔄 Sonraki Güncelleme:</span>
          <span class="time-value">{{ nextUpdateIn }}s</span>
        </div>
      </div>

      <!-- Tam Adres -->
      <div class="full-address">
        <h5>📍 Tam Adres</h5>
        <p>{{ currentLocation.address?.fullAddress || 'Adres bilgisi alınıyor...' }}</p>
      </div>
    </div>

    <div v-else-if="!isTracking" class="no-location">
      <div class="no-location-icon">📍</div>
      <p>Konum takibi başlatılmadı</p>
      <button class="start-btn" @click="startTracking">Takibi Başlat</button>
    </div>

    <div v-else class="loading-location">
      <div class="spinner"></div>
      <p>Konum alınıyor...</p>
    </div>

    <div v-if="error" class="error-alert">
      <div class="error-icon">⚠️</div>
      <div class="error-content">
        <strong>{{ error }}</strong>
        <div class="error-help">
          <p><strong>Nasıl düzeltilir?</strong></p>
          <ul>
            <li>Tarayıcı adres çubuğundaki kilit ikonuna tıklayın</li>
            <li>"Konum" iznini "İzin Ver" olarak ayarlayın</li>
            <li>Sayfayı yenileyin</li>
            <li>Mobilde: Ayarlar → Uygulama İzinleri → Konum</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
  <template #fallback>
    <div class="loading-panel">Konum servisi yükleniyor...</div>
  </template>
  </ClientOnly>
</template>

<script setup lang="ts">
import { useLocationTracking } from '~~/composables/useLocationTracking';

const { currentLocation, isTracking, error, startTracking, stopTracking } = useLocationTracking();
const nextUpdateIn = ref(10);

// Geri sayım
let countdownInterval: any = null;

watch(isTracking, (tracking) => {
  if (tracking) {
    startCountdown();
  } else {
    stopCountdown();
  }
});

watch(currentLocation, () => {
  // Her güncelleme geldiğinde geri sayımı sıfırla
  nextUpdateIn.value = 10;
});

function startCountdown() {
  stopCountdown();
  nextUpdateIn.value = 10;
  
  countdownInterval = setInterval(() => {
    nextUpdateIn.value--;
    if (nextUpdateIn.value <= 0) {
      nextUpdateIn.value = 10;
    }
  }, 1000);
}

function stopCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

function toggleTracking() {
  if (isTracking.value) {
    stopTracking();
  } else {
    startTracking();
  }
}

function formatTime(timestamp: number): string {
  const now = Date.now();
  const diff = Math.floor((now - timestamp) / 1000);
  
  if (diff < 10) return 'Az önce';
  if (diff < 60) return `${diff} saniye önce`;
  
  const minutes = Math.floor(diff / 60);
  return `${minutes} dakika önce`;
}

onBeforeUnmount(() => {
  stopCountdown();
});
</script>

<style lang="scss" scoped>
.live-location-panel {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e9ecef;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  
  .pulse-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #6c757d;
  }
  
  &.active .pulse-dot {
    background: #28a745;
    animation: pulse 2s infinite;
  }
  
  .status-text {
    font-weight: 600;
    color: #495057;
  }
}

.toggle-btn {
  padding: 8px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: #5568d3;
    transform: scale(1.05);
  }
}

.location-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  transition: all 0.3s ease;
  
  &:hover {
    background: #e9ecef;
    transform: translateX(5px);
  }
  
  .card-icon {
    font-size: 24px;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border-radius: 8px;
  }
  
  .card-content {
    flex: 1;
    
    .card-label {
      font-size: 12px;
      color: #6c757d;
      margin-bottom: 2px;
    }
    
    .card-value {
      font-size: 15px;
      font-weight: 600;
      color: #212529;
    }
  }
}

.coordinates-section {
  margin-top: 16px;
  padding: 16px;
  background: #e8f4f8;
  border-radius: 8px;
  
  h5 {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: #2c3e50;
  }
  
  .coord-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    font-size: 14px;
    
    .coord-label {
      color: #495057;
    }
    
    .coord-value {
      font-weight: 600;
      color: #212529;
      font-family: 'Courier New', monospace;
    }
  }
}

.update-info {
  margin-top: 16px;
  padding: 12px;
  background: #fff3cd;
  border-radius: 8px;
  
  .update-row {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    font-size: 13px;
    color: #856404;
    
    .time-value {
      font-weight: 700;
    }
  }
}

.full-address {
  margin-top: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #667eea;
  
  h5 {
    margin: 0 0 8px 0;
    font-size: 14px;
    color: #2c3e50;
  }
  
  p {
    margin: 0;
    font-size: 13px;
    color: #495057;
    line-height: 1.6;
  }
}

.no-location {
  text-align: center;
  padding: 40px 20px;
  
  .no-location-icon {
    font-size: 64px;
    margin-bottom: 16px;
    opacity: 0.5;
  }
  
  p {
    color: #6c757d;
    margin-bottom: 20px;
  }
  
  .start-btn {
    padding: 12px 24px;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    
    &:hover {
      background: #218838;
    }
  }
}

.loading-location {
  text-align: center;
  padding: 40px 20px;
  
  .spinner {
    width: 40px;
    height: 40px;
    margin: 0 auto 16px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  p {
    color: #6c757d;
  }
}

.error-alert {
  margin-top: 16px;
  padding: 16px;
  background: #fff3cd;
  border: 2px solid #ffc107;
  border-radius: 8px;
  display: flex;
  gap: 12px;
  
  .error-icon {
    font-size: 32px;
    flex-shrink: 0;
  }
  
  .error-content {
    flex: 1;
    
    strong {
      display: block;
      color: #856404;
      margin-bottom: 12px;
      font-size: 14px;
    }
    
    .error-help {
      background: white;
      padding: 12px;
      border-radius: 6px;
      margin-top: 8px;
      
      p {
        margin: 0 0 8px 0;
        font-weight: 600;
        color: #495057;
        font-size: 13px;
      }
      
      ul {
        margin: 0;
        padding-left: 20px;
        
        li {
          color: #6c757d;
          font-size: 12px;
          margin-bottom: 4px;
          line-height: 1.5;
        }
      }
    }
  }
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

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-panel {
  padding: 40px 20px;
  text-align: center;
  color: #6c757d;
  font-size: 14px;
}
</style>
