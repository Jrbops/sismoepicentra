#!/bin/bash

# Epicentra Server & Monitoring Dashboard Auto Starter
# Bu script hem ana sunucuyu hem de monitoring dashboard'unu otomatik başlatır

echo "🚀 Epicentra Server & Monitoring Dashboard Başlatılıyor..."
echo "=================================================="

# Proje dizinine git
cd "$(dirname "$0")"

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# PM2'nin yüklü olup olmadığını kontrol et
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ PM2 bulunamadı! Lütfen PM2'yi yükleyin: npm install -g pm2${NC}"
    exit 1
fi

# Node.js'in yüklü olup olmadığını kontrol et
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js bulunamadı! Lütfen Node.js'i yükleyin${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Sistem Kontrolleri:${NC}"
echo "✅ PM2: $(pm2 --version)"
echo "✅ Node.js: $(node --version)"
echo "✅ Proje Dizini: $(pwd)"

# .output klasörünün var olup olmadığını kontrol et
if [ ! -d ".output" ]; then
    echo -e "${YELLOW}⚠️  .output klasörü bulunamadı! Proje build ediliyor...${NC}"
    echo "📦 Dependencies yükleniyor..."
    npm install
    
    echo "🔨 Proje build ediliyor..."
    npm run build
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Build işlemi başarısız!${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Build tamamlandı!${NC}"
fi

# Monitoring klasöründe dependencies kontrol et
if [ ! -d "monitoring/node_modules" ]; then
    echo -e "${YELLOW}⚠️  Monitoring dependencies yükleniyor...${NC}"
    cd monitoring
    npm install
    cd ..
    echo -e "${GREEN}✅ Monitoring dependencies yüklendi!${NC}"
fi

# Mevcut PM2 süreçlerini temizle
echo -e "${BLUE}🧹 Mevcut PM2 süreçleri temizleniyor...${NC}"
pm2 delete all 2>/dev/null || true

# Ana sunucuyu başlat
echo -e "${BLUE}🚀 Ana sunucu başlatılıyor (Port: 8080)...${NC}"
pm2 start ecosystem.config.js

# Monitoring dashboard'unu başlat
echo -e "${BLUE}📊 Monitoring dashboard başlatılıyor (Port: 9615)...${NC}"
cd monitoring
pm2 start pm2-web.js --name "monitoring-dashboard"
cd ..

# PM2 süreçlerini kaydet
pm2 save

# PM2 startup script oluştur (sistem yeniden başladığında otomatik başlasın)
pm2 startup 2>/dev/null || echo -e "${YELLOW}⚠️  PM2 startup script oluşturulamadı (root yetkisi gerekebilir)${NC}"

echo ""
echo -e "${GREEN}🎉 Tüm servisler başarıyla başlatıldı!${NC}"
echo "=================================================="
echo -e "${BLUE}📱 Ana Uygulama:${NC} http://localhost:8080"
echo -e "${BLUE}📊 Monitoring Dashboard:${NC} http://localhost:9615"
echo -e "${BLUE}🔧 PM2 Status:${NC} pm2 status"
echo -e "${BLUE}📋 PM2 Logs:${NC} pm2 logs"
echo -e "${BLUE}🛑 Durdurmak için:${NC} pm2 stop all"
echo "=================================================="

# PM2 status göster
echo -e "${BLUE}📊 Mevcut PM2 Süreçleri:${NC}"
pm2 status

echo ""
echo -e "${GREEN}✨ Epicentra Server & Monitoring Dashboard hazır!${NC}"

