#!/bin/bash

# 🔧 Node.js Kurulum Sorunu Düzeltme ve Deployment
# VPS: 72.61.22.80

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
echo "║            🔧 NODE.JS FIX & DEPLOYMENT 🔧                   ║"
echo "║                                                              ║"
echo "║  Node.js kurulum sorunu düzeltiliyor ve deployment yapılıyor║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${BLUE}🔧 Node.js Kurulum Sorunu Düzeltiliyor...${NC}"
echo "----------------------------------------"

ssh $VPS_USER@$VPS_IP << 'EOF'
    set -e
    
    echo "🗑️  Eski Node.js kurulumları temizleniyor..."
    apt remove -y nodejs npm 2>/dev/null || true
    apt autoremove -y
    
    echo "📦 NodeSource repository temizleniyor..."
    rm -f /etc/apt/sources.list.d/nodesource.list
    rm -f /usr/share/keyrings/nodesource.gpg
    
    echo "🔄 Paket listesi güncelleniyor..."
    apt update
    
    echo "📥 NodeSource GPG anahtarı indiriliyor..."
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource.gpg.key | gpg --dearmor -o /usr/share/keyrings/nodesource.gpg
    
    echo "📝 NodeSource repository ekleniyor..."
    echo "deb [signed-by=/usr/share/keyrings/nodesource.gpg] https://deb.nodesource.com/node_18.x noble main" > /etc/apt/sources.list.d/nodesource.list
    
    echo "🔄 Paket listesi yeniden güncelleniyor..."
    apt update
    
    echo "📦 Node.js 18.x yükleniyor..."
    apt install -y nodejs
    
    echo "🔧 Node.js sürümü kontrol ediliyor..."
    node --version
    npm --version
    
    echo "🔧 PM2 global yükleniyor..."
    npm install -g pm2
    
    echo "✅ Node.js ve PM2 başarıyla yüklendi!"
EOF

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Node.js kurulumunda hata!${NC}"
    echo -e "${YELLOW}Manuel kurulum deneyin:${NC}"
    echo -e "${BLUE}ssh root@72.61.22.80${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js kurulum sorunu çözüldü!${NC}"
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

echo -e "${BLUE}📦 Bağımlılıkları Yükleme ve Yapılandırma${NC}"
echo "----------------------------------------"

ssh $VPS_USER@$VPS_IP << 'EOF'
    set -e
    cd /root/apps/Epicentra
    
    echo "📦 Node.js bağımlılıkları yükleniyor..."
    npm install
    
    echo "🐍 Python bağımlılıkları yükleniyor..."
    pip3 install textual rich psutil --break-system-packages
    
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

echo -e "${BLUE}🌐 Nginx Yapılandırması${NC}"
echo "----------------------------------------"

ssh $VPS_USER@$VPS_IP << 'EOF'
    # Port 80'de çalışan servisi durdur
    echo "🛑 Port 80'de çalışan servisleri kontrol ediliyor..."
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
    
    echo "✅ Nginx yapılandırıldı ve başlatıldı!"
EOF

echo -e "${GREEN}✅ Nginx yapılandırması tamamlandı!${NC}"
echo ""

echo -e "${BLUE}🔍 Final Durum Kontrolü${NC}"
echo "----------------------------------------"

ssh $VPS_USER@$VPS_IP << 'EOF'
    cd /root/apps/Epicentra
    
    echo "📊 PM2 Durum:"
    pm2 status
    
    echo ""
    echo "🌐 Nginx Durum:"
    systemctl status nginx --no-pager -l | head -5
    
    echo ""
    echo "🔌 Port Durumu:"
    netstat -tulpn | grep -E ':80|:3000'
    
    echo ""
    echo "📋 Son Loglar:"
    pm2 logs --lines 5 --nostream
EOF

echo ""
echo -e "${GREEN}🎉 DEPLOYMENT BAŞARILI! 🎉${NC}"
echo "=================================="
echo ""
echo -e "${BLUE}🌐 Erişim URL'leri:${NC}"
echo -e "${CYAN}Ana Site:${NC} http://72.61.22.80"
echo -e "${CYAN}Direct Port:${NC} http://72.61.22.80:3000"
echo ""
echo -e "${BLUE}🤖 Bot Sistemi Kullanımı:${NC}"
echo -e "${CYAN}SSH Bağlantısı:${NC} ssh root@72.61.22.80"
echo -e "${CYAN}Bot Manager:${NC} cd /root/apps/Epicentra && ./epicentra-manager.sh"
echo -e "${CYAN}TUI Bot:${NC} ./start-tui.sh"
echo -e "${CYAN}Debug TUI:${NC} ./epicentra-debug-tui.py"
echo ""
echo -e "${BLUE}📊 Monitoring:${NC}"
echo -e "${CYAN}PM2 Status:${NC} ssh root@72.61.22.80 'pm2 status'"
echo -e "${CYAN}Loglar:${NC} ssh root@72.61.22.80 'pm2 logs'"
echo -e "${CYAN}Nginx Status:${NC} ssh root@72.61.22.80 'systemctl status nginx'"
echo ""
echo -e "${GREEN}✨ Epicentra başarıyla VPS'e deploy edildi!${NC}"
