const mongoose = require('mongoose')

const Schema = mongoose.Schema

const interessementConfigSchema = new Schema(
  {
    _id: String
  },
  { strict: false }
)

module.exports = mongoose.model(
  'interessementConfig',
  interessementConfigSchema,
  'interessementConfig'
)
