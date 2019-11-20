var logger = require("../utils/logger");

const oracledb = require("oracledb");
const config = {
  user: process.env.ORACLE_USER,
  password: process.env.ORACLE_PASSWORD,
  connectString: process.env.ORACLE_CONNECT_STRING
};

module.exports = {
  /**
   * Récupérer la liste des résidences
   */
  getResidencesList: async function() {
    let conn;
    try {
      conn = await oracledb.getConnection(config);

      /**
       * ATTENTION : Bien utilisé le système de BIND VARIABLE d'oracle (et pas de la concatenation de String) pour éviter le SQL Injection
       */
      const result = await conn.execute(
        `select distinct e.code, e.libe
        from H4403_GL_00.ensemble e
        order by e.code
       `
      );

      return result;
    } catch (err) {
      logger.logError(
        "Erreur Oracle lors de la récupération de la liste des résidences",
        "GET",
        null,
        null,
        err
      );
      myLog("Ouch!", err);
    } finally {
      if (conn) {
        // conn assignment worked, need to close
        await conn.close();
      }
    }
  }
};
