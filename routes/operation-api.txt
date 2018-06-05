const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const Operation = require('../models/operation')
require('dotenv').load()
var logger = require('../utils/logger');

const db = process.env.MONGO_DB
mongoose.Promise = global.Promise

router.get('/operation', (req, res) => {
  
  logger.logApiAccess("GET", req.headers, "/api-operation/operation");

  Operation.find({})
    .sort("name")
    .exec(function(err, operation) {
      if (err) {
        logger.logError("Erreur dans la récupération des opérations en base", "GET", req.headers, "/api-operation/operation");
      } else {
        res.json(operation);
      }
    });
});


router.get('/operation/:id', function (req, res) {
	console.log('Get request for an operation');

	Operation.findById(req.params.id)
		.exec(function (err, operation) {
			if (err) {
				console.log("Erreur dans la récupération d'une opération");
			} else {
				res.json(operation);
			}
		});
});



router.put('/operation/:id', function (req, res) {
	console.log('Update a operation');
	Operation.findByIdAndUpdate(req.params.id,
		{
			$set: {
				name: req.body.operationId,
				duree: req.body.duree,
				title: req.body.title,
				url: req.body.url,
				thumbnailUrl: req.body.thumbnailUrl
			}
		},
		{
			new: true
		},
		function (err, updatedOperation) {
			if (err) {
				console.log("Erreur dans la mise à jour de la Operation");
			} else {
				res.json(updatedOperation);
			}
		});
});

router.post('/operation', function (req, res) {
  console.log('Post a Operation : ' + req.body.operation);
  console.log(req.body)
	var operation = new Operation(req.body);
	operation.save(function (err, insertedOperation) {
		if (err) {
			console.log('Error saving a Operation');
		} else {
			res.json(insertedOperation);
		}
	});
});


router.delete('/operation/:id', function (req, res) {
	console.log('Remove an Operation');
	Operation.findByIdAndRemove(req.params.id, function (err, deletedOperation) {
		if (err) {
			console.log("Erreur dans la suppression de la Operation", err);
		} else {
			res.json(deletedOperation);
		}
	});
});

module.exports = router
