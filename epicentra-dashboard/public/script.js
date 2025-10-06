// Socket.IO bağlantısı
const socket = io();

// DOM elementleri
const connectionStatus = document.getElementById('connectionStatus');
const connectionText = document.getElementById('connectionText');
const outputContent = document.getElementById('outputContent');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');
const notificationContainer = document.getElementById('notificationContainer');
const processList = document.getElementById('processList');

// Durum elementleri
const projectStatusText = document.getElementById('projectStatusText');
const dependenciesStatusText = document.getElementById('dependenciesStatusText');
const buildStatusText = document.getElementById('buildStatusText');
const pm2StatusText = document.getElementById('pm2StatusText');

// Değişkenler
let isLogsSubscribed = false;
let logBuffer = [];

// Socket.IO olayları
socket.on('connect', () => {
    connectionStatus.classList.add('connected');
    connectionText.textContent = 'Bağlandı';
    showNotification('Sunucuya başarıyla bağlandı!', 'success');
    loadProjectStatus();
    loadProcesses();
});

socket.on('disconnect', () => {
    connectionStatus.classList.remove('connected');
    connectionText.textContent = 'Bağlantı kesildi';
    showNotification('Sunucu bağlantısı kesildi!', 'error');
});

socket.on('log-data', (data) => {
    if (isLogsSubscribed) {
        appendLog(data, 'info');
    }
});

socket.on('log-error', (data) => {
    if (isLogsSubscribed) {
        appendLog(data, 'error');
    }
});

socket.on('command-start', (message) => {
    appendLog(`🚀 ${message}`, 'info');
    showLoading('Komut çalıştırılıyor...');
});

socket.on('command-success', (result) => {
    hideLoading();
    appendLog('✅ Komut başarıyla tamamlandı!', 'success');
    if (result.stdout) {
        appendLog(result.stdout, 'info');
    }
    if (result.stderr) {
        appendLog(result.stderr, 'warning');
    }
    showNotification('Komut başarıyla çalıştırıldı!', 'success');
    
    // Durum ve süreçleri yenile
    setTimeout(() => {
        loadProjectStatus();
        loadProcesses();
    }, 1000);
});

socket.on('command-error', (error) => {
    hideLoading();
    appendLog(`❌ Hata: ${error}`, 'error');
    showNotification(`Komut hatası: ${error}`, 'error');
});

// Kontrol butonları
document.querySelectorAll('.control-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const command = btn.dataset.command;
        if (command) {
            executeCommand(command);
        }
    });
});

// Temizleme butonu
document.getElementById('clearOutput').addEventListener('click', () => {
    clearOutput();
});

// Canlı log butonu
document.getElementById('toggleLogs').addEventListener('click', () => {
    toggleLogs();
});

// Durumu yenile butonu
document.getElementById('refreshStatus').addEventListener('click', (e) => {
    e.preventDefault();
    loadProjectStatus();
    loadProcesses();
    showNotification('Durum yenilendi!', 'info');
});

// Fonksiyonlar
function executeCommand(command) {
    socket.emit('execute-command', command);
}

function appendLog(message, type = 'info') {
    const logLine = document.createElement('div');
    logLine.className = `log-line ${type}`;
    
    // Timestamp ekle
    const timestamp = new Date().toLocaleTimeString();
    logLine.innerHTML = `<span style="color: #666;">[${timestamp}]</span> ${message}`;
    
    // Welcome message'ı kaldır
    const welcomeMessage = outputContent.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }
    
    outputContent.appendChild(logLine);
    outputContent.scrollTop = outputContent.scrollHeight;
    
    // Log buffer'a ekle
    logBuffer.push({ message, type, timestamp });
    
    // Buffer boyutunu sınırla
    if (logBuffer.length > 1000) {
        logBuffer = logBuffer.slice(-500);
    }
}

function clearOutput() {
    outputContent.innerHTML = `
        <div class="welcome-message">
            <i class="fas fa-robot"></i>
            <p>Çıktı temizlendi!</p>
            <p>Yeni komutlar için hazır.</p>
        </div>
    `;
    logBuffer = [];
    showNotification('Çıktı temizlendi!', 'info');
}

function toggleLogs() {
    const btn = document.getElementById('toggleLogs');
    
    if (!isLogsSubscribed) {
        socket.emit('subscribe-logs');
        isLogsSubscribed = true;
        btn.innerHTML = '<i class="fas fa-eye-slash"></i> Canlı Logları Durdur';
        btn.style.background = '#ff6b6b';
        appendLog('📡 Canlı log akışı başlatıldı', 'info');
        showNotification('Canlı loglar başlatıldı!', 'info');
    } else {
        socket.disconnect();
        socket.connect();
        isLogsSubscribed = false;
        btn.innerHTML = '<i class="fas fa-eye"></i> Canlı Loglar';
        btn.style.background = '#667eea';
        appendLog('📡 Canlı log akışı durduruldu', 'warning');
        showNotification('Canlı loglar durduruldu!', 'warning');
    }
}

function showLoading(text = 'İşlem yapılıyor...') {
    loadingText.textContent = text;
    loadingOverlay.classList.add('show');
}

function hideLoading() {
    loadingOverlay.classList.remove('show');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    notification.innerHTML = `
        <i class="${icons[type]}"></i>
        <span>${message}</span>
    `;
    
    notificationContainer.appendChild(notification);
    
    // 5 saniye sonra kaldır
    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

async function loadProjectStatus() {
    try {
        const response = await fetch('/api/status');
        const status = await response.json();
        
        updateStatusCard('projectStatus', status.projectExists, 
            status.projectExists ? 'Proje mevcut' : 'Proje bulunamadı');
        
        updateStatusCard('dependenciesStatus', status.nodeModulesExists, 
            status.nodeModulesExists ? 'Dependencies yüklü' : 'Dependencies eksik');
        
        updateStatusCard('buildStatus', status.buildExists, 
            status.buildExists ? 'Build mevcut' : 'Build gerekli');
        
        updateStatusCard('pm2Status', status.pm2Running, 
            status.pm2Running ? `${status.processes.length} süreç çalışıyor` : 'PM2 durmuş');
            
    } catch (error) {
        console.error('Durum yüklenirken hata:', error);
        showNotification('Durum yüklenirken hata oluştu!', 'error');
    }
}

function updateStatusCard(cardId, isSuccess, text) {
    const card = document.getElementById(cardId);
    const textElement = document.getElementById(cardId.replace('Status', 'StatusText'));
    
    card.classList.remove('success', 'error', 'warning');
    
    if (isSuccess) {
        card.classList.add('success');
    } else {
        card.classList.add('error');
    }
    
    textElement.textContent = text;
}

async function loadProcesses() {
    try {
        const response = await fetch('/api/pm2/status');
        const processes = await response.json();
        
        renderProcesses(processes);
    } catch (error) {
        console.error('Süreçler yüklenirken hata:', error);
        processList.innerHTML = `
            <div class="loading">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Süreçler yüklenirken hata oluştu</span>
            </div>
        `;
    }
}

function renderProcesses(processes) {
    if (!processes || processes.length === 0) {
        processList.innerHTML = `
            <div class="loading">
                <i class="fas fa-sleep"></i>
                <span>Çalışan süreç bulunamadı</span>
            </div>
        `;
        return;
    }
    
    processList.innerHTML = processes.map(process => {
        const status = process.pm2_env.status;
        const statusClass = status === 'online' ? '' : 
                          status === 'stopped' ? 'stopped' : 'error';
        
        const memory = process.monit ? 
            `${Math.round(process.monit.memory / 1024 / 1024)}MB` : 'N/A';
        const cpu = process.monit ? 
            `${process.monit.cpu}%` : 'N/A';
        
        return `
            <div class="process-item">
                <div class="process-info">
                    <div class="process-status ${statusClass}"></div>
                    <div class="process-details">
                        <h4>${process.name}</h4>
                        <p>PID: ${process.pid || 'N/A'} | CPU: ${cpu} | RAM: ${memory} | Durum: ${status}</p>
                    </div>
                </div>
                <div class="process-actions">
                    <button class="process-btn restart-process-btn" onclick="restartProcess('${process.name}')">
                        <i class="fas fa-redo"></i>
                    </button>
                    <button class="process-btn stop-process-btn" onclick="stopProcess('${process.name}')">
                        <i class="fas fa-stop"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function restartProcess(name) {
    showLoading(`${name} yeniden başlatılıyor...`);
    fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'restart' })
    })
    .then(response => response.json())
    .then(result => {
        hideLoading();
        if (result.success) {
            showNotification(`${name} yeniden başlatıldı!`, 'success');
            loadProcesses();
        } else {
            showNotification(`${name} yeniden başlatılamadı!`, 'error');
        }
    })
    .catch(error => {
        hideLoading();
        showNotification('Hata oluştu!', 'error');
    });
}

function stopProcess(name) {
    showLoading(`${name} durduruluyor...`);
    fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'stop' })
    })
    .then(response => response.json())
    .then(result => {
        hideLoading();
        if (result.success) {
            showNotification(`${name} durduruldu!`, 'success');
            loadProcesses();
        } else {
            showNotification(`${name} durdurulamadı!`, 'error');
        }
    })
    .catch(error => {
        hideLoading();
        showNotification('Hata oluştu!', 'error');
    });
}

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    // Animasyonları başlat
    setTimeout(() => {
        document.querySelectorAll('.animate__animated').forEach(el => {
            el.style.opacity = '1';
        });
    }, 100);
    
    // İlk durum yüklemesi
    if (socket.connected) {
        loadProjectStatus();
        loadProcesses();
    }
});

// Otomatik yenileme (30 saniyede bir)
setInterval(() => {
    if (socket.connected) {
        loadProjectStatus();
        loadProcesses();
    }
}, 30000);
