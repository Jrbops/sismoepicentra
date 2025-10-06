import { defineEventHandler, readBody } from 'h3'
import { ensureAdmin } from '../utils/firebaseAdmin'

// POST /api/push.topic.subscribe { token: string, topic: string }
export default defineEventHandler(async (event) => {
  const { messaging } = ensureAdmin()
  const body = await readBody(event)
  const token = String(body?.token || '')
  const topic = String(body?.topic || '')
  if (!token || !topic) {
    event.node.res.statusCode = 400
    return { error: 'token and topic required' }
  }
  const res = await messaging.subscribeToTopic([token], topic)
  return { res }
})
