<script setup>
import { reactive, ref } from 'vue'
import { ApiError, sendContactMessage } from '@/services/api'
import { useSeo } from '@/composables/useSeo'

useSeo({ title: 'Contact', description: 'Send a message to the editorial team.' })

const form = reactive({ name: '', email: '', message: '', website: '' })
const errors = ref({})
const submitting = ref(false)
const success = ref('')
const failure = ref('')

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate() {
  const result = {}
  if (!form.name.trim()) result.name = 'Please enter your name.'
  if (!EMAIL_PATTERN.test(form.email.trim())) result.email = 'Please enter a valid email address.'
  if (form.message.trim().length < 10) result.message = 'Message should be at least 10 characters.'
  errors.value = result
  return Object.keys(result).length === 0
}

async function submit() {
  success.value = ''
  failure.value = ''
  if (!validate()) return

  submitting.value = true
  try {
    const response = await sendContactMessage(form)
    success.value = response.message
    Object.assign(form, { name: '', email: '', message: '', website: '' })
  } catch (error) {
    if (error instanceof ApiError && error.status === 422) {
      errors.value = error.details?.errors || {}
    }
    failure.value = error.message
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="page-head">
    <div class="container">
      <h1>Contact us</h1>
      <p class="muted">Messages are stored in Drupal, where editors can read them under Content.</p>
    </div>
  </section>

  <section class="container section narrow">
    <div v-if="success" class="notice notice--success" role="status">{{ success }}</div>
    <div v-if="failure" class="notice notice--error" role="alert">{{ failure }}</div>

    <form class="form" novalidate @submit.prevent="submit">
      <div class="field">
        <label for="contact-name">Name</label>
        <input id="contact-name" v-model="form.name" type="text" autocomplete="name" :aria-invalid="!!errors.name" />
        <p v-if="errors.name" class="field-error">{{ errors.name }}</p>
      </div>

      <div class="field">
        <label for="contact-email">Email</label>
        <input id="contact-email" v-model="form.email" type="email" autocomplete="email" :aria-invalid="!!errors.email" />
        <p v-if="errors.email" class="field-error">{{ errors.email }}</p>
      </div>

      <div class="field">
        <label for="contact-message">Message</label>
        <textarea id="contact-message" v-model="form.message" rows="6" :aria-invalid="!!errors.message"></textarea>
        <p v-if="errors.message" class="field-error">{{ errors.message }}</p>
      </div>

      <!-- Honeypot field, hidden from people and filled in by bots. -->
      <div class="hp-field" aria-hidden="true">
        <label for="contact-website">Website</label>
        <input id="contact-website" v-model="form.website" type="text" tabindex="-1" autocomplete="off" />
      </div>

      <button type="submit" class="btn" :disabled="submitting">
        {{ submitting ? 'Sending…' : 'Submit' }}
      </button>
    </form>
  </section>
</template>
