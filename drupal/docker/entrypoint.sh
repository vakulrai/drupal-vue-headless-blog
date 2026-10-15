#!/bin/sh
# Boot sequence for the Drupal container:
#   1. listen on $PORT (Render injects it; defaults to 80 locally)
#   2. wait for the database
#   3. install the site from config/sync on first boot, otherwise run `drush deploy`
#   4. make sure default categories/sample content exist
#   5. hand over to Apache
set -e

cd /var/www/html

PORT="${PORT:-80}"
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

echo "Waiting for database ${DB_HOST}:${DB_PORT:-3306}..."
tries=0
until drush sql:query "SELECT 1" >/dev/null 2>&1; do
  tries=$((tries + 1))
  if [ "$tries" -ge 40 ]; then
    echo "Database is not reachable, giving up." >&2
    exit 1
  fi
  sleep 3
done

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

exec "$@"
