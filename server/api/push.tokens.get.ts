import { defineEventHandler } from 'h3'
import { ensureAdmin } from '../utils/firebaseAdmin'

// GET /api/push.tokens => returns first 200 tokens sorted by updatedAt desc
export default defineEventHandler(async () => {
  const { db } = ensureAdmin()
  const snap = await db.collection('pushTokens').orderBy('updatedAt', 'desc').limit(200).get()
  const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
  return { items }
})
