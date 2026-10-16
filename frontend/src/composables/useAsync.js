import { ref, shallowRef } from 'vue'

/**
 * Wraps an async function with reactive loading / error / data state.
 * Late responses from superseded calls are ignored, so fast typing in the
 * search box never shows stale results.
 */
export function useAsync(fn, { initialData = null, initialLoading = false } = {}) {
  const data = shallowRef(initialData)
  const error = ref(null)
  // Views that fetch immediately start in the loading state to avoid
  // flashing an "empty" message before the first request begins.
  const loading = ref(initialLoading)
  let callId = 0

  async function run(...args) {
    const id = ++callId
    loading.value = true
    error.value = null
    try {
      const result = await fn(...args)
      if (id === callId) data.value = result
      return result
    } catch (err) {
      if (id === callId) error.value = err
      return undefined
    } finally {
      if (id === callId) loading.value = false
    }
  }

  return { data, error, loading, run }
}
