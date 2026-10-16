<script setup>
defineProps({
  page: { type: Number, required: true },
  hasPrev: { type: Boolean, default: false },
  hasNext: { type: Boolean, default: false },
})

const emit = defineEmits(['change'])
</script>

<template>
  <nav v-if="hasPrev || hasNext" class="pagination" aria-label="Pagination">
    <button type="button" class="btn btn-outline" :disabled="!hasPrev" @click="emit('change', page - 1)">
      ← Previous
    </button>
    <span class="pagination__current" aria-current="page">Page {{ page }}</span>
    <button type="button" class="btn btn-outline" :disabled="!hasNext" @click="emit('change', page + 1)">
      Next →
    </button>
  </nav>
</template>
