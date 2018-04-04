const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const newsSileneSchema = new Schema({
    _id:String,
    type:String,
    title:String,
    date:Date,
    author:String,
    image:String,
    content:String
});


module.exports = mongoose.model('newsSilene', newsSileneSchema, 'NewsCollection');
