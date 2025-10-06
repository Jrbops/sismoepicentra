# 🌍 Epicentra - Deprem İzleme ve Yönetim Sistemi

**Türkiye'nin en kapsamlı deprem izleme ve yönetim platformu**

## 🚀 Özellikler

### 🌐 Web Uygulaması
- **Gerçek Zamanlı Deprem Takibi**: AFAD ve KANDILLI verilerini anlık olarak izler
- **İnteraktif Harita**: Depremleri harita üzerinde görselleştirir
- **Bildirim Sistemi**: Önemli depremler için anlık uyarılar
- **Responsive Tasarım**: Tüm cihazlarda mükemmel görünüm

### 🤖 Bot Yönetim Sistemi
Epicentra, 3 farklı bot seçeneği sunar:

#### 1. 🖥️ Terminal Grafik Arayüzü (TUI Bot)
- **Python/Textual** ile geliştirilmiş modern terminal arayüzü
- **5 Sekme**: Kontrol, Durum, Süreçler, Sistem, Loglar
- **Gerçek Zamanlı İzleme**: PM2 süreç monitörü
- **Sistem Kaynakları**: CPU/RAM/Disk kullanımı
- **Canlı Log Akışı**: Renkli ve interaktif görünüm

#### 2. 🌐 Web Dashboard
- **Node.js/Express/Socket.IO** tabanlı web arayüzü
- **Tarayıcı Tabanlı Yönetim**: Uzaktan erişim imkanı
- **Grafik Arayüz**: Kullanıcı dostu kontrol paneli

#### 3. ⚡ CLI Bot
- **Bash Tabanlı**: Hızlı komut çalıştırma
- **Komut Satırı Araçları**: Otomatik işlemler için ideal

## 🛠️ Teknoloji Stack

### Frontend
- **Nuxt 3**: Vue.js tabanlı full-stack framework
- **TypeScript**: Tip güvenli geliştirme
- **Tailwind CSS**: Modern ve responsive tasarım
- **Socket.IO**: Gerçek zamanlı iletişim

### Backend
- **Node.js**: Server-side JavaScript runtime
- **Nitro**: Nuxt'un sunucu motoru
- **PM2**: Süreç yönetimi
- **Express**: Web framework

### Bot Sistemi
- **Python**: TUI bot geliştirme
- **Textual**: Terminal UI framework
- **Rich**: Zengin terminal çıktıları
- **Bash**: CLI bot scriptleri

### Database & APIs
- **AFAD API**: Resmi deprem verileri
- **KANDILLI API**: Akademik deprem verileri
- **Firebase**: Gerçek zamanlı database (opsiyonel)

## 🚀 Kurulum

### Gereksinimler
- Node.js 18+
- Python 3.8+
- PM2 (global)

### Hızlı Başlangıç

```bash
# Repository'yi klonla
git clone https://github.com/[username]/Epicentra.git
cd Epicentra

# Bağımlılıkları yükle
npm install

# Python bağımlılıkları
pip install -r requirements.txt

# Geliştirme sunucusunu başlat
npm run dev
```

### Production Deployment

```bash
# Build
npm run build

# PM2 ile başlat
pm2 start ecosystem.config.js

# Bot sistemini başlat
./epicentra-manager.sh
```

## 🤖 Bot Sistemi Kullanımı

### Ana Bot Yöneticisi
```bash
./epicentra-manager.sh
```

### TUI Bot (Terminal Arayüzü)
```bash
./start-tui.sh
# veya
./epicentra-debug-tui.py
```

### CLI Bot (Komut Satırı)
```bash
./epicentra-bot.sh status
./epicentra-bot.sh restart
./epicentra-bot.sh logs
```

## 📊 VPS Deployment

### Otomatik Deployment
```bash
# SSH anahtarı kurulumu
./setup-ssh-key.sh

# Hızlı deployment
./quick-deploy.sh

# Final deployment (sorun çözücü)
./final-deploy.sh
```

### Manuel Deployment
1. VPS'e bağlan: `ssh root@[IP]`
2. Proje dizinine git: `cd /root/apps/Epicentra`
3. Bot sistemini başlat: `./epicentra-manager.sh`

## 📁 Proje Yapısı

```
Epicentra/
├── components/          # Vue bileşenleri
├── pages/              # Nuxt sayfaları
├── server/             # API endpoints
├── assets/             # Statik dosyalar
├── bot-system/         # Bot yönetim dosyaları
│   ├── epicentra-manager.sh
│   ├── epicentra-tui.py
│   ├── start-tui.sh
│   └── epicentra-bot.sh
├── deployment/         # VPS deployment scriptleri
│   ├── quick-deploy.sh
│   ├── setup-ssh-key.sh
│   └── final-deploy.sh
└── docs/              # Dokümantasyon
```

## 🔧 Yapılandırma

### Environment Variables
```bash
# .env dosyası
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
AFAD_API_KEY=your_key_here
KANDILLI_API_URL=https://api.kandilli.gov.tr
```

### PM2 Ecosystem
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'epicentra-main',
    script: './.output/server/index.mjs',
    instances: 1,
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

## 📖 Dokümantasyon

- [Bot Sistemi Kılavuzu](./EPICENTRA-BOT-GUIDE.md)
- [VPS Deployment Rehberi](./VPS-DEPLOYMENT-GUIDE.md)
- [Katkıda Bulunma](./CONTRIBUTE.MD)

## 🤝 Katkıda Bulunma

Bu proje açık kaynak ve kar amacı gütmemektedir. Katkılarınızı bekliyoruz!

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 🌟 Özellikler

- ✅ Gerçek zamanlı deprem takibi
- ✅ İnteraktif harita görünümü
- ✅ 3 farklı bot yönetim sistemi
- ✅ VPS otomatik deployment
- ✅ PM2 süreç yönetimi
- ✅ Responsive web tasarımı
- ✅ TypeScript desteği
- ✅ Modern UI/UX

## 📞 İletişim

- **Website**: [www.zelzele.io](https://www.zelzele.io)
- **GitHub**: [Epicentra Repository](https://github.com/[username]/Epicentra)

---

**⚠️ Bu proje hassas konulara dayandığı için açık kaynak ve kar amacı gütmemektedir.**

