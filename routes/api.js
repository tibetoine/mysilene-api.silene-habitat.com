const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const request = require('request-promise-lite');
const News = require('../models/news');
const NewsSilene = require('../models/newsSilene');
const Contacts = require('../models/contacts');
const Users = require('../models/users');
require('dotenv').load();

const db = process.env.MONGO_DB;
mongoose.Promise = global.Promise;


mongoose.connect(db, function (err) {
	if (err) {
		console.error("Erreur de connection à la base " + err);
	}
})

router.get('/', function (req, res) {
	res.send('api works');
});

router.get('/news', function (req, res) {
	console.log('Get request for news');

	//var jsonNews = Array<News>;

	/* Appel de l'API Sharepoint pour récupérer les actualités */
	/*request.get('https://jsonplaceholder.typicode.com/photos', { json: true })
		.then((response) => {
			//console.log(JSON.stringify(response));
		});*/



	News.find({})
		.exec(function (err, news) {
			if (err) {
				console.log("Erreur dans la récupération des news");
			} else {
				res.json(news);
			}
		});
});

/**
 * REST pour les news Silène (Version 2)
 */
router.get('/newsSilene', function (req, res) {
	console.log('Get request for newsSilene');



	NewsSilene.find({}).sort('-date')
		.exec(function (err, news) {
			if (err) {
				console.log("Erreur dans la récupération des news");
			} else {
				res.json(news);
			}
		});
});



router.get('/news/:id', function (req, res) {
	console.log('Get request for news');

	News.findById(req.params.id)
		.exec(function (err, news) {
			if (err) {
				console.log("Erreur dans la récupération des news");
			} else {
				res.json(news);
			}
		});
});
/*
router.put('/news/:id', function (req, res) {
	console.log('Update a news');
	News.findByIdAndUpdate(req.params.id,
		{
			$set: {
				albumId: req.body.albumId,
				id: req.body.id,
				title: req.body.title,
				url: req.body.url,
				thumbnailUrl: req.body.thumbnailUrl
			}
		},
		{
			new: true
		},
		function (err, updatedNews) {
			if (err) {
				console.log("Erreur dans la mise à jour de la news");
			} else {
				res.json(updatedNews);
			}
		});
});

router.delete('/news/:id', function (req, res) {
	console.log('Remove a news');
	News.findByIdAndRemove(req.params.id, function (err, deletedNews) {
		if (err) {
			console.log("Erreur dans la suppression de la news", err);
		} else {
			res.json(deletedNews);
		}
	});
});
router.post('/news', function (req, res) {
	console.log('Post a news');
	var newNews = new News();
	newNews.albumId = req.body.albumId;
	newNews.id = req.body.id;
	newNews.title = req.body.title;
	newNews.url = req.body.url;
	newNews.summary = req.body.summary;
	newNews.auteur = req.body.auteur;
	newNews.date = req.body.date;
	newNews.type = req.body.type;
	newNews.content = req.body.content;
	newNews.save(function (err, insertedNews) {
		if (err) {
			console.log('Error saving a News');
		} else {
			res.json(insertedNews);
		}
	});
});*/

/* API : Contacts */


router.get('/contacts', function (req, res) {
	console.log('Get request for contacts sorted');
	Contacts.find({}).sort({sn:1})
		.exec(function (err, contacts) {
			if (err) {
				console.log("Erreur dans la récupération des contacts");
			} else {
				res.json(contacts);
			}
		});
});

module.exports = router;