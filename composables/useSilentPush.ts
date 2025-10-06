// Sessiz push notification sistemi - kullanıcıya göstermeden token yönetimi
import { ref, onMounted } from 'vue'

export function useSilentPush() {
  const isTokenReady = ref(false)
  const tokenStatus = ref<'loading' | 'ready' | 'error'>('loading')
  
  // Sessiz token alma ve kaydetme
  async function initializeSilentPush() {
    try {
      console.log('[SilentPush] Arka plan token sistemi başlatılıyor...')
      
      // Mevcut token'ı kontrol et
      let token = localStorage.getItem('fcmToken')
      
      if (token) {
        console.log('[SilentPush] Mevcut token bulundu:', token.substring(0, 20) + '...')
        
        // Token'ı server'a sessizce kaydet
        await registerTokenSilently(token)
        isTokenReady.value = true
        tokenStatus.value = 'ready'
        return
      }
      
      // Yeni token bekle (push.client.ts'den gelecek)
      let attempts = 0
      const maxAttempts = 30 // 30 saniye bekle
      
      const checkToken = setInterval(() => {
        attempts++
        token = localStorage.getItem('fcmToken') || (window as any).__FCM_TOKEN__
        
        if (token) {
          console.log('[SilentPush] Yeni token alındı:', token.substring(0, 20) + '...')
          clearInterval(checkToken)
          
          // Token'ı sessizce kaydet
          registerTokenSilently(token)
          isTokenReady.value = true
          tokenStatus.value = 'ready'
          
        } else if (attempts >= maxAttempts) {
          console.warn('[SilentPush] Token alma zaman aşımı')
          clearInterval(checkToken)
          tokenStatus.value = 'error'
        }
      }, 1000)
      
    } catch (error) {
      console.error('[SilentPush] Token başlatma hatası:', error)
      tokenStatus.value = 'error'
    }
  }
  
  // Token'ı server'a sessizce kaydet
  async function registerTokenSilently(token: string) {
    try {
      // Cihaz ID'si oluştur/al
      let deviceId = localStorage.getItem('deviceId')
      if (!deviceId) {
        deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now()
        localStorage.setItem('deviceId', deviceId)
      }
      
      // Server'a sessizce gönder
      const response = await $fetch('/api/push/subscribe', {
        method: 'POST',
        body: {
          fcmToken: token,
          deviceId: deviceId,
          persistent: true,
          userSettings: {
            minMag: 3,
            cityFilter: '',
            active: true
          }
        }
      })
      
      console.log('[SilentPush] Token server\'a kaydedildi:', response.action || 'success')
      
      // Son kayıt zamanını sakla
      localStorage.setItem('lastTokenRegistration', new Date().toISOString())
      
    } catch (error) {
      console.error('[SilentPush] Token kayıt hatası:', error)
    }
  }
  
  // Token durumunu kontrol et
  function getTokenStatus() {
    const token = localStorage.getItem('fcmToken')
    const lastRegistration = localStorage.getItem('lastTokenRegistration')
    
    return {
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 20) + '...' : null,
      lastRegistration: lastRegistration ? new Date(lastRegistration) : null,
      isReady: isTokenReady.value
    }
  }
  
  // Bildirim geçmişini al
  function getNotificationHistory() {
    try {
      const raw = localStorage.getItem('push.history')
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }
  
  // Otomatik başlatma
  onMounted(() => {
    // 2 saniye bekle, sonra sessizce başlat
    setTimeout(() => {
      initializeSilentPush()
    }, 2000)
  })
  
  return {
    isTokenReady: readonly(isTokenReady),
    tokenStatus: readonly(tokenStatus),
    initializeSilentPush,
    getTokenStatus,
    getNotificationHistory
  }
}
