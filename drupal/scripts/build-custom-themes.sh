#!/bin/sh
# Compiles front-end assets for custom Drupal themes.
#
# Runs automatically after `composer install` and `composer update`
# (see "scripts" in composer.json) and can be run manually with
# `composer build-themes`.
#
# Any theme in web/themes/custom/ that has a package.json is built with
# `npm ci && npm run build`, so compiled CSS/JS never has to be committed.
#
# This site is headless: the public website is the Vue app in /frontend and
# the admin panel uses core's Claro theme, so there is currently no custom
# theme and this script has nothing to build.
#
# Set SKIP_THEME_BUILD=1 to skip the build (e.g. in a PHP-only environment).
set -e

if [ "${SKIP_THEME_BUILD:-0}" = "1" ]; then
  echo "SKIP_THEME_BUILD=1: skipping custom theme build."
  exit 0
fi

found=0
for package in web/themes/custom/*/package.json; do
  [ -f "$package" ] || continue
  found=1
  theme_dir=$(dirname "$package")

  if ! command -v npm >/dev/null 2>&1; then
    echo "npm is required to build $theme_dir but was not found." >&2
    exit 1
  fi

  echo "Building theme assets in $theme_dir"
  (cd "$theme_dir" && npm ci --no-audit --no-fund && npm run build)
done

if [ "$found" -eq 0 ]; then
  echo "No custom themes with a package.json found, nothing to build."
fi
