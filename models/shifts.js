const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const shiftsSchema = new Schema({
	
	
},{ strict: false });


module.exports = mongoose.model('shifts', shiftsSchema, 'ShiftsCollection');
