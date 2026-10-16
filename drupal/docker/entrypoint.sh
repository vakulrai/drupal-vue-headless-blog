#!/bin/sh
# Boot sequence for the Drupal container:
#   1. validate the database settings
#   2. answer "503 starting up" on $PORT while setting up (Render needs an open
#      port quickly, and this keeps the web installer unreachable meanwhile)
#   3. wait for the database
#   4. install the site from config/sync on first boot, otherwise run `drush deploy`
#   5. make sure default categories/sample content exist
#   6. hand over to Apache
set -e

cd /var/www/html

PORT="${PORT:-80}"

if [ -z "${DB_HOST}" ]; then
  echo "DB_HOST is not set. Check the service environment variables." >&2
  exit 1
fi
case "${DB_PORT:-3306}" in
  ''|*[!0-9]*)
    echo "DB_PORT must be a number, got '${DB_PORT}'. Check the service environment variables." >&2
    exit 1
    ;;
esac

# Temporary responder so the platform sees an open port during setup.
cat > /tmp/starting.php <<'PHP'
<?php
http_response_code(503);
header('Retry-After: 30');
header('Content-Type: text/plain');
echo "The CMS is starting up, please retry in a moment.\n";
PHP
php -S "0.0.0.0:${PORT}" /tmp/starting.php >/dev/null 2>&1 &
STARTING_PID=$!

sed -ri "s/^Listen [0-9]+/Listen ${PORT}/" /etc/apache2/ports.conf
sed -ri "s/<VirtualHost \*:[0-9]+>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-available/000-default.conf

# Managed MySQL providers (e.g. Aiven) require TLS with their own CA.
if [ -n "${DB_SSL_CA_PEM}" ]; then
  printf '%s\n' "${DB_SSL_CA_PEM}" > /etc/ssl/certs/db-ca.pem
  export DB_SSL_CA=/etc/ssl/certs/db-ca.pem
fi

# Local development bind-mounts the code, so dependencies may not be installed yet.
if [ ! -f vendor/autoload.php ]; then
  composer install --no-interaction --no-progress
fi

mkdir -p web/sites/default/files
chown -R www-data:www-data web/sites/default/files

echo "Waiting for database ${DB_HOST}:${DB_PORT:-3306}/${DB_NAME}..."
tries=0
until timeout 15 drush sql:query "SELECT 1" >/dev/null 2>&1; do
  tries=$((tries + 1))
  if [ "$tries" -ge 20 ]; then
    echo "Database is not reachable, giving up. Last error:" >&2
    timeout 15 drush sql:query "SELECT 1" >&2 || true
    exit 1
  fi
  sleep 3
done
echo "Database connection OK."

# Decide based on an actual table so a transient error can never trigger a
# reinstall (site:install drops every table in the database).
if ! existing_tables=$(drush sql:query "SHOW TABLES LIKE 'key_value'"); then
  echo "Could not inspect the database, refusing to continue." >&2
  exit 1
fi

if [ -n "${existing_tables}" ]; then
  echo "Existing site found: applying updates and configuration."
  drush deploy -y
else
  echo "Fresh database: installing Drupal."
  if [ -f config/sync/core.extension.yml ]; then
    INSTALL_ARGS="--existing-config"
  else
    INSTALL_ARGS="minimal"
  fi
  drush site:install ${INSTALL_ARGS} -y \
    --account-name="${DRUPAL_ADMIN_USER:-admin}" \
    --account-pass="${DRUPAL_ADMIN_PASS:?DRUPAL_ADMIN_PASS must be set}" \
    --account-mail="${DRUPAL_ADMIN_MAIL:-admin@example.com}" \
    --site-name="${DRUPAL_SITE_NAME:-Headless Blog}"
fi

if drush pm:list --status=enabled --field=name 2>/dev/null | grep -qx headless_blog; then
  drush headless-blog:seed
fi

chown -R www-data:www-data web/sites/default/files

echo "Setup finished, starting Apache."
kill "${STARTING_PID}" 2>/dev/null || true
wait "${STARTING_PID}" 2>/dev/null || true
exec "$@"
