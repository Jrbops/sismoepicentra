<template>
  <div v-if="!hasPermission" class="location-guard-overlay">
    <div class="guard-modal">
      <div class="guard-icon">📍</div>
      <h2>Konum İzni Gerekli</h2>
      <p class="guard-description">
        Epicentra, size en yakın depremleri göstermek ve erken uyarı sistemi için 
        <strong>konum bilginize ihtiyaç duyar</strong>.
      </p>
      
      <div class="features-list">
        <div class="feature-item">
          <span class="feature-icon">🎯</span>
          <span>Size en yakın depremleri gösterir</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">⚡</span>
          <span>Erken uyarı sistemi için gerekli</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">📊</span>
          <span>Mesafe ve yön hesaplamaları</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">🗺️</span>
          <span>Haritada konumunuzu gösterir</span>
        </div>
      </div>

      <div class="permission-status" v-if="permissionState">
        <div class="status-badge" :class="permissionState">
          {{ permissionStateText }}
        </div>
      </div>

      <button class="allow-btn" @click="requestPermission" :disabled="isRequesting">
        <span v-if="!isRequesting">🔓 Konum İznini Ver</span>
        <span v-else>
          <span class="spinner-small"></span> İzin bekleniyor...
        </span>
      </button>

      <div v-if="error" class="guard-error">
        <strong>❌ {{ error }}</strong>
        <div class="error-steps">
          <p><strong>Manuel olarak nasıl etkinleştirilir?</strong></p>
          <ol>
            <li>Tarayıcı adres çubuğundaki <strong>🔒 kilit</strong> ikonuna tıklayın</li>
            <li><strong>"Konum"</strong> iznini bulun</li>
            <li><strong>"İzin Ver"</strong> seçeneğini seçin</li>
            <li>Sayfayı <strong>yenileyin (F5)</strong></li>
          </ol>
        </div>
      </div>

      <div class="privacy-note">
        <p>
          🔒 <strong>Gizlilik:</strong> Konum bilginiz sadece tarayıcınızda saklanır 
          ve sunucuya gönderilmez. İstediğiniz zaman ayarlardan devre dışı bırakabilirsiniz.
        </p>
      </div>

      <button class="skip-btn" @click="skipForNow" v-if="allowSkip">
        Şimdilik Atla (Sınırlı Özellikler)
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  allowSkip?: boolean; // Kullanıcının atlayabilmesine izin ver
  mandatory?: boolean; // Zorunlu mod (atlanamaz)
}>();

const emit = defineEmits(['granted', 'denied', 'skipped']);

const hasPermission = ref(false);
const permissionState = ref<string>('');
const permissionStateText = computed(() => {
  switch (permissionState.value) {
    case 'granted': return '✅ İzin Verildi';
    case 'denied': return '❌ İzin Reddedildi';
    case 'prompt': return '⏳ İzin Bekleniyor';
    default: return '';
  }
});

const isRequesting = ref(false);
const error = ref<string | null>(null);

onMounted(() => {
  checkPermission();
});

async function checkPermission() {
  if (typeof window === 'undefined' || !('geolocation' in navigator)) {
    error.value = 'Tarayıcınız konum servislerini desteklemiyor';
    return;
  }

  // Mobilde direkt konum almayı dene
  try {
    await new Promise<void>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // İzin verilmiş!
          hasPermission.value = true;
          permissionState.value = 'granted';
          emit('granted', position);
          resolve();
        },
        (err) => {
          // İzin reddedilmiş veya hata
          if (err.code === err.PERMISSION_DENIED) {
            permissionState.value = 'denied';
            error.value = 'Konum izni reddedildi. Lütfen ayarlardan izin verin.';
          } else {
            permissionState.value = 'prompt';
          }
          reject(err);
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 60000
        }
      );
    });
  } catch (e) {
    console.warn('Initial location check failed:', e);
  }
}

async function requestPermission() {
  if (typeof window === 'undefined' || !('geolocation' in navigator)) {
    return;
  }

  isRequesting.value = true;
  error.value = null;

  try {
    await new Promise<void>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          hasPermission.value = true;
          permissionState.value = 'granted';
          emit('granted', position);
          resolve();
        },
        (err) => {
          permissionState.value = 'denied';
          
          switch (err.code) {
            case err.PERMISSION_DENIED:
              error.value = 'Konum izni reddedildi. Lütfen tarayıcı ayarlarından konum iznini etkinleştirin.';
              emit('denied');
              break;
            case err.POSITION_UNAVAILABLE:
              error.value = 'Konum bilgisi alınamadı. GPS veya internet bağlantınızı kontrol edin.';
              break;
            case err.TIMEOUT:
              error.value = 'Konum alma zaman aşımına uğradı. Lütfen tekrar deneyin.';
              break;
            default:
              error.value = 'Bilinmeyen bir hata oluştu. Lütfen tekrar deneyin.';
          }
          reject(err);
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  } catch (e) {
    console.error('Permission request failed:', e);
  } finally {
    isRequesting.value = false;
  }
}

function skipForNow() {
  if (props.mandatory) {
    error.value = 'Konum izni zorunludur. Uygulamayı kullanmak için izin vermeniz gerekiyor.';
    return;
  }
  
  emit('skipped');
  hasPermission.value = true; // Geçici olarak izin ver
}
</script>

<style lang="scss" scoped>
.location-guard-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeIn 0.3s ease;
}

.guard-modal {
  background: white;
  border-radius: 20px;
  padding: 40px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.4s ease;
  
  @media (max-width: 768px) {
    padding: 24px;
  }
}

.guard-icon {
  font-size: 80px;
  text-align: center;
  margin-bottom: 24px;
  animation: bounce 2s infinite;
}

h2 {
  text-align: center;
  font-size: 28px;
  color: #2c3e50;
  margin: 0 0 16px 0;
}

.guard-description {
  text-align: center;
  font-size: 16px;
  color: #495057;
  line-height: 1.6;
  margin-bottom: 32px;
  
  strong {
    color: #e74c3c;
  }
}

.features-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 32px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  
  .feature-icon {
    font-size: 24px;
    flex-shrink: 0;
  }
  
  span:last-child {
    color: #495057;
    font-size: 14px;
  }
}

.permission-status {
  text-align: center;
  margin-bottom: 20px;
  
  .status-badge {
    display: inline-block;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;
    
    &.granted {
      background: #d4edda;
      color: #155724;
    }
    
    &.denied {
      background: #f8d7da;
      color: #721c24;
    }
    
    &.prompt {
      background: #fff3cd;
      color: #856404;
    }
  }
}

.allow-btn {
  width: 100%;
  padding: 16px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
}

.spinner-small {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.guard-error {
  margin-top: 20px;
  padding: 16px;
  background: #fff3cd;
  border: 2px solid #ffc107;
  border-radius: 8px;
  
  strong {
    display: block;
    color: #856404;
    margin-bottom: 12px;
  }
  
  .error-steps {
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
    
    ol {
      margin: 0;
      padding-left: 20px;
      
      li {
        color: #6c757d;
        font-size: 13px;
        margin-bottom: 6px;
        line-height: 1.5;
      }
    }
  }
}

.privacy-note {
  margin-top: 24px;
  padding: 16px;
  background: #e8f4f8;
  border-radius: 8px;
  
  p {
    margin: 0;
    font-size: 13px;
    color: #495057;
    line-height: 1.6;
  }
}

.skip-btn {
  width: 100%;
  padding: 12px;
  margin-top: 16px;
  background: transparent;
  color: #6c757d;
  border: 2px solid #dee2e6;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: #f8f9fa;
    border-color: #adb5bd;
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(50px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
