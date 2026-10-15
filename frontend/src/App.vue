<script setup>
import { onMounted } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import { useAuth } from '@/stores/auth'

const { ensureChecked } = useAuth()

// Restore an existing Drupal session so the header shows the right links.
onMounted(ensureChecked)
</script>

<template>
  <a class="skip-link" href="#main">Skip to content</a>
  <AppHeader />
  <main id="main" class="site-main">
    <RouterView />
  </main>
  <AppFooter />
</template>
