const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const contactsSchema = new Schema({
    mail:String,
	sn:String,
	givenName:String,
	thumbnailPhoto:String,	
	mobile:String,
	telephoneNumber:String, 
	department:String, 
	otherTelephone:String, 
	sileneProcessus:String, 
	silenesst:String, 
	sileneserrefile:String,
	sileneguidefile:String,
	title:String,
	saturday:Boolean
});


module.exports = mongoose.model('contacts', contactsSchema, 'contacts');
