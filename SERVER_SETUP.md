# Kendi Bilgisayarını Server Olarak Kullanma

## 🚀 Hızlı Başlangıç

### 1. Production Build Oluştur
```bash
yarn build
```

### 2. PM2 ile Başlat
```bash
pm2 start ecosystem.config.js
```

### 3. Durumu Kontrol Et
```bash
pm2 status
pm2 logs epicentra-server
```

### 4. Bilgisayar Açılışında Otomatik Başlat
```bash
pm2 startup
# Çıkan komutu çalıştır (sudo ile)
pm2 save
```

## 📋 Detaylı Adımlar

### Adım 1: Build
```bash
cd /home/jonturk/Masaüstü/projects/Epicentra
yarn build
```

Bu komut `.output/` klasörü oluşturur.

### Adım 2: PM2 ile Başlat
```bash
pm2 start ecosystem.config.js
```

### Adım 3: Logları İzle
```bash
# Tüm logları göster
pm2 logs

# Sadece epicentra-server logları
pm2 logs epicentra-server

# Son 100 satır
pm2 logs epicentra-server --lines 100
```

### Adım 4: Yönetim Komutları
```bash
# Durumu göster
pm2 status

# Yeniden başlat
pm2 restart epicentra-server

# Durdur
pm2 stop epicentra-server

# Sil
pm2 delete epicentra-server

# Tüm servisleri yeniden başlat
pm2 restart all
```

## 🌐 Dışarıdan Erişim (İnternet Üzerinden)

### Seçenek 1: Ngrok (En Kolay)

1. **Ngrok Kur**:
```bash
# Arch Linux
yay -S ngrok

# veya direkt indir
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
tar -xvzf ngrok-v3-stable-linux-amd64.tgz
sudo mv ngrok /usr/local/bin/
```

2. **Ngrok Hesabı Oluştur**:
   - https://ngrok.com/signup
   - Auth token'ı kopyala

3. **Auth Token Ekle**:
```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

4. **Tunnel Başlat**:
```bash
ngrok http 3000
```

5. **URL'i Kopyala**:
```
Forwarding: https://abc123.ngrok.io -> http://localhost:3000
```

Bu URL'i Android uygulamasında kullan!

### Seçenek 2: Cloudflare Tunnel (Ücretsiz, Kalıcı)

1. **Cloudflared Kur**:
```bash
yay -S cloudflared
```

2. **Login**:
```bash
cloudflared tunnel login
```

3. **Tunnel Oluştur**:
```bash
cloudflared tunnel create epicentra
```

4. **Config Dosyası**:
`~/.cloudflared/config.yml`:
```yaml
tunnel: TUNNEL_ID
credentials-file: /home/jonturk/.cloudflared/TUNNEL_ID.json

ingress:
  - hostname: epicentra.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

5. **DNS Ekle**:
```bash
cloudflared tunnel route dns epicentra epicentra.yourdomain.com
```

6. **Başlat**:
```bash
cloudflared tunnel run epicentra
```

### Seçenek 3: Port Forwarding (Modem/Router)

1. **Modem/Router Admin Paneline Gir**:
   - Genelde: http://192.168.1.1 veya http://192.168.0.1

2. **Port Forwarding Ayarları**:
   - External Port: 3000
   - Internal IP: Bilgisayarının local IP'si (örn: 192.168.1.100)
   - Internal Port: 3000
   - Protocol: TCP

3. **Bilgisayarının Local IP'sini Bul**:
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
```

4. **Public IP'ni Öğren**:
```bash
curl ifconfig.me
```

5. **Android Uygulamasında Kullan**:
```
http://YOUR_PUBLIC_IP:3000
```

⚠️ **Dikkat**: ISP'nin port 3000'i bloklamadığından emin ol.

## 🔒 Güvenlik

### 1. Firewall Ayarları
```bash
# UFW kur (yoksa)
sudo pacman -S ufw

# Aktif et
sudo ufw enable

# Port 3000'i aç
sudo ufw allow 3000/tcp

# SSH'ı kapat (uzaktan bağlanmıyorsan)
sudo ufw deny 22/tcp

# Durumu kontrol et
sudo ufw status
```

### 2. HTTPS Ekle (Nginx + Let's Encrypt)

**Nginx Kur**:
```bash
sudo pacman -S nginx certbot certbot-nginx
```

**Nginx Config** (`/etc/nginx/sites-available/epicentra`):
```nginx
server {
    listen 80;
    server_name epicentra.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

**SSL Sertifikası Al**:
```bash
sudo certbot --nginx -d epicentra.yourdomain.com
```

## 📱 Android Uygulamasını Güncelle

### capacitor.config.ts
```typescript
const config: CapacitorConfig = {
  appId: 'com.epicentra.app',
  appName: 'Epicentra Io',
  webDir: '.output/public',
  server: {
    // Ngrok URL'i veya kendi domain'in
    url: 'https://abc123.ngrok.io',
    cleartext: false,
  },
};
```

### .env (Android için)
```bash
NUXT_PUBLIC_API_BASE=https://abc123.ngrok.io
```

## 🔄 Güncelleme Yaparken

1. **Kodu Güncelle**:
```bash
git pull
yarn install
```

2. **Yeniden Build**:
```bash
yarn build
```

3. **PM2'yi Yeniden Başlat**:
```bash
pm2 restart epicentra-server
```

## 📊 Monitoring

### PM2 Monitoring
```bash
# Web dashboard
pm2 plus

# Terminal monitoring
pm2 monit
```

### Log Dosyaları
```bash
# PM2 logları
tail -f logs/pm2-out.log
tail -f logs/pm2-error.log

# Sistem logları
journalctl -u pm2-jonturk -f
```

## ⚡ Performans

### Sistem Gereksinimleri
- **RAM**: En az 2GB (4GB önerilen)
- **CPU**: 2 core önerilen
- **Disk**: 10GB boş alan
- **İnternet**: Upload hızı en az 10 Mbps

### Optimizasyon
```bash
# PM2 cluster mode (çoklu instance)
pm2 start ecosystem.config.js -i max

# Memory limit
pm2 start ecosystem.config.js --max-memory-restart 1G
```

## 🛠️ Sorun Giderme

### Server Başlamıyor
```bash
# Logları kontrol et
pm2 logs epicentra-server --err

# Port kullanımda mı?
sudo lsof -i :3000

# Manuel başlat
node .output/server/index.mjs
```

### Push Bildirimleri Çalışmıyor
```bash
# Firebase Admin credentials kontrol
cat .env | grep GOOGLE_APPLICATION_CREDENTIALS

# Firestore bağlantısı test
curl http://localhost:3000/api/push/test-notification \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"magnitude": 5.5, "city": "Test"}'
```

### Dışarıdan Erişilemiyor
```bash
# Firewall kontrol
sudo ufw status

# Port açık mı?
sudo netstat -tulpn | grep :3000

# Public IP
curl ifconfig.me
```

## 📝 Notlar

- **Elektrik Kesintisi**: UPS kullan veya cloud server'a geç
- **İnternet Kesintisi**: Yedek internet bağlantısı hazırla
- **Güncelleme**: Haftada bir `git pull && yarn build && pm2 restart` yap
- **Yedekleme**: `.data/` klasörünü düzenli yedekle
