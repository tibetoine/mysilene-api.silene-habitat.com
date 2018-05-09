const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const api = require('./routes/api');
const apiAuth = require('./routes/api-auth');
const apiWeather = require('./routes/api-weather');

const port = process.env.EXPRESS_PORT || 3000;

const app = express();

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
app.use(express.static(path.join(__dirname, 'dist')));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use('/api', api);
app.use('/api-auth', apiAuth);
app.use('/api-weather', apiWeather);

/* Gestion des erreurs */
/*app.use(function(err, req, res, next) {
	if (res.headersSent) {
		return next(err);
	  }
	  res.status(500);
	  res.render('error', { error: err });
});*/

app.get('*', (req, res) => {
	res.sendFile(path.join(__dirname, 'dist/index.html'));
});

app.listen(port, function () {
	console.log("Serv running on localhost : " + port);
});

