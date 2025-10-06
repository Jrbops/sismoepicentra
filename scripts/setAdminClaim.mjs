import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';

// Usage:
//   export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/serviceAccount.json
//   node scripts/setAdminClaim.mjs <UID>

async function main() {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath) {
    console.error('GOOGLE_APPLICATION_CREDENTIALS env missing');
    process.exit(1);
  }
  const raw = fs.readFileSync(credPath, 'utf8');
  const cred = JSON.parse(raw);
  initializeApp({ credential: cert(cred), projectId: 'epicentraio' });

  const uid = process.argv[2];
  if (!uid) {
    console.error('Missing UID. Usage: node scripts/setAdminClaim.mjs <UID>');
    process.exit(1);
  }

  await getAuth().setCustomUserClaims(uid, { admin: true });
  console.log('admin claim set for uid:', uid);
}

main().catch((e) => { console.error(e); process.exit(1); });
