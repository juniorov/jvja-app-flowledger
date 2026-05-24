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
    <!-- Backdrop -->
    <Transition
      enter-from-class="opacity-0"
      enter-active-class="transition-opacity duration-200"
      leave-to-class="opacity-0"
      leave-active-class="transition-opacity duration-150"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 bg-black/50"
        @click="$emit('close')"
      />
    </Transition>

    <!-- Sheet -->
    <Transition
      enter-from-class="translate-y-full"
      enter-active-class="transition-transform duration-300 ease-out"
      leave-to-class="translate-y-full"
      leave-active-class="transition-transform duration-200 ease-in"
    >
      <div
        v-if="open"
        class="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 rounded-t-3xl max-h-[90svh] flex flex-col shadow-2xl"
        role="dialog"
        :aria-label="title"
      >
        <!-- Drag handle visual -->
        <div class="flex justify-center pt-3 pb-1 shrink-0">
          <div class="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-600" />
        </div>

        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-3 shrink-0 border-b border-gray-100 dark:border-gray-700">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white truncate">
            {{ title }}
          </h2>
          <button
            type="button"
            class="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition min-h-[36px] min-w-[36px] flex items-center justify-center"
            @click="$emit('close')"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Contenido scrollable -->
        <div class="overflow-y-auto flex-1 pb-safe">
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
