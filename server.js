const express = require('express');
const swaggerJSDoc = require('swagger-jsdoc');
const bodyParser = require('body-parser');
const path = require('path');

const mongoose = require('mongoose');
const Users = require('./models/users');

const api = require('./routes/api');
const apiAuth = require('./routes/api-auth');
const apiWeather = require('./routes/api-weather');

const port = process.env.EXPRESS_PORT || 3000;

const app = express();

/*Swagger ! */
// swagger definition
var swaggerDefinition = {
	info: {
	  title: 'Node Swagger API',
	  version: '1.0.0',
	  description: 'Demonstrating how to describe a RESTful API with Swagger',
	},
	host: 'localhost:3000',
	basePath: '/',
  };
  // options for the swagger docs
  var options = {
	// import swaggerDefinitions
	swaggerDefinition: swaggerDefinition,
	// path to the API docs
	apis: ['./**/routes/*.js','routes.js'],// pass all in array 
	};
  // initialize swagger-jsdoc
  var swaggerSpec = swaggerJSDoc(options);
/* Fin Swagger */
app.use(require('sanitize').middleware);


  
app.use(function (req, res, next) {
	
	// Website you wish to allow to connect
	
	var allowedOrigins = ['http://localhost:4200', 'http://192.168.1.34:4200', 'http://10.10.10.5:4200', 'http://siln-634.silene.local:4200', 'http://localhost:9000','http://localhost:8080'];
	//var allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');
	
	var origin = req.headers.origin;
	if (allowedOrigins.indexOf(origin) > -1) {
		res.setHeader('Access-Control-Allow-Origin', origin);
	}

	// Request methods you wish to allow
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

	// Request headers you wish to allow
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

	// Set to true if you need the website to include cookies in the requests sent
	// to the API (e.g. in case you use sessions)
	res.setHeader('Access-Control-Allow-Credentials', true);

	// Pass to next layer of middleware
	next();
});
app.use(express.static(path.join(__dirname, 'api-docs')));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/docs', function (req, res) {
	res.sendFile(__dirname + '/api-docs/index.html');
});

function isAuthenticated (req, res, next) {
    const db = process.env.MONGO_DB;
	mongoose.Promise = global.Promise;
	
	// console.log(req.headers)
    if (!req.headers['authorization']) {
		console.log('You must be logged in to access this API.')				
		return res.sendStatus(401)		
    }


	Users.find({token:req.headers['authorization']})
		.exec(function (err, user) {
			if (err) {
                console.log("Erreur Token inconnu. " + token);
                return res.sendStatus(401)
			} else {
                console.log(JSON.stringify(user))
			}
		});
	
	/* Vérification que le token est connu */
	return next()
}

// serve swagger 
app.get('/swagger.json', function (req, res) {
	res.setHeader('Content-Type', 'application/json');
	res.send(swaggerSpec);
});



/* Attention l'ordre est important ici  */
app.use('/api-auth', apiAuth);
app.use('/api-weather', apiWeather);
app.use(isAuthenticated); /* A partir de ce point toutes les routes nécessitent une authentification */
app.use('/api', api);

/* Gestion des erreurs */
/*app.use(function(err, req, res, next) {
	if (res.headersSent) {
		return next(err);
	  }
	  res.status(500);
	  res.render('error', { error: err });
});*/



app.listen(port, function () {
	console.log("Serv running on localhost : " + port);
});

