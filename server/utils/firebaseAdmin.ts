import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import fs from 'fs'

let inited = false

export function ensureAdmin() {
  if (getApps().length === 0) {
    let sa: any;
    
    // Önce JSON string'den dene (Vercel için)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      sa = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    } 
    // Yoksa dosya yolundan oku (local development için)
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const raw = fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8');
      sa = JSON.parse(raw);
    } 
    else {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_APPLICATION_CREDENTIALS_JSON not set');
    }
    
    initializeApp({ credential: cert(sa), projectId: sa.project_id || 'epicentraio' });
  }
  if (!inited) inited = true
  return { messaging: getMessaging(), db: getFirestore(), auth: getAuth() }
}

export async function requireAdmin(event: any) {
  const { auth } = ensureAdmin()
  const header = event.node.req.headers['authorization'] || ''
  const m = /^Bearer\s+(.+)$/i.exec(String(header))
  if (!m) throw new Error('missing bearer')
  const idToken = m[1]
  const decoded = await auth.verifyIdToken(idToken)
  if (!decoded?.admin) throw new Error('forbidden')
  return decoded
}
