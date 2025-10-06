// Direct FCM Test
const admin = require('firebase-admin');

// Firebase Admin SDK initialize
const serviceAccount = require('./epicentraio-firebase-adminsdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const messaging = admin.messaging();

const token = 'caiHogQ0Rcmz9PDMP6XXpx:APA91bEuerotiDBF5XT2Z3YiQkpOY28jiH-PPObujTodXA1i-3aNVIb4QnkC88TubwgLByTXv6xrlkeY8mN7Wqx8s1KwelLeReEFxNcOeyWYAfoWV2r2fz8';

const message = {
  token: token,
  notification: {
    title: '🚨 Test Deprem',
    body: 'M4.5 Test Şehri - Test İlçe\nDerinlik: 10km'
  },
  data: {
    earthquakeId: 'test-123',
    magnitude: '4.5',
    city: 'Test Şehri',
    district: 'Test İlçe',
    depth: '10'
  },
  android: {
    priority: 'high',
    notification: {
      sound: 'default',
      channelId: 'earthquake_alerts'
    }
  }
};

messaging.send(message)
  .then((response) => {
    console.log('✅ FCM başarıyla gönderildi:', response);
  })
  .catch((error) => {
    console.error('❌ FCM hatası:', error);
  });
