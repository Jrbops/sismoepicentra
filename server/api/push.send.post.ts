import { defineEventHandler, readBody } from 'h3'
import { ensureAdmin, requireAdmin } from '../utils/firebaseAdmin'

// POST /api/push.send
// body: { token?: string, topic?: string, title: string, body: string, data?: Record<string,string> }
export default defineEventHandler(async (event) => {
  try { await requireAdmin(event) } catch (e) { event.node.res.statusCode = 401; return { error: 'unauthorized' } }
  const { messaging, db } = ensureAdmin()
  const payload = await readBody(event)
  const { token, topic, title, body, data } = payload || {}

  if (!title || !body) {
    event.node.res.statusCode = 400
    return { error: 'title and body required' }
  }
  if (!token && !topic) {
    event.node.res.statusCode = 400
    return { error: 'token or topic required' }
  }

  const message: any = {
    notification: { title, body },
    data: Object.fromEntries(Object.entries(data || {}).map(([k,v]) => [k, String(v)])),
  }
  if (token) message.token = token
  if (topic) message.topic = topic

  const logRef = db.collection('pushLogs').doc()
  const baseLog: any = {
    createdAt: new Date(),
    token: token || null,
    topic: topic || null,
    title,
    body,
    data: message.data || {},
  }
  try {
    const id = await messaging.send(message)
    await logRef.set({ ...baseLog, status: 'success', messageId: id })
    return { id }
  } catch (e: any) {
    const msg = String(e?.message || e)
    const code = String(e?.errorInfo?.code || e?.code || '')
    await logRef.set({ ...baseLog, status: 'error', code, error: msg })
    // Clean invalid token
    if (code.includes('registration-token-not-registered') && token) {
      try { await db.collection('pushTokens').doc(token).delete() } catch {}
    }
    event.node.res.statusCode = 500
    return { error: msg, code }
  }
})
