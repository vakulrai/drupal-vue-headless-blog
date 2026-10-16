<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { DRUPAL_ADMIN_URL } from '@/services/api'
import { useAuth } from '@/stores/auth'
import { useSeo } from '@/composables/useSeo'
import { formatDate } from '@/utils/format'

useSeo({ title: 'Your profile' })

const router = useRouter()
const auth = useAuth()
const user = computed(() => auth.state.user)
// The CMS runs on its own domain with its own session, so open its login form;
// Drupal sends already signed-in editors straight on to the destination.
const adminUrl = `${DRUPAL_ADMIN_URL}/user/login?destination=/admin/content`

async function onLogout() {
  await auth.logout()
  router.push({ name: 'home' })
}
</script>

<template>
  <section class="container section narrow">
    <h1>Your profile</h1>
    <p class="muted">This page is protected: it is only reachable with a valid Drupal session.</p>

    <dl v-if="user" class="profile">
      <div><dt>Username</dt><dd>{{ user.name }}</dd></div>
      <div><dt>Email</dt><dd>{{ user.email }}</dd></div>
      <div><dt>Roles</dt><dd>{{ user.roles.join(', ') || 'Authenticated user' }}</dd></div>
      <div><dt>Member since</dt><dd>{{ formatDate(user.memberSince) }}</dd></div>
      <div><dt>Blog posts authored</dt><dd>{{ user.blogCount }}</dd></div>
    </dl>

    <div class="actions">
      <a :href="adminUrl" class="btn" target="_blank" rel="noopener">Open Drupal admin</a>
      <button type="button" class="btn btn-outline" @click="onLogout">Log out</button>
    </div>
    <p class="muted small">The Drupal admin runs on its own domain, so it asks you to sign in there separately.</p>
  </section>
</template>
