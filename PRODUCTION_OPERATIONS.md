# Production Operations & Deployment

This document dictates how the EduNexus ERP is deployed, managed, and monitored in production on the VPS.

## 1. Nginx Reverse Proxy Setup

Create an Nginx configuration file:
`sudo nano /etc/nginx/sites-available/edunexus`

```nginx
server {
    listen 80;
    server_name erp.example.com; # REPLACE WITH YOUR DOMAIN

    # Increase payload limits for Razorpay webhooks and uploads
    client_max_body_size 5M;
    
    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Frontend - Serve static files
    location / {
        root /var/www/edunexus/current/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Aggressive caching for hashed assets, but not for index.html
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
            expires 1y;
            add_header Cache-Control "public, max-age=31536000, immutable";
        }
    }

    # Backend API - Reverse Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Forward Real IP info for Rate Limiting
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout limits
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
    }
}
```

Enable the site and reload:
```bash
sudo ln -s /etc/nginx/sites-available/edunexus /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 2. HTTPS Setup (Let's Encrypt)

Secure the domain using Certbot:
```bash
sudo apt install -y python3-certbot-nginx
sudo certbot --nginx -d erp.example.com
```
*Note: Certbot automatically configures HTTP->HTTPS redirects and schedules auto-renewal via systemd timers.*

## 3. PM2 Process Supervision

We use an ecosystem file to manage the backend and the background notification worker securely.

Create `ecosystem.config.cjs` in `/var/www/edunexus/current/backend`:
```javascript
module.exports = {
  apps: [
    {
      name: "edunexus-api",
      script: "./dist/server.js",
      instances: 1,
      exec_mode: "fork", // Use fork for single-instance predictability initially
      env_production: {
        NODE_ENV: "production",
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "../logs/api-error.log",
      out_file: "../logs/api-out.log",
      max_memory_restart: "400M"
    },
    {
      name: "edunexus-worker",
      script: "./dist/worker.js",
      instances: 1,
      exec_mode: "fork",
      env_production: {
        NODE_ENV: "production",
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "../logs/worker-error.log",
      out_file: "../logs/worker-out.log",
      max_memory_restart: "200M"
    }
  ]
};
```

**To start/restart the processes:**
```bash
# From /var/www/edunexus/current/backend as the edunexus user
pm2 start ecosystem.config.cjs --env production
pm2 save
```

## 4. Deployment Procedure

Run these steps as the `edunexus` user. Do NOT use `root`.

1. **Pull Code:** `git pull origin main`
2. **Install Deps:** 
   ```bash
   cd frontend && npm ci
   cd ../backend && npm ci
   ```
3. **Build Code:**
   ```bash
   cd frontend && npm run build
   cd ../backend && npm run build
   ```
4. **Database Migrations:**
   ```bash
   cd backend
   node migrate.mjs up
   node verify-db.mjs
   ```
5. **Restart Services:**
   ```bash
   pm2 reload all
   ```

## 5. Super Admin Bootstrap

There are no hardcoded credentials. To create the first production Super Admin (Owner), you must run the provided script over SSH securely:

```bash
cd /var/www/edunexus/current/backend
node create-admin.mjs "admin@yourdomain.com" "SecureSuperPassword123" "System Admin"
```
*Note: This command hashes the password immediately and does not leave plaintext traces in the database.*

## 6. Log Management

Logs are stored in `/var/www/edunexus/logs/` (as defined in PM2).
Install the PM2 log rotation module to prevent disks from filling up:
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 10
pm2 set pm2-logrotate:compress true
```

## 7. Monitoring Commands

*   Check App Status: `pm2 status`
*   View Live Logs: `pm2 logs`
*   Monitor PM2 Resources: `pm2 monit`
*   Check Database Health: `curl -s https://erp.example.com/api/v1/health`
*   Nginx Error Logs: `sudo tail -f /var/log/nginx/error.log`
