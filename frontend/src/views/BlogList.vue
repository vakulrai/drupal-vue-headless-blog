<script setup>
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BlogCard from '@/components/BlogCard.vue'
import CategoryFilter from '@/components/CategoryFilter.vue'
import SearchBar from '@/components/SearchBar.vue'
import PaginationNav from '@/components/PaginationNav.vue'
import LoadingState from '@/components/LoadingState.vue'
import ErrorState from '@/components/ErrorState.vue'
import { getBlogs } from '@/services/api'
import { useAsync } from '@/composables/useAsync'
import { useCategories } from '@/composables/useCategories'
import { useSeo } from '@/composables/useSeo'

const route = useRoute()
const router = useRouter()
const { categories, load: loadCategories } = useCategories()
const { data, loading, error, run } = useAsync(getBlogs, { initialLoading: true })

// The URL is the single source of truth for filters, so results are shareable
// and the browser back button works as expected.
const page = computed(() => Math.max(1, Number.parseInt(route.query.page, 10) || 1))
const search = computed(() => (route.query.q || '').toString())
const categorySlug = computed(() => (route.query.category || '').toString())
const activeCategory = computed(() => categories.value.find((c) => c.slug === categorySlug.value) || null)

useSeo(() => ({
  title: activeCategory.value ? `${activeCategory.value.name} articles` : 'Blog',
  description: activeCategory.value
    ? `Articles about ${activeCategory.value.name.toLowerCase()}.`
    : 'All articles, searchable and filterable by category.',
}))

function updateQuery(changes) {
  const query = { ...route.query, ...changes }
  for (const key of Object.keys(query)) {
    if (!query[key] || (key === 'page' && Number(query[key]) === 1)) delete query[key]
  }
  router.push({ name: 'blog', query })
}

async function load() {
  await loadCategories()
  if (categorySlug.value && !activeCategory.value) {
    // Unknown category in the URL (e.g. deleted in Drupal): fall back to all posts.
    updateQuery({ category: '' })
    return
  }
  run({ page: page.value, search: search.value, categoryId: activeCategory.value?.id })
}

watch(() => route.query, load)
onMounted(load)
</script>

<template>
  <section class="page-head">
    <div class="container">
      <h1>{{ activeCategory ? activeCategory.name : 'All articles' }}</h1>
      <!-- Sanitized in services/api.js. -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-if="activeCategory?.description" class="muted" v-html="activeCategory.description"></div>
      <p v-else class="muted">Search and filter everything published in the CMS.</p>
    </div>
  </section>

  <section class="container section">
    <div class="toolbar">
      <SearchBar :model-value="search" @search="(q) => updateQuery({ q, page: 1 })" />
      <CategoryFilter
        :categories="categories"
        :model-value="categorySlug"
        @update:model-value="(slug) => updateQuery({ category: slug, page: 1 })"
      />
    </div>

    <div id="results" aria-live="polite">
      <p v-if="search && !loading" class="muted results-summary">
        Showing results for “<strong>{{ search }}</strong>”
        <button type="button" class="link-button" @click="updateQuery({ q: '', page: 1 })">Clear</button>
      </p>

      <LoadingState v-if="loading" :count="6" />
      <ErrorState v-else-if="error" :message="error.message" @retry="load" />
      <div v-else-if="!data?.items.length" class="state-box">
        <h2>No articles found</h2>
        <p class="muted">Try a different search term or category.</p>
      </div>
      <template v-else>
        <div class="blog-grid">
          <BlogCard
            v-for="blog in data.items"
            :key="blog.id"
            :blog="blog"
            @select-category="(c) => updateQuery({ category: c.slug, page: 1 })"
          />
        </div>
        <PaginationNav
          :page="page"
          :has-prev="data.hasPrev"
          :has-next="data.hasNext"
          @change="(p) => updateQuery({ page: p })"
        />
      </template>
    </div>
  </section>
</template>
