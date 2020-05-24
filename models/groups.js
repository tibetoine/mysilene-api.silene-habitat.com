const mongoose = require('mongoose')

const Schema = mongoose.Schema

const groupsSchema = new Schema({
  _id: String,
  group: String,
  roles: [String]
})

module.exports = mongoose.model('groups', groupsSchema, 'groups')
