#!/bin/bash

# 🚀 GitHub Repository Setup Script
# Epicentra projesini GitHub'a yüklemek için

# Renkli çıktı
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                🚀 GITHUB SETUP 🚀                           ║"
echo "║                                                              ║"
echo "║  Epicentra projesini GitHub'a yükleme rehberi                ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${BLUE}📋 GitHub Repository Oluşturma Adımları:${NC}"
echo "----------------------------------------"
echo ""
echo -e "${YELLOW}1. GitHub'da Yeni Repository Oluşturun:${NC}"
echo "   • https://github.com/new adresine gidin"
echo "   • Repository name: ${CYAN}Epicentra${NC}"
echo "   • Description: ${CYAN}🌍 Türkiye'nin en kapsamlı deprem izleme ve yönetim platformu${NC}"
echo "   • Public/Private seçin"
echo "   • ${RED}README, .gitignore, license eklemeyin${NC} (zaten mevcut)"
echo "   • Create repository'ye tıklayın"
echo ""

echo -e "${YELLOW}2. Repository URL'ini Kopyalayın:${NC}"
echo "   • Oluşturulan repository sayfasından HTTPS URL'ini kopyalayın"
echo "   • Örnek: ${CYAN}https://github.com/username/Epicentra.git${NC}"
echo ""

echo -e "${YELLOW}3. Aşağıdaki Komutları Çalıştırın:${NC}"
echo ""
echo -e "${GREEN}# Remote repository ekle (URL'i kendi repository'nizle değiştirin)${NC}"
echo -e "${CYAN}git remote add origin https://github.com/USERNAME/Epicentra.git${NC}"
echo ""
echo -e "${GREEN}# Ana branch'i main olarak ayarla${NC}"
echo -e "${CYAN}git branch -M main${NC}"
echo ""
echo -e "${GREEN}# İlk push'u yap${NC}"
echo -e "${CYAN}git push -u origin main${NC}"
echo ""

echo -e "${BLUE}🔧 Otomatik Kurulum (Repository URL'i hazırsa):${NC}"
echo "----------------------------------------"
echo ""
read -p "GitHub repository URL'inizi girin (örn: https://github.com/username/Epicentra.git): " REPO_URL

if [ ! -z "$REPO_URL" ]; then
    echo ""
    echo -e "${BLUE}🔗 Remote repository ekleniyor...${NC}"
    git remote add origin "$REPO_URL"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Remote repository başarıyla eklendi!${NC}"
        
        echo -e "${BLUE}🌿 Ana branch main olarak ayarlanıyor...${NC}"
        git branch -M main
        
        echo -e "${BLUE}🚀 GitHub'a push ediliyor...${NC}"
        git push -u origin main
        
        if [ $? -eq 0 ]; then
            echo ""
            echo -e "${GREEN}🎉 BAŞARILI! Proje GitHub'a yüklendi! 🎉${NC}"
            echo "=================================="
            echo ""
            echo -e "${BLUE}📊 Repository Bilgileri:${NC}"
            echo -e "${CYAN}Repository URL:${NC} $REPO_URL"
            echo -e "${CYAN}Branch:${NC} main"
            echo -e "${CYAN}Dosya Sayısı:${NC} $(git ls-files | wc -l)"
            echo ""
            echo -e "${BLUE}🌐 Erişim Linkleri:${NC}"
            echo -e "${CYAN}Repository:${NC} ${REPO_URL%.git}"
            echo -e "${CYAN}Clone:${NC} git clone $REPO_URL"
            echo ""
            echo -e "${YELLOW}💡 Sonraki Adımlar:${NC}"
            echo "• Repository'yi public yapabilirsiniz"
            echo "• README.md'yi güncelleyebilirsiniz"
            echo "• Issues ve Projects ekleyebilirsiniz"
            echo "• GitHub Pages ile demo site oluşturabilirsiniz"
            echo ""
            echo -e "${GREEN}✨ Epicentra artık GitHub'da! ✨${NC}"
        else
            echo -e "${RED}❌ Push işlemi başarısız!${NC}"
            echo -e "${YELLOW}Manuel olarak deneyin:${NC}"
            echo -e "${CYAN}git push -u origin main${NC}"
        fi
    else
        echo -e "${RED}❌ Remote repository eklenemedi!${NC}"
        echo -e "${YELLOW}URL'i kontrol edin ve manuel olarak deneyin:${NC}"
        echo -e "${CYAN}git remote add origin $REPO_URL${NC}"
    fi
else
    echo ""
    echo -e "${YELLOW}⚠️  Repository URL'i girilmedi.${NC}"
    echo -e "${BLUE}Manuel kurulum için yukarıdaki adımları takip edin.${NC}"
fi

echo ""
echo -e "${BLUE}📚 Ek Bilgiler:${NC}"
echo "----------------------------------------"
echo -e "${CYAN}Git Status:${NC} git status"
echo -e "${CYAN}Remote Kontrol:${NC} git remote -v"
echo -e "${CYAN}Branch Kontrol:${NC} git branch -a"
echo -e "${CYAN}Son Commit:${NC} git log --oneline -1"
echo ""
echo -e "${GREEN}🎯 Proje Özellikleri (README.md'de detaylı):${NC}"
echo "• 🌐 Gerçek zamanlı deprem takibi"
echo "• 🤖 3 farklı bot yönetim sistemi"
echo "• 🚀 VPS otomatik deployment"
echo "• 💻 Modern Nuxt 3 + TypeScript"
echo "• 📊 PM2 süreç yönetimi"
