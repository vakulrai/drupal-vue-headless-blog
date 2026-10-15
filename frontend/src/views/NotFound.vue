<script setup>
import { useSeo } from '@/composables/useSeo'

useSeo({ title: 'Page not found' })
</script>

<template>
  <section class="container section narrow state-box">
    <h1>Page not found</h1>
    <p class="muted">The page you are looking for does not exist.</p>
    <RouterLink to="/" class="btn">Go to the homepage</RouterLink>
  </section>
</template>
