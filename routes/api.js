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
 * definitions:
 *   Contacts:
 *     properties:
 *       _id:
 *         type: string
 *       mail:
 *         type: string
 *       sn:
 *         type: string
 *       givenName:
 *         type: string
 *       thumbnailPhoto:
 *         type: string
 *       mobile:
 *         type: string
 *       telephoneNumber:
 *         type: string
 *       department:
 *         type: string
 *       otherTelephone:
 *         type: string
 *       sileneProcessus:
 *         type: string
 *       silenesst:
 *         type: string
 *       sileneserrefile:
 *         type: string
 *       sileneguidefile:
 *         type: string
 *       title:
 *         type: string
 */

/**
 * @swagger
 * /api/news:
 *   get:
 *     description: Retourne toutes les News Silène trié par date de publication décroissante
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
 * /api/contacts:
 *   get:
 *     description: Retourne l'ensemble des contacts de Silène
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
