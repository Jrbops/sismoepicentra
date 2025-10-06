# ✅ VPS Deployment Kontrol Listesi

## 🚀 Hızlı Başlangıç

### 1. Otomatik Deployment (Önerilen)
```bash
# Tek komutla deployment
./deploy-to-vps.sh
```

### 2. Manuel Deployment
```bash
# Detaylı rehber için
cat VPS-DEPLOYMENT-GUIDE.md
```

## 📋 Ön Hazırlık Kontrol Listesi

### 🖥️ VPS Gereksinimleri
- [ ] **VPS Sunucu**: Ubuntu 20.04+ / 2GB+ RAM / 2 vCPU
- [ ] **SSH Erişimi**: SSH anahtarı ile erişim
- [ ] **Domain**: Domain adı (isteğe bağlı)
- [ ] **DNS**: A record ayarları yapıldı

### 🔐 Güvenlik Hazırlığı
```bash
# SSH anahtarı oluştur (eğer yoksa)
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"

# SSH anahtarını VPS'e kopyala
ssh-copy-id user@your-vps-ip
```

### 📦 Yerel Hazırlık
- [ ] Proje build testi: `npm run build`
- [ ] Environment dosyası hazır: `.env`
- [ ] Git repository güncel
- [ ] Gereksiz dosyalar temizlendi

## 🎯 Deployment Adımları

### Adım 1: Otomatik Script Çalıştır
```bash
./deploy-to-vps.sh
```

**Script ne yapar:**
1. ✅ VPS bağlantısını test eder
2. ✅ Gerekli paketleri yükler (Node.js, PM2, Nginx)
3. ✅ Proje dosyalarını transfer eder
4. ✅ Bağımlılıkları yükler
5. ✅ Environment ayarlarını yapar
6. ✅ PM2 yapılandırması
7. ✅ Nginx reverse proxy
8. ✅ SSL sertifikası (domain varsa)
9. ✅ Uygulamayı başlatır

### Adım 2: Deployment Doğrulama
```bash
# VPS'e bağlan ve kontrol et
ssh user@your-vps-ip

# PM2 durumu
pm2 status

# Nginx durumu
sudo systemctl status nginx

# Logları kontrol et
pm2 logs --lines 20
```

## 🔧 Deployment Sonrası Yapılandırma

### Bot Sistemini VPS'te Kullanma

```bash
# VPS'e bağlan
ssh user@your-vps-ip
cd ~/apps/Epicentra

# Bot sistemini çalıştır
./epicentra-manager.sh

# TUI Bot'u çalıştır
./start-tui.sh

# CLI komutları
./epicentra-bot.sh status
./epicentra-bot.sh restart
```

### Monitoring ve Yönetim

**PM2 Web Dashboard:**
- URL: `http://your-vps-ip:9615`
- Gerçek zamanlı süreç izleme

**Ana Uygulama:**
- URL: `http://your-domain.com` veya `http://your-vps-ip`

**Nginx Monitoring:**
```bash
# Nginx logları
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## 🚨 Sorun Giderme

### Yaygın Sorunlar ve Çözümleri

#### 1. SSH Bağlantı Sorunu
```bash
# SSH anahtarını tekrar kopyala
ssh-copy-id -i ~/.ssh/id_rsa.pub user@vps-ip

# SSH bağlantısını test et
ssh -v user@vps-ip
```

#### 2. Port Erişim Sorunu
```bash
# Firewall durumunu kontrol et
sudo ufw status

# Gerekli portları aç
sudo ufw allow 3000
sudo ufw allow 80
sudo ufw allow 443
```

#### 3. PM2 Süreç Durmuş
```bash
# PM2 durumunu kontrol et
pm2 status

# Süreçleri yeniden başlat
pm2 restart all

# PM2 loglarını kontrol et
pm2 logs --lines 50
```

#### 4. Nginx Yapılandırma Hatası
```bash
# Nginx yapılandırmasını test et
sudo nginx -t

# Nginx'i yeniden başlat
sudo systemctl restart nginx

# Nginx durumunu kontrol et
sudo systemctl status nginx
```

#### 5. SSL Sertifika Sorunu
```bash
# Sertifika durumunu kontrol et
sudo certbot certificates

# Sertifikayı yenile
sudo certbot renew

# Nginx'i yeniden yükle
sudo systemctl reload nginx
```

## 📊 Performance Optimizasyonu

### PM2 Cluster Mode
```bash
# Maksimum CPU kullanımı için
pm2 start ecosystem.config.production.js --env production -i max

# Bellek kullanımını izle
pm2 monit
```

### Nginx Cache
```bash
# Nginx cache yapılandırması
sudo nano /etc/nginx/nginx.conf

# Cache dizini oluştur
sudo mkdir -p /var/cache/nginx
sudo chown -R www-data:www-data /var/cache/nginx
```

### Sistem Kaynakları
```bash
# Sistem kaynaklarını izle
htop

# Disk kullanımı
df -h

# Bellek kullanımı
free -h
```

## 🔄 Güncelleme ve Bakım

### Uygulama Güncellemesi
```bash
# Yerel değişiklikleri VPS'e gönder
rsync -avz --exclude 'node_modules' ./ user@vps-ip:~/apps/Epicentra/

# VPS'te güncelleme
ssh user@vps-ip
cd ~/apps/Epicentra
npm ci --only=production
npm run build
pm2 reload all
```

### Otomatik Backup
```bash
# Backup scripti oluştur
nano ~/backup-epicentra.sh

#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf ~/backups/epicentra_$DATE.tar.gz -C ~/apps/Epicentra .
find ~/backups -name "epicentra_*.tar.gz" -mtime +7 -delete

# Crontab'a ekle
crontab -e
0 2 * * * ~/backup-epicentra.sh
```

## 📞 Destek Komutları

### Hızlı Durum Kontrolü
```bash
# Tek komutla tüm durumu kontrol et
ssh user@vps-ip 'pm2 status && sudo systemctl status nginx && sudo ufw status'
```

### Log İzleme
```bash
# Gerçek zamanlı log izleme
ssh user@vps-ip 'pm2 logs --lines 0'

# Hata logları
ssh user@vps-ip 'pm2 logs --err --lines 20'
```

### Sistem Bilgileri
```bash
# Sistem kaynak kullanımı
ssh user@vps-ip 'htop -n 1 | head -20'

# Disk kullanımı
ssh user@vps-ip 'df -h'
```

## 🎉 Başarılı Deployment Sonrası

### Erişim URL'leri
- **Ana Site**: `https://your-domain.com`
- **Monitoring**: `http://your-vps-ip:9615`
- **Bot Yönetimi**: SSH ile `./epicentra-manager.sh`

### Bot Sistemi Kullanımı
VPS'te geliştirdiğimiz bot sistemi tam olarak çalışacak:

1. **TUI Bot**: Terminal grafik arayüzü
2. **Web Dashboard**: Tarayıcı tabanlı yönetim
3. **CLI Bot**: Komut satırı araçları

### Monitoring ve Alerting
- PM2 web dashboard ile gerçek zamanlı izleme
- Nginx access/error logları
- Sistem kaynak monitörü

---

Bu kontrol listesini takip ederek Epicentra projenizi güvenli ve stabil bir şekilde VPS'e deploy edebilirsiniz! 🚀
