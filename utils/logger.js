const log4js = require('log4js');

/* Configuration des logs */
log4js.configure({
  appenders: {
    console: {
      type: 'console', filename: 'mysilene-api-access.log'
    },
    access: {
      type: 'file', filename: 'mysilene-api-access.log'
    },
    mysilene: {
      type: 'file', filename: 'mysilene-api.log'
    },
  },
  categories: {
    default: {
      appenders: ['access','mysilene'], level: 'debug'
    }
  }
});


module.exports = { 
    express: log4js.connectLogger(log4js.getLogger('access'), {level: log4js.levels.INFO}),
    logApiAccess: function (method, header, apiEndpoint) {
      log4js.getLogger('access').info(
        "[Access] ", method, " ", apiEndpoint, " - ",        
        header
      )
    },
    isDebug: function(category) {
      return (log4js.levels.DEBUG.level >= category.level.level);
    }
  };



