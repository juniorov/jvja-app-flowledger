<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()

function isActive(path) {
  return route.path.startsWith(path)
}
</script>

<template>
  <nav
    class="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 dark:bg-gray-900 dark:border-gray-700 pb-safe"
  >
    <div class="flex items-stretch h-16">

      <!-- Balance -->
      <RouterLink
        to="/balance"
        class="flex flex-1 flex-col items-center justify-center gap-1 transition-colors duration-150"
        :class="isActive('/balance') ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'"
      >
        <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
        <span class="text-[10px] font-medium leading-none">Balance</span>
      </RouterLink>

      <!-- Movimientos -->
      <RouterLink
        to="/movimientos"
        class="flex flex-1 flex-col items-center justify-center gap-1 transition-colors duration-150"
        :class="isActive('/movimientos') ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'"
      >
        <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="8" y1="6" x2="21" y2="6"/>
          <line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6" x2="3.01" y2="6"/>
          <line x1="3" y1="12" x2="3.01" y2="12"/>
          <line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
        <span class="text-[10px] font-medium leading-none">Movimientos</span>
      </RouterLink>

      <!-- Importar -->
      <RouterLink
        to="/importar"
        class="flex flex-1 flex-col items-center justify-center gap-1 transition-colors duration-150"
        :class="isActive('/importar') ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'"
      >
        <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        <span class="text-[10px] font-medium leading-none">Importar</span>
      </RouterLink>

      <!-- Perfil -->
      <RouterLink
        to="/perfil"
        class="flex flex-1 flex-col items-center justify-center gap-1 transition-colors duration-150"
        :class="isActive('/perfil') ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'"
      >
        <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <span class="text-[10px] font-medium leading-none">Perfil</span>
      </RouterLink>

    </div>
  </nav>
</template>
