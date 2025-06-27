import exceljs from 'exceljs'
import assert from 'node:assert'
import fs from 'node:fs'

const inputFilename = 'download/hannover.xlsx'
const outputFilename = 'src/public/data/hannover.json'

// Helpers

function isNumber(value) {
  return value !== null &&
    value !== undefined &&
    !Number.isNaN(Number(value))
}

function padLeftWithZeros(str, number) {
  while (str.length < number) {
    str = '0' + str
  }
  return str
}

//
// Loading
//
console.log('load', inputFilename)
const workbook = new exceljs.Workbook()
await workbook.xlsx.readFile(inputFilename)
const worksheet = workbook.getWorksheet(1)

//
// Parsing
//

console.log('parse file')
const numbersRegex = {
  from: /^(\d+)([A-Z]?)( *- *)?$/,
  to: /^(\d+|Ende)([A-Z]?) *([gu])?\.?$/
}

function getNormalizedNumber(match) {
  return padLeftWithZeros(match[1], 3) + match[2]
}

const streetnumbers = []
worksheet.eachRow((row, rowNumber) => {
  if (!isNumber(row.getCell(1).value)) {
    return
  }
  const [_, sb, stat, strnr, strassenname, stadt, von, bis, pz, nb, f, st, vb, sr, ma, po] = row.values

  const fromMatch = numbersRegex.from.exec('' + von)
  const toMatch = numbersRegex.to.exec('' + bis)

  assert(fromMatch && toMatch, 'cannot convert von/bis in row: ' + JSON.stringify({ rowNumber, von, bis, fromMatch, toMatch }))

  streetnumbers.push({
    street: {
      id: strnr,
      name: strassenname,
    },
    numbers: {
      from: getNormalizedNumber(fromMatch),
      to: toMatch[1] === 'Ende' ? '999' : getNormalizedNumber(toMatch),
      even: toMatch[3] !== 'u',
      odd: toMatch[3] !== 'g'
    },
    subdivision: {
      stadtbezirk: Number(sb),
      stadtteil: stadt,
    },
    postalCode: pz
  })
})

//
// Tests
//

console.log('run tests')
function getStreetById(id) {
  return streetnumbers.filter(street => street.street.id === id)
}

assert.equal(streetnumbers.length, 4531, 'unexpected number of streetnumbers')

const ackerweg = getStreetById('00007')
assert.deepEqual([{
  street: {
    id: '00007',
    name: 'Ackerweg'
  },
  numbers: {
    from: '000', to: '999',
    even: true, odd: true
  },
  subdivision: {
    stadtbezirk: 3,
    stadtteil: 'ISE'
  },
  postalCode: '30657'
}], ackerweg)

const forstkamp = getStreetById('00093')
assert.equal(forstkamp.length, 3)
assert.equal(forstkamp[0].street.name, 'Am Forstkamp')
const forstkampNumbers = forstkamp.map(entry => entry.numbers).toSorted((a, b) => a.from.localeCompare(b.from))
assert.deepEqual([
  { from: '000', to: '999', odd: false, even: true },
  { from: '001', to: '017', odd: true, even: false },
  { from: '019', to: '999', odd: true, even: false }
], forstkampNumbers)

// 
// Output
//

console.log('save', outputFilename)
const data = {
  source: {
    name: 'Straßenverzeichnis der Landeshauptstadt Hannover',
    website: 'https://www.hannover.de/Leben-in-der-Region-Hannover/Verwaltungen-Kommunen/Die-Verwaltung-der-Landeshauptstadt-Hannover/Dezernate-und-Fachbereiche-der-LHH/Stadtentwicklung-und-Bauen/Fachbereich-Planen-und-Stadtentwicklung/Geoinformation/Open-GeoData/Stra%C3%9Fenverzeichnis',
    download: 'https://www.hannover.de/content/download/889451/file/Stra%C3%9Fenverzeichnis.zip',
    changed: '2024-12-03'
  },
  license: {
    url: 'https://creativecommons.org/licenses/by/4.0/deed.de',
    name: 'Creative Commons Namensnennung 4.0 DE',
    holder: 'Landeshauptstadt Hannover, FB Planen und Stadtentwicklung, Bereich Geoinformation'
  },
  streetnumbers
}

fs.writeFileSync(outputFilename, JSON.stringify(data, null, 2))
