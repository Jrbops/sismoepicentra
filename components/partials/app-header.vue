<template>
  <header class="header" vertical-center>
    <div class="header__content" horizontal-center>
      <div class="site-info" horizontal-center>
        <NuxtLink to="/">
          <img
            src="../../assets/svg/logo.svg"
            title="Epicentra İo logo"
            alt="Epicentra İo"
          />
        </NuxtLink>
      </div>
      <div v-if="isListingPage" horizontal-center>
        <div class="refresh" :title="`Yenileme: ${countdown}s`" aria-label="Otomatik yenileme sayacı">
          {{ countdown }}
        </div>
        <div class="filter" @click="openFilterModal">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
            <path
              opacity="0.2"
              d="M20.5996 4.1001V6.3001C20.5996 7.1001 20.0996 8.1001 19.5996 8.6001L15.2996 12.4001C14.6996 12.9001 14.2996 13.9001 14.2996 14.7001V19.0001C14.2996 19.6001 13.8996 20.4001 13.3996 20.7001L11.9996 21.6001C10.6996 22.4001 8.89961 21.5001 8.89961 19.9001V14.6001C8.89961 13.9001 8.49961 13.0001 8.09961 12.5001L7.09961 11.4501L12.9196 2.1001H18.5996C19.6996 2.1001 20.5996 3.0001 20.5996 4.1001Z"
              fill="#292D32"
            />
            <path
              d="M11.3004 2.1001L6.12039 10.4101L4.30039 8.5001C3.80039 8.0001 3.40039 7.1001 3.40039 6.5001V4.2001C3.40039 3.0001 4.30039 2.1001 5.40039 2.1001H11.3004Z"
              fill="#292D32"
            />
          </svg>
        </div>
        <NuxtLink to="/admin" class="admin-btn" title="Yönetim">
          Yönetim
        </NuxtLink>
      </div>
    </div>
    <div v-if="isListingPage && koeriDown" class="provider-banner" role="status">
      Kandilli şu anda yanıt vermiyor. Liste AFAD verisiyle gösteriliyor.
    </div>
  </header>
</template>
<script setup lang="ts">
const route = useRoute();
import { useFilterStore } from "~~/store/filters";
import { useEarthquakesStore } from "~~/store/earthquakes";
import { clearTurkishChars } from "~~/utils/string.util";
const isListingPage = computed(() => {
  return route.name === "index";
});
const filterStore = useFilterStore();
const { setFilterModalVisible } = filterStore;
const openFilterModal = () => {
  setFilterModalVisible(true);
};

// Provider status banner (Direct API tabanlı kontrol)
const koeriDown = ref(false);
const pollStatus = async () => {
  try {
    const { fetchKOERI } = useDirectAPI();
    const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 5000));
    const res: any = await Promise.race([fetchKOERI(), timeout]);
    koeriDown.value = !(Array.isArray(res) && res.length > 0);
  } catch { koeriDown.value = true; }
};

// Countdown & auto-refresh
const earthquakesStore = useEarthquakesStore();
const { setAllEarthquakes, setLastEarthquakes, allEarthquakes } = earthquakesStore as any;
const countdown = ref(10);
const intervalSec = ref(10);
let intervalId: any = null;

const applyFiltersAndSet = (list: any[]) => {
  try {
    const q: any = route.query || {};
    let filtered = JSON.parse(JSON.stringify(list));
    if (q.city) {
      const c = Array.isArray(q.city) ? q.city[0] : q.city;
      filtered = filtered.filter((item: any) => clearTurkishChars(item.Region?.City || "") === c);
    }
    if (q.magnitude) {
      const m = Number(Array.isArray(q.magnitude) ? q.magnitude[0] : q.magnitude);
      if (Number.isFinite(m)) filtered = filtered.filter((item: any) => Number(item.Magnitude) > m);
    }
    setLastEarthquakes(filtered?.length ? filtered : JSON.parse(JSON.stringify(list)).splice(0, 30));
  } catch {
  }
};

  const refreshData = async () => {
    try {
      // Direkt API kullan - Host gereksiz!
      const { fetchAll } = useDirectAPI();
      const data = await fetchAll();
      if (Array.isArray(data)) {
        setAllEarthquakes(data);
        applyFiltersAndSet(data);
        // KOERI veri var mı? Banner senkronize et
        koeriDown.value = !data.some((it: any) => it?.Source === 'KOERI');
      }
    } catch (error) {
      console.error('Refresh error:', error);
    }
  };

const loadIntervalFromSettings = () => {
  try {
    const raw = localStorage.getItem('zelzele.settings');
    const parsed = raw ? JSON.parse(raw) : null;
    const sec = Number(parsed?.refreshIntervalSec);
    const newVal = Number.isFinite(sec) && sec >= 5 ? sec : 10;
    if (newVal !== intervalSec.value) {
      intervalSec.value = newVal;
      countdown.value = intervalSec.value;
    }
  } catch (error) {
    console.error('Error loading interval from settings:', error);
  }
};

onMounted(() => {
  // Initial provider status
  pollStatus();
  const statusTimer = setInterval(pollStatus, 15000);
  loadIntervalFromSettings();
  // Listen to settings changes across tabs
  window.addEventListener('storage', (e) => {
    if (e.key === 'zelzele.settings') {
      loadIntervalFromSettings();
    }
  });
  // Also refresh interval when tab regains focus
  const onFocus = () => loadIntervalFromSettings();
  window.addEventListener('focus', onFocus);
  intervalId = setInterval(async () => {
    countdown.value -= 1;
    if (countdown.value <= 0) {
      countdown.value = intervalSec.value;
      await refreshData();
    }
  }, 1000);
  // Save for cleanup
  (window as any).__ew_onFocus = onFocus;
  (window as any).__status_timer = statusTimer;
});

onBeforeUnmount(() => {
  if (intervalId) clearInterval(intervalId);
  window.removeEventListener('focus', (window as any).__ew_onFocus);
  if ((window as any).__status_timer) clearInterval((window as any).__status_timer);
});
</script>
<style lang="scss" scoped>
.header {
  width: 100%;
  padding: 0 $padding-one;
  box-shadow: 0 0 6px 2px transparentize($dark, 0.8);
  position: sticky;
  height: 60px;
  top: 0;
  z-index: 99;
  background: #fff;

  @include small-device {
    padding: 0 $padding-one;
    height: 40px;
    border-color: $gray-three;
  }
  &__content {
    width: 100%;
    max-width: $max-width-one;
    justify-content: space-between;
    .site-info {
      display: flex;
      height: fit-content;
      position: relative;
      a {
        height: 40px;
        width: 40px;
        @include small-device {
          width: 32px;
          height: 32px;
        }
        img {
          width: 100%;
          height: 100%;
        }
      }
    }
    .filter {
      height: 30px;
      width: 30px;
      cursor: pointer;
      @include small-device {
        width: 26px;
        height: 26px;
      }
      svg {
        height: 100%;
        width: 100%;
      }
    }
    .refresh {
      height: 30px;
      min-width: 30px;
      padding: 0 6px;
      margin-right: 10px;
      border-radius: 6px;
      background: linear-gradient(180deg, #e8ecf3 0%, #cfd6e6 100%);
      color: #273251;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      user-select: none;
    }
  }
}
.provider-banner {
  width: 100%;
  text-align: center;
  background: #fff3cd;
  color: #7a5a00;
  padding: 6px 10px;
  font-size: 12px;
  border-top: 1px solid #ffe69c;
  border-bottom: 1px solid #ffe69c;
}
</style>
