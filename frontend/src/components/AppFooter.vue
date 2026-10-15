<script setup>
const siteName = import.meta.env.VITE_SITE_NAME || 'Headless Blog'
const year = new Date().getFullYear()
</script>

<template>
  <footer class="site-footer">
    <div class="container footer-inner">
      <div>
        <p class="footer-brand">{{ siteName }}</p>
        <p class="muted">Content managed in Drupal 11, delivered over JSON:API and rendered with Vue.js 3.</p>
      </div>
      <nav class="footer-nav" aria-label="Footer">
        <RouterLink to="/blog">All articles</RouterLink>
        <RouterLink to="/contact">Contact</RouterLink>
        <RouterLink to="/login">Editor login</RouterLink>
      </nav>
    </div>
    <div class="container footer-bottom">
      <small>&copy; {{ year }} {{ siteName }}</small>
    </div>
  </footer>
</template>
