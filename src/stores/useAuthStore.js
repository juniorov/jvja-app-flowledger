import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  waitForAuthReady,
  subscribeToAuthChanges,
  loginWithGoogle,
  loginWithEmail,
  registerWithEmail,
  resetPassword as authResetPassword,
  logout as authLogout,
} from '@/services/auth.service'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const loading = ref(true)
  const error = ref(null)

  const isAuthenticated = computed(() => !!user.value)

  /**
   * Espera el primer evento de auth y activa el listener continuo.
   * Llamar una sola vez al arrancar la app (main.js).
   */
  async function init() {
    const firebaseUser = await waitForAuthReady()
    user.value = firebaseUser
    loading.value = false

    // Mantener el estado sincronizado con Firebase
    subscribeToAuthChanges((u) => {
      user.value = u
    })

    return firebaseUser
  }

  async function signInWithGoogle() {
    error.value = null
    const u = await loginWithGoogle()
    user.value = u
    return u
  }

  async function signInWithEmail(email, password) {
    error.value = null
    const u = await loginWithEmail(email, password)
    user.value = u
    return u
  }

  async function signUp(email, password, displayName) {
    error.value = null
    const u = await registerWithEmail(email, password, displayName)
    user.value = u
    return u
  }

  async function resetPassword(email) {
    error.value = null
    await authResetPassword(email)
  }

  async function logout() {
    await authLogout()
    user.value = null
  }

  return {
    user,
    loading,
    error,
    isAuthenticated,
    init,
    signInWithGoogle,
    signInWithEmail,
    signUp,
    resetPassword,
    logout,
  }
})
