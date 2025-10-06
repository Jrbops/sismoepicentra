# 🚀 Epicentra Server & Monitoring Dashboard

## 📋 Hızlı Başlangıç

### Otomatik Başlatma
```bash
./start-server.sh
```

Bu script otomatik olarak:
- ✅ Sistem kontrollerini yapar
- ✅ Gerekli bağımlılıkları kontrol eder
- ✅ Ana sunucuyu başlatır (Port: 8080)
- ✅ Monitoring dashboard'unu başlatır (Port: 9615)
- ✅ PM2 süreçlerini kaydeder

## 🌐 Erişim Adresleri

- **Ana Uygulama**: http://localhost:8080
- **Monitoring Dashboard**: http://localhost:9615

## 📊 Monitoring Dashboard Özellikleri

### 🔧 Ana Özellikler
- **PM2 Process Monitoring**: Tüm PM2 süreçlerini izleme
- **Real-time Stats**: CPU, RAM, uptime bilgileri
- **User Map**: Aktif kullanıcıların harita üzerinde görüntülenmesi
- **Sync Status**: Veritabanı ve API durumu
- **Error Log Panel**: Hata loglarını filtreleme ve görüntüleme

### 📈 Hata Log Paneli
- **Filtreleme**: Tüm loglar, sadece hatalar, uyarılar, başarılı işlemler
- **Real-time**: Otomatik yenileme (5 saniye)
- **Renkli Kodlama**: Hata tipine göre renkli gösterim
- **Detaylı Bilgi**: Zaman, tip, mesaj, kaynak bilgileri

## 🛠️ Manuel Komutlar

### PM2 Yönetimi
```bash
# Durum kontrolü
pm2 status

# Logları görüntüle
pm2 logs

# Tüm süreçleri durdur
pm2 stop all

# Tüm süreçleri yeniden başlat
pm2 restart all

# Belirli bir süreci durdur
pm2 stop epicentra-server
pm2 stop monitoring-dashboard
```

### Sistem Bilgileri
```bash
# PM2 detaylı bilgi
pm2 info epicentra-server
pm2 info monitoring-dashboard

# Environment değişkenleri
pm2 env 0  # epicentra-server için
pm2 env 1  # monitoring-dashboard için
```

## 🔧 Konfigürasyon

### Port Değiştirme
`ecosystem.config.js` dosyasında PORT değerini değiştirin:
```javascript
env: {
    NODE_ENV: 'production',
    PORT: 8080,  // Bu değeri değiştirin
    HOST: '0.0.0.0',
}
```

### Monitoring Dashboard Port
`monitoring/pm2-web.js` dosyasında PORT değerini değiştirin:
```javascript
const PORT = 9615;  // Bu değeri değiştirin
```

## 📁 Dosya Yapısı

```
Epicentra/
├── start-server.sh          # Otomatik başlatma scripti
├── ecosystem.config.js      # PM2 konfigürasyonu
├── monitoring/
│   ├── pm2-web.js          # Monitoring dashboard
│   └── public/
│       └── ultra.html      # Dashboard arayüzü
├── logs/
│   ├── pm2-error.log       # Hata logları
│   └── pm2-out.log         # Çıktı logları
└── .output/
    └── server/
        └── index.mjs       # Ana sunucu dosyası
```

## 🚨 Sorun Giderme

### Port Çakışması
```bash
# Port kullanımını kontrol et
sudo netstat -tulpn | grep :8080
sudo netstat -tulpn | grep :9615

# Süreçleri durdur
pm2 stop all
pkill -f pm2-web.js
```

### Log Kontrolü
```bash
# PM2 logları
pm2 logs epicentra-server
pm2 logs monitoring-dashboard

# Sistem logları
tail -f logs/pm2-error.log
tail -f logs/pm2-out.log
```

### Yeniden Başlatma
```bash
# Tam yeniden başlatma
pm2 delete all
./start-server.sh
```

## 🔄 Otomatik Başlatma (Sistem Boot)

Sistem yeniden başladığında otomatik başlatma için:
```bash
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u jonturk --hp /home/jonturk
pm2 save
```

## 📞 Destek

Herhangi bir sorun yaşarsanız:
1. `pm2 status` ile süreç durumunu kontrol edin
2. `pm2 logs` ile hata loglarını inceleyin
3. `./start-server.sh` ile yeniden başlatın

---

**🎉 Epicentra Server & Monitoring Dashboard başarıyla çalışıyor!**

