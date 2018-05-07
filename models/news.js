const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const newsSchema = new Schema({
    albumId:String,
	id:String,
	title:String,
	summary:String,
	url:String,
	thumbnailUrl:String,
	type:String,
	date:Date,
	auteur:String,
	content:String,
	link:String
});


module.exports = mongoose.model('news', newsSchema, 'news');
