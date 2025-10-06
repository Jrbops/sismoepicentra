#!/bin/bash

# 🤖 Epicentra TUI Bot Başlatıcı
# Terminal Grafik Arayüzlü Proje Yöneticisi

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
echo "║                🤖 EPICENTRA TUI BOT 🤖                      ║"
echo "║                                                              ║"
echo "║           Terminal Grafik Arayüzlü Proje Yöneticisi         ║"
echo "║                     v1.0.0                                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Proje dizinine git
cd "$(dirname "$0")"

echo -e "${BLUE}📋 Sistem Hazırlığı...${NC}"

# Python kontrolü
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python3 bulunamadı! Lütfen Python3'ü yükleyin${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Python3: $(python3 --version)${NC}"

# Pip kontrolü - alternatif yöntemlerle
PIP_AVAILABLE=false
if command -v pip3 &> /dev/null; then
    echo -e "${GREEN}✅ pip3: $(pip3 --version)${NC}"
    PIP_AVAILABLE=true
elif python3 -m pip --version &> /dev/null; then
    echo -e "${GREEN}✅ pip (python3 -m pip): $(python3 -m pip --version)${NC}"
    PIP_AVAILABLE=true
    alias pip3="python3 -m pip"
else
    echo -e "${YELLOW}⚠️  pip bulunamadı, yükleme denenecek...${NC}"
    
    # pip yüklemeyi dene
    if command -v apt &> /dev/null; then
        echo -e "${BLUE}apt ile pip yükleniyor...${NC}"
        sudo apt update && sudo apt install -y python3-pip
    elif command -v yum &> /dev/null; then
        echo -e "${BLUE}yum ile pip yükleniyor...${NC}"
        sudo yum install -y python3-pip
    elif command -v pacman &> /dev/null; then
        echo -e "${BLUE}pacman ile pip yükleniyor...${NC}"
        sudo pacman -S python-pip
    else
        echo -e "${RED}❌ Paket yöneticisi bulunamadı!${NC}"
        echo -e "${YELLOW}Manuel pip yüklemesi gerekiyor:${NC}"
        echo -e "${BLUE}curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py${NC}"
        echo -e "${BLUE}python3 get-pip.py --user${NC}"
        exit 1
    fi
    
    # Yükleme sonrası kontrol
    if command -v pip3 &> /dev/null || python3 -m pip --version &> /dev/null; then
        PIP_AVAILABLE=true
        echo -e "${GREEN}✅ pip başarıyla yüklendi!${NC}"
    else
        echo -e "${RED}❌ pip yüklenemedi!${NC}"
        exit 1
    fi
fi

# Virtual environment oluştur (isteğe bağlı)
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}📦 Virtual environment oluşturuluyor...${NC}"
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo -e "${YELLOW}⚠️  Virtual environment oluşturulamadı, sistem genelinde yükleme yapılacak${NC}"
        USE_VENV=false
    else
        USE_VENV=true
        echo -e "${GREEN}✅ Virtual environment oluşturuldu!${NC}"
    fi
else
    USE_VENV=true
    echo -e "${GREEN}✅ Virtual environment mevcut${NC}"
fi

# Virtual environment'ı aktifleştir
if [ "$USE_VENV" = true ]; then
    echo -e "${BLUE}🔧 Virtual environment aktifleştiriliyor...${NC}"
    source venv/bin/activate
fi

# Requirements kontrol et ve yükle
echo -e "${YELLOW}📦 Python kütüphaneleri kontrol ediliyor...${NC}"

# Gerekli kütüphaneleri kontrol et
python3 -c "import textual, rich, psutil" 2>/dev/null
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Gerekli kütüphaneler yükleniyor...${NC}"
    
    if [ "$USE_VENV" = true ]; then
        if command -v pip &> /dev/null; then
            pip install textual rich psutil
        else
            python3 -m pip install textual rich psutil
        fi
    else
        if command -v pip3 &> /dev/null; then
            pip3 install textual rich psutil --user
        else
            python3 -m pip install textual rich psutil --user
        fi
    fi
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Kütüphaneler yüklenemedi!${NC}"
        echo -e "${YELLOW}Manuel yükleme seçenekleri:${NC}"
        echo -e "${BLUE}1. pip3 install textual rich psutil --user${NC}"
        echo -e "${BLUE}2. python3 -m pip install textual rich psutil --user${NC}"
        echo -e "${BLUE}3. sudo apt install python3-pip (Ubuntu/Debian)${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Kütüphaneler yüklendi!${NC}"
else
    echo -e "${GREEN}✅ Tüm kütüphaneler mevcut${NC}"
fi

# Bot scriptini çalıştırılabilir yap
chmod +x epicentra-bot.sh 2>/dev/null || true
chmod +x epicentra-tui.py 2>/dev/null || true

echo ""
echo -e "${GREEN}🚀 Epicentra TUI Bot başlatılıyor...${NC}"
echo -e "${CYAN}💡 Çıkmak için Ctrl+C tuşlarına basın${NC}"
echo ""

# TUI versiyonunu seç
echo -e "${YELLOW}Hangi TUI versiyonunu kullanmak istiyorsunuz?${NC}"
echo -e "${GREEN}1.${NC} Gelişmiş TUI (Textual - Önerilen)"
echo -e "${GREEN}2.${NC} Basit TUI (Rich)"
echo -e "${GREEN}3.${NC} Debug TUI (Minimal)"
echo ""
read -p "Seçiminiz (1-3): " tui_choice

case $tui_choice in
    1)
        if python3 -c "import textual" 2>/dev/null; then
            echo -e "${BLUE}Gelişmiş TUI (Textual) başlatılıyor...${NC}"
            python3 epicentra-tui.py
        else
            echo -e "${RED}❌ Textual bulunamadı!${NC}"
            echo -e "${YELLOW}Basit TUI başlatılıyor...${NC}"
            python3 epicentra-simple-tui.py
        fi
        ;;
    2)
        if python3 -c "import rich" 2>/dev/null; then
            echo -e "${BLUE}Basit TUI (Rich) başlatılıyor...${NC}"
            python3 epicentra-simple-tui.py
        else
            echo -e "${RED}❌ Rich bulunamadı!${NC}"
            echo -e "${YELLOW}Debug TUI başlatılıyor...${NC}"
            python3 epicentra-debug-tui.py
        fi
        ;;
    3)
        echo -e "${BLUE}Debug TUI başlatılıyor...${NC}"
        python3 epicentra-debug-tui.py
        ;;
    *)
        echo -e "${YELLOW}Varsayılan olarak Debug TUI başlatılıyor...${NC}"
        python3 epicentra-debug-tui.py
        ;;
esac

# Virtual environment'ı deaktive et
if [ "$USE_VENV" = true ]; then
    deactivate 2>/dev/null || true
fi

echo ""
echo -e "${GREEN}👋 Epicentra TUI Bot kapatıldı!${NC}"
