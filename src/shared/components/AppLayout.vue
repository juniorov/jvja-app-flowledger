<script setup>
import BottomNav from './BottomNav.vue'
</script>

<template>
  <div class="flex flex-col min-h-svh bg-gray-50 dark:bg-gray-950">
    <!-- Contenido principal con padding inferior para no quedar bajo el nav -->
    <main class="flex-1 overflow-y-auto pb-16">
      <RouterView />
    </main>

    <BottomNav />
  </div>
</template>
