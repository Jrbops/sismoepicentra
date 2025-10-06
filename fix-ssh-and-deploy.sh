#!/bin/bash

# 🔧 SSH Host Key Sorunu Çözümü ve Deployment
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
echo "║            🔧 SSH FIX & EPICENTRA DEPLOYMENT 🔧             ║"
echo "║                                                              ║"
echo "║  SSH Host Key sorunu çözülüyor ve deployment yapılıyor      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${BLUE}🔧 SSH Host Key Sorunu Çözülüyor...${NC}"
echo "----------------------------------------"

# Eski host key'i kaldır
echo "🗑️  Eski host key kaldırılıyor..."
ssh-keygen -R $VPS_IP

# SSH bağlantısını test et ve yeni host key'i kabul et
echo "🔑 Yeni host key kabul ediliyor..."
echo -e "${YELLOW}⚠️  'yes' yazıp Enter'a basın, sonra şifreyi girin: Toprak5516@1337${NC}"

# SSH bağlantısını test et
ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "echo 'SSH bağlantısı başarılı!'"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ SSH bağlantısı başarısız!${NC}"
    echo -e "${YELLOW}Manuel olarak deneyin:${NC}"
    echo -e "${BLUE}ssh root@72.61.22.80${NC}"
    exit 1
fi

echo -e "${GREEN}✅ SSH host key sorunu çözüldü!${NC}"
echo ""

echo -e "${BLUE}📤 SSH Anahtarı Kopyalanıyor...${NC}"
echo "----------------------------------------"

# SSH anahtarını kopyala
ssh-copy-id -i ~/.ssh/id_rsa.pub $VPS_USER@$VPS_IP

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ SSH anahtarı kopyalanamadı!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ SSH anahtarı başarıyla kopyalandı!${NC}"
echo ""

# SSH anahtarı ile bağlantıyı test et
echo -e "${BLUE}🧪 SSH Anahtarı Test Ediliyor...${NC}"
if ssh -o ConnectTimeout=10 -o BatchMode=yes $VPS_USER@$VPS_IP exit 2>/dev/null; then
    echo -e "${GREEN}✅ SSH anahtarı ile bağlantı başarılı!${NC}"
else
    echo -e "${RED}❌ SSH anahtarı bağlantısı başarısız!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 SSH Kurulumu Tamamlandı!${NC}"
echo ""
echo -e "${BLUE}🚀 Şimdi deployment'ı başlatabilirsiniz:${NC}"
echo -e "${CYAN}./quick-deploy.sh${NC}"
echo ""
echo -e "${YELLOW}Veya manuel olarak VPS'e bağlanabilirsiniz:${NC}"
echo -e "${CYAN}ssh root@72.61.22.80${NC}"
