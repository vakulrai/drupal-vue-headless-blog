<script setup>
import { computed } from 'vue'
import { formatDate } from '@/utils/format'

const props = defineProps({
  blog: { type: Object, required: true },
  /** "default" for grid cards, "large" for the homepage hero. */
  variant: { type: String, default: 'default', validator: (v) => ['default', 'large'].includes(v) },
})

const emit = defineEmits(['select-category'])

const link = computed(() => ({ name: 'blog-detail', params: { slug: props.blog.slug } }))
</script>

<template>
  <article class="blog-card" :class="`blog-card--${variant}`">
    <RouterLink :to="link" class="blog-card__media" tabindex="-1" aria-hidden="true">
      <img
        v-if="blog.image"
        :src="blog.image.url"
        :alt="blog.image.alt"
        :width="blog.image.width"
        :height="blog.image.height"
        loading="lazy"
      />
      <div v-else class="blog-card__placeholder"></div>
    </RouterLink>

    <div class="blog-card__body">
      <div class="blog-card__meta">
        <button
          v-if="blog.category"
          type="button"
          class="tag"
          @click="emit('select-category', blog.category)"
        >
          {{ blog.category.name }}
        </button>
        <time :datetime="blog.publishedDate">{{ formatDate(blog.publishedDate) }}</time>
      </div>

      <h3 class="blog-card__title">
        <RouterLink :to="link">{{ blog.title }}</RouterLink>
      </h3>
      <p class="blog-card__summary">{{ blog.summary }}</p>
    </div>
  </article>
</template>
