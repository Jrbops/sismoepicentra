<template>
  <div class="live-location-page">
    <h1>📍 Canlı Konum Takibi</h1>
    <p class="page-description">
      Konumunuz her 10 saniyede bir otomatik olarak güncellenir ve harita üzerinde gösterilir.
    </p>
    
    <LiveLocationMap />
  </div>
</template>

<script setup lang="ts">
// Component otomatik import edilir
</script>

<style lang="scss" scoped>
.live-location-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  
  h1 {
    font-size: 32px;
    margin-bottom: 12px;
    color: #2c3e50;
  }
  
  .page-description {
    font-size: 16px;
    color: #6c757d;
    margin-bottom: 30px;
  }
}
</style>
