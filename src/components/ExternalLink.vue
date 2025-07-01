<template>
  <ULink :external="true" target="_blank">
    <slot/>
    <UIcon name="i-lucide-external-link" class="ml-1"/>
  </ULink>
</template>