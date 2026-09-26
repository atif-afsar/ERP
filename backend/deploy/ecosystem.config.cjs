// PM2 Process Manager Configuration for VPS
module.exports = {
  apps: [
    {
      name: 'edunexus-api',
      script: './dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: '/var/log/edunexus/error.log',
      out_file: '/var/log/edunexus/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
