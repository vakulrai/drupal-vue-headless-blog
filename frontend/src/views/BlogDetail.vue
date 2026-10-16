<script setup>
import { computed, watch } from 'vue'
import BlogCard from '@/components/BlogCard.vue'
import LoadingState from '@/components/LoadingState.vue'
import ErrorState from '@/components/ErrorState.vue'
import { getBlogBySlug, getBlogs } from '@/services/api'
import { useAsync } from '@/composables/useAsync'
import { useSeo } from '@/composables/useSeo'
import { formatDate } from '@/utils/format'

const props = defineProps({
  slug: { type: String, required: true },
})

const { data: blog, loading, error, run } = useAsync(getBlogBySlug, { initialLoading: true })
const related = useAsync((post) =>
  getBlogs({ categoryId: post.category?.id, excludeId: post.id, limit: 3 }),
)

const notFound = computed(() => !loading.value && !error.value && blog.value === null)

useSeo(() =>
  blog.value
    ? { title: blog.value.title, description: blog.value.summary, image: blog.value.image?.url, type: 'article' }
    : { title: notFound.value ? 'Article not found' : 'Loading…' },
)

async function load() {
  const post = await run(props.slug)
  if (post?.category) related.run(post)
}

watch(() => props.slug, load, { immediate: true })
</script>

<template>
  <div class="container article-wrap">
    <LoadingState v-if="loading" variant="article" />

    <ErrorState v-else-if="error" :message="error.message" @retry="load" />

    <div v-else-if="notFound" class="state-box">
      <h1>Article not found</h1>
      <p class="muted">It may have been unpublished or its URL changed in the CMS.</p>
      <RouterLink to="/blog" class="btn">Back to all articles</RouterLink>
    </div>

    <article v-else-if="blog" class="article">
      <RouterLink to="/blog" class="back-link">← All articles</RouterLink>

      <header class="article__header">
        <RouterLink
          v-if="blog.category"
          :to="{ name: 'blog', query: { category: blog.category.slug } }"
          class="tag"
        >
          {{ blog.category.name }}
        </RouterLink>
        <h1>{{ blog.title }}</h1>
        <p class="article__summary">{{ blog.summary }}</p>
        <p class="article__meta">
          By <strong>{{ blog.author }}</strong>
          <span aria-hidden="true"> · </span>
          <time :datetime="blog.publishedDate">{{ formatDate(blog.publishedDate) }}</time>
        </p>
      </header>

      <figure v-if="blog.image" class="article__image">
        <img :src="blog.image.url" :alt="blog.image.alt" :width="blog.image.width" :height="blog.image.height" />
      </figure>

      <!-- Filtered by Drupal's text format and sanitized again in services/api.js. -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="prose" v-html="blog.body"></div>
    </article>

    <section v-if="blog && related.data.value?.items.length" class="section related" aria-labelledby="related-heading">
      <h2 id="related-heading">More in {{ blog.category.name }}</h2>
      <div class="blog-grid">
        <BlogCard v-for="post in related.data.value.items" :key="post.id" :blog="post" />
      </div>
    </section>
  </div>
</template>
