# 🤖 Epicentra Bot Sistemi - Kapsamlı Kullanım Kılavuzu

Epicentra projeniz için geliştirilmiş **3 farklı bot seçeneği** ile projenizi tek komutla yönetin!

## 🚀 Hızlı Başlangıç

```bash
# Ana yönetici ile başlayın
./epicentra-manager.sh
```

## 🎯 Bot Seçenekleri

### 1. 🖥️ Terminal Grafik Arayüzü (TUI Bot) - **ÖNERİLEN**

**En kapsamlı ve modern seçenek!**

```bash
# Doğrudan başlatma
./start-tui.sh

# Veya ana yöneticiden seçim yapın
./epicentra-manager.sh
```

#### ✨ TUI Bot Özellikleri:
- **5 Sekmeli Arayüz**: Kontrol, Durum, Süreçler, Sistem, Loglar
- **Gerçek Zamanlı İzleme**: 5 saniyede bir otomatik güncelleme
- **Renkli ve İnteraktif**: Modern terminal arayüzü
- **Sistem Monitörü**: CPU, RAM, Disk kullanımı görsel çubuklar
- **PM2 Entegrasyonu**: Süreç yönetimi ve detayları
- **Canlı Loglar**: Gerçek zamanlı log akışı
- **Log Kaydetme**: Logları dosyaya kaydetme özelliği

#### 🎮 TUI Navigasyon:
- **Tab**: Sekmeler arası geçiş
- **Enter**: Buton tıklama
- **Yön Tuşları**: Menüde gezinme
- **Ctrl+C**: Çıkış

### 2. 🌐 Web Dashboard

**Tarayıcı tabanlı grafik arayüz**

```bash
# Web dashboard başlatma
./start-dashboard.sh
```

#### ✨ Web Dashboard Özellikleri:
- **Modern Web Arayüzü**: Responsive tasarım
- **Socket.IO**: Gerçek zamanlı güncellemeler
- **Uzaktan Erişim**: Ağ üzerinden erişim
- **Port**: 3001
- **URL**: http://localhost:3001

### 3. ⚡ Komut Satırı Bot (CLI)

**Hızlı ve pratik komut çalıştırma**

```bash
# Doğrudan komut çalıştırma
./epicentra-bot.sh [komut]

# Örnek kullanımlar:
./epicentra-bot.sh start     # Projeyi başlat
./epicentra-bot.sh stop      # Projeyi durdur
./epicentra-bot.sh status    # Durumu göster
./epicentra-bot.sh help      # Yardım menüsü
```

## 📋 Komut Listesi

Tüm botlarda kullanılabilen komutlar:

| Komut | Açıklama |
|-------|----------|
| `start` | Projeyi başlat |
| `stop` | Projeyi durdur |
| `restart` | Projeyi yeniden başlat |
| `status` | Proje durumunu göster |
| `dev` | Geliştirme modunda başlat |
| `build` | Projeyi build et |
| `logs` | Logları göster |
| `install` | Dependencies yükle |
| `clean` | Cache temizle |
| `update` | Projeyi güncelle |
| `help` | Yardım menüsü |

## 🔧 Sistem Gereksinimleri

### Temel Gereksinimler (Tüm Botlar)
- **Node.js** 16+ 
- **NPM** veya **Yarn**
- **PM2** (global): `npm install -g pm2`
- **Bash** shell

### TUI Bot İçin Ek Gereksinimler
- **Python 3.7+**
- **pip3**
- **Python Kütüphaneleri**:
  ```bash
  pip3 install textual rich psutil
  ```

### Web Dashboard İçin Ek Gereksinimler
- **Express.js**
- **Socket.IO**
- **Modern tarayıcı**

## 🚀 Kurulum Adımları

### 1. Otomatik Kurulum (Önerilen)
```bash
# Ana yöneticiyi çalıştırın - otomatik kurulum yapar
./epicentra-manager.sh
```

### 2. Manuel TUI Kurulum
```bash
# Python kütüphanelerini yükle
pip3 install textual rich psutil

# TUI Bot'u başlat
./start-tui.sh
```

### 3. Manuel Web Dashboard Kurulum
```bash
# Dashboard dizinine git
cd epicentra-dashboard

# Dependencies yükle
npm install

# Dashboard'u başlat
cd ..
./start-dashboard.sh
```

## 🎨 TUI Bot Detaylı Kullanım

### Sekmeler

#### 🎮 Kontrol Sekmesi
- **Başlat/Durdur/Yeniden Başlat**: Temel proje kontrolü
- **Dev Mode**: `npm run dev` ile geliştirme sunucusu
- **Build/Install/Clean/Update**: Proje bakım işlemleri
- **Otomatik Yenileme**: Açma/kapama switch'i

#### 📊 Durum Sekmesi
- **Proje Durumu**: package.json varlığı
- **Dependencies**: node_modules kontrolü
- **Build**: .output klasörü kontrolü
- **PM2**: Çalışan süreç sayısı

#### 🔧 Süreçler Sekmesi
- **PM2 Süreç Listesi**: Tüm çalışan süreçler
- **Süreç Detayları**: PID, CPU, RAM kullanımı
- **Durum İkonları**: 🟢 Online, 🔴 Stopped, 🟡 Error

#### 💻 Sistem Sekmesi
- **CPU Kullanımı**: Görsel çubuk ile yüzde
- **RAM Kullanımı**: GB cinsinden detay
- **Disk Kullanımı**: GB cinsinden detay

#### 📋 Loglar Sekmesi
- **Gerçek Zamanlı Loglar**: Anlık log akışı
- **Renkli Seviyeler**: Info, Error, Warning, Success
- **Log Kaydetme**: Timestamp ile dosyaya kaydet
- **Log Temizleme**: Ekranı temizle

## 🎯 Hangi Bot'u Seçmeli?

### 🖥️ TUI Bot Seçin Eğer:
- ✅ Kapsamlı izleme istiyorsanız
- ✅ Modern terminal arayüzü seviyorsanız
- ✅ Sistem kaynaklarını izlemek istiyorsanız
- ✅ Gerçek zamanlı güncellemeler önemliyse

### 🌐 Web Dashboard Seçin Eğer:
- ✅ Tarayıcıda çalışmayı tercih ediyorsanız
- ✅ Uzaktan erişim gerekiyorsa
- ✅ Grafik arayüz önemliyse
- ✅ Mobil uyumlu arayüz istiyorsanız

### ⚡ CLI Bot Seçin Eğer:
- ✅ Hızlı komut çalıştırma yeterli
- ✅ Script'lerle otomasyona entegre edecekseniz
- ✅ Minimal kaynak kullanımı istiyorsanız
- ✅ Basit ve direkt kontrol tercih ediyorsanız

## 🔧 Sorun Giderme

### Python Kütüphane Hataları
```bash
# Kütüphaneleri yeniden yükle
pip3 install --upgrade textual rich psutil

# Virtual environment kullan
python3 -m venv venv
source venv/bin/activate
pip install textual rich psutil
```

### PM2 Bulunamadı
```bash
# PM2'yi global yükle
npm install -g pm2

# PM2 durumunu kontrol et
pm2 status
```

### Port Çakışması
```bash
# Kullanılan portları kontrol et
netstat -tulpn | grep :3001
netstat -tulpn | grep :3000

# PM2 süreçlerini temizle
pm2 delete all
```

### Yetki Hataları
```bash
# Tüm script'leri çalıştırılabilir yap
chmod +x *.sh *.py

# Proje dizini yetkilerini kontrol et
ls -la
```

## 📊 Performans İpuçları

### TUI Bot Optimizasyonu
- Otomatik yenilemeyi kapatarak CPU kullanımını azaltın
- Log buffer boyutunu ayarlayın
- Gereksiz sekmeleri kapatın

### Sistem İzleme
- CPU kullanımı %80'in üzerine çıkmamalı
- RAM kullanımı %90'ın altında tutun
- PM2 süreçlerini düzenli kontrol edin

## 🎉 Özellik Önerileri

Gelecek sürümlerde eklenebilecek özellikler:
- 📱 Mobile responsive TUI
- 🔔 Bildirim sistemi
- 📈 Performans grafikleri
- 🔒 Kullanıcı yetkilendirmesi
- 🌍 Çoklu dil desteği

## 📞 Destek

Sorun yaşadığınızda:
1. Bu kılavuzu kontrol edin
2. `./epicentra-bot.sh help` komutunu çalıştırın
3. Log dosyalarını inceleyin
4. Sistem gereksinimlerini doğrulayın

---

**🤖 Epicentra Bot Sistemi** - Projenizi yönetmenin en kolay yolu!
