<?php

declare(strict_types=1);

namespace Drupal\headless_blog\Controller;

use Drupal\Core\Controller\ControllerBase;
use Symfony\Component\HttpFoundation\JsonResponse;

/**
 * Returns the logged-in user for the protected profile page in Vue.
 */
final class ProfileController extends ControllerBase {

  /**
   * Current user summary. Anonymous users get a 403 from the route.
   */
  public function me(): JsonResponse {
    /** @var \Drupal\user\UserInterface $user */
    $user = $this->entityTypeManager()->getStorage('user')->load($this->currentUser()->id());

    $role_storage = $this->entityTypeManager()->getStorage('user_role');
    $roles = [];
    foreach ($user->getRoles(TRUE) as $role_id) {
      $roles[] = $role_storage->load($role_id)?->label() ?? $role_id;
    }

    $posts = (int) $this->entityTypeManager()->getStorage('node')->getQuery()
      ->accessCheck(TRUE)
      ->condition('type', 'blog')
      ->condition('uid', $user->id())
      ->count()
      ->execute();

    $response = new JsonResponse([
      'uid' => (int) $user->id(),
      'name' => $user->getDisplayName(),
      'email' => $user->getEmail(),
      'roles' => $roles,
      'memberSince' => date(DATE_ATOM, (int) $user->getCreatedTime()),
      'lastLogin' => $user->getLastLoginTime() ? date(DATE_ATOM, (int) $user->getLastLoginTime()) : NULL,
      'blogCount' => $posts,
    ]);
    $response->setPrivate();
    return $response;
  }

}
