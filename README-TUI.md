# 🤖 Epicentra TUI Bot

Terminal Grafik Arayüzlü Proje Yöneticisi - Modern terminal arayüzü ile Epicentra projenizi kolayca yönetin!

## ✨ Özellikler

### 🎮 Kontrol Paneli
- **Başlat/Durdur/Yeniden Başlat**: Projeyi tek tıkla kontrol edin
- **Dev Mode**: Geliştirme modunda çalıştırın
- **Build/Install/Clean/Update**: Proje bakım işlemleri
- **Otomatik Yenileme**: Gerçek zamanlı durum güncellemeleri

### 📊 Durum İzleme
- **Proje Durumu**: Package.json, dependencies, build durumu
- **PM2 Süreçleri**: Çalışan süreçlerin detaylı görünümü
- **Sistem Kaynakları**: CPU, RAM, Disk kullanımı
- **Gerçek Zamanlı Güncelleme**: 5 saniyede bir otomatik yenileme

### 🔧 Süreç Yönetimi
- **PM2 Entegrasyonu**: Tüm süreçleri görüntüleyin
- **Süreç Detayları**: PID, CPU, bellek kullanımı
- **Yeniden Başlatma Sayacı**: Süreç kararlılığını izleyin

### 📋 Log Yönetimi
- **Gerçek Zamanlı Loglar**: Anlık log akışı
- **Log Filtreleme**: Seviyeye göre renkli görünüm
- **Log Kaydetme**: Logları dosyaya kaydedin
- **Log Temizleme**: Ekranı temizleyin

### 💻 Sistem İzleme
- **Kaynak Kullanımı**: CPU, RAM, Disk görsel çubuklar
- **Gerçek Zamanlı Metrikler**: Anlık sistem durumu
- **Performans İzleme**: Sistem yükünü takip edin

## 🚀 Kurulum

### Gereksinimler
- Python 3.7+
- pip3
- Node.js (Epicentra projesi için)
- PM2 (süreç yönetimi için)

### Otomatik Kurulum
```bash
# TUI Bot'u başlat (otomatik kurulum yapar)
./start-tui.sh
```

### Manuel Kurulum
```bash
# Python kütüphanelerini yükle
pip3 install textual rich psutil

# TUI Bot'u çalıştır
python3 epicentra-tui.py
```

### Virtual Environment ile Kurulum
```bash
# Virtual environment oluştur
python3 -m venv venv
source venv/bin/activate

# Kütüphaneleri yükle
pip install textual rich psutil

# TUI Bot'u çalıştır
python3 epicentra-tui.py
```

## 🎯 Kullanım

### Başlatma
```bash
# Otomatik kurulum ve başlatma
./start-tui.sh

# Doğrudan çalıştırma
python3 epicentra-tui.py
```

### Navigasyon
- **Tab Tuşu**: Sekmeler arası geçiş
- **Enter**: Butonlara tıklama
- **Yön Tuşları**: Menüde gezinme
- **Ctrl+C**: Çıkış

### Sekmeler

#### 1. 🎮 Kontrol
- Proje başlatma/durdurma butonları
- Geliştirme ve bakım komutları
- Otomatik yenileme ayarları

#### 2. 📊 Durum
- Proje bileşenlerinin durumu
- Dependencies kontrolü
- Build durumu
- PM2 süreç sayısı

#### 3. 🔧 Süreçler
- PM2 süreç listesi
- Süreç detayları (PID, CPU, RAM)
- Yeniden başlatma sayaçları

#### 4. 💻 Sistem
- CPU kullanımı (görsel çubuk)
- RAM kullanımı (GB cinsinden)
- Disk kullanımı (GB cinsinden)

#### 5. 📋 Loglar
- Gerçek zamanlı log akışı
- Renkli log seviyeleri
- Log kaydetme/temizleme

## 🎨 Görsel Özellikler

### Renkli Arayüz
- **Yeşil**: Başarılı işlemler
- **Kırmızı**: Hata durumları
- **Sarı**: Uyarılar
- **Mavi**: Bilgi mesajları
- **Mor**: Başlıklar

### İkonlar
- 🚀 Başlat
- 🛑 Durdur
- 🔄 Yeniden Başlat
- 🛠️ Geliştirme
- 🔨 Build
- 📦 Install
- 🧹 Temizle
- ✅ Başarılı
- ❌ Hata
- ⚠️ Uyarı

### Animasyonlar
- Gerçek zamanlı veri güncelleme
- Smooth geçişler
- Responsive tasarım

## 🔧 Yapılandırma

### Otomatik Yenileme
- Varsayılan: 5 saniye
- Kapatılabilir: Kontrol sekmesindeki switch
- Manuel yenileme: "Durumu Yenile" butonu

### Log Ayarları
- Maksimum log sayısı: 1000
- Görüntülenen log: Son 50
- Otomatik kaydetme: Timestamp ile

## 🐛 Sorun Giderme

### Kütüphane Hataları
```bash
# Kütüphaneleri yeniden yükle
pip3 install --upgrade textual rich psutil
```

### Python Sürüm Uyumsuzluğu
```bash
# Python sürümünü kontrol et
python3 --version

# En az Python 3.7 gerekli
```

### PM2 Bulunamadı
```bash
# PM2'yi global yükle
npm install -g pm2
```

### Yetki Hataları
```bash
# Script'i çalıştırılabilir yap
chmod +x start-tui.sh
chmod +x epicentra-tui.py
```

## 📝 Log Dosyaları

Loglar otomatik olarak kaydedilebilir:
- Format: `epicentra_logs_YYYYMMDD_HHMMSS.txt`
- Konum: Proje ana dizini
- İçerik: Tüm TUI bot logları

## 🔄 Güncellemeler

TUI Bot otomatik olarak:
- Proje durumunu izler
- PM2 süreçlerini takip eder
- Sistem kaynaklarını monitör eder
- Logları gerçek zamanlı gösterir

## 💡 İpuçları

1. **Performans**: Otomatik yenilemeyi kapatarak CPU kullanımını azaltın
2. **Loglar**: Uzun işlemler için log sekmesini açık tutun
3. **Sistem**: Sistem sekmesinde kaynak kullanımını izleyin
4. **Süreçler**: PM2 süreçlerini düzenli kontrol edin

## 🤝 Katkıda Bulunma

Bu TUI bot açık kaynak kodludur. Geliştirmeler ve öneriler için:
- Issue açın
- Pull request gönderin
- Feedback verin

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

---

**🤖 Epicentra TUI Bot** - Terminal'de modern proje yönetimi deneyimi!
