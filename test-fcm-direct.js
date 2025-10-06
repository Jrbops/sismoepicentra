const admin = require('firebase-admin');
const serviceAccount = require('./epicentraio-firebase-adminsdk.json');

// Eğer zaten initialize edilmişse, yeniden initialize etme
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'epicentra-new'
  });
} else {
  admin.app(); // Mevcut app'i kullan
}

const messaging = admin.messaging();

// Test token (TAM FCM TOKEN - epicentra-new)
const testToken = 'cLMDg-CoRuG_0yXs5OUjE8:APA91bFahCGCGtteKDyf18XGrXWozHcCaPy_4U_btOltxdO5U8T4m-LjyfC708h7TGecZ6PeA9BwEOcy0yUIMCRfFDhczXYTffqBsW-VeCH63RCMI_D4Hfo'.trim();

console.log('Token uzunluğu:', testToken.length);
console.log('Token:', testToken);

const message = {
  notification: {
    title: 'Test Bildirim',
    body: 'Firebase Admin SDK test bildirimi'
  },
  token: testToken
};

messaging.send(message)
  .then((response) => {
    console.log('✅ Bildirim başarıyla gönderildi:', response);
  })
  .catch((error) => {
    console.log('❌ Bildirim gönderme hatası:', error);
  });
