<script setup>
defineProps({
  title: { type: String, default: 'Something went wrong' },
  message: { type: String, default: 'The content could not be loaded.' },
  retryable: { type: Boolean, default: true },
})

const emit = defineEmits(['retry'])
</script>

<template>
  <div class="state-box state-box--error" role="alert">
    <h2>{{ title }}</h2>
    <p>{{ message }}</p>
    <p class="muted small">The CMS runs on a free hosting tier and may need up to a minute to wake up.</p>
    <button v-if="retryable" type="button" class="btn" @click="emit('retry')">Try again</button>
  </div>
</template>
