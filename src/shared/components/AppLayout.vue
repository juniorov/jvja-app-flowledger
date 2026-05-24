<script setup>
import BottomNav from './BottomNav.vue'
</script>

<template>
  <div class="flex flex-col min-h-svh bg-neutral-50">
    <!-- Contenido principal — en desktop con margen para el sidebar -->
    <!-- overflow-x-hidden: evita que overflow-y:auto habilite scroll horizontal -->
    <main class="flex-1 overflow-y-auto overflow-x-hidden pb-16 md:pb-0 md:ml-56">
      <div class="max-w-2xl mx-auto min-h-full flex flex-col">
        <RouterView />
      </div>
    </main>

    <BottomNav />
  </div>
</template>
