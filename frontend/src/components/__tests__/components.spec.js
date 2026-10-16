import { describe, expect, it, vi } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import BlogCard from '../BlogCard.vue'
import CategoryFilter from '../CategoryFilter.vue'
import PaginationNav from '../PaginationNav.vue'
import SearchBar from '../SearchBar.vue'

const blog = {
  id: '1',
  title: 'My first blog',
  slug: 'my-first-blog',
  summary: 'A short description',
  publishedDate: '2026-10-01T10:00:00+00:00',
  category: { id: 'c1', name: 'Cloud', slug: 'cloud' },
  image: { url: 'https://cms.test/a.jpg', alt: 'Alt', width: 1200, height: 675 },
}

const categories = [
  { id: 'c1', name: 'Technology', slug: 'technology' },
  { id: 'c2', name: 'Cloud', slug: 'cloud' },
]

describe('BlogCard', () => {
  it('renders blog data and links to the clean URL', () => {
    const wrapper = mount(BlogCard, { props: { blog }, global: { stubs: { RouterLink: RouterLinkStub } } })
    expect(wrapper.text()).toContain('My first blog')
    expect(wrapper.text()).toContain('A short description')
    expect(wrapper.text()).toContain('Cloud')
    expect(wrapper.find('img').attributes('alt')).toBe('Alt')
    expect(wrapper.findComponent(RouterLinkStub).props('to')).toEqual({
      name: 'blog-detail',
      params: { slug: 'my-first-blog' },
    })
  })

  it('emits select-category when the tag is clicked', async () => {
    const wrapper = mount(BlogCard, { props: { blog }, global: { stubs: { RouterLink: RouterLinkStub } } })
    await wrapper.find('button.tag').trigger('click')
    expect(wrapper.emitted('select-category')[0][0]).toEqual(blog.category)
  })
})

describe('CategoryFilter', () => {
  it('marks the active category and emits v-model updates', async () => {
    const wrapper = mount(CategoryFilter, { props: { categories, modelValue: 'cloud' } })
    const buttons = wrapper.findAll('button')
    expect(buttons.map((b) => b.text())).toEqual(['All', 'Technology', 'Cloud'])
    expect(buttons[2].classes()).toContain('active')

    await buttons[1].trigger('click')
    await buttons[0].trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([['technology'], ['']])
  })
})

describe('PaginationNav', () => {
  it('disables unavailable directions and emits the target page', async () => {
    const wrapper = mount(PaginationNav, { props: { page: 1, hasPrev: false, hasNext: true } })
    const [prev, next] = wrapper.findAll('button')
    expect(prev.attributes('disabled')).toBeDefined()
    await next.trigger('click')
    expect(wrapper.emitted('change')[0]).toEqual([2])
  })
})

describe('SearchBar', () => {
  it('debounces input and emits the trimmed term', async () => {
    vi.useFakeTimers()
    const wrapper = mount(SearchBar, { props: { delay: 300 } })
    await wrapper.find('input').setValue('  vue ')
    expect(wrapper.emitted('search')).toBeUndefined()
    vi.advanceTimersByTime(300)
    expect(wrapper.emitted('search')[0]).toEqual(['vue'])
    vi.useRealTimers()
  })
})
