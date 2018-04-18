const express = require('express')
const router = express.Router()
const DarkSky = require('dark-sky')
const mongoose = require('mongoose')
const Weather = require('../models/weather')
require('dotenv').load()
const forecast = new DarkSky(process.env.DARK_SKY_KEY)

const db = process.env.MONGO_DB
mongoose.Promise = global.Promise

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
      console.log('Erreur creating Weather')
      console.log('ERROR : ' + JSON.stringify(err))
    }
    if (lastWeather) {
      //console.log("Dernier Weather : " + lastWeather._id + " à la date du ");
      //console.log("Record time :" + lastWeather.toObject().currently.time)
      //console.log("Current time :" + new Date().getTime())
      //console.log("Date now :" +Math.round(Date.now() / 1000))
      //console.log(Math.round(Date.now() / 1000) - lastWeather.toObject().currently.time)
      var secondDepuisDernierRecord =
        Math.round(Date.now() / 1000) - lastWeather.toObject().currently.time
      if (secondDepuisDernierRecord > 3600) {
        forecast
          .latitude(lat)
          .longitude(lon)
          .units(units)
          .language('fr')
          .exclude('minutely,hourly,flags')
          .get()
          .then(response => {
            /* 2. Enregistre en base */
            var weather = new Weather(response)
            //Weather.create(JSON.stringify(response), function (err, weather) {
            weather.save(function(err, savedWeather) {
              if (err) {
                console.log('Erreur creating Weather')
                console.log('ERROR : ' + JSON.stringify(err))
              }
				console.log('Insertion de Weather et Retourne un weather tout frais !');
              res.send(weather)
            })
          })
          .catch(error => {
            res.send(error)
          })
      } else {
        console.log('Je retourne le Weather en Cache !')
        res.send(lastWeather)
      }
    }
  })
})

module.exports = router
