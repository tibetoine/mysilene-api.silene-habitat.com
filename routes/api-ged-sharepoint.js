const express = require("express");
const router = express.Router();
var logger = require("../utils/logger");
const rp = require("request-promise");
const helper = require("../helper/helper");

const spauth = require("node-sp-auth");

const sharepointPatrimoineURI = process.env.SHAREPOINT_BASE_URL + "/patrimoine";
const sharepointAuth = () =>
  spauth.getAuth(sharepointPatrimoineURI, {
    username: process.env.SHAREPOINT_USERNAME,
    password: process.env.SHAREPOINT_PASSWORD,
    domain: process.env.SHAREPOINT_DOMAIN
  });

const filterExtension = ["doc", "docx", "pdf"];
const filterType = [153, 94];
/**
 * @swagger
 * /api-ged-sharepoint/residences:
 *   get:
 *     description: Retourne la liste des résidences connues des librairies Sharepoint sur le site "<isidoor>/patrimoine/"
 *     tags:
 *      - Residences
 *     produces:
 *      - application/json
 *     responses:
 *       200:
 *         description: Retourne la liste des residences avec l'id de résidence et l'URL vers la(ou les) librairie(s) associée(s).
 */
router.get("/residences", async (req, res) => {
  logger.logApiAccess("GET", req.headers, "/api-ged-sharepoint/residences/");
  logger.logInfo(
    "Récupération de la liste des résidences",
    "GET",
    req.headers,
    "/api-ged-sharepoint/residences"
  );

  var jsonResidenceList = { residences: [] };
  /* 1/ Récupération des résidences via le helper */
  var result = await helper.getResidencesList();

  //console.log(result)
  if (result.rows && result.rows.length !== 0) {
    /* Build Json to return  */
    result.rows.forEach(element => {
      let jsonElement = {
        residenceId: element[0],
        residenceName: element[1],
        libraries: []
      };
      jsonResidenceList["residences"].push(jsonElement);
    });
  }

  const url = process.env.SHAREPOINT_BASE_URL + "/patrimoine/_api/Web/Lists";
  var list = await sharepointAuth().then(auth =>
    rp.get({
      ...auth.options,
      headers: { ...auth.headers, Accept: "application/json;odata=verbose" },
      uri: encodeURI(url)
    })
  );

  var jsonList = JSON.parse(list);

  if (
    jsonList &&
    jsonList.d &&
    jsonList.d.results &&
    jsonList.d.results.length > 0
  ) {
    // console.log('yeah')
    jsonList.d.results.forEach(element => {
      /* /!\ Attention c'est important que l'instance de regex soit "neuve" à chaque test (Sinon on cherche l'occurence suivante) */
      let regex = /(\d{4})/gi;
      var array = element.Title.match(regex);
      if (array != null) {
        let residenceId = array[0];
        if (residenceId.startsWith("2")) residenceId = array[1];
        if (typeof residenceId !== "undefined") {
          let newElement = {
            libraryTitle: element.Title,
            libraryURL: element.EntityTypeName.replace(/_x0020_/g, " ")
          };
          var jsonResidence = jsonResidenceList.residences.find(
            item => item.residenceId === residenceId
          );
          if (!jsonResidence) {
            jsonResidence = {
              residenceId: residenceId,
              residenceName: "XXX (non trouvé dans PREM)",
              libraries: []
            };
            jsonResidenceList["residences"].push(jsonResidence);

            console.log("residence pas trouvée avec l id : ", residenceId);
          }
          jsonResidence.libraries.push(newElement);
        }
      }
    });
  }

  // console.log(list)

  res.json(jsonResidenceList);
});

/**
 * @swagger
 * /api-ged-sharepoint/residences/:id/docs:
 *   get:
 *     description: Retourne la liste des documents Sharepoint liés à une librairie
 *     tags:
 *      - Residences
 *     produces:
 *      - application/json
 *     responses:
 *       200:
 *         description: Retourne la liste des residences avec l'id de résidence et l'URL vers la(ou les) librairie(s) associée(s).
 */
router.get("/residences/:id/docs", async (req, res) => {
  /* Récupération de (ou des) libraryName */
  var libraryNames = req.query.libraryNames;

  let libraryNamesArray = libraryNames.split(",");
  console.log(libraryNamesArray);

  // `http://spsshp04:8081/patrimoine/_api/web/GetFolderByServerRelativeUrl('0023R4%20%20Trbale')/Files`

  var jsonResponse = await getDocsFromUrl(libraryNamesArray);

  console.log("yeah", jsonResponse);

  res.json(jsonResponse);
});

async function getDocsFromUrl(urlArray) {
  var temp = false;
  var jsonResponse = { result: [] };
  for (const element of urlArray) {
    const url =
      process.env.SHAREPOINT_BASE_URL +
      "/patrimoine/_api/Web/GetFolderByServerRelativeUrl('" +
      element +
      "')/Files?$expand=ListItemAllFields";
    var list = await sharepointAuth().then(auth =>
      rp.get({
        ...auth.options,
        headers: { ...auth.headers, Accept: "application/json;odata=verbose" },
        uri: encodeURI(url)
      })
    );

    /* Parser la list pour créer une réponse JSON avec les documents */

    if (!list) {
      return null;
    }
    var jsonList = JSON.parse(list);
    if (
      jsonList &&
      jsonList.d &&
      jsonList.d.results &&
      jsonList.d.results.length > 0
    ) {
      var documents = jsonList.d.results;
      var filteredDocuments = documents.filter(document => {
        /* Si le document est sensible on ne le montre pas */
        if (document.ListItemAllFields.Sensible) {
          return false;
        }

        /* On filtre l'extension */
        if (!filterExtension.includes(document.Name.split(".").pop())) {
          return false;
        }

        /* On filtre sur le type */
        if (!document.ListItemAllFields.SileneDocumentType || !filterType.includes(document.ListItemAllFields.SileneDocumentType.WssId)) {
          return false;
        } 

        return true;
      });

      filteredDocuments.forEach(element => {
        jsonResponse.result.push({
          documentName: element.Name,
          link: element.LinkingUrl,
          type: element.ListItemAllFields.SileneDocumentType
            ? element.ListItemAllFields.SileneDocumentType.WssId
            : null
        });
      });
    }

    /* Filtrer la liste par type métier et par extension (docx, doc, pdf, excel ?) */
    if (!temp) {
      console.log(jsonResponse);
      temp = true;
    }
  }
  return jsonResponse;
}
/**
 * @swagger
 * /api-ged-sharepoint/docs:
 *   get:
 *     description: Retourne un document à partir de son Id et de sa version.
 *     tags:
 *      - Docs
 *     produces:
 *      - application/json
 *     responses:
 *       200:
 */
router.get("/docs/:id", (req, res) => {});

function myLog(texte, objects) {
  let log = process.env.LOG;
  if (log === "ON") console.log(texte, objects);
}
module.exports = router;
