import { reactive, readonly } from 'vue'
import { ApiError, getCurrentUser, login as apiLogin, logout as apiLogout } from '@/services/api'

/**
 * Minimal shared auth state. Drupal keeps the session in an HTTP-only
 * cookie; the frontend only remembers who is logged in and the logout token.
 */
const LOGOUT_TOKEN_KEY = 'hb_logout_token'

const state = reactive({
  user: null,
  checked: false,
})

let pendingCheck = null

function readToken() {
  try {
    return sessionStorage.getItem(LOGOUT_TOKEN_KEY)
  } catch {
    return null
  }
}

function writeToken(token) {
  try {
    if (token) sessionStorage.setItem(LOGOUT_TOKEN_KEY, token)
    else sessionStorage.removeItem(LOGOUT_TOKEN_KEY)
  } catch {
    // Storage can be unavailable (private mode); logout still clears the UI.
  }
}

async function refresh() {
  try {
    state.user = await getCurrentUser()
  } catch (error) {
    if (!(error instanceof ApiError) || ![401, 403].includes(error.status)) {
      console.warn('Could not verify session', error)
    }
    state.user = null
  } finally {
    state.checked = true
  }
  return state.user
}

/** Resolves once the session has been checked (used by the router guard). */
function ensureChecked() {
  if (state.checked) return Promise.resolve(state.user)
  pendingCheck ??= refresh().finally(() => {
    pendingCheck = null
  })
  return pendingCheck
}

async function login(name, pass) {
  const result = await apiLogin(name, pass)
  writeToken(result.logout_token)
  return refresh()
}

async function logout() {
  const token = readToken()
  try {
    if (token) await apiLogout(token)
  } finally {
    writeToken(null)
    state.user = null
  }
}

export function useAuth() {
  return {
    state: readonly(state),
    ensureChecked,
    login,
    logout,
  }
}
