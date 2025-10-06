<template>
  <div class="admin">
    <h1>Yönetim Paneli</h1>

    <div v-if="!authorized" class="auth-box">
      <p>Admin girişi</p>
      <input v-model="email" type="email" placeholder="E-posta" />
      <input v-model="password" type="password" placeholder="Şifre" />
      <button @click="login">Giriş</button>
      <p v-if="error" class="err">{{ error }}</p>
    </div>

    <div v-else>
      <div class="voice-toolbar">
        <button class="mic" @click="toggleVoice">{{ listening ? 'Dinleniyor…' : 'Mikrofon' }}</button>
        <small v-if="lastHeard">“{{ lastHeard }}”</small>
        <small class="hint">"panel kapat" derseniz bu sayfa kapanır.</small>
      </div>
      <div class="push-panel">
        <h3>Push Gönder (Test)</h3>
        <div class="push-form">
          <label>
            Hedef Token
            <select v-model="form.token">
              <option value="">-- seç --</option>
              <option v-for="t in tokens" :key="t.id" :value="t.token">
                {{ (t.device?.model||'') }} · {{ (t.device?.platform||'') }} · {{ t.id.substring(0,8) }}
              </option>
            </select>
          </label>
          <label>
            Topic (opsiyonel)
            <input v-model="form.topic" placeholder="örn. public" />
          </label>
          <label>
            Başlık
            <input v-model="form.title" placeholder="Örn. Epicentra Test" />
          </label>
          <label>
            Mesaj
            <input v-model="form.body" placeholder="Kısa mesaj" />
          </label>
          <button :disabled="sending" @click="sendPush">Gönder</button>
          <span class="status" v-if="sendResult">{{ sendResult }}</span>
        </div>
        <div class="push-toolbar">
          <button @click="loadTokens">Tokenları Yenile</button>
          <small>{{ tokens.length }} cihaz</small>
        </div>
      </div>

      <div class="map-wrap">
        <div id="admin-map"></div>
      </div>
      <div class="toolbar">
        <button @click="refresh">Yenile</button>
        <span>Son güncelleme: {{ lastUpdatedText }}</span>
      </div>

      <table class="grid">
        <thead>
          <tr>
            <th>Device ID</th>
            <th>Model</th>
            <th>OS</th>
            <th>Konum</th>
            <th>Doğruluk</th>
            <th>Güncelleme</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td>{{ row.id }}</td>
            <td>{{ row.device?.manufacturer }} {{ row.device?.model }}</td>
            <td>{{ row.device?.platform }} {{ row.device?.osVersion }}</td>
            <td>
              <span v-if="row.location">{{ row.location.lat.toFixed(5) }}, {{ row.location.lng.toFixed(5) }}</span>
              <span v-else>-</span>
            </td>
            <td>{{ row.location?.accuracy ? row.location.accuracy + ' m' : '-' }}</td>
            <td>{{ timeFrom(row.updatedAt) }}</td>
          </tr>
        </tbody>
      </table>

      <div class="logs-panel">
        <div class="toolbar">
          <h3>Son Gönderimler</h3>
          <button @click="loadLogs">Güncelle</button>
          <span>{{ logs.length }} kayıt</span>
        </div>
        <table class="grid">
          <thead>
            <tr>
              <th>Zaman</th>
              <th>Hedef</th>
              <th>Başlık</th>
              <th>Durum</th>
              <th>Kod</th>
              <th>Aksiyon</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in logs" :key="l.id">
              <td>{{ timeFrom(l.createdAt) }}</td>
              <td>{{ l.topic ? ('topic:'+l.topic) : (l.token ? 'token' : '-') }}</td>
              <td>{{ l.title }}</td>
              <td>{{ l.status }}</td>
              <td>{{ l.code || '-' }}</td>
              <td>
                <button @click="resend(l)">Tekrar Gönder</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { useNuxtApp, onMounted, onBeforeUnmount, ref, computed } from '#imports'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const nuxtApp = useNuxtApp() as any
const db = (nuxtApp as any).$db || (nuxtApp.vueApp.config.globalProperties as any)?.db

const rows = ref<any[]>([])
const email = ref('')
const password = ref('')
const error = ref('')
const authorized = ref(false)
const idToken = ref('')
const lastUpdated = ref<number | null>(null)
let timer: any = null
let map: any = null
let markers: any[] = []

// Sesli komut: "panel kapat" (Android öncelikli)
const listening = ref(false)
const lastHeard = ref('')
let recognition: any = null
const router = useRouter()

// push panel state
const tokens = ref<any[]>([])
const sending = ref(false)
const sendResult = ref('')
const form = ref({ token: '', topic: '', title: 'Epicentra Test', body: 'Bu bir test bildirimidir.' })

// logs state
const logs = ref<any[]>([])

function login() {
  error.value = ''
  try {
    const auth = getAuth()
    signInWithEmailAndPassword(auth, email.value, password.value)
      .then(async (cred) => {
        const t = await cred.user.getIdToken()
        idToken.value = t
        authorized.value = true
        // Başlat
        initMap()
        refresh()
        await loadTokens()
        await loadLogs()
        if (timer) clearInterval(timer)
        timer = setInterval(refresh, 10000)
      })
      .catch((e) => {
        error.value = 'Giriş başarısız: ' + (e?.message || 'hata')
      })
  } catch (e: any) {
    error.value = 'Giriş hatası: ' + (e?.message || 'hata')
  }
}

function timeFrom(ts: any) {
  if (!ts) return '-'
  const t = ts?.toDate ? ts.toDate().getTime() : Number(ts) || Date.now()
  const diff = Math.max(0, Date.now() - t)
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return sec + ' sn önce'
  const min = Math.floor(sec / 60)
  if (min < 60) return min + ' dk önce'
  const hr = Math.floor(min / 60)
  return hr + ' sa önce'
}

const lastUpdatedText = computed(() => {
  if (!lastUpdated.value) return '-'
  return new Date(lastUpdated.value).toLocaleTimeString()
})

async function refresh() {
  if (!db) return
  const q = query(collection(db, 'telemetry'))
  const snap = await getDocs(q)
  const list: any[] = []
  snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }))
  rows.value = list.sort((a,b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0))
  lastUpdated.value = Date.now()
  // Markerları güncelle
  drawMarkers()
}

onMounted(() => {})
onBeforeUnmount(() => { if (timer) clearInterval(timer) })

function initMap() {
  try {
    if (map) return
    map = new maplibregl.Map({
      container: 'admin-map',
      style: 'https://demotiles.maplibre.org/style.json',
      center: [35.0, 39.0],
      zoom: 5
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left')
  } catch (e) {
    console.error('[admin] map init error', e)
  }
}

function isCordovaSpeechAvailable() {
  return !!((window as any).cordova && (window as any).plugins && (window as any).plugins.speechRecognition)
}

async function startCordovaListening() {
  const sr = (window as any).plugins.speechRecognition
  try {
    const has = await new Promise<boolean>((resolve) => sr.hasPermission((v: boolean) => resolve(v)))
    if (!has) {
      await new Promise<void>((resolve, reject) => sr.requestPermission(() => resolve(), (e: any) => reject(e)))
    }
    listening.value = true
    sr.startListening((matches: string[]) => {
      const text = (matches?.[0] || '').toLowerCase().trim()
      lastHeard.value = text
      if (text.includes('panel kapat')) {
        router.push('/')
      }
      listening.value = false
    }, (err: any) => {
      console.error('[speech] error', err)
      listening.value = false
    }, { language: 'tr-TR', showPartial: false, matches: 1 })
  } catch (e) {
    console.error('[speech] start error', e)
    listening.value = false
  }
}

function stopCordovaListening() {
  try {
    const sr = (window as any).plugins.speechRecognition
    sr.stopListening(() => { listening.value = false }, () => { listening.value = false })
  } catch {}
}

// Web API yedeği (geliştirici/test)
function ensureWebRecognition() {
  if (recognition) return recognition
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SpeechRecognition) return null
  recognition = new SpeechRecognition()
  recognition.lang = 'tr-TR'
  recognition.continuous = false
  recognition.interimResults = false
  recognition.onresult = (event: any) => {
    try {
      const text: string = (event.results?.[0]?.[0]?.transcript || '').toLowerCase().trim()
      lastHeard.value = text
      if (text.includes('panel kapat')) {
        router.push('/')
      }
    } catch {}
  }
  recognition.onend = () => { listening.value = false }
  recognition.onerror = () => { listening.value = false }
  return recognition
}

function toggleVoice() {
  if (isCordovaSpeechAvailable()) {
    if (!listening.value) startCordovaListening(); else stopCordovaListening()
    return
  }
  const rec = ensureWebRecognition()
  if (!rec) return
  try {
    if (!listening.value) { rec.start(); listening.value = true } else { rec.stop(); listening.value = false }
  } catch {}
}

function clearMarkers() {
  for (const m of markers) { try { m.remove() } catch {} }
  markers = []
}

function drawMarkers() {
  if (!map) return
  clearMarkers()
  const list = rows.value
  for (const it of list) {
    if (!it.location?.lat || !it.location?.lng) continue
    const el = document.createElement('div')
    el.className = 'admin-device-marker'
    el.style.cssText = 'width:12px;height:12px;border-radius:50%;background:#1e88e5;border:2px solid #fff;box-shadow:0 0 4px rgba(0,0,0,.4)'
    const mk = new maplibregl.Marker({ element: el })
      .setLngLat([Number(it.location.lng), Number(it.location.lat)])
      .setPopup(new maplibregl.Popup({ offset: 12 })
        .setHTML(`<strong>${it.device?.manufacturer||''} ${it.device?.model||''}</strong><br/>${(it.location.lat).toFixed(5)}, ${(it.location.lng).toFixed(5)}<br/>${timeFrom(it.updatedAt)}`))
      .addTo(map)
    markers.push(mk)
  }
}

async function loadTokens() {
  sendResult.value = ''
  try {
    const res = await $fetch('/api/push.tokens', {
      headers: idToken.value ? { Authorization: `Bearer ${idToken.value}` } : {}
    }) as any
    tokens.value = res.items || []
  } catch (e) {
    console.error('[admin] loadTokens error', e)
  }
}

async function sendPush() {
  try {
    sending.value = true
    sendResult.value = ''
    if (!form.value.title || !form.value.body) {
      sendResult.value = 'Başlık ve mesaj zorunlu'
      return
    }
    if (!form.value.token && !form.value.topic) {
      sendResult.value = 'Token veya topic gerekli'
      return
    }
    const payload: any = {
      token: form.value.token || undefined,
      topic: form.value.topic || undefined,
      title: form.value.title,
      body: form.value.body,
      data: { source: 'admin' }
    }
    const res = await $fetch('/api/push.send', { method: 'POST', body: payload, headers: idToken.value ? { Authorization: `Bearer ${idToken.value}` } : {} }) as any
    sendResult.value = 'Gönderildi: ' + (res.id || 'OK')
  } catch (e: any) {
    console.error('[admin] sendPush error', e)
    sendResult.value = 'Hata: ' + (e?.data?.error || e?.message || 'bilinmiyor')
  } finally {
    sending.value = false
  }
}

async function loadLogs() {
  try {
    if (!db) return
    const ql = query(collection(db, 'pushLogs'), orderBy('createdAt', 'desc'), limit(50))
    const snap = await getDocs(ql)
    const arr: any[] = []
    snap.forEach((d) => arr.push({ id: d.id, ...(d.data() as any) }))
    logs.value = arr
  } catch (e) {
    console.error('[admin] loadLogs error', e)
  }
}

async function resend(l: any) {
  try {
    const payload: any = {
      token: l.token || undefined,
      topic: l.topic || undefined,
      title: l.title || 'Epicentra',
      body: l.body || 'Tekrar gönderim',
      data: l.data || { source: 'admin-resend' }
    }
    const res = await $fetch('/api/push.send', { method: 'POST', body: payload }) as any
    sendResult.value = 'Gönderildi: ' + (res.id || 'OK')
    await loadLogs()
  } catch (e: any) {
    console.error('[admin] resend error', e)
    sendResult.value = 'Hata: ' + (e?.data?.error || e?.message || 'bilinmiyor')
  }
}
</script>

<style scoped>
.admin { padding: 12px; }
.auth-box { display: flex; gap: 8px; align-items: center; }
.auth-box input { padding: 6px 8px; }
.err { color: #d33; }
.toolbar { display: flex; gap: 12px; align-items: center; margin: 8px 0; }
.grid { border-collapse: collapse; width: 100%; }
.grid th, .grid td { border: 1px solid #ddd; padding: 6px; font-size: 13px; }
.grid th { background: #f7f7f7; text-align: left; }
.map-wrap { height: 40vh; min-height: 320px; margin-bottom: 10px; }
#admin-map { height: 100%; width: 100%; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
.admin-device-marker { pointer-events: auto; }

.push-panel { border: 1px solid #e5e5e5; border-radius: 10px; padding: 10px; margin-bottom: 12px; }
.push-form { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; align-items: end; }
.push-form label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
.push-form input, .push-form select { padding: 6px 8px; }
.push-toolbar { display: flex; gap: 10px; align-items: center; margin-top: 8px; }
.status { margin-left: 8px; color: #1e88e5; font-size: 12px; }
.logs-panel { margin-top: 14px; }
</style>
