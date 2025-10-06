import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import fs from 'fs';

// Usage:
//   export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/serviceAccount.json
//   node scripts/sendTestPush.mjs [token]
// If token not provided, will fetch the first document from pushTokens collection.

async function main() {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath) {
    console.error('GOOGLE_APPLICATION_CREDENTIALS env missing');
    process.exit(1);
  }
  const raw = fs.readFileSync(credPath, 'utf8');
  const cred = JSON.parse(raw);
  initializeApp({ credential: cert(cred), projectId: 'epicentraio' });

  const db = getFirestore();
  const messaging = getMessaging();

  let token = process.argv[2];
  if (!token) {
    const snap = await db.collection('pushTokens').limit(1).get();
    if (snap.empty) {
      console.error('No pushTokens found in Firestore');
      process.exit(2);
    }
    token = snap.docs[0].get('token');
    if (!token) {
      console.error('Token field missing in first pushTokens doc');
      process.exit(3);
    }
    console.log('Using token from Firestore doc:', snap.docs[0].id);
  }

  const message = {
    token,
    notification: {
      title: 'Epicentra Test',
      body: 'Bu bir test bildirimidir (MapLibre + Admin).',
    },
    data: {
      source: 'test',
      ts: String(Date.now()),
    },
  };

  const id = await messaging.send(message);
  console.log('FCM message sent, id:', id);
}

main().catch((e) => { console.error(e); process.exit(1); });
