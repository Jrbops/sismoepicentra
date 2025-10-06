<template>
  <main class="layout" vertical-center>
    <!-- Konum İzni (Atlanabilir) -->
    <ClientOnly>
      <LocationGuard 
        :mandatory="false" 
        :allowSkip="true"
        @granted="onLocationGranted"
        @denied="onLocationDenied"
        @skipped="onLocationSkipped"
      />
    </ClientOnly>
    
    <AppHeader />
    <div class="layout__content">
      <slot />
    </div>
    <BottomBar />
    <Loader v-if="isLoading" />
  </main>
</template>

<script setup lang="ts">
import AppHeader from "~~/components/partials/app-header.vue";
import BottomBar from "~~/components/partials/bottom-bar.vue";
import Loader from "~~/components/loader.vue";

const isLoading = ref(false);
const route = useRoute();
const nuxtApp = useNuxtApp();

nuxtApp.hook("page:start", () => {
  isLoading.value = true;
});

nuxtApp.hook("page:finish", () => {
  isLoading.value = false;
});

// Konum izni event handlers
function onLocationGranted(position?: any) {
  console.log('[Layout] Location permission granted', position);
  // Konum izni verildi, uygulama kullanılabilir
}

function onLocationDenied() {
  console.log('[Layout] Location permission denied');
  // Konum izni reddedildi
}

function onLocationSkipped() {
  console.log('[Layout] Location permission skipped');
  // Kullanıcı atladı, sınırlı özelliklerle devam
}
onMounted(() => {
  const raw = localStorage.getItem('zelzele.settings');
  let theme = 'system';
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.theme) theme = parsed.theme;
    } catch {}
  }
  if (theme === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
  } else if (theme === 'light') {
    document.body.setAttribute('data-theme', 'light');
  } else {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.body.setAttribute('data-theme', 'light');
    }
  }
});
</script>
<style lang="scss" scoped>
.layout {
  width: 100%;
  padding-bottom: 120px;
  @include small-device {
    padding-bottom: 90px;
  }
  &__content {
    width: 100%;
  }
}
</style>
