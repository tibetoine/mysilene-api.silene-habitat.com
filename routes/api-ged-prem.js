const express = require("express");
const router = express.Router();
var logger = require("../utils/logger");
const helper = require("../helper/helper")

const oracledb = require("oracledb");
const config = {
  user: process.env.ORACLE_USER,
  password: process.env.ORACLE_PASSWORD,
  connectString: process.env.ORACLE_CONNECT_STRING
};

/**
 * @swagger
 * /api-ged-prem/residences:
 *   get:
 *     description: Retourne la liste des documents associés à la résidence dont le numéro est passé en commentaire.
 *     tags:
 *      - Weather
 *     produces:
 *      - application/json
 *     responses:
 *       200:
 *         description: https://darksky.net/dev/docs#/dev/docs#response-format
 */
router.get("/residences/:id/docs", (req, res) => {
  logger.logApiAccess("GET", req.headers, "/api-ged-prem/residences/:id/docs");
  logger.logInfo(
    "Récupération de la liste des documents de la résidence : " + req.params.id,
    "GET",
    req.headers,
    "/api-ged-prem/residences/:id/docs"
  );

  var jsonResult = { result: [] };

  getAllDocsOfResidence(req.params.id).then(function(result) {
    if (result.rows && result.rows.length !== 0) {
      /* Build Json to return  */
      result.rows.forEach(element => {
        let jsonElement = {
          itemId: element[0],
          versionId: element[5],
          fileName: element[1],
          createDate: element[2],
          type: element[4],
          link: "/api-ged-prem/docs/" + element[0] + "?versionid=" + element[5]
        };
        jsonResult["result"].push(jsonElement);
      });
    }
    res.json(jsonResult);
  });
});

router.get("/residences", (req, res) => {
  myLog("Récupération de la liste des résidences");
  var jsonResult = { result: [] };
  helper.getResidencesList().then(function(result) {
    // console.log(result)
    if (result.rows && result.rows.length !== 0) {
      /* Build Json to return  */
      result.rows.forEach(element => {
        let jsonElement = {
          residenceId: element[0],
          residenceName: element[1]
        };
        jsonResult["result"].push(jsonElement);
      });
    }
    res.json(jsonResult);
  });
});

/**
 * @swagger
 * /api-ged-prem/docs:
 *   get:
 *     description: Retourne un document à partir de son Id et de sa version.
 *     tags:
 *      - Docs
 *     produces:
 *      - application/json
 *     responses:
 *       200:
 */
router.get("/docs/:id", (req, res) => {
  if (!req.query.versionid || req.query.versionid == "") {
    res.status(422).send({
      error: "Le paramètre versionid est requis. (versionid is required)"
    });
  }
  let versionid = req.query.versionid;
  let docid = req.params.id;

  /**
   * Je récupère la liste des catégories autorisées
   */
  var catid;
  var fileName;
  /* Je récupère la catégorie du document à partir de l'identifiant de document et de sa version. */
  getDocInfo(docid).then(function(result) {
    myLog(result);
    if (!result || !result.rows || result.rows.length === 0) {
      res.status(204).send({
        error: "Aucun document associé à ces ids."
      });
    }
    /* Récupération de la catégorie ID */
    catid = result.rows[0][0];
    fileName = result.rows[0][1];

    /* Je récupère la liste des catégories autorisées */
    getAllowedCategories().then(function(resultCats) {
      let accessGranted = false;
      resultCats.rows.forEach(element => {
        myLog("element[0] : ", element[0]);
        myLog("catid : ", catid);
        if (element[0] === catid) {
          myLog("Access Granted");
          accessGranted = true;
        } else {
          myLog("Access pas Granted");
        }
      });

      if (!accessGranted) {
        myLog("Voici la catégorie trouvée pour ce document : ", catid);
        myLog(accessGranted);
        res.status(403).send({
          error:
            "Ce document n'est pas accessible par l'API. Veuillez contacter le service informatique Silène avec le code OneNote : #API0001."
        });
      } else {
        myLog("Début envoi doc");
        var http = require("http");

        let url =
          "http://spsihb01/ged.prod//geddocument.aspx?itemid=" +
          docid +
          "&versid=" +
          versionid;

        var request = http.get(url, function(response) {
          var data = [];

          response.on("data", function(chunk) {
            data.push(chunk);
          });

          response.on("end", function() {
            data = Buffer.concat(data);
            myLog(
              "requested content length: ",
              response.headers["content-length"]
            );
            if (!data || data.length === 0) {
              /* Retourne une erreur au client */
              res.status(204).send({
                error: "Aucun document récupéré avec ces ids."
              });
            } else {
              /* Retourne le document au client */
              myLog("parsed content length: ", data.length);
              res.writeHead(200, {
                "Content-Type": "application/pdf",
                "Content-Disposition": "attachment; filename=" + fileName,
                "Content-Length": data.length
              });
              res.end(data);
            }
          });
        });

        request.end();
      }
    });
  });
});

/**
 * Récupère des informations sur un document à partir de son identifiant.
 * @param {*} docid identifiant de document
 */
async function getDocInfo(docid) {
  let conn;
  try {
    conn = await oracledb.getConnection(config);

    /**
     * ATTENTION : Bien utilisé le système de BIND VARIABLE d'oracle (et pas de la concatenation de String) pour éviter le SQL Injection
     */
    const result = await conn.execute(
      `select CATID, TITRE 
      from kweb_items ki 
      where ki.itemid = :id
     `,
      [docid]
    );

    return result;
  } catch (err) {
    myLog("Ouch!", err);
  } finally {
    if (conn) {
      // conn assignment worked, need to close
      await conn.close();
    }
  }
}



/**
 * Récupère la liste des catégories autorisées pour lecture de documents depuis l'API
 */
async function getAllowedCategories() {
  let conn;
  try {
    conn = await oracledb.getConnection(config);

    /**
     * ATTENTION : Bien utilisé le système de BIND VARIABLE d'oracle (et pas de la concatenation de String) pour éviter le SQL Injection
     */
    const result = await conn.execute(
      `
    select KWEB_CATEGORIES_CATID from H4403_GL_00.SILN_PARAMETRES_API_GED
    `
    );

    myLog("Number of rows returned: " + result.rows.length);
    myLog(result);
    myLog(result.rows);

    return result;
  } catch (err) {
    myLog("Ouch!", err);
  } finally {
    if (conn) {
      // conn assignment worked, need to close
      await conn.close();
    }
  }
}
/**
 * Récupère l'ensemble des documents d'une résidence (et batiment, montée, lots associés)
 * @param {*} residenceId un identifiant de résidence (Exemple : '0033')
 */
async function getAllDocsOfResidence(residenceId) {
  let conn;
  try {
    conn = await oracledb.getConnection(config);

    /**
     * ATTENTION : Bien utilisé le système de BIND VARIABLE d'oracle (et pas de la concatenation de String) pour éviter le SQL Injection
     */
    const result = await conn.execute(
      `SELECT distinct (ki.ITEMID), ki.titre,kiv.CREATEDATE,  kcat.TITLE catégorie ,  kwf.name répertoire , kiv.versid
      FROM kweb_items ki, kweb_itemversion kiv, kweb_versattributes kva, kweb_versattributes kva2, kweb_files kf 
      ,kweb_attributes ka,kweb_attributes ka2,kweb_typeitems kt ,kweb_categories kcat , kweb_folders kwf
      where ki.itemid = kiv.itemid and kiv.versid = kva.versid and kiv.versid = kva2.versid and kf.reftable = 'KWEB_VERSATTRIBUTES' and kva.versattid = kf.refid
      AND kva.attributeid = ka.attributeid and ka.typeattid = '1' 
      and ki.typeid > 1000 
      and kva2.attributeid = ka2.attributeid and ka2.typeattid != '1' and ki.typeid = kt.typeid
      AND kcat.catid = ki.catid
      and kwf.folderid = ki.folderid 
      and kcat.catid = '55'
      and kwf.folderid != '10003' 
      and kva2.value like ''||:id||'%'
     `,
      [residenceId]
    );

    // myLog("Number of rows returned: " + result.rows.length);
    // myLog(result.rows);

    return result;
  } catch (err) {
    logger.logError(
      "Erreur Oracle lors de la récupération des résidences",
      "GET",
      null,
      null,
      err
    );
  } finally {
    if (conn) {
      // conn assignment worked, need to close
      await conn.close();
    }
  }
}

function myLog(texte, objects) {
  let log = process.env.LOG;
  if (log === "ON") console.log(texte, objects);
}
module.exports = router;
