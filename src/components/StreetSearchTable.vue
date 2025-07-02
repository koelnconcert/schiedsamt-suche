<template>
  <div>
    <div class="mb-2 flex">
      <UInput class="flex-grow" v-model="query" placeholder="Nach Adresse suchen..." />
      <UModal title="Quellen und Lizenzen">
        <UButton color="secondary" variant="link" class="cursor-pointer">Quellen und Lizenzen</UButton>
        <template #body>
          <h3 class="text-lg mb-2">{{ data.source.name }}</h3>
          <div class="grid grid-cols-[auto_auto] gap-x-4 gap-y-2">
            Links
            <span>
              <ExternalLink :to="data.source.website">Website</ExternalLink>
              &bullet;
              <ExternalLink :to="data.source.download">Download</ExternalLink>
            </span>

            Stand <span>{{ data.source.changed }}</span>

            Lizenz 
            <span>
              <ExternalLink :to="data.license.url">{{ data.license.name }}</ExternalLink>
              <br/>
              {{ data.license.holder }}
            </span>
          </div>
        </template>
      </UModal>
      <TableColumnSelectorDropdown :table-api="table?.tableApi">
        <UButton label="Spalten" trailing-icon="i-lucide-chevron-down"/>
      </TableColumnSelectorDropdown>

    </div>
    {{  breakpoints.active() }}
    <UTable ref="table" :data="filtered" :columns="columns" :empty="emptyLabel" :grouping="grouping" :grouping-options="groupingOptions"
      :expanded="true" :ui="ui" :meta="meta" :pagination-options="paginationOptions" v-model:column-visibility="columnVisibility">
      <template #expanded="{ row }">
        <div v-if="row.getIsGrouped()" class="flex flex-wrap items-baseline justify-between text-default">
          <h2 class="text-lg">
            Schiedsamt {{ data.schiedsamt.gemeinde.name }}
            &ndash;
            {{ labelSubdivision(row.original, 'schiedsamtsbezirk') }}
          </h2>
          <div>
            <ExternalLink :to='data.schiedsamt.gemeinde.url'>
              Gemeinde
              {{ data.schiedsamt.gemeinde.name }}
            </ExternalLink>
            &bullet;
            <ExternalLink :to='data.schiedsamt.amtsgericht.url'>
              Amtsgericht
              {{ data.schiedsamt.amtsgericht.name }}
            </ExternalLink>
          </div>
        </div>
      </template>
    </UTable>
  </div>
</template>

<script setup>
import { getGroupedRowModel } from '@tanstack/vue-table'
import { memo, getMemoOptions } from '@tanstack/vue-table'
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'

const query = ref('')
const table = useTemplateRef('table')
const breakpoints = useBreakpoints(breakpointsTailwind)

const NUMBER_OF_DIGITS = 3
const MAX_RESULTS = 100

// set _initial_ column visibility based on breakpoints
const columnVisibility = ref({
  stadtbezirk: breakpoints.isGreaterOrEqual('lg'),
  stadtteil: breakpoints.isGreaterOrEqual('lg'),
})

function toWordqueryString(str) {
  return str
    .normalize()
    .toLowerCase()
    .replaceAll('ä', 'a')
    .replaceAll('ü', 'u')
    .replaceAll('ö', 'o')
    .replaceAll('ß', 'ss')
    .replaceAll(/[^a-z]/g, '')
}

function toNumbersqueryString(str) {
  const digits = str.match(/^[0-9]*/)[0].length
  for (let i = 0; i < NUMBER_OF_DIGITS - digits; i++) {
    str = '0' + str
  }
  return str
}

const { data } = await useFetch('/data/hannover.json', {
  transform: (json) => {
    json.streetnumbers.forEach((streetnumber, index) => {
      streetnumber.id = index
      streetnumber.street.queryString = toWordqueryString(streetnumber.street.name)
    })
    return json
  }
})

const columns = [
  {
    id: 'street',
    header: 'Straße',
    accessorKey: 'street.name',
    enableHiding: false
  },
  {
    id: 'hausnummern',
    header: 'Hausnummern',
    accessorFn: labelNumbers,
    enableHiding: false
  },
  {
    id: 'postalCode',
    header: 'Postleitzahl',
    accessorKey: 'postalCode'
  },
  {
    id: 'schiedsamtsbezirk',
    header: 'Schiedsamtsbezirk',
    accessorFn: (row) => labelSubdivision(row, 'schiedsamtsbezirk'),
    enableHiding: false
  },
  {
    id: 'stadtbezirk',
    header: 'Stadtbezirk',
    accessorFn: (row) => labelSubdivision(row, 'stadtbezirk')
  },
  {
    id: 'stadtteil',
    header: 'Stadtteil',
    accessorFn: (row) => labelSubdivision(row, 'stadtteil')
  }
]

const filtered = computed(() => {
  const parts = query.value.trim().split(' ')
  const words = parts.filter(part => part.match(/^[^0-9]/)).map(toWordqueryString)
  const numbers = parts.filter(part => part.match(/^[0-9]{1,3}[a-z]*$/i)).map(toNumbersqueryString)
  const postalCodes = parts.filter(part => part.match(/^[0-9]{5}$/))

  console.debug("query", query.value, { parts, words, numbers, postalCodes })

  if ((words.length == 0 && postalCodes.length == 0) ||
    numbers.length > 1 ||
    postalCodes.length > 1 ||
    words.length + numbers.length + postalCodes.length < parts.length) {
    return []
  }
  const number = numbers[0]
  const even = Number.parseInt(number) % 2 == 0
  const postalCode = postalCodes[0]

  return data.value.streetnumbers.filter((row) => {
    let streetName = row.street.queryString
    for (const word of words) {
      const position = streetName.indexOf(word)
      if (position < 0) {
        return false
      }
      streetName = streetName.substring(position + word.length)
    }
    if (number) {
      if (row.numbers.from.localeCompare(number) > 0 || row.numbers.to.localeCompare(number) < 0) {
        return false
      }
      if ((even && !row.numbers.even) || (!even && !row.numbers.odd)) {
        return false
      }
    }
    if (postalCode) {
      if (row.postalCode !== postalCode) {
        return false
      }
    }
    return true
  })
})

const grouping = ref(['schiedsamtsbezirk'])

const groupingOptions = ref({
  groupedColumnMode: 'remove',
  getGroupedRowModel: getGroupedRowModel()
})

const ui = ref({
  tr: 'bg-elevated/70',
  th: 'text-muted',
  td: 'empty:p-0' // hides expanded row if empty
})

const meta = ref({
  class: {
    tr: (row) => row.getIsGrouped() ? null : 'bg-elevated/50'
  }
})


const tooManyResults = ref(null)
/**
 * Do not show results at all if there are too many.
 *
 * <p>Hack: PaginationRowModel is one of the rowModel in UTable that has to be given explicitly.
 * We use this to create a custom PaginationRowModel to return empty rows if there are too many rows.
 */
const paginationOptions = {
  getPaginationRowModel(table) {
    return memo(
      () => [table.getPrePaginationRowModel()],
      (rowModel) => {
        const rowCount = rowModel.rows.length
        if (rowCount > MAX_RESULTS) {
          tooManyResults.value = rowCount
          return {
            rows: [],
            flatRows: [],
            rowsById: {}
          }
        }
        tooManyResults.value = null
        return rowModel
      },
      getMemoOptions(table.options, 'debugTable', 'getPaginationRowModel')
    )
  }
}

const emptyLabel = computed(() => tooManyResults.value 
  ? 'Zu viele Ergebnisse (' + tooManyResults.value + ')' 
  : 'Keine Ergebnisse')

function trimLeadingZeros(str) {
  return str.replaceAll(/^0+/g, '') || '0'
}

function labelNumbers(row) {
  const { from, to, even, odd } = row.numbers

  const evenOddLabel = (even && !odd) ? 'gerade' : (!even && odd) ? 'ungerade' : null

  if ((from === '000' || from === '001') && to === '999') {
    return evenOddLabel ?? 'alle'
  }

  let label = trimLeadingZeros(from)

  if (from !== to) {
    label += ' bis '
    label += to === '999' ? 'Ende' : trimLeadingZeros(to)
    if (evenOddLabel) {
      label += ' (' + evenOddLabel + ')'
    }
  }

  return label
}

function labelSubdivision(row, subdivisionType) {
  const id = row.subdivision[subdivisionType]
  if (!id) {
    return ''
  }
  const name = data.value.subdivisions[subdivisionType][id]
  if (!name) {
    return id
  }
  return name + ' (' + id + ')'
}
</script>
