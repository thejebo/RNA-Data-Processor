// Custom utilities
const RNA = require('../../src/utils/RNA')
const FSHandler = require('../../src/utils/FSHandler')
// Helper
const { createArrayOfObjects } = require('../../src/helpers/Array')

async function run () {
  // Directory to use for file reading and writing.
  const baseDir = './examples/form-str-groups-1'
  // Input path of the data.
  const inputPath = `${baseDir}/input.csv`

  const familyKeyLength = 4 // A group is formed only if they have a matching substring of length keyLength.
  const familyMemberThreshold = 5 // The group must have at least this many members, to be included in the final result.
  let aptamerArray = await FSHandler.readFile(inputPath)
  console.log(`Read ${aptamerArray.length} rows from ${inputPath}.`)
  const strings = aptamerArray.map(a => a.String)

  // Form groups with matching substrings.
  let familyObjects = RNA.findMatchingSubstrings(strings, familyKeyLength)
  /**
   * The output will look something like this:
   * {
   *  YZZZ: [
   *   'AAA2XYZZZZ',
   *   'EEE1XYZZZZ',
   *   'DDD4XYZZZZ'
   *  ],
   *  ZZZZ: [
   *   'AAA2XYZZZZ',
   *   'EEE1XYZZZZ',
   *   'DDD4XYZZZZ'
   *  ],
   *  CCC: [
   *   'CCCCCCCCCC'
   *   'CCCCCCCCCB'
   *  ]
   * }
   *
   * The keys are the substrings that the group's members have in common and the Strings are now missing the sample values.
   */


  // Filter out groups that don't have enough members in them.
  const result = RNA.excludeFamilyBasedOnMemberCount(familyObjects, familyMemberThreshold)
  console.log(`Out of the ${aptamerArray.length} rows, formed ${Object.keys(result.families).length} different groups.`)
  // The next function flattens the object into a one dimensional array, where each element is an array containing the String and the group.
  /**
   * AAA2XYZZZZ, YZZZ
   * EEE1XYZZZZ, YZZZ
   * ...
   * CCCCCCCCCC, CCC
   * CCCCCCCCCB, CCC
   */
  // The flattening is done so that we can easily export the data to a CSV and Excel file.
  let arr = RNA.flattenFamilyObjectsToAptamerArray(result.families)
  // Reassociate Sample values with the Strings, since they were dropped while forming Groups.
  arr = RNA.addSamplesToAptamerArray(arr, aptamerArray, 'String')

  // Reconstruction of the original dataset with the added 'Group' value.
  let headers = ['String', 'Group' ].concat(Object.keys(aptamerArray[0]).filter(a => a !== 'String'))
  const finalDataset = createArrayOfObjects(headers, arr)

  let fileHeaders = {}
  headers.map(a => {
    fileHeaders[a] = a
  })

  // Save the result to CSV and Excel files.
  let filename = 'output'
  // Excel
  let handler = new FSHandler('excel', filename, baseDir)
  handler.buildFromArray(fileHeaders, finalDataset)
  await handler.save().then((result) => {
    console.log(`Saved the result to ${result.filePath}`)
  })

  // CSV
  handler = new FSHandler('csv', filename, baseDir)
  handler.buildFromArray(fileHeaders, finalDataset)
  await handler.save().then((result) => {
    console.log(`Saved the result to ${result.filePath}`)
  })
}

run()
