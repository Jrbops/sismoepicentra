#!/bin/bash

# 🚀 Epicentra Hızlı VPS Deployment
# VPS: 72.61.22.80 (root)

# Renkli çıktı
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# VPS Bilgileri
VPS_IP="72.61.22.80"
VPS_USER="root"
APP_DIR="/root/apps/Epicentra"

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                🚀 EPICENTRA HIZLI DEPLOYMENT 🚀             ║"
echo "║                                                              ║"
echo "║  VPS: 72.61.22.80                                           ║"
echo "║  User: root                                                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${BLUE}📋 Deployment Adımları:${NC}"
echo "1. SSH anahtarı kurulumu"
echo "2. VPS sunucu hazırlığı"
echo "3. Proje dosyalarını transfer"
echo "4. Bağımlılıkları yükle"
echo "5. Uygulamayı başlat"
echo ""

read -p "Deployment'ı başlatmak istiyor musunuz? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Deployment iptal edildi${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🔐 Adım 1: SSH Anahtarı Kurulumu${NC}"
echo "----------------------------------------"

# SSH anahtarı kurulumu
if [ ! -f ~/.ssh/id_rsa ]; then
    echo "🔑 SSH anahtarı oluşturuluyor..."
    ssh-keygen -t rsa -b 4096 -C "epicentra-deployment" -f ~/.ssh/id_rsa -N ""
fi

echo "📤 SSH anahtarı VPS'e kopyalanıyor..."
echo -e "${YELLOW}⚠️  VPS şifresi: Toprak5516@1337${NC}"
ssh-copy-id -i ~/.ssh/id_rsa.pub $VPS_USER@$VPS_IP

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ SSH anahtarı kurulumu başarısız!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ SSH anahtarı kuruldu!${NC}"
echo ""

echo -e "${BLUE}🛠️  Adım 2: VPS Sunucu Hazırlığı${NC}"
echo "----------------------------------------"

ssh $VPS_USER@$VPS_IP << 'EOF'
    set -e
    echo "📦 Sistem güncelleniyor..."
    apt update && apt upgrade -y
    
    echo "🔧 Gerekli paketler yükleniyor..."
    apt install -y curl wget git nginx ufw htop unzip
    
    echo "📦 Node.js yükleniyor..."
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt install -y nodejs
    fi
    
    echo "🔧 PM2 yükleniyor..."
    if ! command -v pm2 &> /dev/null; then
        npm install -g pm2
    fi
    
    echo "🐍 Python araçları yükleniyor..."
    apt install -y python3 python3-pip python3-venv
    
    echo "🔥 Firewall yapılandırılıyor..."
    ufw allow OpenSSH
    ufw allow 'Nginx Full'
    ufw allow 3000
    ufw allow 8080
    ufw allow 9615
    ufw --force enable
    
    echo "📁 Uygulama dizini hazırlanıyor..."
    mkdir -p /root/apps
    
    echo "✅ VPS hazırlığı tamamlandı!"
EOF

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ VPS hazırlığında hata!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ VPS hazırlığı tamamlandı!${NC}"
echo ""

echo -e "${BLUE}📤 Adım 3: Proje Dosyalarını Transfer${NC}"
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

echo -e "${BLUE}📦 Adım 4: Bağımlılıkları Yükle${NC}"
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
    
    echo "✅ Bağımlılıklar yüklendi!"
EOF

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Bağımlılık kurulumunda hata!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Bağımlılıklar yüklendi!${NC}"
echo ""

echo -e "${BLUE}🔨 Adım 5: Build ve Başlatma${NC}"
echo "----------------------------------------"

ssh $VPS_USER@$VPS_IP << 'EOF'
    set -e
    cd /root/apps/Epicentra
    
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
    
    echo "🚀 PM2 ile başlatılıyor..."
    pm2 start ecosystem.config.production.js
    pm2 startup
    pm2 save
    
    echo "✅ Uygulama başlatıldı!"
EOF

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build/başlatmada hata!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build ve başlatma tamamlandı!${NC}"
echo ""

echo -e "${BLUE}🌐 Nginx Yapılandırması${NC}"
echo "----------------------------------------"

ssh $VPS_USER@$VPS_IP << 'EOF'
    # Nginx site yapılandırması
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
    nginx -t && systemctl reload nginx
    
    echo "✅ Nginx yapılandırıldı!"
EOF

echo -e "${GREEN}✅ Nginx yapılandırması tamamlandı!${NC}"
echo ""

echo -e "${BLUE}🔍 Deployment Durumu Kontrol${NC}"
echo "----------------------------------------"

ssh $VPS_USER@$VPS_IP << 'EOF'
    cd /root/apps/Epicentra
    
    echo "📊 PM2 Durum:"
    pm2 status
    
    echo ""
    echo "🌐 Nginx Durum:"
    systemctl status nginx --no-pager -l | head -10
    
    echo ""
    echo "🔥 Firewall Durum:"
    ufw status
EOF

echo ""
echo -e "${GREEN}🎉 DEPLOYMENT TAMAMLANDI! 🎉${NC}"
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
echo -e "${CYAN}CLI Bot:${NC} ./epicentra-bot.sh status"
echo ""
echo -e "${BLUE}📊 Monitoring:${NC}"
echo -e "${CYAN}PM2 Status:${NC} ssh root@72.61.22.80 'pm2 status'"
echo -e "${CYAN}Loglar:${NC} ssh root@72.61.22.80 'pm2 logs'"
echo ""
echo -e "${GREEN}✨ Epicentra başarıyla VPS'e deploy edildi!${NC}"
