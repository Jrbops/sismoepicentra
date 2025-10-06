import { defineEventHandler } from 'h3'
import { ensureAdmin } from '../../utils/firebaseAdmin'

export default defineEventHandler(async (event) => {
  try {
    const { db, messaging } = ensureAdmin()
    
    // FCM token sayısını al
    const tokensSnapshot = await db.collection('pushTokens').get()
    const activeTokens = tokensSnapshot.docs.filter(doc => doc.data().active === true)
    
    // Son 24 saatteki push loglarını al
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    
    const logsSnapshot = await db.collection('pushLogs')
      .where('createdAt', '>=', yesterday)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get()
    
    const recentLogs = logsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt
    }))
    
    // Başarılı/başarısız bildirim sayıları
    const successCount = recentLogs.filter(log => log.status === 'success').length
    const errorCount = recentLogs.filter(log => log.status === 'error').length
    
    return {
      success: true,
      status: {
        totalTokens: tokensSnapshot.size,
        activeTokens: activeTokens.length,
        recentLogs: recentLogs.length,
        successCount,
        errorCount,
        lastUpdate: new Date().toISOString()
      },
      recentLogs: recentLogs.slice(0, 5), // Son 5 log
      systemHealth: {
        firebase: true,
        messaging: !!messaging,
        database: !!db
      }
    }
    
  } catch (error) {
    console.error('[push-status] Error:', error)
    return {
      success: false,
      error: error.message,
      status: {
        totalTokens: 0,
        activeTokens: 0,
        recentLogs: 0,
        successCount: 0,
        errorCount: 0,
        lastUpdate: new Date().toISOString()
      },
      systemHealth: {
        firebase: false,
        messaging: false,
        database: false
      }
    }
  }
})
