const fs = require('fs')
const csv = require('csv-parser')
const createCsvWriter = require('csv-writer').createObjectCsvWriter

class CsvHandler {

  _data
  _headers
  _separator

  _filename
  _workingDirectory

  constructor (filename, workingDirectory, separator = ',') {
    this._filename = filename
    this._separator = separator
    this._workingDirectory = workingDirectory
  }

  static isCsv (mimetype) {
    return [
      'text/csv'
    ].indexOf(mimetype) !== -1
  }

  static readFile (path, separator = ',') {
    return new Promise((resolve, reject) => {
      const results = []
      fs.createReadStream(path)
        .pipe(
          csv({
            separator,
            raw: true, // Do not encode utf-8 strings.
            strict: true, // There must be as many columns as headers.
            mapValues: ({ value }) => {
              value = value.toString().trim()
              return value.length ? value : null
            }
          })
        )
        .on('data', function (data) {
          if (Object.keys(data).length != 0) {
            results.push(data)
          }
        })
        .on('end', () => {
          resolve(results)
        })
        .on('error', function (err) {
          reject(err)
        })
    })
  }

  buildFromArray (headers, data) {
    let i
    this._headers = []
    for (i in headers) {
      this._headers.push({
        id: i,
        title: headers[i]
      })
    }

    this._data = data
  }

  async save () {
    const error = null
    const filename = this._filename + '.csv'
    const filePath = this._workingDirectory + '/' + filename

    const csvWriter = createCsvWriter({
      path: filePath,
      header: this._headers,
      fieldDelimiter: this._separator
    })

    await csvWriter.writeRecords(this._data)

    const response = {
      filePath,
      filename,
      error
    }

    return response
  }
}

module.exports = CsvHandler
