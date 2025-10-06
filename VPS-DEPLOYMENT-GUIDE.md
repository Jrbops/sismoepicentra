# 🚀 Epicentra VPS Deployment Rehberi

Epicentra projenizi localhost'tan gerçek VPS sunucusuna taşımak için kapsamlı rehber.

## 📋 Ön Hazırlık Kontrol Listesi

### 🖥️ VPS Gereksinimleri
- **İşletim Sistemi**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **RAM**: Minimum 2GB (Önerilen: 4GB+)
- **CPU**: 2 vCPU+
- **Disk**: 20GB+ SSD
- **Bant Genişliği**: Sınırsız veya yüksek
- **Port Erişimi**: 80, 443, 3000, 8080, 9615

### 🔐 Güvenlik Gereksinimleri
- SSH anahtarı erişimi
- Firewall yapılandırması
- SSL sertifikası (Let's Encrypt)
- Domain adı (isteğe bağlı)

## 🎯 Deployment Stratejileri

### Strateji 1: Manuel Deployment (Önerilen - Kontrollü)
### Strateji 2: Docker Deployment (Hızlı)
### Strateji 3: CI/CD Pipeline (Profesyonel)

---

## 📦 Strateji 1: Manuel Deployment

### Adım 1: VPS Sunucu Hazırlığı

```bash
# VPS'e bağlan
ssh root@your-vps-ip

# Sistem güncellemesi
apt update && apt upgrade -y

# Gerekli paketleri yükle
apt install -y curl wget git nginx certbot python3-certbot-nginx ufw

# Node.js yükle (NodeSource repository)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# PM2 global yükle
npm install -g pm2

# Python ve pip yükle
apt install -y python3 python3-pip python3-venv

# Firewall yapılandır
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 3000
ufw allow 8080
ufw allow 9615
ufw --force enable
```

### Adım 2: Kullanıcı ve Dizin Yapısı

```bash
# Uygulama kullanıcısı oluştur
adduser epicentra
usermod -aG sudo epicentra

# Kullanıcıya geç
su - epicentra

# Uygulama dizini oluştur
mkdir -p /home/epicentra/apps
cd /home/epicentra/apps
```

### Adım 3: Proje Dosyalarını Transfer Et

#### Yöntem A: Git ile (Önerilen)
```bash
# GitHub/GitLab repository'den clone
git clone https://github.com/yourusername/Epicentra.git
cd Epicentra

# Veya mevcut repository'yi push et
# Localhost'ta:
git remote add origin https://github.com/yourusername/Epicentra.git
git push -u origin main
```

#### Yöntem B: SCP ile dosya transferi
```bash
# Localhost'tan VPS'e dosya kopyala
scp -r /home/jonturk/Masaüstü/projects/Epicentra/* epicentra@your-vps-ip:/home/epicentra/apps/Epicentra/
```

#### Yöntem C: rsync ile senkronizasyon
```bash
# Localhost'tan
rsync -avz --progress /home/jonturk/Masaüstü/projects/Epicentra/ epicentra@your-vps-ip:/home/epicentra/apps/Epicentra/
```

### Adım 4: Proje Bağımlılıklarını Yükle

```bash
cd /home/epicentra/apps/Epicentra

# Node.js bağımlılıkları
npm install

# Python bağımlılıkları
pip3 install -r requirements.txt --user

# Bot scriptlerini çalıştırılabilir yap
chmod +x *.sh *.py

# PM2 ecosystem dosyasını güncelle
cp ecosystem.config.js ecosystem.config.production.js
```

### Adım 5: Ortam Değişkenlerini Yapılandır

```bash
# .env dosyasını düzenle
nano .env
```

```env
# Production ortam değişkenleri
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database (eğer varsa)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=epicentra_prod
DB_USER=epicentra
DB_PASS=secure_password

# Firebase (eğer kullanıyorsa)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-key-id

# API Keys
EARTHQUAKE_API_KEY=your-api-key

# Domain
DOMAIN=your-domain.com
```

### Adım 6: PM2 Yapılandırması

```bash
# ecosystem.config.production.js düzenle
nano ecosystem.config.production.js
```

```javascript
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
    node_args: '--max_old_space_size=1024'
  }, {
    name: 'epicentra-monitoring',
    script: './monitoring/pm2-web.js',
    env: {
      PORT: 9615
    }
  }]
}
```

### Adım 7: Nginx Reverse Proxy

```bash
# Nginx yapılandırması
sudo nano /etc/nginx/sites-available/epicentra
```

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Ana uygulama
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
        proxy_read_timeout 86400;
    }

    # Monitoring dashboard
    location /monitoring {
        proxy_pass http://localhost:9615;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files
    location /static {
        alias /home/epicentra/apps/Epicentra/public;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Site'ı etkinleştir
sudo ln -s /etc/nginx/sites-available/epicentra /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Adım 8: SSL Sertifikası (Let's Encrypt)

```bash
# SSL sertifikası al
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Otomatik yenileme testi
sudo certbot renew --dry-run
```

### Adım 9: Uygulamayı Başlat

```bash
cd /home/epicentra/apps/Epicentra

# Projeyi build et
npm run build

# PM2 ile başlat
pm2 start ecosystem.config.production.js --env production

# PM2'yi sistem başlangıcına ekle
pm2 startup
pm2 save
```

---

## 🐳 Strateji 2: Docker Deployment

### Dockerfile Oluştur

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Package files kopyala
COPY package*.json ./
RUN npm ci --only=production

# Uygulama kodunu kopyala
COPY . .

# Build
RUN npm run build

# Port
EXPOSE 3000

# Başlat
CMD ["npm", "start"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  epicentra:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl
    depends_on:
      - epicentra
    restart: unless-stopped

  monitoring:
    build:
      context: ./monitoring
    ports:
      - "9615:9615"
    restart: unless-stopped
```

---

## 🔄 Strateji 3: CI/CD Pipeline (GitHub Actions)

### .github/workflows/deploy.yml

```yaml
name: Deploy to VPS

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build
      run: npm run build
      
    - name: Deploy to VPS
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.VPS_HOST }}
        username: ${{ secrets.VPS_USER }}
        key: ${{ secrets.VPS_SSH_KEY }}
        script: |
          cd /home/epicentra/apps/Epicentra
          git pull origin main
          npm ci --only=production
          npm run build
          pm2 reload ecosystem.config.production.js --env production
```

---

## 🔧 Deployment Sonrası Yapılandırma

### Monitoring ve Loglar

```bash
# PM2 monitoring
pm2 monit

# Logları izle
pm2 logs

# Sistem kaynaklarını izle
htop

# Nginx logları
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Backup Stratejisi

```bash
# Otomatik backup scripti
nano /home/epicentra/backup.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/epicentra/backups"
APP_DIR="/home/epicentra/apps/Epicentra"

mkdir -p $BACKUP_DIR

# Uygulama backup
tar -czf $BACKUP_DIR/epicentra_$DATE.tar.gz -C $APP_DIR .

# Eski backupları temizle (30 günden eski)
find $BACKUP_DIR -name "epicentra_*.tar.gz" -mtime +30 -delete

# Database backup (eğer varsa)
# pg_dump epicentra_prod > $BACKUP_DIR/db_$DATE.sql
```

```bash
# Crontab'a ekle
crontab -e

# Her gün saat 02:00'da backup al
0 2 * * * /home/epicentra/backup.sh
```

### Güvenlik Sıkılaştırma

```bash
# SSH yapılandırması
sudo nano /etc/ssh/sshd_config

# Önerilen ayarlar:
# PermitRootLogin no
# PasswordAuthentication no
# PubkeyAuthentication yes
# Port 2222 (varsayılan portu değiştir)

sudo systemctl restart ssh

# Fail2ban yükle
sudo apt install fail2ban

# Fail2ban yapılandır
sudo nano /etc/fail2ban/jail.local
```

### Performance Optimizasyonu

```bash
# Node.js memory limiti
export NODE_OPTIONS="--max_old_space_size=2048"

# PM2 cluster mode
pm2 start ecosystem.config.production.js --env production -i max

# Nginx cache yapılandırması
sudo nano /etc/nginx/nginx.conf
```

---

## 📊 Deployment Kontrol Listesi

### ✅ Pre-Deployment
- [ ] VPS sunucu hazır
- [ ] Domain DNS ayarları yapıldı
- [ ] SSL sertifikası alındı
- [ ] Firewall yapılandırıldı
- [ ] Backup stratejisi belirlendi

### ✅ Deployment
- [ ] Kod VPS'e transfer edildi
- [ ] Dependencies yüklendi
- [ ] Environment variables ayarlandı
- [ ] Database migrate edildi (varsa)
- [ ] PM2 yapılandırıldı
- [ ] Nginx reverse proxy ayarlandı

### ✅ Post-Deployment
- [ ] Uygulama çalışıyor
- [ ] SSL çalışıyor
- [ ] Monitoring aktif
- [ ] Loglar yazılıyor
- [ ] Backup çalışıyor
- [ ] Performance test yapıldı

---

## 🚨 Sorun Giderme

### Yaygın Sorunlar

1. **Port erişim sorunu**
   ```bash
   sudo ufw status
   sudo netstat -tulpn | grep :3000
   ```

2. **PM2 süreç durmuş**
   ```bash
   pm2 restart all
   pm2 logs --lines 50
   ```

3. **Nginx yapılandırma hatası**
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   ```

4. **SSL sertifika sorunu**
   ```bash
   sudo certbot certificates
   sudo certbot renew
   ```

### Log Dosyaları
- **Uygulama**: `/home/epicentra/apps/Epicentra/logs/`
- **PM2**: `~/.pm2/logs/`
- **Nginx**: `/var/log/nginx/`
- **System**: `/var/log/syslog`

---

## 📞 Destek ve Kaynaklar

- **PM2 Dokümantasyonu**: https://pm2.keymetrics.io/
- **Nginx Dokümantasyonu**: https://nginx.org/en/docs/
- **Let's Encrypt**: https://letsencrypt.org/
- **Ubuntu Server Guide**: https://ubuntu.com/server/docs

---

Bu rehberi takip ederek Epicentra projenizi güvenli ve performanslı bir şekilde VPS sunucusuna deploy edebilirsiniz!
