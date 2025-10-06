#!/bin/bash

# 🤖 Epicentra Bot - Tek Komutla Proje Yöneticisi
# Geliştirici: Cascade AI
# Versiyon: 1.0.0
# Açıklama: Epicentra projesini tek komutla başlatır, durdurur ve yönetir

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Bot logosu
show_logo() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    🤖 EPICENTRA BOT 🤖                      ║"
    echo "║                                                              ║"
    echo "║           Tek Komutla Proje Yönetim Asistanı                ║"
    echo "║                     v1.0.0                                   ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Yardım menüsü
show_help() {
    echo -e "${WHITE}🤖 Epicentra Bot Kullanım Kılavuzu:${NC}"
    echo ""
    echo -e "${GREEN}Temel Komutlar:${NC}"
    echo -e "  ${BLUE}./epicentra-bot.sh start${NC}     - Projeyi başlat"
    echo -e "  ${BLUE}./epicentra-bot.sh stop${NC}      - Projeyi durdur"
    echo -e "  ${BLUE}./epicentra-bot.sh restart${NC}   - Projeyi yeniden başlat"
    echo -e "  ${BLUE}./epicentra-bot.sh status${NC}    - Proje durumunu göster"
    echo ""
    echo -e "${GREEN}Geliştirme Komutları:${NC}"
    echo -e "  ${BLUE}./epicentra-bot.sh dev${NC}       - Geliştirme modunda başlat"
    echo -e "  ${BLUE}./epicentra-bot.sh build${NC}     - Projeyi build et"
    echo -e "  ${BLUE}./epicentra-bot.sh logs${NC}      - Logları göster"
    echo ""
    echo -e "${GREEN}Bakım Komutları:${NC}"
    echo -e "  ${BLUE}./epicentra-bot.sh install${NC}   - Dependencies yükle"
    echo -e "  ${BLUE}./epicentra-bot.sh clean${NC}     - Cache temizle"
    echo -e "  ${BLUE}./epicentra-bot.sh update${NC}    - Projeyi güncelle"
    echo ""
    echo -e "${GREEN}Yardım:${NC}"
    echo -e "  ${BLUE}./epicentra-bot.sh help${NC}      - Bu yardım menüsünü göster"
    echo ""
}

# Sistem gereksinimlerini kontrol et
check_requirements() {
    echo -e "${BLUE}🔍 Sistem gereksinimleri kontrol ediliyor...${NC}"
    
    local missing_deps=()
    
    # Node.js kontrolü
    if ! command -v node &> /dev/null; then
        missing_deps+=("Node.js")
    else
        echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
    fi
    
    # NPM kontrolü
    if ! command -v npm &> /dev/null; then
        missing_deps+=("NPM")
    else
        echo -e "${GREEN}✅ NPM: $(npm --version)${NC}"
    fi
    
    # PM2 kontrolü
    if ! command -v pm2 &> /dev/null; then
        echo -e "${YELLOW}⚠️  PM2 bulunamadı, yükleniyor...${NC}"
        npm install -g pm2
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ PM2 başarıyla yüklendi!${NC}"
        else
            missing_deps+=("PM2")
        fi
    else
        echo -e "${GREEN}✅ PM2: $(pm2 --version)${NC}"
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        echo -e "${RED}❌ Eksik bağımlılıklar: ${missing_deps[*]}${NC}"
        echo -e "${YELLOW}Lütfen eksik bağımlılıkları yükleyin ve tekrar deneyin.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Tüm sistem gereksinimleri karşılanıyor!${NC}"
}

# Dependencies yükle
install_dependencies() {
    echo -e "${BLUE}📦 Dependencies yükleniyor...${NC}"
    
    # Ana proje dependencies
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Ana proje dependencies yükleniyor...${NC}"
        npm install
        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ Ana proje dependencies yüklenemedi!${NC}"
            exit 1
        fi
    fi
    
    # Monitoring dependencies
    if [ -d "monitoring" ] && [ ! -d "monitoring/node_modules" ]; then
        echo -e "${YELLOW}Monitoring dependencies yükleniyor...${NC}"
        cd monitoring
        npm install
        cd ..
        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ Monitoring dependencies yüklenemedi!${NC}"
            exit 1
        fi
    fi
    
    echo -e "${GREEN}✅ Tüm dependencies yüklendi!${NC}"
}

# Projeyi build et
build_project() {
    echo -e "${BLUE}🔨 Proje build ediliyor...${NC}"
    
    npm run build
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Build işlemi başarısız!${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Build tamamlandı!${NC}"
}

# Projeyi başlat
start_project() {
    echo -e "${BLUE}🚀 Epicentra başlatılıyor...${NC}"
    
    # Gereksinimler kontrol et
    check_requirements
    
    # Dependencies kontrol et
    install_dependencies
    
    # Build kontrol et
    if [ ! -d ".output" ]; then
        build_project
    fi
    
    # Mevcut PM2 süreçlerini temizle
    pm2 delete all 2>/dev/null || true
    
    # Ana sunucuyu başlat
    if [ -f "ecosystem.config.js" ]; then
        pm2 start ecosystem.config.js
    else
        pm2 start npm --name "epicentra-main" -- start
    fi
    
    # Monitoring dashboard'unu başlat (varsa)
    if [ -f "monitoring/pm2-web.js" ]; then
        cd monitoring
        pm2 start pm2-web.js --name "monitoring-dashboard"
        cd ..
    fi
    
    # PM2 süreçlerini kaydet
    pm2 save
    
    echo -e "${GREEN}🎉 Epicentra başarıyla başlatıldı!${NC}"
    show_urls
}

# Geliştirme modunda başlat
start_dev() {
    echo -e "${BLUE}🛠️  Geliştirme modunda başlatılıyor...${NC}"
    
    check_requirements
    install_dependencies
    
    echo -e "${CYAN}Geliştirme sunucusu başlatılıyor...${NC}"
    npm run dev
}

# Projeyi durdur
stop_project() {
    echo -e "${BLUE}🛑 Epicentra durduruluyor...${NC}"
    
    pm2 stop all
    pm2 delete all
    
    echo -e "${GREEN}✅ Epicentra durduruldu!${NC}"
}

# Projeyi yeniden başlat
restart_project() {
    echo -e "${BLUE}🔄 Epicentra yeniden başlatılıyor...${NC}"
    
    stop_project
    sleep 2
    start_project
}

# Proje durumunu göster
show_status() {
    echo -e "${BLUE}📊 Proje Durumu:${NC}"
    echo ""
    
    if command -v pm2 &> /dev/null; then
        pm2 status
        echo ""
        show_urls
    else
        echo -e "${RED}❌ PM2 bulunamadı!${NC}"
    fi
}

# URL'leri göster
show_urls() {
    echo -e "${PURPLE}🌐 Erişim URL'leri:${NC}"
    echo -e "${CYAN}📱 Ana Uygulama:${NC} http://localhost:3000"
    echo -e "${CYAN}🔧 API:${NC} http://localhost:3000/api"
    
    # PM2 Web Dashboard varsa
    if pm2 list | grep -q "monitoring-dashboard"; then
        echo -e "${CYAN}📊 Monitoring Dashboard:${NC} http://localhost:9615"
    fi
    
    echo ""
    echo -e "${YELLOW}💡 İpucu: Logları görmek için '${BLUE}./epicentra-bot.sh logs${NC}${YELLOW}' komutunu kullanın${NC}"
}

# Logları göster
show_logs() {
    echo -e "${BLUE}📋 Epicentra Logları:${NC}"
    
    if command -v pm2 &> /dev/null; then
        pm2 logs --lines 50
    else
        echo -e "${RED}❌ PM2 bulunamadı!${NC}"
    fi
}

# Cache temizle
clean_cache() {
    echo -e "${BLUE}🧹 Cache temizleniyor...${NC}"
    
    # Nuxt cache
    rm -rf .nuxt
    rm -rf .output
    
    # Node modules (isteğe bağlı)
    read -p "Node modules'ları da temizlemek istiyor musunuz? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf node_modules
        rm -rf monitoring/node_modules 2>/dev/null || true
        echo -e "${GREEN}✅ Node modules temizlendi!${NC}"
    fi
    
    # PM2 logs
    pm2 flush 2>/dev/null || true
    
    echo -e "${GREEN}✅ Cache temizlendi!${NC}"
}

# Projeyi güncelle
update_project() {
    echo -e "${BLUE}🔄 Proje güncelleniyor...${NC}"
    
    # Git pull (eğer git repo ise)
    if [ -d ".git" ]; then
        echo -e "${YELLOW}Git güncellemesi yapılıyor...${NC}"
        git pull
    fi
    
    # Dependencies güncelle
    echo -e "${YELLOW}Dependencies güncelleniyor...${NC}"
    npm update
    
    # Monitoring dependencies güncelle
    if [ -d "monitoring" ]; then
        cd monitoring
        npm update
        cd ..
    fi
    
    # Yeniden build et
    build_project
    
    echo -e "${GREEN}✅ Proje güncellendi!${NC}"
}

# Ana fonksiyon
main() {
    # Proje dizinine git
    cd "$(dirname "$0")"
    
    # Logo göster
    show_logo
    
    # Komut kontrolü
    case "${1:-help}" in
        "start")
            start_project
            ;;
        "stop")
            stop_project
            ;;
        "restart")
            restart_project
            ;;
        "status")
            show_status
            ;;
        "dev")
            start_dev
            ;;
        "build")
            build_project
            ;;
        "logs")
            show_logs
            ;;
        "install")
            check_requirements
            install_dependencies
            ;;
        "clean")
            clean_cache
            ;;
        "update")
            update_project
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            echo -e "${RED}❌ Bilinmeyen komut: $1${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Scripti çalıştır
main "$@"
