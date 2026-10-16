<?php

declare(strict_types=1);

namespace Drupal\headless_blog\Drush\Commands;

use Drupal\Component\Serialization\Yaml;
use Drupal\Core\DependencyInjection\AutowireTrait;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Extension\ModuleExtensionList;
use Drupal\Core\File\FileExists;
use Drupal\Core\File\FileSystemInterface;
use Drupal\Core\State\StateInterface;
use Drupal\file\FileInterface;
use Drush\Attributes as CLI;
use Drush\Commands\DrushCommands;

/**
 * Creates the default categories and sample blog posts.
 */
final class HeadlessBlogCommands extends DrushCommands {

  use AutowireTrait;

  private const STATE_KEY = 'headless_blog.seeded';
  private const SEED_DIR = 'public://seed';

  public function __construct(
    private readonly EntityTypeManagerInterface $entityTypeManager,
    private readonly FileSystemInterface $fileSystem,
    private readonly ModuleExtensionList $moduleList,
    private readonly StateInterface $state,
  ) {
    parent::__construct();
  }

  /**
   * Seeds demo content once, and restores missing seed images on every run.
   *
   * Content is only created the first time so that editors can freely edit or
   * delete it afterwards. Hosts with an ephemeral disk lose uploaded files on
   * restart, so the bundled seed images are copied back if they are missing.
   */
  #[CLI\Command(name: 'headless-blog:seed', aliases: ['hb-seed'])]
  #[CLI\Option(name: 'force', description: 'Create the content even if it was seeded before.')]
  #[CLI\Usage(name: 'drush headless-blog:seed', description: 'Create categories and sample blog posts.')]
  public function seed(array $options = ['force' => FALSE]): void {
    $data = Yaml::decode(file_get_contents($this->modulePath() . '/content/seed.yml'));

    if (!$this->state->get(self::STATE_KEY) || $options['force']) {
      $terms = $this->createCategories($data['categories']);
      $this->createBlogs($data['blogs'], $terms);
      $this->state->set(self::STATE_KEY, TRUE);
      $this->logger()->success('Seeded categories and sample blog posts.');
    }

    $restored = $this->restoreSeedImages();
    if ($restored) {
      $this->logger()->notice(sprintf('Restored %d missing seed image(s).', $restored));
    }
  }

  /**
   * Creates the category terms that do not exist yet.
   *
   * @return array<string, int>
   *   Term IDs keyed by category name.
   */
  private function createCategories(array $categories): array {
    $storage = $this->entityTypeManager->getStorage('taxonomy_term');
    $ids = [];
    foreach ($categories as $weight => $category) {
      $existing = $storage->loadByProperties(['vid' => 'category', 'name' => $category['name']]);
      $term = reset($existing) ?: $storage->create([
        'vid' => 'category',
        'name' => $category['name'],
        'description' => $category['description'],
        'weight' => $weight,
      ]);
      $term->save();
      $ids[$category['name']] = (int) $term->id();
    }
    return $ids;
  }

  /**
   * Creates the sample blog posts, skipping slugs that already exist.
   */
  private function createBlogs(array $blogs, array $terms): void {
    $node_storage = $this->entityTypeManager->getStorage('node');
    $author = $this->editorialAuthor();

    foreach ($blogs as $blog) {
      if ($node_storage->loadByProperties(['type' => 'blog', 'field_slug' => $blog['slug']])) {
        continue;
      }
      $published = gmdate('Y-m-d\TH:i:s', strtotime(sprintf('-%d days', $blog['days_ago'])));
      $node_storage->create([
        'type' => 'blog',
        'title' => $blog['title'],
        'field_slug' => $blog['slug'],
        'field_short_description' => $blog['summary'],
        'body' => ['value' => $blog['body'], 'format' => 'basic_html'],
        'field_category' => $terms[$blog['category']] ?? NULL,
        'field_featured' => !empty($blog['featured']),
        'field_published_date' => $published,
        'field_featured_image' => [
          'target_id' => $this->createImage($blog['image'])->id(),
          'alt' => $blog['image_alt'],
        ],
        'uid' => $author,
        'status' => 1,
      ])->save();
    }
  }

  /**
   * Copies a bundled image into public files and returns its file entity.
   */
  private function createImage(string $filename): FileInterface {
    $directory = self::SEED_DIR;
    $this->fileSystem->prepareDirectory($directory, FileSystemInterface::CREATE_DIRECTORY);
    $uri = $this->fileSystem->copy($this->modulePath() . '/assets/seed/' . $filename, $directory . '/' . $filename, FileExists::Replace);

    $file_storage = $this->entityTypeManager->getStorage('file');
    $existing = $file_storage->loadByProperties(['uri' => $uri]);
    /** @var \Drupal\file\FileInterface $file */
    $file = reset($existing) ?: $file_storage->create(['uri' => $uri, 'uid' => 1]);
    $file->setPermanent();
    $file->save();
    return $file;
  }

  /**
   * Copies bundled images back for seed files that no longer exist on disk.
   */
  private function restoreSeedImages(): int {
    $files = $this->entityTypeManager->getStorage('file')->getQuery()
      ->accessCheck(FALSE)
      ->condition('uri', self::SEED_DIR . '/', 'STARTS_WITH')
      ->execute();

    $restored = 0;
    $directory = self::SEED_DIR;
    $this->fileSystem->prepareDirectory($directory, FileSystemInterface::CREATE_DIRECTORY);
    foreach ($this->entityTypeManager->getStorage('file')->loadMultiple($files) as $file) {
      $source = $this->modulePath() . '/assets/seed/' . basename($file->getFileUri());
      if (!file_exists($file->getFileUri()) && file_exists($source)) {
        $this->fileSystem->copy($source, $file->getFileUri(), FileExists::Replace);
        $restored++;
      }
    }
    return $restored;
  }

  /**
   * Sample posts are attributed to a shared "Editorial Team" account.
   */
  private function editorialAuthor(): int {
    $storage = $this->entityTypeManager->getStorage('user');
    $existing = $storage->loadByProperties(['name' => 'Editorial Team']);
    if ($existing) {
      return (int) reset($existing)->id();
    }
    $user = $storage->create([
      'name' => 'Editorial Team',
      'mail' => 'editorial@example.com',
      'pass' => bin2hex(random_bytes(24)),
      'status' => 1,
      'roles' => ['content_editor'],
    ]);
    $user->save();
    return (int) $user->id();
  }

  /**
   * Absolute path of this module.
   */
  private function modulePath(): string {
    return DRUPAL_ROOT . '/' . $this->moduleList->getPath('headless_blog');
  }

}
