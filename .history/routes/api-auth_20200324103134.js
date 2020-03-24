const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const request = require('request-promise-lite')
const Users = require('../models/users')
const ActiveDirectory = require('activedirectory')
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
 * @swagger
 * /api-auth/auth:
 *   post:
 *     description: Permet d'authentifier un utilisateur via login et mot de passe
 *     tags:
 *      - Auth
 *     produces:
 *      - application/json
 *     parameters:
 *       - name: id
 *         description: id est le nom utilisé pourla connexion à l'AD Silène
 *         in: formData
 *         required: true
 *         type: string
 *       - name: password
 *         description: User's password.
 *         in: formData
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Retourne un Token de connexion.
 */
router.post('/auth', function(req, res) {
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

    // 1- Authentification sur l'AD.
    // console.log("Recherche dans l'ad de sAMAccountName = " + userId)
    ad.findUser(userId, function(err, user) {
        // console.log("flag : " + res);
        if (err) {
            // console.log('ERROR: ' + JSON.stringify(err));
            var error = buildBusinessError(
                "Erreur lors de la recherche de l'utilisateur dans l'ad.",
                403,
                40311,
                correlationId,
                err
            )
            res.status(403)
                .type('application/json')
                .send(error)
            return
        }
        if (!user) {
            userId = userId.substring(1)
            ad.findUser(userId, function(err1, user1) {
                if (err1) {
                    // console.log('ERROR: ' + JSON.stringify(err));
                    var error = buildBusinessError(
                        "Erreur lors de la recherche de l'utilisateur dans l'ad.",
                        403,
                        40311,
                        correlationId,
                        err1
                    )
                    res.status(403)
                        .type('application/json')
                        .send(error)
                    return
                }
                if (!user1) {
                    userId = userId.substring(1)
                    ad.findUser(userId, function(err2, user2) {
                        if (err2) {
                            // console.log('ERROR: ' + JSON.stringify(err));
                            var error = buildBusinessError(
                                "Erreur lors de la recherche de l'utilisateur dans l'ad.",
                                403,
                                40311,
                                correlationId,
                                err2
                            )
                            res.status(403)
                                .type('application/json')
                                .send(error)
                            return
                        }
                        if (!user2) {
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
                    })
                }
            })
        } else {
            /* On cherche à authentifier l'utilisateur */
            ad.authenticate(
                userId + '@silene-habitat.com',
                userPassword,
                function(err, auth) {
                    // console.log("Tentative d'authent pour " + userId + "@silene-habitat.com avec le mdp : xxx");
                    if (err) {
                        // console.log("erreur d'authent --> Nouvelle tentative sur @silene.local. ");
                        ad.authenticate(
                            userId + '@silene.local',
                            userPassword,
                            function(err2, auth2) {
                                // console.log("Tentative d'authent pour " + userId + "@silene.local avec le mdp : xxx");
                                if (err2) {
                                    // console.log('err2', err2)
                                    var error = buildBusinessError(
                                        "Impossible d'authentifier l'utilisateur",
                                        403,
                                        4032,
                                        correlationId
                                    )
                                    logger.logError(
                                        "Impossible d'authentifier l'utilisateur [" +
                                            userId +
                                            ']',
                                        'POST',
                                        req.headers,
                                        '/api-auth/auth'
                                    )
                                    res.status(403).json(error)
                                    return
                                }
                                if (auth2) {
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
                            }
                        )
                    }

                    if (auth) {
                        authSuccess(userId, req, correlationId, res)
                    }
                    if (!err && !auth) {
                        var error = buildBusinessError(
                            "Echec de l'authentification",
                            403,
                            4034,
                            correlationId
                        )
                        res.status(403).json(error)
                    }
                }
            )
        }
        // console.log(JSON.stringify(user));
        /* On sort */
        // res.json(user);
    })
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
            user = await ad.findUser(element)
            if (!user) {
                logger.logInfo(
                    "Pas d'utilisateur trouvé avec le login ",
                    element
                )
            } else {
                /* C'est bon, on a trouvé l'utilisateur dans l'AD, on conserve son bon login. */
                return user
            }
        }
    } catch (error) {
        throw error
    }
    return user
}

router.post('/auth2', function(req, res) {
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
        user = findAdUser(userId)
    } catch (error) {
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

    /* Récupération du login du user */
    console.log(user)
})

module.exports = router

function authSuccess(userId, req, correlationId, res) {
    // console.log('[OK] : ' + userId + ' is Authenticated!');
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
                // console.log('[OK] : Token enregistré (ou mis à jour) en base pour ' + userId);
                logger.logSuccess(
                    'Token enregistré (ou mis à jour) en base pour ' + userId,
                    'POST',
                    req.headers,
                    '/api-auth/auth'
                )
                res.json({ _id: userId, token: token })
            }
        }
    )
}
