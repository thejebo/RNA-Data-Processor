const _ = require('lodash')
const RNA = require('./src/utils/RNA.js')
const CSVHandler = require('./src/utils/filesystem/handlers/Csv.js')
const ExcelHandler = require('./src/utils/filesystem/handlers/Excel.js')

/**
 * Gets the most enriched aptamers from the dataset.
 *
 * @param {Number} numOfAptamersToInclude
 */
async function createSampleFileFromMostEnrichedAptamers (numOfAptamersToInclude = 50) {
  const sourceDataPath = './inputs/origin/example-real.csv'
  const data = await CSVHandler.readFile(sourceDataPath)
  const dataProperties = Object.keys(data[0])
  // Get only 36 nucleotide long aptamers
  const refactored = RNA.getXNucliodeLengthAptamers(36, data, 'Aptamer')
  // Include only X most enriched aptamers
  const destinationPath = './outputs/most-enriched/'
  const destinationFilename = `${numOfAptamersToInclude}-TopS12_1-6+SubS10_1-6-ordered-most-enriched-aptamers`
  // Get only samples with following pattern.
  let samplePatterns = ['_TopS12']
  let samplesToCompare = []
  for (let i in samplePatterns) {
    samplesToCompare = samplesToCompare.concat(dataProperties.filter((property) => property.includes(samplePatterns[i])))
  }

  samplesToCompare = [
    '1_TopS12_N252-688_S19_L001_merged_cleaned',
    '2_TopS12_N252-689_S20_L001_merged_cleaned',
    '3_TopS12_N252-690_S21_L001_merged_cleaned',
    '4_TopS12_N252-691_S22_L001_merged_cleaned',
    '5_TopS12_N252-692_S23_L001_merged_cleaned',
    '6_TopS12_N252-693_S24_L001_merged_cleaned',

    '1_SubS10_N252-717_S48_L001_merged_cleaned',
    '2_SubS10_N252-718_S49_L001_merged_cleaned  ',
    '3_SubS10_N252-719_S50_L001_merged_cleaned',
    '4_SubS10_N252-720_S51_L001_merged_cleaned',
    '5_SubS10_N252-721_S52_L001_merged_cleaned',
    '6_SubS10_N252-722_S53_L001_merged_cleaned',
  ]

  // Get rows based on the extracted headers
  let propertiesToExtract = ['Aptamer', ...samplesToCompare]
  const extracted = RNA.extractPropertiesFromObjects(refactored, propertiesToExtract)
  const sorted = RNA.getMostEnrichedAptamersAmongstSamples(extracted, samplesToCompare, numOfAptamersToInclude)
  // const handler = new ExcelHandler(destinationPath + destinationFilename, '.')
  const handler = new CSVHandler(destinationPath + destinationFilename, '.')

  let headers = {}
  propertiesToExtract.forEach((k, i) => { headers[k] = propertiesToExtract[i] })
  handler.buildFromArray(headers, sorted)
  await handler.save().then(() => {
    console.log('Created', `${destinationPath}${destinationFilename}`)
  })
}

// createSampleFileFromMostEnrichedAptamers(200)

/**
 * Creates a file that contains the aptamers that are not found from the other datasets.
 *
 * @param {String} compareableDatasetPath Path to a file, that contains aptamers that we want to check, if they are not found from the other datasets.
 * @param {Number} threshold
 */
async function createFileFromSubSNotIncludedInXMostEnrichedTops (compareableDatasetPath, threshold = 50) {
  const dataSets = []
  // The we read in the datasets that we want to check against.
  const sequencesByTissueAndCycleForTheGeneCellNanoPosterPath = './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada'
  // Form dataset objects from reading the dataset files, assigning the dataset with an ID and including the aptamers.
  for (var i = 1; i <= 6; i++) {
    const dataSequenceContents = await CSVHandler.readFile(`${sequencesByTissueAndCycleForTheGeneCellNanoPosterPath}/${i}-dataset.csv`)
    const refactored = RNA.getXNucliodeLengthAptamers(36, dataSequenceContents, 'Aptamer')
    dataSets.push ({
      index: `${i}_TopS-first-${threshold}`,
      aptamers: refactored.map((row) => row.Aptamer).slice(0, threshold),
      subsNotFound: []
    })
  }

  // Read the compareable dataset.
  const compareableDataset = await CSVHandler.readFile(compareableDatasetPath)
  // Get the aptamer values from that dataset.
  const compareableAptamers = compareableDataset.map((row) => row.Aptamer)
  for (let dataSet in dataSets) {
    for (let i in compareableAptamers) {
      if (!dataSets[dataSet].aptamers.includes(compareableAptamers[i])) {
        dataSets[dataSet].subsNotFound.push(compareableAptamers[i])
      }
    }
  }

  const outputRootPath = './outputs/unique-sequences'
  for (const i in dataSets) {
    const handler = new ExcelHandler(`${outputRootPath}/${compareableAptamers.length}-most-enriched-SubS10-not-found-from-${dataSets[i].index}`, '.')
    let notFounds = dataSets[i].subsNotFound.map((aptamer) => { return {Aptamer: aptamer} })
    // notFounds = notFounds.sort((a, b) => a.Aptamer.localeCompare(b.Aptamer))
    handler.buildFromArray({'Aptamer': 'Aptamer'}, notFounds)
    await handler.save()
  }
}

/**
 *
 * @param {*} compareableDatasetPath
 * @param {*} threshold
 */
async function createFileFromTopSNotIncludedInXMostEnrichedSubS (compareableDatasetPath, threshold = 50) {
  const dataSets = []
  // The we read in the datasets that we want to check against.
  const sequencesByTissueAndCycleForTheGeneCellNanoPosterPath = './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada'
  for (var i = 1; i <= 6; i++) {
    const dataSequenceContents = await CSVHandler.readFile(`${sequencesByTissueAndCycleForTheGeneCellNanoPosterPath}/${i}-dataset.csv`)
    const refactored = RNA.getXNucliodeLengthAptamers(36, dataSequenceContents, 'Aptamer')
    dataSets.push ({
      index: `${i}_SubS-first-${threshold}`,
      aptamers: refactored.map((row) => row.Aptamer).slice(0, threshold),
      topsNotFound: []
    })
  }

  const dataSequenceContents = await CSVHandler.readFile(compareableDatasetPath)
  const top50TopS12Aptamers = dataSequenceContents.map((row) => row.Aptamer)
  for (var dataSet in dataSets) {
    for (var i in top50TopS12Aptamers) {
      if (!dataSets[dataSet].aptamers.includes(top50TopS12Aptamers[i])) {
        dataSets[dataSet].topsNotFound.push(top50TopS12Aptamers[i])
      } else {
        console.log('found ' + top50TopS12Aptamers[i] + ' in ' + dataSets[dataSet].index)
      }
    }
    console.log('\n\n')
  }

  const outputRootPath = './outputs/unique-sequences'
  for (let i in dataSets) {
    const handler = new ExcelHandler(`${outputRootPath}/${top50TopS12Aptamers.length}-most-enriched-TopS12-not-found-from-${dataSets[i].index}`, '.')
    let notFounds = dataSets[i].topsNotFound.map((aptamer) => { return {Aptamer: aptamer} })
    // notFounds = notFounds.sort((a, b) => a.Aptamer.localeCompare(b.Aptamer))
    handler.buildFromArray({'Aptamer': 'Aptamer'}, notFounds)
    await handler.save()
  }
}


async function extractFamiliesWithAptamersAndEnricmentLevelsToExcel () {
  const familyLength = null // 7
  const excludeFamilySize = null // 40
  const includeEnrichmentLevelMoreThan = null // 100
  const mustHaveSubstring = 'CAATGCCC' // 'GTTGCC', 'GTTGCCC', 'CAATGCCC'

  // Input path of the "real" data.
  const inputPath = './example-real.csv'
  // Generate file name from the parameters to avoid overwriting.
  // const fileName = `family-length_${familyLength}-size_${excludeFamilySize}-enrichment_${includeEnrichmentLevelMoreThan}`
  const fileName = `family-${mustHaveSubstring}`
  // Output path of the families without enrichment data.
  const outputPath = `./outputs/extracted-families/${fileName}.json`
  // Create a JSON-file containing extracted families and their aptamers
  // NOTICE: The enrichment data is not yet in the resulting file.
  await RNA.createAndSaveFamiliesToJSON(inputPath, outputPath, familyLength, includeEnrichmentLevelMoreThan, excludeFamilySize, mustHaveSubstring)
  // Create a JSON-file containing extracted families and their aptamers WITH the enrichment data.
  const famSampleOutputPath = `./outputs/extracted-families/processed/${fileName}-with-enrichments.json`
  await RNA.addSampleEnrichmentLevelsToAptamersInFamilyJSON(inputPath, outputPath, famSampleOutputPath)
  // Read the source data in to extract sample names.
  let data = await CSVHandler.readFile(inputPath)
  let sampleNames = Object.keys(data[0]).filter(a => a !== 'Aptamer')
  // Create the final product, which is an excel version of the JSON-file
  // containing extracted families and their aptamers WITH the enrichment data.
  await RNA.createExcelsFromFamilyJSON(famSampleOutputPath, './outputs/extracted-families/processed', fileName, sampleNames)
}

// const datasetInputs = [
//   {
//     datasetToComparePath: './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/1-dataset.csv',
//     datasetsToCompareToPaths: [
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/2-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/3-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/4-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/5-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/6-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/7-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/8-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/9-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/10-dataset.csv',

//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/1-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/2-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/3-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/4-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/5-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/6-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/7-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/8-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/9-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/10-dataset.csv',
//     ],
//     outputDir: 'outputs/consistent-enrichment-levels/topical/unique-accross-multiple-datasets',
//     outputFilename: 'topical-1-unique-to-all-top-datasets-incl-subj7-10-consistent-enrichment-levels-above-10',
//     outputType: 'excel'
//   },
//   {
//     datasetToComparePath: './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/2-dataset.csv',
//     datasetsToCompareToPaths: [
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/1-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/3-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/4-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/5-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/6-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/7-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/8-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/9-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/10-dataset.csv',

//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/1-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/2-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/3-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/4-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/5-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/6-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/7-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/8-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/9-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/10-dataset.csv',
//     ],
//     outputDir: 'outputs/consistent-enrichment-levels/topical/unique-accross-multiple-datasets',
//     outputFilename: 'topical-2--unique-to-all-top-datasets-incl-subj7-10-consistent-enrichment-levels-above-10',
//     outputType: 'excel'
//   },
//   {
//     datasetToComparePath: './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/3-dataset.csv',
//     datasetsToCompareToPaths: [
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/1-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/2-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/4-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/5-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/6-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/7-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/8-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/9-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/10-dataset.csv',

//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/1-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/2-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/3-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/4-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/5-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/6-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/7-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/8-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/9-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/10-dataset.csv',
//     ],
//     outputDir: 'outputs/consistent-enrichment-levels/topical/unique-accross-multiple-datasets',
//     outputFilename: 'topical-3-unique-to-all-top-datasets-incl-subj7-10-consistent-enrichment-levels-above-10',
//     outputType: 'excel'
//   },
//   {
//     datasetToComparePath: './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/4-dataset.csv',
//     datasetsToCompareToPaths: [
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/1-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/2-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/3-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/5-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/6-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/7-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/8-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/9-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/10-dataset.csv',

//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/1-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/2-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/3-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/4-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/5-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/6-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/7-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/8-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/9-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/10-dataset.csv',
//     ],
//     outputDir: 'outputs/consistent-enrichment-levels/topical/unique-accross-multiple-datasets',
//     outputFilename: 'topical-4-unique-to-all-top-datasets-incl-subj7-10-consistent-enrichment-levels-above-10',
//     outputType: 'excel'
//   },
//   {
//     datasetToComparePath: './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/5-dataset.csv',
//     datasetsToCompareToPaths: [
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/1-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/2-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/3-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/4-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/6-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/7-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/8-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/9-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/10-dataset.csv',

//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/1-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/2-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/3-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/4-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/5-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/6-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/7-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/8-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/9-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/10-dataset.csv',
//     ],
//     outputDir: 'outputs/consistent-enrichment-levels/topical/unique-accross-multiple-datasets',
//     outputFilename: 'topical-5-unique-to-all-top-datasets-incl-subj7-10-consistent-enrichment-levels-above-10',
//     outputType: 'excel'
//   },
//   {
//     datasetToComparePath: './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/6-dataset.csv',
//     datasetsToCompareToPaths: [
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/1-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/2-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/3-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/4-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/5-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/7-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/8-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/9-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/10-dataset.csv',

//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/1-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/2-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/3-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/4-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/5-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/6-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/7-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/8-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/9-dataset.csv',
//       './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/10-dataset.csv',
//     ],
//     outputDir: 'outputs/consistent-enrichment-levels/topical/unique-accross-multiple-datasets',
//     outputFilename: 'topical-6-unique-to-all-top-datasets-incl-subj7-10-consistent-enrichment-levels-above-10',
//     outputType: 'excel'
//   }
// ]

const datasetInputsSubs = [
  {
    datasetToComparePath: './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/1-dataset.csv',
    datasetsToCompareToPaths: [
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/1-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/2-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/3-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/4-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/5-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/6-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/7-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/8-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/9-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/10-dataset.csv',

      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/2-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/3-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/4-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/5-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/6-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/7-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/8-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/9-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/10-dataset.csv',
    ],
    outputDir: 'outputs/consistent-enrichment-levels/subconj/unique-accross-multiple-datasets',
    outputFilename: 'subconj-1-unique-to-all-sub-datasets-incl-top7-10-consistent-enrichment-levels-above-10',
    outputType: 'excel'
  },
  {
    datasetToComparePath: './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/2-dataset.csv',
    datasetsToCompareToPaths: [
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/1-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/2-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/3-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/4-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/5-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/6-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/7-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/8-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/9-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/10-dataset.csv',

      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/1-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/3-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/4-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/5-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/6-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/7-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/8-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/9-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/10-dataset.csv',
    ],
    outputDir: 'outputs/consistent-enrichment-levels/subconj/unique-accross-multiple-datasets',
    outputFilename: 'subconj-2-unique-to-all-sub-datasets-incl-top7-10-consistent-enrichment-levels-above-10',
    outputType: 'excel'
  },
  {
    datasetToComparePath: './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/3-dataset.csv',
    datasetsToCompareToPaths: [
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/1-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/2-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/3-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/4-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/5-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/6-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/7-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/8-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/9-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/10-dataset.csv',

      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/1-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/2-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/4-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/5-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/6-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/7-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/8-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/9-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/10-dataset.csv',
    ],
    outputDir: 'outputs/consistent-enrichment-levels/subconj/unique-accross-multiple-datasets',
    outputFilename: 'subconj-3-unique-to-all-sub-datasets-incl-top7-10-consistent-enrichment-levels-above-10',
    outputType: 'excel'
  },
  {
    datasetToComparePath: './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/4-dataset.csv',
    datasetsToCompareToPaths: [
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/1-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/2-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/3-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/4-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/5-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/6-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/7-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/8-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/9-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/10-dataset.csv',

      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/1-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/2-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/3-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/5-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/6-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/7-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/8-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/9-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/10-dataset.csv',
    ],
    outputDir: 'outputs/consistent-enrichment-levels/subconj/unique-accross-multiple-datasets',
    outputFilename: 'subconj-4-unique-to-all-sub-datasets-incl-top7-10-consistent-enrichment-levels-above-10',
    outputType: 'excel'
  },
  {
    datasetToComparePath: './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/5-dataset.csv',
    datasetsToCompareToPaths: [
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/1-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/2-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/3-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/4-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/5-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/6-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/7-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/8-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/9-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/10-dataset.csv',

      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/1-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/2-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/3-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/4-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/6-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/7-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/8-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/9-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/10-dataset.csv',
    ],
    outputDir: 'outputs/consistent-enrichment-levels/subconj/unique-accross-multiple-datasets',
    outputFilename: 'subconj-5-unique-to-all-sub-datasets-incl-top7-10-consistent-enrichment-levels-above-10',
    outputType: 'excel'
  },
  {
    datasetToComparePath: './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/6-dataset.csv',
    datasetsToCompareToPaths: [
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/1-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/2-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/3-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/4-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/5-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/6-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/7-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/8-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/9-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/10-dataset.csv',

      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/1-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/2-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/3-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/4-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/5-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/7-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/8-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/9-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/10-dataset.csv',
    ],
    outputDir: 'outputs/consistent-enrichment-levels/subconj/unique-accross-multiple-datasets',
    outputFilename: 'subconj-6-unique-to-all-sub-datasets-incl-top7-10-consistent-enrichment-levels-above-10',
    outputType: 'excel'
  }
]

const datasetInputsMiscTops = [
  {
    datasetToComparePath: './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/7-dataset.csv',
    datasetsToCompareToPaths: [
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/1-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/2-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/3-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/4-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/5-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/6-dataset.csv',
    ],
    outputDir: 'outputs/checking/consistent-enrichment-levels/topical/unique-accross-multiple-datasets',
    outputFilename: 'topical-7-unique-to-datasetsTop1_6Sub1_6-consistent-enrichment-levels-above-10',
    outputType: 'excel'
  },
  {
    datasetToComparePath: './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/8-dataset.csv',
    datasetsToCompareToPaths: [
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/1-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/2-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/3-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/4-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/5-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/6-dataset.csv',

      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/1-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/2-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/3-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/4-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/5-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/6-dataset.csv',
    ],
    outputDir: 'outputs/checking/consistent-enrichment-levels/topical/unique-accross-multiple-datasets',
    outputFilename: 'topical-8-unique-to-datasetsTop1_6Sub1_6-consistent-enrichment-levels-above-10',
    outputType: 'excel'
  },
  {
    datasetToComparePath: './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/9-dataset.csv',
    datasetsToCompareToPaths: [
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/1-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/2-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/3-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/4-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/5-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/6-dataset.csv',

      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/1-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/2-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/3-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/4-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/5-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/6-dataset.csv',
    ],
    outputDir: 'outputs/checking/consistent-enrichment-levels/topical/unique-accross-multiple-datasets',
    outputFilename: 'topical-9-unique-to-datasetsTop1_6Sub1_6-consistent-enrichment-levels-above-10',
    outputType: 'excel'
  },
  {
    datasetToComparePath: './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/10-dataset.csv',
    datasetsToCompareToPaths: [
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/1-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/2-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/3-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/4-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/5-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/6-dataset.csv',

      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/1-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/2-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/3-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/4-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/5-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/6-dataset.csv',
    ],
    outputDir: 'outputs/checking/consistent-enrichment-levels/topical/unique-accross-multiple-datasets',
    outputFilename: 'topical-10-unique-to-datasetsTop1_6Sub1_6-consistent-enrichment-levels-above-10',
    outputType: 'excel'
  }
]

const datasetInputsMiscSubs = [
  {
    datasetToComparePath: './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/7-dataset.csv',
    datasetsToCompareToPaths: [
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/1-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/2-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/3-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/4-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/5-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/6-dataset.csv',

      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/1-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/2-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/3-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/4-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/5-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/6-dataset.csv',
    ],
    outputDir: 'outputs/consistent-enrichment-levels/subconj/unique-accross-multiple-datasets',
    outputFilename: 'subconj-7-unique-to-datasetsTop1_6Sub1_6-ex-subj7-consistent-enrichment-levels-above-10',
    outputType: 'excel'
  },
  {
    datasetToComparePath: './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/8-dataset.csv',
    datasetsToCompareToPaths: [
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/1-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/2-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/3-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/4-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/5-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/6-dataset.csv',

      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/1-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/2-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/3-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/4-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/5-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/6-dataset.csv',
    ],
    outputDir: 'outputs/consistent-enrichment-levels/subconj/unique-accross-multiple-datasets',
    outputFilename: 'subconj-8-unique-to-datasetsTop1_6Sub1_6-ex-subj8-consistent-enrichment-levels-above-10',
    outputType: 'excel'
  },
  {
    datasetToComparePath: './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/9-dataset.csv',
    datasetsToCompareToPaths: [
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/1-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/2-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/3-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/4-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/5-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/6-dataset.csv',

      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/1-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/2-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/3-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/4-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/5-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/6-dataset.csv',
    ],
    outputDir: 'outputs/consistent-enrichment-levels/subconj/unique-accross-multiple-datasets',
    outputFilename: 'subconj-9-unique-to-datasetsTop1_6Sub1_6-ex-subj7-consistent-enrichment-levels-above-10',
    outputType: 'excel'
  },
  {
    datasetToComparePath: './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/10-dataset.csv',
    datasetsToCompareToPaths: [
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/1-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/2-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/3-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/4-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/5-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_topical_umada/6-dataset.csv',

      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/1-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/2-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/3-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/4-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/5-dataset.csv',
      './inputs/sequence-by-tissue-and-cycle-for-the-gene-cell-nano-poster/by_cycle_number_subconj_umada/6-dataset.csv',
    ],
    outputDir: 'outputs/consistent-enrichment-levels/subconj/unique-accross-multiple-datasets',
    outputFilename: 'subconj-10-unique-to-datasetsTop1_6Sub1_6-ex-subj7-consistent-enrichment-levels-above-10',
    outputType: 'excel'
  }
]

const datasetInputsIv = [
  {
    datasetToComparePath: './inputs/iv-datasets/1-dataset.csv',
    datasetsToCompareToPaths: [
      // './inputs/iv-datasets/1-dataset.csv',
      './inputs/iv-datasets/2-dataset.csv',
      './inputs/iv-datasets/3-dataset.csv',
      './inputs/iv-datasets/4-dataset.csv',
      './inputs/iv-datasets/5-dataset.csv',
      './inputs/iv-datasets/6-dataset.csv',
      './inputs/iv-datasets/7-dataset.csv',
      './inputs/iv-datasets/8-dataset.csv',
      './inputs/iv-datasets/9-dataset.csv',
      './inputs/iv-datasets/10-dataset.csv'
    ],
    outputDir: 'outputs/consistent-enrichment-levels/iv/unique-accross-multiple-datasets',
    outputFilename: '1-dataset-unique-to-datasets_2-10-consistent-enrichment-levels-above-10',
    outputType: 'excel'
  },
  {
    datasetToComparePath: './inputs/iv-datasets/2-dataset.csv',
    datasetsToCompareToPaths: [
      './inputs/iv-datasets/1-dataset.csv',
      // './inputs/iv-datasets/2-dataset.csv',
      './inputs/iv-datasets/3-dataset.csv',
      './inputs/iv-datasets/4-dataset.csv',
      './inputs/iv-datasets/5-dataset.csv',
      './inputs/iv-datasets/6-dataset.csv',
      './inputs/iv-datasets/7-dataset.csv',
      './inputs/iv-datasets/8-dataset.csv',
      './inputs/iv-datasets/9-dataset.csv',
      './inputs/iv-datasets/10-dataset.csv'
    ],
    outputDir: 'outputs/consistent-enrichment-levels/iv/unique-accross-multiple-datasets',
    outputFilename: '2-dataset-unique-to-datasets_1-10_excluding_2_dataset-consistent-enrichment-levels-above-10',
    outputType: 'excel'
  },
  {
    datasetToComparePath: './inputs/iv-datasets/3-dataset.csv',
    datasetsToCompareToPaths: [
      './inputs/iv-datasets/1-dataset.csv',
      './inputs/iv-datasets/2-dataset.csv',
      // './inputs/iv-datasets/3-dataset.csv',
      './inputs/iv-datasets/4-dataset.csv',
      './inputs/iv-datasets/5-dataset.csv',
      './inputs/iv-datasets/6-dataset.csv',
      './inputs/iv-datasets/7-dataset.csv',
      './inputs/iv-datasets/8-dataset.csv',
      './inputs/iv-datasets/9-dataset.csv',
      './inputs/iv-datasets/10-dataset.csv'
    ],
    outputDir: 'outputs/consistent-enrichment-levels/iv/unique-accross-multiple-datasets',
    outputFilename: '3-dataset-unique-to-datasets_1-10_excluding_3_dataset-consistent-enrichment-levels-above-10',
    outputType: 'excel'
  },
  {
    datasetToComparePath: './inputs/iv-datasets/4-dataset.csv',
    datasetsToCompareToPaths: [
      './inputs/iv-datasets/1-dataset.csv',
      './inputs/iv-datasets/2-dataset.csv',
      './inputs/iv-datasets/3-dataset.csv',
      // './inputs/iv-datasets/4-dataset.csv',
      './inputs/iv-datasets/5-dataset.csv',
      './inputs/iv-datasets/6-dataset.csv',
      './inputs/iv-datasets/7-dataset.csv',
      './inputs/iv-datasets/8-dataset.csv',
      './inputs/iv-datasets/9-dataset.csv',
      './inputs/iv-datasets/10-dataset.csv'
    ],
    outputDir: 'outputs/consistent-enrichment-levels/iv/unique-accross-multiple-datasets',
    outputFilename: '4-dataset-unique-to-datasets_1-10_excluding_4_dataset-consistent-enrichment-levels-above-10',
    outputType: 'excel'
  },
  {
    datasetToComparePath: './inputs/iv-datasets/5-dataset.csv',
    datasetsToCompareToPaths: [
      './inputs/iv-datasets/1-dataset.csv',
      './inputs/iv-datasets/2-dataset.csv',
      './inputs/iv-datasets/3-dataset.csv',
      './inputs/iv-datasets/4-dataset.csv',
      // './inputs/iv-datasets/5-dataset.csv',
      './inputs/iv-datasets/6-dataset.csv',
      './inputs/iv-datasets/7-dataset.csv',
      './inputs/iv-datasets/8-dataset.csv',
      './inputs/iv-datasets/9-dataset.csv',
      './inputs/iv-datasets/10-dataset.csv'
    ],
    outputDir: 'outputs/consistent-enrichment-levels/iv/unique-accross-multiple-datasets',
    outputFilename: '5-dataset-unique-to-datasets_1-10_excluding_5_dataset-consistent-enrichment-levels-above-10',
    outputType: 'excel'
  },
  {
    datasetToComparePath: './inputs/iv-datasets/6-dataset.csv',
    datasetsToCompareToPaths: [
      './inputs/iv-datasets/1-dataset.csv',
      './inputs/iv-datasets/2-dataset.csv',
      './inputs/iv-datasets/3-dataset.csv',
      './inputs/iv-datasets/4-dataset.csv',
      './inputs/iv-datasets/5-dataset.csv',
      // './inputs/iv-datasets/6-dataset.csv',
      './inputs/iv-datasets/7-dataset.csv',
      './inputs/iv-datasets/8-dataset.csv',
      './inputs/iv-datasets/9-dataset.csv',
      './inputs/iv-datasets/10-dataset.csv'
    ],
    outputDir: 'outputs/consistent-enrichment-levels/iv/unique-accross-multiple-datasets',
    outputFilename: '6-dataset-unique-to-datasets_1-10_excluding_6_dataset-consistent-enrichment-levels-above-10',
    outputType: 'excel'
  },
  {
    datasetToComparePath: './inputs/iv-datasets/7-dataset.csv',
    datasetsToCompareToPaths: [
      './inputs/iv-datasets/1-dataset.csv',
      './inputs/iv-datasets/2-dataset.csv',
      './inputs/iv-datasets/3-dataset.csv',
      './inputs/iv-datasets/4-dataset.csv',
      './inputs/iv-datasets/5-dataset.csv',
      './inputs/iv-datasets/6-dataset.csv',
      // './inputs/iv-datasets/7-dataset.csv',
      './inputs/iv-datasets/8-dataset.csv',
      './inputs/iv-datasets/9-dataset.csv',
      './inputs/iv-datasets/10-dataset.csv'
    ],
    outputDir: 'outputs/consistent-enrichment-levels/iv/unique-accross-multiple-datasets',
    outputFilename: '7-dataset-unique-to-datasets_1-10_excluding_7_dataset-consistent-enrichment-levels-above-10',
    outputType: 'excel'
  },
  {
    datasetToComparePath: './inputs/iv-datasets/8-dataset.csv',
    datasetsToCompareToPaths: [
      './inputs/iv-datasets/1-dataset.csv',
      './inputs/iv-datasets/2-dataset.csv',
      './inputs/iv-datasets/3-dataset.csv',
      './inputs/iv-datasets/4-dataset.csv',
      './inputs/iv-datasets/5-dataset.csv',
      './inputs/iv-datasets/6-dataset.csv',
      './inputs/iv-datasets/7-dataset.csv',
      // './inputs/iv-datasets/8-dataset.csv',
      './inputs/iv-datasets/9-dataset.csv',
      './inputs/iv-datasets/10-dataset.csv'
    ],
    outputDir: 'outputs/consistent-enrichment-levels/iv/unique-accross-multiple-datasets',
    outputFilename: '8-dataset-unique-to-datasets_1-10_excluding_8_dataset-consistent-enrichment-levels-above-10',
    outputType: 'excel'
  },
  {
    datasetToComparePath: './inputs/iv-datasets/9-dataset.csv',
    datasetsToCompareToPaths: [
      './inputs/iv-datasets/1-dataset.csv',
      './inputs/iv-datasets/2-dataset.csv',
      './inputs/iv-datasets/3-dataset.csv',
      './inputs/iv-datasets/4-dataset.csv',
      './inputs/iv-datasets/5-dataset.csv',
      './inputs/iv-datasets/6-dataset.csv',
      './inputs/iv-datasets/7-dataset.csv',
      './inputs/iv-datasets/8-dataset.csv',
      // './inputs/iv-datasets/9-dataset.csv',
      './inputs/iv-datasets/10-dataset.csv'
    ],
    outputDir: 'outputs/consistent-enrichment-levels/iv/unique-accross-multiple-datasets',
    outputFilename: '9-dataset-unique-to-datasets_1-10_excluding_9_dataset-consistent-enrichment-levels-above-10',
    outputType: 'excel'
  },
  {
    datasetToComparePath: './inputs/iv-datasets/10-dataset.csv',
    datasetsToCompareToPaths: [
      './inputs/iv-datasets/1-dataset.csv',
      './inputs/iv-datasets/2-dataset.csv',
      './inputs/iv-datasets/3-dataset.csv',
      './inputs/iv-datasets/4-dataset.csv',
      './inputs/iv-datasets/5-dataset.csv',
      './inputs/iv-datasets/6-dataset.csv',
      './inputs/iv-datasets/7-dataset.csv',
      './inputs/iv-datasets/8-dataset.csv',
      './inputs/iv-datasets/9-dataset.csv',
      // './inputs/iv-datasets/10-dataset.csv'
    ],
    outputDir: 'outputs/consistent-enrichment-levels/iv/unique-accross-multiple-datasets',
    outputFilename: '10-dataset-unique-to-datasets_1-9-consistent-enrichment-levels-above-10',
    outputType: 'excel'
  }
]

/**
 * Goes through all the supplied datasets and compares dataset.datasetToComparePath with dataset.datasetsToCompareToPaths.
 *
 * The datasets are first read and the aptamers, samples and enrichment levels are extracted.
 * Extracted aptamers are filtered with following rules:
 * - Must have exactly 36 nucliotied.
 * - The set sample runs must have continiously rising enrichment levels.
 * - The enrichment level must be above certain threshold.
 *
 * After aptameters are extracted and filtered, the dataset.datasetToComparePath is compared with dataset.datasetsToCompareToPaths.
 * If the aptamer at dataset.datasetToComparePath is unique across all datasets in datasetUniqueAptamersAccrossAllDatasets the aptamer passes the comparison.
 * The aptamers that pass the comparison are saved to a file in dataset.outputDir with dataset.outputFilename.
 * @param {*} datasetInputs
 */
async function extractConsistentlyEnrichingUniqueAptamersAccrossAllDatasets (datasetInputs) {
  const threshold = 10
  const nucliotideLength = 36
  for (const i in datasetInputs) {
    const datasetAptamers = []
    console.log(`Comparing dataset ${datasetInputs[i].datasetToComparePath} with \n\n${datasetInputs[i].datasetsToCompareToPaths.join('\n')}`)
    // Go through all the datasets that we want to compare with
    for (const j in datasetInputs[i].datasetsToCompareToPaths) {
      // Read the dataset's aptamers
      const datasetValues = await CSVHandler.readFile(datasetInputs[i].datasetsToCompareToPaths[j])
      // Take only 36 nucliodes length aptamers
      const refactored = RNA.getXNucliodeLengthAptamers(nucliotideLength, datasetValues, 'Aptamer')
      // Filter the aptamers so that only one's with consistently rising enrichment level are left.
      // The enrichment level must also be above certain threshold.
      let filteredDataset = RNA.filterAptamersWithConsintentlyRisingEnrichmentLevels(refactored, threshold)
      for (let k in filteredDataset) {
        const datasetAptamerValues = datasetAptamers.map(a => a.Aptamer)
        if (!datasetAptamerValues.includes(filteredDataset[k].Aptamer)) {
          datasetAptamers.push(filteredDataset[k])
        }
      }
    }

    // Prepare the comparison dataset.
    const datasetToCompare = await CSVHandler.readFile(datasetInputs[i].datasetToComparePath)
    // Take only 36 nucliodes length aptamers
    const refactored = RNA.getXNucliodeLengthAptamers(36, datasetToCompare, 'Aptamer')
    // Filter the aptamers so that we only have the ones with consistently rising enrichment levels
    let filteredDataset = RNA.filterAptamersWithConsintentlyRisingEnrichmentLevels(refactored, threshold)

    const datasetUniqueAptamersAccrossAllDatasets = []
    // Go through all the aptamers in the comparison dataset
    for (const j in filteredDataset) {
      const datasetAptamerValues = datasetAptamers.map(a => a.Aptamer)
      // If the aptamer is not found from the datasetAptamers, add it to the datasetUniqueAptamersAccrossAllDatasets
      if (!datasetAptamerValues.includes(filteredDataset[j].Aptamer)) {
        datasetUniqueAptamersAccrossAllDatasets.push(filteredDataset[j])
      }
    }

    // Save the result to a file.
    const headersObj = {
      Aptamer: 'Aptamer'
    }

    const sampleHeaders = Object.keys(datasetToCompare[0]).filter(a => a != 'Aptamer')
    for (let i in sampleHeaders) {
      headersObj[sampleHeaders[i]] = sampleHeaders[i]
    }

    // Custom sorting function for all columns except the first one
    const customSort = (a, b) => {
      const keys = Object.keys(a).slice(1)
      if (typeof b === 'undefined') {
        return 1
      }

      for (const key of keys) {
        const comparison = typeof a[key] === 'string'
          ? b[key].localeCompare(a[key])  // Compare strings
          : b[key] - a[key];  // Compare numbers

        if (comparison !== 0) {
          return comparison;
        }
      }

      return 0;
    }

    // Sorting the array of objects based on all properties except the first one
    const sortedData = _.orderBy(datasetUniqueAptamersAccrossAllDatasets, [customSort], 'desc')

    const filePath = `${datasetInputs[i].outputDir}/${datasetInputs[i].outputFilename}`
    const handler = datasetInputs[i].outputType == 'excel' ? new ExcelHandler(filePath, '.') : new CSVHandler(filePath, '.')
    handler.buildFromArray(headersObj, sortedData)
    await handler.save().then((result) => {
      console.log('Saved', result)
    })
  }
}

extractConsistentlyEnrichingUniqueAptamersAccrossAllDatasets (datasetInputs)

// extractConsistentlyEnrichingUniqueAptamersAccrossAllDatasets (datasetInputsIv)

// async function formFamiliesFromCandidates (familyCandidateInputs, familyLength = 7, progressLineCount = 3000, targetStringsSubstringLength = 7) {
//   for (let i in familyCandidateInputs) {
//     let candidates = null
//     let fileExtension = path.extname(familyCandidateInputs[i].candidatePath)
//     if (fileExtension === '.csv') {
//       candidates = await CSVHandler.readFile(familyCandidateInputs[i].candidatePath)
//     } else if (fileExtension === '.xlsx') {
//       candidates = await ExcelHandler.readFile(familyCandidateInputs[i].candidatePath)
//     } else {
//       throw Error(`Unfortunately the file extension ${fileExtension} is not supported.`)
//     }

//     let originalData = null
//     fileExtension = path.extname(familyCandidateInputs[i].allAptamerPath)
//     if (fileExtension === '.csv') {
//       originalData = await CSVHandler.readFile(familyCandidateInputs[i].allAptamerPath)
//     } else if (fileExtension === '.xlsx') {
//       originalData = await ExcelHandler.readFile(familyCandidateInputs[i].allAptamerPath)
//     } else {
//       throw Error(`Unfortunately the file extension ${fileExtension} is not supported.`)
//     }

//     await CSVHandler.readFile(familyCandidateInputs[i].allAptamerPath)
//     const filteredOriginalData = RNA.getXNucliodeLengthAptamers(36, originalData, 'Aptamer')

//     // Extract the aptamers from the original data
//     const originalAptamers = filteredOriginalData.map(a => a.Aptamer)

//     const candidateKeys = Object.keys(candidates[0])
//     const candidateAptamers = candidates.map(a => a[candidateKeys[0]])

//     let families = {}
//     for (let i in candidateAptamers) {
//       const targetString = candidateAptamers[i].substring(0, targetStringsSubstringLength)
//       // ! Custom condition
//       const aptameters = originalAptamers.filter(str => str.startsWith(targetString))
//       console.log('Starts with', targetString, aptameters)
//       const family = RNA.findMatchingSubstrings(aptameters, familyLength, progressLineCount, targetString)
//       console.log(family)
//       const familyKeys = Object.keys(family)
//       if (familyKeys.length) {
//         const familyName = familyKeys[0]
//         if (family[familyName].length > 1) {
//           // Merge the returned object to families
//           families = {  ...families, ...family }
//         }
//       }
//     }

//     const rows = []
//     for (let i in families) {
//       const aptamerRows = families[i].map(a => {
//         return {
//           Aptamer: a,
//           Family: i
//         }
//       })
//       rows.push(...aptamerRows)
//     }

//     const fileHeaders = {
//       Family: 'Family',
//       Aptamer: 'Aptamer'
//     }

//     const handler = new ExcelHandler(familyCandidateInputs[i].outputPath, '.')
//     handler.buildFromArray(fileHeaders, rows)
//     await handler.save().then(() => {
//       console.log(`Saved to ${familyCandidateInputs[i].outputPath}`)
//     })
//     console.log('\n\n')
//   }
// }

// const familyCandidateInputs = [
//   {
//     candidatePath: './inputs/iv-family-candidates/iv-1-dataset-unique-to-datasets_2-10-consistent-enrichment-levels-above-10.xlsx',
//     allAptamerPath: './inputs/origin/example-iv-real.csv',
//     outputPath: './outputs/family-candidates/iv-1-dataset-families',
//   },
//   {
//     candidatePath: './inputs/iv-family-candidates/iv-2-dataset-unique-to-datasets_1-10_excluding_2_dataset-consistent-enrichment-levels-above-10.xlsx',
//     allAptamerPath: './inputs/origin/example-iv-real.csv',
//     outputPath: './outputs/family-candidates/iv-2-dataset-families',
//   },
//   {
//     candidatePath: './inputs/iv-family-candidates/iv-3-dataset-unique-to-datasets_1-10_excluding_3_dataset-consistent-enrichment-levels-above-10.xlsx',
//     allAptamerPath: './inputs/origin/example-iv-real.csv',
//     outputPath: './outputs/family-candidates/iv-3-dataset-families',
//   },
//   {
//     candidatePath: './inputs/iv-family-candidates/iv-4-dataset-unique-to-datasets_1-10_excluding_4_dataset-consistent-enrichment-levels-above-10.xlsx',
//     allAptamerPath: './inputs/origin/example-iv-real.csv',
//     outputPath: './outputs/family-candidates/iv-4-dataset-families',
//   },
//   {
//     candidatePath: './inputs/iv-family-candidates/iv-5-dataset-unique-to-datasets_1-10_excluding_5_dataset-consistent-enrichment-levels-above-10.xlsx',
//     allAptamerPath: './inputs/origin/example-iv-real.csv',
//     outputPath: './outputs/family-candidates/iv-5-dataset-families',
//   },
//   {
//     candidatePath: './inputs/iv-family-candidates/iv-6-dataset-unique-to-datasets_1-10_excluding_6_dataset-consistent-enrichment-levels-above-10.xlsx',
//     allAptamerPath: './inputs/origin/example-iv-real.csv',
//     outputPath: './outputs/family-candidates/iv-6-dataset-families',
//   },
//   {
//     candidatePath: './inputs/iv-family-candidates/iv-7-dataset-unique-to-datasets_1-10_excluding_7_dataset-consistent-enrichment-levels-above-10.xlsx',
//     allAptamerPath: './inputs/origin/example-iv-real.csv',
//     outputPath: './outputs/family-candidates/iv-7-dataset-families',
//   },
//   {
//     candidatePath: './inputs/iv-family-candidates/iv-8-dataset-unique-to-datasets_1-10_excluding_8_dataset-consistent-enrichment-levels-above-10.xlsx',
//     allAptamerPath: './inputs/origin/example-iv-real.csv',
//     outputPath: './outputs/family-candidates/iv-8-dataset-families',
//   },
//   {
//     candidatePath: './inputs/iv-family-candidates/iv-9-dataset-unique-to-datasets_1-10_excluding_9_dataset-consistent-enrichment-levels-above-10.xlsx',
//     allAptamerPath: './inputs/origin/example-iv-real.csv',
//     outputPath: './outputs/family-candidates/iv-9-dataset-families',
//   },
//   {
//     candidatePath: './inputs/iv-family-candidates/iv-10-dataset-unique-to-datasets_1-9-consistent-enrichment-levels-above-10.xlsx',
//     allAptamerPath: './inputs/origin/example-iv-real.csv',
//     outputPath: './outputs/family-candidates/iv-10-dataset-families',
//   }
// ]

// formFamiliesFromCandidates(familyCandidateInputs, 6, 9000, 6)
