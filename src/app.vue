<template>
  <UApp :locale="de">
    <AppHeader/>
    <NuxtPage class="m-2"/>
  </UApp>
</template>

<script setup>
import { de } from '@nuxt/ui/locale'
</script>