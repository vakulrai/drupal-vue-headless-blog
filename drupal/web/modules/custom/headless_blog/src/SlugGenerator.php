<?php

declare(strict_types=1);

namespace Drupal\headless_blog;

use Drupal\Component\Transliteration\TransliterationInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Builds unique, URL-safe slugs for blog posts.
 */
final class SlugGenerator {

  public function __construct(
    #[Autowire(service: 'transliteration')]
    private readonly TransliterationInterface $transliteration,
    private readonly EntityTypeManagerInterface $entityTypeManager,
  ) {}

  /**
   * Turns text into a slug that no other blog post uses.
   *
   * @param string $text
   *   Title or editor-provided slug.
   * @param int|null $nid
   *   The node being saved, so it does not collide with itself.
   */
  public function generate(string $text, ?int $nid = NULL): string {
    $base = $this->slugify($text) ?: 'post';
    $slug = $base;
    $suffix = 2;
    while ($this->exists($slug, $nid)) {
      $slug = $base . '-' . $suffix++;
    }
    return $slug;
  }

  /**
   * Lowercases, transliterates and dash-separates a string.
   */
  public function slugify(string $text): string {
    $text = $this->transliteration->transliterate($text, 'en');
    $text = strtolower($text);
    $text = preg_replace('/[^a-z0-9]+/', '-', $text);
    return substr(trim($text, '-'), 0, 120);
  }

  private function exists(string $slug, ?int $nid): bool {
    $query = $this->entityTypeManager->getStorage('node')->getQuery()
      ->accessCheck(FALSE)
      ->condition('type', 'blog')
      ->condition('field_slug', $slug)
      ->range(0, 1);
    if ($nid) {
      $query->condition('nid', $nid, '<>');
    }
    return (bool) $query->execute();
  }

}
