<template>
  <div>
    <div class="mb-2">
      <UInput class="w-full" v-model="query" placeholder="Nach Adresse suchen..." />
    </div>
    <template v-if="query.trim().length == 0"></template>
    <template v-else-if="filtered.length == 0">
      Keine Ergebnisse
    </template>
    <template v-else-if="filtered.length > MAX_RESULTS">
      Zu viele Ergebnisse ({{ filtered.length }})
    </template>
    <UTable v-else :data="filtered" :columns="columns" :grouping="grouping" :grouping-options="groupingOptions" :expanded="true" :ui="ui" :meta="meta">
      <template #expanded="{ row }">
        <div v-if="row.getIsGrouped()" class="flex items-baseline justify-between text-default">
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

const query = ref('')

const NUMBER_OF_DIGITS = 3
const MAX_RESULTS = 100

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
    accessorKey: 'street.name'
  },
  {
    id: 'hausnummern',
    header: 'Hausnummern',
    accessorFn: labelNumbers
  },
  {
    id: 'postalCode',
    header: 'Postleitzahl',
    accessorKey: 'postalCode'
  },
  {
    id: 'schiedsamtsbezirk',
    header: 'Schiedsamtsbezirk',
    accessorFn: (row) => labelSubdivision(row, 'schiedsamtsbezirk')
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

const grouping = ref([ 'schiedsamtsbezirk' ])

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
