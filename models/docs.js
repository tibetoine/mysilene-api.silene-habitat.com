const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const docsSchema = new Schema({
	
	
},{ strict: false });


module.exports = mongoose.model('docs', docsSchema, 'DocsCollection');
