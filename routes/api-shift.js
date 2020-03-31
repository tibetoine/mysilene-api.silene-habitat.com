const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const Shift = require('../models/shifts')
const Contacts = require('../models/contacts')
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

router.delete('/shifts/details/:id', async function(req, res) {
    // console.log('DELETE', req.headers, '/api-shift/details')
    var detailId = req.params.id
    let result
    try {
        result = await Shift.updateMany(
            {},
            { $pull: { details: { _id: mongoose.Types.ObjectId(detailId) } } }
        )
    } catch (error) {
        console.error(
            "Erreur dans la suppression d'un détail",
            'DELETE',
            req.headers,
            '/api-shifts/shifts/details/:id'
        )
        console.error(error)
        return
    }

    // console.log(`Suppression d'un détail : `, result)
    res.json(result)
    return
})

/**
 * Permet d'extraire en CSV les données pour le user passé en paramètre.
 */
router.get('/shifts/users/:id/extract', async function(req, res) {
    /* Get data for the user */
    let shifts
    try {
        shifts = await Shift.find({ $and: [{ userId: req.params.id }] }).sort({ userId: 1, date: -1 }).lean()
    } catch (err) {
        console.error(
            "Erreur dans la récupération des shifts de l'utilisateur xx en base",
            'GET',
            req.headers,
            '/api-shifts/shifts/user/:id'
        )
        res.status(500).send(
            '#0006 - Erreur dans la récupération des shifts en base'
        )
        return
    }

    /* Mapping des données. */
    let result = await _getExtractionArray(shifts)

    // console.log('result', result)
    res.xls('data.xlsx', result)

    return
})

/**
 * Permet d'extraire en CSV les données pour le user passé en paramètre.
 */
router.get('/shifts/extract', async function(req, res) {
    /* Get data for the user */
    let shifts
    try {
        shifts = await Shift.find({})
            .sort({ userId: 1, date: -1 })
            .lean()
    } catch (err) {
        console.error(
            "Erreur dans la récupération des shifts de l'utilisateur xx en base",
            'GET',
            req.headers,
            '/api-shifts/shifts/user/:id'
        )
        res.status(500).send(
            '#0007 - Erreur dans la récupération des shifts en base'
        )
        return
    }

    /* Mapping des données. */
    let result = await _getExtractionArray(shifts)

    // console.log('result', result)

    res.xls('data.xlsx', result)
    // res.sendStatus(200)
    return
})

/**
 * Prend les données MOngo en paramètre et retourne un objet JSON adapté à l'extract
 * @param {*} jsonShifts
 */
async function _getExtractionArray(jsonShifts) {
    let contacts = await _loadContacts()

    let result = []
    jsonShifts.forEach(element => {
        var contact = contacts.filter(
            contact => contact.sAMAccountName === element.userId
        )[0]

        if (!contact) {
            // console.log(element)
            console.error('Impossible de trouver le user  ', element.userId)
        }
        if (element.details) {
            element.details.forEach(detail => {
                return result.push({
                    user: element.userId,
                    mail: contact.mail,
                    nom: contact.sn ? contact.sn.toUpperCase() : contact.sn,
                    prenom: contact.givenName,
                    department: contact.department,
                    title: contact.title,
                    direction: contact.st,
                    date: element.date,
                    time: detail.time,
                    time_heures: _stringToHeures(detail.time),
                    time_minutes: _stringToMinutes(detail.time),
                    mois: element.date.split('-')[1],
                    semaine: ISO8601_week_no(new Date(element.date)),
                    type: detail.type,
                    commentaire: detail.comment
                })
            })
        }
    })

    return result
}

/**
 * Retourne les users en JSON
 * @param {*} jsonShifts
 */
async function _loadContacts() {
    /* Je charge dans un json, les users de la base contacts */
    let contacts
    try {
        contacts = await Contacts.find({})
            .sort('sn')
            .lean()
    } catch (err) {
        throw err
    }

    return contacts
}

/**
 *
 * @param {*} login
 */
function getUserDataFromAd(login) {}

function _stringToMinutes(minutesString) {
    if (!minutesString || minutesString.length === 0) {
        return 0
    }
    let min = 0
    let times = minutesString.split(':')
    min = parseInt(times[0]) * 60 + parseInt(times[1])
    return min
}

function _stringToHeures(minutesString) {
    if (!minutesString || minutesString.length === 0) {
        return 0
    }
    let min = 0
    let hours = 0
    let times = minutesString.split(':')
    min = parseInt(times[0]) * 60 + parseInt(times[1])
    hours = min / 60
    return hours
}

router.put('/shifts/users/:id', async function(req, res) {
    /* ATTENTION : TODO : Vérifier que l'utilisateur auth a le droit de modifier le userId passé en paramètre */

    // console.log(req.body)
    let newRecord = {
        _id: mongoose.Types.ObjectId(),
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
        console.error('#0004 - Error update ', error)
        res.status(500).send('#0004 -Error update')
        return
    }
    if (updatedShift) {
        // console.log(`Mise à jour d'un Shift : `, updatedShift)
        res.json(updatedShift)
        return
    }
})

function getNumWeek(MaDate) {
    var annee = MaDate.getFullYear() //année de la date à traiter

    let jj = MaDate.getDate()
    let mm = MaDate.getMonth()
    // console.log('jj : ', jj)
    // console.log('mm : ', mm)

    var NumSemaine = 0, //numéro de la semaine
        ListeMois = new Array(31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31)
    if ((annee % 4 == 0 && annee % 100 != 0) || annee % 400 == 0) {
        ListeMois[1] = 29
    }
    var TotalJour = 0
    for (cpt = 0; cpt < mm; cpt++) {
        TotalJour += ListeMois[cpt]
    }
    TotalJour += jj
    DebutAn = new Date(annee, 0, 1)
    var JourDebutAn
    JourDebutAn = DebutAn.getDay()
    if (JourDebutAn == 0) {
        JourDebutAn = 7
    }
    TotalJour -= 8 - JourDebutAn
    NumSemaine = 1
    NumSemaine += Math.floor(TotalJour / 7)
    if (TotalJour % 7 != 0) {
        NumSemaine += 1
    }
    return NumSemaine
}
function ISO8601_week_no(dt) {
    var tdt = new Date(dt.valueOf())
    var dayn = (dt.getDay() + 6) % 7
    tdt.setDate(tdt.getDate() - dayn + 3)
    var firstThursday = tdt.valueOf()
    tdt.setMonth(0, 1)
    if (tdt.getDay() !== 4) {
        tdt.setMonth(0, 1 + ((4 - tdt.getDay() + 7) % 7))
    }
    return 1 + Math.ceil((firstThursday - tdt) / 604800000)
}

module.exports = router
