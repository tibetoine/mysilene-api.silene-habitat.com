const express = require('express')
const swaggerJSDoc = require('swagger-jsdoc')
const bodyParser = require('body-parser')
const path = require('path')

const ActiveDirectory = require('activedirectory')

const mongoose = require('mongoose')
const Users = require('./models/users')

const healthcheck = require('./routes/healthcheck')
const api = require('./routes/api')
const apiAdmin = require('./routes/apiAdmin')
const apiAuth = require('./routes/api-auth')
const apiWeather = require('./routes/api-weather')
const apiOperation = require('./routes/api-operation')
const apiDocs = require('./routes/api-docs')
const apiGedPrem = require('./routes/api-ged-prem')
const apiGedSharepoint = require('./routes/api-ged-sharepoint')
const apiVcard = require('./routes/api-vcard')
const apiShift = require('./routes/api-shift')
const apiInteressement = require('./routes/api-itt')
const apiAccess = require('./routes/api-access')

var json2xls = require('json2xls')

const port = process.env.EXPRESS_PORT || 3000

var logger = require('./utils/logger')

const app = express()

// app.use(logger.express);

/*Swagger ! */
// swagger definition
var swaggerDefinition = {
    info: {
        title: 'Node Swagger API',
        version: '1.0.0',
        description: 'Demonstrating how to describe a RESTful API with Swagger'
    },
    host: 'localhost:3000',
    basePath: '/'
}
// options for the swagger docs
var options = {
    // import swaggerDefinitions
    swaggerDefinition: swaggerDefinition,
    // path to the API docs
    apis: ['./**/routes/*.js', 'routes.js'] // pass all in array
}
// initialize swagger-jsdoc
var swaggerSpec = swaggerJSDoc(options)
/* Fin Swagger */
app.use(require('sanitize').middleware)

app.use(function(req, res, next) {
    // Website you wish to allow to connect

    var allowedOrigins = [
        'http://localhost:4200',
        'http://192.168.1.34:4200',
        'http://10.10.10.5:4200',
        'http://siln-634.silene.local:4200',
        'http://localhost:9000',
        'http://localhost:8080'
    ]
    //var allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');

    var origin = req.headers.origin
    if (allowedOrigins.indexOf(origin) > -1) {
        res.setHeader('Access-Control-Allow-Origin', origin)
    }

    // Request methods you wish to allow
    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, OPTIONS, PUT, PATCH, DELETE'
    )

    // Request headers you wish to allow
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-Requested-With,content-type'
    )

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true)

    // Pass to next layer of middleware
    next()
})
app.use(express.static(path.join(__dirname, 'api-docs')))

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, 'api-docs/index.html'))
})

/**
 * Permet de vérifier que l'utilisateur connecté est autorisé à accéder aux API sensibles.
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
function isAdmin(req, res, next) {
    if (!req.headers['userid']) {
        logger.logError('Pas de Header userid', '?', req.headers, '?')
        return res.sendStatus(401)
    }

    var ldapConfig = {
        url: process.env.LDAP_URL,
        baseDN: process.env.LDAP_BASE_DN,
        username: process.env.LDAP_USERNAME,
        password: process.env.LDAP_PASSWORD
    }

    var ad = new ActiveDirectory(ldapConfig)

    let groupName = '_Informatique'

    ad.getUsersForGroup(groupName, function(err, users) {
        if (err) {
            logger.logError('ERROR: ' + JSON.stringify(err))
            return res.sendStatus(401)
        }

        if (!users) {
            // console.log('Group: ' + groupName + ' not found.');
            logger.logError('Group: ' + groupName + ' not found.')
            return res.sendStatus(401)
        }

        var authorized
        users.forEach(element => {
            if (
                element &&
                element.sAMAccountName.trim().toLowerCase() ===
                    req.headers['userid']
            ) {
                authorized = 'authorized'
            }
        })

        if (authorized === 'authorized') {
            return next()
        } else {
            return res.sendStatus(401)
        }
    })
}

function isAuthenticated(req, res, next) {
    const db = process.env.MONGO_DB
    mongoose.Promise = global.Promise

    var userConnu = false

    // console.log(req.headers)
    if (!req.headers['authorization']) {
        logger.logError('Pas de Header authorization', '?', req.headers, '?')
        // console.log('You must be logged in to access this API.')
        return res.sendStatus(401)
    }

    var userToken = req.headers['authorization']
    // console.log("Recherche du token :" + userToken)
    Users.find({ $or: [{ token: userToken }, { tokens: userToken }] }).exec(
        function(err, user) {
            // console.log("CallBack Users Find- ", err, user )
            if (err) {
                // console.log("Erreur Token inconnu. " + token);
                logger.logError(
                    'Erreur Token inconnu',
                    '?',
                    req.headers,
                    '?',
                    err
                )
                return res.sendStatus(401)
            } else {
                // console.log(JSON.stringify(user))
            }

            if (user && user.length > 0) {
                // console.log("user[0]._id.trim().toLowerCase()", user[0]._id.trim().toLowerCase())
                // console.log("req.headers['userid']", req.headers['userid'])
                if (
                    user[0]._id &&
                    user[0]._id.length > 0 &&
                    user[0]._id.trim().toLowerCase() === req.headers['userid']
                ) {
                    // console.log("Auth : Ok le user " + req.headers['userid']+ " est reconnu.")
                    userConnu = true
                    return next()
                } else {
                    return res.sendStatus(401)
                }
            } else {
                return res.sendStatus(401)
            }
        }
    )
}

// serve swagger
app.get('/swagger.json', function(req, res) {
    res.setHeader('Content-Type', 'application/json')
    res.send(swaggerSpec)
})

app.use(json2xls.middleware)

/* Attention l'ordre est important ici  */
app.use('/api-auth', apiAuth)
app.use('/api-ged-prem', apiGedPrem)
app.use('/api-ged-sharepoint', apiGedSharepoint)
app.use('/api-vcard', apiVcard)
app.use('/api-weather', apiWeather)
app.use('/api-operation', apiOperation)
app.use('/healthcheck', healthcheck)
app.use(
    isAuthenticated
) /* A partir de ce point toutes les routes nécessitent une authentification */
app.use('/api', api)
app.use('/api-access', apiAccess)
app.use('/api-docs', apiDocs)
app.use('/api-shift', apiShift)
app.use('/api-itt', apiInteressement)

app.use(
    isAdmin
) /* A partir de ce point toutes les routes nécessitent une autorisation de niveau Administrateur (Groupe _Informatique) */
app.use('/api-admin', apiAdmin)

/* Gestion des erreurs */
/*app.use(function(err, req, res, next) {
	if (res.headersSent) {
		return next(err);
	  }
	  res.status(500);
	  res.render('error', { error: err });
});*/

app.listen(port, function() {
    console.log('Serv running on localhost : ' + port)
})
