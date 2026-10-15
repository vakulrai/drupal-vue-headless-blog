<?php

declare(strict_types=1);

namespace Drupal\headless_blog\Controller;

use Drupal\Component\Utility\EmailValidatorInterface;
use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\Flood\FloodInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

/**
 * Receives the contact form from the Vue app and stores it in Drupal.
 *
 * Submissions are saved as unpublished "Contact submission" nodes so editors
 * can read them under Content in the admin UI.
 */
final class ContactController extends ControllerBase {

  private const FLOOD_EVENT = 'headless_blog.contact';
  private const FLOOD_LIMIT = 5;
  private const FLOOD_WINDOW = 3600;

  public function __construct(
    private readonly FloodInterface $flood,
    private readonly EmailValidatorInterface $emailValidator,
  ) {}

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container): static {
    return new static(
      $container->get('flood'),
      $container->get('email.validator'),
    );
  }

  /**
   * Validates and stores a contact message.
   */
  public function submit(Request $request): JsonResponse {
    $data = json_decode($request->getContent(), TRUE);
    if (!is_array($data)) {
      return new JsonResponse(['message' => 'Invalid JSON body.'], 400);
    }

    // Honeypot: real users never see or fill this field.
    if (!empty($data['website'])) {
      return new JsonResponse(['message' => 'Thank you, your message has been sent.'], 201);
    }

    $name = trim((string) ($data['name'] ?? ''));
    $email = trim((string) ($data['email'] ?? ''));
    $message = trim((string) ($data['message'] ?? ''));

    $errors = [];
    if ($name === '' || mb_strlen($name) > 100) {
      $errors['name'] = 'Please enter your name (max 100 characters).';
    }
    if (!$this->emailValidator->isValid($email)) {
      $errors['email'] = 'Please enter a valid email address.';
    }
    if (mb_strlen($message) < 10 || mb_strlen($message) > 5000) {
      $errors['message'] = 'Message should be between 10 and 5000 characters.';
    }
    if ($errors) {
      return new JsonResponse(['message' => 'Please fix the highlighted fields.', 'errors' => $errors], 422);
    }

    if (!$this->flood->isAllowed(self::FLOOD_EVENT, self::FLOOD_LIMIT, self::FLOOD_WINDOW)) {
      return new JsonResponse(['message' => 'Too many messages, please try again later.'], 429);
    }
    $this->flood->register(self::FLOOD_EVENT, self::FLOOD_WINDOW);

    $this->entityTypeManager()->getStorage('node')->create([
      'type' => 'contact_submission',
      'title' => sprintf('Message from %s', $name),
      'field_contact_name' => $name,
      'field_contact_email' => $email,
      'field_contact_message' => $message,
      'status' => 0,
      'uid' => 0,
    ])->save();

    return new JsonResponse(['message' => 'Thank you, your message has been sent.'], 201);
  }

}
