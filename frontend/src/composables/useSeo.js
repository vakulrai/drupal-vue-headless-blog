import { onBeforeUnmount, toValue, watchEffect } from 'vue'

const SITE_NAME = import.meta.env.VITE_SITE_NAME || 'Headless Blog'
const DEFAULT_DESCRIPTION = 'Articles on technology, business, cloud and AI, managed in Drupal and rendered with Vue.js.'

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!content) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(url) {
  let link = document.head.querySelector('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  link.setAttribute('href', url)
}

/**
 * Keeps the page title, meta description and Open Graph tags in sync with
 * reactive page data. Accepts a getter so values can depend on loaded content.
 */
export function useSeo(source) {
  const stop = watchEffect(() => {
    const { title, description, image, type = 'website' } = toValue(source) || {}
    const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME
    const desc = description || DEFAULT_DESCRIPTION
    const url = window.location.origin + window.location.pathname

    document.title = fullTitle
    setMeta('name', 'description', desc)
    setMeta('property', 'og:site_name', SITE_NAME)
    setMeta('property', 'og:title', title || SITE_NAME)
    setMeta('property', 'og:description', desc)
    setMeta('property', 'og:type', type)
    setMeta('property', 'og:url', url)
    setMeta('property', 'og:image', image)
    setMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary')
    setCanonical(url)
  })

  onBeforeUnmount(stop)
}
