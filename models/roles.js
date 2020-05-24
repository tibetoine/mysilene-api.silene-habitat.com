const mongoose = require('mongoose')

const Schema = mongoose.Schema

const rolesSchema = new Schema({
  _id: String,
  description: String,
  color: String,
  users: [String],
  groups: [String]
})

module.exports = mongoose.model('roles', rolesSchema, 'roles')
