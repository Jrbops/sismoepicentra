<template>
  <div class="ew-card" :class="{ 'ew-card--alert': isAlert }">
    <div class="ew-card__header">
      <div class="ew-card__magnitude">
        <span class="mag-value">{{ earthquake.Magnitude.toFixed(1) }}</span>
      </div>
      <div class="ew-card__info">
        <div class="ew-card__location">
          <strong>{{ earthquake.Region.City }}</strong>
          <span v-if="earthquake.Region.District">{{ earthquake.Region.District }}</span>
        </div>
        <div class="ew-card__time">{{ formatTime(earthquake.Date) }}</div>
        <div class="ew-card__source">
          <span class="badge">{{ earthquake.Source === 'KOERI' ? 'Kandilli' : earthquake.Source }}</span>
        </div>
      </div>
      <div class="ew-card__icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
        </svg>
      </div>
    </div>
    <div class="ew-card__waveform">
      <svg viewBox="0 0 200 40" preserveAspectRatio="none">
        <polyline
          :points="waveformPoints"
          fill="none"
          :stroke="isAlert ? '#e74c3c' : '#3498db'"
          stroke-width="1.5"
        />
      </svg>
    </div>
    <div class="ew-card__details">
      <span>Derinlik: {{ earthquake.Depth }}km</span>
      <span v-if="distance">Mesafe: {{ distance }}km</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EarthquakeInterface } from '~~/interfaces/earthquake.interface';

const props = defineProps<{
  earthquake: EarthquakeInterface;
  distance?: number;
}>();

const isAlert = computed(() => props.earthquake.Magnitude >= 4.0);

const waveformPoints = computed(() => {
  const mag = props.earthquake.Magnitude;
  const amplitude = Math.min(mag * 4, 18);
  const frequency = Math.max(1, mag * 0.5);
  const points: string[] = [];
  for (let x = 0; x <= 200; x += 2) {
    const y = 20 + amplitude * Math.sin((x / 200) * Math.PI * frequency * 4);
    points.push(`${x},${y}`);
  }
  return points.join(' ');
});

function formatTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Az önce';
    if (minutes < 60) return `${minutes} dakika önce`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} saat önce`;
    return d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}
</script>

<style lang="scss" scoped>
.ew-card {
  width: 100%;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }

  &--alert {
    border-left: 4px solid #e74c3c;
    background: #fff5f5;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  &__magnitude {
    min-width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 700;
    font-size: 20px;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
  }

  &__info {
    flex: 1;
  }

  &__location {
    font-size: 16px;
    margin-bottom: 4px;
    strong {
      font-weight: 600;
      color: #2c3e50;
    }
    span {
      margin-left: 6px;
      color: #7f8c8d;
      font-size: 14px;
    }
  }

  &__time {
    font-size: 12px;
    color: #95a5a6;
    margin-bottom: 4px;
  }

  &__source .badge {
    display: inline-block;
    padding: 2px 8px;
    background: #ecf0f1;
    border-radius: 4px;
    font-size: 11px;
    color: #34495e;
    font-weight: 600;
  }

  &__icon {
    width: 24px;
    height: 24px;
    color: #95a5a6;
  }

  &__waveform {
    width: 100%;
    height: 40px;
    margin-bottom: 8px;
    svg {
      width: 100%;
      height: 100%;
    }
  }

  &__details {
    display: flex;
    gap: 16px;
    font-size: 12px;
    color: #7f8c8d;
    span {
      display: flex;
      align-items: center;
    }
  }
}
</style>
