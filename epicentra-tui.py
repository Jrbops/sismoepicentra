#!/usr/bin/env python3
"""
🤖 Epicentra TUI Bot - Terminal Grafik Arayüzlü Proje Yöneticisi
Geliştirici: Cascade AI
Versiyon: 1.0.0
"""

import asyncio
import subprocess
import os
import json
import time
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional

from textual.app import App, ComposeResult
from textual.containers import Container, Horizontal, Vertical, ScrollableContainer
from textual.widgets import (
    Header, Footer, Button, Static, Log, ProgressBar, 
    DataTable, Tabs, TabPane, Label, Input, Switch
)
from textual.reactive import reactive
from textual.message import Message
from textual.screen import Screen
from textual import events
from rich.console import Console
from rich.text import Text
from rich.panel import Panel
from rich.progress import Progress
from rich.table import Table
from rich.align import Align
import psutil


class CommandRunner:
    """Komut çalıştırma sınıfı"""
    
    def __init__(self, project_root: str):
        self.project_root = project_root
        self.bot_script = os.path.join(project_root, "epicentra-bot.sh")
    
    async def run_command(self, command: str) -> Dict:
        """Async komut çalıştırma"""
        try:
            if not os.path.exists(self.bot_script):
                return {
                    "success": False,
                    "error": "epicentra-bot.sh bulunamadı!",
                    "stdout": "",
                    "stderr": ""
                }
            
            process = await asyncio.create_subprocess_exec(
                "bash", self.bot_script, command,
                cwd=self.project_root,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            return {
                "success": process.returncode == 0,
                "error": None,
                "stdout": stdout.decode('utf-8', errors='ignore'),
                "stderr": stderr.decode('utf-8', errors='ignore'),
                "returncode": process.returncode
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "stdout": "",
                "stderr": ""
            }
    
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
    
    def get_project_status(self) -> Dict:
        """Proje durumunu kontrol et"""
        status = {
            "project_exists": os.path.exists(os.path.join(self.project_root, "package.json")),
            "node_modules_exists": os.path.exists(os.path.join(self.project_root, "node_modules")),
            "build_exists": os.path.exists(os.path.join(self.project_root, ".output")),
            "pm2_processes": self.get_pm2_status()
        }
        status["pm2_running"] = len(status["pm2_processes"]) > 0
        return status


class SystemMonitor:
    """Sistem izleme sınıfı"""
    
    @staticmethod
    def get_system_info() -> Dict:
        """Sistem bilgilerini al"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            return {
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "memory_used": memory.used // (1024**3),  # GB
                "memory_total": memory.total // (1024**3),  # GB
                "disk_percent": disk.percent,
                "disk_used": disk.used // (1024**3),  # GB
                "disk_total": disk.total // (1024**3),  # GB
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


class LogViewer(Static):
    """Log görüntüleme widget'ı"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.logs = []
        self.max_logs = 1000
    
    def add_log(self, message: str, level: str = "info"):
        """Log ekle"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_entry = f"[{timestamp}] [{level.upper()}] {message}"
        
        self.logs.append(log_entry)
        if len(self.logs) > self.max_logs:
            self.logs = self.logs[-500:]  # Son 500 log'u tut
        
        self.update_display()
    
    def update_display(self):
        """Ekranı güncelle"""
        content = "\n".join(self.logs[-50:])  # Son 50 log'u göster
        self.update(content)
    
    def clear_logs(self):
        """Logları temizle"""
        self.logs.clear()
        self.update("")


class StatusPanel(Static):
    """Durum paneli widget'ı"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.status_data = {}
    
    def update_status(self, status: Dict):
        """Durumu güncelle"""
        self.status_data = status
        self.render_status()
    
    def render_status(self):
        """Durumu render et"""
        if not self.status_data:
            self.update("Durum yükleniyor...")
            return
        
        console = Console()
        
        # Proje durumu tablosu
        table = Table(title="📊 Proje Durumu", show_header=True, header_style="bold magenta")
        table.add_column("Bileşen", style="cyan", no_wrap=True)
        table.add_column("Durum", style="green")
        table.add_column("Detay", style="yellow")
        
        # Durum ikonları
        status_icon = lambda x: "✅" if x else "❌"
        
        table.add_row(
            "Proje", 
            status_icon(self.status_data.get("project_exists", False)),
            "Mevcut" if self.status_data.get("project_exists", False) else "Bulunamadı"
        )
        
        table.add_row(
            "Dependencies", 
            status_icon(self.status_data.get("node_modules_exists", False)),
            "Yüklü" if self.status_data.get("node_modules_exists", False) else "Eksik"
        )
        
        table.add_row(
            "Build", 
            status_icon(self.status_data.get("build_exists", False)),
            "Mevcut" if self.status_data.get("build_exists", False) else "Gerekli"
        )
        
        pm2_count = len(self.status_data.get("pm2_processes", []))
        table.add_row(
            "PM2", 
            status_icon(self.status_data.get("pm2_running", False)),
            f"{pm2_count} süreç" if pm2_count > 0 else "Durmuş"
        )
        
        with console.capture() as capture:
            console.print(table)
        
        self.update(capture.get())


class ProcessTable(DataTable):
    """Süreç tablosu widget'ı"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.add_columns("İsim", "PID", "Durum", "CPU", "Bellek", "Yeniden Başlatma")
    
    def update_processes(self, processes: List[Dict]):
        """Süreçleri güncelle"""
        self.clear()
        
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
            
            self.add_row(
                name,
                pid,
                f"{status_icon} {status}",
                cpu,
                memory,
                str(restart_count)
            )


class SystemInfoPanel(Static):
    """Sistem bilgi paneli"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
    
    def update_system_info(self, info: Dict):
        """Sistem bilgilerini güncelle"""
        console = Console()
        
        # Sistem durumu tablosu
        table = Table(title="💻 Sistem Durumu", show_header=True, header_style="bold blue")
        table.add_column("Kaynak", style="cyan", no_wrap=True)
        table.add_column("Kullanım", style="yellow")
        table.add_column("Detay", style="green")
        
        # CPU
        cpu_bar = "█" * int(info["cpu_percent"] / 5) + "░" * (20 - int(info["cpu_percent"] / 5))
        table.add_row("CPU", f"{info['cpu_percent']:.1f}%", cpu_bar)
        
        # Bellek
        memory_bar = "█" * int(info["memory_percent"] / 5) + "░" * (20 - int(info["memory_percent"] / 5))
        table.add_row(
            "Bellek", 
            f"{info['memory_percent']:.1f}%", 
            f"{cpu_bar} ({info['memory_used']}GB/{info['memory_total']}GB)"
        )
        
        # Disk
        disk_bar = "█" * int(info["disk_percent"] / 5) + "░" * (20 - int(info["disk_percent"] / 5))
        table.add_row(
            "Disk", 
            f"{info['disk_percent']:.1f}%", 
            f"{disk_bar} ({info['disk_used']}GB/{info['disk_total']}GB)"
        )
        
        with console.capture() as capture:
            console.print(table)
        
        self.update(capture.get())


class EpicentraTUI(App):
    """Ana TUI uygulaması"""
    
    CSS_PATH = None
    TITLE = "🤖 Epicentra TUI Bot"
    SUB_TITLE = "Terminal Grafik Arayüzlü Proje Yöneticisi"
    
    def __init__(self):
        super().__init__()
        self.project_root = os.path.dirname(os.path.abspath(__file__))
        self.command_runner = CommandRunner(self.project_root)
        self.system_monitor = SystemMonitor()
        self.auto_refresh_enabled = True
        
    def compose(self) -> ComposeResult:
        """UI bileşenlerini oluştur"""
        yield Header()
        
        with Container(id="main-container"):
            with Tabs("Kontrol", "Durum", "Süreçler", "Sistem", "Loglar"):
                # Kontrol Paneli
                with TabPane("Kontrol", id="control-tab"):
                    with Vertical(id="control-panel"):
                        yield Static("🎮 Proje Kontrol Paneli", id="control-title")
                        
                        with Horizontal(id="control-buttons-1"):
                            yield Button("🚀 Başlat", id="start-btn", variant="success")
                            yield Button("🛑 Durdur", id="stop-btn", variant="error")
                            yield Button("🔄 Yeniden Başlat", id="restart-btn", variant="warning")
                            yield Button("🛠️ Dev Mode", id="dev-btn", variant="primary")
                        
                        with Horizontal(id="control-buttons-2"):
                            yield Button("🔨 Build", id="build-btn", variant="default")
                            yield Button("📦 Install", id="install-btn", variant="default")
                            yield Button("🧹 Temizle", id="clean-btn", variant="default")
                            yield Button("🔄 Güncelle", id="update-btn", variant="default")
                        
                        with Horizontal(id="quick-actions"):
                            yield Button("📊 Durumu Yenile", id="refresh-btn", variant="default")
                            yield Switch(value=True, id="auto-refresh-switch")
                            yield Static("Otomatik Yenileme", id="auto-refresh-label")
                
                # Durum Paneli
                with TabPane("Durum", id="status-tab"):
                    yield StatusPanel(id="status-panel")
                
                # Süreç Paneli
                with TabPane("Süreçler", id="processes-tab"):
                    with Vertical():
                        yield Static("🔧 PM2 Süreç Yöneticisi", id="processes-title")
                        yield ProcessTable(id="process-table")
                
                # Sistem Paneli
                with TabPane("Sistem", id="system-tab"):
                    yield SystemInfoPanel(id="system-info")
                
                # Log Paneli
                with TabPane("Loglar", id="logs-tab"):
                    with Vertical():
                        with Horizontal(id="log-controls"):
                            yield Button("🗑️ Temizle", id="clear-logs-btn", variant="error")
                            yield Button("📋 Kaydet", id="save-logs-btn", variant="default")
                            yield Static("Son 50 log gösteriliyor", id="log-info")
                        
                        yield ScrollableContainer(
                            LogViewer(id="log-viewer"),
                            id="log-container"
                        )
        
        yield Footer()
    
    def on_mount(self) -> None:
        """Uygulama başlatıldığında"""
        self.log_viewer = self.query_one("#log-viewer", LogViewer)
        self.log_viewer.add_log("🤖 Epicentra TUI Bot başlatıldı!", "info")
        self.log_viewer.add_log("Proje durumu kontrol ediliyor...", "info")
        
        # İlk veri yüklemesi
        self.call_after_refresh(self.initial_data_load)
    
    async def initial_data_load(self) -> None:
        """İlk veri yüklemesi"""
        await self.update_data()
        # Otomatik yenileme başlat
        if self.auto_refresh_enabled:
            self.set_timer(5.0, self.update_data)
    
    async def update_data(self) -> None:
        """Verileri güncelle"""
        try:
            # Proje durumunu güncelle
            status = self.command_runner.get_project_status()
            status_panel = self.query_one("#status-panel", StatusPanel)
            status_panel.update_status(status)
            
            # Süreçleri güncelle
            process_table = self.query_one("#process-table", ProcessTable)
            process_table.update_processes(status["pm2_processes"])
            
            # Sistem bilgilerini güncelle
            system_info = self.system_monitor.get_system_info()
            system_panel = self.query_one("#system-info", SystemInfoPanel)
            system_panel.update_system_info(system_info)
            
        except Exception as e:
            if hasattr(self, 'log_viewer'):
                self.log_viewer.add_log(f"Veri güncelleme hatası: {str(e)}", "error")
        
        # Tekrar zamanlayıcı kur
        if self.auto_refresh_enabled:
            self.set_timer(5.0, self.update_data)
    
    async def on_button_pressed(self, event: Button.Pressed) -> None:
        """Buton tıklama olayları"""
        button_id = event.button.id
        
        # Komut butonları
        command_map = {
            "start-btn": "start",
            "stop-btn": "stop",
            "restart-btn": "restart",
            "dev-btn": "dev",
            "build-btn": "build",
            "install-btn": "install",
            "clean-btn": "clean",
            "update-btn": "update"
        }
        
        if button_id in command_map:
            command = command_map[button_id]
            await self.execute_command(command)
        
        elif button_id == "refresh-btn":
            self.log_viewer.add_log("🔄 Durum yenileniyor...", "info")
            await self.update_data()
        
        elif button_id == "clear-logs-btn":
            self.log_viewer.clear_logs()
            self.log_viewer.add_log("🗑️ Loglar temizlendi", "info")
        
        elif button_id == "save-logs-btn":
            await self.save_logs()
    
    def on_switch_changed(self, event: Switch.Changed) -> None:
        """Switch değişiklik olayları"""
        if event.switch.id == "auto-refresh-switch":
            self.auto_refresh_enabled = event.value
            status = "açık" if event.value else "kapalı"
            self.log_viewer.add_log(f"🔄 Otomatik yenileme {status}", "info")
    
    async def execute_command(self, command: str) -> None:
        """Komut çalıştır"""
        self.log_viewer.add_log(f"🚀 Komut çalıştırılıyor: {command}", "info")
        
        try:
            result = await self.command_runner.run_command(command)
            
            if result["success"]:
                self.log_viewer.add_log(f"✅ Komut başarılı: {command}", "success")
                if result["stdout"]:
                    for line in result["stdout"].strip().split('\n'):
                        if line.strip():
                            self.log_viewer.add_log(line, "info")
            else:
                self.log_viewer.add_log(f"❌ Komut başarısız: {command}", "error")
                if result["error"]:
                    self.log_viewer.add_log(f"Hata: {result['error']}", "error")
                if result["stderr"]:
                    for line in result["stderr"].strip().split('\n'):
                        if line.strip():
                            self.log_viewer.add_log(line, "error")
            
            # Durum güncelle
            await self.update_data()
            
        except Exception as e:
            self.log_viewer.add_log(f"❌ Komut çalıştırma hatası: {str(e)}", "error")
    
    async def save_logs(self) -> None:
        """Logları dosyaya kaydet"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            log_file = f"epicentra_logs_{timestamp}.txt"
            
            with open(log_file, 'w', encoding='utf-8') as f:
                f.write("# Epicentra TUI Bot Logları\n")
                f.write(f"# Oluşturulma Tarihi: {datetime.now()}\n\n")
                for log in self.log_viewer.logs:
                    f.write(f"{log}\n")
            
            self.log_viewer.add_log(f"💾 Loglar kaydedildi: {log_file}", "success")
            
        except Exception as e:
            self.log_viewer.add_log(f"❌ Log kaydetme hatası: {str(e)}", "error")


def main():
    """Ana fonksiyon"""
    # Python ve gerekli kütüphaneleri kontrol et
    try:
        import textual
        import rich
        import psutil
    except ImportError as e:
        print(f"❌ Eksik kütüphane: {e}")
        print("📦 Gerekli kütüphaneleri yüklemek için:")
        print("   pip install -r requirements.txt")
        return
    
    # Proje dizinini kontrol et
    project_root = os.path.dirname(os.path.abspath(__file__))
    if not os.path.exists(os.path.join(project_root, "package.json")):
        print("❌ Bu script Epicentra proje dizininde çalıştırılmalıdır!")
        return
    
    # TUI uygulamasını başlat
    app = EpicentraTUI()
    app.run()


if __name__ == "__main__":
    main()
