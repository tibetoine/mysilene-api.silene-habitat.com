const mongoose = require('mongoose')

const Schema = mongoose.Schema

const interessementSchema = new Schema({}, { strict: false })

module.exports = mongoose.model(
  'interessement',
  interessementSchema,
  'interessement'
)
