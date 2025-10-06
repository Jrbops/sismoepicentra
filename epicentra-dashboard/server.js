const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { exec, spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3001;
const PROJECT_ROOT = path.join(__dirname, '..');

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Ana sayfa
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Proje durumunu kontrol et
app.get('/api/status', async (req, res) => {
    try {
        const status = await getProjectStatus();
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Proje komutlarını çalıştır
app.post('/api/command', (req, res) => {
    const { command } = req.body;
    
    if (!isValidCommand(command)) {
        return res.status(400).json({ error: 'Geçersiz komut' });
    }
    
    executeCommand(command, (error, result) => {
        if (error) {
            res.status(500).json({ error: error.message });
        } else {
            res.json({ success: true, result });
        }
    });
});

// PM2 durumunu al
app.get('/api/pm2/status', (req, res) => {
    exec('pm2 jlist', (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: 'PM2 durumu alınamadı' });
        }
        
        try {
            const processes = JSON.parse(stdout);
            res.json(processes);
        } catch (parseError) {
            res.status(500).json({ error: 'PM2 çıktısı parse edilemedi' });
        }
    });
});

// Logları al
app.get('/api/logs', (req, res) => {
    exec('pm2 logs --lines 100 --nostream', (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: 'Loglar alınamadı' });
        }
        
        res.json({ logs: stdout });
    });
});

// Socket.IO bağlantıları
io.on('connection', (socket) => {
    console.log('Yeni kullanıcı bağlandı:', socket.id);
    
    // Gerçek zamanlı log akışı
    socket.on('subscribe-logs', () => {
        const logProcess = spawn('pm2', ['logs', '--lines', '0']);
        
        logProcess.stdout.on('data', (data) => {
            socket.emit('log-data', data.toString());
        });
        
        logProcess.stderr.on('data', (data) => {
            socket.emit('log-error', data.toString());
        });
        
        socket.on('disconnect', () => {
            logProcess.kill();
        });
    });
    
    // Komut çalıştırma
    socket.on('execute-command', (command) => {
        if (!isValidCommand(command)) {
            socket.emit('command-error', 'Geçersiz komut');
            return;
        }
        
        socket.emit('command-start', `Komut çalıştırılıyor: ${command}`);
        
        executeCommand(command, (error, result) => {
            if (error) {
                socket.emit('command-error', error.message);
            } else {
                socket.emit('command-success', result);
            }
        });
    });
});

// Yardımcı fonksiyonlar
async function getProjectStatus() {
    const status = {
        projectExists: await fs.pathExists(path.join(PROJECT_ROOT, 'package.json')),
        nodeModulesExists: await fs.pathExists(path.join(PROJECT_ROOT, 'node_modules')),
        buildExists: await fs.pathExists(path.join(PROJECT_ROOT, '.output')),
        pm2Running: false,
        processes: []
    };
    
    return new Promise((resolve) => {
        exec('pm2 jlist', (error, stdout) => {
            if (!error) {
                try {
                    const processes = JSON.parse(stdout);
                    status.pm2Running = processes.length > 0;
                    status.processes = processes;
                } catch (e) {
                    // PM2 çıktısı parse edilemedi
                }
            }
            resolve(status);
        });
    });
}

function isValidCommand(command) {
    const allowedCommands = [
        'start', 'stop', 'restart', 'status', 
        'dev', 'build', 'logs', 'install', 
        'clean', 'update'
    ];
    return allowedCommands.includes(command);
}

function executeCommand(command, callback) {
    const scriptPath = path.join(PROJECT_ROOT, 'epicentra-bot.sh');
    
    exec(`bash "${scriptPath}" ${command}`, {
        cwd: PROJECT_ROOT,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    }, (error, stdout, stderr) => {
        if (error) {
            callback(error, null);
        } else {
            callback(null, { stdout, stderr });
        }
    });
}

// Sunucuyu başlat
server.listen(PORT, () => {
    console.log(`🚀 Epicentra Dashboard ${PORT} portunda çalışıyor`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
});
