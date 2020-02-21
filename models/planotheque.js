const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const planothequeSchema = new Schema({
    _id:String,
    apiResult:{}

},{ strict: false });


module.exports = mongoose.model('planotheque', planothequeSchema, 'planotheque');
