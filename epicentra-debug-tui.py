#!/usr/bin/env python3
"""
🤖 Epicentra Debug TUI - Terminal Boyut Uyumlu
"""

import os
import subprocess
import json
import shutil

def clear_screen():
    os.system('clear')

def get_terminal_size():
    """Terminal boyutunu al"""
    try:
        columns, rows = shutil.get_terminal_size()
        return columns, rows
    except:
        return 80, 24

def print_header():
    """Başlık yazdır"""
    cols, rows = get_terminal_size()
    print("=" * min(cols, 80))
    print("🤖 EPICENTRA DEBUG TUI BOT".center(min(cols, 80)))
    print("Terminal Grafik Arayüzlü Proje Yöneticisi".center(min(cols, 80)))
    print("=" * min(cols, 80))
    print()

def print_menu():
    """Menü yazdır"""
    print("🎮 KONTROL PANELİ:")
    print()
    print("1. 🚀 Projeyi Başlat")
    print("2. 🛑 Projeyi Durdur") 
    print("3. 🔄 Yeniden Başlat")
    print("4. 🛠️  Dev Mode")
    print("5. 📊 Proje Durumu")
    print("6. 🔧 PM2 Süreçleri")
    print("7. 📋 Logları Göster")
    print("8. 🔄 Ekranı Yenile")
    print("0. 🚪 Çıkış")
    print()

def get_project_status():
    """Proje durumunu kontrol et"""
    project_root = os.path.dirname(os.path.abspath(__file__))
    
    status = {
        "package_json": os.path.exists(os.path.join(project_root, "package.json")),
        "node_modules": os.path.exists(os.path.join(project_root, "node_modules")),
        "build": os.path.exists(os.path.join(project_root, ".output")),
    }
    
    # PM2 durumu
    try:
        result = subprocess.run(["pm2", "jlist"], capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            processes = json.loads(result.stdout)
            status["pm2_count"] = len(processes)
        else:
            status["pm2_count"] = 0
    except:
        status["pm2_count"] = 0
    
    return status

def show_status():
    """Durum göster"""
    print("📊 PROJE DURUMU:")
    print("-" * 40)
    
    status = get_project_status()
    
    def status_icon(condition):
        return "✅" if condition else "❌"
    
    print(f"Proje Dosyası: {status_icon(status['package_json'])} {'Mevcut' if status['package_json'] else 'Bulunamadı'}")
    print(f"Dependencies:  {status_icon(status['node_modules'])} {'Yüklü' if status['node_modules'] else 'Eksik'}")
    print(f"Build:         {status_icon(status['build'])} {'Mevcut' if status['build'] else 'Gerekli'}")
    print(f"PM2 Süreçleri: {status_icon(status['pm2_count'] > 0)} {status['pm2_count']} süreç")
    print()

def show_processes():
    """PM2 süreçlerini göster"""
    print("🔧 PM2 SÜREÇLERİ:")
    print("-" * 40)
    
    try:
        result = subprocess.run(["pm2", "list"], capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print(result.stdout)
        else:
            print("❌ PM2 süreçleri alınamadı")
    except:
        print("❌ PM2 komutu çalıştırılamadı")
    print()

def show_logs():
    """Logları göster"""
    print("📋 PM2 LOGLAR (Son 20 satır):")
    print("-" * 40)
    
    try:
        result = subprocess.run(["pm2", "logs", "--lines", "20", "--nostream"], 
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print(result.stdout)
        else:
            print("❌ Loglar alınamadı")
    except:
        print("❌ Log komutu çalıştırılamadı")
    print()

def execute_command(command):
    """Komut çalıştır"""
    project_root = os.path.dirname(os.path.abspath(__file__))
    bot_script = os.path.join(project_root, "epicentra-bot.sh")
    
    if not os.path.exists(bot_script):
        print("❌ epicentra-bot.sh bulunamadı!")
        return
    
    print(f"🚀 Komut çalıştırılıyor: {command}")
    print("-" * 40)
    
    try:
        result = subprocess.run(["bash", bot_script, command], 
                              cwd=project_root, timeout=120)
        
        if result.returncode == 0:
            print("✅ Komut başarılı!")
        else:
            print("❌ Komut başarısız!")
            
    except subprocess.TimeoutExpired:
        print("❌ Komut zaman aşımına uğradı!")
    except Exception as e:
        print(f"❌ Hata: {str(e)}")
    
    print()

def main():
    """Ana fonksiyon"""
    # Terminal boyutunu kontrol et
    cols, rows = get_terminal_size()
    print(f"🖥️  Terminal boyutu: {cols}x{rows}")
    
    if cols < 40 or rows < 10:
        print("⚠️  Terminal boyutu çok küçük! En az 40x10 gerekli.")
        print("💡 Terminal penceresini büyütün ve tekrar deneyin.")
        return
    
    while True:
        clear_screen()
        print_header()
        
        # Terminal boyutunu tekrar kontrol et
        cols, rows = get_terminal_size()
        print(f"Terminal: {cols}x{rows} | Zaman: {subprocess.check_output(['date'], text=True).strip()}")
        print()
        
        print_menu()
        
        try:
            choice = input("Seçiminiz (0-8): ").strip()
            
            if choice == "0":
                print("👋 Görüşmek üzere!")
                break
            
            elif choice == "1":
                execute_command("start")
            elif choice == "2":
                execute_command("stop")
            elif choice == "3":
                execute_command("restart")
            elif choice == "4":
                execute_command("dev")
            elif choice == "5":
                show_status()
            elif choice == "6":
                show_processes()
            elif choice == "7":
                show_logs()
            elif choice == "8":
                continue  # Ekranı yenile
            else:
                print("❌ Geçersiz seçim!")
                input("Enter tuşuna basın...")
                continue
            
            if choice in ["1", "2", "3", "4", "5", "6", "7"]:
                input("Devam etmek için Enter tuşuna basın...")
                
        except KeyboardInterrupt:
            print("\n👋 Ctrl+C ile çıkış!")
            break
        except Exception as e:
            print(f"❌ Hata: {str(e)}")
            input("Enter tuşuna basın...")

if __name__ == "__main__":
    main()
