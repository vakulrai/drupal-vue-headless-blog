<script setup>
/** Skeleton placeholders shown while content is loading. */
defineProps({
  count: { type: Number, default: 3 },
  variant: { type: String, default: 'cards', validator: (v) => ['cards', 'article'].includes(v) },
})
</script>

<template>
  <div class="loading" role="status" aria-live="polite">
    <span class="sr-only">Loading…</span>
    <div v-if="variant === 'cards'" class="blog-grid">
      <div v-for="n in count" :key="n" class="skeleton-card">
        <div class="skeleton skeleton-media"></div>
        <div class="skeleton skeleton-line short"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line"></div>
      </div>
    </div>
    <div v-else class="skeleton-article">
      <div class="skeleton skeleton-line short"></div>
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-hero"></div>
      <div v-for="n in 5" :key="n" class="skeleton skeleton-line"></div>
    </div>
  </div>
</template>
