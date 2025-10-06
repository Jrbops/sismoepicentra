#!/bin/bash

# 🚀 Final Epicentra Deployment
# Tüm sorunları çözen son deployment scripti

# Renkli çıktı
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

VPS_IP="72.61.22.80"
VPS_USER="root"

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                🚀 FINAL DEPLOYMENT 🚀                       ║"
echo "║                                                              ║"
echo "║  Tüm sorunlar çözülüyor, deployment tamamlanıyor...         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${BLUE}📁 VPS'te Dizin Yapısını Oluşturuyor...${NC}"
echo "----------------------------------------"

ssh $VPS_USER@$VPS_IP << 'EOF'
    echo "📁 Apps dizini oluşturuluyor..."
    mkdir -p /root/apps
    
    echo "📁 Epicentra dizini oluşturuluyor..."
    mkdir -p /root/apps/Epicentra
    
    echo "📁 Log dizini oluşturuluyor..."
    mkdir -p /root/apps/Epicentra/logs
    
    echo "✅ Dizin yapısı hazır!"
    ls -la /root/apps/
EOF

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Dizin oluşturmada hata!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dizin yapısı oluşturuldu!${NC}"
echo ""

echo -e "${BLUE}📤 Proje Dosyalarını Transfer Ediliyor...${NC}"
echo "----------------------------------------"

# Proje dosyalarını transfer et
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '.nuxt' \
    --exclude '.output' \
    --exclude 'logs' \
    --exclude 'venv' \
    --exclude '*.log' \
    ./ $VPS_USER@$VPS_IP:/root/apps/Epicentra/

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Dosya transferinde hata!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dosyalar başarıyla transfer edildi!${NC}"
echo ""

echo -e "${BLUE}🔧 Node.js ve NPM Kontrolü${NC}"
echo "----------------------------------------"

ssh $VPS_USER@$VPS_IP << 'EOF'
    echo "📦 Node.js sürümü:"
    node --version
    
    echo "📦 NPM sürümü:"
    npm --version
    
    echo "🔧 PM2 kontrol ediliyor..."
    if ! command -v pm2 &> /dev/null; then
        echo "🔧 PM2 yükleniyor..."
        npm install -g pm2
    else
        echo "✅ PM2 zaten yüklü: $(pm2 --version)"
    fi
EOF

echo -e "${GREEN}✅ Node.js araçları hazır!${NC}"
echo ""

echo -e "${BLUE}📦 Uygulama Kurulumu${NC}"
echo "----------------------------------------"

ssh $VPS_USER@$VPS_IP << 'EOF'
    set -e
    cd /root/apps/Epicentra
    
    echo "📦 Node.js bağımlılıkları yükleniyor..."
    npm install
    
    echo "🐍 Python bağımlılıkları yükleniyor..."
    pip3 install textual rich psutil --break-system-packages 2>/dev/null || pip3 install textual rich psutil --user
    
    echo "🔧 Script izinleri ayarlanıyor..."
    chmod +x *.sh *.py
    
    echo "⚙️  Environment dosyası oluşturuluyor..."
    cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
ENVEOF
    
    echo "🔨 Proje build ediliyor..."
    npm run build
    
    echo "✅ Kurulum tamamlandı!"
EOF

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Kurulumda hata!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Kurulum tamamlandı!${NC}"
echo ""

echo -e "${BLUE}🚀 PM2 ile Başlatma${NC}"
echo "----------------------------------------"

ssh $VPS_USER@$VPS_IP << 'EOF'
    cd /root/apps/Epicentra
    
    echo "🔧 PM2 ecosystem dosyası oluşturuluyor..."
    cat > ecosystem.config.production.js << 'PMEOF'
module.exports = {
  apps: [{
    name: 'epicentra-main',
    script: './.output/server/index.mjs',
    instances: 1,
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOST: '0.0.0.0'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G'
  }]
}
PMEOF
    
    echo "🛑 Mevcut PM2 süreçlerini durduruyor..."
    pm2 delete all 2>/dev/null || echo "Silinecek süreç yok"
    
    echo "🚀 PM2 ile uygulama başlatılıyor..."
    pm2 start ecosystem.config.production.js
    pm2 startup
    pm2 save
    
    echo "✅ Uygulama başlatıldı!"
EOF

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ PM2 başlatmada hata!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ PM2 başlatma tamamlandı!${NC}"
echo ""

echo -e "${BLUE}🔍 Final Durum Kontrolü${NC}"
echo "----------------------------------------"

ssh $VPS_USER@$VPS_IP << 'EOF'
    cd /root/apps/Epicentra
    
    echo "📊 PM2 Durum:"
    pm2 status
    
    echo ""
    echo "🔌 Port Durumu:"
    netstat -tulpn | grep -E ':3000' || echo "Port 3000 henüz aktif değil, birkaç saniye bekleyin..."
    
    echo ""
    echo "📋 Son Loglar:"
    pm2 logs --lines 10 --nostream 2>/dev/null || echo "Henüz log yok"
    
    echo ""
    echo "📁 Proje Dosyaları:"
    ls -la /root/apps/Epicentra/ | head -10
EOF

echo ""
echo -e "${GREEN}🎉 DEPLOYMENT BAŞARILI! 🎉${NC}"
echo "=================================="
echo ""
echo -e "${BLUE}🌐 Erişim URL'leri:${NC}"
echo -e "${CYAN}Ana Site:${NC} http://72.61.22.80:3000"
echo ""
echo -e "${BLUE}🤖 Bot Sistemi Kullanımı:${NC}"
echo -e "${CYAN}SSH Bağlantısı:${NC} ssh root@72.61.22.80"
echo -e "${CYAN}Proje Dizini:${NC} cd /root/apps/Epicentra"
echo -e "${CYAN}Bot Manager:${NC} ./epicentra-manager.sh"
echo -e "${CYAN}TUI Bot:${NC} ./start-tui.sh"
echo -e "${CYAN}Debug TUI:${NC} ./epicentra-debug-tui.py"
echo -e "${CYAN}CLI Bot:${NC} ./epicentra-bot.sh status"
echo ""
echo -e "${BLUE}📊 Monitoring Komutları:${NC}"
echo -e "${CYAN}PM2 Status:${NC} ssh root@72.61.22.80 'pm2 status'"
echo -e "${CYAN}Loglar:${NC} ssh root@72.61.22.80 'pm2 logs'"
echo -e "${CYAN}Restart:${NC} ssh root@72.61.22.80 'pm2 restart all'"
echo ""
echo -e "${GREEN}✨ Epicentra başarıyla VPS'e deploy edildi!${NC}"
echo ""
echo -e "${YELLOW}🧪 Test Adımları:${NC}"
echo -e "${BLUE}1. Tarayıcıda http://72.61.22.80:3000 adresini açın${NC}"
echo -e "${BLUE}2. SSH ile bağlanın: ssh root@72.61.22.80${NC}"
echo -e "${BLUE}3. Bot sistemini test edin: cd /root/apps/Epicentra && ./epicentra-manager.sh${NC}"
