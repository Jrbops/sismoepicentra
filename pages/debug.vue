<template>
  <div class="debug-page">
    <h1>Debug Bilgileri</h1>
    
    <div class="info-section">
      <h2>FCM Token</h2>
      <textarea v-model="fcmToken" readonly rows="6" cols="80" style="font-size: 10px; word-break: break-all;"></textarea>
      <button @click="copyToken">Token'ı Kopyala</button>
      <p><strong>Token Uzunluğu:</strong> {{ fcmToken.length }}</p>
    </div>
    <div class="info-section">
      <h2>Device ID</h2>
      <p>{{deviceId }}</p>
    </div>
    
    <div class="token-display" style="word-break: break-all; white-space: pre-wrap; font-size: 12px;">
    {{ fcmToken }}
      <p v-if="testResult">{{ testResult }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const fcmToken = ref('')
const deviceId = ref('')
const tokenDate = ref('')
const testResult = ref('')

onMounted(() => {
  // URL'den token'ı al
  const urlParams = new URLSearchParams(window.location.search)
  const urlToken = urlParams.get('token')
  const urlDeviceId = urlParams.get('deviceId')
  
  fcmToken.value = urlToken || localStorage.getItem('fcmToken') || 'Token bulunamadı'
  deviceId.value = urlDeviceId || localStorage.getItem('deviceId') || 'Device ID bulunamadı'
  tokenDate.value = localStorage.getItem('fcmTokenDate') || 'Tarih bulunamadı'
  
  // URL'den gelen token'ı localStorage'a da kaydet
  if (urlToken) {
    localStorage.setItem('fcmToken', urlToken)
  }
  if (urlDeviceId) {
    localStorage.setItem('deviceId', urlDeviceId)
  }
})

const copyToken = () => {
  navigator.clipboard.writeText(fcmToken.value)
  alert('Token kopyalandı!')
}

const sendTestNotification = async () => {
  try {
    const apiBase = 'http://192.168.1.251:3000' // PC IP adresi
    const response = await fetch(`${apiBase}/api/push/test-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        magnitude: 6.0,
        city: 'Debug Test',
        district: 'Test',
        depth: 10
      })
    })
    const result = await response.json()
    testResult.value = 'Test bildirimi gönderildi: ' + JSON.stringify(result)
  } catch (error) {
    testResult.value = 'Hata: ' + error.message
  }
}
</script>

<style scoped>
.debug-page {
  padding: 20px;
  font-family: monospace;
}

.info-section {
  margin: 20px 0;
  padding: 15px;
  border: 1px solid #ccc;
  border-radius: 5px;
}

textarea {
  width: 100%;
  font-family: monospace;
  font-size: 12px;
}

button {
  padding: 10px 15px;
  margin: 10px 5px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

button:hover {
  background: #0056b3;
}
</style>
