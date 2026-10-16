<?php

declare(strict_types=1);

namespace Drupal\headless_blog\Hook;

use Drupal\Core\Access\AccessResult;
use Drupal\Core\Access\AccessResultInterface;
use Drupal\Core\Hook\Attribute\Hook;
use Drupal\Core\Session\AccountInterface;
use Drupal\headless_blog\SlugGenerator;
use Drupal\node\NodeInterface;

/**
 * Entity hooks for the blog content model.
 */
final class HeadlessBlogHooks {

  public function __construct(
    private readonly SlugGenerator $slugGenerator,
  ) {}

  /**
   * Fills the slug and URL alias of blog posts before they are saved.
   */
  #[Hook('node_presave')]
  public function nodePresave(NodeInterface $node): void {
    if ($node->bundle() !== 'blog' || !$node->hasField('field_slug')) {
      return;
    }

    $source = trim((string) $node->get('field_slug')->value) ?: (string) $node->label();
    $slug = $this->slugGenerator->generate($source, $node->isNew() ? NULL : (int) $node->id());
    $node->set('field_slug', $slug);

    // Keep the Drupal path in sync with the frontend route (/blog/{slug}).
    if ($node->hasField('path')) {
      $node->get('path')->alias = '/blog/' . $slug;
    }

    if ($node->hasField('field_published_date') && $node->get('field_published_date')->isEmpty() && $node->isPublished()) {
      $node->set('field_published_date', gmdate('Y-m-d\TH:i:s'));
    }
  }

  /**
   * Keeps contact form submissions private, including over JSON:API.
   */
  #[Hook('node_access')]
  public function nodeAccess(NodeInterface $node, string $operation, AccountInterface $account): AccessResultInterface {
    if ($node->bundle() !== 'contact_submission') {
      return AccessResult::neutral();
    }
    return AccessResult::forbiddenIf(!$account->hasPermission('view contact submissions'))
      ->cachePerPermissions();
  }

}
