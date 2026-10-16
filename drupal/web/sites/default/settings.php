<?php

/**
 * @file
 * Drupal settings.
 *
 * Every environment-specific value (database, salt, hosts) is read from
 * environment variables so this file can be committed without secrets.
 * See .env.example in the repository root for the full list.
 */

$env = static fn (string $name, ?string $default = NULL): ?string =>
  getenv($name) !== FALSE && getenv($name) !== '' ? getenv($name) : $default;

$databases['default']['default'] = [
  'driver' => 'mysql',
  'namespace' => 'Drupal\\mysql\\Driver\\Database\\mysql',
  'autoload' => 'core/modules/mysql/src/Driver/Database/mysql/',
  'database' => $env('DB_NAME', 'drupal'),
  'username' => $env('DB_USER', 'drupal'),
  'password' => $env('DB_PASSWORD', ''),
  'host' => $env('DB_HOST', 'db'),
  'port' => (int) $env('DB_PORT', '3306'),
  'prefix' => '',
  'collation' => 'utf8mb4_general_ci',
  'isolation_level' => 'READ COMMITTED',
];

// Managed MySQL (Aiven) only accepts TLS connections.
if ($ca = $env('DB_SSL_CA')) {
  $databases['default']['default']['pdo'] = [
    \PDO::MYSQL_ATTR_SSL_CA => $ca,
    \PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => TRUE,
  ];
}

$settings['hash_salt'] = $env('DRUPAL_HASH_SALT', '');
$settings['config_sync_directory'] = '../config/sync';
$settings['file_public_path'] = 'sites/default/files';
$settings['update_free_access'] = FALSE;
$settings['rebuild_access'] = FALSE;
$settings['skip_permissions_hardening'] = TRUE;
$settings['entity_update_batch_size'] = 50;
$settings['entity_update_backup'] = TRUE;
$settings['migrate_node_migrate_type_classic'] = FALSE;

// Comma separated list of regular expressions, e.g. "^localhost$,^cms\.example\.com$".
$settings['trusted_host_patterns'] = array_filter(array_map(
  'trim',
  explode(',', $env('TRUSTED_HOST_PATTERNS', '^localhost$,^127\.0\.0\.1$,^drupal$'))
));

// Render terminates TLS at its proxy; trust the forwarded client IP and
// protocol (for HTTPS detection) but not X-Forwarded-Host, so the host name
// is always the real Host header checked by trusted_host_patterns. Requests
// proxied by Vercel (/cms) carry the Vercel host in X-Forwarded-Host.
if ($env('REVERSE_PROXY') === 'true') {
  $settings['reverse_proxy'] = TRUE;
  $settings['reverse_proxy_addresses'] = [$_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'];
  $settings['reverse_proxy_trusted_headers'] = \Symfony\Component\HttpFoundation\Request::HEADER_X_FORWARDED_FOR
    | \Symfony\Component\HttpFoundation\Request::HEADER_X_FORWARDED_PROTO
    | \Symfony\Component\HttpFoundation\Request::HEADER_X_FORWARDED_PORT;
}

$settings['file_scan_ignore_directories'] = ['node_modules', 'bower_components'];

// Optional per-developer overrides that are never committed.
if (file_exists($app_root . '/' . $site_path . '/settings.local.php')) {
  include $app_root . '/' . $site_path . '/settings.local.php';
}
