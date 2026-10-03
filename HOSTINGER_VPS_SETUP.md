# Hostinger VPS Setup Guide

This document covers the initial setup of an Ubuntu LTS VPS for the EduNexus ERP production environment.

## 1. System Updates & Dependencies

Log into your VPS via SSH as root (or a user with sudo privileges) and run:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx postgresql postgresql-contrib ufw
```

**Install Node.js (v20 LTS):**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```
Verify installations:
```bash
node -v
npm -v
git --version
psql --version
```

## 2. Dedicated System User

Do not run the application as `root`. Create a dedicated user:

```bash
sudo adduser --disabled-password --gecos "" edunexus
```

Add the user to the `www-data` group so Nginx can access static files:
```bash
sudo usermod -aG www-data edunexus
```

## 3. Firewall (UFW) Configuration

Lock down the VPS so only necessary ports are accessible from the internet.

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Explicitly allow SSH, HTTP, and HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable the firewall (press 'y' when prompted about disrupting SSH connections)
sudo ufw enable
sudo ufw status
```
*Note: Port 5432 (PostgreSQL) and 5000 (Backend API) remain blocked externally.*

## 4. SSH Safety (Optional but Recommended)

After ensuring you can SSH in via keys (do not rely on passwords), you can disable password authentication:
```bash
sudo nano /etc/ssh/sshd_config
# Find PasswordAuthentication and set to no:
# PasswordAuthentication no
sudo systemctl restart ssh
```

## 5. PostgreSQL Production Setup

Initialize a dedicated database and least-privilege user.

Access the Postgres prompt:
```bash
sudo -u postgres psql
```

Execute the following SQL commands (replace `YOUR_SECURE_DB_PASSWORD` with a strong password):
```sql
CREATE DATABASE edunexus_prod;
CREATE USER edunexus_app WITH ENCRYPTED PASSWORD 'YOUR_SECURE_DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE edunexus_prod TO edunexus_app;
\c edunexus_prod
GRANT ALL ON SCHEMA public TO edunexus_app;
\q
```

## 6. Directory Structure Setup

Create the application directories and grant permissions:

```bash
sudo mkdir -p /var/www/edunexus
sudo chown -R edunexus:edunexus /var/www/edunexus
```

## 7. Install PM2 Globally

Install PM2 (process manager) globally to supervise the Node applications:

```bash
sudo npm install -g pm2
# Generate the startup script (run this as the edunexus user or root if required)
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u edunexus --hp /home/edunexus
```

Your VPS is now provisioned and ready for the application files.
