<template>
  <div class="seismic-panel">
    <div class="panel-header">
      <h3>📱 Sismik Sensör Sistemi</h3>
      <div class="status-indicator" :class="{ active: sensorData.isActive.value }">
        <div class="pulse-dot"></div>
        <span>{{ sensorData.isActive.value ? 'AKTİF' : 'PASİF' }}</span>
      </div>
    </div>
    
    <!-- Sensör Kontrolleri -->
    <div class="sensor-controls">
      <button 
        v-if="!sensorData.isActive.value" 
        @click="startMonitoring" 
        class="start-btn"
      >
        🚀 Sensör İzlemeyi Başlat
      </button>
      <button 
        v-else 
        @click="stopMonitoring" 
        class="stop-btn"
      >
        ⏹️ Durdur
      </button>
      <button @click="requestPermissions" class="permission-btn">
        🔐 İzin İste
      </button>
    </div>
    
    <!-- Sismik Aktivite Uyarısı -->
    <div v-if="sensorData.isSeismicDetected.value" class="seismic-alert">
      <div class="alert-icon">🚨</div>
      <div class="alert-text">
        <h4>SİSMİK AKTİVİTE TESPİT EDİLDİ!</h4>
        <p>Telefonunuz sismik hareket algıladı. Dikkatli olun!</p>
      </div>
    </div>
    
    <!-- Gerçek Zamanlı Veriler -->
    <div v-if="sensorData.currentData.value" class="sensor-data">
      <div class="data-grid">
        <!-- İvme Verileri -->
        <div class="data-card acceleration">
          <h4>📊 İvmeölçer</h4>
          <div class="data-row">
            <span>X:</span>
            <span class="value">{{ sensorData.currentData.value.acceleration.x.toFixed(2) }} m/s²</span>
          </div>
          <div class="data-row">
            <span>Y:</span>
            <span class="value">{{ sensorData.currentData.value.acceleration.y.toFixed(2) }} m/s²</span>
          </div>
          <div class="data-row">
            <span>Z:</span>
            <span class="value">{{ sensorData.currentData.value.acceleration.z.toFixed(2) }} m/s²</span>
          </div>
          <div class="data-row magnitude">
            <span>Büyüklük:</span>
            <span class="value">{{ sensorData.currentData.value.acceleration.magnitude.toFixed(2) }} m/s²</span>
          </div>
        </div>
        
        <!-- Jiroskop Verileri -->
        <div class="data-card gyroscope">
          <h4>🔄 Jiroskop</h4>
          <div class="data-row">
            <span>Alpha:</span>
            <span class="value">{{ sensorData.currentData.value.gyroscope.alpha.toFixed(2) }}°/s</span>
          </div>
          <div class="data-row">
            <span>Beta:</span>
            <span class="value">{{ sensorData.currentData.value.gyroscope.beta.toFixed(2) }}°/s</span>
          </div>
          <div class="data-row">
            <span>Gamma:</span>
            <span class="value">{{ sensorData.currentData.value.gyroscope.gamma.toFixed(2) }}°/s</span>
          </div>
        </div>
      </div>
      
      <!-- Görsel İvme Göstergesi -->
      <div class="acceleration-meter">
        <h4>📈 İvme Büyüklüğü</h4>
        <div class="meter-container">
          <div 
            class="meter-bar" 
            :style="{ 
              width: Math.min((sensorData.currentData.value.acceleration.magnitude / 10) * 100, 100) + '%',
              backgroundColor: getMeterColor(sensorData.currentData.value.acceleration.magnitude)
            }"
          ></div>
          <div class="meter-labels">
            <span>0</span>
            <span>5</span>
            <span>10 m/s²</span>
          </div>
        </div>
        <div class="threshold-indicator">
          <span>Sismik Eşik: 2.0 m/s²</span>
        </div>
      </div>
    </div>
    
    <!-- Sismik Olaylar Geçmişi -->
    <div v-if="sensorData.seismicEvents.value.length > 0" class="seismic-history">
      <h4>📋 Tespit Edilen Sismik Olaylar</h4>
      <div class="events-list">
        <div 
          v-for="event in sensorData.seismicEvents.value.slice(-5)" 
          :key="event.timestamp"
          class="event-item"
        >
          <div class="event-time">
            {{ new Date(event.timestamp).toLocaleTimeString('tr-TR') }}
          </div>
          <div class="event-magnitude">
            M{{ event.magnitude.toFixed(2) }}
          </div>
          <div class="event-location">
            {{ event.location.latitude.toFixed(4) }}, {{ event.location.longitude.toFixed(4) }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- Bilgi Paneli -->
    <div class="info-panel">
      <h4>ℹ️ Sismik Sensör Bilgisi</h4>
      <ul>
        <li>📱 Telefonunuzun ivmeölçer ve jiroskop sensörleri kullanılır</li>
        <li>⚡ Her saniye veri toplanır ve analiz edilir</li>
        <li>🚨 2.0 m/s² üzerindeki hareketler sismik aktivite olarak değerlendirilir</li>
        <li>🌐 Veriler erken uyarı sistemi için paylaşılır</li>
        <li>🔒 Konum bilgisi sadece sismik olay tespitinde kullanılır</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSensorData } from '~/composables/useSensorData'

const sensorData = useSensorData()

// Sensör izlemeyi başlat
async function startMonitoring() {
  try {
    await sensorData.startSensorMonitoring()
  } catch (error) {
    alert('Sensör izni alınamadı: ' + error)
  }
}

// Sensör izlemeyi durdur
function stopMonitoring() {
  sensorData.stopSensorMonitoring()
}

// İzin iste
async function requestPermissions() {
  try {
    const granted = await sensorData.requestSensorPermissions()
    if (granted) {
      alert('Sensör izinleri verildi!')
    } else {
      alert('Sensör izinleri reddedildi. Lütfen tarayıcı ayarlarından izin verin.')
    }
  } catch (error) {
    alert('İzin hatası: ' + error)
  }
}

// İvme büyüklüğüne göre renk
function getMeterColor(magnitude: number): string {
  if (magnitude < 1) return '#10b981' // Yeşil
  if (magnitude < 2) return '#f59e0b' // Sarı
  if (magnitude < 5) return '#ef4444' // Kırmızı
  return '#7c2d12' // Koyu kırmızı
}
</script>

<style scoped>
.seismic-panel {
  background: rgba(15, 23, 42, 0.9);
  border-radius: 20px;
  padding: 25px;
  border: 1px solid rgba(102, 126, 234, 0.3);
  backdrop-filter: blur(10px);
  color: #e2e8f0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.panel-header h3 {
  color: #e2e8f0;
  font-size: 1.3em;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid #ef4444;
}

.status-indicator.active {
  background: rgba(16, 185, 129, 0.2);
  border-color: #10b981;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
}

.status-indicator.active .pulse-dot {
  background: #10b981;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.2); }
}

.sensor-controls {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.start-btn, .stop-btn, .permission-btn {
  padding: 12px 20px;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.start-btn {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.stop-btn {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.permission-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.start-btn:hover, .stop-btn:hover, .permission-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.seismic-alert {
  display: flex;
  align-items: center;
  gap: 15px;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  padding: 20px;
  border-radius: 15px;
  margin-bottom: 20px;
  animation: shake 0.5s ease-in-out infinite alternate;
}

@keyframes shake {
  0% { transform: translateX(-2px); }
  100% { transform: translateX(2px); }
}

.alert-icon {
  font-size: 2em;
}

.alert-text h4 {
  color: white;
  margin-bottom: 5px;
}

.alert-text p {
  color: rgba(255, 255, 255, 0.9);
}

.data-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.data-card {
  background: rgba(30, 41, 59, 0.6);
  padding: 20px;
  border-radius: 15px;
  border: 1px solid rgba(102, 126, 234, 0.2);
}

.data-card h4 {
  color: #94a3b8;
  margin-bottom: 15px;
  font-size: 1.1em;
}

.data-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 5px 0;
}

.data-row.magnitude {
  border-top: 1px solid rgba(102, 126, 234, 0.3);
  padding-top: 10px;
  margin-top: 10px;
  font-weight: bold;
}

.value {
  color: #10b981;
  font-weight: 600;
  font-family: 'Courier New', monospace;
}

.acceleration-meter {
  background: rgba(30, 41, 59, 0.6);
  padding: 20px;
  border-radius: 15px;
  margin-bottom: 20px;
}

.acceleration-meter h4 {
  color: #94a3b8;
  margin-bottom: 15px;
}

.meter-container {
  position: relative;
  background: rgba(0, 0, 0, 0.3);
  height: 20px;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 10px;
}

.meter-bar {
  height: 100%;
  border-radius: 10px;
  transition: all 0.3s ease;
}

.meter-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.8em;
  color: #94a3b8;
}

.threshold-indicator {
  text-align: center;
  font-size: 0.9em;
  color: #f59e0b;
  margin-top: 10px;
}

.seismic-history {
  background: rgba(30, 41, 59, 0.6);
  padding: 20px;
  border-radius: 15px;
  margin-bottom: 20px;
}

.seismic-history h4 {
  color: #94a3b8;
  margin-bottom: 15px;
}

.events-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.event-item {
  display: grid;
  grid-template-columns: auto auto 1fr;
  gap: 15px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  font-size: 0.9em;
}

.event-time {
  color: #94a3b8;
}

.event-magnitude {
  color: #ef4444;
  font-weight: bold;
}

.event-location {
  color: #10b981;
  font-family: 'Courier New', monospace;
}

.info-panel {
  background: rgba(30, 41, 59, 0.6);
  padding: 20px;
  border-radius: 15px;
  border-left: 4px solid #667eea;
}

.info-panel h4 {
  color: #94a3b8;
  margin-bottom: 15px;
}

.info-panel ul {
  list-style: none;
  padding: 0;
}

.info-panel li {
  margin-bottom: 8px;
  color: #cbd5e1;
  font-size: 0.9em;
  line-height: 1.4;
}

@media (max-width: 768px) {
  .data-grid {
    grid-template-columns: 1fr;
  }
  
  .sensor-controls {
    flex-direction: column;
  }
  
  .event-item {
    grid-template-columns: 1fr;
    text-align: center;
  }
}
</style>
