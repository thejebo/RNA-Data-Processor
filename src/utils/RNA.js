const fs = require('fs')
const Exporter = require('./Exporter')
const CSVHandler = require('./filesystem/handlers/Csv')

class RNA {
  /**
   * The method takes in an array of strings and from those strings, it forms tries to find common matching substrings.
   * The method returns an object with the matching substrings as keys and arrays of strings as values.
   *
   * @param {Array} strings - An array of strings to compare.
   * @param {Number} threshold - The minimum length of the matching substrings.
   * @param {Number} progressLineCount - The number of lines to process before logging the progress.
   * @param {String} targetString - An optional target string, which the found substring groups have to match with.
   * @returns {Object} - An object with matching substrings as keys and arrays of strings as values.
   */
  static findMatchingSubstrings (strings, threshold = 5, progressLineCount = 1000, targetString = '') {
    // Initialize an empty object to store matches
    const matches = {}

    // Check if a valid target string is provided
    if (targetString) {
      // Loop through each string in the array
      for (let i = 0; i < strings.length; i++) {
        // Get the current string
        const currentString = strings[i];
        // Loop through each possible substring of the current string
        for (let j = 0; j < currentString.length - threshold + 1; j++) {
          // Get the substring
          const substr = currentString.slice(j, j + threshold);
          // Check if the targetString contains the substring
          if (targetString.includes(substr)) {
            // If the substring doesn't exist in the matches object, create a new array for it
            if (!matches[substr]) {
              matches[substr] = []
            }
            // If the current string doesn't exist in the matches array for the substring, add it
            if (matches[substr].indexOf(currentString) === -1) {
              matches[substr].push(currentString)
            }
          }
        }

        if ((i + 1) % progressLineCount === 0) {
          console.log(i + 1 + '/' + strings.length);
        }
      }
    }

    // Return the matches object
    return matches
  }

  /**
   * This function reads an CSV file containing aptamers and samples. It then parses the file
   * and saves an JSON object containing families of those aptamers.
   *
   * The first row of the CSV file, are headers. The first column is "Aptamer" and rest are sample names.
   * In the following rows, aptameters are in the first column and the rest are enrichment levels.
   * @param {String} inputPath - The path to the input CSV file.
   * @param {String} outputPath - The path to the output JSON file.
   * @param {Number} threshold - The minimum length of the family.
   * @param {Number} includeEnrichmentLevelMoreThan - The minimum enrichment level to include the aptamer in the family.
   * @param {Number} excludeFamilySize - The minimum size of the family to include it in the result.
   * @param {String} mustHaveSubstring - The substring that the family must contain.
   */
  static async createAndSaveFamiliesToJSON (inputPath, outputPath, familyLength = 5, includeEnrichmentLevelMoreThan = 0, excludeFamilySize = null, mustHaveSubstring = null) {
    console.log('Family length: ' + familyLength + ' characters')
    console.log('Enrichment level needs to be >=: ' + includeEnrichmentLevelMoreThan)
    console.log('Family size needs to be >=: ' + excludeFamilySize)

    // Read the CSV file in to object(s).
    let data = await CSVHandler.readFile(inputPath)
    // Filter out aptamers that are not passing the length level threshold.
    const nucliodeLengthThreshold = 36
    const dataLenBefore = data.length
    console.log(`From ${dataLenBefore} aptamers, excluding all aptamer that are not exactly ${nucliodeLengthThreshold} nucliodes...`)
    data = RNA.getXNucliodeLengthAptamers(nucliodeLengthThreshold, data, 'Aptamer')
    console.log(`There are ${data.length} aptamers left, e.g filtered ${dataLenBefore - data.length} aptamers.`)
    // Get samples' names from the first object.
    let sampleNames = Object.keys(data[0]).filter(a => a !== 'Aptamer')
    // Filter out aptamers that are not passing the enrichment level threshold.
    console.log(`From filtered aptamers (${data.length}), exluding all aptamers which don't have any sample with enrichment level >= ${includeEnrichmentLevelMoreThan}...`)
    const aptamers = data.filter((a) => {
      for (let sampleName of sampleNames) {
        if (a[sampleName] >= includeEnrichmentLevelMoreThan || includeEnrichmentLevelMoreThan === null) {
          return true
        }
      }
      return false
    }).map(a => a.Aptamer)
    console.log(`There are ${aptamers.length} aptamers left, e.g filtered ${data.length - aptamers.length} aptamers less.`)

    var result
    // Tell the user how many aptamers were read from the source file
    // before starting the creation of families.
    console.log(`Read ${aptamers.length} lines from ${inputPath}.`)
    if (familyLength === null && mustHaveSubstring !== null) {
      familyLength = mustHaveSubstring.length
      console.log('No famile length given, using the length of the substring: ' + familyLength)
    }
    const families = this.findMatchingSubstrings(aptamers, familyLength, 400)

    if (mustHaveSubstring !== null) {
      console.log('Filtering out families that don\'t contain the substring: ' + mustHaveSubstring)
      let familyNames = Object.keys(families)
      for (let familyName of familyNames) {
        if (!familyName.includes(mustHaveSubstring)) {
          delete families[familyName]
        }
      }
    }

    console.log('Found ' + Object.keys(families).length + ' families...')
    if (excludeFamilySize !== null) {
      console.log('Excluding families with less than ' + excludeFamilySize + ' members...')
      result = RNA.excludeFamilyBasedOnMemberCount (families, excludeFamilySize)
      console.log('There are ' + Object.keys(result.families).length + ' families left.')
    } else {
      result = {
        families
      }
    }

    console.log('Writing to families to JSON file...')
    await RNA.writeJSONToFile(result, outputPath)
  }

  /**
   * Creates a file which includes combination of families, aptamers including to those families and
   * aptamer/sample enrichment levels.
   *
   * @param {String} inputPath
   * @param {String} familyInputPath
   * @param {String} outputPath
   */
  static async addSampleEnrichmentLevelsToAptamersInFamilyJSON (inputPath, familyInputPath, outputPath) {
    // Read the CSV file in to object(s).
    const data = await CSVHandler.readFile(inputPath)
    const json = await fs.readFileSync(familyInputPath, { encoding: 'utf8', flag: 'r' })
    const families = JSON.parse(json).families
    console.log(`Read ${Object.keys(families).length} families from ${inputPath}.`)

    // Get sample names from the first row of the data.
    const sampleNames = Object.keys(data[0]).filter((k) => k !== 'Aptamer')
    let familyNames = Object.keys(families)
    // Go trough each row in raw data.
    const output = {} // This will contain all the families with their aptamers and samples.

    for (let name of familyNames) {
      let aptamers = {}
      families[name].forEach(a => aptamers[a] = {
        samples: {}
      })
      output[name] = aptamers
    }

    for (let i in data) {
      var row = data[i]
      // Go trough each family
      for (let name of familyNames) {
        let family = output[name]
        // If the current row's aptamer if part of the family...
        if (Object.keys(family).includes(row.Aptamer)) {
          // Go through row's samples.
          for (var sampleName of sampleNames) {
            // Find the aptamer from family...
            family[row.Aptamer].samples[sampleName] = row[sampleName]
          }
        }
      }

      if (i % 400 === 0) {
        console.log(i)
      }
    }

    console.log('Writing to file ' + Object.keys(output).length + ' families...')
    await RNA.writeJSONToFile(output, outputPath)
  }

  static addSampleAverageToFamilies (families, data) {
    // Get sample names from the first row of the data.
    const sampleNames = Object.keys(data[0]).filter((k) => k !== 'Aptamer')
    let familyNames = Object.keys(families)
    // Go trough each row in raw data.
    const output = {} // This will contain all the families with their aptamers and samples.

    for (let name of familyNames) {
      // Make an object from sample names where the sample name is the key and the value is 0.
      output[name] = sampleNames.reduce((a, b) => {
        a[b] = []
        return a
      }, {})
    }

    for (let i in data) {
      var row = data[i]
      // Go trough each family
      for (let name of familyNames) {
        // If the current row's aptamer if part of the family...
        if (families[name].includes(row.Aptamer)) {
          // Go through row's samples.
          for (var sampleName of sampleNames) {
            // Find the aptamer from family...
            if (output[name][sampleName] > 0) {
              output[name][sampleName].push(parseInt(row[sampleName]))
            }
          }
        }
      }

      if (i % 400 === 0) {
        console.log(i)
      }
    }

    return output
  }

  /**
   * Reads an CSV file containing aptamers and samples.
   * Then it reads the families from JSON file and adds the samples to the aptamers.
   */
  static async createAptamerEnricmentSampleFamilyJSONFiles (dataInputPath, familiesInputPath, outputPath) {
    console.log('[CreateAptamerEnricmentSampleFamilyJSONFiles] Sample data will be read from: ', dataInputPath)
    console.log('[CreateAptamerEnricmentSampleFamilyJSONFiles] Families will be read from:', familiesInputPath)
    console.log('[CreateAptamerEnricmentSampleFamilyJSONFiles] The results will be written to:', outputPath)
    // Read the original data.
    const data = await CSVHandler.readFile(dataInputPath)
    // Read the families from JSON.
    const json = JSON.parse(fs.readFileSync(familiesInputPath))

    const families = RNA.addSampleAverageToFamilies(json.families, data)
    RNA.writeJSONToFile(families, outputPath)
    // const familyNames = Object.keys(families)
    // for (let family of familyNames) {
    //   RNA.writeJSONToFile(families[family], outputPath + '/' + family + '.json')
    // }

    return families
  }

  /**
   * This function is just a wrapper for writing JSON to a file.
   *
   * @param {Object} json JSON object to write to file.
   * @param {String} filePath Output file path.
   * @returns {void}
   */
  static async writeJSONToFile (json, filePath) {
    // Convert the JSON object to a string.
    const jsonContent = JSON.stringify(json, null, 2)
    // Write the JSON object to a file.
    return fs.writeFileSync(filePath, jsonContent, 'utf8', function (err) {
      if (err) {
        console.log("An error occured while writing JSON Object to File.");
        return console.log(err);
      }
    })
  }

  static async combineFamilyEnrichmentData () {
    // function to process data for a single family
    function processFamilyData (data) {
      const aptamers = data.aptamers
      const aptamerNames = Object.keys(aptamers)
      const sampleNames = aptamers[aptamerNames[0]].samples.map(sample => sample.name)
      const matrix = aptamerNames.map(aptamerName => {
        const enrichmentLevels = aptamers[aptamerName].samples.reduce((acc, sample) => {
          acc[sample.name] = parseFloat(sample.enrichmentLevel)
          return acc
        }, {})
        return sampleNames.map(sampleName => enrichmentLevels[sampleName])
      })
      return { name: data.name, matrix }
    }

    // function to combine the processed data for multiple families
    function combineFamilyData (familyDataList) {
      const sampleNames = familyDataList.flatMap(familyData => familyData.matrix.map(row => row[0]))
      const matrix = familyDataList.flatMap(familyData => familyData.matrix.map(row => row.slice(1)))
      return { sampleNames, matrix };
    }

    // Read and process data for each family
    const familyDataList = [];
    const basePath = './families-output'
    const filenames = [
      basePath + '/AGAAA-family-representation.json',
      basePath + '/ACTGT-family-representation.json'
    ]

    for (const filename of filenames) {
      const data = JSON.parse(fs.readFileSync(filename))
      const processedData = processFamilyData(data)
      familyDataList.push(processedData)
    }

    // combine processed data for all families
    const combinedData = combineFamilyData(familyDataList)
    console.log(combinedData)
  }

  /**
   * Creates an Excel-files from all the families, along with their aptamers and samples found from inputPath.
   *
   * @param {String} inputPath Input path of JSON-file containing the families.
   * @param {String} outputPath Output path of the Excel.
   * @param {String} fileName Name of the output Excel.
   * @param {Array<String>}
   */
  static async createExcelsFromFamilyJSON (inputPath, outputPath, fileName, allSampleNames) {
    // Read the CSV file in to object(s).
    const json = await fs.readFileSync(inputPath, { encoding: 'utf8', flag: 'r' })
    const families = JSON.parse(json)

    const rowTemplate = {}
    allSampleNames.forEach(sampleName => { rowTemplate[sampleName] = 0 })

    const rows = []
    for (let familyName in families) {
      for (let aptamerName in families[familyName]) {
        let tmp = {
          family : familyName,
          Aptamer: aptamerName,
          ...rowTemplate
        }

        for (let sampleName in families[familyName][aptamerName].samples) {
          tmp[sampleName] = families[familyName][aptamerName].samples[sampleName]
        }
        rows.push(tmp)
      }
      let tmp = {
        family : '',
        Aptamer: '',
        ...rowTemplate
      }
      console.log(tmp)
      rows.push(tmp)
    }

    // Create object for the exporter.
    var keys = Object.keys(rows[0])
    var values = Object.keys(rows[0])
    var headers = {}
    keys.forEach((key, i) => headers[key] = values[i])

    try {
      var exporter = new Exporter('excel', fileName, outputPath, true)
    } catch (error) {
      console.log(error, error.message)
    }

    await exporter.buildFromArray(headers, rows)
    const fileSaveResponse = await exporter.save()
    console.log(fileSaveResponse)
  }

  /**
   * Parses a JSON file containing aptamer families and removes families with less than a given number of aptamers.
   *
   * @param {String} inputPath A path to a JSON file containing aptamer families.
   * @param {String} outputPath A path to a JSON file to write the result to.
   * @param {Number} excludeFamilySize Exclude families with less than this number of aptamers.
   */
  static async parseFamilies (inputPath, outputPath, excludeFamilySize = 2) {
    const data = await fs.readFileSync(inputPath, { encoding: 'utf8', flag: 'r' })
    const families = JSON.parse(data).families
    console.log(`Read ${Object.keys(families).length} families from ${inputPath}.`)
    const result = RNA.excludeFamilyBasedOnMemberCount(families, excludeFamilySize)
    // Convert the JSON object to a string.
    const jsonContent  = JSON.stringify(result, null, 2)
    // Write the result to a file.
    await fs.writeFileSync(outputPath, jsonContent, 'utf8')
    console.log(`JSON file has been saved to ${outputPath}.`)
    console.log('There are ' + Object.keys(result.families).length + ' families left.')
  }

  static excludeFamilyBasedOnMemberCount (families, excludeFamilySize = 2) {
    const result = {
      families: {}
    }

    let familyNames = Object.keys(families)
    for (const familyName of familyNames) {
      const family = families[familyName]
      if (family.length >= excludeFamilySize) {
        result.families[familyName] = family
      }
    }

    return result
  }

  static getMostEnrichedAptamersAmongstSamples (aptamers, sampleNamesToInclude, numberOfAptamers = 10) {
    const result = RNA.sortByMaxPropertyDescending(aptamers, sampleNamesToInclude)
    if (numberOfAptamers) {
      return result.slice(0, numberOfAptamers)
    }
    return result
  }

  /**
   * Sorts an array of objects by the maximum value of a given property.
   *
   * @param {Array<Object>} arr Array to sort.
   * @param {Array<String>} properties Array of properties to look for the maximum value in.
   * @returns {Array<Object>} The sorted array.
   */
  static sortByMaxPropertyDescending (arr, properties) {
    arr.sort((a, b) => {
      let maxA = -Infinity
      let maxB = -Infinity

      for (let prop of properties) {
        const valueA = Number(a[prop])
        const valueB = Number(b[prop])

        if (valueA > maxA) {
          maxA = valueA
        }
        if (valueB > maxB) {
          maxB = valueB
        }
      }

      if (maxA < maxB) {
        return 1
      }

      if (maxA > maxB) {
        return -1
      }

      return 0
    })

    return arr
  }

  /**
   * @param {Array<Object>} objects Array of objects to extract properties from.
   * @param {Array<String>} properties Properties to extract from each object.
   * @returns {Array<Object>}
   */
  static extractPropertiesFromObjects (objects, properties) {
    return objects.map(obj => RNA.getExtractedPropertiesFromObject(obj, properties))
  }

  /**
   * @param {Object} obj Object to extract properties from.
   * @param {Array<String>} properties Properties to extract from object.
   * @returns {Object}
   */
  static getExtractedPropertiesFromObject (obj, properties) {
    return properties.reduce((result, prop) => {
      if (obj.hasOwnProperty(prop)) {
        result[prop] = obj[prop]
      }
      return result
    }, {})
  }

  /**
   * @param {Number} x
   * @param {Array<Object>} aptamers
   * @param {String} aptamerPropertyName
   */
  static getXNucliodeLengthAptamers (x, aptamers, aptamerPropertyName = 'Aptamer') {
    const arr = []
    for (let i = 0; i < aptamers.length; i++) {
      const row = aptamers[i]
      const aptamer = row[aptamerPropertyName]
      if (aptamer.length === x) {
        arr.push(row)
      }
    }

    return arr
  }

  /**
   */
  static getAptamersNotEncrichedInThresholdXInGivenSamples () {

  }

  /**
   * Filters out aptamers that are not enriched in the samples.
   *
   * @param {Array<Object>} aptamers Array of aptamers.
   * @param {Number} threshold Enrichment level threshold.
   * @returns {Array<Object>} Filtered aptamers.
   */
  static filterAptamersWithConsintentlyRisingEnrichmentLevels (aptamers, thresholdForEnrichmentLevel = null) {
    const samples = Object.keys(aptamers[0]).filter(a => a !== 'Aptamer')
    const filteredAptamers = []

    for (let i in aptamers) {
      // Get our target.
      const aptamer = aptamers[i]
      // If threshold is given, check if the aptamer is enriched above the threshold.
      const checkAllSamples = samples.length <= 2
      const isAboveThreshold = RNA.checkIfAptamerEnrichmentThrendIsAboveThreshold(aptamer, samples, thresholdForEnrichmentLevel, checkAllSamples)
      if (thresholdForEnrichmentLevel !== null && !isAboveThreshold) {
        continue
      }

      // Check if the aptamer's enrichment level is rising accross it's samples.
      if (RNA._checkIfAptamerEnrichmentIsRising(aptamer, samples)) {
        filteredAptamers.push(aptamer)
      }
    }

    return filteredAptamers
  }

  static _checkIfAptamerEnrichmentIsRising (aptamer, samples) {
    let isRising = true // Assume that the aptamer's enrichment level is rising.
    // Go through each sample.
    for (let j = 0; j < samples.length - 1; j++) {
      const sample = samples[j]
      const nextSample = samples[j + 1]
      const currentEnrichmentLevel = parseInt(aptamer[sample])
      const nextEnrichmentLevel = parseInt(aptamer[nextSample])
      // Does the next sample have a higher enrichment level than the current sample?
      if (currentEnrichmentLevel >= nextEnrichmentLevel) {
        isRising = false
        break
      }
    }

    return isRising
  }

  /**
   *
   * @param {Object} aptamer Object containing aptamer and samples.
   * @param {Array<String>} samples Array of sample names.
   * @param {Number} threshold The minimum enrichment level for the enrichment levels.
   * @param {Boolean} checkForAllSamples If true, the method will return true only if the aptamer is enriched above the threshold on all samples.
   * @returns
   */
  static checkIfAptamerEnrichmentThrendIsAboveThreshold (aptamer, samples, threshold, checkForAllSamples = false) {
    let isAboveThreshold = false // Assume that the aptamer's enrichment level is not above the threshold on any of the samples.

    let samplesToGoThrough = samples.length - 1
    if (samples.length <= 2) {
      samplesToGoThrough += 1
    }

    // Go through each sample. If the checkForAllSamples is true, check that each sample is above the threshold.
    for (let j = 0; j < samplesToGoThrough; j++) {
      const sample = samples[j]
      const currentEnrichmentLevel = parseInt(aptamer[sample])
      // Does the next sample have a higher enrichment level than the current sample?
      if (currentEnrichmentLevel >= threshold) {
        if (checkForAllSamples) {
          isAboveThreshold = true
        } else {
          return true
        }
      } else {
        if (checkForAllSamples) {
          return false
        }
      }
    }

    return isAboveThreshold
  }
}

module.exports = RNA
