import { ensureAdmin } from './firebaseAdmin';
import { getValidTokens, cleanInvalidTokens } from './token-manager';
import type { EarthquakeInterface } from '~~/interfaces/earthquake.interface';

export async function sendFcmForEarthquake(eq: EarthquakeInterface) {
  try {
    const { messaging, db } = ensureAdmin();
    
    // Geçerli token'ları akıllı şekilde al
    let tokens = await getValidTokens();
    
    // Eğer token yoksa, geçersizleri temizle ve tekrar dene
    if (tokens.length === 0) {
      console.log('[fcm-notifier] Token bulunamadı, geçersizler temizleniyor...');
      await cleanInvalidTokens();
      tokens = await getValidTokens();
    }
    
    if (tokens.length === 0) {
      console.log('[fcm-notifier] Hiç aktif token yok');
      return;
    }
    
    console.log(`[fcm-notifier] Sending to ${tokens.length} devices for M${eq.Magnitude} ${eq.Region?.City}`);
    
    // FCM mesajı hazırla
    const message = {
      notification: {
        title: `Deprem: M${eq.Magnitude.toFixed(1)}`,
        body: `${eq.Region?.City || 'Bilinmeyen'} - ${eq.Region?.District || ''}\nDerinlik: ${eq.Depth}km`,
      },
      data: {
        earthquakeId: eq.ID,
        magnitude: String(eq.Magnitude),
        city: eq.Region?.City || '',
        district: eq.Region?.District || '',
        depth: String(eq.Depth),
        latitude: String(eq.Latitude),
        longitude: String(eq.Longitude),
      },
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default',
          channelId: 'earthquake_alerts',
        },
      },
    };
    
    // Toplu gönderim (max 500 token)
    const batchSize = 500;
    let totalSuccess = 0;
    let totalFailure = 0;
    
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      const response = await messaging.sendEachForMulticast({
        tokens: batch,
        ...message,
      });
      
      totalSuccess += response.successCount;
      totalFailure += response.failureCount;
      
      console.log(`[fcm-notifier] Batch ${Math.floor(i / batchSize) + 1}: ${response.successCount}/${batch.length} success`);
      
      // Başarısız token'ları temizle
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(batch[idx]);
            console.warn(`[fcm-notifier] Failed token: ${resp.error?.code}`);
          }
        });
        
        // Geçersiz token'ları Firestore'dan sil
        for (const token of failedTokens) {
          try {
            const snapshot = await db.collection('pushTokens').where('token', '==', token).get();
            snapshot.forEach((doc) => doc.ref.delete());
          } catch (e) {
            console.error('[fcm-notifier] Error deleting token:', e);
          }
        }
      }
    }
    
    console.log(`[fcm-notifier] Total: ${totalSuccess} success, ${totalFailure} failed`);
  } catch (e) {
    console.error('[fcm-notifier] Error:', e);
  }
}
