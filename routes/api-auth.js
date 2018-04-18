const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const request = require('request-promise-lite');
const Users = require('../models/users');
const ActiveDirectory = require('activedirectory');
const assert = require('assert');
const crypto = require('crypto');
require('dotenv').load();

const db = process.env.MONGO_DB;
mongoose.Promise = global.Promise;

var ldapConfig = {
	url: process.env.LDAP_URL,
	baseDN: process.env.LDAP_BASE_DN,
	username: process.env.LDAP_USERNAME,
	password: process.env.LDAP_PASSWORD
}
var ad = new ActiveDirectory(ldapConfig);

mongoose.connect(db, function (err) {
	if (err) {
		console.error("Erreur de connection à la base " + err);
	}
})

router.get('/', function (req, res) {
	res.send('api-auth works');
});

/**
 * POST d'authentification
 */
router.post('/auth', function (req, res) {
	console.log('Post Auth');

	if(!req.body.id){
		res.status("400");
		res.send("Pas de login!");
		return;
	}
	var userId = (req.body.id).trim().toLowerCase();
	// userId --> enlever email ending au besoin
	console.log("userId :" +  userId);
	userId = userId.replace('@silene-habitat.com','');

	var userPassword = req.body.password;
	if (!userId || !userPassword) {
		res.status("400");
		res.send("Il manque le login ou le mot de passe");
		return;
	}

	// 1- Authentification sur l'AD.
	//console.log("Recherche dans l'ad de sAMAccountName = " + userId)
	ad.findUser(userId, function (err, user) {
		//console.log("flag : " + res);
		if (err) {
			//console.log('ERROR: ' + JSON.stringify(err));
			res.status(403).send("Erreur lors de la recherche de l'utilisateur dans l'ad.");
		}
		if (!user) {
			//console.log('User: ' + userId + ' not found.');
			res.status(403).send("Impossible de trouver l'utilisateur dans l'ad.");
		} else {

			/* On cherche à authentifier l'utilisateur */
			ad.authenticate(userId + '@silene-habitat.com', userPassword, function (err, auth) {
				// console.log("Tentative d'authent pour " + userId + " avec le mdp : " + userPassword);
				if (err) {
					//console.log('ERROR: ' + JSON.stringify(err));
					res.status(403).send("Erreur lors de la tentative d'authentification de l'utilisateur.");
					return;
				}

				if (auth) {
					console.log('Authenticated!');
					/* 1 - Création d'un token */
					const buf = crypto.randomBytes(64);
					var token = buf.toString('hex');


					/* 2- Create or Update user et token en base*/
					var userModel = new Users();
					
					userModel._id = userId;
					userModel.token = token;
					var updateObj = {token: token};
					Users.findByIdAndUpdate(userId,updateObj,{upsert:true, new:true}, function (err, updatedUser) {
						if (err) {
							console.log('Error saving a User');
							console.log('ERROR: '+JSON.stringify(err));
						} else {
							res.json(updatedUser);
						}
					});
				}
				else {
					res.status(403).send("Echec de l'authentification");
				}
			});
		}
		// console.log(JSON.stringify(user));
		/* On sort */
		// res.json(user);


	})


});

module.exports = router;