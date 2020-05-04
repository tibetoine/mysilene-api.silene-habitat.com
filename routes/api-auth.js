const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const request = require('request-promise-lite')
const Users = require('../models/users')
const ActiveDirectory = require('ad-promise')
const ActiveDirectoryMock = require('../mock/activedirectory')
const assert = require('assert')
const crypto = require('crypto')
const uuidv4 = require('uuid/v4')
require('dotenv').load()
var logger = require('../utils/logger')

const db = process.env.MONGO_DB
mongoose.Promise = global.Promise

var ldapConfig = {
    url: process.env.LDAP_URL,
    baseDN: process.env.LDAP_BASE_DN,
    username: process.env.LDAP_USERNAME,
    password: process.env.LDAP_PASSWORD
}
var ad = new ActiveDirectory(ldapConfig)
// var ad = new ActiveDirectoryMock(ldapConfig);

var buildBusinessError = (
    message,
    httpErrorCode,
    sileneErrorCode,
    correlationId
) => {
    if (message == null || message.length <= 0) {
        throw new Error("Le paramètre 'message' est requis")
    }

    if (sileneErrorCode == null) {
        throw new Error("Le paramètre 'sileneErrorCode' est requis")
    }
    if (!httpErrorCode || httpErrorCode == null) {
        httpErrorCode = 500
    }

    var error = {
        status: httpErrorCode,
        data: {
            sileneErrorCode: '4031',
            correlationCode: correlationId
        },
        message: message
    }

    return error
}
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
    res.send('api-auth works')
})
/**
 * Cherche un utilisateur dans l'AD à partir d'un login.
 * Si trouvé retourne un utilisateur sinon retourn NULL
 * En cas d'erreur throw une erreur
 * @param {*} login
 */
async function findAdUser(login) {
    let loginToTest = [login, login.substring(1), login.substring(2)]
    let user
    try {
        for (let index = 0; index < loginToTest.length; index++) {
            const element = loginToTest[index]
            console.log("Recherche de l'utilisateur : ", element)
            user = await ad.findUser(element)
            if (!user || Object.keys(user).length === 0) {
                console.log("Pas d'utilisateur trouvé avec le login ", element)
                logger.logInfo(
                    "Pas d'utilisateur trouvé avec le login ",
                    element
                )
            } else {
                /* C'est bon, on a trouvé l'utilisateur dans l'AD, on conserve son bon login. */
                console.log('Utilisateur trouvé avec le login ', element)
                return user
            }
        }
    } catch (error) {
        throw error
    }
    return user
}

router.post('/auth', async function(req, res) {
    var correlationId = uuidv4()
    // console.log(correlationId - 'Post Auth');

    if (!req.body.id) {
        res.status('400')
        res.send('Pas de login!')
        return
    }
    var userId = req.body.id.trim().toLowerCase()
    // userId --> enlever email ending au besoin
    // console.log("userId :" +  userId);
    userId = userId.replace('@silene-habitat.com', '')

    var userPassword = req.body.password
    if (!userId || !userPassword) {
        res.status('400')
        res.send('Il manque le login ou le mot de passe')
        return
    }
    let user = null

    try {
        user = await findAdUser(userId)
    } catch (error) {
        console.error(error)
        var error = buildBusinessError(
            "Erreur lors de la recherche de l'utilisateur dans l'ad.",
            403,
            40311,
            correlationId,
            error
        )
        res.status(403)
            .type('application/json')
            .send(error)
        return
    }
    /* Si l'utilisateur n'est pas trouvé dans l'ad */
    if (!user || Object.keys(user).length === 0) {
        // console.log('User: ' + userId + ' not found.');
        var error = buildBusinessError(
            'Utilisateur inconnu',
            403,
            40312,
            correlationId
        )
        logger.logError(
            'Utilisateur [' + userId + '] inconnu ',
            'POST',
            req.headers,
            '/api-auth/auth'
        )
        res.status(403).json(error)
        return
    }

    /* Récupération du login du user */
    userId = user.sAMAccountName

    console.log('authentification avec le user : ', userId)
    // console.log('authentification avec le pass : ', userPassword)

    let auth
    let finalUser = 'h4403\\'+userId
    try {
        auth = await ad.authenticate(
            finalUser,
            userPassword
        )        
    } catch (error) {
        console.log('Erreur d Auth : ', error )
        var error2 = buildBusinessError(
            "Impossible d'authentifier l'utilisateur [" + finalUser + ']',
            403,
            4032,
            correlationId
        )
        logger.logError(
            "Impossible d'authentifier l'utilisateur [" + finalUser + ']',
            'POST',
            req.headers,
            '/api-auth/auth',
            error
        )
        res.status(403).json(error2)
        return
    }

    if (auth) {
        // console.log('auth2', auth2)
        authSuccess(userId, req, correlationId, res)
    } else {
        var error = buildBusinessError(
            "Echec de l'authentification",
            403,
            4034,
            correlationId
        )
        res.status(403).json(error)
    }
})

module.exports = router

function authSuccess(userId, req, correlationId, res) {
    console.log('[OK] : ' + userId + ' is Authenticated!');
    logger.logSuccess(
        ' [ ' + userId + '] est Authentifié',
        'POST',
        req.headers,
        '/api-auth/auth'
    )
    /* 1 - Création d'un token */
    const buf = crypto.randomBytes(64)
    var token = buf.toString('hex')
    /* 2- Create or Update user et token en base*/
    //var updateObj = { token: token };
    // var updateObj = { $push: { tokens: token } };

    Users.findByIdAndUpdate(
        userId,
        { $push: { tokens: token } },
        { upsert: true, new: true },
        function(err, updatedUser) {
            if (err) {
                // console.log('Error saving a User : ' + userId + " avec le token : " + token);
                console.log('ERROR: ' + JSON.stringify(err))
                logger.logError(
                    "Problème de la création ou mise à jour de l'utilisateur en base [" +
                        userId +
                        ']',
                    'POST',
                    req.headers,
                    '/api-auth/auth',
                    err
                )
                var error = buildBusinessError(
                    "Erreur lors de l'authentification",
                    403,
                    4033,
                    correlationId
                )
                res.status(403).json(error)
            } else {
                console.log('[OK] : Token enregistré (ou mis à jour) en base pour ' + userId);
                logger.logSuccess(
                    'Token enregistré (ou mis à jour) en base pour ' + userId,
                    'POST',
                    req.headers,
                    '/api-auth/auth'
                )
                console.log({ _id: userId, token: token })
                res.json({ _id: userId, token: token })
                return
            }
        }
    )
}
