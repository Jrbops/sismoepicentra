module.exports = {
  apps: [
    {
      name: 'epicentra-dev',
      script: 'npm',
      args: 'run dev',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        HOST: '0.0.0.0',
        GOOGLE_APPLICATION_CREDENTIALS: '/home/jonturk/Masaüstü/projects/Epicentra/epicentraio-firebase-adminsdk.json',
      },
      error_file: './logs/pm2-dev-error.log',
      out_file: './logs/pm2-dev-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 1000,
    },
    {
      name: 'epicentra-server',
      script: '.output/server/index.mjs',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 8080,
        HOST: '0.0.0.0', // Tüm network interface'lerden erişim
        GOOGLE_APPLICATION_CREDENTIALS: '/home/jonturk/Masaüstü/projects/Epicentra/epicentraio-firebase-adminsdk.json',
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
  ],
};
