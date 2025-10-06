// Push Notification Test Script
const fetch = require('node-fetch');

async function testPushNotification() {
  console.log('🔔 Push Notification Test Başlatılıyor...\n');
  
  try {
    // 1. Test bildirimi gönder
    console.log('1️⃣ Test bildirimi gönderiliyor...');
    const testResponse = await fetch('http://localhost:3001/api/push/test-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        magnitude: 4.2,
        city: 'İstanbul',
        district: 'Kadıköy',
        depth: 8.5
      })
    });
    
    const testResult = await testResponse.json();
    console.log('✅ Test bildirimi sonucu:', testResult);
    
    // 2. FCM token'ları kontrol et
    console.log('\n2️⃣ FCM token\'ları kontrol ediliyor...');
    const tokensResponse = await fetch('http://localhost:3001/api/push.tokens');
    const tokensResult = await tokensResponse.json();
    console.log('📱 Kayıtlı token sayısı:', tokensResult.items?.length || 0);
    
    if (tokensResult.items?.length > 0) {
      console.log('🔑 İlk token:', tokensResult.items[0].token?.substring(0, 30) + '...');
    }
    
    // 3. VAPID public key kontrol et
    console.log('\n3️⃣ VAPID public key kontrol ediliyor...');
    const vapidResponse = await fetch('http://localhost:3001/api/push/vapid-public-key');
    const vapidResult = await vapidResponse.json();
    console.log('🔐 VAPID key mevcut:', !!vapidResult.publicKey);
    
    // 4. Topic subscription test et
    console.log('\n4️⃣ Topic subscription test ediliyor...');
    const topicResponse = await fetch('http://localhost:3001/api/push.topic.subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: 'test-token-123',
        topic: 'public'
      })
    });
    
    const topicResult = await topicResponse.json();
    console.log('📢 Topic subscription sonucu:', topicResult);
    
    console.log('\n🎉 Push notification test tamamlandı!');
    
  } catch (error) {
    console.error('❌ Test hatası:', error.message);
  }
}

// Test'i çalıştır
testPushNotification();
