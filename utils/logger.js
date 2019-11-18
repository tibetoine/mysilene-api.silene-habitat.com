const log4js = require("log4js");

/* Configuration des logs */
log4js.configure({
  appenders: {
    mysilene: {
      type: "file",
      filename: "mysilene-api.log"
    }
  },
  categories: {
    default: {
      appenders: ["mysilene"],
      level: "debug"
    }
  }
});

module.exports = {
  express: log4js.connectLogger(log4js.getLogger("access"), {
    level: log4js.levels.INFO
  }),
  logApiAccess: function(method, header, apiEndpoint) {
    var info = "";
    if (header && header.authorization) {
      Info =
        "[ User : " +
        header.userid +
        " - Token : " +
        header.authorization +
        " ] [ Host : " +
        header.host +
        " ]";
    }
    log4js
      .getLogger("mysilene")
      .info("[Access]", method, apiEndpoint, "-", info);
  },
  logSuccess: function(message, method, header, apiEndpoint) {
    var info = "";
    if (header && header.authorization) {
      Info =
        "[ User : " +
        header.userid +
        " - Token : " +
        header.authorization +
        " ] [ Host : " +
        header.host +
        " ]";
    }
    log4js
      .getLogger("mysilene")
      .debug("[Success]", method, apiEndpoint, "-", info, message);
  },
  logError: function(message, method, header, apiEndpoint, error) {
    var info = "";
    if (header && header.authorization) {
      Info =
        "[ User : " +
        header.userid +
        " - Token : " +
        header.authorization +
        " ] [ Host : " +
        header.host +
        " ]";
    }
    log4js
      .getLogger("mysilene")
      .info("[Error]", method, apiEndpoint, "-", info, message, error);
  },
  logInfo: function(message, method, header, apiEndpoint) {
    var info = "";
    if (header && header.authorization) {
      Info =
        "[ User : " +
        header.userid +
        " - Token : " +
        header.authorization +
        " ] [ Host : " +
        header.host +
        " ]";
    }
    log4js
      .getLogger("mysilene")
      .info("[Info]", method, apiEndpoint, "-", info, message);
  },
  isDebug: function(category) {
    return log4js.levels.DEBUG.level >= category.level.level;
  }
};
