<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/stores/auth'
import { useSeo } from '@/composables/useSeo'

useSeo({ title: 'Log in' })

const route = useRoute()
const router = useRouter()
const auth = useAuth()

const form = reactive({ name: '', pass: '' })
const submitting = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  if (!form.name || !form.pass) {
    error.value = 'Please enter your username and password.'
    return
  }
  submitting.value = true
  try {
    await auth.login(form.name, form.pass)
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
      ? route.query.redirect
      : '/profile'
    router.replace(redirect)
  } catch (err) {
    error.value = err.status === 400 ? 'Unrecognized username or password.' : err.message
  } finally {
    submitting.value = false
    form.pass = ''
  }
}
</script>

<template>
  <section class="container section narrow">
    <h1>Log in</h1>
    <p class="muted">Sign in with your Drupal account to see your profile.</p>

    <div v-if="auth.state.user" class="notice notice--success">
      You are logged in as <strong>{{ auth.state.user.name }}</strong>.
      <RouterLink to="/profile">Go to your profile</RouterLink>
    </div>

    <form v-else class="form" novalidate @submit.prevent="submit">
      <div v-if="error" class="notice notice--error" role="alert">{{ error }}</div>
      <div class="field">
        <label for="login-name">Username</label>
        <input id="login-name" v-model="form.name" type="text" autocomplete="username" />
      </div>
      <div class="field">
        <label for="login-pass">Password</label>
        <input id="login-pass" v-model="form.pass" type="password" autocomplete="current-password" />
      </div>
      <button type="submit" class="btn" :disabled="submitting">
        {{ submitting ? 'Signing in…' : 'Log in' }}
      </button>
    </form>
  </section>
</template>
