#!/bin/bash

# 🚀 Basit Epicentra Deployment
# Node.js zaten yüklü olduğu varsayılıyor

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
echo "║                🚀 BASIT DEPLOYMENT 🚀                       ║"
echo "║                                                              ║"
echo "║  Node.js yüklü, deployment tamamlanıyor...                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${BLUE}🧪 Node.js Kurulumu Kontrol Ediliyor...${NC}"
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

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Node.js kontrol başarısız!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js kontrolü başarılı!${NC}"
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

echo -e "${BLUE}📦 Uygulama Kurulumu ve Başlatma${NC}"
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
    
    echo "📁 Log dizini oluşturuluyor..."
    mkdir -p logs
    
    echo "⚙️  Environment dosyası oluşturuluyor..."
    cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
ENVEOF
    
    echo "🔨 Proje build ediliyor..."
    npm run build
    
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
    
    echo "✅ Uygulama başarıyla başlatıldı!"
EOF

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Uygulama kurulumunda hata!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Uygulama kurulumu tamamlandı!${NC}"
echo ""

echo -e "${BLUE}🌐 Nginx Yapılandırması (İsteğe Bağlı)${NC}"
echo "----------------------------------------"

read -p "Nginx yapılandırması yapmak istiyor musunuz? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ssh $VPS_USER@$VPS_IP << 'EOF'
        # Port 80'de çalışan servisleri kontrol et
        echo "🔍 Port 80 kontrol ediliyor..."
        netstat -tulpn | grep :80 || echo "Port 80 boş"
        
        # Apache varsa durdur
        systemctl stop apache2 2>/dev/null || echo "Apache bulunamadı"
        systemctl disable apache2 2>/dev/null || echo "Apache disable edilemedi"
        
        # Nginx yapılandırması
        cat > /etc/nginx/sites-available/epicentra << 'NGINXEOF'
server {
    listen 80;
    server_name 72.61.22.80;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINXEOF
        
        # Site'ı etkinleştir
        ln -sf /etc/nginx/sites-available/epicentra /etc/nginx/sites-enabled/
        rm -f /etc/nginx/sites-enabled/default
        
        # Nginx'i test et ve başlat
        nginx -t && systemctl restart nginx
        systemctl enable nginx
        
        echo "✅ Nginx yapılandırıldı!"
EOF
    
    echo -e "${GREEN}✅ Nginx yapılandırması tamamlandı!${NC}"
else
    echo -e "${YELLOW}⚠️  Nginx yapılandırması atlandı${NC}"
fi

echo ""

echo -e "${BLUE}🔍 Final Durum Kontrolü${NC}"
echo "----------------------------------------"

ssh $VPS_USER@$VPS_IP << 'EOF'
    cd /root/apps/Epicentra
    
    echo "📊 PM2 Durum:"
    pm2 status
    
    echo ""
    echo "🔌 Port Durumu:"
    netstat -tulpn | grep -E ':80|:3000' || echo "Portlar henüz aktif değil"
    
    echo ""
    echo "📋 Son Loglar:"
    pm2 logs --lines 5 --nostream 2>/dev/null || echo "Henüz log yok"
EOF

echo ""
echo -e "${GREEN}🎉 DEPLOYMENT TAMAMLANDI! 🎉${NC}"
echo "=================================="
echo ""
echo -e "${BLUE}🌐 Erişim URL'leri:${NC}"
echo -e "${CYAN}Direct Port:${NC} http://72.61.22.80:3000"
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${CYAN}Nginx (Port 80):${NC} http://72.61.22.80"
fi
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
echo -e "${YELLOW}💡 Bot sistemini test etmek için VPS'e bağlanın ve ./epicentra-manager.sh çalıştırın${NC}"
