#!/usr/bin/env python3
"""
🤖 Epicentra Simple TUI Bot - Basit Terminal Arayüzü
Geliştirici: Cascade AI
Versiyon: 1.0.0 (Stable)
"""

import os
import subprocess
import json
import time
from datetime import datetime
from typing import List, Dict
import psutil

try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.table import Table
    from rich.layout import Layout
    from rich.live import Live
    from rich.text import Text
    from rich.progress import Progress, BarColumn, TextColumn
    from rich.align import Align
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False
    print("❌ Rich kütüphanesi bulunamadı!")
    print("📦 Yüklemek için: pip3 install rich --user")
    exit(1)


class EpicentraSimpleTUI:
    """Basit TUI Bot"""
    
    def __init__(self):
        self.console = Console()
        self.project_root = os.path.dirname(os.path.abspath(__file__))
        self.bot_script = os.path.join(self.project_root, "epicentra-bot.sh")
        self.running = True
        self.current_view = "main"
        
    def clear_screen(self):
        """Ekranı temizle"""
        os.system('clear' if os.name == 'posix' else 'cls')
    
    def show_header(self):
        """Başlık göster"""
        header = Panel(
            Align.center(
                "[bold cyan]🤖 EPICENTRA SIMPLE TUI BOT 🤖[/bold cyan]\n"
                "[dim]Terminal Grafik Arayüzlü Proje Yöneticisi[/dim]\n"
                "[dim]v1.0.0 - Stable Edition[/dim]"
            ),
            style="cyan",
            padding=(1, 2)
        )
        self.console.print(header)
        self.console.print()
    
    def get_project_status(self) -> Dict:
        """Proje durumunu al"""
        status = {
            "project_exists": os.path.exists(os.path.join(self.project_root, "package.json")),
            "node_modules_exists": os.path.exists(os.path.join(self.project_root, "node_modules")),
            "build_exists": os.path.exists(os.path.join(self.project_root, ".output")),
            "pm2_processes": self.get_pm2_status()
        }
        status["pm2_running"] = len(status["pm2_processes"]) > 0
        return status
    
    def get_pm2_status(self) -> List[Dict]:
        """PM2 durumunu al"""
        try:
            result = subprocess.run(
                ["pm2", "jlist"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                return json.loads(result.stdout)
            return []
        except Exception:
            return []
    
    def get_system_info(self) -> Dict:
        """Sistem bilgilerini al"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            return {
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "memory_used": memory.used // (1024**3),
                "memory_total": memory.total // (1024**3),
                "disk_percent": disk.percent,
                "disk_used": disk.used // (1024**3),
                "disk_total": disk.total // (1024**3),
            }
        except Exception:
            return {
                "cpu_percent": 0,
                "memory_percent": 0,
                "memory_used": 0,
                "memory_total": 0,
                "disk_percent": 0,
                "disk_used": 0,
                "disk_total": 0,
            }
    
    def show_status_panel(self):
        """Durum paneli göster"""
        status = self.get_project_status()
        
        # Durum tablosu
        table = Table(title="📊 Proje Durumu", show_header=True, header_style="bold magenta")
        table.add_column("Bileşen", style="cyan", no_wrap=True)
        table.add_column("Durum", style="green")
        table.add_column("Detay", style="yellow")
        
        # Durum ikonları
        status_icon = lambda x: "✅" if x else "❌"
        
        table.add_row(
            "Proje", 
            status_icon(status.get("project_exists", False)),
            "Mevcut" if status.get("project_exists", False) else "Bulunamadı"
        )
        
        table.add_row(
            "Dependencies", 
            status_icon(status.get("node_modules_exists", False)),
            "Yüklü" if status.get("node_modules_exists", False) else "Eksik"
        )
        
        table.add_row(
            "Build", 
            status_icon(status.get("build_exists", False)),
            "Mevcut" if status.get("build_exists", False) else "Gerekli"
        )
        
        pm2_count = len(status.get("pm2_processes", []))
        table.add_row(
            "PM2", 
            status_icon(status.get("pm2_running", False)),
            f"{pm2_count} süreç" if pm2_count > 0 else "Durmuş"
        )
        
        self.console.print(table)
        self.console.print()
    
    def show_system_panel(self):
        """Sistem paneli göster"""
        info = self.get_system_info()
        
        # Sistem tablosu
        table = Table(title="💻 Sistem Durumu", show_header=True, header_style="bold blue")
        table.add_column("Kaynak", style="cyan", no_wrap=True)
        table.add_column("Kullanım", style="yellow")
        table.add_column("Detay", style="green")
        
        # Progress barları
        cpu_bar = "█" * int(info["cpu_percent"] / 5) + "░" * (20 - int(info["cpu_percent"] / 5))
        memory_bar = "█" * int(info["memory_percent"] / 5) + "░" * (20 - int(info["memory_percent"] / 5))
        disk_bar = "█" * int(info["disk_percent"] / 5) + "░" * (20 - int(info["disk_percent"] / 5))
        
        table.add_row("CPU", f"{info['cpu_percent']:.1f}%", cpu_bar)
        table.add_row(
            "Bellek", 
            f"{info['memory_percent']:.1f}%", 
            f"{memory_bar} ({info['memory_used']}GB/{info['memory_total']}GB)"
        )
        table.add_row(
            "Disk", 
            f"{info['disk_percent']:.1f}%", 
            f"{disk_bar} ({info['disk_used']}GB/{info['disk_total']}GB)"
        )
        
        self.console.print(table)
        self.console.print()
    
    def show_process_panel(self):
        """Süreç paneli göster"""
        processes = self.get_pm2_status()
        
        if not processes:
            self.console.print(Panel(
                "[yellow]Çalışan PM2 süreci bulunamadı[/yellow]",
                title="🔧 PM2 Süreçleri"
            ))
            self.console.print()
            return
        
        # Süreç tablosu
        table = Table(title="🔧 PM2 Süreçleri", show_header=True, header_style="bold green")
        table.add_column("İsim", style="cyan")
        table.add_column("PID", style="yellow")
        table.add_column("Durum", style="green")
        table.add_column("CPU", style="blue")
        table.add_column("Bellek", style="magenta")
        table.add_column("Restart", style="red")
        
        for process in processes:
            name = process.get("name", "N/A")
            pid = str(process.get("pid", "N/A"))
            status = process.get("pm2_env", {}).get("status", "unknown")
            
            # CPU ve bellek bilgisi
            monit = process.get("monit", {})
            cpu = f"{monit.get('cpu', 0)}%" if monit else "N/A"
            memory = f"{monit.get('memory', 0) // (1024*1024)}MB" if monit else "N/A"
            
            # Durum ikonu
            status_icon = {
                "online": "🟢",
                "stopped": "🔴",
                "error": "🟡"
            }.get(status, "⚪")
            
            restart_count = process.get("pm2_env", {}).get("restart_time", 0)
            
            table.add_row(
                name,
                pid,
                f"{status_icon} {status}",
                cpu,
                memory,
                str(restart_count)
            )
        
        self.console.print(table)
        self.console.print()
    
    def show_main_menu(self):
        """Ana menü göster"""
        menu = Panel(
            "[bold green]🎮 KONTROL PANELİ[/bold green]\n\n"
            "[cyan]1.[/cyan] 🚀 Projeyi Başlat\n"
            "[cyan]2.[/cyan] 🛑 Projeyi Durdur\n"
            "[cyan]3.[/cyan] 🔄 Yeniden Başlat\n"
            "[cyan]4.[/cyan] 🛠️  Dev Mode\n"
            "[cyan]5.[/cyan] 🔨 Build\n"
            "[cyan]6.[/cyan] 📦 Install\n"
            "[cyan]7.[/cyan] 🧹 Temizle\n"
            "[cyan]8.[/cyan] 📊 Durum Görünümü\n"
            "[cyan]9.[/cyan] 💻 Sistem Görünümü\n"
            "[cyan]10.[/cyan] 🔧 Süreç Görünümü\n"
            "[cyan]11.[/cyan] 📋 Logları Göster\n"
            "[cyan]12.[/cyan] 🔄 Ekranı Yenile\n"
            "[cyan]0.[/cyan] 🚪 Çıkış",
            title="Menü",
            style="green"
        )
        self.console.print(menu)
        self.console.print()
    
    def execute_command(self, command: str):
        """Komut çalıştır"""
        if not os.path.exists(self.bot_script):
            self.console.print("[red]❌ epicentra-bot.sh bulunamadı![/red]")
            return
        
        self.console.print(f"[blue]🚀 Komut çalıştırılıyor: {command}[/blue]")
        
        try:
            result = subprocess.run(
                ["bash", self.bot_script, command],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=300  # 5 dakika timeout
            )
            
            if result.returncode == 0:
                self.console.print("[green]✅ Komut başarılı![/green]")
                if result.stdout:
                    self.console.print(Panel(result.stdout, title="Çıktı", style="green"))
            else:
                self.console.print("[red]❌ Komut başarısız![/red]")
                if result.stderr:
                    self.console.print(Panel(result.stderr, title="Hata", style="red"))
                    
        except subprocess.TimeoutExpired:
            self.console.print("[red]❌ Komut zaman aşımına uğradı![/red]")
        except Exception as e:
            self.console.print(f"[red]❌ Hata: {str(e)}[/red]")
        
        self.console.print()
        input("Devam etmek için Enter tuşuna basın...")
    
    def show_logs(self):
        """Logları göster"""
        self.console.print("[blue]📋 PM2 Logları (Son 50 satır):[/blue]")
        
        try:
            result = subprocess.run(
                ["pm2", "logs", "--lines", "50", "--nostream"],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                self.console.print(Panel(result.stdout, title="Loglar", style="blue"))
            else:
                self.console.print("[red]❌ Loglar alınamadı![/red]")
                
        except Exception as e:
            self.console.print(f"[red]❌ Log hatası: {str(e)}[/red]")
        
        self.console.print()
        input("Devam etmek için Enter tuşuna basın...")
    
    def run(self):
        """Ana döngü"""
        while self.running:
            self.clear_screen()
            self.show_header()
            
            if self.current_view == "main":
                self.show_main_menu()
            elif self.current_view == "status":
                self.show_status_panel()
                self.current_view = "main"
                input("Devam etmek için Enter tuşuna basın...")
                continue
            elif self.current_view == "system":
                self.show_system_panel()
                self.current_view = "main"
                input("Devam etmek için Enter tuşuna basın...")
                continue
            elif self.current_view == "processes":
                self.show_process_panel()
                self.current_view = "main"
                input("Devam etmek için Enter tuşuna basın...")
                continue
            
            try:
                choice = input("Seçiminiz (0-12): ").strip()
                
                if choice == "0":
                    self.running = False
                    self.console.print("[green]👋 Görüşmek üzere![/green]")
                
                elif choice == "1":
                    self.execute_command("start")
                elif choice == "2":
                    self.execute_command("stop")
                elif choice == "3":
                    self.execute_command("restart")
                elif choice == "4":
                    self.execute_command("dev")
                elif choice == "5":
                    self.execute_command("build")
                elif choice == "6":
                    self.execute_command("install")
                elif choice == "7":
                    self.execute_command("clean")
                
                elif choice == "8":
                    self.current_view = "status"
                elif choice == "9":
                    self.current_view = "system"
                elif choice == "10":
                    self.current_view = "processes"
                elif choice == "11":
                    self.show_logs()
                elif choice == "12":
                    continue  # Ekranı yenile
                
                else:
                    self.console.print("[red]❌ Geçersiz seçim![/red]")
                    time.sleep(1)
                    
            except KeyboardInterrupt:
                self.running = False
                self.console.print("\n[green]👋 Ctrl+C ile çıkış yapıldı![/green]")
            except Exception as e:
                self.console.print(f"[red]❌ Hata: {str(e)}[/red]")
                time.sleep(2)


def main():
    """Ana fonksiyon"""
    # Rich kontrolü
    if not RICH_AVAILABLE:
        return
    
    # Proje dizinini kontrol et
    project_root = os.path.dirname(os.path.abspath(__file__))
    if not os.path.exists(os.path.join(project_root, "package.json")):
        print("❌ Bu script Epicentra proje dizininde çalıştırılmalıdır!")
        return
    
    # Simple TUI'yi başlat
    tui = EpicentraSimpleTUI()
    tui.run()


if __name__ == "__main__":
    main()
