<template>
  <UApp :locale="de">
    <BaseHeader/>
    <div class="">
      <NuxtPage class="m-2"/>
    </div>
  </UApp>
</template>

<script setup>
import { de } from '@nuxt/ui/locale'
</script>