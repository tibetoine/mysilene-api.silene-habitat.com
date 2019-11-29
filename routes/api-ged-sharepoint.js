const express = require("express");
const router = express.Router();
var logger = require("../utils/logger");
const rp = require("request-promise");
const helper = require("../helper/helper");

const spauth = require("node-sp-auth");

const SHAREPOINT_PATRIMOINE_URI =
  process.env.SHAREPOINT_BASE_URL + "/patrimoine";
const sharepointAuth = () =>
  spauth.getAuth(SHAREPOINT_PATRIMOINE_URI, {
    username: process.env.SHAREPOINT_USERNAME,
    password: process.env.SHAREPOINT_PASSWORD,
    domain: process.env.SHAREPOINT_DOMAIN
  });

var extToMimes = {
  doc: "application/msword",
  docx:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
  ppt: "application/vnd.ms-powerpoint",
  pptx:
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  tif: "image/tiff",
  tiff: "image/tiff",
  dwg: "application/dwg",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  bmp: "image/bmp",
  gif: "image/gif",
  png: "image/png"
};

/* TODO : DOcumentation, comment récupérer l'identifiant d'un type de document ? */
/* [J'ai pas trouvé mieux] Pour récupérer les ID il faut faire un appel à l'API sharepoint du type : http://spsshp04:8081/patrimoine/_api/web/GetFolderByServerRelativeUrl('Planothque')/Files?$expand=ListItemAllFields (Voir Postman) */
const filterType = {
  153: "Devis",
  94: "CCTP",
  1355: "Plan - Masse",
  1354: "Plan - Cadastral",
  1356: "Plan - Architectural",
  1368: "Plan - Réseau",
  1419: "Plan - Codification",
  1357: "Plan - Topographique"
};
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
  // console.log("libraryNamesArray", libraryNamesArray);

  // `http://spsshp04:8081/patrimoine/_api/web/GetFolderByServerRelativeUrl('0023R4%20%20Trbale')/Files`

  var jsonResponse = { result: [] };
  await getDocsFromUrlArray(libraryNamesArray, jsonResponse);
  // await getDocsFromPlanotheque(jsonResponse, req.params.id);

  /* Récupération des documents dans la planothèque */

  // console.log("yeah", jsonResponse);

  res.json(jsonResponse);
});


/**
 * @swagger
 * /api-ged-sharepoint/residences/:id/plans:
 *   get:
 *     description: Retourne la liste des plans Sharepoint
 *     tags:
 *      - Residences
 *     produces:
 *      - application/json
 *     responses:
 *       200:
 *         description: Retourne la liste des plans d'une résidence
 */
router.get("/residences/:id/plans", async (req, res) => {
  var jsonResponse = { result: [] };
  await getDocsFromPlanotheque(jsonResponse, req.params.id); 
  res.json(jsonResponse);
});


/**
 *Itère sur les URLs connu et va ensuite chercher les documents associés.
 * @param {*} urlArray
 */
async function getDocsFromUrlArray(urlArray, jsonResponse) {
  for (const anUrl of urlArray) {
    await getDocsFromUrl(anUrl, jsonResponse);
  }

  return jsonResponse;
}

/**
 * Récupère les documents à partir d'une URL
 * @param {*} url
 */
async function getDocsFromUrl(url, jsonResponse) {
  const constructedUrl =
    process.env.SHAREPOINT_BASE_URL +
    "/patrimoine/_api/Web/GetFolderByServerRelativeUrl('" +
    url +
    "')/Files?$expand=ListItemAllFields";
  var list = await sharepointAuth().then(auth =>
    rp.get({
      ...auth.options,
      headers: { ...auth.headers, Accept: "application/json;odata=verbose" },
      uri: encodeURI(constructedUrl)
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
    /* On filtre les documents */
    var filteredDocuments = documents.filter(filterDocs);

    /* Construction de la réponse. */
    const responseDocuments = filteredDocuments.map(maperDocs);

    /*console.log("-- Je fusionne 2 tableaux --");
    console.log("Tableau 1 : ", jsonResponse.result);
    console.log("Tableau 2 : ", responseDocuments);*/
    Array.prototype.push.apply(jsonResponse.result, responseDocuments);
  }
}

/**
 *
 * @param {*} urlArray
 */
async function getDocsFromPlanotheque(jsonResponse, residenceId) {
  /* Liste des documents de la planothèque */
  const url =
    process.env.SHAREPOINT_BASE_URL +
    "/patrimoine/_api/Web/GetFolderByServerRelativeUrl('Planothque')/Files?$expand=ListItemAllFields&$filter=substringof('"+residenceId+"',Name)";
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
    /* On filtre les documents */
    var filteredDocuments = documents.filter(filterDocs);

    /* Construction de la réponse. */
    const responseDocuments = filteredDocuments.map(maperDocs);

    /*console.log('-- Je fusionne 2 tableaux --')
      console.log('Tableau 1 : ', jsonResponse.result )
      console.log('Tableau 2 : ', responseDocuments )*/
    Array.prototype.push.apply(jsonResponse.result, responseDocuments);
  }

  return jsonResponse;
}

/**
 * @swagger
 * /api-ged-sharepoint/residences/doc:
 *   get:
 *     description: Retourne un document à partir de l'url passée en paramètre
 *     tags:
 *      - Residences
 *     produces:
 *      - application/json
 *     responses:
 *       200:
 *         description: retourne un document (ou null)
 */
router.get("/residences/doc/", async (req, res) => {
  /* Récupération de (ou des) libraryName */
  var urlDoc = req.query.urlDoc;

  var file = await getDocFromUrl(urlDoc);

  if (!file) {
    res.status(204).send({
      error: "Aucun document récupéré"
    });
  }

  /* Récupération du nom du fichier */
  let fileName = getFileNameFromUrl(urlDoc);
  let fileMime = getMimeFromUrl(urlDoc);

  // TODO  Récupérer le nom du fichier
  // console.log("The file : ", fileName, " with Mime : ", fileMime, " and buffer : ", file);
  res.writeHead(200, {
    "Content-Type": `${fileMime}`,
    "Content-Disposition": `attachment; filename=${fileName}`,
    "Content-Length": file.length
  });
  res.end(file);
});

/**
 *
 * @param {*} urlFile
 */
function getFileNameFromUrl(urlFile) {
  var parts = urlFile.split("/");
  var fileName = parts[parts.length - 1];

  return fileName;
}

/**
 * Retourne le mime type à partir de l'URL d'un fichier puis de son extension.
 * @param {*} urlFile
 */
function getMimeFromUrl(urlFile) {
  var parts = urlFile.split(".");
  var extension = parts[parts.length - 1];
  return extToMimes[extension];
}
/**
 * Permet de récupérer un fichier.
 *
 * @param {*} urlFile l'url vers le fichier à récupérer
 */
async function getDocFromUrl(urlFile) {
  /* Construction de l'URL pour récupérer le fichier  */
  let sharepointURLFile =
    SHAREPOINT_PATRIMOINE_URI +
    `/_api/Web/GetFileByServerRelativeUrl('${urlFile}')/$value`;
  // console.log("Getting file from : ", sharepointURLFile);

  /* Get File */
  var responseFile = await sharepointAuth().then(async auth => {
    return await rp
      .get({
        ...auth.options,
        encoding: null,
        headers: { ...auth.headers },
        uri: encodeURI(sharepointURLFile)
      })
      .catch(error => {
        console.log(error);
      });
  });
  // console.log("responseFile : ", responseFile);
  return responseFile;
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

/**
 * Transforme un element passé en paramètre en objet Json
 *
 * @param {*} document
 */
const maperDocs = element => {
  return {
    documentName: element.Name,
    link: element.LinkingUrl,
    sharepointServerRelativeUrl: element.ServerRelativeUrl,
    type: element.ListItemAllFields.SileneDocumentType
      ? element.ListItemAllFields.SileneDocumentType.WssId
      : null,
    typeLabel: element.ListItemAllFields.SileneDocumentType
      ? element.ListItemAllFields.SileneDocumentType.Label
      : null
  };
};
/**
 * Fonction qui permet de filtrer des documents d'une library.
 */
const filterDocs = document => {
  /* Si le document est sensible on ne le montre pas */
  if (document.ListItemAllFields.Sensible) {
    return false;
  }

  /* On filtre l'extension */
  if (!extToMimes.hasOwnProperty(document.Name.split(".").pop())) {
    return false;
  }

  /* On filtre sur le type */
  if (
    !document.ListItemAllFields.SileneDocumentType ||
    !filterType.hasOwnProperty(document.ListItemAllFields.SileneDocumentType.WssId)
  ) {
    return false;
  }

  return true;
};

module.exports = router;
