// FCM Token yönetim sistemi - geçersiz token'ları otomatik temizler
import { ensureAdmin } from './firebaseAdmin'

export async function cleanInvalidTokens() {
  try {
    const { messaging, db } = ensureAdmin()
    
    // Tüm token'ları al
    const tokensSnapshot = await db.collection('pushTokens').get()
    const invalidTokens: string[] = []
    const validTokens: string[] = []
    
    console.log(`[token-manager] ${tokensSnapshot.size} token kontrol ediliyor...`)
    
    // Her token'ı test et
    for (const doc of tokensSnapshot.docs) {
      const data = doc.data()
      if (!data.token) continue
      
      try {
        // Dry run test - gerçek mesaj göndermeden token'ı test et
        await messaging.send({
          token: data.token,
          notification: {
            title: 'Test',
            body: 'Test'
          }
        }, true) // dry run
        
        validTokens.push(data.token)
        
      } catch (error: any) {
        if (error.errorInfo?.code === 'messaging/registration-token-not-registered' ||
            error.errorInfo?.code === 'messaging/invalid-registration-token') {
          invalidTokens.push(data.token)
          // Geçersiz token'ı sil
          await doc.ref.delete()
          console.log(`[token-manager] Geçersiz token silindi: ${data.token.substring(0, 20)}...`)
        }
      }
    }
    
    console.log(`[token-manager] Sonuç: ${validTokens.length} geçerli, ${invalidTokens.length} geçersiz`)
    
    return {
      valid: validTokens,
      invalid: invalidTokens,
      total: tokensSnapshot.size
    }
    
  } catch (error) {
    console.error('[token-manager] Hata:', error)
    return { valid: [], invalid: [], total: 0 }
  }
}

export async function getValidTokens(): Promise<string[]> {
  try {
    const { db } = ensureAdmin()
    
    // Son 24 saat içinde oluşturulan token'ları al (daha güvenilir)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    const tokensSnapshot = await db.collection('pushTokens')
      .where('createdAt', '>', oneDayAgo)
      .where('active', '==', true)
      .get()
    
    const tokens: string[] = []
    tokensSnapshot.forEach(doc => {
      const data = doc.data()
      if (data.token) tokens.push(data.token)
    })
    
    console.log(`[token-manager] ${tokens.length} aktif token bulundu`)
    return tokens
    
  } catch (error) {
    console.error('[token-manager] getValidTokens hatası:', error)
    return []
  }
}

export async function addFreshToken(token: string, userId?: string, deviceId?: string) {
  try {
    const { db } = ensureAdmin()
    
    // Aynı token varsa güncelle, yoksa ekle
    const existingSnapshot = await db.collection('pushTokens')
      .where('token', '==', token)
      .get()
    
    if (!existingSnapshot.empty) {
      // Mevcut token'ı güncelle
      const doc = existingSnapshot.docs[0]
      await doc.ref.update({
        updatedAt: new Date(),
        active: true
      })
      console.log(`[token-manager] Token güncellendi: ${token.substring(0, 20)}...`)
    } else {
      // Yeni token ekle
      await db.collection('pushTokens').add({
        token,
        userId: userId || 'user_' + Date.now(),
        deviceId: deviceId || 'device_' + Date.now(),
        createdAt: new Date(),
        updatedAt: new Date(),
        active: true
      })
      console.log(`[token-manager] Yeni token eklendi: ${token.substring(0, 20)}...`)
    }
    
    return true
    
  } catch (error) {
    console.error('[token-manager] addFreshToken hatası:', error)
    return false
  }
}
