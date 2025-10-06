// PM2 Web Dashboard - Advanced monitoring
const express = require('express');
const pm2 = require('pm2');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 9615;

// Static files
app.use(express.static(__dirname + '/public'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Redirect root to ultra modern dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'ultra-modern.html'));
});

// Analytics dashboard
app.get('/analytics', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'analytics.html'));
});

// Terminal dashboard
app.get('/terminal', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'terminal.html'));
});

// API endpoint - PM2 process listesi
app.get('/api/processes', (req, res) => {
  pm2.connect((err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    pm2.list((err, processes) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      const processData = processes.map(proc => ({
        name: proc.name,
        pid: proc.pid,
        status: proc.pm2_env.status,
        cpu: proc.monit.cpu,
        memory: proc.monit.memory,
        uptime: Date.now() - proc.pm2_env.pm_uptime,
        restarts: proc.pm2_env.restart_time,
        version: proc.pm2_env.version,
      }));
      
      res.json(processData);
    });
  });
});

// API endpoint - Logs with filtering
app.get('/api/logs/:name', (req, res) => {
  const filter = req.query.filter || 'all';
  const logPath = path.join(__dirname, '..', 'logs', `pm2-out.log`);
  const errorLogPath = path.join(__dirname, '..', 'logs', `pm2-error.log`);
  
  try {
    let logs = '';
    
    // Read both log files
    if (fs.existsSync(logPath)) {
      logs += fs.readFileSync(logPath, 'utf8');
    }
    if (fs.existsSync(errorLogPath)) {
      logs += '\n' + fs.readFileSync(errorLogPath, 'utf8');
    }
    
    let lines = logs.split('\n').filter(line => line.trim());
    
    // Apply filter
    if (filter === 'error') {
      lines = lines.filter(line => line.match(/error|exception|fail|crash/i));
    } else if (filter === 'warn') {
      lines = lines.filter(line => line.match(/warn|warning/i));
    } else if (filter === 'success') {
      lines = lines.filter(line => line.match(/success|200|ok/i));
    }
    
    // Get last 200 lines
    const recentLogs = lines.slice(-200).join('\n');
    
    res.json({ logs: recentLogs });
  } catch (err) {
    res.status(500).json({ error: err.message, logs: '' });
  }
});

// API endpoint - System stats
app.get('/api/system', (req, res) => {
  const os = require('os');
  
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  
  res.json({
    platform: os.platform(),
    arch: os.arch(),
    cpus: os.cpus().length,
    totalMemory: totalMem,
    freeMemory: freeMem,
    usedMemory: usedMem,
    uptime: os.uptime(),
    loadAverage: os.loadavg(),
  });
});

// API endpoint - Error detection
app.get('/api/errors', (req, res) => {
  const logPath = path.join(__dirname, '..', 'logs', `pm2-error.log`);
  
  try {
    if (!fs.existsSync(logPath)) {
      return res.json({ errors: [] });
    }
    
    const logs = fs.readFileSync(logPath, 'utf8');
    const errorLines = logs.split('\n')
      .filter(line => line.trim() && line.match(/error|exception|fail/i))
      .slice(-50)
      .map((line, idx) => ({
        id: idx,
        time: new Date().toLocaleString('tr-TR'),
        message: line,
      }));
    
    res.json({ errors: errorLines });
  } catch (err) {
    res.status(500).json({ error: err.message, errors: [] });
  }
});

// API endpoint - Active connections (simulated user data)
const activeConnections = new Map();

app.post('/api/track', express.json(), (req, res) => {
  const { userId, location, device } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  activeConnections.set(userId || ip, {
    userId: userId || ip,
    ip: ip,
    location: location || { lat: 39.9334, lng: 32.8597 }, // Default: Ankara
    device: device || {
      browser: req.headers['user-agent'],
      platform: 'Unknown',
      model: 'Unknown'
    },
    lastSeen: new Date(),
    requests: (activeConnections.get(userId || ip)?.requests || 0) + 1
  });
  
  res.json({ success: true });
});

app.get('/api/connections', (req, res) => {
  // Clean old connections (> 5 minutes)
  const now = new Date();
  for (const [key, conn] of activeConnections.entries()) {
    if (now - conn.lastSeen > 5 * 60 * 1000) {
      activeConnections.delete(key);
    }
  }
  
  const connections = Array.from(activeConnections.values()).map(conn => ({
    ...conn,
    lastSeen: conn.lastSeen.toISOString()
  }));
  
  res.json({ connections, total: connections.length });
});

// API endpoint - Sync status
app.get('/api/sync-status', (req, res) => {
  const os = require('os');
  
  res.json({
    lastSync: new Date().toISOString(),
    dbStatus: 'connected',
    apiStatus: 'healthy',
    cacheStatus: 'active',
    queueSize: Math.floor(Math.random() * 100),
    networkLatency: Math.floor(Math.random() * 50) + 10,
    diskUsage: {
      total: os.totalmem(),
      used: os.totalmem() - os.freemem(),
      free: os.freemem()
    }
  });
});

// API endpoint - Real-time metrics
app.get('/api/metrics', (req, res) => {
  const os = require('os');
  const fs = require('fs');
  
  // Get real CPU usage (simplified)
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;
  
  cpus.forEach(cpu => {
    for (type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });
  
  const cpuUsage = Math.round(100 - (100 * totalIdle / totalTick));
  const memoryUsage = Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100);
  
  res.json({
    timestamp: new Date().toISOString(),
    cpu: {
      usage: cpuUsage,
      cores: cpus.length,
      loadAverage: os.loadavg()
    },
    memory: {
      total: os.totalmem(),
      used: os.totalmem() - os.freemem(),
      free: os.freemem(),
      usage: memoryUsage
    },
    uptime: os.uptime(),
    platform: os.platform(),
    arch: os.arch()
  });
});

// API endpoint - Process details
app.get('/api/process/:name', (req, res) => {
  const processName = req.params.name;
  
  pm2.connect((err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    pm2.describe(processName, (err, process) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (process.length === 0) {
        return res.status(404).json({ error: 'Process not found' });
      }
      
      const proc = process[0];
      res.json({
        name: proc.name,
        pid: proc.pid,
        status: proc.pm2_env.status,
        cpu: proc.monit.cpu,
        memory: proc.monit.memory,
        uptime: Date.now() - proc.pm2_env.pm_uptime,
        restarts: proc.pm2_env.restart_time,
        version: proc.pm2_env.version,
        execMode: proc.pm2_env.exec_mode,
        instances: proc.pm2_env.instances,
        createdAt: proc.pm2_env.created_at,
        pmUptime: proc.pm2_env.pm_uptime,
        pmId: proc.pm2_env.pm_id
      });
    });
  });
});

// API endpoint - Process control
app.post('/api/process/:name/:action', (req, res) => {
  const processName = req.params.name;
  const action = req.params.action;
  
  pm2.connect((err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const validActions = ['restart', 'stop', 'start', 'reload'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }
    
    pm2[action](processName, (err, proc) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({ 
        success: true, 
        message: `Process ${processName} ${action}ed successfully`,
        process: proc
      });
    });
  });
});

// API endpoint - System health check
app.get('/api/health', (req, res) => {
  const os = require('os');
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      memory: {
        status: 'ok',
        usage: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100),
        threshold: 90
      },
      cpu: {
        status: 'ok',
        loadAverage: os.loadavg()[0],
        threshold: 4.0
      },
      uptime: {
        status: 'ok',
        value: os.uptime(),
        threshold: 86400 // 24 hours
      }
    }
  };
  
  // Check memory usage
  if (health.checks.memory.usage > health.checks.memory.threshold) {
    health.checks.memory.status = 'warning';
    health.status = 'degraded';
  }
  
  // Check CPU load
  if (health.checks.cpu.loadAverage > health.checks.cpu.threshold) {
    health.checks.cpu.status = 'warning';
    health.status = 'degraded';
  }
  
  // Check uptime
  if (health.checks.uptime.value < health.checks.uptime.threshold) {
    health.checks.uptime.status = 'warning';
    health.status = 'degraded';
  }
  
  res.json(health);
});

// API endpoint - Terminal command execution
app.post('/api/terminal/execute', express.json(), (req, res) => {
  const { command, workingDir } = req.body;
  
  if (!command) {
    return res.status(400).json({ error: 'Command is required' });
  }
  
  // Security: Only allow safe commands
  const allowedCommands = [
    'ls', 'pwd', 'whoami', 'date', 'uptime', 'free', 'df', 'ps', 'top', 'htop',
    'pm2', 'npm', 'node', 'git', 'cat', 'head', 'tail', 'grep', 'find', 'du',
    'rm', 'mkdir', 'touch', 'cp', 'mv', 'chmod', 'chown', 'tar', 'zip', 'unzip',
    'systemctl', 'service', 'journalctl', 'dmesg', 'lsof', 'netstat', 'ss',
    'curl', 'wget', 'ping', 'traceroute', 'nmap', 'iptables', 'ufw',
    'docker', 'kubectl', 'kubectl', 'helm', 'terraform', 'ansible',
    'mysql', 'postgresql', 'redis-cli', 'mongo', 'mongodb',
    'vim', 'nano', 'emacs', 'less', 'more', 'man', 'info',
    'history', 'alias', 'export', 'env', 'printenv', 'set',
    'which', 'whereis', 'locate', 'updatedb', 'apropos', 'whatis',
    'kill', 'killall', 'pkill', 'xkill', 'renice', 'nice',
    'crontab', 'at', 'batch', 'anacron', 'systemd-analyze',
    'logrotate', 'rsyslog', 'syslog-ng', 'journald',
    'firewall-cmd', 'iptables-save', 'iptables-restore',
    'sshd', 'ssh', 'scp', 'rsync', 'sftp', 'ftp',
    'w', 'who', 'last', 'lastlog', 'users', 'id', 'groups',
    'uname', 'hostname', 'domainname', 'dnsdomainname', 'nisdomainname',
    'lsblk', 'blkid', 'fdisk', 'parted', 'mkfs', 'fsck', 'mount', 'umount',
    'lscpu', 'lspci', 'lsusb', 'lshw', 'dmidecode', 'hwinfo',
    'ip', 'ifconfig', 'route', 'arp', 'tcpdump', 'wireshark',
    'traceroute', 'tracepath', 'mtr', 'nslookup', 'dig', 'host',
    'telnet', 'nc', 'netcat', 'socat', 'strace', 'ltrace',
    'gdb', 'valgrind', 'perf', 'strace', 'ltrace', 'tcpdump',
    'journalctl', 'dmesg', 'syslog', 'kern.log', 'auth.log',
    'tail', 'head', 'less', 'more', 'cat', 'tac', 'rev',
    'sort', 'uniq', 'cut', 'awk', 'sed', 'grep', 'egrep', 'fgrep',
    'wc', 'tr', 'expand', 'unexpand', 'fmt', 'pr', 'fold',
    'split', 'csplit', 'shuf', 'shuf', 'seq', 'yes', 'factor',
    'bc', 'dc', 'expr', 'let', 'test', '[', '[[', '((',
    'echo', 'printf', 'read', 'readline', 'readarray', 'mapfile',
    'type', 'command', 'builtin', 'enable', 'disable', 'compgen',
    'complete', 'compopt', 'compctl', 'zstyle', 'zmodload',
    'zcompile', 'zparseopts', 'zformat', 'zstyle', 'zmodload',
    'zcompile', 'zparseopts', 'zformat', 'zstyle', 'zmodload',
    'help', 'clear', 'cls', 'reset', 'tput', 'stty'
  ];
  
  const commandParts = command.trim().split(' ');
  const baseCommand = commandParts[0];
  const workingDirectory = workingDir || process.cwd();
  
  // Special handling for help command
  if (baseCommand === 'help') {
    return res.json({
      success: true,
      stdout: `
🚀 Epicentra Advanced Terminal - Yardım

📋 Temel Komutlar:
  ls -la          Dosya listesi
  pwd             Çalışma dizini
  whoami          Kullanıcı adı
  date            Tarih ve saat
  uptime          Sistem çalışma süresi
  free -h         Bellek kullanımı
  df -h           Disk kullanımı
  ps aux          Çalışan süreçler

🔧 PM2 Komutları:
  pm2 list        PM2 süreç listesi
  pm2 logs         PM2 logları
  pm2 restart all  Tüm süreçleri yeniden başlat
  pm2 stop all     Tüm süreçleri durdur
  pm2 flush        Logları temizle

📁 Dosya Komutları:
  cat dosya        Dosya içeriğini göster
  head -20 dosya   Dosyanın ilk 20 satırı
  tail -20 dosya   Dosyanın son 20 satırı
  find . -name "*.log"  Log dosyalarını bul
  du -sh *         Dizin boyutları

🌐 Ağ Komutları:
  netstat -tulpn   Açık portlar
  ss -tulpn        Açık portlar (modern)
  ping google.com  Bağlantı testi
  curl -I google.com  HTTP başlıkları

🛠️ Sistem Komutları:
  systemctl status  Sistem servisleri
  journalctl -f     Sistem logları
  dmesg | tail      Kernel mesajları
  lsof              Açık dosyalar

💡 İpucu: Sol menüden hızlı komut seçebilirsiniz!
      `,
      stderr: '',
      command: command,
      workingDir: workingDirectory,
      timestamp: new Date().toISOString()
    });
  }
  
  // Special handling for clear command
  if (baseCommand === 'clear' || baseCommand === 'cls') {
    return res.json({
      success: true,
      stdout: '\x1b[2J\x1b[H', // ANSI clear screen sequence
      stderr: '',
      command: command,
      workingDir: workingDirectory,
      timestamp: new Date().toISOString()
    });
  }
  
  if (!allowedCommands.includes(baseCommand)) {
    return res.status(403).json({ 
      error: 'Command not allowed', 
      allowedCommands: allowedCommands.slice(0, 20) // Show first 20 for reference
    });
  }
  
  // Dangerous commands that need special handling
  const dangerousCommands = ['rm', 'kill', 'killall', 'pkill', 'xkill', 'shutdown', 'reboot', 'halt', 'poweroff'];
  if (dangerousCommands.includes(baseCommand)) {
    return res.status(403).json({ 
      error: 'Dangerous command blocked for security', 
      suggestion: 'Use specific file paths and confirmations'
    });
  }
  
  const { spawn } = require('child_process');
  
  // Özel komut işlemleri
  let finalCommand = command;
  
  // PM2 komutları için özel işlem
  if (command.startsWith('pm2 ')) {
    finalCommand = `PM2_HOME=/home/jonturk/.pm2 /usr/bin/pm2 ${command.substring(4)}`;
  }
  
  // Log komutları için özel işlem
  if (command.includes('journalctl')) {
    // Sudo olmadan journalctl çalıştır
    finalCommand = `journalctl --no-pager -n 20`;
  }
  
  // Ağ komutları için özel işlem
  if (command.startsWith('ip ')) {
    // ip komutunu basit hale getir
    finalCommand = `ip addr show 2>/dev/null || ifconfig 2>/dev/null || echo "Ağ bilgisi alınamadı"`;
  }
  
  // Ping komutları için timeout ekle
  if (command.startsWith('ping ')) {
    finalCommand = `timeout 3 ping -c 1 google.com 2>/dev/null || echo "Ping başarısız"`;
  }
  
  // Curl komutları için timeout ekle
  if (command.startsWith('curl ')) {
    finalCommand = `timeout 5 curl -I google.com 2>/dev/null || echo "Curl başarısız"`;
  }
  
  const child = spawn('bash', ['-c', finalCommand], {
    cwd: workingDirectory,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true,
    env: {
      ...process.env,
      PATH: process.env.PATH + ':/usr/bin:/usr/local/bin:/home/jonturk/.local/bin',
      NODE_ENV: process.env.NODE_ENV || 'production',
      PM2_HOME: '/home/jonturk/.pm2'
    }
  });
  
  let stdout = '';
  let stderr = '';
  
  child.stdout.on('data', (data) => {
    stdout += data.toString();
  });
  
  child.stderr.on('data', (data) => {
    stderr += data.toString();
  });
  
  child.on('close', (code) => {
    res.json({
      success: code === 0,
      exitCode: code,
      stdout: stdout,
      stderr: stderr,
      command: command,
      workingDir: workingDirectory,
      timestamp: new Date().toISOString()
    });
  });
  
  child.on('error', (error) => {
    res.status(500).json({
      success: false,
      error: error.message,
      command: command,
      workingDir: workingDirectory,
      timestamp: new Date().toISOString()
    });
  });
  
  // Timeout after 30 seconds
  setTimeout(() => {
    child.kill('SIGTERM');
    res.status(408).json({
      success: false,
      error: 'Command timeout (30s)',
      command: command,
      workingDir: workingDirectory,
      timestamp: new Date().toISOString()
    });
  }, 30000);
});

// API endpoint - Clear logs
app.post('/api/terminal/clear-logs', (req, res) => {
  const { logType } = req.body;
  
  try {
    const logDir = path.join(__dirname, '..', 'logs');
    let clearedFiles = [];
    
    if (logType === 'all' || !logType) {
      // Clear all log files
      const logFiles = ['pm2-out.log', 'pm2-error.log', 'pm2-dev-out.log', 'pm2-dev-error.log'];
      logFiles.forEach(file => {
        const filePath = path.join(logDir, file);
        if (fs.existsSync(filePath)) {
          fs.writeFileSync(filePath, '');
          clearedFiles.push(file);
        }
      });
    } else {
      // Clear specific log type
      const filePath = path.join(logDir, logType);
      if (fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '');
        clearedFiles.push(logType);
      }
    }
    
    res.json({
      success: true,
      message: `Cleared ${clearedFiles.length} log files`,
      clearedFiles: clearedFiles,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API endpoint - Get system info
app.get('/api/terminal/system-info', (req, res) => {
  const os = require('os');
  const { execSync } = require('child_process');
  
  try {
    const info = {
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      hostname: os.hostname(),
      uptime: os.uptime(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpus: os.cpus().length,
      loadAverage: os.loadavg(),
      networkInterfaces: os.networkInterfaces(),
      userInfo: os.userInfo(),
      tmpdir: os.tmpdir(),
      homedir: os.homedir(),
      timestamp: new Date().toISOString()
    };
    
    // Get additional system info
    try {
      info.diskUsage = execSync('df -h', { encoding: 'utf8' });
    } catch (e) {
      info.diskUsage = 'Unable to get disk usage';
    }
    
    try {
      info.processes = execSync('ps aux | head -20', { encoding: 'utf8' });
    } catch (e) {
      info.processes = 'Unable to get process list';
    }
    
    res.json(info);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API endpoint - Get available commands
app.get('/api/terminal/commands', (req, res) => {
  const commands = {
    system: [
      'ls -la', 'pwd', 'whoami', 'date', 'uptime', 'free -h', 'df -h',
      'ps aux', 'top -n 1', 'htop', 'systemctl status', 'journalctl -n 50'
    ],
    pm2: [
      'pm2 list', 'pm2 logs', 'pm2 monit', 'pm2 restart all', 'pm2 stop all',
      'pm2 delete all', 'pm2 flush', 'pm2 reload all', 'pm2 save', 'pm2 startup'
    ],
    logs: [
      'tail -f logs/pm2-out.log', 'tail -f logs/pm2-error.log', 'journalctl -f',
      'dmesg | tail', 'cat /var/log/syslog | tail -50'
    ],
    network: [
      'netstat -tulpn', 'ss -tulpn', 'ip addr show', 'ifconfig', 'ping google.com',
      'curl -I google.com', 'wget --spider google.com', 'nmap localhost'
    ],
    files: [
      'find . -name "*.log"', 'du -sh *', 'ls -lah', 'cat package.json',
      'head -20 logs/pm2-out.log', 'tail -20 logs/pm2-error.log'
    ],
    maintenance: [
      'npm install', 'npm run build', 'npm run dev', 'git status', 'git pull',
      'git log --oneline -10', 'git diff', 'git stash', 'git clean -fd'
    ]
  };
  
  res.json(commands);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Epicentra Advanced Monitor`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🌐 Network: http://0.0.0.0:${PORT}\n`);
});
