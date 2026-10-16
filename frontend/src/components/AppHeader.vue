<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/stores/auth'

const siteName = import.meta.env.VITE_SITE_NAME || 'Headless Blog'
const menuOpen = ref(false)
const route = useRoute()
const router = useRouter()
const auth = useAuth()

// Close the mobile menu after navigating.
watch(() => route.fullPath, () => {
  menuOpen.value = false
})

async function onLogout() {
  await auth.logout()
  router.push({ name: 'home' })
}
</script>

<template>
  <header class="site-header">
    <div class="container header-inner">
      <RouterLink to="/" class="brand">
        <img src="/favicon.svg" alt="" width="32" height="32" />
        <span>{{ siteName }}</span>
      </RouterLink>

      <button
        class="menu-toggle"
        type="button"
        :aria-expanded="menuOpen"
        aria-controls="primary-nav"
        @click="menuOpen = !menuOpen"
      >
        <span class="sr-only">Toggle navigation</span>
        <span class="menu-icon" :class="{ open: menuOpen }" aria-hidden="true"></span>
      </button>

      <nav id="primary-nav" class="primary-nav" :class="{ open: menuOpen }" aria-label="Main">
        <RouterLink to="/" exact-active-class="active">Home</RouterLink>
        <RouterLink to="/blog" active-class="active">Blog</RouterLink>
        <RouterLink to="/contact" active-class="active">Contact</RouterLink>
        <template v-if="auth.state.user">
          <RouterLink to="/profile" active-class="active">Profile</RouterLink>
          <button type="button" class="link-button" @click="onLogout">Log out</button>
        </template>
        <RouterLink v-else to="/login" class="btn btn-small" active-class="active">Log in</RouterLink>
      </nav>
    </div>
  </header>
</template>
