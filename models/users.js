const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const usersSchema = new Schema({
	_id:String,		
	token:String
});


module.exports = mongoose.model('users', usersSchema, 'users');
