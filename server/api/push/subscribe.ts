import { ensureAdmin } from '../../utils/firebaseAdmin'

export default defineEventHandler(async (event) => {
  // Sadece POST metodunu kabul et
  if (event.node.req.method !== 'POST') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })
  }

  const body = await readBody(event)
  const { fcmToken, deviceId, userSettings, persistent } = body

  if (!fcmToken) {
    throw createError({
      statusCode: 400,
      statusMessage: 'FCM token is required'
    })
  }

  try {
    const { db } = ensureAdmin()
    
    // Kalıcı token sistemi: Aynı cihazdan gelen token'ı güncelle
    if (deviceId && persistent) {
      const existingSnapshot = await db.collection('pushTokens')
        .where('deviceId', '==', deviceId)
        .get()
      
      if (!existingSnapshot.empty) {
        // Mevcut cihaz kaydını güncelle
        const doc = existingSnapshot.docs[0]
        await doc.ref.update({
          token: fcmToken,
          userSettings: userSettings || {},
          updatedAt: new Date(),
          active: true,
          persistent: true
        })
        
        console.log('[push] Kalıcı token güncellendi:', fcmToken.substring(0, 20) + '...')
        
        return {
          success: true,
          message: 'FCM token updated successfully (persistent)',
          action: 'updated'
        }
      }
    }
    
    // Yeni token kaydı
    await db.collection('pushTokens').add({
      token: fcmToken,
      deviceId: deviceId || 'device_' + Date.now(),
      userSettings: userSettings || {},
      createdAt: new Date(),
      updatedAt: new Date(),
      active: true,
      persistent: persistent || false
    })

    console.log('[push] Yeni FCM token kaydedildi:', fcmToken.substring(0, 20) + '...')

    return {
      success: true,
      message: 'FCM token registered successfully',
      action: 'created'
    }
  } catch (error) {
    console.error('[push] Error saving FCM token:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to save FCM token'
    })
  }
})
