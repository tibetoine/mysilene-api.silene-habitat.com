const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const weatherSchema = new Schema({
	
	
},{ strict: false });


module.exports = mongoose.model('weather', weatherSchema, 'weather');
