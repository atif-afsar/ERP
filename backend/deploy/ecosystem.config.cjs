// PM2 Process Manager Configuration for VPS
module.exports = {
  apps: [
    {
      name: 'edunexus-api',
      script: './dist/server.js',
      cwd: '/var/www/edunexus/backend',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: '/var/log/edunexus/api-error.log',
      out_file: '/var/log/edunexus/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      name: 'edunexus-worker',
      script: './dist/worker.js',
      cwd: '/var/www/edunexus/backend',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/var/log/edunexus/worker-error.log',
      out_file: '/var/log/edunexus/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
