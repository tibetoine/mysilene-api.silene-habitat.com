const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const request = require('request-promise-lite');
const Users = require('../models/users');
const ActiveDirectory = require('activedirectory');
const ActiveDirectoryMock = require('../mock/activedirectory');
const assert = require('assert');
const crypto = require('crypto');
const uuidv4 = require('uuid/v4');
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
// var ad = new ActiveDirectoryMock(ldapConfig);

var buildBusinessError = (message, httpErrorCode, sileneErrorCode, correlationId) => {
	
	if (message == null || message.length <= 0) {
		throw new Error("Le paramètre 'message' est requis");
	}

	if (sileneErrorCode == null) {
		throw new Error("Le paramètre 'sileneErrorCode' est requis");
	}
	if (!httpErrorCode || httpErrorCode == null) {
		httpErrorCode = 500
	}

	var error = {
		status: httpErrorCode,
		data: {
			sileneErrorCode: "4031",
			correlationCode: correlationId
		},
		message: message
	}
	
	return error
}
mongoose.connect(db, {
	server: {
	  socketOptions: {
		socketTimeoutMS: 0,
		connectTimeoutMS: 0
	  }
	}
  },function (err) {
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
	var correlationId = uuidv4();
	console.log(correlationId - 'Post Auth');

	

	if(!req.body.id){
		res.status("400");
		res.send("Pas de login!");
		return;
	}
	var userId = (req.body.id).trim().toLowerCase();
	// userId --> enlever email ending au besoin
	// console.log("userId :" +  userId);
	userId = userId.replace('@silene-habitat.com','');

	var userPassword = req.body.password;
	if (!userId || !userPassword) {
		res.status("400");
		res.send("Il manque le login ou le mot de passe");
		return;
	}

	// 1- Authentification sur l'AD.
	// console.log("Recherche dans l'ad de sAMAccountName = " + userId)
	ad.findUser(userId, function (err, user) {
		// console.log("flag : " + res);
		if (err) {
			//console.log('ERROR: ' + JSON.stringify(err));
			var error = buildBusinessError("Erreur lors de la recherche de l'utilisateur dans l'ad.", 403, 40311, correlationId)
			res.status(403).type('application/json').send(error);
		}
		if (!user) {
			//console.log('User: ' + userId + ' not found.');
			var error = buildBusinessError("Utilisateur inconnu", 403, 40312, correlationId)
			res.status(403).json(error);
		} else {
			/* On cherche à authentifier l'utilisateur */
			ad.authenticate(userId + '@silene-habitat.com', userPassword, function (err, auth) {
				// console.log("Tentative d'authent pour " + userId + " avec le mdp : " + userPassword);
				if (err) {
					console.log('ERROR: ' + JSON.stringify(err));
					var error = buildBusinessError("Impossible d'authentifier l'utilisateur", 403, 4032, correlationId)
					res.status(403).json(error);
					return;
				}

				if (auth) {
					console.log('[OK] : ' + userId + ' is Authenticated!');
					/* 1 - Création d'un token */
					const buf = crypto.randomBytes(64);
					var token = buf.toString('hex');


					/* 2- Create or Update user et token en base*/
					var updateObj = {token: token};
					Users.findByIdAndUpdate(userId,updateObj,{upsert:true, new:true}, function (err, updatedUser) {
						if (err) {
							console.log('Error saving a User : ' + userId + " avec le token : " + token);
							console.log('ERROR: '+JSON.stringify(err));
							var error = buildBusinessError("Erreur lors de l'authentification", 403, 4033, correlationId)
							res.status(403).json(error);							
						} else {
							console.log('[OK] : Token enregistré (ou mis à jour) en base pour ' + userId );
							res.json(updatedUser);
						}
					});
				}
				else {
					var error = buildBusinessError("Echec de l'authentification", 403, 4034, correlationId)
					res.status(403).json(error);		
					
				}
			});
		}
		// console.log(JSON.stringify(user));
		/* On sort */
		// res.json(user);


	})


});

module.exports = router;