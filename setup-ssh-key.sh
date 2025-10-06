#!/bin/bash

# 🔐 SSH Anahtarı Kurulum Scripti
# VPS: 72.61.22.80

VPS_IP="72.61.22.80"
VPS_USER="root"

echo "🔐 SSH Anahtarı Kurulumu Başlatılıyor..."
echo "VPS: $VPS_IP"
echo "Kullanıcı: $VPS_USER"
echo ""

# SSH anahtarı var mı kontrol et
if [ ! -f ~/.ssh/id_rsa ]; then
    echo "🔑 SSH anahtarı oluşturuluyor..."
    ssh-keygen -t rsa -b 4096 -C "epicentra-deployment" -f ~/.ssh/id_rsa -N ""
    echo "✅ SSH anahtarı oluşturuldu!"
else
    echo "✅ SSH anahtarı mevcut"
fi

echo ""
echo "📤 SSH anahtarı VPS'e kopyalanıyor..."
echo "⚠️  VPS şifresi istenecek: Toprak5516@1337"
echo ""

# SSH anahtarını VPS'e kopyala
ssh-copy-id -i ~/.ssh/id_rsa.pub $VPS_USER@$VPS_IP

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SSH anahtarı başarıyla kuruldu!"
    echo ""
    echo "🧪 SSH bağlantısı test ediliyor..."
    
    # SSH bağlantısını test et
    if ssh -o ConnectTimeout=10 -o BatchMode=yes $VPS_USER@$VPS_IP exit 2>/dev/null; then
        echo "✅ SSH anahtarı ile bağlantı başarılı!"
        echo ""
        echo "🚀 Artık otomatik deployment çalıştırabilirsiniz:"
        echo "./deploy-to-vps.sh"
    else
        echo "❌ SSH anahtarı bağlantısı başarısız!"
    fi
else
    echo "❌ SSH anahtarı kopyalanamadı!"
fi
