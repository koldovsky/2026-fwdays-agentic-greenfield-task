-- Local dev only. Least-privilege split: full rights on the app schema,
-- plus rights on Prisma Migrate's temporary shadow databases
-- (https://pris.ly/d/migrate-shadow — created as prisma_migrate_shadow_db_*).
-- Production (Railway) never runs `migrate dev`, only `migrate deploy` —
-- no shadow DB there.
GRANT ALL PRIVILEGES ON `servicedesk`.* TO 'servicedesk'@'%';
GRANT ALL PRIVILEGES ON `prisma\_migrate\_shadow\_db%`.* TO 'servicedesk'@'%';
FLUSH PRIVILEGES;
