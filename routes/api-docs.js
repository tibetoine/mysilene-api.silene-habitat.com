const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const Docs = require('../models/docs')
require('dotenv').load()
var logger = require('../utils/logger');

const db = process.env.MONGO_DB
mongoose.Promise = global.Promise

/**
 * @swagger
 * /api-weather/weather:
 *   get:
 *     description: Retourne un objet Json Weather depuis l'API Public DARK_SKY. (Si un appel a été fait il y a moins d'1 heure, c'est le Weather en cache Mongo qui est retourné)
 *     tags:
 *      - Weather
 *     produces:
 *      - application/json
 *     responses:
 *       200:
 *         description: https://darksky.net/dev/docs#/dev/docs#response-format
 */
router.get('/docs', (req, res) => {
  
  logger.logApiAccess("GET", req.headers, "/api/docs");

  Docs.find({})
    .sort("-date")
    .exec(function(err, docs) {
      if (err) {
        logger.logError("Erreur dans la récupération des docs en base", "GET", req.headers, "/api/docs");
      } else {
        res.json(docs);
      }
    });
})

module.exports = router
