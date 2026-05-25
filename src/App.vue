<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const installPrompt = ref(null)
const showInstallBanner = ref(false)

function handleBeforeInstallPrompt(e) {
  e.preventDefault()
  installPrompt.value = e
  showInstallBanner.value = true
}

function handleAppInstalled() {
  showInstallBanner.value = false
  installPrompt.value = null
}

async function installApp() {
  if (!installPrompt.value) return
  installPrompt.value.prompt()
  const { outcome } = await installPrompt.value.userChoice
  if (outcome === 'accepted') {
    showInstallBanner.value = false
  }
  installPrompt.value = null
}

function dismissBanner() {
  showInstallBanner.value = false
}

onMounted(() => {
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.addEventListener('appinstalled', handleAppInstalled)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.removeEventListener('appinstalled', handleAppInstalled)
})
</script>

<template>
  <RouterView />

  <!-- Banner de instalación PWA -->
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-full opacity-0"
  >
    <div
      v-if="showInstallBanner"
      class="fixed bottom-20 left-4 right-4 z-50 md:bottom-6 md:left-auto md:right-6 md:w-80"
    >
      <div class="bg-white rounded-2xl shadow-lg border border-neutral-200 p-4 flex items-center gap-3">
        <!-- Ícono app -->
        <div class="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        </div>

        <!-- Texto -->
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-neutral-900 leading-tight">Instalar Flowledger</p>
          <p class="text-xs text-neutral-500 mt-0.5">Acceso rápido desde tu pantalla de inicio</p>
        </div>

        <!-- Acciones -->
        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            class="text-xs font-semibold text-neutral-400 hover:text-neutral-600 transition px-1 py-1"
            aria-label="Cerrar"
            @click="dismissBanner"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <button
            type="button"
            class="text-xs font-bold px-3 py-2 rounded-lg bg-primary text-white hover:bg-primary-c transition min-h-[36px]"
            @click="installApp"
          >
            Instalar
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
