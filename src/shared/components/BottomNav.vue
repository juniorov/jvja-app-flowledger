<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()

function isActive(path) {
  return route.path.startsWith(path)
}
</script>

<template>
  <!--
    Mobile:  barra fija en la parte inferior, items en fila sin labels largas
    Desktop: sidebar fijo a la izquierda con labels visibles
  -->
  <nav
    class="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-neutral-100 pb-safe
           md:top-0 md:right-auto md:w-56 md:border-t-0 md:border-r md:border-neutral-100 md:pb-0"
  >
    <!-- Logo / nombre — solo desktop -->
    <div class="hidden md:flex items-center px-5 h-16 border-b border-neutral-100 shrink-0">
      <span class="text-base font-bold text-neutral-900 tracking-tight">Flowledger</span>
    </div>

    <!-- Links -->
    <div class="flex items-stretch h-16 md:flex-col md:h-auto md:py-3 md:gap-0.5">

      <!-- Balance -->
      <RouterLink
        to="/balance"
        class="flex flex-1 flex-col items-center justify-center gap-1 transition-colors duration-150
               md:flex-none md:flex-row md:items-center md:justify-start md:gap-3 md:px-4 md:py-3 md:rounded-xl md:mx-2"
        :class="isActive('/balance')
          ? 'text-primary md:bg-primary/10'
          : 'text-neutral-400 md:hover:bg-neutral-100 md:hover:text-neutral-700'"
      >
        <svg class="w-6 h-6 md:w-5 md:h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
        <span class="text-[10px] font-medium leading-none md:text-sm md:leading-normal">Balance</span>
      </RouterLink>

      <!-- Movimientos -->
      <RouterLink
        to="/movimientos"
        class="flex flex-1 flex-col items-center justify-center gap-1 transition-colors duration-150
               md:flex-none md:flex-row md:items-center md:justify-start md:gap-3 md:px-4 md:py-3 md:rounded-xl md:mx-2"
        :class="isActive('/movimientos')
          ? 'text-primary md:bg-primary/10'
          : 'text-neutral-400 md:hover:bg-neutral-100 md:hover:text-neutral-700'"
      >
        <svg class="w-6 h-6 md:w-5 md:h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="8" y1="6" x2="21" y2="6"/>
          <line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6" x2="3.01" y2="6"/>
          <line x1="3" y1="12" x2="3.01" y2="12"/>
          <line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
        <span class="text-[10px] font-medium leading-none md:text-sm md:leading-normal">Movimientos</span>
      </RouterLink>

      <!-- Importar -->
      <RouterLink
        to="/importar"
        class="flex flex-1 flex-col items-center justify-center gap-1 transition-colors duration-150
               md:flex-none md:flex-row md:items-center md:justify-start md:gap-3 md:px-4 md:py-3 md:rounded-xl md:mx-2"
        :class="isActive('/importar')
          ? 'text-primary md:bg-primary/10'
          : 'text-neutral-400 md:hover:bg-neutral-100 md:hover:text-neutral-700'"
      >
        <svg class="w-6 h-6 md:w-5 md:h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        <span class="text-[10px] font-medium leading-none md:text-sm md:leading-normal">Importar</span>
      </RouterLink>

      <!-- Perfil -->
      <RouterLink
        to="/perfil"
        class="flex flex-1 flex-col items-center justify-center gap-1 transition-colors duration-150
               md:flex-none md:flex-row md:items-center md:justify-start md:gap-3 md:px-4 md:py-3 md:rounded-xl md:mx-2"
        :class="isActive('/perfil')
          ? 'text-primary md:bg-primary/10'
          : 'text-neutral-400 md:hover:bg-neutral-100 md:hover:text-neutral-700'"
      >
        <svg class="w-6 h-6 md:w-5 md:h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <span class="text-[10px] font-medium leading-none md:text-sm md:leading-normal">Perfil</span>
      </RouterLink>

    </div>
  </nav>
</template>
