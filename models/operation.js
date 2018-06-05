const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const operationSchema = new Schema({	
},{ strict: false });


module.exports = mongoose.model('operation', operationSchema, 'operation');
