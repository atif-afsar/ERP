#!/usr/bin/env bash
# =====================================================================
# EduNexus ERP — Ubuntu VPS Automated Provisioning Script
# Tested on Ubuntu 22.04 LTS & 24.04 LTS
# Installs PostgreSQL 16, Node.js 22 LTS, PM2, Nginx, UFW & Certbot
# =====================================================================

set -e

echo "=== Starting EduNexus VPS Infrastructure Setup ==="

# 1. Update OS Packages
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential ufw software-properties-common

# 2. Install Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2 tsx

echo "Node version: $(node -v)"
echo "NPM version:  $(npm -v)"

# 3. Install and Configure PostgreSQL 16
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create Database and Dedicated User
DB_NAME="edunexus_erp"
DB_USER="edunexus_user"
DB_PASS="EduNexusSecure2026Pass" # Change this password on production!

sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';" || true
sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"

# 4. Install and Configure Nginx
sudo apt install -y nginx certbot python3-certbot-nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# 5. Configure Firewall (UFW)
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# 6. Create Log Directories
sudo mkdir -p /var/log/edunexus
sudo chown -R $USER:$USER /var/log/edunexus

echo "=== VPS Infrastructure Setup Completed Successfully! ==="
echo "PostgreSQL Connection: postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}"
echo "Next step: Run 'npm install && npm run build' inside the backend directory."
