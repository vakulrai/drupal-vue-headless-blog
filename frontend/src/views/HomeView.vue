<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import BlogCard from '@/components/BlogCard.vue'
import LoadingState from '@/components/LoadingState.vue'
import ErrorState from '@/components/ErrorState.vue'
import { getBlogs } from '@/services/api'
import { useAsync } from '@/composables/useAsync'
import { useCategories } from '@/composables/useCategories'
import { useSeo } from '@/composables/useSeo'

const router = useRouter()

const featured = useAsync(() => getBlogs({ featured: true, limit: 3 }), { initialLoading: true })
const latest = useAsync(() => getBlogs({ limit: 6 }), { initialLoading: true })
const { categories, loading: categoriesLoading, error: categoriesError, load: loadCategories } = useCategories()

useSeo({ title: '' })

function loadAll() {
  featured.run()
  latest.run()
  loadCategories({ force: Boolean(categoriesError.value) })
}

function goToCategory(category) {
  router.push({ name: 'blog', query: { category: category.slug } })
}

onMounted(loadAll)
</script>

<template>
  <section class="hero">
    <div class="container">
      <p class="eyebrow">Technology · Business · Cloud · AI</p>
      <h1>Ideas worth reading, published from Drupal.</h1>
      <p class="hero__lead">
        Every article on this site is written and managed in the Drupal CMS and delivered to this Vue.js app through JSON:API.
      </p>
      <RouterLink to="/blog" class="btn btn-accent">Browse all articles</RouterLink>
    </div>
  </section>

  <section class="section container" aria-labelledby="featured-heading">
    <div class="section-head">
      <h2 id="featured-heading">Featured</h2>
    </div>
    <LoadingState v-if="featured.loading.value" :count="3" />
    <ErrorState v-else-if="featured.error.value" :message="featured.error.value.message" @retry="loadAll" />
    <p v-else-if="!featured.data.value?.items.length" class="muted">
      No featured articles yet. Tick “Featured on homepage” on a blog post in Drupal.
    </p>
    <div v-else class="featured-grid">
      <BlogCard
        v-for="(blog, index) in featured.data.value.items"
        :key="blog.id"
        :blog="blog"
        :variant="index === 0 ? 'large' : 'default'"
        @select-category="goToCategory"
      />
    </div>
  </section>

  <section class="section container" aria-labelledby="latest-heading">
    <div class="section-head">
      <h2 id="latest-heading">Latest articles</h2>
      <RouterLink to="/blog" class="section-link">View all →</RouterLink>
    </div>
    <LoadingState v-if="latest.loading.value" :count="6" />
    <ErrorState v-else-if="latest.error.value" :message="latest.error.value.message" @retry="loadAll" />
    <p v-else-if="!latest.data.value?.items.length" class="muted">No articles have been published yet.</p>
    <div v-else class="blog-grid">
      <BlogCard v-for="blog in latest.data.value.items" :key="blog.id" :blog="blog" @select-category="goToCategory" />
    </div>
  </section>

  <section class="section section--tinted" aria-labelledby="categories-heading">
    <div class="container">
      <div class="section-head">
        <h2 id="categories-heading">Browse by category</h2>
      </div>
      <p v-if="categoriesLoading && !categories.length" class="muted">Loading categories…</p>
      <p v-else-if="categoriesError" class="muted">Categories are unavailable right now.</p>
      <div v-else class="category-grid">
        <RouterLink
          v-for="category in categories"
          :key="category.id"
          :to="{ name: 'blog', query: { category: category.slug } }"
          class="category-card"
        >
          <h3>{{ category.name }}</h3>
          <!-- Sanitized in services/api.js. -->
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="muted" v-html="category.description"></div>
        </RouterLink>
      </div>
    </div>
  </section>
</template>
