/**
 * Drupal API client.
 *
 * Public content comes from Drupal's JSON:API (/jsonapi/...). The contact
 * form and the logged-in profile use small custom endpoints from the
 * headless_blog module, and login/logout use Drupal core's JSON user routes.
 */

import { sanitizeHtml } from '@/utils/sanitize'

// Trimmed because values pasted into hosting dashboards often carry whitespace.
const cleanUrl = (value) => (value || '').trim().replace(/\/+$/, '')

export const API_BASE_URL = cleanUrl(import.meta.env.VITE_DRUPAL_API_URL)

// In production the API is reached through the Vercel proxy (/cms), but the
// Drupal admin UI must be opened on Drupal's own domain.
export const DRUPAL_ADMIN_URL = cleanUrl(import.meta.env.VITE_DRUPAL_ADMIN_URL) || API_BASE_URL

export const PAGE_SIZE = 9

export class ApiError extends Error {
  constructor(message, { status = 0, details = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

/**
 * Low-level fetch wrapper with consistent error handling.
 */
export async function request(path, { method = 'GET', params, body, credentials = 'omit', headers = {} } = {}) {
  if (!API_BASE_URL) {
    throw new ApiError('VITE_DRUPAL_API_URL is not configured.')
  }

  const url = new URL(API_BASE_URL + path)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value)
      }
    }
  }

  let response
  try {
    response = await fetch(url, {
      method,
      credentials,
      headers: {
        Accept: path.startsWith('/jsonapi') ? 'application/vnd.api+json' : 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('Could not reach the content server. Please check your connection and try again.')
  }

  const isJson = (response.headers.get('content-type') || '').includes('json')
  const payload = isJson ? await response.json().catch(() => null) : null

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.errors?.[0]?.detail ||
      payload?.errors?.[0]?.title ||
      `Request failed with status ${response.status}`
    throw new ApiError(message, { status: response.status, details: payload })
  }

  return payload
}

/** Turns a Drupal-relative file path into an absolute URL. */
export function absoluteUrl(path) {
  if (!path) return null
  return /^https?:\/\//.test(path) ? path : API_BASE_URL + path
}

/* ------------------------------------------------------------------ */
/* JSON:API normalisation                                              */
/* ------------------------------------------------------------------ */

function indexIncluded(included = []) {
  const map = new Map()
  for (const resource of included) {
    map.set(`${resource.type}:${resource.id}`, resource)
  }
  return map
}

function related(resource, field, includedMap) {
  const ref = resource.relationships?.[field]?.data
  if (!ref) return null
  return { ref, entity: includedMap.get(`${ref.type}:${ref.id}`) || null }
}

export function mapCategory(term) {
  return {
    id: term.id,
    tid: term.attributes.drupal_internal__tid,
    name: term.attributes.name,
    slug: slugify(term.attributes.name),
    description: sanitizeHtml(term.attributes.description?.processed || ''),
  }
}

/** Converts a JSON:API node--blog resource into a flat object for the UI. */
export function mapBlog(resource, includedMap = new Map()) {
  const attrs = resource.attributes
  const category = related(resource, 'field_category', includedMap)
  const author = related(resource, 'uid', includedMap)
  const image = related(resource, 'field_featured_image', includedMap)

  return {
    id: resource.id,
    title: attrs.title,
    slug: attrs.field_slug,
    summary: attrs.field_short_description || '',
    body: sanitizeHtml(attrs.body?.processed || ''),
    publishedDate: attrs.field_published_date,
    featured: Boolean(attrs.field_featured),
    category: category?.entity ? mapCategory(category.entity) : null,
    author: author?.entity?.attributes?.display_name || 'Unknown author',
    image: image?.entity
      ? {
          url: absoluteUrl(image.entity.attributes.uri?.url),
          alt: image.ref.meta?.alt || attrs.title,
          width: image.ref.meta?.width,
          height: image.ref.meta?.height,
        }
      : null,
  }
}

/* ------------------------------------------------------------------ */
/* Blog queries                                                        */
/* ------------------------------------------------------------------ */

const BLOG_FIELDS = [
  'title',
  'field_slug',
  'field_short_description',
  'field_published_date',
  'field_featured',
  'field_category',
  'field_featured_image',
  'uid',
]

/**
 * Builds JSON:API query parameters for the blog listing.
 * Kept separate from the fetch so it can be unit tested.
 */
export function buildBlogParams({ page = 1, limit = PAGE_SIZE, categoryId, search, featured, excludeId, withBody = false } = {}) {
  const params = {
    'filter[status]': 1,
    include: 'field_category,field_featured_image,uid',
    sort: '-field_published_date',
    'page[limit]': limit,
    'page[offset]': (page - 1) * limit,
    'fields[node--blog]': (withBody ? [...BLOG_FIELDS, 'body'] : BLOG_FIELDS).join(','),
    'fields[taxonomy_term--category]': 'name,description,drupal_internal__tid',
    'fields[file--file]': 'uri',
    'fields[user--user]': 'display_name',
  }

  if (categoryId) {
    params['filter[field_category.id]'] = categoryId
  }

  if (featured) {
    params['filter[field_featured]'] = 1
  }

  if (excludeId) {
    params['filter[exclude][condition][path]'] = 'id'
    params['filter[exclude][condition][operator]'] = '<>'
    params['filter[exclude][condition][value]'] = excludeId
  }

  const term = search?.trim()
  if (term) {
    // (title CONTAINS term) OR (short description CONTAINS term) OR (body CONTAINS term)
    params['filter[search][group][conjunction]'] = 'OR'
    const fields = { title: 'title', summary: 'field_short_description', body: 'body.value' }
    for (const [key, path] of Object.entries(fields)) {
      params[`filter[${key}][condition][path]`] = path
      params[`filter[${key}][condition][operator]`] = 'CONTAINS'
      params[`filter[${key}][condition][value]`] = term
      params[`filter[${key}][condition][memberOf]`] = 'search'
    }
  }

  return params
}

export async function getBlogs(options = {}) {
  const doc = await request('/jsonapi/node/blog', { params: buildBlogParams(options) })
  const includedMap = indexIncluded(doc.included)
  return {
    items: doc.data.map((item) => mapBlog(item, includedMap)),
    hasNext: Boolean(doc.links?.next),
    hasPrev: Boolean(doc.links?.prev),
  }
}

export async function getBlogBySlug(slug) {
  const params = buildBlogParams({ limit: 1, withBody: true })
  params['filter[field_slug]'] = slug
  const doc = await request('/jsonapi/node/blog', { params })
  if (!doc.data.length) return null
  return mapBlog(doc.data[0], indexIncluded(doc.included))
}

export async function getCategories() {
  const doc = await request('/jsonapi/taxonomy_term/category', {
    params: {
      sort: 'weight,name',
      'fields[taxonomy_term--category]': 'name,description,drupal_internal__tid',
    },
  })
  return doc.data.map(mapCategory)
}

/* ------------------------------------------------------------------ */
/* Contact form and authentication                                     */
/* ------------------------------------------------------------------ */

export function sendContactMessage({ name, email, message, website = '' }) {
  return request('/api/contact', { method: 'POST', body: { name, email, message, website } })
}

export function login(name, pass) {
  return request('/user/login', {
    method: 'POST',
    params: { _format: 'json' },
    body: { name, pass },
    credentials: 'include',
  })
}

export function logout(logoutToken) {
  return request('/user/logout', {
    method: 'POST',
    params: { _format: 'json', token: logoutToken },
    credentials: 'include',
  })
}

export function getCurrentUser() {
  return request('/api/me', { credentials: 'include' })
}

/* ------------------------------------------------------------------ */

export function slugify(text = '') {
  return text
    .toString()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
