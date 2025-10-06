<template>
  <div class="map">
    <!-- Görünüm Seçici -->
    <!-- Görünüm değiştirici kalıcı olarak gizlendi -->
    <div class="view-selector" horizontal-center style="display: none !important;">
      <button 
        @click="currentView = 'list'" 
        :class="{ active: currentView === 'list' }"
        class="view-btn"
      >
        📋 Liste Görünümü
      </button>
      <button 
        @click="currentView = 'map'" 
        :class="{ active: currentView === 'map' }"
        class="view-btn"
      >
        🗺️ Harita Görünümü
      </button>
    </div>

    <!-- Liste Görünümü - Kalıcı olarak gizlendi -->
    <div v-if="currentView === 'list'" class="list-view" style="display: none !important;">
      <ClientOnly>
        <EarthquakesList v-if="listReady" />
        <div v-else class="loading">Yükleniyor…</div>
      </ClientOnly>
    </div>

     <!-- Harita Görünümü -->
     <div v-if="currentView === 'map'" class="map-container-wrapper">
       <div id="map"></div>
       <button class="filter-btn" @click="setFilterModalVisible(true)">Filtre</button>
       
       <!-- Gelişmiş Deprem Bilgi Paneli -->
       <div v-if="showInfoPanel && selectedEarthquake" class="earthquake-info-panel">
         <div class="panel-header">
           <div class="earthquake-title">
             <h3>🌍 M{{ selectedEarthquake.Magnitude }} Deprem</h3>
             <div class="earthquake-location">
               📍 {{ selectedEarthquake.Region?.City || 'Bilinmiyor' }}
             </div>
           </div>
           <button @click="closeInfoPanel" class="close-panel">×</button>
         </div>
         
         <div class="panel-content">
           <!-- Deprem Detayları -->
           <div class="earthquake-details">
             <div class="detail-grid">
               <div class="detail-item">
                 <div class="detail-icon">⚡</div>
                 <div class="detail-info">
                   <div class="detail-label">Büyüklük</div>
                   <div class="detail-value magnitude" :class="getMagnitudeClass(selectedEarthquake.Magnitude)">
                     M{{ selectedEarthquake.Magnitude }}
                   </div>
                 </div>
               </div>
               
               <div class="detail-item">
                 <div class="detail-icon">🏔️</div>
                 <div class="detail-info">
                   <div class="detail-label">Derinlik</div>
                   <div class="detail-value">{{ selectedEarthquake.Depth }} km</div>
                 </div>
               </div>
               
               <div class="detail-item">
                 <div class="detail-icon">⏰</div>
                 <div class="detail-info">
                   <div class="detail-label">Tarih</div>
                   <div class="detail-value">{{ formatDate(selectedEarthquake.Date) }}</div>
                 </div>
               </div>
               
               <div class="detail-item">
                 <div class="detail-icon">📡</div>
                 <div class="detail-info">
                   <div class="detail-label">Kaynak</div>
                   <div class="detail-value">{{ selectedEarthquake.Source }}</div>
                 </div>
               </div>
             </div>
           </div>
           
           <!-- 24 Saatlik Sismik Aktivite -->
           <div class="seismic-activity">
             <h4>📊 Son 24 Saatlik Sismik Aktivite</h4>
             <div class="activity-stats">
               <div class="stat-item">
                 <div class="stat-number">{{ seismicData.length }}</div>
                 <div class="stat-label">Toplam Deprem</div>
               </div>
               <div class="stat-item">
                 <div class="stat-number">{{ getMaxMagnitude() }}</div>
                 <div class="stat-label">En Büyük</div>
               </div>
               <div class="stat-item">
                 <div class="stat-number">{{ getAvgDepth() }}</div>
                 <div class="stat-label">Ort. Derinlik</div>
               </div>
             </div>
             
             <!-- Sismik Aktivite Grafiği -->
             <div class="seismic-chart">
               <div class="chart-container">
                 <div v-for="(data, index) in seismicData" :key="index" class="seismic-bar">
                   <div class="bar" :style="{ height: getBarHeight(data.magnitude), backgroundColor: getBarColor(data.magnitude) }"></div>
                   <div class="bar-label">{{ data.magnitude.toFixed(1) }}</div>
                   <div class="bar-time">{{ formatTime(data.time) }}</div>
                 </div>
               </div>
             </div>
             
             <!-- Yakın Depremler Listesi -->
             <div class="nearby-earthquakes">
               <h5>🔍 Yakın Depremler (50km)</h5>
               <div class="earthquake-list">
                 <div v-for="(eq, index) in seismicData.slice(0, 5)" :key="index" class="earthquake-item">
                   <div class="eq-magnitude">{{ eq.magnitude.toFixed(1) }}</div>
                   <div class="eq-info">
                     <div class="eq-city">{{ eq.city }}</div>
                     <div class="eq-distance">{{ eq.distance.toFixed(1) }} km</div>
                   </div>
                   <div class="eq-time">{{ formatTime(eq.time) }}</div>
                 </div>
               </div>
             </div>
           </div>
         </div>
       </div>
     </div>
    
    <Filters />
  </div>
  
</template>
<script lang="ts" setup>
import Filters from "~~/components/filters.vue";
import EarthquakesList from "~~/components/earthquakes-list.vue";
import { useFilterStore } from "~~/store/filters";
import { useEarthquakesStore } from "~~/store/earthquakes";
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const route = useRoute();
const filterStore = useFilterStore();
const { setFilterModalVisible } = filterStore;
const eqStore = useEarthquakesStore() as any;

// View state
const currentView = ref<'list' | 'map'>('map');
const listReady = ref(false);

let map: any = null;
let markers: any[] = [];

// Panel durumları
const selectedEarthquake = ref<any>(null);
const showInfoPanel = ref(false);
const seismicData = ref<any[]>([]);

function clearMarkers() {
  for (const m of markers) try { m.remove(); } catch {}
  markers = [];
}

function addMarkers(list: any[]) {
  if (!map || !list || list.length === 0) {
    console.log('[Map] Cannot add markers: map or list not available');
    return;
  }
  
  console.log(`[Map] Adding ${list.length} markers to map`);
  clearMarkers();
  
  for (const it of list) {
    if (!it.Longitude || !it.Latitude) {
      console.warn('[Map] Skipping marker with invalid coordinates:', it);
      continue;
    }
    
    const el = document.createElement('div');
    el.className = 'quake-marker';
    el.title = `${it.Region?.City || ''} M${it.Magnitude}`;
    const color = it.Source === 'KOERI' ? '#4b6ef5' : '#f54b4b';
    // Çok spesifik deprem marker modeli - SABİT KONUM
    const magnitude = Number(it.Magnitude);
    let size, innerColor, outerColor, ringColor, icon, textColor;
    
    if (magnitude >= 5.0) {
      size = 24;
      innerColor = '#ff1744';
      outerColor = '#d32f2f';
      ringColor = '#ff5722';
      icon = '⚡';
      textColor = '#ffffff';
    } else if (magnitude >= 4.0) {
      size = 20;
      innerColor = '#ff9800';
      outerColor = '#f57c00';
      ringColor = '#ffc107';
      icon = '🔥';
      textColor = '#ffffff';
    } else if (magnitude >= 3.0) {
      size = 18;
      innerColor = '#ffeb3b';
      outerColor = '#fbc02d';
      ringColor = '#ffc107';
      icon = '⚡';
      textColor = '#333333';
    } else {
      size = 16;
      innerColor = '#4caf50';
      outerColor = '#388e3c';
      ringColor = '#8bc34a';
      icon = '📍';
      textColor = '#ffffff';
    }
    
    // Çok spesifik marker tasarımı - 3D efektli
    el.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: 
        radial-gradient(circle at 30% 30%, ${innerColor} 0%, ${outerColor} 50%, ${outerColor}dd 100%),
        linear-gradient(135deg, ${innerColor} 0%, ${outerColor} 100%);
      border: 2px solid #ffffff;
      box-shadow: 
        0 0 0 1px rgba(255,255,255,0.9),
        0 0 0 3px ${ringColor}40,
        0 0 15px ${ringColor}60,
        0 0 25px ${ringColor}30,
        0 4px 20px rgba(0,0,0,0.4),
        inset 0 2px 4px rgba(255,255,255,0.3),
        inset 0 -2px 4px rgba(0,0,0,0.2);
      cursor: pointer;
      animation: earthquakeMarkerPulse 3s infinite;
      position: relative;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${size < 18 ? '8px' : '10px'};
      font-weight: 900;
      color: ${textColor};
      text-shadow: 0 1px 2px rgba(0,0,0,0.8);
      transform: none;
      backface-visibility: visible;
      will-change: auto;
    `;
    
    // Marker içeriği - İkon ve büyüklük
    el.innerHTML = `
      <div style="
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        justify-content: center;
        line-height: 1;
        text-align: center;
      ">
        <div style="font-size: ${size < 18 ? '6px' : '8px'}; margin-bottom: 1px;">${icon}</div>
        <div style="font-size: ${size < 18 ? '6px' : '7px'}; font-weight: 900;">${magnitude.toFixed(1)}</div>
      </div>
    `;
    
    // Tıklama olayı ekle
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      handleMarkerClick(it);
    });
    
    // MUTLAK SABİT KONUMLU MARKER - Hiç hareket etmez
    const mk = new maplibregl.Marker({ 
      element: el,
      pitchAlignment: 'map',
      rotationAlignment: 'map',
      anchor: 'center',
      draggable: false
    })
      .setLngLat([Number(it.Longitude), Number(it.Latitude)])
      .addTo(map);
    
    // Marker elementini mutlak sabit yap
    el.style.position = 'absolute';
    el.style.transform = 'none';
    el.style.transition = 'none';
    el.style.animation = 'none';
    el.style.willChange = 'auto';
    el.style.backfaceVisibility = 'visible';
    el.style.transformStyle = 'flat';
    
    markers.push(mk);
  }
  
  console.log(`[Map] Successfully added ${markers.length} markers to map`);
}

// Marker tıklama işleyicisi
async function handleMarkerClick(earthquake: any) {
  console.log('[Map] Marker clicked:', earthquake);
  
  // Deprem verisini seç
  selectedEarthquake.value = earthquake;
  showInfoPanel.value = true;
  
  // Sesli duyuru
  announceEarthquake(earthquake);
  
  // 24 saatlik sismik veri yükle
  await loadSeismicData(earthquake);
}

// Sesli deprem duyurusu
function announceEarthquake(earthquake: any) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance();
    utterance.text = `M${earthquake.Magnitude} büyüklüğünde deprem. ${earthquake.Region?.City || 'Bilinmeyen'} bölgesinde. Derinlik ${earthquake.Depth} kilometre. ${earthquake.Source} kaynaklı.`;
    utterance.lang = 'tr-TR';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;
    
    // Türkçe ses seç
    const voices = speechSynthesis.getVoices();
    const turkishVoice = voices.find(voice => voice.lang.startsWith('tr')) || voices[0];
    if (turkishVoice) utterance.voice = turkishVoice;
    
    speechSynthesis.speak(utterance);
  }
}

// 24 saatlik sismik veri yükleme
async function loadSeismicData(earthquake: any) {
  try {
    // Son 24 saatlik depremleri filtrele
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const allEarthquakes = eqStore.allEarthquakes || [];
    const recentEarthquakes = allEarthquakes.filter((eq: any) => {
      const eqDate = new Date(eq.Date);
      return eqDate >= yesterday && eqDate <= now;
    });
    
    // Aynı bölgedeki depremleri filtrele (50km yarıçap)
    const nearbyEarthquakes = recentEarthquakes.filter((eq: any) => {
      const distance = calculateDistance(
        earthquake.Latitude, earthquake.Longitude,
        eq.Latitude, eq.Longitude
      );
      return distance <= 50; // 50km yarıçap
    });
    
    // Sismik aktivite verisi oluştur
    seismicData.value = nearbyEarthquakes.map((eq: any) => ({
      time: new Date(eq.Date),
      magnitude: eq.Magnitude,
      depth: eq.Depth,
      distance: calculateDistance(
        earthquake.Latitude, earthquake.Longitude,
        eq.Latitude, eq.Longitude
      ),
      city: eq.Region?.City || 'Bilinmiyor'
    }));
    
    console.log('[Map] Seismic data loaded:', seismicData.value.length, 'earthquakes');
  } catch (error) {
    console.error('[Map] Error loading seismic data:', error);
    seismicData.value = [];
  }
}

// İki koordinat arasındaki mesafeyi hesapla (km)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Dünya yarıçapı (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Panel kapatma
function closeInfoPanel() {
  showInfoPanel.value = false;
  selectedEarthquake.value = null;
  seismicData.value = [];
}

// Yardımcı fonksiyonlar
function getMagnitudeClass(magnitude: number) {
  if (magnitude >= 5.0) return 'critical';
  if (magnitude >= 4.0) return 'high';
  if (magnitude >= 3.0) return 'medium';
  return 'low';
}

function formatDate(dateStr: string) {
  try {
    const date = new Date(dateStr.replace(/\./g, '-').replace(' ', 'T'));
    return date.toLocaleString('tr-TR');
  } catch {
    return dateStr;
  }
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function getMaxMagnitude() {
  if (seismicData.value.length === 0) return '0.0';
  return Math.max(...seismicData.value.map(d => d.magnitude)).toFixed(1);
}

function getAvgDepth() {
  if (seismicData.value.length === 0) return '0';
  const avg = seismicData.value.reduce((sum, d) => sum + d.depth, 0) / seismicData.value.length;
  return avg.toFixed(1);
}

function getBarHeight(magnitude: number) {
  const maxHeight = 100;
  const normalizedMag = Math.min(magnitude / 6.0, 1); // 6.0'a normalize et
  return `${normalizedMag * maxHeight}px`;
}

function getBarColor(magnitude: number) {
  if (magnitude >= 5.0) return '#dc3545';
  if (magnitude >= 4.0) return '#fd7e14';
  if (magnitude >= 3.0) return '#ffc107';
  return '#28a745';
}

function initMap() {
  if (map || currentView.value !== 'map') return;
  
  nextTick(() => {
    const mapEl = document.getElementById('map');
    if (!mapEl) return;
    
     // Başlangıç merkezi: Türkiye - Esri World Street Map
     map = new maplibregl.Map({
       container: 'map',
       style: {
         version: 8,
         sources: {
           'esri-satellite': {
             type: 'raster',
             tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
             tileSize: 256,
             attribution: '© Esri'
           }
         },
         layers: [
           {
             id: 'esri-satellite-layer',
             type: 'raster',
             source: 'esri-satellite',
             minzoom: 0,
             maxzoom: 19
           }
         ]
       },
       center: [35.0, 39.0], // Türkiye merkezi
       zoom: 6, // Türkiye'yi tam gösteren zoom seviyesi
       pitch: 0, // Eğim yok
       bearing: 0, // Rotasyon yok
       maxZoom: 18,
       minZoom: 4
     });
     map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
     
     // Harita yüklendiğinde marker'ları koru
     map.on('load', () => {
       console.log('[Map] Map loaded successfully');
       setTimeout(() => {
         if (eqStore.allEarthquakes && eqStore.allEarthquakes.length > 0) {
           console.log('[Map] Re-adding markers after map load');
           addMarkers(eqStore.allEarthquakes);
         }
       }, 1000);
     });
     
     // Harita stili değiştiğinde marker'ları koru
     map.on('style.load', () => {
       console.log('[Map] Map style loaded, preserving markers');
       setTimeout(() => {
         if (markers.length === 0 && eqStore.allEarthquakes && eqStore.allEarthquakes.length > 0) {
           console.log('[Map] Re-adding markers after style load');
           addMarkers(eqStore.allEarthquakes);
         }
       }, 500);
     });
     
     // Harita stili seçici ekle
     const styleControlElement = document.createElement('div');
     styleControlElement.className = 'maplibregl-ctrl maplibregl-ctrl-group';
     styleControlElement.style.cssText = 'position: absolute; top: 10px; right: 10px; z-index: 1000;';
     styleControlElement.innerHTML = `
       <select id="mapStyleSelect" style="padding: 8px; border: none; background: rgba(255,255,255,0.9); border-radius: 4px; font-size: 12px; cursor: pointer; min-width: 150px;">
         <option value="esri-world">🌍 Esri World</option>
         <option value="esri-satellite" selected>🛰️ Esri Satellite (Varsayılan)</option>
         <option value="esri-terrain">🏔️ Esri Terrain</option>
         <option value="osm">🗺️ OpenStreetMap</option>
         <option value="carto-positron">⚪ CartoDB Positron</option>
         <option value="carto-dark">🌙 CartoDB Dark</option>
         <option value="opentopomap">🗻 OpenTopoMap</option>
         <option value="stamen-terrain">🏔️ Stamen Terrain</option>
         <option value="stamen-toner">📰 Stamen Toner</option>
       </select>
     `;
     
     // Harita container'a ekle
     const mapContainer = document.getElementById('map');
     if (mapContainer) {
       mapContainer.appendChild(styleControlElement);
     }
     
     // Harita stili değiştirme fonksiyonu
     const changeMapStyle = (style: string) => {
       const sources = {
         'esri-world': {
           type: 'raster',
           tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'],
           tileSize: 256,
           attribution: '© Esri'
         },
         'esri-satellite': {
           type: 'raster',
           tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
           tileSize: 256,
           attribution: '© Esri'
         },
         'esri-terrain': {
           type: 'raster',
           tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'],
           tileSize: 256,
           attribution: '© Esri'
         },
         'osm': {
           type: 'raster',
           tiles: ['https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'],
           tileSize: 256,
           attribution: '© OpenStreetMap contributors'
         },
         'carto-positron': {
           type: 'raster',
           tiles: ['https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'],
           tileSize: 256,
           attribution: '© OpenStreetMap contributors © CARTO'
         },
         'carto-dark': {
           type: 'raster',
           tiles: ['https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'],
           tileSize: 256,
           attribution: '© OpenStreetMap contributors © CARTO'
         },
         'opentopomap': {
           type: 'raster',
           tiles: ['https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'],
           tileSize: 256,
           attribution: '© OpenTopoMap'
         },
         'stamen-terrain': {
           type: 'raster',
           tiles: ['https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.png'],
           tileSize: 256,
           attribution: '© Stamen Design, © OpenStreetMap contributors'
         },
         'stamen-toner': {
           type: 'raster',
           tiles: ['https://stamen-tiles.a.ssl.fastly.net/toner/{z}/{x}/{y}.png'],
           tileSize: 256,
           attribution: '© Stamen Design, © OpenStreetMap contributors'
         }
       };
       
       // Mevcut katmanı kaldır
       if (map.getLayer('current-layer')) {
         map.removeLayer('current-layer');
       }
       if (map.getSource('current-source')) {
         map.removeSource('current-source');
       }
       
       // Yeni kaynak ve katman ekle
       map.addSource('current-source', sources[style]);
       map.addLayer({
         id: 'current-layer',
         type: 'raster',
         source: 'current-source',
         minzoom: 0,
         maxzoom: 19
       });
     };
     
     // Event listener ekle
     const selectElement = styleControlElement.querySelector('#mapStyleSelect') as HTMLSelectElement;
     if (selectElement) {
       selectElement.addEventListener('change', (e) => {
         const target = e.target as HTMLSelectElement;
         changeMapStyle(target.value);
       });
     }

     // URL parametreleri ile odaklama
    const city = (route.query.city as string) || undefined;
    const magnitude = route.query.magnitude ? Number(route.query.magnitude) : undefined;
    let list = JSON.parse(JSON.stringify(eqStore.allEarthquakes || []));
    if (city) list = list.filter((x:any) => (x.Region?.City||'') === city);
    if (Number.isFinite(magnitude)) list = list.filter((x:any)=> Number(x.Magnitude) >= magnitude!);

    addMarkers(list);

    // Mağazadaki veriler değişince marker'ları güncelle - Sadece gerçek değişikliklerde
    let lastDataHash = '';
    watch(() => eqStore.allEarthquakes, (val:any[]) => {
      if (!val || val.length === 0) return;
      
      // Veri değişikliğini kontrol et
      const currentHash = JSON.stringify(val.map((x:any) => ({id: x.id || x.Date + x.Latitude + x.Longitude, mag: x.Magnitude})));
      if (currentHash === lastDataHash) return;
      lastDataHash = currentHash;
      
      console.log('[Map] Earthquake data changed, updating markers...');
      let newList = JSON.parse(JSON.stringify(val||[]));
      if (city) newList = newList.filter((x:any) => (x.Region?.City||'') === city);
      if (Number.isFinite(magnitude)) newList = newList.filter((x:any)=> Number(x.Magnitude) >= magnitude!);
      
      // Marker'ları güncelle ama mevcut olanları koru
      setTimeout(() => {
        if (map && markers.length > 0) {
          addMarkers(newList);
        }
      }, 100);
    }, { deep: true });
  });
}

onMounted(() => {
  listReady.value = true;
  if (currentView.value === 'map') {
    initMap();
  }
});

// Watch view changes
watch(currentView, (newView) => {
  if (newView === 'map' && !map) {
    initMap();
  }
});

onBeforeUnmount(() => {
  try { clearMarkers(); } catch {}
  try { map && map.remove(); } catch {}
});

useHead({
  meta: [
    {
      name: 'viewport',
      content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0',
    },
  ],
});
</script>
<style lang="scss" scoped>
.map {
  position: relative;
  width: 100%;
  max-width: $max-width-one;
  margin: 0 auto;
  padding: 16px 0;
  
  .view-selector {
    width: 100%;
    margin: 0 0 16px 0;
    display: none !important; /* Kalıcı olarak gizlendi */
    gap: 8px;
    justify-content: center;
    padding: 0 16px;
  }
  
  .view-btn {
    padding: 10px 20px;
    border: 2px solid $gray-two;
    background: white;
    color: $dark;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
    
    &:hover {
      border-color: $primary;
      background: lighten($primary, 45%);
    }
    
    &.active {
      background: $primary;
      color: white;
      border-color: $primary;
    }
  }
  
  .list-view {
    width: 100%;
    padding: 0 16px;
    display: none !important; /* Kalıcı olarak gizlendi */
    
    .loading {
      text-align: center;
      padding: 40px 0;
      color: $gray-three;
    }
  }
  
  .map-container-wrapper {
    position: relative;
    width: 100%;
    height: 70vh; /* Görseldeki gibi ekranın %70'i */
    min-height: 500px; /* Minimum yükseklik */
    max-height: 800px; /* Maksimum yükseklik */
    background: #000; /* Koyu arka plan */
    border-radius: 0; /* Köşe yuvarlaklığı yok */
    overflow: hidden;
    box-shadow: none; /* Gölge yok */
    border: none; /* Çerçeve yok */
    @include small-device {
      height: 60vh;
      min-height: 400px;
    }
  }
  
  #map {
    height: 100%;
    width: 100%;
  }
  
  .filter-btn {
    position: absolute;
    right: 12px;
    top: 12px;
    z-index: 10;
    background: $white;
    border: 2px solid $gray-three;
    border-radius: 6px;
    padding: 6px 10px;
    cursor: pointer;
    font-weight: 600;
  }
}
/* Sadece gölge animasyonu - Konum değişmez */
@keyframes earthquakeMarkerPulse {
  0% { 
    box-shadow: 
      0 0 0 1px rgba(255,255,255,0.9),
      0 0 0 3px currentColor,
      0 0 15px currentColor,
      0 0 25px currentColor,
      0 4px 20px rgba(0,0,0,0.4),
      inset 0 2px 4px rgba(255,255,255,0.3),
      inset 0 -2px 4px rgba(0,0,0,0.2);
  }
  50% { 
    box-shadow: 
      0 0 0 2px rgba(255,255,255,1),
      0 0 0 4px currentColor,
      0 0 20px currentColor,
      0 0 35px currentColor,
      0 6px 25px rgba(0,0,0,0.5),
      inset 0 3px 6px rgba(255,255,255,0.4),
      inset 0 -3px 6px rgba(0,0,0,0.3);
  }
  100% { 
    box-shadow: 
      0 0 0 1px rgba(255,255,255,0.9),
      0 0 0 3px currentColor,
      0 0 15px currentColor,
      0 0 25px currentColor,
      0 4px 20px rgba(0,0,0,0.4),
      inset 0 2px 4px rgba(255,255,255,0.3),
      inset 0 -2px 4px rgba(0,0,0,0.2);
  }
}

.quake-marker { 
  pointer-events: auto; 
  animation: earthquakeMarkerPulse 3s infinite;
  transform: none !important;
  transition: none !important;
  will-change: auto !important;
  backface-visibility: visible !important;
  transform-style: flat !important;
  position: absolute !important;
  z-index: 1000 !important;
  left: 0 !important;
  top: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
}

/* Gelişmiş Deprem Bilgi Paneli */
.earthquake-info-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 400px;
  max-height: 80vh;
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  border: 1px solid #404040;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.6);
  z-index: 1000;
  overflow-y: auto;
  backdrop-filter: blur(10px);
}

.panel-header {
  padding: 16px 20px;
  background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
  color: white;
  border-radius: 12px 12px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.earthquake-title h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.earthquake-location {
  font-size: 14px;
  opacity: 0.9;
  margin-top: 4px;
}

.close-panel {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.close-panel:hover {
  background-color: rgba(255,255,255,0.2);
}

.panel-content {
  padding: 20px;
}

/* Deprem Detayları */
.earthquake-details {
  margin-bottom: 24px;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
}

.detail-icon {
  font-size: 20px;
  width: 32px;
  text-align: center;
}

.detail-info {
  flex: 1;
}

.detail-label {
  font-size: 12px;
  color: #b0b0b0;
  margin-bottom: 4px;
}

.detail-value {
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
}

.magnitude {
  padding: 4px 8px;
  border-radius: 6px;
  color: white;
  font-weight: 700;
}

.magnitude.critical { background: linear-gradient(135deg, #dc3545, #c82333); }
.magnitude.high { background: linear-gradient(135deg, #fd7e14, #e55a00); }
.magnitude.medium { background: linear-gradient(135deg, #ffc107, #e0a800); color: #212529; }
.magnitude.low { background: linear-gradient(135deg, #28a745, #1e7e34); }

/* Sismik Aktivite */
.seismic-activity h4 {
  color: #ffffff;
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
}

.activity-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.stat-item {
  text-align: center;
  padding: 12px;
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
}

.stat-number {
  font-size: 20px;
  font-weight: 700;
  color: #007bff;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #b0b0b0;
}

/* Sismik Grafik */
.seismic-chart {
  margin-bottom: 20px;
}

.chart-container {
  display: flex;
  align-items: end;
  gap: 4px;
  height: 120px;
  padding: 16px;
  background: rgba(0,0,0,0.3);
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
}

.seismic-bar {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.bar {
  width: 100%;
  min-height: 4px;
  border-radius: 2px 2px 0 0;
  transition: all 0.3s ease;
}

.bar:hover {
  transform: scaleY(1.1);
  box-shadow: 0 0 8px currentColor;
}

.bar-label {
  font-size: 10px;
  color: #ffffff;
  font-weight: 600;
}

.bar-time {
  font-size: 9px;
  color: #b0b0b0;
}

/* Yakın Depremler */
.nearby-earthquakes h5 {
  color: #ffffff;
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
}

.earthquake-list {
  max-height: 200px;
  overflow-y: auto;
}

.earthquake-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  margin-bottom: 8px;
  background: rgba(255,255,255,0.05);
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.1);
}

.eq-magnitude {
  font-size: 16px;
  font-weight: 700;
  color: #007bff;
  min-width: 40px;
}

.eq-info {
  flex: 1;
}

.eq-city {
  font-size: 12px;
  color: #ffffff;
  font-weight: 500;
}

.eq-distance {
  font-size: 10px;
  color: #b0b0b0;
}

.eq-time {
  font-size: 10px;
  color: #b0b0b0;
}

/* Mobil Uyumluluk */
@media (max-width: 768px) {
  .earthquake-info-panel {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    max-width: 400px;
    max-height: 90vh;
  }
  
  .detail-grid {
    grid-template-columns: 1fr;
  }
  
  .activity-stats {
    grid-template-columns: 1fr;
  }
}
</style>
