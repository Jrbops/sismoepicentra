// Native Push Notifications (FCM) registration and token save
import { defineNuxtPlugin, useNuxtApp } from '#app'
import { PushNotifications } from '@capacitor/push-notifications'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { Device } from '@capacitor/device'
import { getAuth, onAuthStateChanged } from 'firebase/auth'

export default defineNuxtPlugin(() => {
  if (!process.client) return
  const nuxtApp = useNuxtApp() as any
  let db = (nuxtApp as any).$db || (nuxtApp.vueApp.config.globalProperties as any)?.db

  const register = async () => {
    try {
      console.log('[push] Token kayıt süreci başlıyor...')
      
      // İzin iste
      const perm = await PushNotifications.requestPermissions()
      console.log('[push] İzin durumu:', perm.receive)
      
      if (perm.receive === 'granted') {
        console.log('[push] İzin verildi, FCM kaydı yapılıyor...')
        await PushNotifications.register()
      } else if (perm.receive === 'prompt') {
        console.log('[push] İzin isteniyor...')
        await PushNotifications.register()
      } else {
        console.warn('[push] İzin reddedildi ama yine de deneniyor...')
        await PushNotifications.register()
      }
    } catch (e) {
      console.warn('[push] Register hatası:', e)
      // Hata olsa bile tekrar dene
      setTimeout(() => {
        console.log('[push] Hata sonrası tekrar deneniyor...')
        PushNotifications.register().catch(console.warn)
      }, 2000)
    }
  }

  PushNotifications.addListener('registration', async (token) => {
    try {
      console.log('[push] *** FCM TOKEN REGISTRATION EVENT ***')
      console.log('[push] Raw token object:', token)
      
      const idRes = await Device.getId()
      const info = await Device.getInfo()
      const tokenVal = (token as any).value || (token as any).token
      
      console.log('[push] YENİ TOKEN ALINDI (TAM):', tokenVal)
      console.log('[push] Token uzunluğu:', tokenVal ? tokenVal.length : 'null')
      console.log('[push] Cihaz ID:', idRes.identifier)
      
      // Önce localStorage'a kaydet
      localStorage.setItem('fcmToken', tokenVal)
      localStorage.setItem('deviceId', idRes.identifier)
      localStorage.setItem('fcmTokenDate', new Date().toISOString())
      
      // Token'ı alert ile göster ve console'a yazdır
      alert(`FCM Token: ${tokenVal}`)
      console.log('FULL FCM TOKEN:', tokenVal)
      
      // Debug sayfasına yönlendir
      setTimeout(() => {
        window.location.href = `/debug?token=${encodeURIComponent(tokenVal)}&deviceId=${encodeURIComponent(idRes.identifier)}`
      }, 3000)
      
      // Server'a direkt gönder (Firestore bağımsız)
      try {
        console.log('[push] Server\'a gönderiliyor...')
        // Development için PC IP kullan
        const apiBase = 'http://192.168.1.251:3000' // PC IP adresi
        const response = await fetch(`${apiBase}/api/push/subscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fcmToken: tokenVal,
            deviceId: idRes.identifier,
            persistent: true,
            userSettings: {
              minMag: 3,
              cityFilter: '',
              active: true
            },
            deviceInfo: {
              model: info.model,
              platform: info.platform,
              osVersion: info.osVersion,
            }
          })
        })
        
        if (response.ok) {
          const result = await response.json()
          console.log('[push] ✅ SERVER KAYIT BAŞARILI:', result.action || 'success')
        } else {
          console.error('[push] ❌ Server kayıt hatası:', response.status, response.statusText)
          // Server hatası olsa bile Firestore'a kaydet
          console.log('[push] Firestore\'a yedek kayıt yapılacak...')
        }
        
      } catch (serverError) {
        console.error('[push] ❌ Server bağlantı hatası:', serverError)
        console.log('[push] Firestore\'a yedek kayıt yapılacak...')
      }
      
      // Doğrudan Firestore kayıt sistemi (her durumda çalışır)
      try {
        console.log('[push] Doğrudan Firestore kayıt sistemi başlatılıyor...')
        
        // Basit Firestore kayıt (composable olmadan)
        const { $db } = nuxtApp
        
        if ($db) {
          const ref = doc($db, 'pushTokens', idRes.identifier)
          await setDoc(ref, {
            token: tokenVal,
            deviceId: idRes.identifier,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            active: true,
            persistent: true,
            source: 'direct_client_plugin',
            deviceInfo: {
              model: info.model,
              platform: info.platform,
              osVersion: info.osVersion,
            },
            userSettings: {
              minMag: 3,
              cityFilter: '',
              active: true
            }
          }, { merge: true })
          
          console.log('[push] ✅ FIRESTORE DOĞRUDAN KAYIT BAŞARILI!')
          
        } else {
          console.error('[push] ❌ Firestore bağlantısı yok!')
        }
        
      } catch (firestoreError) {
        console.error('[push] ❌ Firestore doğrudan kayıt hatası:', firestoreError)
      }
      
      // Global değişkene de kaydet
      ;(window as any).__FCM_TOKEN__ = tokenVal
    } catch (e) {
      console.warn('[push] save token failed', e)
    }
  })

  // errors
  PushNotifications.addListener('registrationError', (err) => {
    console.warn('[push] registration error', err)
  })

  // incoming notifications (foreground) - Sessiz işleme
  PushNotifications.addListener('pushNotificationReceived', (notif: any) => {
    try {
      console.log('[push] Bildirim sessizce alındı:', notif?.title || 'Başlık yok')
      
      // Bildirim geçmişine kaydet (max 50)
      const rec = {
        id: String(notif?.id || Date.now()),
        title: notif?.title || notif?.notification?.title || '',
        body: notif?.body || notif?.notification?.body || '',
        data: notif?.data || {},
        ts: Date.now(),
      }
      const raw = localStorage.getItem('push.history')
      const arr = raw ? JSON.parse(raw) : []
      arr.unshift(rec)
      while (arr.length > 50) arr.pop()
      localStorage.setItem('push.history', JSON.stringify(arr))
      
      // Deprem bildirimi ise özel işlem
      if (notif?.data?.type === 'earthquake_alert' || notif?.title?.includes('Deprem')) {
        console.log('[push] Deprem bildirimi işlendi:', notif?.data?.magnitude || 'Bilinmiyor')
      }
      
    } catch (e) {
      console.error('[push] Bildirim işleme hatası:', e)
    }
  })

  // Auth'a bakmadan direkt register et - Arka plan token sistemi
  try {
    console.log('[push] Arka plan token sistemi başlatılıyor...')
    
    // Hemen başlat
    setTimeout(() => {
      console.log('[push] Token kaydı başlatılıyor (auth bağımsız)')
      register()
    }, 1000)
    
    // Yedek olarak 3 saniye sonra tekrar dene
    setTimeout(() => {
      console.log('[push] Yedek token kaydı deneniyor')
      register()
    }, 3000)
    
    // Son çare 10 saniye sonra
    setTimeout(() => {
      console.log('[push] Son çare token kaydı')
      register()
    }, 10000)
    
  } catch (e) {
    console.warn('[push] Arka plan token sistemi hatası:', e)
    // Hata olsa bile dene
    setTimeout(register, 2000)
  }
})
