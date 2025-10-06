#!/bin/bash

# 🚀 Epicentra Dashboard Başlatıcı
# Bu script hem ana projeyi hem de dashboard'u başlatır

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logo
echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                🚀 EPICENTRA DASHBOARD LAUNCHER 🚀           ║"
echo "║                                                              ║"
echo "║           Grafik Arayüzlü Proje Yönetim Sistemi             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Proje dizinine git
cd "$(dirname "$0")"

echo -e "${BLUE}📋 Sistem Hazırlığı...${NC}"

# Node.js kontrolü
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js bulunamadı! Lütfen Node.js'i yükleyin${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"

# Dashboard dizinine git ve dependencies yükle
echo -e "${YELLOW}📦 Dashboard dependencies kontrol ediliyor...${NC}"
cd epicentra-dashboard

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Dependencies yükleniyor...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Dashboard dependencies yüklenemedi!${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Dashboard dependencies yüklendi!${NC}"
fi

# Ana proje bot'unu çalıştırılabilir yap
cd ..
chmod +x epicentra-bot.sh 2>/dev/null || true

echo -e "${BLUE}🚀 Dashboard başlatılıyor...${NC}"

# Dashboard'u arka planda başlat
cd epicentra-dashboard
node server.js &
DASHBOARD_PID=$!

# Dashboard'un başlamasını bekle
sleep 3

echo ""
echo -e "${GREEN}🎉 Epicentra Dashboard başarıyla başlatıldı!${NC}"
echo "================================================================"
echo -e "${PURPLE}🌐 Dashboard URL:${NC} http://localhost:3001"
echo -e "${PURPLE}🤖 Ana Proje Kontrolü:${NC} Dashboard üzerinden yapabilirsiniz"
echo -e "${PURPLE}🔧 Manuel Kontrol:${NC} ./epicentra-bot.sh [komut]"
echo "================================================================"

echo -e "${CYAN}💡 Dashboard Özellikleri:${NC}"
echo "• 🎮 Grafik arayüzlü proje kontrolü"
echo "• 📊 Gerçek zamanlı durum izleme"
echo "• 📋 Canlı log görüntüleme"
echo "• 🔄 Otomatik süreç yönetimi"
echo "• 📱 Responsive tasarım"

echo ""
echo -e "${YELLOW}⚠️  Dashboard'u durdurmak için Ctrl+C tuşlarına basın${NC}"

# Dashboard sürecini takip et
wait $DASHBOARD_PID
