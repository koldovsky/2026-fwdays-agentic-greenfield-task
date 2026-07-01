module.exports = {
  apps: [
    {
      name: 'siebel-review',
      script: 'src/index.js',
      cwd: __dirname,

      // .env завантажується самим додатком через dotenv
      env_file: '.env',

      // Автоперезапуск при падінні
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,

      // Логи PM2 (окремо від Winston logs/)
      out_file: 'logs/pm2-out.log',
      error_file: 'logs/pm2-error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
