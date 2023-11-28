const fs = require('fs')
const Csv = require('./filesystem/handlers/Csv')
const Excel = require('./filesystem/handlers/Excel')
const path = require('path')

class Exporter {

  _data
  _handler

  /**
   * This class proviodes an interface for using the CSV and Excel classes.
   *
   * @param {*} type Allowed types: csv, excel.
   * @param {*} filename Name of the file to be created.
   * @param {*} workDir Directory path where the file will be created.
   * @param {*} createPath If true, the working directory will be created if it does not exist.
   */
  constructor (type, filename, workDir, createPath = false) {
    if (['csv', 'excel'].indexOf(type) === -1) {
      throw new Error('Invalid exporter type ' + type + '.')
    }

    if (!fs.existsSync(workDir)){
      if (createPath) {
        fs.mkdirSync(workDir)
      } else {
        throw new Error('The working directory for the exporter does not exist!')
      }
    }

    this._handler = this._getHandler(type, filename, workDir)
  }

  async buildFromArray (headers, data) {
    return this._handler.buildFromArray(headers, data)
  }

  /**
   * Writes the data to a file appointed in the constructor.
   *
   * @returns
   */
  async save () {
    return await this._handler.save()
  }

  _getHandler (type, filename, workDir) {
    if (type === 'excel') {
      return new Excel(filename, workDir)
    } else if (type === 'csv') {
      return new Csv(filename, workDir)
    }
  }
}

module.exports = Exporter
