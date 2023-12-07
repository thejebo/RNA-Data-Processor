module.exports.createArrayOfObjects = function (propertyNames, propertyValues) {
  const result = []
  propertyValues.forEach(values => {
    const object = {}

    propertyNames.forEach((propertyName, index) => {
      // Set the property name and value in the object
      object[propertyName] = values[index]
    })

    // Add the object to the result array
    result.push(object)
  })

  return result
}