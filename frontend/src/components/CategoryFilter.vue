<script setup>
/**
 * Category pills with v-model support: emits the selected category slug,
 * or an empty string for "All".
 */
defineProps({
  categories: { type: Array, required: true },
  modelValue: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="category-filter" role="group" aria-label="Filter by category">
    <button
      type="button"
      class="pill"
      :class="{ active: !modelValue }"
      :aria-pressed="!modelValue"
      @click="emit('update:modelValue', '')"
    >
      All
    </button>
    <button
      v-for="category in categories"
      :key="category.id"
      type="button"
      class="pill"
      :class="{ active: modelValue === category.slug }"
      :aria-pressed="modelValue === category.slug"
      @click="emit('update:modelValue', category.slug)"
    >
      {{ category.name }}
    </button>
  </div>
</template>
