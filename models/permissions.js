const mongoose = require('mongoose')

const Schema = mongoose.Schema

const permissionsSchema = new Schema({
  _id: String,
  description: String,
  roles: [String],
  icon: String,
  text: String,
  path: String
})

module.exports = mongoose.model('permissions', permissionsSchema, 'permissions')
