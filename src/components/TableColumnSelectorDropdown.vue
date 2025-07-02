<template>
  <UDropdownMenu :items="items">
    <slot/>
  </UDropdownMenu>
</template>

<script setup lang="ts">
import type { Table, RowData } from '@tanstack/table-core'

const props = defineProps<{
  tableApi: Table<RowData>
}>()

const items = computed(() => props.tableApi
  ?.getAllColumns()
  ?.filter(column => column.getCanHide())
  ?.map(column => ({
    label: <string> column.columnDef.header,
    type: 'checkbox' as const,
    checked: column.getIsVisible(),
    onUpdateChecked(checked: boolean) {
      column.toggleVisibility(!!checked)
    }
  }))
)
</script>