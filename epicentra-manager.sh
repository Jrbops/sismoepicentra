#!/bin/bash

# 🤖 Epicentra Manager - Tüm Bot Seçenekleri
# Ana yönetim scripti - Hangi bot'u kullanmak istediğinizi seçin

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Ana logo
show_main_logo() {
    clear
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                🤖 EPICENTRA MANAGER 🤖                      ║"
    echo "║                                                              ║"
    echo "║              Tüm Proje Yönetim Araçları                     ║"
    echo "║                     v1.0.0                                   ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Menü göster
show_menu() {
    echo -e "${WHITE}🎯 Hangi yönetim aracını kullanmak istiyorsunuz?${NC}"
    echo ""
    echo -e "${GREEN}1.${NC} ${BLUE}🖥️  Terminal Grafik Arayüzü (TUI Bot)${NC}"
    echo -e "   ${YELLOW}→ Modern terminal arayüzü, sekmeli görünüm${NC}"
    echo -e "   ${YELLOW}→ Gerçek zamanlı izleme, renkli loglar${NC}"
    echo ""
    echo -e "${GREEN}2.${NC} ${BLUE}🌐 Web Dashboard${NC}"
    echo -e "   ${YELLOW}→ Tarayıcı tabanlı grafik arayüz${NC}"
    echo -e "   ${YELLOW}→ Socket.IO ile canlı güncellemeler${NC}"
    echo ""
    echo -e "${GREEN}3.${NC} ${BLUE}⚡ Komut Satırı Bot (CLI)${NC}"
    echo -e "   ${YELLOW}→ Hızlı komut çalıştırma${NC}"
    echo -e "   ${YELLOW}→ Script tabanlı otomasyonlar${NC}"
    echo ""
    echo -e "${GREEN}4.${NC} ${BLUE}📋 Yardım ve Bilgi${NC}"
    echo -e "   ${YELLOW}→ Kullanım kılavuzları${NC}"
    echo -e "   ${YELLOW}→ Sistem gereksinimleri${NC}"
    echo ""
    echo -e "${GREEN}5.${NC} ${BLUE}🚪 Çıkış${NC}"
    echo ""
}

# TUI Bot başlat
start_tui() {
    echo -e "${BLUE}🚀 Terminal Grafik Arayüzü başlatılıyor...${NC}"
    echo ""
    
    local script_path="./start-tui.sh"
    
    if [ ! -f "$script_path" ]; then
        echo -e "${RED}❌ start-tui.sh bulunamadı!${NC}"
        echo -e "${YELLOW}Dosya yolu: $(pwd)/$script_path${NC}"
        echo -e "${YELLOW}Mevcut dosyalar:${NC}"
        ls -la *.sh 2>/dev/null || echo "Hiç .sh dosyası bulunamadı"
        return 1
    fi
    
    chmod +x "$script_path"
    
    if ! "$script_path"; then
        echo -e "${RED}❌ TUI Bot başlatılamadı!${NC}"
        return 1
    fi
}

# Web Dashboard başlat
start_web() {
    echo -e "${BLUE}🌐 Web Dashboard başlatılıyor...${NC}"
    echo ""
    
    local script_path="./start-dashboard.sh"
    
    if [ ! -f "$script_path" ]; then
        echo -e "${RED}❌ start-dashboard.sh bulunamadı!${NC}"
        echo -e "${YELLOW}Dosya yolu: $(pwd)/$script_path${NC}"
        return 1
    fi
    
    chmod +x "$script_path"
    
    if ! "$script_path"; then
        echo -e "${RED}❌ Web Dashboard başlatılamadı!${NC}"
        return 1
    fi
}

# CLI Bot başlat
start_cli() {
    echo -e "${BLUE}⚡ Komut Satırı Bot menüsü...${NC}"
    echo ""
    
    local script_path="./epicentra-bot.sh"
    
    if [ ! -f "$script_path" ]; then
        echo -e "${RED}❌ epicentra-bot.sh bulunamadı!${NC}"
        echo -e "${YELLOW}Dosya yolu: $(pwd)/$script_path${NC}"
        return 1
    fi
    
    chmod +x "$script_path"
    
    echo -e "${WHITE}Hangi komutu çalıştırmak istiyorsunuz?${NC}"
    echo ""
    echo -e "${GREEN}1.${NC} start     - Projeyi başlat"
    echo -e "${GREEN}2.${NC} stop      - Projeyi durdur"
    echo -e "${GREEN}3.${NC} restart   - Projeyi yeniden başlat"
    echo -e "${GREEN}4.${NC} status    - Proje durumunu göster"
    echo -e "${GREEN}5.${NC} dev       - Geliştirme modunda başlat"
    echo -e "${GREEN}6.${NC} build     - Projeyi build et"
    echo -e "${GREEN}7.${NC} logs      - Logları göster"
    echo -e "${GREEN}8.${NC} install   - Dependencies yükle"
    echo -e "${GREEN}9.${NC} clean     - Cache temizle"
    echo -e "${GREEN}10.${NC} update   - Projeyi güncelle"
    echo -e "${GREEN}11.${NC} help     - Yardım menüsü"
    echo -e "${GREEN}0.${NC} Ana menüye dön"
    echo ""
    
    read -p "Seçiminiz (0-11): " cli_choice
    
    case $cli_choice in
        0) return 0 ;;
        1) "$script_path" start ;;
        2) "$script_path" stop ;;
        3) "$script_path" restart ;;
        4) "$script_path" status ;;
        5) "$script_path" dev ;;
        6) "$script_path" build ;;
        7) "$script_path" logs ;;
        8) "$script_path" install ;;
        9) "$script_path" clean ;;
        10) "$script_path" update ;;
        11) "$script_path" help ;;
        *) 
            echo -e "${RED}❌ Geçersiz seçim!${NC}"
            sleep 2
            return 1
            ;;
    esac
    
    echo ""
    echo -e "${YELLOW}Komut tamamlandı. Enter tuşuna basın...${NC}"
    read -r
}

# Yardım göster
show_help() {
    echo -e "${WHITE}📋 Epicentra Manager Yardım${NC}"
    echo ""
    
    echo -e "${BLUE}🖥️  Terminal Grafik Arayüzü (TUI):${NC}"
    echo -e "   • Modern terminal arayüzü"
    echo -e "   • 5 farklı sekme (Kontrol, Durum, Süreçler, Sistem, Loglar)"
    echo -e "   • Gerçek zamanlı güncellemeler"
    echo -e "   • Renkli ve interaktif"
    echo -e "   • Gereksinimler: Python 3.7+, textual, rich, psutil"
    echo ""
    
    echo -e "${BLUE}🌐 Web Dashboard:${NC}"
    echo -e "   • Tarayıcı tabanlı arayüz"
    echo -e "   • Socket.IO ile canlı güncellemeler"
    echo -e "   • Responsive tasarım"
    echo -e "   • Port: 3001"
    echo -e "   • Gereksinimler: Node.js, Express, Socket.IO"
    echo ""
    
    echo -e "${BLUE}⚡ Komut Satırı Bot:${NC}"
    echo -e "   • Hızlı komut çalıştırma"
    echo -e "   • Bash tabanlı"
    echo -e "   • Otomatik kontroller"
    echo -e "   • Renkli çıktı"
    echo -e "   • Gereksinimler: Bash, Node.js, PM2"
    echo ""
    
    echo -e "${YELLOW}💡 İpuçları:${NC}"
    echo -e "   • TUI en kapsamlı özellikleri sunar"
    echo -e "   • Web Dashboard uzaktan erişim için idealdir"
    echo -e "   • CLI hızlı işlemler için uygundur"
    echo ""
    
    echo -e "${PURPLE}📁 Dosya Yapısı:${NC}"
    echo -e "   • epicentra-manager.sh    - Ana yönetici (bu dosya)"
    echo -e "   • start-tui.sh           - TUI başlatıcı"
    echo -e "   • epicentra-tui.py       - TUI bot kodu"
    echo -e "   • start-dashboard.sh     - Web dashboard başlatıcı"
    echo -e "   • epicentra-bot.sh       - CLI bot"
    echo -e "   • README-TUI.md          - TUI kullanım kılavuzu"
    echo ""
    
    read -p "Devam etmek için Enter tuşuna basın..." -r
}

# Hata yakalama fonksiyonu
handle_error() {
    local exit_code=$1
    local command=$2
    
    if [ $exit_code -ne 0 ]; then
        echo -e "${RED}❌ Hata oluştu: $command (Exit code: $exit_code)${NC}"
        return 1
    fi
    return 0
}

# Dosya varlık kontrolü
check_file_exists() {
    local file_path=$1
    local file_description=${2:-"Dosya"}
    
    if [ ! -f "$file_path" ]; then
        echo -e "${RED}❌ $file_description bulunamadı: $file_path${NC}"
        echo -e "${YELLOW}Mevcut dizin: $(pwd)${NC}"
        echo -e "${YELLOW}Dizin içeriği:${NC}"
        ls -la | head -10
        return 1
    fi
    return 0
}

# Sistem kontrolü
check_system() {
    echo -e "${BLUE}🔍 Sistem kontrolleri...${NC}"
    echo ""
    
    # Node.js
    if command -v node &> /dev/null; then
        echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
    else
        echo -e "${RED}❌ Node.js bulunamadı${NC}"
    fi
    
    # Python3
    if command -v python3 &> /dev/null; then
        echo -e "${GREEN}✅ Python3: $(python3 --version)${NC}"
    else
        echo -e "${RED}❌ Python3 bulunamadı${NC}"
    fi
    
    # PM2
    if command -v pm2 &> /dev/null; then
        echo -e "${GREEN}✅ PM2: $(pm2 --version)${NC}"
    else
        echo -e "${YELLOW}⚠️  PM2 bulunamadı (npm install -g pm2)${NC}"
    fi
    
    # Pip3
    if command -v pip3 &> /dev/null; then
        echo -e "${GREEN}✅ pip3: $(pip3 --version)${NC}"
    else
        echo -e "${YELLOW}⚠️  pip3 bulunamadı${NC}"
    fi
    
    echo ""
}

# Ana döngü
main() {
    # Proje dizinine git
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    cd "$script_dir" || {
        echo -e "${RED}❌ Proje dizinine geçilemedi: $script_dir${NC}"
        exit 1
    }
    
    # Gerekli dosyaların varlığını kontrol et
    local required_files=("epicentra-bot.sh")
    local missing_files=()
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -gt 0 ]; then
        echo -e "${RED}❌ Eksik dosyalar tespit edildi:${NC}"
        printf '%s\n' "${missing_files[@]}"
        echo -e "${YELLOW}Lütfen tüm bot dosyalarının mevcut olduğundan emin olun.${NC}"
        exit 1
    fi
    
    while true; do
        show_main_logo
        check_system
        show_menu
        
        read -p "Seçiminiz (1-5): " choice
        echo ""
        
        case $choice in
            1)
                if start_tui; then
                    echo -e "${GREEN}✅ TUI Bot başarıyla tamamlandı${NC}"
                else
                    echo -e "${RED}❌ TUI Bot'ta hata oluştu${NC}"
                fi
                ;;
            2)
                if start_web; then
                    echo -e "${GREEN}✅ Web Dashboard başarıyla tamamlandı${NC}"
                else
                    echo -e "${RED}❌ Web Dashboard'ta hata oluştu${NC}"
                fi
                ;;
            3)
                if start_cli; then
                    echo -e "${GREEN}✅ CLI Bot başarıyla tamamlandı${NC}"
                else
                    echo -e "${RED}❌ CLI Bot'ta hata oluştu${NC}"
                fi
                ;;
            4)
                show_help
                ;;
            5)
                echo -e "${GREEN}👋 Görüşmek üzere!${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}❌ Geçersiz seçim! Lütfen 1-5 arası bir sayı girin.${NC}"
                sleep 2
                continue
                ;;
        esac
        
        echo ""
        echo -e "${YELLOW}Ana menüye dönmek için Enter tuşuna basın...${NC}"
        read -r
    done
}

# Scripti çalıştır
main "$@"
