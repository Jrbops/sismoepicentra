#!/bin/bash

# 🔧 Pip Yükleme Yardımcısı
# Python pip'i farklı yöntemlerle yüklemeye çalışır

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 Python pip yükleme yardımcısı${NC}"
echo ""

# Mevcut durumu kontrol et
echo -e "${YELLOW}Mevcut durum kontrol ediliyor...${NC}"
echo -e "Python3: $(python3 --version 2>/dev/null || echo 'Bulunamadı')"

if command -v pip3 &> /dev/null; then
    echo -e "${GREEN}✅ pip3 zaten yüklü: $(pip3 --version)${NC}"
    exit 0
elif python3 -m pip --version &> /dev/null; then
    echo -e "${GREEN}✅ pip modülü mevcut: $(python3 -m pip --version)${NC}"
    echo -e "${BLUE}💡 'python3 -m pip' komutunu kullanabilirsiniz${NC}"
    exit 0
fi

echo -e "${YELLOW}⚠️  pip bulunamadı, yükleme denenecek...${NC}"
echo ""

# İşletim sistemi tespiti
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    echo -e "${BLUE}İşletim Sistemi: $OS${NC}"
else
    OS=$(uname -s)
    echo -e "${BLUE}İşletim Sistemi: $OS${NC}"
fi

echo ""
echo -e "${YELLOW}Hangi yöntemi denemek istiyorsunuz?${NC}"
echo ""
echo -e "${GREEN}1.${NC} Paket yöneticisi ile yükleme (önerilen)"
echo -e "${GREEN}2.${NC} get-pip.py ile manuel yükleme"
echo -e "${GREEN}3.${NC} Sadece gerekli kütüphaneleri --user ile yükle"
echo -e "${GREEN}4.${NC} Çıkış"
echo ""

read -p "Seçiminiz (1-4): " choice

case $choice in
    1)
        echo -e "${BLUE}📦 Paket yöneticisi ile pip yükleniyor...${NC}"
        
        if command -v apt &> /dev/null; then
            echo -e "${YELLOW}Ubuntu/Debian tespit edildi${NC}"
            sudo apt update
            sudo apt install -y python3-pip python3-venv
        elif command -v yum &> /dev/null; then
            echo -e "${YELLOW}RedHat/CentOS tespit edildi${NC}"
            sudo yum install -y python3-pip
        elif command -v dnf &> /dev/null; then
            echo -e "${YELLOW}Fedora tespit edildi${NC}"
            sudo dnf install -y python3-pip
        elif command -v pacman &> /dev/null; then
            echo -e "${YELLOW}Arch Linux tespit edildi${NC}"
            sudo pacman -S python-pip
        elif command -v zypper &> /dev/null; then
            echo -e "${YELLOW}openSUSE tespit edildi${NC}"
            sudo zypper install python3-pip
        else
            echo -e "${RED}❌ Desteklenen paket yöneticisi bulunamadı!${NC}"
            echo -e "${YELLOW}Manuel yükleme gerekiyor.${NC}"
            exit 1
        fi
        ;;
    
    2)
        echo -e "${BLUE}🌐 get-pip.py ile manuel yükleme...${NC}"
        
        # get-pip.py indir
        if command -v curl &> /dev/null; then
            curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
        elif command -v wget &> /dev/null; then
            wget https://bootstrap.pypa.io/get-pip.py
        else
            echo -e "${RED}❌ curl veya wget bulunamadı!${NC}"
            echo -e "${YELLOW}Manuel indirme gerekiyor:${NC}"
            echo -e "${BLUE}https://bootstrap.pypa.io/get-pip.py${NC}"
            exit 1
        fi
        
        # pip yükle
        python3 get-pip.py --user
        
        # Temizlik
        rm -f get-pip.py
        
        # PATH güncelleme
        echo -e "${YELLOW}💡 ~/.bashrc dosyanıza şu satırı ekleyin:${NC}"
        echo -e "${BLUE}export PATH=\"\$HOME/.local/bin:\$PATH\"${NC}"
        ;;
    
    3)
        echo -e "${BLUE}📦 Doğrudan kütüphane yüklemesi deneniyor...${NC}"
        
        # Python ile doğrudan yükleme dene
        python3 -c "
import subprocess
import sys

packages = ['textual', 'rich', 'psutil']
for package in packages:
    try:
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--user', package])
        print(f'✅ {package} yüklendi')
    except:
        print(f'❌ {package} yüklenemedi')
"
        ;;
    
    4)
        echo -e "${GREEN}👋 Çıkış yapılıyor...${NC}"
        exit 0
        ;;
    
    *)
        echo -e "${RED}❌ Geçersiz seçim!${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}🔍 Yükleme sonrası kontrol...${NC}"

if command -v pip3 &> /dev/null; then
    echo -e "${GREEN}✅ pip3 başarıyla yüklendi: $(pip3 --version)${NC}"
elif python3 -m pip --version &> /dev/null; then
    echo -e "${GREEN}✅ pip modülü kullanılabilir: $(python3 -m pip --version)${NC}"
else
    echo -e "${RED}❌ pip hala bulunamadı!${NC}"
    echo ""
    echo -e "${YELLOW}Manuel çözümler:${NC}"
    echo -e "${BLUE}1. Sistem yöneticinizle iletişime geçin${NC}"
    echo -e "${BLUE}2. Python'u yeniden yükleyin${NC}"
    echo -e "${BLUE}3. Alternatif Python dağıtımı kullanın (Anaconda, Miniconda)${NC}"
fi

echo ""
echo -e "${GREEN}✨ İşlem tamamlandı!${NC}"
