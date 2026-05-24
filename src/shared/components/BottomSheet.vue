<script setup>
defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '',
  },
})

defineEmits(['close'])
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-from-class="opacity-0"
      enter-active-class="transition-opacity duration-200"
      leave-to-class="opacity-0"
      leave-active-class="transition-opacity duration-150"
    >
      <!--
        Mobile:  flex items-end → panel pegado al fondo, ancho completo
        Desktop: flex items-center justify-center → modal centrado con max-w-lg
      -->
      <div
        v-if="open"
        class="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center md:justify-center md:p-4"
        @click.self="$emit('close')"
      >
        <div
          class="bg-white rounded-t-3xl max-h-[90svh] w-full flex flex-col shadow-2xl
                 md:rounded-2xl md:max-w-lg md:max-h-[85vh]"
          role="dialog"
          :aria-label="title"
        >
          <!-- Drag handle — solo mobile -->
          <div class="flex justify-center pt-3 pb-1 shrink-0 md:hidden">
            <div class="w-10 h-1 rounded-full bg-neutral-200" />
          </div>

          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-3 shrink-0 border-b border-neutral-100">
            <h2 class="text-base font-semibold text-neutral-900 truncate">
              {{ title }}
            </h2>
            <button
              type="button"
              class="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition min-h-[36px] min-w-[36px] flex items-center justify-center"
              @click="$emit('close')"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <!-- Contenido scrollable -->
          <div class="overflow-y-auto flex-1 pb-safe md:pb-0">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
