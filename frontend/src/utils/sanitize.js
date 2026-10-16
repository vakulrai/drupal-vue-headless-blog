import DOMPurify from 'dompurify'

/**
 * Drupal already filters "processed" HTML through the text format, but the
 * frontend sanitizes again before using v-html as defence in depth.
 */
export function sanitizeHtml(html = '') {
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
}
