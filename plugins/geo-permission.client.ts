// Request native geolocation permission at app start
import { defineNuxtPlugin } from '#app'
import { Geolocation } from '@capacitor/geolocation'

export default defineNuxtPlugin(() => {
  // Fire and forget on mount
  if (process.client) {
    setTimeout(async () => {
      try {
        const status = await Geolocation.checkPermissions()
        if (status.location !== 'granted') {
          await Geolocation.requestPermissions()
        }
      } catch (e) {
        console.warn('[geo-permission] request failed', e)
      }
    }, 800)
  }
})
