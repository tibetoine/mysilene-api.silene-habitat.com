const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const Shift = require('../models/shifts')
const dotenv = require('dotenv')
dotenv.config()

const db = process.env.MONGO_DB
mongoose.Promise = global.Promise
mongoose.set('useFindAndModify', false)

mongoose.connect(
    db,
    { useNewUrlParser: true, useUnifiedTopology: true },
    function(err) {
        if (err) {
            console.error('Erreur de connection à la base ' + err)
        }
    }
)

router.get('/', function(req, res) {
    console.error('Erreur de connection à la base ', err)
    res.send('api works')
})

router.get('/shifts', function(req, res) {
    Shift.find({})
        .sort('-date')
        .exec(function(err, shifts) {
            if (err) {
                console.error(
                    'Erreur dans la récupération des shifts en base',
                    'GET',
                    req.headers,
                    '/api-shifts/shifts'
                )
            } else {
                res.json(shifts)
            }
        })
})

router.get('/shifts/users/:id', function(req, res) {
    Shift.find({ $and: [{ userId: req.params.id }] })
        .sort('-date')
        .exec(function(err, shifts) {
            if (err) {
                console.error(
                    "Erreur dans la récupération des shifts de l'utilisateur xx en base",
                    'GET',
                    req.headers,
                    '/api-shifts/shifts/user/:id'
                )
            } else {
                res.json(shifts)
            }
        })
})

router.delete('/shifts/:id', function(req, res) {
    console.log('DELETE', req.headers, '/api-shift/shifts')
    var shiftId = req.params.id

    Shift.findById(shiftId, function(err, shift) {
        if (err) {
            console.error('Erreur dans la suppression du shift ' + shiftId, err)
            res.sendStatus(500)
            return
        }
        console.log(shift)
        if (!shift) {
            console.error("Ce shift n'existe pas ", shiftId)
            res.sendStatus(404)
            return
        }

        shift.remove(function(err) {
            if (err) {
                console.error(
                    'Erreur dans la suppression du shift ' + shiftId,
                    err
                )
                res.sendStatus(500)
                return
            }
            res.sendStatus(200)
            return
        })
    })
})

router.put('/shifts/users/:id', async function(req, res) {
    /* ATTENTION : TODO : Vérifier que l'utilisateur auth a le droit de modifier le userId passé en paramètre */

    console.log(req.body)
    let newRecord = {
        time: req.body.datetime,
        type: req.body.type,
        comment: req.body.comment
    }
    var updatedShift
    try {
        updatedShift = await Shift.findOneAndUpdate(
            {
                $and: [
                    { userId: req.params.id },
                    { date: req.body.date },
                    { blocked: false }
                ]
            },
            { $push: { details: newRecord } },
            { upsert: true, new: true }
        )
    } catch (error) {
        console.log('#0004 - Error update ', error)
        res.status(500).send('#0004 -Error update')
        return
    }
    if (updatedShift) {
        console.log(`Mise à jour d'un Shift : `, updatedShift)
        res.json(updatedShift)
        return
    }
})

module.exports = router
