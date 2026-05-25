<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'

const auth = useAuthStore()
const router = useRouter()

// Modo actual: 'login' | 'register' | 'forgot'
const mode = ref('login')

// Campos comunes
const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

// Campos exclusivos de registro
const name = ref('')
const confirmPassword = ref('')

// Estado de recuperación de contraseña
const resetEmailSent = ref(false)

const errorMessages = {
  'auth/user-not-found': 'No existe una cuenta con ese correo.',
  'auth/wrong-password': 'Contraseña incorrecta.',
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/invalid-email': 'El correo no es válido.',
  'auth/too-many-requests': 'Demasiados intentos. Intentá más tarde.',
  'auth/popup-closed-by-user': '',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
}

function getErrorMessage(err) {
  const code = err?.code ?? ''
  return errorMessages[code] ?? 'Ocurrió un error. Intentá de nuevo.'
}

function switchMode(newMode) {
  mode.value = newMode
  errorMsg.value = ''
  resetEmailSent.value = false
}

// Validación de contraseña en registro
const passwordError = computed(() => {
  if (!password.value) return ''
  if (password.value.length < 8) return 'Mínimo 8 caracteres.'
  return ''
})

const confirmError = computed(() => {
  if (!confirmPassword.value) return ''
  if (password.value !== confirmPassword.value) return 'Las contraseñas no coinciden.'
  return ''
})

const registerDisabled = computed(() =>
  !name.value || !email.value || !password.value || !confirmPassword.value ||
  !!passwordError.value || !!confirmError.value
)

async function handleEmailLogin() {
  if (!email.value || !password.value) return
  loading.value = true
  errorMsg.value = ''
  try {
    await auth.signInWithEmail(email.value, password.value)
    router.push('/balance')
  } catch (err) {
    errorMsg.value = getErrorMessage(err)
  } finally {
    loading.value = false
  }
}

async function handleGoogleLogin() {
  loading.value = true
  errorMsg.value = ''
  try {
    await auth.signInWithGoogle()
    router.push('/balance')
  } catch (err) {
    const msg = getErrorMessage(err)
    if (msg) errorMsg.value = msg
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  if (registerDisabled.value) return
  loading.value = true
  errorMsg.value = ''
  try {
    await auth.signUp(email.value, password.value, name.value.trim())
    router.push('/workspace/setup')
  } catch (err) {
    errorMsg.value = getErrorMessage(err)
  } finally {
    loading.value = false
  }
}

async function handleForgotPassword() {
  if (!email.value) return
  loading.value = true
  errorMsg.value = ''
  try {
    await auth.resetPassword(email.value)
    resetEmailSent.value = true
  } catch (err) {
    errorMsg.value = getErrorMessage(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-svh bg-gray-50 dark:bg-gray-950 flex flex-col">
    <div class="flex-1 flex flex-col justify-center px-5 py-10 max-w-sm mx-auto w-full">

      <!-- Brand -->
      <div class="mb-8 text-center">
        <div class="w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Flowledger</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Control financiero para tu empresa</p>
      </div>

      <!-- ==================== MODO: LOGIN ==================== -->
      <div v-if="mode === 'login'" class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 space-y-4">

        <!-- Error -->
        <div v-if="errorMsg" role="alert" class="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-xl px-3 py-2.5">
          <svg class="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {{ errorMsg }}
        </div>

        <!-- Formulario login -->
        <form class="space-y-3" @submit.prevent="handleEmailLogin" novalidate>
          <div>
            <label for="login-email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Correo electrónico
            </label>
            <input
              id="login-email"
              v-model="email"
              type="email"
              required
              autocomplete="email"
              placeholder="tu@empresa.com"
              :disabled="loading"
              class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-base min-h-[48px] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition disabled:opacity-50"
            />
          </div>

          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label for="login-password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Contraseña
              </label>
              <button
                type="button"
                class="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                @click="switchMode('forgot')"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <input
              id="login-password"
              v-model="password"
              type="password"
              required
              autocomplete="current-password"
              placeholder="••••••••"
              :disabled="loading"
              class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-base min-h-[48px] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            :disabled="loading || !email || !password"
            class="w-full py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 active:bg-primary-700 text-white font-semibold text-base min-h-[48px] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="loading" class="flex items-center justify-center gap-2">
              <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Ingresando...
            </span>
            <span v-else>Iniciar sesión</span>
          </button>
        </form>

        <!-- Divider -->
        <div class="flex items-center gap-3">
          <div class="flex-1 h-px bg-gray-200 dark:bg-gray-600" />
          <span class="text-xs text-gray-400 dark:text-gray-500 font-medium">o continuá con</span>
          <div class="flex-1 h-px bg-gray-200 dark:bg-gray-600" />
        </div>

        <!-- Google -->
        <button
          type="button"
          :disabled="loading"
          class="w-full py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium text-base min-h-[48px] flex items-center justify-center gap-3 transition hover:bg-gray-50 dark:hover:bg-gray-600 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          @click="handleGoogleLogin"
        >
          <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuar con Google
        </button>

        <!-- Link a registro -->
        <p class="text-center text-sm text-gray-500 dark:text-gray-400">
          ¿No tenés cuenta?
          <button
            type="button"
            class="text-primary-600 dark:text-primary-400 font-medium hover:underline"
            @click="switchMode('register')"
          >
            Registrate
          </button>
        </p>
      </div>

      <!-- ==================== MODO: REGISTRO ==================== -->
      <div v-else-if="mode === 'register'" class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 space-y-4">

        <div>
          <h2 class="text-lg font-bold text-gray-900 dark:text-white">Crear cuenta</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Completá tus datos para empezar</p>
        </div>

        <!-- Error -->
        <div v-if="errorMsg" role="alert" class="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-xl px-3 py-2.5">
          <svg class="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {{ errorMsg }}
        </div>

        <form class="space-y-3" @submit.prevent="handleRegister" novalidate>

          <!-- Nombre -->
          <div>
            <label for="reg-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Nombre completo
            </label>
            <input
              id="reg-name"
              v-model="name"
              type="text"
              required
              autocomplete="name"
              placeholder="Tu nombre"
              :disabled="loading"
              class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-base min-h-[48px] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition disabled:opacity-50"
            />
          </div>

          <!-- Email -->
          <div>
            <label for="reg-email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Correo electrónico
            </label>
            <input
              id="reg-email"
              v-model="email"
              type="email"
              required
              autocomplete="email"
              placeholder="tu@empresa.com"
              :disabled="loading"
              class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-base min-h-[48px] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition disabled:opacity-50"
            />
          </div>

          <!-- Contraseña -->
          <div>
            <label for="reg-password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Contraseña
            </label>
            <input
              id="reg-password"
              v-model="password"
              type="password"
              required
              autocomplete="new-password"
              placeholder="Mínimo 8 caracteres"
              :disabled="loading"
              :class="[
                'w-full px-4 py-3 rounded-xl border bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-base min-h-[48px] focus:outline-none focus:ring-2 focus:border-transparent transition disabled:opacity-50',
                passwordError ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 dark:border-gray-600 focus:ring-primary-500'
              ]"
            />
            <p v-if="passwordError" class="mt-1.5 text-xs text-red-600 dark:text-red-400">{{ passwordError }}</p>
          </div>

          <!-- Confirmar contraseña -->
          <div>
            <label for="reg-confirm" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Confirmar contraseña
            </label>
            <input
              id="reg-confirm"
              v-model="confirmPassword"
              type="password"
              required
              autocomplete="new-password"
              placeholder="••••••••"
              :disabled="loading"
              :class="[
                'w-full px-4 py-3 rounded-xl border bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-base min-h-[48px] focus:outline-none focus:ring-2 focus:border-transparent transition disabled:opacity-50',
                confirmError ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 dark:border-gray-600 focus:ring-primary-500'
              ]"
            />
            <p v-if="confirmError" class="mt-1.5 text-xs text-red-600 dark:text-red-400">{{ confirmError }}</p>
          </div>

          <button
            type="submit"
            :disabled="loading || registerDisabled"
            class="w-full py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 active:bg-primary-700 text-white font-semibold text-base min-h-[48px] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="loading" class="flex items-center justify-center gap-2">
              <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Creando cuenta...
            </span>
            <span v-else>Crear cuenta</span>
          </button>
        </form>

        <p class="text-center text-sm text-gray-500 dark:text-gray-400">
          ¿Ya tenés cuenta?
          <button
            type="button"
            class="text-primary-600 dark:text-primary-400 font-medium hover:underline"
            @click="switchMode('login')"
          >
            Iniciá sesión
          </button>
        </p>
      </div>

      <!-- ==================== MODO: OLVIDÉ CONTRASEÑA ==================== -->
      <div v-else-if="mode === 'forgot'" class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 space-y-4">

        <!-- Confirmación enviada -->
        <div v-if="resetEmailSent" class="space-y-4">
          <div class="flex flex-col items-center text-center gap-3 py-4">
            <div class="w-12 h-12 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
              <svg class="w-6 h-6 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7"/>
                <path d="M4 13l4 4 8-8"/>
              </svg>
            </div>
            <div>
              <p class="font-semibold text-gray-900 dark:text-white">Correo enviado</p>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Revisá tu bandeja de entrada en <span class="font-medium text-gray-700 dark:text-gray-300">{{ email }}</span> y seguí las instrucciones para restablecer tu contraseña.
              </p>
            </div>
          </div>
          <button
            type="button"
            class="w-full py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium text-base min-h-[48px] transition hover:bg-gray-50 dark:hover:bg-gray-700"
            @click="switchMode('login')"
          >
            Volver al inicio de sesión
          </button>
        </div>

        <!-- Formulario recuperación -->
        <template v-else>
          <div>
            <h2 class="text-lg font-bold text-gray-900 dark:text-white">Recuperar contraseña</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Te enviamos un enlace para restablecer tu contraseña.</p>
          </div>

          <!-- Error -->
          <div v-if="errorMsg" role="alert" class="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-xl px-3 py-2.5">
            <svg class="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {{ errorMsg }}
          </div>

          <form class="space-y-3" @submit.prevent="handleForgotPassword" novalidate>
            <div>
              <label for="forgot-email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Correo electrónico
              </label>
              <input
                id="forgot-email"
                v-model="email"
                type="email"
                required
                autocomplete="email"
                placeholder="tu@empresa.com"
                :disabled="loading"
                class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-base min-h-[48px] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              :disabled="loading || !email"
              class="w-full py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 active:bg-primary-700 text-white font-semibold text-base min-h-[48px] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="loading" class="flex items-center justify-center gap-2">
                <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Enviando...
              </span>
              <span v-else>Enviar enlace</span>
            </button>
          </form>

          <p class="text-center text-sm text-gray-500 dark:text-gray-400">
            <button
              type="button"
              class="text-primary-600 dark:text-primary-400 font-medium hover:underline"
              @click="switchMode('login')"
            >
              ← Volver al inicio de sesión
            </button>
          </p>
        </template>
      </div>

    </div>
  </div>
</template>
