<?php

declare(strict_types=1);

namespace Drupal\headless_blog;

use Drupal\Core\DependencyInjection\ContainerBuilder;
use Drupal\Core\DependencyInjection\ServiceProviderBase;

/**
 * Configures CORS and the session cookie from environment variables.
 *
 * The frontend origin differs per environment (localhost, Vercel preview,
 * production), so it is read from CORS_ALLOWED_ORIGINS instead of being
 * hardcoded in services.yml. The container is rebuilt on every deploy
 * (drush deploy runs a cache rebuild), which picks up changed values.
 */
final class HeadlessBlogServiceProvider extends ServiceProviderBase {

  /**
   * {@inheritdoc}
   */
  public function alter(ContainerBuilder $container): void {
    $origins = array_values(array_filter(array_map(
      'trim',
      explode(',', (string) getenv('CORS_ALLOWED_ORIGINS'))
    )));

    if ($origins) {
      $container->setParameter('cors.config', [
        'enabled' => TRUE,
        'allowedOrigins' => $origins,
        'allowedOriginsPatterns' => [],
        'allowedHeaders' => ['accept', 'content-type', 'x-csrf-token'],
        'allowedMethods' => ['GET', 'POST', 'OPTIONS'],
        'exposedHeaders' => FALSE,
        'maxAge' => 600,
        // Needed so the browser sends the session cookie for /api/me.
        'supportsCredentials' => TRUE,
      ]);
    }

    $options = $container->getParameter('session.storage.options');

    // Issue a host-only session cookie. By default Drupal adds
    // "domain=.<drupal host>", which browsers reject when the API is reached
    // through the frontend's same-origin proxy (/cms on the Vercel domain).
    // An empty cookie_domain makes Drupal omit the Domain attribute, so the
    // cookie belongs to whichever host the browser actually talked to.
    $options['cookie_domain'] = '';

    $same_site = getenv('SESSION_COOKIE_SAMESITE');
    if (in_array($same_site, ['Lax', 'Strict', 'None'], TRUE)) {
      $options['cookie_samesite'] = $same_site;
    }
    $container->setParameter('session.storage.options', $options);
  }

}
