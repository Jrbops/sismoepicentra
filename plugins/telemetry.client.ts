// Telemetry: send device + optional location to Firestore every 10s
import { defineNuxtPlugin, useNuxtApp } from '#app'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { Device } from '@capacitor/device'
import { Geolocation } from '@capacitor/geolocation'

let intervalId: any = null

async function getSnapshot() {
  const info = await Device.getInfo()
  const idRes = await Device.getId()
  const deviceId = idRes.identifier

  let coords: any = null
  try {
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 0,
    })
    coords = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    }
  } catch {
    // permission denied or timeout -> skip location
  }

  return { deviceId, info, coords }
}

export default defineNuxtPlugin(() => {
  const nuxtApp = useNuxtApp()
  const db = (nuxtApp as any).$db || (nuxtApp.vueApp.config.globalProperties as any)?.db
  if (!db) {
    console.warn('[telemetry] Firestore not available')
    return
  }

  const pushOnce = async () => {
    try {
      const snap = await getSnapshot()
      const ref = doc(db, 'telemetry', snap.deviceId)
      await setDoc(ref, {
        device: {
          model: snap.info.model,
          platform: snap.info.platform,
          osVersion: snap.info.osVersion,
          manufacturer: snap.info.manufacturer,
        },
        location: snap.coords || null,
        updatedAt: serverTimestamp(),
      }, { merge: true })
    } catch (e) {
      console.error('[telemetry] push error', e)
    }
  }

  // initial push after mount
  setTimeout(() => { pushOnce() }, 1200)

  // periodic push
  if (intervalId) clearInterval(intervalId)
  intervalId = setInterval(() => { pushOnce() }, 10000)
})
