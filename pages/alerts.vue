<template>
  <div class="alerts">
    <h2>Bildirim Geçmişi</h2>
    <div class="toolbar">
      <button @click="refresh">Yenile</button>
      <button @click="clearAll">Temizle</button>
      <span>{{ items.length }} kayıt</span>
    </div>

    <table v-if="items.length" class="grid">
      <thead>
        <tr>
          <th>Zaman</th>
          <th>Başlık</th>
          <th>Mesaj</th>
          <th>Data</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="it in items" :key="it.id">
          <td>{{ timeFrom(it.ts) }}</td>
          <td>{{ it.title }}</td>
          <td>{{ it.body }}</td>
          <td><pre class="data">{{ pretty(it.data) }}</pre></td>
        </tr>
      </tbody>
    </table>

    <p v-else class="empty">Henüz bir bildirim geçmişi bulunamadı.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from '#imports'

const items = ref<any[]>([])

function load() {
  try {
    const raw = localStorage.getItem('push.history')
    const arr = raw ? JSON.parse(raw) : []
    items.value = arr
  } catch {
    items.value = []
  }
}

function refresh() { load() }
function clearAll() { localStorage.removeItem('push.history'); load() }

function timeFrom(ts: number) {
  if (!ts) return '-'
  const diff = Math.max(0, Date.now() - Number(ts))
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return sec + ' sn önce'
  const min = Math.floor(sec / 60)
  if (min < 60) return min + ' dk önce'
  const hr = Math.floor(min / 60)
  return hr + ' sa önce'
}

function pretty(d: any) {
  try { return JSON.stringify(d || {}, null, 0) } catch { return '' }
}

onMounted(load)
</script>

<style scoped>
.alerts { padding: 12px; }
.toolbar { display: flex; gap: 10px; align-items: center; margin: 8px 0 12px; }
.grid { border-collapse: collapse; width: 100%; }
.grid th, .grid td { border: 1px solid #ddd; padding: 8px; font-size: 13px; vertical-align: top; }
.grid th { background: #f7f7f7; text-align: left; }
.data { margin: 0; white-space: pre-wrap; word-break: break-word; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
.empty { color: #666; }
</style>
