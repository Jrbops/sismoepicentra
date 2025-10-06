#!/bin/bash

# 🚀 Epicentra VPS Deployment Script
# Otomatik VPS deployment scripti

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Yapılandırma değişkenleri
VPS_IP=""
VPS_USER=""
DOMAIN=""
APP_NAME="epicentra"
APP_DIR="/home/$VPS_USER/apps/Epicentra"

# Logo
show_logo() {
    clear
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                🚀 EPICENTRA VPS DEPLOYER 🚀                 ║"
    echo "║                                                              ║"
    echo "║            Otomatik VPS Deployment Scripti                   ║"
    echo "║                     v1.0.0                                   ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Yapılandırma al
get_config() {
    echo -e "${WHITE}🔧 VPS Deployment Yapılandırması${NC}"
    echo ""
    
    read -p "VPS IP Adresi: " VPS_IP
    read -p "VPS Kullanıcı Adı (root/ubuntu/etc): " VPS_USER
    read -p "Domain Adı (isteğe bağlı): " DOMAIN
    
    echo ""
    echo -e "${YELLOW}Yapılandırma Özeti:${NC}"
    echo -e "${BLUE}VPS IP:${NC} $VPS_IP"
    echo -e "${BLUE}Kullanıcı:${NC} $VPS_USER"
    echo -e "${BLUE}Domain:${NC} ${DOMAIN:-'Yok'}"
    echo ""
    
    read -p "Devam etmek istiyor musunuz? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ Deployment iptal edildi${NC}"
        exit 1
    fi
}

# SSH bağlantısını test et
test_ssh() {
    echo -e "${BLUE}🔍 SSH bağlantısı test ediliyor...${NC}"
    
    if ssh -o ConnectTimeout=10 -o BatchMode=yes $VPS_USER@$VPS_IP exit 2>/dev/null; then
        echo -e "${GREEN}✅ SSH bağlantısı başarılı${NC}"
    else
        echo -e "${RED}❌ SSH bağlantısı başarısız!${NC}"
        echo -e "${YELLOW}SSH anahtarınızın VPS'e yüklendiğinden emin olun:${NC}"
        echo -e "${BLUE}ssh-copy-id $VPS_USER@$VPS_IP${NC}"
        exit 1
    fi
}

# VPS sunucu hazırlığı
prepare_vps() {
    echo -e "${BLUE}🛠️  VPS sunucu hazırlanıyor...${NC}"
    
    ssh $VPS_USER@$VPS_IP << 'EOF'
        set -e
        
        echo "📦 Sistem paketleri güncelleniyor..."
        sudo apt update && sudo apt upgrade -y
        
        echo "🔧 Gerekli paketler yükleniyor..."
        sudo apt install -y curl wget git nginx certbot python3-certbot-nginx ufw htop
        
        echo "📦 Node.js yükleniyor..."
        if ! command -v node &> /dev/null; then
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt install -y nodejs
        fi
        
        echo "🔧 PM2 yükleniyor..."
        if ! command -v pm2 &> /dev/null; then
            sudo npm install -g pm2
        fi
        
        echo "🐍 Python araçları yükleniyor..."
        sudo apt install -y python3 python3-pip python3-venv
        
        echo "🔥 Firewall yapılandırılıyor..."
        sudo ufw allow OpenSSH
        sudo ufw allow 'Nginx Full'
        sudo ufw allow 3000
        sudo ufw allow 8080
        sudo ufw allow 9615
        sudo ufw --force enable
        
        echo "📁 Uygulama dizini oluşturuluyor..."
        mkdir -p ~/apps
        
        echo "✅ VPS hazırlığı tamamlandı!"
EOF
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ VPS hazırlığı başarılı${NC}"
    else
        echo -e "${RED}❌ VPS hazırlığında hata oluştu${NC}"
        exit 1
    fi
}

# Proje dosyalarını transfer et
transfer_files() {
    echo -e "${BLUE}📤 Proje dosyaları transfer ediliyor...${NC}"
    
    # Gereksiz dosyaları hariç tut
    rsync -avz --progress \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude '.nuxt' \
        --exclude '.output' \
        --exclude 'logs' \
        --exclude 'venv' \
        --exclude '*.log' \
        --exclude '.env.local' \
        ./ $VPS_USER@$VPS_IP:~/apps/Epicentra/
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Dosya transferi başarılı${NC}"
    else
        echo -e "${RED}❌ Dosya transferinde hata oluştu${NC}"
        exit 1
    fi
}

# Bağımlılıkları yükle ve yapılandır
setup_dependencies() {
    echo -e "${BLUE}📦 Bağımlılıklar yükleniyor...${NC}"
    
    ssh $VPS_USER@$VPS_IP << 'EOF'
        set -e
        cd ~/apps/Epicentra
        
        echo "📦 Node.js bağımlılıkları yükleniyor..."
        npm ci --only=production
        
        echo "🐍 Python bağımlılıkları yükleniyor..."
        pip3 install -r requirements.txt --user
        
        echo "🔧 Script izinleri ayarlanıyor..."
        chmod +x *.sh *.py
        
        echo "📁 Log dizini oluşturuluyor..."
        mkdir -p logs
        
        echo "✅ Bağımlılıklar yüklendi!"
EOF
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Bağımlılık kurulumu başarılı${NC}"
    else
        echo -e "${RED}❌ Bağımlılık kurulumunda hata oluştu${NC}"
        exit 1
    fi
}

# Environment dosyasını oluştur
create_env() {
    echo -e "${BLUE}⚙️  Environment dosyası oluşturuluyor...${NC}"
    
    # Yerel .env dosyasını template olarak kullan
    if [ -f ".env" ]; then
        scp .env $VPS_USER@$VPS_IP:~/apps/Epicentra/.env.production
    fi
    
    ssh $VPS_USER@$VPS_IP << EOF
        cd ~/apps/Epicentra
        
        # Production environment ayarları
        cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
DOMAIN=${DOMAIN:-localhost}

# Diğer ayarlar .env.production'dan kopyalanacak
ENVEOF
        
        # Mevcut .env.production varsa birleştir
        if [ -f ".env.production" ]; then
            cat .env.production >> .env
        fi
        
        echo "✅ Environment dosyası oluşturuldu!"
EOF
}

# PM2 ecosystem dosyasını güncelle
setup_pm2() {
    echo -e "${BLUE}🔧 PM2 yapılandırması...${NC}"
    
    ssh $VPS_USER@$VPS_IP << 'EOF'
        cd ~/apps/Epicentra
        
        # Production ecosystem dosyası oluştur
        cat > ecosystem.config.production.js << 'PMEOF'
module.exports = {
  apps: [{
    name: 'epicentra-main',
    script: './.output/server/index.mjs',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000,
      HOST: '0.0.0.0'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOST: '0.0.0.0'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max_old_space_size=1024',
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    restart_delay: 4000
  }]
}
PMEOF
        
        echo "✅ PM2 yapılandırması tamamlandı!"
EOF
}

# Nginx yapılandırması
setup_nginx() {
    echo -e "${BLUE}🌐 Nginx yapılandırması...${NC}"
    
    local nginx_config=""
    if [ -n "$DOMAIN" ]; then
        nginx_config="server_name $DOMAIN www.$DOMAIN;"
    else
        nginx_config="server_name $VPS_IP;"
    fi
    
    ssh $VPS_USER@$VPS_IP << EOF
        # Nginx site yapılandırması
        sudo tee /etc/nginx/sites-available/epicentra > /dev/null << 'NGINXEOF'
server {
    listen 80;
    $nginx_config

    # Ana uygulama
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # Monitoring dashboard
    location /monitoring {
        proxy_pass http://localhost:9615;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # Static files
    location /static {
        alias /home/$VPS_USER/apps/Epicentra/public;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINXEOF
        
        # Site'ı etkinleştir
        sudo ln -sf /etc/nginx/sites-available/epicentra /etc/nginx/sites-enabled/
        sudo rm -f /etc/nginx/sites-enabled/default
        
        # Nginx test et
        sudo nginx -t && sudo systemctl reload nginx
        
        echo "✅ Nginx yapılandırması tamamlandı!"
EOF
}

# SSL sertifikası kur
setup_ssl() {
    if [ -n "$DOMAIN" ]; then
        echo -e "${BLUE}🔒 SSL sertifikası kuruluyor...${NC}"
        
        ssh $VPS_USER@$VPS_IP << EOF
            sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
            
            # Otomatik yenileme testi
            sudo certbot renew --dry-run
            
            echo "✅ SSL sertifikası kuruldu!"
EOF
    else
        echo -e "${YELLOW}⚠️  Domain belirtilmediği için SSL kurulumu atlandı${NC}"
    fi
}

# Uygulamayı build et ve başlat
build_and_start() {
    echo -e "${BLUE}🔨 Uygulama build ediliyor ve başlatılıyor...${NC}"
    
    ssh $VPS_USER@$VPS_IP << 'EOF'
        cd ~/apps/Epicentra
        
        echo "🔨 Proje build ediliyor..."
        npm run build
        
        echo "🚀 PM2 ile başlatılıyor..."
        pm2 start ecosystem.config.production.js --env production
        
        echo "💾 PM2 yapılandırması kaydediliyor..."
        pm2 startup
        pm2 save
        
        echo "✅ Uygulama başarıyla başlatıldı!"
EOF
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Build ve başlatma başarılı${NC}"
    else
        echo -e "${RED}❌ Build veya başlatmada hata oluştu${NC}"
        exit 1
    fi
}

# Deployment durumunu kontrol et
check_deployment() {
    echo -e "${BLUE}🔍 Deployment durumu kontrol ediliyor...${NC}"
    
    ssh $VPS_USER@$VPS_IP << 'EOF'
        echo "📊 PM2 Durum:"
        pm2 status
        
        echo ""
        echo "🌐 Nginx Durum:"
        sudo systemctl status nginx --no-pager -l
        
        echo ""
        echo "🔥 Firewall Durum:"
        sudo ufw status
        
        echo ""
        echo "📋 Son Loglar:"
        pm2 logs --lines 10 --nostream
EOF
}

# Deployment özeti
show_summary() {
    echo ""
    echo -e "${GREEN}🎉 Deployment Tamamlandı!${NC}"
    echo "=================================="
    
    if [ -n "$DOMAIN" ]; then
        echo -e "${BLUE}🌐 Ana Site:${NC} https://$DOMAIN"
        echo -e "${BLUE}🌐 WWW:${NC} https://www.$DOMAIN"
    else
        echo -e "${BLUE}🌐 Ana Site:${NC} http://$VPS_IP"
    fi
    
    echo -e "${BLUE}📊 Monitoring:${NC} http://$VPS_IP:9615"
    echo ""
    echo -e "${YELLOW}📋 Yararlı Komutlar:${NC}"
    echo -e "${CYAN}PM2 Durum:${NC} ssh $VPS_USER@$VPS_IP 'pm2 status'"
    echo -e "${CYAN}Loglar:${NC} ssh $VPS_USER@$VPS_IP 'pm2 logs'"
    echo -e "${CYAN}Yeniden Başlat:${NC} ssh $VPS_USER@$VPS_IP 'pm2 restart all'"
    echo ""
    echo -e "${GREEN}✨ Epicentra başarıyla VPS'e deploy edildi!${NC}"
}

# Ana fonksiyon
main() {
    show_logo
    get_config
    test_ssh
    prepare_vps
    transfer_files
    setup_dependencies
    create_env
    setup_pm2
    setup_nginx
    setup_ssl
    build_and_start
    check_deployment
    show_summary
}

# Hata yakalama
set -e
trap 'echo -e "${RED}❌ Deployment sırasında hata oluştu!${NC}"; exit 1' ERR

# Scripti çalıştır
main "$@"
