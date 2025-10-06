<template>
  <div class="index" vertical-center>
    <div v-if="favoriteCities.length" class="favorites-bar" horizontal-center>
      <span class="favorites-label">Favori Şehirler:</span>
      <button
        v-for="city in favoriteCities"
        :key="city"
        class="favorite-city-btn"
        @click="filterByFavorite(city)"
      >
        {{ city }}
      </button>
    </div>
    <div class="toolbar" v-if="isClient" horizontal-center>
      <label class="nearby-toggle">
        <input type="checkbox" v-model="nearbyOnly" />
        Yakınımdakiler
      </label>
      <small v-if="nearbyOnly && !hasLocation" class="hint">Konum izni gerekli</small>
    </div>
    <ClientOnly>
      <template #fallback>
        <div class="loading" style="width:100%;max-width:var(--max-width-one);text-align:center;margin:20px 0;">Yükleniyor…</div>
      </template>
      <EarthquakeAlertOverlay :earthquake="alertEarthquake" @close="alertEarthquake = null" />
      
      <!-- Liste Görünümü (Ana sayfa artık sadece liste gösterir) -->
      <EarthquakesList v-if="listReady" />
      <div v-else class="loading" style="width:100%;max-width:var(--max-width-one);text-align:center;margin:20px 0;">Yükleniyor…</div>
    </ClientOnly>
    <Filters />
  </div>
</template>
<script setup lang="ts">
import Filters from "~~/components/filters.vue";
import EarthquakesList from "~~/components/earthquakes-list.vue";
import EarlyWarningCard from "~~/components/early-warning-card.vue";
import EarthquakeAlertOverlay from "~~/components/earthquake-alert-overlay.vue";
import type { EarthquakeInterface } from "~~/interfaces/earthquake.interface";
import { useEarthquakesStore } from "~~/store/earthquakes";
import { capitalizeFirstLetter, clearTurkishChars } from "~~/utils/string.util";
import { storeToRefs } from 'pinia';
const earthquakesStore = useEarthquakesStore();
const { setAllEarthquakes, setLastEarthquakes, allEarthquakes, getFavoriteCities } = earthquakesStore;
const favoriteCities = getFavoriteCities;
const route = useRoute();
const config = useRuntimeConfig();
const isClient = typeof window !== 'undefined';
const listReady = ref(false);
const alertEarthquake = ref<EarthquakeInterface | null>(null);
// Nearby filter state
const nearbyOnly = ref(false);
const hasLocation = ref(false);
const myPos = ref<{ lat: number; lng: number } | null>(null);
const thresholds = reactive({ minMag: 3, maxKm: 500, withinMin: 120 });

// Early warning events (son 10 dakika, M>=3.5) + test depremleri
const testEarthquakes = ref<Array<EarthquakeInterface>>([]);
const earlyWarningEvents = computed(() => {
  const real: Array<EarthquakeInterface> = [];
  if (Array.isArray(allEarthquakes)) {
    const now = Date.now();
    const threshold = 10 * 60 * 1000; // 10 dakika
    real.push(...(allEarthquakes as Array<EarthquakeInterface>)
      .filter((eq) => {
        const t = new Date(eq.Date).getTime();
        return isFinite(t) && (now - t) <= threshold && eq.Magnitude >= 3.5;
      }));
  }
  const combined = [...testEarthquakes.value, ...real];
  combined.sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
  return combined.slice(0, 5);
});

const shownAlertIds = new Set<string>();

const loadTestEarthquakes = async () => {
  try {
    const res = await $fetch<Array<EarthquakeInterface>>('/api/earthquakes-test');
    if (Array.isArray(res)) {
      testEarthquakes.value = res;
      // Trigger alert overlay for the most recent test earthquake
      if (res.length > 0) {
        const latest = res[res.length - 1];
        
        // Eğer bu depremi daha önce gösterdiyse, tekrar gösterme
        if (shownAlertIds.has(latest.ID)) return;
        
        const now = Date.now();
        const eqTime = new Date(latest.Date).getTime();
        // Show alert if earthquake is less than 5 seconds old (anlık)
        if (isFinite(eqTime) && (now - eqTime) <= 5000) {
          // Bu depremi gösterildi olarak işaretle
          shownAlertIds.add(latest.ID);
          // ANLIK göster (gecikme yok)
          alertEarthquake.value = latest;
        }
      }
    }
  } catch {}
};


const calculateDistance = (eq: EarthquakeInterface): number | undefined => {
  if (!myPos.value) return undefined;
  const R = 6371;
  const dLat = (eq.Latitude - myPos.value.lat) * Math.PI / 180;
  const dLng = (eq.Longitude - myPos.value.lng) * Math.PI / 180;
  const la1 = myPos.value.lat * Math.PI / 180;
  const la2 = eq.Latitude * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(x)));
};

const loadSettingsThresholds = () => {
  try {
    const raw = localStorage.getItem('zelzele.settings');
    if (!raw) return;
    const s = JSON.parse(raw);
    if (typeof s.ewMinMag === 'number') thresholds.minMag = s.ewMinMag;
    if (typeof s.ewMaxKm === 'number') thresholds.maxKm = s.ewMaxKm;
    if (typeof s.ewWithinMinutes === 'number') thresholds.withinMin = s.ewWithinMinutes;
  } catch {}
};

const haversineKm = (a:{lat:number,lng:number}, b:{lat:number,lng:number}) => {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI/180;
  const dLng = (b.lng - a.lng) * Math.PI/180;
  const la1 = a.lat * Math.PI/180;
  const la2 = b.lat * Math.PI/180;
  const x = Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(x));
};
await useAsyncData(async () => {
  // SSR: hızlı yanıt için sadece AFAD'ı çekiyoruz; client-side birleşik veriye geçilecek
  const _allEarthquakes = await $fetch<Array<EarthquakeInterface>>(
    `/api/earthquakes`,
    { method: "GET" }
  );
  if (Object.keys(route.query).length > 0) {
    let filteredList: Array<EarthquakeInterface> = JSON.parse(
      JSON.stringify(_allEarthquakes)
    );
    if (route.query.city) {
      filteredList = filteredList.filter((item: EarthquakeInterface) => {
        return clearTurkishChars(item.Region.City) === route.query.city;
      });
    }
    if (route.query.magnitude) {
      filteredList = filteredList.filter((item: EarthquakeInterface) => {
        return item.Magnitude > Number(route.query.magnitude);
      });
    }
    setLastEarthquakes(filteredList);
  } else {
    setLastEarthquakes(
      JSON.parse(JSON.stringify(_allEarthquakes)).splice(0, 30)
    );
  }
  setAllEarthquakes(_allEarthquakes);
});

// Gerçek zamanlı test depremi kontrolü (her 1 saniyede bir - daha hızlı)
let testPollingInterval: any = null;

// Service Worker mesajlarını dinle (bildirime tıklandığında)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'OPEN_FULLSCREEN_ALERT') {
      // En son test depremini tam ekran göster
      if (testEarthquakes.value.length > 0) {
        alertEarthquake.value = testEarthquakes.value[testEarthquakes.value.length - 1];
      }
    }
  });
}

// Client-side: respect Settings -> dataSource by refetching from combined endpoint
onMounted(async () => {
  // Emniyet: 8 sn sonra mutlaka listeyi aç
  const safety = setTimeout(() => { listReady.value = true; }, 8000);
  
  // Test depremi polling başlat (1 saniyede bir)
  testPollingInterval = setInterval(loadTestEarthquakes, 1000);
  
  try {
    const raw = localStorage.getItem("zelzele.settings");
    const ds = raw ? (JSON.parse(raw)?.dataSource || "both") : "both";
    loadSettingsThresholds();
    await loadTestEarthquakes(); // Test depremlerini yükle
    
    // Direkt API kullan - Host gereksiz!
    const { fetchAll } = useDirectAPI();
    const combined = await fetchAll();
    
    setAllEarthquakes(combined);
    // Re-apply current route filters
    const val = route.query as Record<string, string | string[]>;
    let filteredList = JSON.parse(JSON.stringify(combined));
    if (val.city) {
      const cityVal = Array.isArray(val.city) ? val.city[0] : val.city;
      filteredList = filteredList.filter((item: EarthquakeInterface) => {
        return clearTurkishChars(item.Region.City) === cityVal;
      });
    }
    if (val.magnitude) {
      const magVal = Array.isArray(val.magnitude) ? val.magnitude[0] : val.magnitude;
      filteredList = filteredList.filter((item: EarthquakeInterface) => {
        return item.Magnitude > Number(magVal);
      });
    }
    setLastEarthquakes(filteredList?.length ? filteredList : JSON.parse(JSON.stringify(combined)).splice(0, 30));
  } catch (e) {
    console.error(e);
  } finally {
    listReady.value = true;
    clearTimeout(safety);
  }
  // Geolocation for nearby filter
  if (navigator?.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        hasLocation.value = true;
        myPos.value = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      },
      () => { hasLocation.value = false; },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }
});
watch(
  () => route.query,
  (val) => {
    if (val) {
      let filteredList = JSON.parse(JSON.stringify(allEarthquakes));
      if ((val as any).city) {
        const c = Array.isArray((val as any).city) ? (val as any).city[0] : (val as any).city;
        filteredList = filteredList.filter((item: EarthquakeInterface) => {
          return clearTurkishChars(item.Region.City) === c;
        });
      }
      if ((val as any).magnitude) {
        const m = Array.isArray((val as any).magnitude) ? (val as any).magnitude[0] : (val as any).magnitude;
        filteredList = filteredList.filter((item: EarthquakeInterface) => {
          return item.Magnitude > Number(m);
        });
      }
      setLastEarthquakes(filteredList);
    } else {
      setLastEarthquakes(
        JSON.parse(JSON.stringify(allEarthquakes)).splice(0, 30)
      );
    }
  }
);

// React to nearby toggle
watch(
  () => nearbyOnly.value,
  (on) => {
    try {
      if (!on) {
        // restore list using route filters
        const q = route.query as Record<string, string | string[]>;
        let filtered = JSON.parse(JSON.stringify(allEarthquakes));
        if (q.city) {
          const c = Array.isArray(q.city) ? q.city[0] : q.city;
          filtered = filtered.filter((item: EarthquakeInterface) => clearTurkishChars(item.Region.City) === c);
        }
        if (q.magnitude) {
          const m = Array.isArray(q.magnitude) ? q.magnitude[0] : q.magnitude;
          filtered = filtered.filter((item: EarthquakeInterface) => item.Magnitude > Number(m));
        }
        setLastEarthquakes(filtered?.length ? filtered : JSON.parse(JSON.stringify(allEarthquakes)).splice(0, 30));
        return;
      }
      loadSettingsThresholds();
      if (!hasLocation.value || !myPos.value) {
        alert('Yakınımdakiler için konum izni gerekli.');
        nearbyOnly.value = false;
        return;
      }
      const now = Date.now();
      const filtered = (allEarthquakes as Array<EarthquakeInterface>)
        .filter((q) => Number(q.Magnitude) >= thresholds.minMag)
        .filter((q) => {
          const t = new Date(q.Date).getTime();
          return isFinite(t) ? (now - t) <= thresholds.withinMin * 60 * 1000 : true;
        })
        .map((q) => ({ q, d: haversineKm(myPos.value!, { lat: q.Latitude, lng: q.Longitude }) }))
        .filter((x) => x.d <= thresholds.maxKm)
        .sort((a, b) => a.d - b.d)
        .map((x) => x.q)
        .slice(0, 50);
      setLastEarthquakes(filtered);
    } catch (e) {
      console.error(e);
    }
  }
)
function filterByFavorite(city: string) {
  const citySlug = clearTurkishChars(city);
  window.location.href = `/?city=${citySlug}`;
}
const cityHeadVal = (() => {
  const c = (route.query as any)?.city;
  return Array.isArray(c) ? c[0] : c;
})();
if (cityHeadVal) {
  useHead({
    title: capitalizeFirstLetter(cityHeadVal) + " " + config.public.appTitle,
    meta: [
      {
        name: "description",
        content:
          capitalizeFirstLetter(cityHeadVal) + " şehri için " + config.public.appDescription,
      },
    ],
  });
}
</script>
<style lang="scss" scoped>
@import "@/assets/scss/variables.scss"; @import "@/assets/scss/mixins.scss";
.index {
  width: 100%;
  .favorites-bar {
    width: 100%;
    max-width: $max-width-one;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
    .favorites-label {
      font-weight: 600;
      color: $dark;
    }
    .favorite-city-btn {
      background: $gray-one;
      border: none;
      border-radius: 4px;
      padding: 4px 12px;
      cursor: pointer;
      &:hover {
        background: $gray-two;
      }
    }
  }
  .toolbar { 
    width: 100%; 
    max-width: $max-width-one; 
    justify-content: flex-end; 
    gap: 12px; 
    margin: 10px 0; 
  }
  .nearby-toggle { 
    display:flex; 
    align-items:center; 
    gap:6px; 
    font-size: 13px; 
  }
  .hint { 
    color: $gray-three; 
  }
}
</style>
