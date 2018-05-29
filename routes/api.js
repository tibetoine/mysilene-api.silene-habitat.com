const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const request = require("request-promise-lite");
const News = require("../models/news");
const NewsSilene = require("../models/newsSilene");
const Contacts = require("../models/contacts");
const Users = require("../models/users");
var logger  = require('../utils/logger');
require("dotenv").load();

const db = process.env.MONGO_DB;
mongoose.Promise = global.Promise;

mongoose.connect(db, function(err) {
  if (err) {
    /*if(logger.isDebug(logger.system)) {
      logger.system.debug("debugログは、DEBUGレベルの時だけ呼びたい。");
    }*/
  
    logger.error.error("Erreur de connection à la base " , err);
    // console.error("Erreur de connection à la base " + err);
  }
});


router.get("/", function(req, res) {
  logger.error.error("Erreur de connection à la base " , err);
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
  
  logger.logApiAccess("GET", req.headers, "/api/news");

  NewsSilene.find({})
    .sort("-date")
    .exec(function(err, news) {
      if (err) {
        logger.logError("Erreur dans la récupération des news en base", "GET", req.headers, "/api/news");
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
  logger.logApiAccess("GET", req.headers, "/api/contacts");
  Contacts.find({})
    .sort({ sn: 1 })
    .exec(function(err, contacts) {
      if (err) {
        logger.logError("Erreur dans la récupération des contacts en base", "GET", req.headers, "/api/contacts");
      } else {
        res.json(contacts);
      }
    });
});
module.exports = router;
