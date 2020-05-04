const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const rolesSchema = new Schema({		
	role: String,
	description: String
});


module.exports = mongoose.model('roles', rolesSchema, 'roles');
