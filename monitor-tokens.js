const admin = require('firebase-admin');
const serviceAccount = require('./epicentraio-firebase-adminsdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const db = admin.firestore();

let lastTokenCount = 0;
let lastCheck = new Date();

async function monitorTokens() {
  try {
    const tokensSnapshot = await db.collection('pushTokens').get();
    const currentCount = tokensSnapshot.size;
    const now = new Date();
    
    console.log(`[${now.toLocaleTimeString('tr-TR')}] Token sayısı: ${currentCount}`);
    
    if (currentCount !== lastTokenCount) {
      console.log('🔔 TOKEN DEĞİŞİKLİĞİ!');
      console.log(`📊 ${lastTokenCount} → ${currentCount}`);
      
      if (currentCount > lastTokenCount) {
        console.log('🎊 YENİ TOKEN(LAR) GELDİ!');
        
        // Yeni token'ları göster
        const newTokens = [];
        tokensSnapshot.forEach(doc => {
          const data = doc.data();
          const createdDate = data.createdAt ? data.createdAt.toDate() : new Date(0);
          
          // Son 1 dakikada oluşturulan token'lar
          if (createdDate > new Date(Date.now() - 60000)) {
            newTokens.push({
              deviceId: data.deviceId,
              token: data.token ? data.token.substring(0, 25) + '...' : 'Yok',
              source: data.source,
              createdAt: createdDate
            });
          }
        });
        
        if (newTokens.length > 0) {
          console.log('📱 YENİ TOKEN DETAYLARI:');
          newTokens.forEach((token, index) => {
            console.log(`${index + 1}. Cihaz: ${token.deviceId}`);
            console.log(`   Token: ${token.token}`);
            console.log(`   Kaynak: ${token.source}`);
            console.log(`   Tarih: ${token.createdAt.toLocaleString('tr-TR')}`);
            console.log('   ---');
          });
        }
      }
      
      lastTokenCount = currentCount;
    }
    
    // Her 5 dakikada bir özet göster
    if (now - lastCheck > 5 * 60 * 1000) {
      console.log('\n📈 5 DAKİKALIK ÖZET:');
      console.log(`📊 Toplam token: ${currentCount}`);
      
      if (currentCount > 0) {
        console.log('📱 KAYITLI CİHAZLAR:');
        tokensSnapshot.forEach((doc, index) => {
          const data = doc.data();
          const createdDate = data.createdAt ? data.createdAt.toDate() : new Date();
          const minutesAgo = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60));
          
          console.log(`${index + 1}. ${data.deviceId || 'Bilinmiyor'}`);
          console.log(`   Kaynak: ${data.source || 'Manuel'}`);
          console.log(`   Süre: ${minutesAgo} dakika önce`);
        });
      }
      
      console.log('=' .repeat(50));
      lastCheck = now;
    }
    
  } catch (error) {
    console.error('❌ İzleme hatası:', error.message);
  }
}

console.log('👀 TOKEN İZLEME SİSTEMİ BAŞLATILDI');
console.log('📱 Cihazlar token aldığında otomatik bildirilecek');
console.log('⏰ Her 10 saniyede kontrol ediliyor...');
console.log('🛑 Durdurmak için Ctrl+C');
console.log('=' .repeat(50));

// İlk kontrol
monitorTokens();

// Her 10 saniyede kontrol et
setInterval(monitorTokens, 10000);
