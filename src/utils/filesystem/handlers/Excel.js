// Require library
// TODO: Remove excel4node and use just XLSX library.
const xl = require('excel4node')
const xlsx = require('xlsx')

class ExcelHandler {

  _workbook
  _worksheet

  _filename
  _workingDirectory

  constructor (filename, workingDirectory) {
    this._workbook = new xl.Workbook()
    this._worksheet = this._workbook.addWorksheet('Sheet 1')

    this._filename = filename
    this._workingDirectory = workingDirectory
  }

  static isExcel (mimetype) {
    return [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ].indexOf(mimetype) !== -1
  }

  static readFile (filename) {
    const workbook = xlsx.readFile(filename)
    const sheetNameList = workbook.SheetNames
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetNameList[0]], {defval: ''})
    return data
  }

  /**
   * @param {object} headers The first row of the sheet.
   * @param {object} rows Values under the headers, where each array represents a single row.
   */
  buildFromArray (headers, rows) {
    const headerKeys = Object.keys(headers)
    let col = 1
    for (const cell in headers) {
      this.write(headers[cell], col, 1)
      col++
    }

    for (const row in rows) {
      col = 1
      for (const i in headerKeys) {
        this.write(rows[row][headerKeys[i]], col, (parseInt(row) + 2))
        col++
      }
    }

    return this
  }

  write (value, column, row) {
    const type = typeof value
    switch (type) {
    case 'number':
      this._worksheet.cell(row, column).number(value)
      break
    case 'string':
      this._worksheet.cell(row, column).string(value)
      break
    }
    return this
  }

  async save () {
    let error = null
    const filename = this._filename + '.xlsx'
    const filePath = this._workingDirectory + '/' + filename

    await new Promise((resolve, reject) => {
      return this._workbook.write(filePath, function (err) {
        if (err) {
          error = err
          console.log(err)
          reject(false)
        } else {
          resolve(true)
        }
      })
    })

    const response = {
      filePath,
      filename,
      error
    }

    return response
  }
}

module.exports = ExcelHandler
