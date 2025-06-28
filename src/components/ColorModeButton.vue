<template>
  <UButton :icon="isDark ? 'i-lucide-sun' : 'i-lucide-moon'" @click="toggle" variant="outline" class="cursor-pointer" color="neutral"/>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const colorMode = useColorMode()

const isDark = computed(() => colorMode.value === 'dark')

function toggle() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}
</script>