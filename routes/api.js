const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const request = require("request-promise-lite");
const News = require("../models/news");
const NewsSilene = require("../models/newsSilene");
const Contacts = require("../models/contacts");
const Users = require("../models/users");
require("dotenv").load();

const db = process.env.MONGO_DB;
mongoose.Promise = global.Promise;

mongoose.connect(db, function(err) {
  if (err) {
    console.error("Erreur de connection à la base " + err);
  }
});


/**
   * @swagger
   * /:
   *   get:
   *     description: Returns the homepage
   *     responses:
   *       200:
   *         description: hello world
   */
router.get("/", function(req, res) {
  res.send("api works");
});

/**
   * @swagger
   * definitions:
   *   News:
   *     properties:
   *       _id:
   *         type: string
   *       type:
   *         type: string
   *       title:
   *         type: string
   *       date:
   *         type: string
   *       author:
   *         type: string
   *       image:
   *         type: string
   *       content:
   *         type: string
   *       link:
   *         type: string
   */

/**
   * @swagger
   * /news:
   *   get:
   *     description: Returns news
   *     tags:
   *      - News
   *     produces:
   *      - application/json
   *     responses:
   *       200:
   *         description: news
   */
router.get("/news", function(req, res) {
	console.log("Get request for news");
  
	News.find({}).exec(function(err, news) {
	  if (err) {
		console.log("Erreur dans la récupération des news");
	  } else {
		res.json(news);
	  }
	});
  });
  
  /**
   * @swagger
   * /newsSilene:
   *   get:
   *     description: Returns news
   *     tags:
   *      - News
   *     produces:
   *      - application/json
   *     responses:
   *       200:
   *         description: news
   */
  router.get("/newsSilene", function(req, res) {
	console.log("Get request for newsSilene");
  
	NewsSilene.find({})
	  .sort("-date")
	  .exec(function(err, news) {
		if (err) {
		  console.log("Erreur dans la récupération des news");
		} else {
		  res.json(news);
		}
	  });
  });
  
  
  
/**
   * @swagger
   * /contacts:
   *   get:
   *     description: Returns contacts
   *     tags:
   *      - Contacts
   *     produces:
   *      - application/json
   *     responses:
   *       200:
   *         description: contacts
   */
  router.get("/contacts", function(req, res) {
	console.log("Get request for contacts sorted");
	Contacts.find({})
	  .sort({ sn: 1 })
	  .exec(function(err, contacts) {
		if (err) {
		  console.log("Erreur dans la récupération des contacts");
		} else {
		  res.json(contacts);
		}
	  });
  });
module.exports = router;
