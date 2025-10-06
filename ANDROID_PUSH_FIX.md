# Android Push Bildirimleri Düzeltme Rehberi

## Mevcut Durum
✅ Firebase yapılandırması tamam (google-services.json mevcut)
✅ Android Manifest izinleri tamam
✅ FCM Service (MyFcmService.java) mevcut
✅ Capacitor PushNotifications plugin kurulu
✅ Token kayıt sistemi çalışıyor (Firestore'a yazıyor)
❌ Server tarafından FCM mesaj gönderimi çalışmıyor

## Sorunlar ve Çözümler

### 1. Firebase Admin Service Account Eksik

**Sorun**: Server'dan FCM mesaj göndermek için Firebase Admin credentials gerekli.

**Çözüm**:
1. Firebase Console'a git: https://console.firebase.google.com/project/epicentraio/settings/serviceaccounts/adminsdk
2. "Generate new private key" butonuna tıkla
3. İndirilen JSON dosyasını `epicentraio-firebase-adminsdk.json` olarak kaydet
4. `.env` dosyasına ekle:
```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/epicentraio-firebase-adminsdk.json
```

### 2. Deprem Polling Sistemi Aktif Değil

**Sorun**: `server/tasks/earthquake-poller.ts` dosyası var ama çalışmıyor.

**Çözüm**: Nitro plugin oluştur:

**Dosya**: `server/plugins/earthquake-poller.ts`
```typescript
import { pollAndNotify } from '../tasks/earthquake-poller';

export default defineNitroPlugin((nitroApp) => {
  // Her 2 dakikada bir yeni depremleri kontrol et
  const POLL_INTERVAL = 2 * 60 * 1000; // 2 dakika
  
  console.log('[earthquake-poller] Starting background polling...');
  
  setInterval(async () => {
    try {
      await pollAndNotify();
    } catch (e) {
      console.error('[earthquake-poller] Error:', e);
    }
  }, POLL_INTERVAL);
  
  // İlk çalıştırmayı 10 saniye sonra yap
  setTimeout(() => pollAndNotify(), 10000);
});
```

### 3. FCM Push Gönderimi için Yardımcı Fonksiyon

**Dosya**: `server/utils/fcm-notifier.ts` (YENİ)
```typescript
import { ensureAdmin } from './firebaseAdmin';
import type { EarthquakeInterface } from '~~/interfaces/earthquake.interface';

export async function sendFcmForEarthquake(eq: EarthquakeInterface) {
  try {
    const { messaging, db } = ensureAdmin();
    
    // Firestore'dan aktif token'ları al
    const tokensSnapshot = await db.collection('pushTokens').get();
    const tokens: string[] = [];
    
    tokensSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.token) tokens.push(data.token);
    });
    
    if (tokens.length === 0) {
      console.log('[fcm-notifier] No tokens found');
      return;
    }
    
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
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      const response = await messaging.sendEachForMulticast({
        tokens: batch,
        ...message,
      });
      
      console.log(`[fcm-notifier] Sent to ${response.successCount}/${batch.length} devices`);
      
      // Başarısız token'ları temizle
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(batch[idx]);
          }
        });
        
        // Geçersiz token'ları Firestore'dan sil
        for (const token of failedTokens) {
          const snapshot = await db.collection('pushTokens').where('token', '==', token).get();
          snapshot.forEach((doc) => doc.ref.delete());
        }
      }
    }
  } catch (e) {
    console.error('[fcm-notifier] Error:', e);
  }
}
```

### 4. Earthquake Poller'ı Güncelle

**Dosya**: `server/tasks/earthquake-poller.ts`
```typescript
import { sendPushForEarthquake } from '../utils/push-notifier';
import { sendFcmForEarthquake } from '../utils/fcm-notifier';
import type { EarthquakeInterface } from '~~/interfaces/earthquake.interface';

let LAST_CHECK_IDS = new Set<string>();

export async function pollAndNotify() {
  try {
    const res = await $fetch<EarthquakeInterface[]>('/api/earthquakes-combined?source=both', { 
      method: 'GET',
      baseURL: 'http://localhost:3000' // Kendi API'sine istek
    });
    
    if (!Array.isArray(res)) return;
    
    const now = Date.now();
    const recentThreshold = 5 * 60 * 1000; // Son 5 dakika
    
    const recent = res.filter((eq) => {
      try {
        const eqTime = new Date(eq.Date).getTime();
        return now - eqTime < recentThreshold;
      } catch {
        return false;
      }
    });
    
    for (const eq of recent) {
      if (!LAST_CHECK_IDS.has(eq.ID)) {
        LAST_CHECK_IDS.add(eq.ID);
        console.log(`[earthquake-poller] New earthquake detected: M${eq.Magnitude} ${eq.Region?.City}`);
        
        // Hem Web Push hem FCM gönder
        await Promise.all([
          sendPushForEarthquake(eq),
          sendFcmForEarthquake(eq),
        ]);
      }
    }
    
    // Cache'i temizle (max 100 ID)
    if (LAST_CHECK_IDS.size > 100) {
      const arr = Array.from(LAST_CHECK_IDS);
      LAST_CHECK_IDS = new Set(arr.slice(-50));
    }
  } catch (error) {
    console.error('[earthquake-poller] Error:', error);
  }
}
```

### 5. Android Notification Channel Oluştur

**Dosya**: `android/app/src/main/java/com/epicentra/app/MainActivity.java`

Mevcut MainActivity'ye ekle:
```java
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;

@Override
protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    createNotificationChannel();
}

private void createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        NotificationChannel channel = new NotificationChannel(
            "earthquake_alerts",
            "Deprem Uyarıları",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Deprem bildirimleri");
        channel.enableVibration(true);
        channel.setShowBadge(true);
        
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.createNotificationChannel(channel);
        }
    }
}
```

## Test Adımları

### 1. Firebase Admin Credentials Test
```bash
# .env dosyasında GOOGLE_APPLICATION_CREDENTIALS tanımlı mı?
cat .env | grep GOOGLE_APPLICATION_CREDENTIALS

# Dosya var mı?
ls -la /path/to/epicentraio-firebase-adminsdk.json
```

### 2. FCM Token Kontrolü
```bash
# Firestore'da token var mı?
# Firebase Console > Firestore > pushTokens koleksiyonu
```

### 3. Manuel FCM Test
```bash
# Admin token al (Firebase Console'dan)
curl -X POST http://localhost:3000/api/push.send \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "FCM_TOKEN_FROM_DEVICE",
    "title": "Test Deprem",
    "body": "Bu bir test bildirimidir",
    "data": {"test": "true"}
  }'
```

### 4. Android Logcat İzleme
```bash
# Android Studio'da veya terminal'de
adb logcat | grep -E "MyFcmService|PushNotifications"
```

## Hızlı Başlangıç

1. Firebase Admin JSON dosyasını indir ve `.env`'e ekle
2. `server/plugins/earthquake-poller.ts` dosyasını oluştur
3. `server/utils/fcm-notifier.ts` dosyasını oluştur
4. `server/tasks/earthquake-poller.ts` dosyasını güncelle
5. Dev server'ı yeniden başlat: `yarn dev`
6. Android uygulamayı yeniden build et ve test et

## Notlar

- **Production**: Vercel'de `GOOGLE_APPLICATION_CREDENTIALS` env variable olarak JSON içeriğini direkt ekleyebilirsin
- **Rate Limiting**: FCM'in rate limit'i var (500 mesaj/batch, 1M mesaj/gün)
- **Token Yenileme**: FCM token'ları zaman zaman yenilenir, `onNewToken` bunu yakalar
- **Background Restrictions**: Android 12+ cihazlarda background restrictions olabilir
