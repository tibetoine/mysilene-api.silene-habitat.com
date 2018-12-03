const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const Operation = require('../models/operation')
require('dotenv').load()
var logger = require('../utils/logger');

const db = process.env.MONGO_DB
mongoose.Promise = global.Promise

router.get('/', (req, res) => {
  
  logger.logApiAccess("GET", req.headers, "/healthcheck");

	var mongoStatus = "KO"
	var apiStatus = "OK"
	
	// Check Mongo Status
	if (mongoose.connection.readyState === 1) {
		mongoStatus = "OK"
	}
	
	var myResponse = {
		status: apiStatus,
		mongo : mongoStatus
	};
	res.status(200).send(myResponse)
	
});

module.exports = router
