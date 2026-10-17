#!/bin/sh
set -e
mkdir -p /run/postgresql
chown -R postgres:postgres /run/postgresql
mkdir -p /mnt/pgdata
mountpoint -q /mnt/pgdata || mount -o loop /mnt/host/c/Users/asus/pg_data.img /mnt/pgdata
chown -R postgres:postgres /mnt/pgdata

if [ ! -d /mnt/pgdata/data ]; then
  su - postgres -c "initdb -D /mnt/pgdata/data --auth=trust --username=postgres"
fi

grep -q "listen_addresses = '*'" /mnt/pgdata/data/postgresql.conf || echo "listen_addresses = '*'" >> /mnt/pgdata/data/postgresql.conf
grep -q "0.0.0.0/0" /mnt/pgdata/data/pg_hba.conf || echo "host all all 0.0.0.0/0 trust" >> /mnt/pgdata/data/pg_hba.conf
grep -q "::0/0" /mnt/pgdata/data/pg_hba.conf || echo "host all all ::0/0 trust" >> /mnt/pgdata/data/pg_hba.conf

su - postgres -c "postgres -D /mnt/pgdata/data"
