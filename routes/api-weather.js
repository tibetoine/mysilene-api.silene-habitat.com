const express = require('express')
const router = express.Router()
const DarkSky = require('dark-sky')
const mongoose = require('mongoose')
const Weather = require('../models/weather')
require('dotenv').load()
const forecast = new DarkSky(process.env.DARK_SKY_KEY)
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
router.get('/weather', (req, res) => {
  let lat = '47.2734979'
  let lon = '-2.213848'
  let units = 'si'

  /* Pour limiter le nombre d'appel à Dark_Sky. */

  /* Récupère le dernier élément enregistré en base pour savoir si on fait un nouvel appel à Dark_Sky */

  Weather.findOne({}, {}, { sort: { 'currently.time': -1 } }, function(
    err,
    lastWeather
  ) {
    if (err) {
      logger.logError("Erreur creating Weather", "GET", req.headers, "/api-weather/weather", err);
    }
    var dateLastWeather = 0
    if (lastWeather) {
      dateLastWeather = lastWeather.toObject().currently.time
    }
    //console.log("Dernier Weather : " + lastWeather._id + " à la date du ");
    //console.log("Record time :" + lastWeather.toObject().currently.time)
    //console.log("Current time :" + new Date().getTime())
    //console.log("Date now :" +Math.round(Date.now() / 1000))
    //console.log(Math.round(Date.now() / 1000) - lastWeather.toObject().currently.time)
    var secondDepuisDernierRecord =
      Math.round(Date.now() / 1000) - dateLastWeather
    if (secondDepuisDernierRecord > 3600) {
      forecast
        .latitude(lat)
        .longitude(lon)
        .units(units)
        .language('fr')
        .exclude('minutely,flags')
        .get()
        .then(response => {
          /* 2. Enregistre en base */
          var weather = new Weather(response)
          //Weather.create(JSON.stringify(response), function (err, weather) {
          weather.save(function(err, savedWeather) {
            if (err) {
              logger.logError("Erreur creating Weather", "GET", req.headers, "/api-weather/weather", err);
              // console.log('Erreur creating Weather')
              // console.log('ERROR : ' + JSON.stringify(err))
            }           
            logger.logSuccess("Insertion de Weather et Retourne un weather tout frais !", "GET", req.headers, "/api-weather/weather");
            res.send(weather)
          })
        })
        .catch(error => {
          res.send(error)
        })
    } else {
      logger.logSuccess("Je retourne le Weather en Cache !", "GET", req.headers, "/api-weather/weather");
      res.send(lastWeather)
    }
  })
})

module.exports = router
