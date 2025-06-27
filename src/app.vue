<template>
  <div>
    <input v-model="search" />
  </div>
  <div>
    {{ filtered.length }} / {{ data.streetnumbers.length }}
    <table v-if="0 < filtered.length && filtered.length < 100">
      <thead>
        <tr>
          <th>Straßenname</th>
          <th>Hausnummern</th>
          <th>Postleitzahl</th>
          <th>Stadtbezirk</th>
          <th>Stadtteil</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="entry in filtered" :key="entry.id">
          <td>{{ entry.street.name }}</td>
          <td>{{ numbersLabel(entry.numbers) }}</td>
          <td>{{ entry.postalCode }}</td>
          <td>{{ entry.subdivision.stadtbezirk }}</td>
          <td>{{ entry.subdivision.stadtteil }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
const search = ref('')

const NUMBER_OF_DIGITS = 3

function toWordSearchString(str) {
  return str
    .normalize()
    .toLowerCase()
    .replaceAll('ä', 'a')
    .replaceAll('ü', 'u')
    .replaceAll('ö', 'o')
    .replaceAll('ß', 'ss')
    .replaceAll(/[^a-z]/g, '')
}

function toNumbersSearchString(str) {
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
      streetnumber.street.searchString = toWordSearchString(streetnumber.street.name)
    })
    return json
  }
})

const filtered = computed(() => {
  const parts = search.value.trim().split(' ')
  const words = parts.filter(part => part.match(/^[^0-9]/)).map(toWordSearchString)
  const numbers = parts.filter(part => part.match(/^[0-9]{1,3}[a-z]*$/i)).map(toNumbersSearchString)
  const postalCodes = parts.filter(part => part.match(/^[0-9]{5}$/))

  console.debug("search", search.value, { parts, words, numbers, postalCodes })

  if (words.length == 0 ||
    numbers.length > 1 ||
    postalCodes.length > 1 ||
    words.length + numbers.length + postalCodes.length < parts.length) {
    return []
  }
  const number = numbers[0]
  const even = Number.parseInt(number) % 2 == 0
  const postalCode = postalCodes[0]

  return data.value.streetnumbers.filter((entry) => {
    let streetName = entry.street.searchString
    for (const word of words) {
      const position = streetName.indexOf(word)
      if (position < 0) {
        return false
      }
      streetName = streetName.substring(position + word.length)
    }
    if (number) {
      if (entry.numbers.from.localeCompare(number) > 0 || entry.numbers.to.localeCompare(number) < 0) {
        return false
      }
      if ((even && !entry.numbers.even) || (!even && !entry.numbers.odd)) {
        return false
      }
    }
    if (postalCode) {
      if (entry.postalCode !== postalCode) {
        return false
      }
    }
    return true
  })
})

function trimLeadingZeros(str) {
  return str.replaceAll(/^0+/g, '') || '0'
}

function numbersLabel(numbers) {
  const { from, to, even, odd } = numbers

  const evenOddLabel = (even && !odd) ? 'gerade' : (!even && odd) ? 'ungerade' : null

  if (from === '000' && to === '999') {
    return evenOddLabel ?? 'alle'
  }

  let label = trimLeadingZeros(numbers.from)

  if (from !== to) {
    label += ' bis '
    label += numbers.to === '999' ? 'Ende' : trimLeadingZeros(numbers.to)
    if (evenOddLabel) {
      label += ' (' + evenOddLabel + ')'
    }
  }

  return label
}
</script>

<style scoped>
th {
  text-align: left;
}
</style>
