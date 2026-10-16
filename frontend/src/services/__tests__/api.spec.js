import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, buildBlogParams, getBlogs, mapBlog, request, slugify } from '../api'

const blogResource = {
  type: 'node--blog',
  id: 'blog-1',
  attributes: {
    title: 'Hello Drupal',
    field_slug: 'hello-drupal',
    field_short_description: 'Short text',
    field_published_date: '2026-10-01T10:00:00+00:00',
    field_featured: true,
    body: { value: '<p>raw</p>', processed: '<p>safe</p>' },
  },
  relationships: {
    field_category: { data: { type: 'taxonomy_term--category', id: 'cat-1' } },
    uid: { data: { type: 'user--user', id: 'user-1' } },
    field_featured_image: {
      data: { type: 'file--file', id: 'file-1', meta: { alt: 'Alt text', width: 1200, height: 675 } },
    },
  },
}

const included = [
  { type: 'taxonomy_term--category', id: 'cat-1', attributes: { name: 'Cloud', drupal_internal__tid: 3 } },
  { type: 'user--user', id: 'user-1', attributes: { display_name: 'Jane Editor' } },
  { type: 'file--file', id: 'file-1', attributes: { uri: { url: '/sites/default/files/a.jpg' } } },
]

const includedMap = new Map(included.map((r) => [`${r.type}:${r.id}`, r]))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('mapBlog', () => {
  it('flattens a JSON:API resource with its included relationships', () => {
    const blog = mapBlog(blogResource, includedMap)
    expect(blog).toMatchObject({
      id: 'blog-1',
      title: 'Hello Drupal',
      slug: 'hello-drupal',
      summary: 'Short text',
      body: '<p>safe</p>',
      featured: true,
      author: 'Jane Editor',
      category: { id: 'cat-1', name: 'Cloud', slug: 'cloud' },
      image: { url: 'https://cms.test/sites/default/files/a.jpg', alt: 'Alt text', width: 1200 },
    })
  })

  it('handles missing relationships', () => {
    const blog = mapBlog({ ...blogResource, relationships: {} })
    expect(blog.category).toBeNull()
    expect(blog.image).toBeNull()
    expect(blog.author).toBe('Unknown author')
  })
})

describe('buildBlogParams', () => {
  it('paginates with offset and limit', () => {
    const params = buildBlogParams({ page: 3, limit: 9 })
    expect(params['page[offset]']).toBe(18)
    expect(params['page[limit]']).toBe(9)
    expect(params['filter[status]']).toBe(1)
  })

  it('filters by category id', () => {
    expect(buildBlogParams({ categoryId: 'cat-1' })['filter[field_category.id]']).toBe('cat-1')
  })

  it('builds an OR group for search across title, summary and body', () => {
    const params = buildBlogParams({ search: '  Vue ' })
    expect(params['filter[search][group][conjunction]']).toBe('OR')
    expect(params['filter[title][condition][value]']).toBe('Vue')
    expect(params['filter[summary][condition][path]']).toBe('field_short_description')
    expect(params['filter[body][condition][memberOf]']).toBe('search')
  })

  it('omits search filters for empty terms', () => {
    const params = buildBlogParams({ search: '   ' })
    expect(Object.keys(params).some((key) => key.startsWith('filter[search]'))).toBe(false)
  })
})

describe('request', () => {
  it('throws ApiError with the Drupal error detail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ errors: [{ detail: 'Bad filter' }] }), {
        status: 400,
        headers: { 'content-type': 'application/vnd.api+json' },
      }),
    ))
    await expect(request('/jsonapi/node/blog')).rejects.toMatchObject({ name: 'ApiError', status: 400, message: 'Bad filter' })
  })

  it('wraps network failures in a friendly ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(request('/jsonapi/node/blog')).rejects.toBeInstanceOf(ApiError)
  })
})

describe('getBlogs', () => {
  it('returns mapped items and pagination flags', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [blogResource], included, links: { next: { href: 'x' } } }), {
        status: 200,
        headers: { 'content-type': 'application/vnd.api+json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await getBlogs({ page: 1 })
    expect(result.items).toHaveLength(1)
    expect(result.hasNext).toBe(true)
    expect(result.hasPrev).toBe(false)
    expect(fetchMock.mock.calls[0][0].toString()).toContain('https://cms.test/jsonapi/node/blog?')
  })
})

describe('slugify', () => {
  it('creates URL friendly slugs', () => {
    expect(slugify('Cloud & DevOps')).toBe('cloud-devops')
    expect(slugify('Café Über')).toBe('cafe-uber')
  })
})
