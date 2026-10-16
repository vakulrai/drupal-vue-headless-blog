# Drupal 11 runtime image (PHP 8.3 + Apache).
# The "base" stage is used for local development (code is bind-mounted),
# the "prod" stage bakes the code in and is what Render deploys.

FROM php:8.3-apache-bookworm AS base

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      git unzip mariadb-client \
      libpng-dev libjpeg62-turbo-dev libfreetype6-dev libwebp-dev libzip-dev \
 && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
 && docker-php-ext-install -j"$(nproc)" gd pdo_mysql zip opcache \
 && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

ENV APACHE_DOCUMENT_ROOT=/var/www/html/web \
    PATH=/var/www/html/vendor/bin:$PATH \
    COMPOSER_ALLOW_SUPERUSER=1

RUN sed -ri 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
 && sed -ri 's!AllowOverride None!AllowOverride All!g' /etc/apache2/apache2.conf \
 && echo "ServerName localhost" > /etc/apache2/conf-available/servername.conf \
 && a2enconf servername \
 && a2enmod rewrite headers

COPY docker/php.ini /usr/local/etc/php/conf.d/zz-drupal.ini
COPY docker/entrypoint.sh /usr/local/bin/drupal-entrypoint
RUN chmod +x /usr/local/bin/drupal-entrypoint

WORKDIR /var/www/html
EXPOSE 80
ENTRYPOINT ["drupal-entrypoint"]
CMD ["apache2-foreground"]


FROM base AS prod

# Install dependencies first so this layer is cached between code changes.
# The post-install-cmd hook needs the build script, so it is copied in too.
COPY composer.json composer.lock ./
COPY scripts ./scripts
RUN composer install --no-dev --no-interaction --no-progress --optimize-autoloader

# Custom themes only exist after the full copy, so build them again here.
# (A theme with a package.json would also need Node.js in this image.)
COPY . .
RUN composer build-themes \
 && composer dump-autoload --no-dev --optimize \
 && mkdir -p web/sites/default/files \
 && chown -R www-data:www-data web/sites/default/files
