// Doğrudan Firestore'a token kaydetme sistemi
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

export function useDirectFirestore() {
  
  // Token'ı doğrudan Firestore'a kaydet
  async function saveTokenDirectly(tokenData: {
    token: string
    deviceId: string
    deviceInfo?: any
    userSettings?: any
  }) {
    try {
      console.log('[firestore] Doğrudan Firestore\'a kaydediliyor...')
      
      const { $db } = useNuxtApp()
      
      if (!$db) {
        console.error('[firestore] Database bağlantısı yok!')
        return false
      }
      
      const tokenRef = doc($db, 'pushTokens', tokenData.deviceId)
      
      await setDoc(tokenRef, {
        token: tokenData.token,
        deviceId: tokenData.deviceId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        active: true,
        persistent: true,
        source: 'direct_firestore',
        userSettings: tokenData.userSettings || {
          minMag: 3,
          cityFilter: '',
          active: true
        },
        deviceInfo: tokenData.deviceInfo || {}
      }, { merge: true })
      
      console.log('[firestore] ✅ Token başarıyla kaydedildi!')
      return true
      
    } catch (error) {
      console.error('[firestore] ❌ Kayıt hatası:', error)
      return false
    }
  }
  
  // Token durumunu kontrol et
  async function checkTokenExists(deviceId: string) {
    try {
      const { $db } = useNuxtApp()
      if (!$db) return false
      
      const tokenRef = doc($db, 'pushTokens', deviceId)
      const { getDoc } = await import('firebase/firestore')
      const tokenDoc = await getDoc(tokenRef)
      
      return tokenDoc.exists()
      
    } catch (error) {
      console.error('[firestore] Token kontrol hatası:', error)
      return false
    }
  }
  
  return {
    saveTokenDirectly,
    checkTokenExists
  }
}
