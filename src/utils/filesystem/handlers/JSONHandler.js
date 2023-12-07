const fs = require('fs')

/**
 * Helper class for reading and writing JSON files.
 */
class JSONHandler {

  /**
   * Reads a JSON file and returns the contents as an object.
   *
   * @param {String} filePath Path of the file to be read.
   * @returns {Object}
   */
  static async read(filePath) {
    const extension = filePath.split('.').pop()
    if (extension !== 'json') {
      throw new Error(`[JSON@read] Only allowed file types are json.`)
    }

    const json = await fs.readFileSync(filePath, { encoding: 'utf8', flag: 'r' })
    return JSON.parse(json)
  }

  /**
   * Writes a JSON object to a file.
   *
   * @param {String} filePath Path of the file to be written to.
   * @param {Object} object JSON object to be written.
   */
  static async write (filePath, object) {
    // Convert the JSON object to a string.
    const jsonStr = JSON.stringify(object, null, 2)
    // Write the JSON object to a file.
    return fs.writeFileSync(filePath, jsonStr, 'utf8', function (err) {
      if (err) {
        console.log("An error occured while writing JSON Object to File.")
        return console.log(err)
      }
    })
  }
}

module.exports = JSONHandler
