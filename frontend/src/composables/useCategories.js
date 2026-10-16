import { ref } from 'vue'
import { getCategories } from '@/services/api'

// Shared across components so categories are fetched once per page load.
const categories = ref([])
const loading = ref(false)
const error = ref(null)
let request = null

export function useCategories() {
  function load({ force = false } = {}) {
    if (request && !force) return request
    loading.value = true
    error.value = null
    request = getCategories()
      .then((items) => {
        categories.value = items
        return items
      })
      .catch((err) => {
        error.value = err
        request = null
        return []
      })
      .finally(() => {
        loading.value = false
      })
    return request
  }

  return { categories, loading, error, load }
}
