const mongoose = require('mongoose')

const Schema = mongoose.Schema

const usersSchema = new Schema({
  _id: String,
  token: String,
  tokens: [String],
  prefs: [String],
  roles: [String]
})

module.exports = mongoose.model('users', usersSchema, 'users')
