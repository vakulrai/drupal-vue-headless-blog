<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'

/**
 * Search input that emits a debounced "search" event so the API is not
 * called on every keystroke. Enter searches immediately.
 */
const props = defineProps({
  modelValue: { type: String, default: '' },
  delay: { type: Number, default: 350 },
  placeholder: { type: String, default: 'Search articles…' },
})

const emit = defineEmits(['search'])

const term = ref(props.modelValue)
let timer

watch(() => props.modelValue, (value) => {
  if (value !== term.value) term.value = value
})

function emitNow() {
  clearTimeout(timer)
  emit('search', term.value.trim())
}

function onInput() {
  clearTimeout(timer)
  timer = setTimeout(emitNow, props.delay)
}

function clear() {
  term.value = ''
  emitNow()
}

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <form class="search-bar" role="search" @submit.prevent="emitNow">
    <label for="blog-search" class="sr-only">Search articles</label>
    <svg class="search-bar__icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </svg>
    <input
      id="blog-search"
      v-model="term"
      type="search"
      :placeholder="placeholder"
      autocomplete="off"
      @input="onInput"
    />
    <button v-if="term" type="button" class="search-bar__clear" aria-label="Clear search" @click="clear">×</button>
  </form>
</template>
